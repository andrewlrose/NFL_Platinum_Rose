// src/components/odds/LineHistoryChart.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// Historical line movement chart — recharts LineChart with step interpolation.
//
// Data flow:
//   1. On mount: getActiveGameKeys() → populate game selector
//   2. On game/market change: getLineHistoryDB(gameKey) → buildChartData()
//   3. Fallback: DEMO_MOVEMENTS when no Supabase data exists
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, RefreshCw, Activity } from 'lucide-react';
import { getLineHistoryDB, getActiveGameKeys } from '../../lib/supabase';

// ─── book colours + display names ────────────────────────────────────────────

const BOOK_COLORS = {
  draftkings: '#00d2be',
  fanduel:    '#60a5fa',
  betmgm:     '#f59e0b',
  caesars:    '#a78bfa',
  betonline:  '#34d399',
  bookmaker:  '#fb7185',
  pointsbet:  '#fb923c',
  unibet:     '#e879f9',
};

const BOOK_LABELS = {
  draftkings: 'DraftKings',
  fanduel:    'FanDuel',
  betmgm:     'BetMGM',
  caesars:    'Caesars',
  betonline:  'BetOnline',
  bookmaker:  'Bookmaker',
  pointsbet:  'PointsBet',
  unibet:     'Unibet',
};

// ─── demo data ────────────────────────────────────────────────────────────────

const DEMO_GAME_KEY = 'Philadelphia Eagles_Kansas City Chiefs';
const DEMO_HOME     = 'Kansas City Chiefs';
const DEMO_AWAY     = 'Philadelphia Eagles';

function genDemoMovements() {
  const now = Date.now();
  const h   = (n) => new Date(now - n * 3_600_000).toISOString();
  const row = (book, type, from, to, hrs) => ({
    game_key: DEMO_GAME_KEY, home_team: DEMO_HOME, away_team: DEMO_AWAY,
    book, type, from_line: from, to_line: to, movement: to - from,
    detected_at: h(hrs),
  });

  return [
    // SPREAD (Chiefs open -2.5) ──────────────────────────────────────────
    row('draftkings', 'spread', -2.5, -3.0, 72),
    row('fanduel',    'spread', -2.5, -3.0, 48),
    row('betmgm',     'spread', -2.5, -2.0, 60),
    row('betmgm',     'spread', -2.0, -2.5, 36),
    row('caesars',    'spread', -2.5, -3.0, 60),
    row('fanduel',    'spread', -3.0, -3.5, 24),
    row('fanduel',    'spread', -3.5, -3.0, 12),

    // TOTAL (opens 47.5) ─────────────────────────────────────────────────
    row('draftkings', 'total', 47.5, 48.0, 72),
    row('fanduel',    'total', 47.5, 47.0, 72),
    row('betmgm',     'total', 47.5, 48.0, 48),
    row('caesars',    'total', 47.5, 48.0, 48),
    row('fanduel',    'total', 47.0, 47.5, 24),
    row('caesars',    'total', 48.0, 47.5, 12),

    // MONEYLINE (Chiefs open -130) ────────────────────────────────────────
    row('draftkings', 'moneyline', -130, -140, 72),
    row('fanduel',    'moneyline', -130, -135, 60),
    row('betmgm',     'moneyline', -130, -135, 48),
    row('betmgm',     'moneyline', -135, -145, 24),
    row('caesars',    'moneyline', -130, -140, 48),
    row('fanduel',    'moneyline', -135, -145, 12),
  ];
}

// ─── chart data builder ───────────────────────────────────────────────────────

/**
 * Convert raw movement rows into a recharts-compatible dataset.
 * Uses forward-fill so each book's line is continuous across the time axis.
 *
 * @returns {{ data, books, openingLine, currentLine }}
 */
function buildChartData(rows, gameKey, market) {
  const filtered = rows.filter(r => r.game_key === gameKey && r.type === market);
  if (filtered.length === 0) return { data: [], books: [], openingLine: null, currentLine: null };

  const books = [...new Set(filtered.map(r => r.book))];

  // Opening line = from_line of earliest row across all books
  const byTime = [...filtered].sort((a, b) => new Date(a.detected_at) - new Date(b.detected_at));
  const openingLine = byTime[0]?.from_line ?? null;

  // Build per-book timeline: [{time (ms), value}]
  const bookTimelines = {};
  for (const book of books) {
    const bookRows = filtered
      .filter(r => r.book === book)
      .sort((a, b) => new Date(a.detected_at) - new Date(b.detected_at));

    const tl = [];
    if (bookRows.length > 0) {
      // Synthetic opening point just before first movement
      tl.push({ time: new Date(bookRows[0].detected_at).getTime() - 500, value: bookRows[0].from_line });
    }
    for (const r of bookRows) {
      tl.push({ time: new Date(r.detected_at).getTime(), value: r.to_line });
    }
    bookTimelines[book] = tl;
  }

  // Collect all unique timestamps, sorted ascending
  const allTimes = [...new Set(
    Object.values(bookTimelines).flatMap(tl => tl.map(p => p.time))
  )].sort((a, b) => a - b);

  // Build recharts rows with forward-fill
  const data = allTimes.map(time => {
    const point = { time };
    for (const book of books) {
      const tl = bookTimelines[book];
      const last = [...tl].reverse().find(p => p.time <= time);
      if (last) point[book] = last.value;
    }
    return point;
  });

  // Current line = average of last known value per book
  const lastPoint = data.at(-1) ?? {};
  const vals = books.map(b => lastPoint[b]).filter(v => v != null);
  const currentLine = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;

  return { data, books, openingLine, currentLine };
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmtLine = (v, market) => {
  if (v == null) return '—';
  if (market === 'moneyline') return v > 0 ? `+${v}` : `${v}`;
  return v > 0 ? `+${v}` : `${v}`;
};

const fmtTick = (ms) => {
  const d = new Date(ms);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
};

function yDomain(data, books, market) {
  const vals = data.flatMap(d => books.map(b => d[b]).filter(v => v != null));
  if (!vals.length) return ['auto', 'auto'];
  const pad  = market === 'moneyline' ? 10 : 0.5;
  return [Math.min(...vals) - pad, Math.max(...vals) + pad];
}

// ─── custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label, market }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-600 rounded-lg p-3 shadow-xl min-w-[180px]">
      <div className="text-slate-400 text-xs mb-2">{fmtTick(label)}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 text-sm py-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded" style={{ backgroundColor: p.color }} />
            <span style={{ color: p.color }}>{BOOK_LABELS[p.dataKey] ?? p.dataKey}</span>
          </div>
          <span className="text-white font-mono font-medium">{fmtLine(p.value, market)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

const MARKETS = [
  { id: 'spread',    label: 'Spread'    },
  { id: 'total',     label: 'Total O/U' },
  { id: 'moneyline', label: 'Moneyline' },
];

export default function LineHistoryChart() {
  const [gameOptions, setGameOptions]   = useState([]);
  const [selectedGame, setSelectedGame] = useState(DEMO_GAME_KEY);
  const [market, setMarket]             = useState('spread');
  const [allRows, setAllRows]           = useState([]);
  const [isDemo, setIsDemo]             = useState(true);
  const [loading, setLoading]           = useState(false);

  // ── Load game list from Supabase ──────────────────────────────────────────
  const loadGames = useCallback(async () => {
    const games = await getActiveGameKeys(7 * 24).catch(() => []);
    if (games.length > 0) {
      setGameOptions(games);
      setSelectedGame(games[0].game_key);
      setIsDemo(false);
    } else {
      // Fall back to demo
      setGameOptions([{ game_key: DEMO_GAME_KEY, home_team: DEMO_HOME, away_team: DEMO_AWAY }]);
      setSelectedGame(DEMO_GAME_KEY);
      setIsDemo(true);
    }
  }, []);

  // ── Load movement rows for selected game ──────────────────────────────────
  const loadHistory = useCallback(async (gameKey) => {
    if (!gameKey) return;
    setLoading(true);
    try {
      const rows = await getLineHistoryDB(gameKey, 7 * 24).catch(() => []);
      if (rows.length > 0) {
        setAllRows(rows);
        setIsDemo(false);
      } else {
        setAllRows(genDemoMovements());
        setIsDemo(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGames(); }, [loadGames]);
  useEffect(() => { loadHistory(selectedGame); }, [loadHistory, selectedGame]);

  // ── Build chart data ──────────────────────────────────────────────────────
  const { data, books, openingLine, currentLine } = useMemo(
    () => buildChartData(allRows, selectedGame, market),
    [allRows, selectedGame, market]
  );

  const domain = useMemo(() => yDomain(data, books, market), [data, books, market]);

  const delta = openingLine != null && currentLine != null
    ? currentLine - openingLine
    : null;

  const DeltaIcon = delta == null ? Minus : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const deltaColor = delta == null ? 'text-slate-400'
    : delta > 0 ? 'text-emerald-400'
    : delta < 0 ? 'text-rose-400'
    : 'text-slate-400';

  const gameLabel = (key) => {
    const g = gameOptions.find(o => o.game_key === key);
    return g ? `${g.away_team ?? ''} @ ${g.home_team ?? ''}`.replace(/^@ |@ $/, '') : key.replace('_', ' @ ');
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Line History</h2>
          <p className="text-slate-400 mt-1">Track how lines have moved across sportsbooks</p>
          {isDemo && (
            <span className="inline-block mt-1 bg-amber-500/20 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-500/30 tracking-wider">
              DEMO — Sync odds to see real line history
            </span>
          )}
        </div>
        <button
          onClick={() => loadHistory(selectedGame)}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 text-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Game selector + market tabs */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Game dropdown */}
        <select
          value={selectedGame}
          onChange={(e) => setSelectedGame(e.target.value)}
          className="bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm flex-1"
        >
          {gameOptions.map(g => (
            <option key={g.game_key} value={g.game_key}>
              {gameLabel(g.game_key)}
            </option>
          ))}
        </select>

        {/* Market tabs */}
        <div className="flex rounded-lg overflow-hidden border border-slate-700">
          {MARKETS.map(m => (
            <button
              key={m.id}
              onClick={() => setMarket(m.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                market === m.id
                  ? 'bg-[#00d2be] text-black'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Opening</div>
          <div className="text-xl font-bold text-white font-mono">
            {fmtLine(openingLine, market)}
          </div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Current</div>
          <div className="text-xl font-bold text-white font-mono">
            {fmtLine(
              currentLine != null ? parseFloat(currentLine.toFixed(1)) : null,
              market
            )}
          </div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Net Move</div>
          <div className={`text-xl font-bold font-mono flex items-center gap-1 ${deltaColor}`}>
            <DeltaIcon size={18} />
            {delta != null ? fmtLine(parseFloat(delta.toFixed(1)), market) : '—'}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <Activity size={40} className="mb-3 opacity-40" />
            <p className="text-sm">No {market} movement data for this game yet</p>
            <p className="text-xs mt-1 text-slate-600">Data populates after the Odds Ingest agent runs</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.25)" />
              <XAxis
                dataKey="time"
                type="number"
                scale="time"
                domain={['dataMin', 'dataMax']}
                tickFormatter={fmtTick}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
                minTickGap={80}
              />
              <YAxis
                domain={domain}
                tickFormatter={(v) => fmtLine(v, market)}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={55}
              />
              <Tooltip
                content={<CustomTooltip market={market} />}
                cursor={{ stroke: '#475569', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Legend
                formatter={(value) => (
                  <span style={{ color: BOOK_COLORS[value] ?? '#94a3b8', fontSize: 12 }}>
                    {BOOK_LABELS[value] ?? value}
                  </span>
                )}
                wrapperStyle={{ paddingTop: 12 }}
              />

              {/* Opening line reference */}
              {openingLine != null && (
                <ReferenceLine
                  y={openingLine}
                  stroke="#64748b"
                  strokeDasharray="5 3"
                  label={{
                    value: `Open ${fmtLine(openingLine, market)}`,
                    position: 'insideTopRight',
                    fill: '#64748b',
                    fontSize: 11,
                  }}
                />
              )}

              {books.map((book) => (
                <Line
                  key={book}
                  type="stepAfter"
                  dataKey={book}
                  stroke={BOOK_COLORS[book] ?? '#94a3b8'}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Book legend / info */}
      {books.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {books.map(book => {
            const lastPoint = data.at(-1) ?? {};
            const val = lastPoint[book];
            return (
              <div key={book} className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2 border border-slate-700 text-sm">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: BOOK_COLORS[book] ?? '#94a3b8' }} />
                <span className="text-slate-300">{BOOK_LABELS[book] ?? book}</span>
                <span className="font-mono text-white font-medium">{fmtLine(val, market)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
