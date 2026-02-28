// src/lib/hedgeCalculator.js
// Hedge math engine — pure functions, no side-effects
// All amounts in dollars. Odds are American integers.

import { americanToDecimal } from './futures';

// ── Core math ─────────────────────────────────────────────────────────────────

/**
 * Lock-profit hedge stake.
 * Guarantees equal net P&L in BOTH outcomes. Formula: X = P / D
 *
 * @param {number} futurePayout  - Total futures payout incl. original stake
 * @param {number} hedgeOdds     - American odds of the hedge bet
 * @returns {number} optimal hedge stake
 */
export function lockHedgeStake(futurePayout, hedgeOdds) {
  const D = americanToDecimal(hedgeOdds);
  return futurePayout / D;
}

/**
 * Break-even hedge stake.
 * Zeroes out the loss if the futures bet loses; you still profit if futures wins.
 * Formula: X = S / (D - 1)
 *
 * @param {number} futureStake   - Original futures stake
 * @param {number} hedgeOdds     - American odds of the hedge bet
 * @returns {number} break-even hedge stake (could be 0/Infinity if D <= 1)
 */
export function breakEvenHedgeStake(futureStake, hedgeOdds) {
  const D = americanToDecimal(hedgeOdds);
  if (D <= 1) return 0; // can't break even on -EV bet with D<=1
  return futureStake / (D - 1);
}

/**
 * Full scenario analysis for a single hedge configuration.
 *
 * @param {number} futureStake       - Original stake on the futures position
 * @param {number} futurePayout      - Total futures payout (incl. stake return)
 * @param {number} hedgeStake        - Amount wagered on the hedge
 * @param {number} hedgeOdds         - American odds for the hedge bet
 * @returns {{ futuresWin, futuresLose, totalInvested, roi, hedgeDecimalOdds }}
 */
export function analyzeScenario(futureStake, futurePayout, hedgeStake, hedgeOdds) {
  const D = americanToDecimal(hedgeOdds);
  const hedgePayout = hedgeStake * D;

  // Net P&L in each outcome (total invested = futureStake + hedgeStake)
  const totalInvested = futureStake + hedgeStake;
  const futuresWin  = futurePayout - hedgeStake - futureStake; // futures pays, hedge lost
  const futuresLose = hedgePayout  - hedgeStake - futureStake; // hedge pays, futures lost

  const minNet = Math.min(futuresWin, futuresLose);
  const maxNet = Math.max(futuresWin, futuresLose);

  // ROI on worst case
  const worstCaseRoi = totalInvested > 0 ? (minNet / totalInvested) * 100 : 0;
  const bestCaseRoi  = totalInvested > 0 ? (maxNet / totalInvested) * 100 : 0;

  return {
    hedgeStake,
    hedgeOdds,
    hedgeDecimalOdds: D,
    hedgePayout,
    totalInvested,
    futuresWin,
    futuresLose,
    minNet,
    maxNet,
    worstCaseRoi,
    bestCaseRoi,
    isLocked: Math.abs(futuresWin - futuresLose) < 0.02, // within 2 cents = locked
  };
}

/**
 * Compute the no-hedge baseline for comparison.
 */
export function noHedgeBaseline(futureStake, futurePayout) {
  return {
    futuresWin:  futurePayout - futureStake,
    futuresLose: -futureStake,
    totalInvested: futureStake,
    roi: futureStake > 0 ? ((futurePayout - futureStake) / futureStake) * 100 : 0,
  };
}

/**
 * All three standard modes for a given futures position + hedge odds.
 * Returns { lock, breakEven, noHedge }
 */
export function computeAllModes(futureStake, futurePayout, hedgeOdds) {
  const lockStake    = lockHedgeStake(futurePayout, hedgeOdds);
  const beStake      = breakEvenHedgeStake(futureStake, hedgeOdds);

  return {
    noHedge:    noHedgeBaseline(futureStake, futurePayout),
    lock:       analyzeScenario(futureStake, futurePayout, lockStake, hedgeOdds),
    breakEven:  analyzeScenario(futureStake, futurePayout, beStake, hedgeOdds),
  };
}

/**
 * Portfolio-level scenario matrix.
 * Given a set of open positions on the SAME outcome space (e.g., multiple SB futures),
 * compute net P&L for each "winner" scenario.
 *
 * @param {Array} positions   - Array of futures position objects from lib/futures
 * @param {string} eventKey   - Group key, typically position.type (e.g. 'superbowl')
 * @returns {Array} rows of { winner: teamName, netPnl, positions: [{team, pnl}] }
 */
export function portfolioMatrix(positions) {
  if (!positions || positions.length === 0) return [];

  // Each position's team is a possible winner
  const uniqueTeams = [...new Set(positions.map(p => p.team))];

  return uniqueTeams.map(winner => {
    let totalNet = 0;
    const breakdown = positions.map(pos => {
      let pnl;
      if (pos.team === winner) {
        // This position wins
        pnl = pos.potentialPayout - pos.stake;
        // subtract any hedge stakes placed on this position's hedges
        const hedgesPlaced = (pos.hedges || [])
          .filter(h => h.status === 'PLACED')
          .reduce((s, h) => s + h.stake, 0);
        pnl -= hedgesPlaced;
      } else {
        // This position loses
        pnl = -pos.stake;
        // Any PLACED hedge on the opposing team (or against this position) may pay out—
        // for simplicity, include hedges whose h.team === winner
        const hedgeWin = (pos.hedges || [])
          .filter(h => h.status === 'PLACED' && h.team === winner)
          .reduce((s, h) => s + (h.potentialPayout - h.stake), 0);
        pnl += hedgeWin;
      }
      totalNet += pnl;
      return { team: pos.team, type: pos.type, stake: pos.stake, pnl };
    });

    return { winner, totalNet, breakdown };
  });
}
