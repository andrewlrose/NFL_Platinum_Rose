import { useState, useEffect, useCallback } from 'react';
import { loadFromStorage, saveToStorage, clearStorage, PR_STORAGE_KEYS } from '../lib/storage';

/**
 * useBettingCard — personal betting card state + handlers
 *
 * @param {Array} schedule - current schedule array (for team name lookup)
 */
export function useBettingCard(schedule) {
  const [myBets, setMyBets] = useState(() => loadFromStorage(PR_STORAGE_KEYS.MY_BETS.key, []));

  // --- Auto-save (guard removed — clearing bets must persist through refresh) ---
  useEffect(() => {
    saveToStorage(PR_STORAGE_KEYS.MY_BETS.key, myBets);
  }, [myBets]);

  const handleBet = useCallback((gameId, type, selection, line) => {
    const game = schedule.find(g => g.id === gameId);
    setMyBets(prev => [{
      id: Date.now(),
      game: `${game.visitor} @ ${game.home}`,
      gameId, selection, type, line,
      odds: -110,
      status: 'OPEN'
    }, ...prev]);
  }, [schedule]);

  const removeBet = useCallback(
    (id) => setMyBets(prev => prev.filter(b => b.id !== id)),
    []
  );

  const handleLockBets = useCallback(
    (betIds) => setMyBets(prev => prev.map(bet =>
      betIds.includes(bet.id) ? { ...bet, status: 'PLACED' } : bet
    )),
    []
  );

  const clearBets = useCallback(() => {
    setMyBets([]);
    clearStorage(PR_STORAGE_KEYS.MY_BETS.key, []);  // persist the clear through refresh
  }, []);

  return {
    myBets,
    handleBet,
    removeBet,
    handleLockBets,
    clearBets,
  };
}
