// agents/odds-ingest.js
// ═══════════════════════════════════════════════════════════════════════════════
// OddsIngestAgent — polls TheOddsAPI, detects line movements, writes to Supabase
//
// Runtime: Node.js ESM (run via GitHub Actions or: node agents/odds-ingest.js)
// Env vars required:
//   SUPABASE_URL             — https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY — service_role JWT (bypasses RLS for writes)
//   ODDS_API_KEY             — TheOddsAPI key
//
// Design principles:
//   - maxRetries on API calls  - validate output before writing to Supabase
//   - graceful degradation: no games = skip, no env = abort cleanly
//   - structured logs for GH Actions visibility
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

const MAX_RETRIES     = 3;
const MAX_RUNTIME_MS  = 60_000; // bail after 60s
const SNAPSHOT_TTL_DAYS = 7;    // delete snapshots older than this

const SUPABASE_URL      = process.env.SUPABASE_URL;
const SUPABASE_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ODDS_API_KEY      = process.env.ODDS_API_KEY;

const SPORTSBOOKS = 'draftkings,fanduel,betmgm,caesars,betonline,bookmaker,pointsbet,unibet';
const ODDS_URL    =
  `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds` +
  `?regions=us&markets=h2h,spreads,totals&bookmakers=${SPORTSBOOKS}` +
  `&apiKey=${ODDS_API_KEY}&oddsFormat=american`;

// ─── Supabase client ──────────────────────────────────────────────────────────

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });
}

// ─── API helpers ─────────────────────────────────────────────────────────────

async function fetchWithRetry(url, retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = attempt * 2000;
      console.log(`  Retry ${attempt}/${retries} in ${delay}ms — ${err.message}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// ─── Data processing (mirrors enhancedOddsApi.processMultiBookData) ──────────

const BOOK_NAMES = {
  draftkings: 'DraftKings', fanduel: 'FanDuel', betmgm: 'BetMGM',
  caesars: 'Caesars', betonline: 'BetOnline', bookmaker: 'Bookmaker',
  pointsbet: 'PointsBet', unibet: 'Unibet',
};

function processGame(raw) {
  const game = {
    id:            raw.id,
    home_team:     raw.home_team,
    away_team:     raw.away_team,
    commence_time: raw.commence_time,
    bookmakers:    {},
  };

  for (const book of (raw.bookmakers || [])) {
    const bookData = {
      name:    BOOK_NAMES[book.key] || book.key,
      markets: {},
    };

    for (const market of (book.markets || [])) {
      if (market.key === 'h2h') {
        bookData.markets.moneyline = {
          home: market.outcomes.find(o => o.name === raw.home_team)?.price ?? null,
          away: market.outcomes.find(o => o.name === raw.away_team)?.price ?? null,
        };
      } else if (market.key === 'spreads') {
        const homeOut = market.outcomes.find(o => o.name === raw.home_team);
        bookData.markets.spread = {
          home_line:  homeOut?.point ?? null,
          home_price: homeOut?.price ?? null,
          away_line:  homeOut ? -(homeOut.point) : null,
          away_price: market.outcomes.find(o => o.name === raw.away_team)?.price ?? null,
        };
      } else if (market.key === 'totals') {
        const overOut = market.outcomes.find(o => o.name === 'Over');
        bookData.markets.total = {
          line:        overOut?.point ?? null,
          over_price:  overOut?.price ?? null,
          under_price: market.outcomes.find(o => o.name === 'Under')?.price ?? null,
        };
      }
    }

    game.bookmakers[book.key] = bookData;
  }

  return game;
}

// ─── Fetch odds from TheOddsAPI ──────────────────────────────────────────────

async function fetchOdds() {
  console.log('  Calling TheOddsAPI...');
  const raw = await fetchWithRetry(ODDS_URL);

  if (!Array.isArray(raw)) throw new Error(`Unexpected response: ${JSON.stringify(raw).slice(0, 200)}`);

  const games = raw.map(processGame);
  console.log(`  Received ${games.length} games.`);
  return games;
}

// ─── Get last snapshot from Supabase ─────────────────────────────────────────

async function getLastSnapshot(supabase) {
  const { data, error } = await supabase
    .from('odds_snapshots')
    .select('games')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single();

  if (error?.code === 'PGRST116') return null; // no rows
  if (error) throw error;
  return data?.games || null;
}

// ─── Detect line movements between snapshots ─────────────────────────────────

function detectMovements(lastGames, currentGames) {
  const movements = [];
  const now = new Date().toISOString();

  const lastMap = new Map(lastGames.map(g => [g.id, g]));

  for (const game of currentGames) {
    const prev = lastMap.get(game.id);
    if (!prev) continue;

    const gameKey = `${game.away_team}_${game.home_team}`;

    for (const [bookKey, bookData] of Object.entries(game.bookmakers)) {
      const prevBook = prev.bookmakers[bookKey];
      if (!prevBook) continue;

      const base = {
        detected_at: now,
        game_key:    gameKey,
        home_team:   game.home_team,
        away_team:   game.away_team,
        book:        bookKey,
      };

      // Spread
      const cs = bookData.markets.spread, ps = prevBook.markets.spread;
      if (cs && ps && cs.home_line !== null && ps.home_line !== null && cs.home_line !== ps.home_line) {
        movements.push({ ...base, type: 'spread', from_line: ps.home_line, to_line: cs.home_line, movement: cs.home_line - ps.home_line });
      }

      // Total
      const ct = bookData.markets.total, pt = prevBook.markets.total;
      if (ct && pt && ct.line !== null && pt.line !== null && ct.line !== pt.line) {
        movements.push({ ...base, type: 'total', from_line: pt.line, to_line: ct.line, movement: ct.line - pt.line });
      }

      // Moneyline (home side)
      const cm = bookData.markets.moneyline, pm = prevBook.markets.moneyline;
      if (cm && pm && cm.home !== null && pm.home !== null && cm.home !== pm.home) {
        movements.push({ ...base, type: 'moneyline', from_line: pm.home, to_line: cm.home, movement: cm.home - pm.home });
      }
    }
  }

  return movements;
}

// ─── Cleanup old rows ─────────────────────────────────────────────────────────

async function cleanup(supabase) {
  const cutoff = new Date(Date.now() - SNAPSHOT_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const [snapRes, movRes] = await Promise.all([
    supabase.from('odds_snapshots').delete().lt('fetched_at', cutoff),
    supabase.from('line_movements').delete().lt('detected_at', cutoff),
  ]);

  if (snapRes.error) console.warn('  Snapshot cleanup error:', snapRes.error.message);
  if (movRes.error) console.warn('  Movement cleanup error:', movRes.error.message);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function run() {
  const start = Date.now();
  console.log(`\n[${new Date().toISOString()}] OddsIngestAgent starting`);

  // Runtime guard
  const timeout = setTimeout(() => {
    console.error('⏱ MAX_RUNTIME_MS exceeded — forcing exit');
    process.exit(2);
  }, MAX_RUNTIME_MS);

  try {
    if (!ODDS_API_KEY || process.env.DRY_RUN === 'true') {
      console.log('ℹ Dry run or no ODDS_API_KEY — skipping API call.');
      clearTimeout(timeout);
      return;
    }

    const supabase = getSupabase();

    // 1. Fetch current odds
    const games = await fetchOdds();

    if (games.length === 0) {
      console.log('ℹ No NFL games available (offseason?). Nothing to store.');
      clearTimeout(timeout);
      return;
    }

    // 2. Get last snapshot for movement detection
    const lastGames = await getLastSnapshot(supabase);
    if (lastGames) {
      console.log(`  Last snapshot has ${lastGames.length} games — checking for movements.`);
    } else {
      console.log('  No previous snapshot — this is the first run.');
    }

    // 3. Detect movements
    const movements = lastGames ? detectMovements(lastGames, games) : [];
    console.log(`  Detected ${movements.length} line movement(s).`);

    // 4. Insert snapshot
    const { error: snapErr } = await supabase
      .from('odds_snapshots')
      .insert({ games, game_count: games.length });
    if (snapErr) throw new Error(`Snapshot insert failed: ${snapErr.message}`);
    console.log(`  Snapshot saved (${games.length} games).`);

    // 5. Insert movements
    if (movements.length > 0) {
      const { error: movErr } = await supabase
        .from('line_movements')
        .insert(movements);
      if (movErr) throw new Error(`Movements insert failed: ${movErr.message}`);
      console.log(`  ${movements.length} movement(s) saved.`);
    }

    // 6. Cleanup
    await cleanup(supabase);

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`✅ OddsIngestAgent complete in ${elapsed}s`);

  } catch (err) {
    console.error('❌ OddsIngestAgent error:', err.message);
    process.exit(1);
  } finally {
    clearTimeout(timeout);
  }
}

run();
