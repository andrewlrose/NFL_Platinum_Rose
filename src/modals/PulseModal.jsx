// File: src/components/modals/PulseModal.jsx
import React from 'react';
import { X, Activity, TrendingUp, Users, AlertCircle } from 'lucide-react';

export default function PulseModal({ isOpen, onClose, games = [] }) {
  if (!isOpen) return null;

  // --- REAL ANALYSIS LOGIC ---
  const getInsights = () => {
      const sharps = [];
      const publicPlays = [];
      const lineMoves = [];

      games.forEach(g => {
          if (!g.splits) return;
          
          // Detect Sharps (Money > Ticket by 15%)
          const ats = g.splits.ats || {};
          const diffHome = (ats.homeMoney || 0) - (ats.homeTicket || 0);
          const diffVis = (ats.visitorMoney || 0) - (ats.visitorTicket || 0);

          if (diffHome > 15) sharps.push({ team: g.home, line: g.spread, diff: diffHome });
          if (diffVis > 15) sharps.push({ team: g.visitor, line: g.spread * -1, diff: diffVis });

          // Detect Public (Ticket > 70%)
          if (ats.homeTicket > 70) publicPlays.push({ team: g.home, pct: ats.homeTicket });
          if (ats.visitorTicket > 70) publicPlays.push({ team: g.visitor, pct: ats.visitorTicket });

          // Detect Big Moves (Spread > 7 is a Key Number risk)
          if (Math.abs(g.spread) >= 7) lineMoves.push({ game: `${g.visitor}/${g.home}`, note: `Key Number Risk (${g.spread})` });
      });

      return { sharps, publicPlays, lineMoves };
  };

  const { sharps, publicPlays, lineMoves } = getInsights();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
           <div>
             <h2 className="text-xl font-bold text-white flex items-center gap-2"><Activity className="text-rose-500" /> Market Pulse</h2>
             <p className="text-slate-400 text-sm">Real-time betting splits and sharp money analysis.</p>
           </div>
           <button onClick={onClose}><X className="text-slate-400 hover:text-white" /></button>
        </div>

        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SHARP MONEY */}
            <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-xl p-4">
                <h3 className="text-emerald-400 font-bold flex items-center gap-2 mb-4"><TrendingUp size={18} /> Sharp Money Targets</h3>
                {sharps.length === 0 ? <p className="text-slate-500 text-sm">No major sharp discrepancies detected yet.</p> : (
                    <ul className="space-y-2">
                        {sharps.map((s, i) => (
                            <li key={i} className="flex justify-between text-sm border-b border-emerald-500/10 pb-2">
                                <span className="text-white font-bold">{s.team} ({s.line > 0 ? `+${s.line}` : s.line})</span>
                                <span className="text-emerald-400 font-mono">+{s.diff}% Money Diff</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* PUBLIC HEAVY */}
            <div className="bg-blue-900/10 border border-blue-500/20 rounded-xl p-4">
                {/* 🔥 FIXED: Escaped the > symbol to &gt; */}
                <h3 className="text-blue-400 font-bold flex items-center gap-2 mb-4"><Users size={18} /> Public Heavy (&gt;70% Tickets)</h3>
                
                {publicPlays.length === 0 ? <p className="text-slate-500 text-sm">Public is fairly split on all games.</p> : (
                    <ul className="space-y-2">
                         {publicPlays.map((p, i) => (
                            <li key={i} className="flex justify-between text-sm border-b border-blue-500/10 pb-2">
                                <span className="text-white font-bold">{p.team}</span>
                                <span className="text-blue-300 font-mono">{p.pct}% of Tickets</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* KEY NUMBER ALERTS */}
            <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4 md:col-span-2">
                <h3 className="text-amber-400 font-bold flex items-center gap-2 mb-4"><AlertCircle size={18} /> Key Number Alerts & Line Moves</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {lineMoves.length === 0 ? <p className="text-slate-500 text-sm">No significant line alerts.</p> : lineMoves.map((m, i) => (
                         <div key={i} className="bg-slate-900 p-3 rounded border border-slate-700 text-sm flex justify-between">
                             <span className="text-slate-200">{m.game}</span>
                             <span className="text-amber-500 font-bold">{m.note}</span>
                         </div>
                     ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}