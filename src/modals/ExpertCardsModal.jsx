import React, { useState } from 'react';
import { User, Trash2, Eraser, Award, Calendar, AlertCircle, Pencil, Check, X } from 'lucide-react';

export default function ExpertCardsView({ experts, games, userBets, onDeleteExpert, onClearPicks, onUpdatePick, onDeletePick }) {
  const [selectedExpertId, setSelectedExpertId] = useState(null);
  
  // EDIT STATE
  const [editingPick, setEditingPick] = useState(null); // { gameId, expertId, pick, line, units }
  const [editForm, setEditForm] = useState({});

  const selectedExpert = experts.find(e => e.id === selectedExpertId);

  // --- STATS CALCULATION ---
  const calculateStats = (expertId) => {
      let wins = 0;
      let losses = 0;
      let pushes = 0;
      
      // Since we don't have real "scores", this is a placeholder or relies on manual "result" field if you add it later.
      // For now, it returns 0-0-0 unless we connect to a scores API.
      return { wins, losses, pushes, roi: 0 };
  };

  // --- GET EXPERT PICKS ---
  const getExpertPicks = (expertId) => {
      const picks = [];
      games.forEach(game => {
          if (!game.consensus || !game.consensus.expertPicks) return;
          const { spread, total } = game.consensus.expertPicks;
          
          spread.forEach(p => {
              if (p.expertId === expertId) picks.push({ ...p, gameId: game.id, matchup: `${game.visitor} @ ${game.home}`, type: 'Spread' });
          });
          total.forEach(p => {
              if (p.expertId === expertId) picks.push({ ...p, gameId: game.id, matchup: `${game.visitor} @ ${game.home}`, type: 'Total' });
          });
      });
      return picks;
  };

  // --- HANDLERS ---
  const startEditing = (pick) => {
      setEditingPick(pick);
      setEditForm({ ...pick }); // Clone data to form
  };

  const cancelEditing = () => {
      setEditingPick(null);
      setEditForm({});
  };

  const saveEdit = () => {
      if (!editingPick) return;
      onUpdatePick(editingPick.gameId, editingPick, editForm);
      setEditingPick(null);
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-6">
      
      {/* LEFT: EXPERT LIST */}
      <div className="w-full md:w-1/3 bg-slate-900 rounded-xl border border-slate-800 flex flex-col h-[75vh]">
        <div className="p-4 border-b border-slate-800 bg-slate-950 rounded-t-xl">
            <h2 className="text-lg font-bold flex items-center gap-2">
                <User className="text-indigo-400" /> Experts ({experts.length})
            </h2>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-2 custom-scrollbar">
            {experts.map(expert => (
                <div 
                    key={expert.id} 
                    onClick={() => setSelectedExpertId(expert.id)}
                    className={`p-3 rounded-lg cursor-pointer flex items-center gap-3 transition-all ${selectedExpertId === expert.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300'}`}
                >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${selectedExpertId === expert.id ? 'bg-white text-indigo-600' : 'bg-slate-700 text-slate-400'}`}>
                        {expert.avatar ? <img src={expert.avatar} className="rounded-full" /> : expert.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                        <div className="font-bold text-sm">{expert.name}</div>
                        <div className={`text-xs ${selectedExpertId === expert.id ? 'text-indigo-200' : 'text-slate-500'}`}>{expert.source}</div>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* RIGHT: EXPERT DETAILS (EDITABLE) */}
      <div className="w-full md:w-2/3 bg-slate-900 rounded-xl border border-slate-800 flex flex-col h-[75vh]">
        {selectedExpert ? (
            <>
                {/* HEADER */}
                <div className="p-6 border-b border-slate-800 bg-slate-950 rounded-t-xl flex justify-between items-start">
                    <div className="flex gap-4">
                        <div className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                            {selectedExpert.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">{selectedExpert.name}</h2>
                            <p className="text-slate-400 flex items-center gap-2 text-sm">
                                <Award size={14}/> {selectedExpert.source}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => onClearPicks(selectedExpert.id)} 
                            className="px-3 py-2 bg-slate-800 hover:bg-amber-900/30 text-slate-400 hover:text-amber-500 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 border border-slate-700 hover:border-amber-500/50"
                            title="Clear All Picks (Keep Expert)"
                        >
                            <Eraser size={14} /> Clear History
                        </button>
                        <button 
                            onClick={() => { onDeleteExpert(selectedExpert.id); setSelectedExpertId(null); }} 
                            className="px-3 py-2 bg-slate-800 hover:bg-rose-900/30 text-slate-400 hover:text-rose-500 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 border border-slate-700 hover:border-rose-500/50"
                            title="Delete Expert"
                        >
                            <Trash2 size={14} /> Delete
                        </button>
                    </div>
                </div>

                {/* PICKS LIST (EDITABLE) */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
                        <Calendar size={14} /> Active Picks
                    </h3>
                    
                    {getExpertPicks(selectedExpert.id).length === 0 ? (
                        <div className="text-center py-12 text-slate-600 italic">
                            No picks recorded for this week.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {getExpertPicks(selectedExpert.id).map((pick, i) => {
                                const isEditing = editingPick && editingPick.pick === pick.pick && editingPick.gameId === pick.gameId;

                                return (
                                    <div key={i} className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-3 flex items-center justify-between hover:bg-slate-800/50 transition-colors group">
                                        
                                        {/* LEFT: Game Info */}
                                        <div className="w-1/3">
                                            <div className="text-xs text-slate-500 font-mono mb-1">{pick.type}</div>
                                            <div className="text-sm font-bold text-slate-200">{pick.matchup}</div>
                                        </div>

                                        {/* MIDDLE: The Pick (Editable) */}
                                        <div className="flex-1 flex gap-4 items-center">
                                            {isEditing ? (
                                                <div className="flex gap-2 items-center bg-slate-900 p-2 rounded border border-indigo-500/50 animate-in fade-in zoom-in-95 duration-200">
                                                    <input 
                                                        className="bg-slate-800 text-white text-xs p-1 rounded w-24 border border-slate-600 focus:border-indigo-500 outline-none"
                                                        value={editForm.selection || ""}
                                                        onChange={(e) => setEditForm({ ...editForm, selection: e.target.value })}
                                                        placeholder="Selection"
                                                    />
                                                    <input 
                                                        className="bg-slate-800 text-white text-xs p-1 rounded w-16 border border-slate-600 focus:border-indigo-500 outline-none text-center"
                                                        value={editForm.line || ""}
                                                        onChange={(e) => setEditForm({ ...editForm, line: e.target.value })}
                                                        placeholder="Line"
                                                    />
                                                    <input 
                                                        type="number"
                                                        className="bg-slate-800 text-white text-xs p-1 rounded w-12 border border-slate-600 focus:border-indigo-500 outline-none text-center"
                                                        value={editForm.units || 0}
                                                        onChange={(e) => setEditForm({ ...editForm, units: e.target.value })}
                                                        placeholder="U"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex gap-3 items-center">
                                                    <div className={`px-3 py-1 rounded text-xs font-bold border ${pick.pick === 'Over' || pick.pick === 'Under' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                                        {pick.pick} {pick.line}
                                                    </div>
                                                    <div className="text-xs text-slate-500 font-mono">{pick.units} Units</div>
                                                </div>
                                            )}
                                        </div>

                                        {/* RIGHT: Actions */}
                                        <div className="flex gap-2">
                                            {isEditing ? (
                                                <>
                                                    <button onClick={saveEdit} className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded shadow-lg transition-colors"><Check size={14}/></button>
                                                    <button onClick={cancelEditing} className="p-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"><X size={14}/></button>
                                                </>
                                            ) : (
                                                <>
                                                    <button 
                                                        onClick={() => startEditing(pick)} 
                                                        className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-slate-700 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Edit Pick"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button 
                                                        onClick={() => onDeletePick(pick.gameId, pick)}
                                                        className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-slate-700 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Delete Pick"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </>
                                            )}
                                        </div>

                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                <AlertCircle size={48} className="mb-4 opacity-50" />
                <p>Select an expert to manage their card.</p>
            </div>
        )}
      </div>
    </div>
  );
}