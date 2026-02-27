import React, { useState, useEffect } from 'react';

// --- IMPORTS ---
import { INITIAL_EXPERTS, findExpert } from './lib/experts'; 
import { TEAM_ALIASES, normalizeTeam, getTeamLogo, getDomeTeams } from './lib/teams';
import { fetchLiveOdds } from './lib/oddsApi';
import { fetchAllInjuries } from './lib/injuries';
import { parseActionNetworkAuto } from './lib/actionParser';
import Header from './components/layout/Header';
import Dashboard from './components/dashboard/Dashboard';
import Standings from './components/dashboard/Standings';
import MatchupWizardModal from './components/modals/MatchupWizardModal';
import MyCardModal from './components/modals/MyCardModal';
import DevLab from './components/dev-lab/DevLab';
import SplitsModal from './components/modals/SplitsModal'; 
import WongTeaserModal from './components/modals/WongTeaserModal';
import PulseModal from './components/modals/PulseModal';
import ContestLinesModal from './components/modals/ContestLinesModal'; 
import AudioUploadModal from './components/modals/AudioUploadModal';
import ReviewPicksModal from './components/modals/ReviewPicksModal';
import BulkImportModal from './components/modals/BulkImportModal'; 
import ExpertManagerModal from './components/modals/ExpertManagerModal'; 
import InjuryReportModal from './components/modals/InjuryReportModal';
import UnitCalculatorModal from './components/modals/UnitCalculatorModal';
import BetEntryModal from './components/modals/BetEntryModal';
import BetImportModal from './components/modals/BetImportModal';
import PendingBetsModal from './components/modals/PendingBetsModal';
import EditBetModal from './components/modals/EditBetModal';
import BankrollDashboard from './components/bankroll/BankrollDashboard';
import AnalyticsDashboard from './components/analytics/AnalyticsDashboard';
import OddsCenter from './components/odds/OddsCenter'; 
import PicksTracker from './components/picks-tracker/PicksTracker';
import GUnitImportModal from './components/modals/GUnitImportModal';
import ManualGradeModal from './components/modals/ManualGradeModal';

// TEAM_ALIASES is now imported from './lib/teams'

function App() {
  // --- PERSISTENCE HELPERS ---
  const loadFromStorage = (key, defaultValue) => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch (e) {
      console.warn(`Failed to load ${key} from storage:`, e);
      return defaultValue;
    }
  };

  const saveToStorage = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`Failed to save ${key} to storage:`, e);
    }
  };

  // --- STATE WITH PERSISTENCE ---
  const [schedule, setSchedule] = useState([]); // 🔥 Dynamic Schedule State
  const [stats, setStats] = useState([]);
  const [splits, setSplits] = useState(() => loadFromStorage('nfl_splits', {}));
  const [injuries, setInjuries] = useState({}); // 🏥 Injury Reports
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedGame, setSelectedGame] = useState(null);
  
  // --- MODAL STATES ---
  const [showSplits, setShowSplits] = useState(false);
  const [showTeasers, setShowTeasers] = useState(false);
  const [showPulse, setShowPulse] = useState(false);     
  const [showContest, setShowContest] = useState(false); 
  const [showAudio, setShowAudio] = useState(false);     
  const [showReview, setShowReview] = useState(false);   
  const [showImport, setShowImport] = useState(false);   
  const [showExpertMgr, setShowExpertMgr] = useState(false); 
  const [showInjuryReport, setShowInjuryReport] = useState(false);
  const [showUnitCalculator, setShowUnitCalculator] = useState(false); 
  const [showBetEntry, setShowBetEntry] = useState(false);
  const [showBetImport, setShowBetImport] = useState(false);
  const [showPendingBets, setShowPendingBets] = useState(false);
  const [showEditBet, setShowEditBet] = useState(false);
  const [selectedBetForEdit, setSelectedBetForEdit] = useState(null); 
  const [showGUnitImport, setShowGUnitImport] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [gradeGameData, setGradeGameData] = useState(null);
  const [picksRefreshKey, setPicksRefreshKey] = useState(0);

  const [myBets, setMyBets] = useState(() => loadFromStorage('nfl_my_bets', []));
  const [simResults, setSimResults] = useState(() => loadFromStorage('nfl_sim_results', {}));
  const [contestLines, setContestLines] = useState(() => loadFromStorage('nfl_contest_lines', {})); 
  const [expertConsensus, setExpertConsensus] = useState(() => loadFromStorage('nfl_expert_consensus', {})); 
  const [stagedPicks, setStagedPicks] = useState([]); 

  // --- AUTO-SAVE EFFECTS ---
  // Save splits whenever they change
  useEffect(() => {
    if (Object.keys(splits).length > 0) {
      saveToStorage('nfl_splits', splits);
      console.log('💾 Splits data saved to localStorage');
    }
  }, [splits]);

  // Save expert consensus whenever it changes
  useEffect(() => {
    if (Object.keys(expertConsensus).length > 0) {
      saveToStorage('nfl_expert_consensus', expertConsensus);
      console.log('💾 Expert consensus saved to localStorage');
    }
  }, [expertConsensus]);

  // Save sim results whenever they change
  useEffect(() => {
    if (Object.keys(simResults).length > 0) {
      saveToStorage('nfl_sim_results', simResults);
      console.log('💾 Simulation results saved to localStorage');
    }
  }, [simResults]);

  // Save contest lines whenever they change
  useEffect(() => {
    if (Object.keys(contestLines).length > 0) {
      saveToStorage('nfl_contest_lines', contestLines);
      console.log('💾 Contest lines saved to localStorage');
    }
  }, [contestLines]);

  // Save my bets whenever they change
  useEffect(() => {
    if (myBets.length > 0) {
      saveToStorage('nfl_my_bets', myBets);
      console.log('💾 My bets saved to localStorage');
    }
  }, [myBets]); 

  // --- DYNAMIC DATA INGESTION ---
// --- DYNAMIC DATA INGESTION ---
  useEffect(() => {
    console.log("🚀 Booting Up: Fetching Live Schedule & Odds...");

    Promise.all([
        // 1. Schedule (Local - provides game IDs, times, team names)
        fetch("./schedule.json").then(r => r.ok ? r.json() : []).catch(() => []),

        // 2. Live Odds - DISABLED on startup to save API requests
        // Only fetch when user clicks "Sync Odds" button
        // fetchLiveOdds().catch(err => {
        //     console.warn("⚠️ Live odds fetch failed:", err);
        //     return [];
        // }),
        Promise.resolve([]), // Return empty array instead of calling API

        // 3. Stats (External -> Now Safe if Missing)
        fetch("./weekly_stats.json")
            .then(r => {
                if (!r.ok) throw new Error("Stats not found");
                return r.json();
            })
            .catch(err => {
                console.warn("⚠️ Stats load failed (using empty defaults):", err);
                return [];
            }),

        // 4. Splits (Updated to NEW Repo Name: NFL_Platinum_Rose)
        fetch("https://raw.githubusercontent.com/andrewlrose/NFL_Platinum_Rose/main/betting_splits.json")
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
        
        // Merge live odds into schedule (match by team abbreviation first, then name)
        const mergedSchedule = scheduleData.map(game => {
            const homeAbbrev = (game.home || '').toUpperCase();
            const visitorAbbrev = (game.visitor || '').toUpperCase();
            
            // Find matching live odds - try abbreviation first, then name matching
            const liveGame = liveOddsData.find(lg => {
                // Match by abbreviation (most reliable)
                if (lg.home_abbrev && lg.visitor_abbrev) {
                    return lg.home_abbrev === homeAbbrev && lg.visitor_abbrev === visitorAbbrev;
                }
                // Fallback to name matching
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
        
        // Set initial data
        setSchedule(mergedSchedule);
        setStats(statsData);
        setSplits(splitsData || {});
        
        // Fetch injuries for all teams in schedule (separate async call)
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
  
  
  const gamesWithSplits = schedule.map(game => {
      const gameData = splits[game.id] || splits[String(game.id)];
      const expertData = expertConsensus[game.id] || { expertPicks: { spread: [], total: [] } };
      const homeInjuries = injuries[game.home] || [];
      const visitorInjuries = injuries[game.visitor] || [];
      return {
          ...game,
          splits: gameData?.splits || null,
          contestSpread: contestLines[game.id] || null,
          consensus: expertData,
          injuries: {
              home: homeInjuries,
              visitor: visitorInjuries
          }
      };
  });

  // --- ROBUST MATCHER (Now uses Dynamic 'schedule') ---
  const findGameForTeam = (rawInput) => {
      if (!rawInput) return null;
      const clean = rawInput.toLowerCase().replace(/[^a-z0-9]/g, "");
      
      console.log(`🔍 Searching for game matching: "${rawInput}" (cleaned: "${clean}")`);
      
      // 1. Check Alias Dictionary for exact matches
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

      // 2. Try direct abbreviation matching (SEA, NE, etc.)
      const found = schedule.find(g => {
          const h = g.home.toLowerCase().replace(/[^a-z0-9]/g, "");
          const v = g.visitor.toLowerCase().replace(/[^a-z0-9]/g, "");
          return h === clean || v === clean;
      });
      if (found) {
          console.log(`✅ Found via direct abbreviation match:`, found);
          return found;
      }

      // 3. Try substring matching
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
  };

  // --- AI LOGIC ---
  const handleAIAnalyze = async (text, sourceData) => {
    try {
        console.log("Analyzing text...");
        const availableGames = schedule.map(g => `${g.visitor} @ ${g.home}`).join(", ");
        const prompt = `
        Analyze this NFL betting transcript and extract picks.
        Source: ${sourceData.name}
        
        Available games THIS WEEK: ${availableGames}
        
        For each pick, identify:
        1. The TEAM (must be one of the available games)
        2. The TYPE (Spread, Total, or Moneyline)
        3. The LINE (the spread/total value, or "ML" for moneyline)
        4. The analysis/rationale
        5. Units (confidence level)
        
        Return a valid JSON object with this exact format:
        {
          "picks": [
            {
              "selection": "SEA",
              "team1": "Seattle",
              "team2": "New England", 
              "type": "Spread",
              "line": "-4.5",
              "summary": "Key reasons for this pick",
              "analysis": "Detailed analysis",
              "units": 2
            }
          ]
        }
        
        Make sure "selection" is the team's abbreviation or clear identifier from the available games.
        
        Transcript: ${text.substring(0, 15000)}
        `;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${sourceData.apiKey}` },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [{ role: "system", content: "You are a betting analyst JSON extractor. Return ONLY a valid JSON object with 'picks' array. Ensure team names match the available games provided." }, { role: "user", content: prompt }],
                response_format: { type: "json_object" } 
            })
        });

        const data = await response.json();
        if (data.error) { alert(`OpenAI Error: ${data.error.message}`); return; }

        const content = JSON.parse(data.choices[0].message.content);
        let picks = content.picks || content;
        if (!Array.isArray(picks)) picks = [picks];

        const processedPicks = picks.map(p => {
            // Normalize Selection
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
        setShowAudio(false);
        setShowReview(true); 

    } catch (error) {
        console.error("AI Error:", error);
        alert("Error parsing transcript.");
    }
  };

  const handleConfirmPicks = () => {
      const newConsensus = { ...expertConsensus };
      let savedCount = 0;
      let skippedCount = 0;

      stagedPicks.forEach(p => {
          if (!p.gameId) {
              skippedCount++;
              return;
          }

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
          updatedGameData.expertPicks[category].push({
              expert: p.expert, pick: p.selection, line: p.line, pickType: p.type,
              analysis: p.analysis, rationale: p.rationale, units: p.units
          });

          newConsensus[p.gameId] = updatedGameData;
          savedCount++;
      });

      setExpertConsensus(newConsensus);
      setShowReview(false);
      setStagedPicks([]);
      
      if (skippedCount > 0) {
          alert(`Saved ${savedCount} picks.\n⚠️ Skipped ${skippedCount} picks because no game match was found.`);
      } else {
          alert(`Success! ${savedCount} picks added.`);
      }
  };

  // --- BOILERPLATE HANDLERS ---
  const handleUpdatePick = (gameId, oldPick, newPickData) => {
      const newConsensus = { ...expertConsensus };
      const gamePicks = newConsensus[gameId].expertPicks;
      const category = oldPick.type === 'Total' ? 'total' : 'spread';
      const index = gamePicks[category].findIndex(p => p.expert === oldPick.expert && p.pick === oldPick.pick);
      if (index !== -1) {
          gamePicks[category][index] = { ...gamePicks[category][index], ...newPickData };
          setExpertConsensus(newConsensus);
      }
  };
  const handleDeletePick = (gameId, pickToDelete) => {
      if(!window.confirm("Delete this pick?")) return;
      const newConsensus = { ...expertConsensus };
      const category = pickToDelete.type === 'Total' ? 'total' : 'spread';
      newConsensus[gameId].expertPicks[category] = newConsensus[gameId].expertPicks[category].filter(p => !(p.expert === pickToDelete.expert && p.pick === pickToDelete.pick));
      setExpertConsensus(newConsensus);
  };
  const handleClearExpert = (expertName) => {
      const newConsensus = { ...expertConsensus };
      Object.keys(newConsensus).forEach(gameId => {
          newConsensus[gameId].expertPicks.spread = newConsensus[gameId].expertPicks.spread.filter(p => p.expert !== expertName);
          newConsensus[gameId].expertPicks.total = newConsensus[gameId].expertPicks.total.filter(p => p.expert !== expertName);
      });
      setExpertConsensus(newConsensus);
  };

  const handleBulkImport = (text) => {
      console.log("📋 Processing bulk import...");
      
      // Try to parse as Action Network Splits
      const parsed = parseActionNetworkAuto(text);
      
      if (!parsed || parsed.length === 0) {
          alert("❌ Could not parse the data. Make sure it's properly formatted Action Network splits data.");
          return;
      }

      console.log("✅ Parsed splits:", parsed);
      
      // Update splits for each parsed game
      const newSplits = { ...splits };
      let updateCount = 0;

      parsed.forEach(p => {
          console.log(`🔍 Looking for game: ${p.visitor} @ ${p.home}`);
          
          // Try to find matching game using flexible team name matching
          // The schedule might have abbreviations (SEA, NE) while parsed data has full names (Seahawks, Patriots)
          const game = schedule.find(g => {
              const schedVisitor = g.visitor.toLowerCase().replace(/[^a-z]/g, '');
              const schedHome = g.home.toLowerCase().replace(/[^a-z]/g, '');
              const parsedVisitor = p.visitor.toLowerCase().replace(/[^a-z]/g, '');
              const parsedHome = p.home.toLowerCase().replace(/[^a-z]/g, '');
              
              // Try direct match first
              if (schedVisitor === parsedVisitor && schedHome === parsedHome) {
                  console.log(`✅ Direct match: ${g.visitor} @ ${g.home}`);
                  return true;
              }
              
              // Try substring matching (SEA matches Seahawks, NE matches newengland/patriots)
              if ((schedVisitor.includes(parsedVisitor) || parsedVisitor.includes(schedVisitor)) &&
                  (schedHome.includes(parsedHome) || parsedHome.includes(schedHome))) {
                  console.log(`✅ Substring match: ${g.visitor} @ ${g.home}`);
                  return true;
              }
              
              // Try using findGameForTeam helper
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
              
              // Merge new splits with existing data (don't overwrite)
              // This allows importing both ATS and ML data for the same game
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
  };

  const handleBet = (gameId, type, selection, line) => {
    const game = schedule.find(g => g.id === gameId);
    setMyBets([{ id: Date.now(), game: `${game.visitor} @ ${game.home}`, gameId, selection, type, line, odds: -110, status: 'OPEN' }, ...myBets]);
    setSelectedGame(null);
  };
  const removeBet = (id) => setMyBets(myBets.filter(b => b.id !== id));
  const handleLockBets = (betIds) => setMyBets(prev => prev.map(bet => (betIds.includes(bet.id) ? { ...bet, status: 'PLACED' } : bet)));

  if (loading) return <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center text-[#00d2be] font-mono">Loading Data Engine...</div>;

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-200 font-sans pb-20 selection:bg-[#00d2be] selection:text-black">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} cartCount={myBets.length} onSyncOdds={() => console.log("Sync")} onOpenSplits={() => setShowPulse(true)} onOpenSplitsData={() => setShowSplits(true)} onOpenTeasers={() => setShowTeasers(true)} onOpenContest={() => setShowContest(true)} onImport={() => setShowImport(true)} onAnalyze={() => setShowAudio(true)} onManage={() => setShowExpertMgr(true)} onSave={() => alert("Save functionality coming soon")} onReset={() => { if(window.confirm("Reset all picks?")) setMyBets([]); }}/>
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'dashboard' && <div className="animate-in fade-in zoom-in duration-300"><Dashboard schedule={gamesWithSplits} stats={stats} simResults={simResults} onGameClick={setSelectedGame} onShowInjuries={(game) => { setSelectedGame(game); setShowInjuryReport(true); }} onAddBankrollBet={(game) => { setSelectedGame(game); setShowBetEntry(true); }} /></div>}
        {activeTab === 'standings' && <Standings experts={INITIAL_EXPERTS} />}
        {activeTab === 'mycard' && <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300"><MyCardModal bets={myBets} onRemoveBet={removeBet} onLockBets={handleLockBets} onClearCard={() => setMyBets([])} /></div>}
        {activeTab === 'devlab' && <DevLab games={schedule} stats={stats} savedResults={simResults} onSimComplete={setSimResults} />}
        {activeTab === 'bankroll' && <div className="animate-in fade-in zoom-in duration-300"><BankrollDashboard onAddBet={() => setShowBetEntry(true)} onShowCalculator={() => setShowUnitCalculator(true)} onImportBets={() => setShowBetImport(true)} onShowPending={() => setShowPendingBets(true)} onShowSettings={() => {}} /></div>}
        {activeTab === 'analytics' && <div className="animate-in fade-in zoom-in duration-300"><AnalyticsDashboard /></div>}
        {activeTab === 'odds' && <div className="animate-in fade-in zoom-in duration-300"><OddsCenter /></div>}
        {activeTab === 'picks' && <div className="animate-in fade-in zoom-in duration-300"><PicksTracker onOpenGUnit={() => setShowGUnitImport(true)} onOpenGradeModal={(gameData) => { setGradeGameData(gameData); setShowGradeModal(true); }} key={picksRefreshKey} /></div>}
      </main>
      <MatchupWizardModal isOpen={!!selectedGame} game={selectedGame} stats={stats} currentWizardData={selectedGame ? (expertConsensus[selectedGame.id] || null) : null} onClose={() => setSelectedGame(null)} onBet={(id, type, sel, line) => { handleBet(id, type, sel, line); setSelectedGame(null); }} />
      <PulseModal isOpen={showPulse} onClose={() => setShowPulse(false)} games={gamesWithSplits} />
      <ContestLinesModal isOpen={showContest} onClose={() => setShowContest(false)} games={gamesWithSplits} onUpdateContestLines={setContestLines} />
      <WongTeaserModal isOpen={showTeasers} onClose={() => setShowTeasers(false)} games={gamesWithSplits} />
      <SplitsModal isOpen={showSplits} onClose={() => setShowSplits(false)} games={gamesWithSplits} />
      <AudioUploadModal isOpen={showAudio} onClose={() => setShowAudio(false)} onAnalyze={handleAIAnalyze} />
      <ReviewPicksModal isOpen={showReview} onClose={() => setShowReview(false)} stagedPicks={stagedPicks} onConfirm={handleConfirmPicks} onDiscard={(idx) => setStagedPicks(stagedPicks.filter((_, i) => i !== idx))} />
      <BulkImportModal isOpen={showImport} onClose={() => setShowImport(false)} onImport={handleBulkImport} />
      <ExpertManagerModal isOpen={showExpertMgr} onClose={() => setShowExpertMgr(false)} experts={INITIAL_EXPERTS} expertConsensus={expertConsensus} onUpdatePick={handleUpdatePick} onDeletePick={handleDeletePick} onClearExpert={handleClearExpert} />
      <InjuryReportModal isOpen={showInjuryReport} onClose={() => setShowInjuryReport(false)} game={selectedGame} injuries={injuries} />
      <UnitCalculatorModal isOpen={showUnitCalculator} onClose={() => setShowUnitCalculator(false)} />
      <BetEntryModal 
        isOpen={showBetEntry} 
        onClose={() => setShowBetEntry(false)} 
        selectedGame={selectedGame} 
        schedule={schedule}
        refreshBankroll={() => {}} 
      />
      <BetImportModal 
        isOpen={showBetImport} 
        onClose={() => setShowBetImport(false)} 
        onImportComplete={(betId, bet) => {
          console.log('Bet imported:', betId, bet);
          alert('Bet imported successfully!');
        }} 
      />
      
      <PendingBetsModal 
        isOpen={showPendingBets}
        onClose={() => setShowPendingBets(false)}
        onEditBet={(bet) => {
          setSelectedBetForEdit(bet);
          setShowEditBet(true);
        }}
      />
      
      <EditBetModal 
        isOpen={showEditBet}
        onClose={() => {
          setShowEditBet(false);
          setSelectedBetForEdit(null);
        }}
        bet={selectedBetForEdit}
        schedule={schedule}
        onBetUpdated={() => {
          // Force refresh of pending bets when we return
          setShowPendingBets(false);
          setTimeout(() => setShowPendingBets(true), 100);
        }}
      />
      
      <GUnitImportModal 
        isOpen={showGUnitImport}
        onClose={() => { setShowGUnitImport(false); setPicksRefreshKey(k => k + 1); }}
        schedule={schedule}
      />
      
      <ManualGradeModal 
        isOpen={showGradeModal}
        onClose={() => { setShowGradeModal(false); setGradeGameData(null); setPicksRefreshKey(k => k + 1); }}
        gameData={gradeGameData}
        onGraded={() => setPicksRefreshKey(k => k + 1)}
      />
    </div>
  );
}
export default App;