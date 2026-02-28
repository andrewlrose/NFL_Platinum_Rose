import { useState, useEffect, useCallback } from 'react';
import { loadFromStorage, saveToStorage } from '../lib/storage';

/**
 * useBettingCard — personal betting card state + handlers
 *
 * @param {Array} schedule - current schedule array (for team name lookup)
 */
export function useBettingCard(schedule) {
  const [myBets, setMyBets] = useState(() => loadFromStorage('nfl_my_bets', []));

  // --- Auto-save ---
  useEffect(() => {
    if (myBets.length > 0) {
      saveToStorage('nfl_my_bets', myBets);
      console.log('💾 My bets saved to localStorage');
    }
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

  const clearBets = useCallback(() => setMyBets([]), []);

  return {
    myBets,
    handleBet,
    removeBet,
    handleLockBets,
    clearBets,
  };
}
