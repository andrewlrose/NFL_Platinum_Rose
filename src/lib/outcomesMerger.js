// src/lib/outcomesMerger.js
// ─────────────────────────────────────────────────────────────
// Merges nfl_bankroll_data_v1 (dollar bets) and pr_picks_v1 (AI unit picks)
// into a single normalized outcome feed for the Outcomes Dashboard.
// ─────────────────────────────────────────────────────────────

const BANKROLL_KEY = 'nfl_bankroll_data_v1';
const PICKS_KEY    = 'pr_picks_v1';
const JUICE        = 1.1; // standard -110 vig → win pays 1/1.1 ≈ 0.909u

// ── Normalizers ───────────────────────────────────────────────

const normalizeResult = (raw) => {
  if (!raw) return 'PENDING';
  const u = raw.toUpperCase();
  if (u === 'WON'  || u === 'WIN')  return 'WIN';
  if (u === 'LOST' || u === 'LOSS') return 'LOSS';
  if (u === 'PUSH' || u === 'PUSHED') return 'PUSH';
  return 'PENDING';
};

const normalizeType = (raw) => {
  if (!raw) return 'spread';
  const l = raw.toLowerCase();
  if (l === 'spread')     return 'spread';
  if (l === 'total')      return 'total';
  if (l === 'moneyline')  return 'moneyline';
  if (l === 'parlay')     return 'parlay';
  if (l === 'teaser')     return 'teaser';
  if (l === 'prop')       return 'prop';
  if (l === 'futures')    return 'futures';
  return l;
};

const fmtDate = (iso) => {
  if (!iso) return null;
  // Normalize bare date strings like "2026-02-07" so they don't parse as UTC midnight
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return `${iso}T12:00:00`;
  return iso;
};

// ── Source readers ────────────────────────────────────────────

const readBankrollBets = () => {
  try {
    const raw = localStorage.getItem(BANKROLL_KEY);
    return raw ? (JSON.parse(raw).bets || []) : [];
  } catch { return []; }
};

const readPicks = () => {
  try {
    const raw = localStorage.getItem(PICKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

// ── Main merger ───────────────────────────────────────────────

/**
 * Returns a unified, date-descending array of outcome objects.
 * Shape of each item:
 * {
 *   id, date (ISO), source ('bankroll'|'ai_picks'), sourceLabel,
 *   description, type, team, line, result ('WIN'|'LOSS'|'PUSH'|'PENDING'),
 *   amount, odds, profit (dollars|null), units (null|number),
 *   confidence, edge, week, isParlay
 * }
 */
export const mergeOutcomes = () => {
  // ── Bankroll bets ────────────────────────────────────────
  const fromBankroll = readBankrollBets().map(bet => ({
    id:          String(bet.id),
    date:        fmtDate(bet.settledAt || bet.timestamp || bet.date || null),
    source:      'bankroll',
    sourceLabel: bet.source || 'Manual',
    description: bet.description || (bet.team ? bet.team : 'Bet'),
    type:        normalizeType(bet.type),
    team:        bet.team || bet.legs?.[0]?.team || null,
    line:        typeof bet.line === 'number' ? bet.line : null,
    result:      normalizeResult(bet.status),
    amount:      typeof bet.amount === 'number' ? bet.amount : null,
    odds:        typeof bet.odds === 'number' ? bet.odds : null,
    profit:      typeof bet.profit === 'number' ? bet.profit : null,
    units:       null,
    confidence:  null,
    edge:        null,
    week:        bet.week || null,
    isParlay:    bet.isParlay || false,
  }));

  // ── AI Picks ─────────────────────────────────────────────
  const fromPicks = readPicks().map(pick => {
    // Compute unit P&L at -110 juice
    let units = null;
    const r = normalizeResult(pick.result);
    if (r === 'WIN')  units = +(1 / JUICE).toFixed(4);  // +0.9091u
    if (r === 'LOSS') units = -1;
    if (r === 'PUSH') units = 0;

    return {
      id:          String(pick.id),
      date:        fmtDate(pick.createdAt || pick.commenceTime || pick.gameDate || null),
      source:      'ai_picks',
      sourceLabel: pick.source || 'AI_LAB',
      description: pick.home && pick.visitor
        ? `${pick.visitor} @ ${pick.home} • ${pick.selection} ${pick.line}`
        : (pick.selection || 'Pick'),
      type:        normalizeType(pick.pickType),
      team:        pick.selection || null,
      line:        typeof pick.line === 'number' ? pick.line : null,
      result:      r,
      amount:      null,
      odds:        -110,
      profit:      null,
      units,
      confidence:  typeof pick.confidence === 'number' ? pick.confidence : null,
      edge:        typeof pick.edge === 'number' ? pick.edge : null,
      week:        null,
      isParlay:    false,
    };
  });

  // ── Merge, sort desc ─────────────────────────────────────
  return [...fromBankroll, ...fromPicks]
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
};

// ── Aggregate stats ───────────────────────────────────────────

export const calcOutcomeStats = (outcomes) => {
  const settled = outcomes.filter(o => o.result !== 'PENDING');
  const wins    = settled.filter(o => o.result === 'WIN').length;
  const losses  = settled.filter(o => o.result === 'LOSS').length;
  const pushes  = settled.filter(o => o.result === 'PUSH').length;
  const winRate = (wins + losses) > 0 ? (wins / (wins + losses)) * 100 : 0;

  // Bankroll dollar stats
  const bankrollSettled = outcomes.filter(o => o.source === 'bankroll' && o.profit !== null);
  const totalDollars    = bankrollSettled.reduce((s, o) => s + o.profit, 0);
  const totalWagered    = bankrollSettled.reduce((s, o) => s + (o.amount || 0), 0);
  const roi             = totalWagered > 0 ? (totalDollars / totalWagered) * 100 : 0;

  // AI picks unit stats
  const picksSettled = outcomes.filter(o => o.source === 'ai_picks' && o.units !== null);
  const totalUnits   = picksSettled.reduce((s, o) => s + o.units, 0);

  return {
    wins,
    losses,
    pushes,
    settled: settled.length,
    pending: outcomes.filter(o => o.result === 'PENDING').length,
    winRate,
    totalDollars,
    totalWagered,
    roi,
    totalUnits,
    // By-source breakdown
    bankrollCount: outcomes.filter(o => o.source === 'bankroll').length,
    picksCount:    outcomes.filter(o => o.source === 'ai_picks').length,
  };
};

// ── Cumulative P&L series (for recharts) ─────────────────────

/**
 * Builds chronological cumulative P&L series.
 * Returns an array of { date, dollars, units, dollarsDelta, unitsDelta, result, label, source }
 * A starting {0,0} anchor is prepended for a clean chart origin.
 */
export const buildCumulativeSeries = (outcomes) => {
  const settled = outcomes
    .filter(o => o.result !== 'PENDING' && o.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (settled.length === 0) return [];

  let cumDollars = 0;
  let cumUnits   = 0;

  // Anchor at origin
  const anchor = {
    date: settled[0].date,
    dollars: 0,
    units: 0,
    dollarsDelta: 0,
    unitsDelta: 0,
    result: null,
    label: 'Start',
    source: null,
  };

  const series = settled.map(o => {
    const dolDelta  = (o.source === 'bankroll' && o.profit !== null) ? o.profit : 0;
    const unitDelta = (o.source === 'ai_picks'  && o.units !== null)  ? o.units  : 0;
    cumDollars += dolDelta;
    cumUnits   += unitDelta;
    return {
      date:         o.date,
      dollars:      +cumDollars.toFixed(2),
      units:        +cumUnits.toFixed(3),
      dollarsDelta: +dolDelta.toFixed(2),
      unitsDelta:   +unitDelta.toFixed(3),
      result:       o.result,
      label:        o.description,
      source:       o.source,
    };
  });

  return [anchor, ...series];
};
