import { useState, useEffect, useCallback } from 'react';
import { TEAM_ALIASES } from '../lib/teams';
import { fetchAllInjuries } from '../lib/injuries';
import { parseActionNetworkAuto } from '../lib/actionParser';
import { GITHUB_RAW, LOCAL_DATA } from '../lib/apiConfig';
import { loadFromStorage, saveToStorage } from '../lib/storage';

/**
 * useSchedule — boot sequence, data fetching, splits import, team matcher
 *
 * Owns: schedule, stats, splits, injuries, loading, contestLines, simResults
 */
export function useSchedule() {
  const [schedule, setSchedule] = useState([]);
  const [stats, setStats] = useState([]);
  const [splits, setSplits] = useState(() => loadFromStorage('nfl_splits', {}));
  const [injuries, setInjuries] = useState({});
  const [loading, setLoading] = useState(true);
  const [contestLines, setContestLines] = useState(() => loadFromStorage('nfl_contest_lines', {}));
  const [simResults, setSimResults] = useState(() => loadFromStorage('nfl_sim_results', {}));

  // --- AUTO-SAVE EFFECTS ---
  useEffect(() => {
    if (Object.keys(splits).length > 0) {
      saveToStorage('nfl_splits', splits);
      console.log('💾 Splits data saved to localStorage');
    }
  }, [splits]);

  useEffect(() => {
    if (Object.keys(simResults).length > 0) {
      saveToStorage('nfl_sim_results', simResults);
      console.log('💾 Simulation results saved to localStorage');
    }
  }, [simResults]);

  useEffect(() => {
    if (Object.keys(contestLines).length > 0) {
      saveToStorage('nfl_contest_lines', contestLines);
      console.log('💾 Contest lines saved to localStorage');
    }
  }, [contestLines]);

  // --- BOOT SEQUENCE ---
  useEffect(() => {
    console.log("🚀 Booting Up: Fetching Live Schedule & Odds...");

    Promise.all([
      // 1. Schedule (Local)
      fetch(LOCAL_DATA.SCHEDULE).then(r => r.ok ? r.json() : []).catch(() => []),

      // 2. Live Odds — DISABLED on startup to save API requests
      Promise.resolve([]),

      // 3. Stats
      fetch(LOCAL_DATA.WEEKLY_STATS)
        .then(r => {
          if (!r.ok) throw new Error("Stats not found");
          return r.json();
        })
        .catch(err => {
          console.warn("⚠️ Stats load failed (using empty defaults):", err);
          return [];
        }),

      // 4. Splits (GitHub raw)
      fetch(GITHUB_RAW.SPLITS_URL)
        .then(r => {
          if (!r.ok) throw new Error("Splits not found");
          return r.json();
        })
        .catch(err => {
          console.warn("⚠️ Splits load failed:", err);
          return {};
        })
    ]).then(([scheduleData, liveOddsData, statsData, splitsData]) => {
      console.log(`✅ Schedule Loaded: ${scheduleData.length} games`);
      console.log(`✅ Live Odds Loaded: ${liveOddsData.length} games from TheOddsAPI`);

      // Merge live odds into schedule
      const mergedSchedule = scheduleData.map(game => {
        const homeAbbrev = (game.home || '').toUpperCase();
        const visitorAbbrev = (game.visitor || '').toUpperCase();

        const liveGame = liveOddsData.find(lg => {
          if (lg.home_abbrev && lg.visitor_abbrev) {
            return lg.home_abbrev === homeAbbrev && lg.visitor_abbrev === visitorAbbrev;
          }
          const lgHome = (lg.home || '').toLowerCase();
          const lgVisitor = (lg.visitor || '').toLowerCase();
          const homeClean = homeAbbrev.toLowerCase();
          const visitorClean = visitorAbbrev.toLowerCase();
          return (lgHome.includes(homeClean) || homeClean.includes(lgHome)) &&
                 (lgVisitor.includes(visitorClean) || visitorClean.includes(lgVisitor));
        });

        if (liveGame) {
          console.log(`🔄 Live odds merged: ${game.visitor} @ ${game.home} → Spread: ${liveGame.spread}, Total: ${liveGame.total}, ML: ${liveGame.visitor_ml}/${liveGame.home_ml}`);
          return {
            ...game,
            spread: liveGame.spread ?? game.spread,
            total: liveGame.total ?? game.total,
            home_ml: liveGame.home_ml || null,
            visitor_ml: liveGame.visitor_ml || null,
            oddsSource: 'TheOddsAPI'
          };
        }
        console.warn(`⚠️ No live odds found for ${game.visitor} @ ${game.home}, using ESPN fallback`);
        return { ...game, oddsSource: 'ESPN' };
      });

      setSchedule(mergedSchedule);
      setStats(statsData);
      setSplits(splitsData || {});

      // Injuries (separate async call)
      fetchAllInjuries(mergedSchedule)
        .then(injuryData => {
          console.log(`🏥 Injuries loaded for ${Object.keys(injuryData).length} teams`);
          setInjuries(injuryData);
        })
        .catch(err => console.warn("⚠️ Injury fetch failed:", err))
        .finally(() => setLoading(false));

    }).catch(err => {
      console.error("CRITICAL Error loading data:", err);
      setLoading(false);
    });
  }, []);

  // --- ROBUST TEAM MATCHER (3-tier: alias → abbreviation → substring) ---
  const findGameForTeam = useCallback((rawInput) => {
    if (!rawInput) return null;
    const clean = rawInput.toLowerCase().replace(/[^a-z0-9]/g, "");

    console.log(`🔍 Searching for game matching: "${rawInput}" (cleaned: "${clean}")`);

    // 1. Alias dictionary
    for (const [alias, standard] of Object.entries(TEAM_ALIASES)) {
      if (clean === alias || clean.includes(alias)) {
        const standardClean = standard.toLowerCase();
        const found = schedule.find(g => {
          const h = g.home.toLowerCase().replace(/[^a-z0-9]/g, "");
          const v = g.visitor.toLowerCase().replace(/[^a-z0-9]/g, "");
          return h.includes(standardClean) || v.includes(standardClean);
        });
        if (found) {
          console.log(`✅ Found via alias "${alias}" -> "${standard}":`, found);
          return found;
        }
      }
    }

    // 2. Direct abbreviation
    const found = schedule.find(g => {
      const h = g.home.toLowerCase().replace(/[^a-z0-9]/g, "");
      const v = g.visitor.toLowerCase().replace(/[^a-z0-9]/g, "");
      return h === clean || v === clean;
    });
    if (found) {
      console.log(`✅ Found via direct abbreviation match:`, found);
      return found;
    }

    // 3. Substring
    const foundSubstring = schedule.find(g => {
      const home = g.home.toLowerCase().replace(/[^a-z0-9]/g, "");
      const vis = g.visitor.toLowerCase().replace(/[^a-z0-9]/g, "");
      return home.includes(clean) || vis.includes(clean) || clean.includes(home) || clean.includes(vis);
    });
    if (foundSubstring) {
      console.log(`✅ Found via substring match:`, foundSubstring);
      return foundSubstring;
    }

    console.log(`❌ No game found for "${rawInput}"`);
    console.log(`Available games:`, schedule.map(g => `${g.visitor} @ ${g.home}`));
    return null;
  }, [schedule]);

  // --- BULK SPLITS IMPORT ---
  const handleBulkImport = useCallback((text) => {
    console.log("📋 Processing bulk import...");

    const parsed = parseActionNetworkAuto(text);

    if (!parsed || parsed.length === 0) {
      alert("❌ Could not parse the data. Make sure it's properly formatted Action Network splits data.");
      return;
    }

    console.log("✅ Parsed splits:", parsed);

    const newSplits = { ...splits };
    let updateCount = 0;

    parsed.forEach(p => {
      console.log(`🔍 Looking for game: ${p.visitor} @ ${p.home}`);

      const game = schedule.find(g => {
        const schedVisitor = g.visitor.toLowerCase().replace(/[^a-z]/g, '');
        const schedHome = g.home.toLowerCase().replace(/[^a-z]/g, '');
        const parsedVisitor = p.visitor.toLowerCase().replace(/[^a-z]/g, '');
        const parsedHome = p.home.toLowerCase().replace(/[^a-z]/g, '');

        if (schedVisitor === parsedVisitor && schedHome === parsedHome) {
          console.log(`✅ Direct match: ${g.visitor} @ ${g.home}`);
          return true;
        }

        if ((schedVisitor.includes(parsedVisitor) || parsedVisitor.includes(schedVisitor)) &&
            (schedHome.includes(parsedHome) || parsedHome.includes(schedHome))) {
          console.log(`✅ Substring match: ${g.visitor} @ ${g.home}`);
          return true;
        }

        const visitorGame = findGameForTeam(p.visitor);
        const homeGame = findGameForTeam(p.home);
        if (visitorGame && visitorGame.id === g.id) {
          console.log(`✅ Found via visitor team search: ${g.visitor} @ ${g.home}`);
          return true;
        }
        if (homeGame && homeGame.id === g.id) {
          console.log(`✅ Found via home team search: ${g.visitor} @ ${g.home}`);
          return true;
        }

        return false;
      });

      if (game) {
        console.log(`📊 Updating splits for ${game.visitor} @ ${game.home}`);

        const existingSplits = newSplits[game.id] || {};
        const mergedSplits = {
          ...existingSplits,
          ...p,
          splits: {
            ...existingSplits.splits,
            ...p.splits
          }
        };

        newSplits[game.id] = mergedSplits;
        updateCount++;
      } else {
        console.warn(`⚠️ No game found for ${p.visitor} @ ${p.home}`);
        console.log(`Available games:`, schedule.map(g => `${g.visitor} @ ${g.home}`));
      }
    });

    setSplits(newSplits);
    alert(`✅ Successfully imported ${updateCount} game splits!`);
  }, [splits, schedule, findGameForTeam]);

  return {
    schedule,
    stats,
    splits,
    injuries,
    loading,
    contestLines,
    setContestLines,
    simResults,
    setSimResults,
    findGameForTeam,
    handleBulkImport,
  };
}
