// src/lib/expertStats.js
// ═══════════════════════════════════════════════════════════════════════════════
// Expert pick grading + leaderboard stats engine.
//
// Works with the nfl_expert_consensus localStorage structure:
//   {
//     [gameId]: {
//       expertPicks: {
//         spread: [ExpertPick, ...],
//         total:  [ExpertPick, ...],
//       }
//     }
//   }
//
// ExpertPick schema (post-schema-augmentation):
//   { id, expert, pick, line, pickType, isHomeTeam,
//     home, visitor, gameDate, units, result, gradedAt, addedAt }
// ═══════════════════════════════════════════════════════════════════════════════

import { loadFromStorage, saveToStorage } from './storage';

export const CONSENSUS_KEY = 'nfl_expert_consensus';
const JUICE = 1.1; // standard -110 vig multiplier for unit P&L

// ─── Grading helpers ──────────────────────────────────────────────────────────

/**
 * Grade a spread pick.
 * @param {{ isHomeTeam: boolean, line: number }} pick
 * @param {number} homeScore
 * @param {number} awayScore
 * @returns {'WIN'|'LOSS'|'PUSH'}
 */
function gradeSpread(pick, homeScore, awayScore) {
  const margin = homeScore - awayScore;
  const line   = Number(pick.line);
  if (isNaN(line)) return 'LOSS'; // can't grade without a line

  const net = pick.isHomeTeam ? margin + line : (-margin) + line;
  if (net > 0)  return 'WIN';
  if (net < 0)  return 'LOSS';
  return 'PUSH';
}

/**
 * Grade a total pick.
 * @param {{ pick: string, line: number }} pick — pick text should contain 'over'/'under'
 * @param {number} homeScore
 * @param {number} awayScore
 * @returns {'WIN'|'LOSS'|'PUSH'}
 */
function gradeTotal(pick, homeScore, awayScore) {
  const line  = Number(pick.line);
  const total = homeScore + awayScore;
  const sel   = (pick.pick || '').toLowerCase();
  if (isNaN(line)) return 'LOSS';

  const isOver = sel.startsWith('over') || sel === 'o';
  const net    = isOver ? total - line : line - total;
  if (net > 0)  return 'WIN';
  if (net < 0)  return 'LOSS';
  return 'PUSH';
}

/**
 * Grade a single ExpertPick given final scores.
 * Returns the pick with result + gradedAt filled in, or unchanged if already graded.
 */
function gradePick(pick, homeScore, awayScore) {
  if (!pick.id || pick.result !== 'PENDING') return pick;

  const isTotal   = (pick.pickType || '').toLowerCase().includes('total');
  const result    = isTotal
    ? gradeTotal(pick, homeScore, awayScore)
    : gradeSpread(pick, homeScore, awayScore);

  return { ...pick, result, gradedAt: new Date().toISOString() };
}

// ─── Bulk grading ─────────────────────────────────────────────────────────────

/**
 * Grade all PENDING expert picks for a single game.
 * Non-mutating — returns updated consensus object + count of picks graded.
 *
 * @param {Object} consensus  — full nfl_expert_consensus object
 * @param {string} gameId     — ESPN game ID key
 * @param {number} homeScore
 * @param {number} awayScore
 * @returns {{ consensus: Object, graded: number }}
 */
export function gradeExpertPicksForGame(consensus, gameId, homeScore, awayScore) {
  const gameData = consensus[gameId];
  if (!gameData) return { consensus, graded: 0 };

  let graded = 0;

  const gradeList = (list) => list.map(pick => {
    if (pick.result !== 'PENDING') return pick;
    const updated = gradePick(pick, homeScore, awayScore);
    if (updated.result !== 'PENDING') graded++;
    return updated;
  });

  const updated = {
    ...consensus,
    [gameId]: {
      ...gameData,
      expertPicks: {
        spread: gradeList(gameData.expertPicks?.spread ?? []),
        total:  gradeList(gameData.expertPicks?.total  ?? []),
      },
    },
  };

  return { consensus: updated, graded };
}

/**
 * Apply a batch of game results to all PENDING expert picks.
 * Persists the updated consensus to localStorage.
 *
 * @param {Array<{ espn_id: string, home_score: number, away_score: number }>} gameResults
 * @returns {number} total picks graded
 */
export function gradeExpertPicksFromResults(gameResults) {
  let consensus = loadFromStorage(CONSENSUS_KEY, {});
  let totalGraded = 0;

  for (const result of gameResults) {
    if (result.status !== 'final') continue;
    const gameId  = result.espn_id;
    if (!consensus[gameId]) continue;

    const { consensus: updated, graded } = gradeExpertPicksForGame(
      consensus, gameId, result.home_score, result.away_score
    );
    consensus   = updated;
    totalGraded += graded;
  }

  if (totalGraded > 0) {
    saveToStorage(CONSENSUS_KEY, consensus);
    console.log(`[expertStats] ✅ Graded ${totalGraded} expert pick(s) from game results.`);
  }

  return totalGraded;
}

// ─── Leaderboard stats ────────────────────────────────────────────────────────

/**
 * Compute per-expert standings from the full consensus object.
 * Returns an array sorted by win% desc (graded picks only in denominator).
 *
 * @param {Object} consensus  — nfl_expert_consensus
 * @returns {ExpertStat[]}
 */
export function computeExpertStandings(consensus) {
  const stats = {}; // { [expertName]: ExpertStat }

  const ensure = (name) => {
    if (!stats[name]) {
      stats[name] = {
        expert:        name,
        wins:          0,
        losses:        0,
        pushes:        0,
        pending:       0,
        units:         0,   // net units (wins - losses * JUICE, push = 0)
        spreadWins:    0,
        spreadTotal:   0,
        totalWins:     0,
        totalTotal:    0,
      };
    }
    return stats[name];
  };

  for (const gameData of Object.values(consensus)) {
    const allPicks = [
      ...(gameData.expertPicks?.spread ?? []),
      ...(gameData.expertPicks?.total  ?? []),
    ];

    for (const pick of allPicks) {
      if (!pick.expert) continue;
      const s    = ensure(pick.expert);
      const u    = Number(pick.units) || 1;
      const isTot = (pick.pickType || '').toLowerCase().includes('total');

      switch (pick.result) {
        case 'WIN':
          s.wins++;
          s.units += u;
          if (isTot) { s.totalWins++; s.totalTotal++; }
          else        { s.spreadWins++; s.spreadTotal++; }
          break;
        case 'LOSS':
          s.losses++;
          s.units -= u * JUICE;
          if (isTot) s.totalTotal++;
          else       s.spreadTotal++;
          break;
        case 'PUSH':
          s.pushes++;
          if (isTot) s.totalTotal++;
          else       s.spreadTotal++;
          break;
        default: // PENDING or missing
          s.pending++;
      }
    }
  }

  return Object.values(stats)
    .map(s => {
      const graded  = s.wins + s.losses + s.pushes;
      const winPct  = graded > 0 ? (s.wins / (graded - s.pushes || 1)) * 100 : null;
      const roi     = graded > 0 ? (s.units / graded) * 100 : null;
      return {
        ...s,
        graded,
        winPct:       winPct != null ? parseFloat(winPct.toFixed(1)) : null,
        roi:          roi    != null ? parseFloat(roi.toFixed(1))    : null,
        units:        parseFloat(s.units.toFixed(2)),
        record:       `${s.wins}-${s.losses}${s.pushes > 0 ? `-${s.pushes}` : ''}`,
        spreadRecord: `${s.spreadWins}-${s.spreadTotal - s.spreadWins}`,
        totalRecord:  `${s.totalWins}-${s.totalTotal  - s.totalWins}`,
      };
    })
    .sort((a, b) => {
      // Sort by win% desc (nulls last), then by number of graded picks desc
      if (a.winPct == null && b.winPct == null) return b.pending - a.pending;
      if (a.winPct == null) return 1;
      if (b.winPct == null) return -1;
      return b.winPct - a.winPct || b.graded - a.graded;
    });
}

/**
 * Get all expert picks across all games as a flat array (for detailed views).
 * @param {Object} consensus
 * @param {string} [filterExpert] — optional expert name filter
 */
export function getAllExpertPicks(consensus, filterExpert = null) {
  const picks = [];
  for (const [gameId, gameData] of Object.entries(consensus)) {
    const all = [
      ...(gameData.expertPicks?.spread ?? []).map(p => ({ ...p, gameId, category: 'spread' })),
      ...(gameData.expertPicks?.total  ?? []).map(p => ({ ...p, gameId, category: 'total'  })),
    ];
    for (const pick of all) {
      if (!filterExpert || pick.expert === filterExpert) picks.push(pick);
    }
  }
  return picks;
}
