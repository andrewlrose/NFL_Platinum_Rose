import React, { useState } from 'react';
import { X, Wand2, User, Quote, Microscope, Activity } from 'lucide-react';

// --- SUB-COMPONENT: Individual Pick Card (Your Original UI) ---
const PickItem = ({ pick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasRationale = pick.rationale && Array.isArray(pick.rationale) && pick.rationale.length > 0;

  return (
    <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-lg hover:border-[#00d2be]/30 transition-colors group">
        {/* TOP ROW: Identity & Units */}
        <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center text-[#00d2be] border border-[#00d2be]/20">
                    <User size={16} />
                </div>
                <div>
                    <div className="font-bold text-white text-sm">Platinum System</div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide">
                        {pick.pickType} • <span className="text-[#00d2be] font-mono">{pick.pick} {pick.line}</span>
                    </div>
                </div>
            </div>
            {pick.units > 1 && (
                <span className="bg-[#00d2be]/10 text-[#00d2be] text-[10px] px-2 py-1 rounded border border-[#00d2be]/20 font-bold">
                    {pick.units} UNIT PLAY
                </span>
            )}
        </div>
        
        {/* MIDDLE ROW: The Summary Quote */}
        <div className="flex gap-3 mt-3">
            <Quote size={16} className="text-[#00d2be] min-w-[16px] mt-1 opacity-50" />
            <div className="flex-1">
                <p className="text-sm text-slate-200 italic leading-relaxed">"{pick.analysis}"</p>
                
                {/* BOTTOM ROW: The Microscope Trigger */}
                {hasRationale && (
                    <div className="mt-3">
                        <button 
                            onClick={() => setIsExpanded(!isExpanded)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${
                                isExpanded 
                                ? "bg-[#00d2be] text-black shadow-lg shadow-[#00d2be]/20" 
                                : "bg-slate-900 text-[#00d2be] border border-[#00d2be]/30 hover:bg-[#00d2be]/10"
                            }`}
                        >
                            <Microscope size={14} className={isExpanded ? "" : "animate-pulse"} />
                            {isExpanded ? "Close Analysis" : "Deep Dive"}
                        </button>

                        {/* THE HIDDEN CONTENT (Pop-Open) */}
                        {isExpanded && (
                            <div className="mt-3 p-4 bg-slate-950 rounded-lg border border-[#00d2be]/30 shadow-inner animate-in fade-in slide-in-from-top-2 duration-200">
                                <h5 className="text-[10px] text-[#00d2be] font-bold uppercase mb-3 border-b border-[#00d2be]/20 pb-2">
                                    System Rationale (Live Metrics)
                                </h5>
                                <ul className="space-y-2">
                                    {pick.rationale.map((point, i) => (
                                        <li key={i} className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed">
                                            <span className="text-[#00d2be] mt-1"><Activity size={10}/></span> 
                                            <span>{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

// Reusable betting button component
const OddsBtn = ({ label, value, onClick }) => (
  <button 
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className="flex flex-col items-center justify-center p-3 rounded-lg border border-[#333] bg-[#202020] text-gray-400 hover:bg-[#333] hover:border-[#00d2be] hover:text-white transition-all w-full"
  >
    <span className="text-xs uppercase opacity-70 mb-1">{label}</span>
    <span className="font-mono text-lg font-bold text-[#00d2be]">{value > 0 ? `+${value}` : value}</span>
  </button>
);

// --- MAIN COMPONENT ---
export default function MatchupWizardModal({ isOpen, game, stats, onClose, onBet }) {
  if (!isOpen || !game) return null;

  // --- THE "BRAIN": GENERATE PICKS FROM DATA ---
  // This replaces the old "Consensus" object with live calculations
  const homeStats = stats.find(s => s.team === game.home) || {};
  const visStats = stats.find(s => s.team === game.visitor) || {};
  
  const hEPA = parseFloat(homeStats.off_epa) || 0;
  const vEPA = parseFloat(visStats.off_epa) || 0;
  
  // Logic: Who is the "System Pick"?
  const isHomeFavored = hEPA > vEPA;
  const favoredTeam = isHomeFavored ? game.home : game.visitor;
  const epaDiff = Math.abs(hEPA - vEPA).toFixed(3);
  
  // Construct a "Virtual Expert Pick" object that matches your old data structure
  const systemPick = {
    pickType: 'Algorithmic Edge',
    pick: favoredTeam,
    line: 'Moneyline', // Simplified for now
    units: epaDiff > 0.1 ? 5 : 2, // Higher confidence if big EPA gap
    analysis: `The Platinum System detects a ${epaDiff} EPA/Play advantage for ${favoredTeam}.`,
    rationale: [
        `${game.home} Off EPA: ${hEPA.toFixed(3)} vs ${game.visitor} Off EPA: ${vEPA.toFixed(3)}`,
        `${game.home} Success Rate: ${(homeStats.off_success * 100).toFixed(1)}%`,
        `${game.visitor} Success Rate: ${(visStats.off_success * 100).toFixed(1)}%`,
        `Pass Rate Differential: ${((homeStats.pass_rate - visStats.pass_rate) * 100).toFixed(1)}%`
    ]
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0f0f0f] border border-[#333] w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-4 border-b border-[#333] flex justify-between items-center bg-[#181818]">
           <div className="flex items-center gap-3 text-[#00d2be]">
             <div className="p-2 bg-[#00d2be]/10 rounded-lg border border-[#00d2be]/20">
                <Wand2 size={24} />
             </div>
             <div>
                <h3 className="font-bold text-white text-lg">Matchup Wizard</h3>
                <p className="text-xs text-slate-400">Week 17 • Live Data Analysis</p>
             </div>
           </div>
           <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar bg-[#121212]">
            <div className="grid gap-6">
                {/* 1. Show the System Pick using your Card UI */}
                <PickItem pick={systemPick} />
                
                {/* 2. Manual Betting Board */}
                <div className="mt-4 pt-4 border-t border-[#333]">
                    <h4 className="text-xs font-bold uppercase text-gray-500 mb-3">Place Your Wager</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <OddsBtn label={game.visitor} value={game.spread * -1} onClick={() => onBet(game.id, 'spread', game.visitor, game.spread * -1)} />
                        <OddsBtn label={game.home} value={game.spread} onClick={() => onBet(game.id, 'spread', game.home, game.spread)} />
                        <OddsBtn label="Over" value={game.total} onClick={() => onBet(game.id, 'total', 'Over', game.total)} />
                        <OddsBtn label="Under" value={game.total} onClick={() => onBet(game.id, 'total', 'Under', game.total)} />
                    </div>
                </div>
            </div>
        </div>
        
        {/* Footer */}
        <div className="p-3 bg-[#0f0f0f] border-t border-[#333] text-center">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">
                AI-Powered Analysis • Data Source: nflfastR
            </p>
        </div>

      </div>
    </div>
  );
}