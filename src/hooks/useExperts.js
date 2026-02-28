import { useState, useEffect, useCallback } from 'react';
import { extractPicksFromTranscript } from '../lib/openai';
import { loadFromStorage, saveToStorage } from '../lib/storage';

/**
 * useExperts — expert consensus CRUD + AI transcript analysis
 *
 * @param {Object} opts
 * @param {Array}    opts.schedule        - current schedule array
 * @param {Function} opts.findGameForTeam - team matcher from useSchedule
 * @param {Function} opts.openModal       - from useModals
 * @param {Function} opts.closeModal      - from useModals
 */
export function useExperts({ schedule, findGameForTeam, openModal, closeModal }) {
  const [expertConsensus, setExpertConsensus] = useState(
    () => loadFromStorage('nfl_expert_consensus', {})
  );
  const [stagedPicks, setStagedPicks] = useState([]);

  // --- Auto-save ---
  useEffect(() => {
    if (Object.keys(expertConsensus).length > 0) {
      saveToStorage('nfl_expert_consensus', expertConsensus);
      console.log('💾 Expert consensus saved to localStorage');
    }
  }, [expertConsensus]);

  // --- AI Transcript → Picks ---
  const handleAIAnalyze = useCallback(async (text, sourceData) => {
    try {
      console.log("Analyzing text...");
      const availableGames = schedule.map(g => `${g.visitor} @ ${g.home}`);

      const picks = await extractPicksFromTranscript(text, sourceData, availableGames);

      const processedPicks = picks.map(p => {
        let searchString = p.selection;
        if (p.selection === "Over" || p.selection === "Under") {
          searchString = p.team1 || p.team2 || "Unknown";
        }
        if (!searchString) searchString = p.pick || p.team || "Unknown";

        const game = findGameForTeam(searchString);

        return {
          ...p,
          selection: p.selection,
          gameId: game ? game.id : null,
          expert: sourceData.name,
          rationale: p.summary || p.rationale || p.analysis,
          matched: !!game
        };
      });

      setStagedPicks(processedPicks);
      closeModal('audio');
      openModal('review');
    } catch (error) {
      console.error("AI Error:", error);
      alert(error.message || "Error parsing transcript.");
    }
  }, [schedule, findGameForTeam, closeModal, openModal]);

  // --- Confirm staged picks into consensus ---
  const handleConfirmPicks = useCallback(() => {
    let savedCount = 0;
    let skippedCount = 0;

    // Build a fast gameId → game lookup from schedule
    const gameMap = new Map((schedule || []).map(g => [String(g.id), g]));

    stagedPicks.forEach(p => {
      if (!p.gameId) { skippedCount++; } else { savedCount++; }
    });

    setExpertConsensus(prev => {
      const newConsensus = { ...prev };
      stagedPicks.forEach(p => {
        if (!p.gameId) return;
        if (!newConsensus[p.gameId]) newConsensus[p.gameId] = { expertPicks: { spread: [], total: [] } };

        const updatedGameData = {
          ...newConsensus[p.gameId],
          expertPicks: {
            ...newConsensus[p.gameId].expertPicks,
            spread: [...newConsensus[p.gameId].expertPicks.spread],
            total: [...newConsensus[p.gameId].expertPicks.total],
          }
        };

        const category = (p.type && p.type.toLowerCase().includes('total')) ? 'total' : 'spread';

        // Enrich pick with grading-ready fields from schedule
        const game = gameMap.get(String(p.gameId));
        const homeNames = game ? [game.home, game.homeName].filter(Boolean).map(s => s.toLowerCase()) : [];
        const sel = (p.selection || '').toLowerCase();
        const isHomeTeam = homeNames.some(h => sel.includes(h) || h.includes(sel));

        updatedGameData.expertPicks[category].push({
          id:          `${p.expert}-${p.gameId}-${category}-${Date.now()}`,
          expert:      p.expert,
          pick:        p.selection,
          line:        p.line,
          pickType:    p.type,
          isHomeTeam,
          home:        game?.homeName ?? game?.home ?? null,
          visitor:     game?.visitorName ?? game?.visitor ?? null,
          gameDate:    game?.date ?? null,
          analysis:    p.analysis,
          rationale:   p.rationale,
          units:       p.units ?? 1,
          result:      'PENDING',
          gradedAt:    null,
          addedAt:     new Date().toISOString(),
        });

        newConsensus[p.gameId] = updatedGameData;
      });
      return newConsensus;
    });

    closeModal('review');
    setStagedPicks([]);

    if (skippedCount > 0) {
      alert(`Saved ${savedCount} picks.\n⚠️ Skipped ${skippedCount} picks because no game match was found.`);
    } else {
      alert(`Success! ${savedCount} picks added.`);
    }
  }, [stagedPicks, schedule, closeModal]);

  // --- CRUD handlers (all use functional updaters → stable refs) ---
  const handleUpdatePick = useCallback((gameId, oldPick, newPickData) => {
    setExpertConsensus(prev => {
      const newConsensus = { ...prev };
      const gamePicks = { ...newConsensus[gameId].expertPicks };
      const category = oldPick.type === 'Total' ? 'total' : 'spread';
      const updated = [...gamePicks[category]];
      const index = updated.findIndex(p => p.expert === oldPick.expert && p.pick === oldPick.pick);
      if (index !== -1) {
        updated[index] = { ...updated[index], ...newPickData };
        gamePicks[category] = updated;
        newConsensus[gameId] = { ...newConsensus[gameId], expertPicks: gamePicks };
      }
      return newConsensus;
    });
  }, []);

  const handleDeletePick = useCallback((gameId, pickToDelete) => {
    if (!window.confirm("Delete this pick?")) return;
    setExpertConsensus(prev => {
      const newConsensus = { ...prev };
      const category = pickToDelete.type === 'Total' ? 'total' : 'spread';
      newConsensus[gameId] = {
        ...newConsensus[gameId],
        expertPicks: {
          ...newConsensus[gameId].expertPicks,
          [category]: newConsensus[gameId].expertPicks[category].filter(
            p => !(p.expert === pickToDelete.expert && p.pick === pickToDelete.pick)
          )
        }
      };
      return newConsensus;
    });
  }, []);

  const handleClearExpert = useCallback((expertName) => {
    setExpertConsensus(prev => {
      const newConsensus = { ...prev };
      Object.keys(newConsensus).forEach(gameId => {
        newConsensus[gameId] = {
          ...newConsensus[gameId],
          expertPicks: {
            spread: newConsensus[gameId].expertPicks.spread.filter(p => p.expert !== expertName),
            total: newConsensus[gameId].expertPicks.total.filter(p => p.expert !== expertName),
          }
        };
      });
      return newConsensus;
    });
  }, []);

  return {
    expertConsensus,
    stagedPicks,
    setStagedPicks,
    handleAIAnalyze,
    handleConfirmPicks,
    handleUpdatePick,
    handleDeletePick,
    handleClearExpert,
  };
}
