import React from 'react';
import { BrainCircuit, X, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react';

export default function ReviewPicksModal({ isOpen, onClose, stagedPicks, onConfirm, onDiscard }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-[80] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center shrink-0 bg-slate-950 rounded-t-2xl">
          <div className="flex gap-3 items-center">
             <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400">
                 <BrainCircuit size={24} />
             </div>
             <div>
                 <h3 className="font-bold text-white text-lg">AI Parser Review</h3>
                 <p className="text-xs text-slate-400">{stagedPicks.length} picks extracted</p>
             </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar bg-slate-900">
          {stagedPicks.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                 <AlertTriangle size={48} className="mb-4 opacity-20" />
                 <p className="font-bold">No picks detected.</p>
                 <p className="text-sm">Try pasting a cleaner transcript.</p>
             </div>
          ) : (
            <div className="space-y-4">
              {stagedPicks.map((pick, idx) => (
                <div key={idx} className="bg-slate-800/40 border border-slate-700 p-4 rounded-xl flex gap-4 group hover:border-indigo-500/50 transition-all">
                  
                  {/* Left: Pick Info */}
                  <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                          <span className="font-black text-white text-lg">{pick.selection}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                              pick.type === 'Spread' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                              pick.type === 'Total' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                              'bg-purple-500/10 text-purple-400 border-purple-500/20'
                          }`}>
                              {pick.type} {pick.line !== '0' && pick.line}
                          </span>
                      </div>
                      
                      {/* Rationale */}
                      <div className="mb-3">
                         {pick.summary && (
                             <ul className="list-disc pl-4 space-y-1">
                                 {Array.isArray(pick.summary) ? pick.summary.map((s, i) => (
                                     <li key={i} className="text-xs text-slate-300 font-medium leading-relaxed">{s}</li>
                                 )) : <li className="text-xs text-slate-300">{pick.summary}</li>}
                             </ul>
                         )}
                      </div>
                      
                      {/* Context */}
                      <div className="text-[10px] text-slate-500 italic border-t border-slate-700/50 pt-2 flex gap-2">
                          <span className="font-bold text-slate-600">Context:</span> "{pick.analysis ? pick.analysis.substring(0, 100) : ''}..."
                      </div>
                  </div>

                  {/* Right: Delete Button */}
                  <div className="flex flex-col justify-start">
                      <button 
                        onClick={() => onDiscard(idx)} 
                        className="p-2 text-slate-600 hover:text-rose-400 hover:bg-rose-900/20 rounded-lg transition-colors"
                        title="Discard Pick"
                      >
                          <Trash2 size={18} />
                      </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-800 flex justify-end gap-3 bg-slate-950 rounded-b-2xl">
            <button onClick={onClose} className="px-5 py-2 text-slate-400 hover:text-white font-bold text-sm">Discard All</button>
            <button 
                onClick={onConfirm} 
                disabled={stagedPicks.length === 0} 
                className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-bold flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all"
            >
                <CheckCircle2 size={18} /> Confirm & Add
            </button>
        </div>
      </div>
    </div>
  );
}