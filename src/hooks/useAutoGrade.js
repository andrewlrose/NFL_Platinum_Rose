// src/hooks/useAutoGrade.js
// ═══════════════════════════════════════════════════════════════════════════════
// useAutoGrade — auto-grade PENDING picks using final scores from Supabase.
//
// On mount (and every POLL_INTERVAL while pending picks exist), this hook:
//   1. Reads PENDING picks from pr_picks_v1 (localStorage)
//   2. Queries Supabase game_results for those ESPN game IDs
//   3. Calls gradeGame() for every matching final result
//   4. Returns { autoGraded, pendingCount, lastChecked, checking }
//
// The returned `autoGraded` counter increments each time grading runs —
// pass it as a `key` or `refreshKey` prop to force PicksTracker re-render.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { gradeGame, loadPicks } from '../lib/picksDatabase';
import { getGameResultsByIds } from '../lib/supabase';

// Poll every 5 minutes while there are PENDING picks
const POLL_INTERVAL_MS = 5 * 60 * 1000;

/**
 * @returns {{
 *   autoGraded: number,   — total picks graded this session (triggers re-renders)
 *   pendingCount: number, — current count of PENDING picks (updates after grading)
 *   lastChecked: Date|null,
 *   checking: boolean,
 *   runGradingCheck: () => void,  — call manually to trigger an immediate check
 * }}
 */
export function useAutoGrade() {
  const [autoGraded, setAutoGraded]     = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastChecked, setLastChecked]   = useState(null);
  const [checking, setChecking]         = useState(false);

  // Prevent concurrent runs
  const runningRef = useRef(false);

  const runGradingCheck = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setChecking(true);

    try {
      // 1. Get all PENDING picks
      const allPicks   = loadPicks();
      const pending    = allPicks.filter(p => p.result === 'PENDING');
      setPendingCount(pending.length);

      if (pending.length === 0) {
        setLastChecked(new Date());
        return; // nothing to grade
      }

      // 2. Collect unique game IDs from pending picks
      const gameIds = [...new Set(pending.map(p => p.gameId).filter(Boolean))];
      if (gameIds.length === 0) {
        setLastChecked(new Date());
        return;
      }

      // 3. Query Supabase for final results matching those IDs
      const results = await getGameResultsByIds(gameIds);
      if (results.length === 0) {
        console.log('[useAutoGrade] No final results found for pending picks.');
        setLastChecked(new Date());
        return;
      }

      // 4. Grade each matching game
      let gradedThisRun = 0;
      for (const result of results) {
        if (result.status !== 'final') continue;
        if (result.home_score == null || result.away_score == null) continue;

        // gradeGame returns the count of picks graded for this game
        const count = gradeGame(result.espn_id, result.home_score, result.away_score);
        if (count > 0) {
          gradedThisRun += count;
          console.log(
            `[useAutoGrade] ✅ Graded ${count} pick(s): ` +
            `${result.away_team} @ ${result.home_team} ` +
            `${result.away_score}–${result.home_score}`
          );
        }
      }

      if (gradedThisRun > 0) {
        setAutoGraded(prev => prev + gradedThisRun);
        // Recount pending after grading
        const remaining = loadPicks().filter(p => p.result === 'PENDING').length;
        setPendingCount(remaining);
        console.log(`[useAutoGrade] ${gradedThisRun} pick(s) graded. ${remaining} still pending.`);
      }

      setLastChecked(new Date());
    } catch (err) {
      console.warn('[useAutoGrade] Check failed:', err.message);
    } finally {
      setChecking(false);
      runningRef.current = false;
    }
  }, []); // stable ref — no deps that change

  // Run on mount
  useEffect(() => {
    runGradingCheck();
  }, [runGradingCheck]);

  // Poll while picks are pending
  useEffect(() => {
    if (pendingCount === 0) return; // no timer needed

    const id = setInterval(runGradingCheck, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [pendingCount, runGradingCheck]);

  return { autoGraded, pendingCount, lastChecked, checking, runGradingCheck };
}
