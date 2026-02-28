import React, { useState, useMemo } from 'react';

// --- Hooks ---
import { useModals } from './hooks/useModals';
import { useSchedule } from './hooks/useSchedule';
import { useExperts } from './hooks/useExperts';
import { useBettingCard } from './hooks/useBettingCard';
import { useAutoGrade } from './hooks/useAutoGrade';

// --- Lib ---
import { INITIAL_EXPERTS } from './lib/experts';

// --- Components ---
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
import ManualGradeModal from './components/modals/ManualGradeModal';
import BankrollSettingsModal from './components/modals/BankrollSettingsModal';

function App() {
  // --- UI State (local to App) ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedGame, setSelectedGame] = useState(null);
  const [betEntryGame, setBetEntryGame] = useState(null);

  // --- Custom Hooks ---
  const {
    modals, openModal, closeModal,
    selectedBetForEdit, setSelectedBetForEdit,
    gradeGameData, setGradeGameData,
    picksRefreshKey, setPicksRefreshKey,
  } = useModals();

  const {
    schedule, stats, splits, injuries, loading,
    contestLines, setContestLines,
    simResults, setSimResults,
    findGameForTeam,
    handleBulkImport,
  } = useSchedule();

  const {
    expertConsensus, stagedPicks, setStagedPicks,
    handleAIAnalyze, handleConfirmPicks,
    handleUpdatePick, handleDeletePick, handleClearExpert,
  } = useExperts({ schedule, findGameForTeam, openModal, closeModal });

  const {
    myBets, handleBet, removeBet, handleLockBets, clearBets,
  } = useBettingCard(schedule);

  // --- Auto-grade pending picks from Supabase game_results ---
  const { autoGraded } = useAutoGrade();

  // --- Derived Data (cross-cutting: merges schedule + experts + splits) ---
  const gamesWithSplits = useMemo(() => schedule.map(game => {
    const gameData = splits[game.id] || splits[String(game.id)];
    const expertData = expertConsensus[game.id] || { expertPicks: { spread: [], total: [] } };
    const homeInjuries = injuries[game.home] || [];
    const visitorInjuries = injuries[game.visitor] || [];
    return {
      ...game,
      splits: gameData?.splits || null,
      contestSpread: contestLines[game.id] || null,
      consensus: expertData,
      injuries: { home: homeInjuries, visitor: visitorInjuries }
    };
  }), [schedule, splits, expertConsensus, contestLines, injuries]);

  // --- Loading Gate ---
  if (loading) return <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center text-[#00d2be] font-mono">Loading Data Engine...</div>;

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-gray-200 font-sans pb-20 selection:bg-[#00d2be] selection:text-black">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} cartCount={myBets.length} onSyncOdds={() => console.log("Sync")} onOpenSplits={() => openModal('pulse')} onOpenSplitsData={() => openModal('splits')} onOpenTeasers={() => openModal('teasers')} onOpenContest={() => openModal('contest')} onImport={() => openModal('import')} onAnalyze={() => openModal('audio')} onManage={() => openModal('expertMgr')} onSave={() => alert("Save functionality coming soon")} onReset={() => { if(window.confirm("Reset all picks?")) clearBets(); }}/>
      <main className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'dashboard' && <div className="animate-in fade-in zoom-in duration-300"><Dashboard schedule={gamesWithSplits} stats={stats} simResults={simResults} onGameClick={setSelectedGame} onShowInjuries={(game) => { setSelectedGame(game); openModal('injuryReport'); }} onAddBankrollBet={(game) => { setBetEntryGame(game); openModal('betEntry'); }} /></div>}
        {activeTab === 'standings' && <Standings experts={INITIAL_EXPERTS} />}
        {activeTab === 'mycard' && <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300"><MyCardModal bets={myBets} onRemoveBet={removeBet} onLockBets={handleLockBets} onClearCard={clearBets} /></div>}
        {activeTab === 'devlab' && <DevLab games={schedule} stats={stats} savedResults={simResults} onSimComplete={setSimResults} />}
        {activeTab === 'bankroll' && <div className="animate-in fade-in zoom-in duration-300"><BankrollDashboard onAddBet={() => openModal('betEntry')} onShowCalculator={() => openModal('unitCalculator')} onImportBets={() => openModal('betImport')} onShowPending={() => openModal('pendingBets')} onShowSettings={() => openModal('bankrollSettings')} /></div>}
        {activeTab === 'analytics' && <div className="animate-in fade-in zoom-in duration-300"><AnalyticsDashboard /></div>}
        {activeTab === 'odds' && <div className="animate-in fade-in zoom-in duration-300"><OddsCenter /></div>}
        {activeTab === 'picks' && <div className="animate-in fade-in zoom-in duration-300"><PicksTracker onOpenGradeModal={(gameData) => { setGradeGameData(gameData); openModal('gradeModal'); }} key={`picks-${picksRefreshKey}-${autoGraded}`} /></div>}
      </main>

      {/* --- LAZY-MOUNTED MODALS --- */}
      {selectedGame && <MatchupWizardModal isOpen game={selectedGame} stats={stats} currentWizardData={expertConsensus[selectedGame.id] || null} onClose={() => setSelectedGame(null)} onBet={(id, type, sel, line) => { handleBet(id, type, sel, line); setSelectedGame(null); }} />}
      {modals.pulse && <PulseModal isOpen onClose={() => closeModal('pulse')} games={gamesWithSplits} />}
      {modals.contest && <ContestLinesModal isOpen onClose={() => closeModal('contest')} games={gamesWithSplits} onUpdateContestLines={setContestLines} />}
      {modals.teasers && <WongTeaserModal isOpen onClose={() => closeModal('teasers')} games={gamesWithSplits} />}
      {modals.splits && <SplitsModal isOpen onClose={() => closeModal('splits')} games={gamesWithSplits} />}
      {modals.audio && <AudioUploadModal isOpen onClose={() => closeModal('audio')} onAnalyze={handleAIAnalyze} />}
      {modals.review && <ReviewPicksModal isOpen onClose={() => closeModal('review')} stagedPicks={stagedPicks} onConfirm={handleConfirmPicks} onDiscard={(idx) => setStagedPicks(prev => prev.filter((_, i) => i !== idx))} />}
      {modals.import && <BulkImportModal isOpen onClose={() => closeModal('import')} onImport={handleBulkImport} />}
      {modals.expertMgr && <ExpertManagerModal isOpen onClose={() => closeModal('expertMgr')} experts={INITIAL_EXPERTS} expertConsensus={expertConsensus} onUpdatePick={handleUpdatePick} onDeletePick={handleDeletePick} onClearExpert={handleClearExpert} />}
      {modals.injuryReport && <InjuryReportModal isOpen onClose={() => closeModal('injuryReport')} game={selectedGame} injuries={injuries} />}
      {modals.unitCalculator && <UnitCalculatorModal isOpen onClose={() => closeModal('unitCalculator')} />}
      {modals.betEntry && <BetEntryModal isOpen onClose={() => { closeModal('betEntry'); setBetEntryGame(null); }} selectedGame={betEntryGame} schedule={schedule} refreshBankroll={() => {}} />}
      {modals.betImport && <BetImportModal isOpen onClose={() => closeModal('betImport')} onImportComplete={(betId, bet) => { console.log('Bet imported:', betId, bet); alert('Bet imported successfully!'); }} />}
      {modals.pendingBets && <PendingBetsModal isOpen onClose={() => closeModal('pendingBets')} onEditBet={(bet) => { setSelectedBetForEdit(bet); openModal('editBet'); }} />}
      {modals.editBet && <EditBetModal isOpen onClose={() => { closeModal('editBet'); setSelectedBetForEdit(null); }} bet={selectedBetForEdit} schedule={schedule} onBetUpdated={() => { closeModal('pendingBets'); setTimeout(() => openModal('pendingBets'), 100); }} />}
      {modals.gradeModal && <ManualGradeModal isOpen onClose={() => { closeModal('gradeModal'); setGradeGameData(null); setPicksRefreshKey(k => k + 1); }} gameData={gradeGameData} onGraded={() => setPicksRefreshKey(k => k + 1)} />}
      {modals.bankrollSettings && <BankrollSettingsModal isOpen onClose={() => closeModal('bankrollSettings')} onSettingsUpdated={() => {}} />}
    </div>
  );
}
export default App;