// src/components/odds/BetValueComparison.jsx
// Compare your locked bets against current market lines — did you beat the close?

import React, { useState, useEffect, useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Minus, Info, RefreshCw, AlertCircle } from 'lucide-react';
import { getBestOdds } from '../../lib/enhancedOddsApi';
import { normalizeTeam } from '../../lib/teams';

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (n) => (n > 0 ? `+${n}` : `${n}`);

/**
 * Returns how much value your bet has vs the current market.
 * Positive delta = current market is worse for your bet type → you beat the close
 * Negative delta = current market is better for that side → you're behind market
 *
 * Returned { delta, beatClose, label }
 */
function calcValueDelta(type, selection, betLine, currentLine) {
  if (currentLine == null) return null;
  const delta = currentLine - betLine;
  let beatClose = false;

  if (type === 'spread') {
    // Spread: current more negative = spread got harder to cover for favorites = you beat the close
    beatClose = delta < 0;
  } else if (type === 'total') {
    const side = String(selection).toLowerCase();
    // Over: current higher = harder to clear now = you beat the close
    // Under: current lower  = harder to clear now = you beat the close
    beatClose = side === 'over' ? delta > 0 : delta < 0;
  } else {
    return null;
  }

  const absDelta = Math.abs(delta);
  const label = absDelta < 0.05 ? 'No Move' : beatClose ? 'Beat the Close' : 'Behind Market';
  return { delta, beatClose, label, absDelta };
}

/**
 * Try to match a bet game string ("Bills @ Chiefs") against an odds-data game.
 * Returns the matched game object or null.
 */
function findOddsGame(betGameStr, oddsGames) {
  if (!betGameStr || !Array.isArray(oddsGames)) return null;

  const [awayRaw, homeRaw] = betGameStr.split('@').map(s => s.trim());
  const awayNorm = normalizeTeam(awayRaw);
  const homeNorm = normalizeTeam(homeRaw);

  return oddsGames.find(g => {
    const gHome = normalizeTeam(g.home_team);
    const gAway = normalizeTeam(g.away_team);
    return (gHome === homeNorm && gAway === awayNorm) ||
           (gHome === awayNorm && gAway === homeNorm);
  }) || null;
}

/**
 * Get current best line for the bet's side.
 */
function getCurrentLine(bet, oddsGame) {
  if (!oddsGame) return null;
  const best = getBestOdds(oddsGame);

  if (bet.type === 'spread') {
    const homeNorm  = normalizeTeam(oddsGame.home_team);
    const selNorm   = normalizeTeam(bet.selection);
    if (selNorm === homeNorm) {
      return best.spread?.home?.line ?? null;
    } else {
      return best.spread?.away?.line ?? null;
    }
  }

  if (bet.type === 'total') {
    return best.total?.over?.line ?? null; // same line for both over/under
  }

  return null;
}

// ─── card ───────────────────────────────────────────────────────────────────

function BetCard({ bet, oddsGame }) {
  const currentLine = getCurrentLine(bet, oddsGame);
  const info = currentLine != null
    ? calcValueDelta(bet.type, bet.selection, bet.line, currentLine)
    : null;

  const statusColor = {
    OPEN:   'text-blue-400  bg-blue-900/20  border-blue-600/30',
    PLACED: 'text-emerald-400 bg-emerald-900/20 border-emerald-600/30',
    WIN:    'text-emerald-400 bg-emerald-900/20 border-emerald-600/30',
    LOSS:   'text-rose-400  bg-rose-900/20  border-rose-600/30',
  };

  const valueColor = !info
    ? 'text-slate-500'
    : info.absDelta < 0.05
    ? 'text-slate-400'
    : info.beatClose
    ? 'text-emerald-400'
    : 'text-amber-400';

  const ValueIcon = !info || info.absDelta < 0.05
    ? Minus
    : info.beatClose
    ? TrendingUp
    : TrendingDown;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">{bet.game}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-bold">{bet.selection}</span>
            <span className="text-slate-400 text-sm capitalize">{bet.type}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded border ${statusColor[bet.status] || 'text-slate-400 bg-slate-700/40 border-slate-600/30'}`}>
              {bet.status}
            </span>
          </div>
        </div>

        {/* Value verdict */}
        {info && (
          <div className={`flex items-center gap-1.5 shrink-0 ${valueColor}`}>
            <ValueIcon size={15} />
            <span className="text-sm font-semibold">{info.label}</span>
          </div>
        )}
      </div>

      {/* Line comparison */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-slate-900/60 rounded-lg py-2.5 px-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Your Line</p>
          <p className="text-lg font-black text-white">
            {bet.line != null ? fmt(bet.line) : '—'}
          </p>
          <p className="text-[10px] text-slate-500 mt-0.5">{fmt(bet.odds ?? -110)}</p>
        </div>

        <div className="bg-slate-900/60 rounded-lg py-2.5 px-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Current Best</p>
          <p className={`text-lg font-black ${currentLine != null ? 'text-white' : 'text-slate-600'}`}>
            {currentLine != null ? fmt(currentLine) : '—'}
          </p>
          {oddsGame && <p className="text-[10px] text-slate-500 mt-0.5">market</p>}
        </div>

        <div className="bg-slate-900/60 rounded-lg py-2.5 px-2">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">∆ Move</p>
          {info ? (
            <>
              <p className={`text-lg font-black ${valueColor}`}>
                {info.absDelta < 0.05 ? '—' : fmt(parseFloat(info.delta.toFixed(1)))}
              </p>
              <p className={`text-[10px] mt-0.5 ${valueColor}`}>pts</p>
            </>
          ) : (
            <p className="text-lg font-black text-slate-600">—</p>
          )}
        </div>
      </div>

      {!oddsGame && (
        <p className="text-[10px] text-slate-600 mt-2 text-center">
          No matching game found in synced odds
        </p>
      )}
    </div>
  );
}

// ─── main component ─────────────────────────────────────────────────────────

export default function BetValueComparison() {
  const [bets, setBets]         = useState([]);
  const [oddsGames, setOddsGames] = useState([]);
  const [hasOdds, setHasOdds]   = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const load = () => {
    // Load user's card bets
    try {
      const raw = localStorage.getItem('nfl_my_bets');
      setBets(raw ? JSON.parse(raw) : []);
    } catch (_) { setBets([]); }

    // Load cached odds
    try {
      const raw   = localStorage.getItem('cached_odds_data');
      const time  = localStorage.getItem('cached_odds_time');
      if (raw) {
        setOddsGames(JSON.parse(raw));
        setHasOdds(true);
        setLastSync(time ? new Date(parseInt(time)) : null);
      } else {
        setOddsGames([]);
        setHasOdds(false);
      }
    } catch (_) { setOddsGames([]); setHasOdds(false); }
  };

  useEffect(() => { load(); }, []);

  const activeBets = useMemo(
    () => bets.filter(b => b.status === 'OPEN' || b.status === 'PLACED'),
    [bets]
  );

  const stats = useMemo(() => {
    if (!hasOdds) return null;
    let beats = 0, behind = 0, noMove = 0;
    activeBets.forEach(bet => {
      const game = findOddsGame(bet.game, oddsGames);
      const currentLine = getCurrentLine(bet, game);
      const info = currentLine != null
        ? calcValueDelta(bet.type, bet.selection, bet.line, currentLine)
        : null;
      if (!info) return;
      if (info.absDelta < 0.05) noMove++;
      else if (info.beatClose) beats++;
      else behind++;
    });
    return { beats, behind, noMove };
  }, [activeBets, oddsGames, hasOdds]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-900/30">
              <DollarSign className="w-6 h-6 text-[#00d2be]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Bet Value Comparison</h2>
              <p className="text-xs text-slate-400">Your locked lines vs current market</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastSync && (
              <span className="text-xs text-slate-500">
                Odds synced {Math.round((Date.now() - lastSync) / 60000)}m ago
              </span>
            )}
            <button
              onClick={load}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors"
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 divide-x divide-slate-700 mt-4 pt-4 border-t border-slate-700">
            <div className="text-center pr-3">
              <p className="text-3xl font-black text-emerald-400">{stats.beats}</p>
              <p className="text-xs text-slate-500 mt-0.5">Beat the Close</p>
            </div>
            <div className="text-center px-3">
              <p className="text-3xl font-black text-amber-400">{stats.behind}</p>
              <p className="text-xs text-slate-500 mt-0.5">Behind Market</p>
            </div>
            <div className="text-center pl-3">
              <p className="text-3xl font-black text-slate-400">{stats.noMove}</p>
              <p className="text-xs text-slate-500 mt-0.5">No Movement</p>
            </div>
          </div>
        )}
      </div>

      {/* No odds warning */}
      {!hasOdds && (
        <div className="flex items-start gap-2 px-4 py-3 bg-amber-900/20 border border-amber-500/30 rounded-xl text-sm text-amber-200">
          <Info size={15} className="mt-0.5 shrink-0 text-amber-400" />
          <span>
            No live odds cached yet.{' '}
            <strong>Sync odds in the Live Odds tab</strong> to compare your bets against current market lines.
          </span>
        </div>
      )}

      {/* No bets state */}
      {activeBets.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-10 text-center">
          <AlertCircle size={40} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No active bets on your card.</p>
          <p className="text-xs text-slate-500 mt-1">Add bets from the Dashboard to track their value here.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {activeBets.map(bet => (
            <BetCard
              key={bet.id}
              bet={bet}
              oddsGame={findOddsGame(bet.game, oddsGames)}
            />
          ))}
        </div>
      )}

      {/* How it works */}
      <div className="flex items-start gap-2 px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-xs text-slate-400">
        <Info size={13} className="mt-0.5 shrink-0 text-slate-500" />
        <span>
          <strong className="text-slate-300">Beat the Close</strong> means your locked line is now more favorable than what's available today.
          A spread that moved against the favorite after you bet = you got a better number.
          Sync live odds regularly for accurate comparisons.
        </span>
      </div>
    </div>
  );
}
