import React, { useState, useEffect } from 'react';
import { Trash2, Calculator, Layers, Split, Repeat, Lock, FileText, Ban } from 'lucide-react';

const TEASER_PAYOUTS = {
  2: -120, 3: 150, 4: 235, 5: 350, 6: 550
};

// Combinatorics Helper for Round Robin
const getCombinations = (arr, k) => {
  if (k > arr.length || k <= 0) return [];
  if (k === arr.length) return [arr];
  if (k === 1) return arr.map(i => [i]);
  const combs = [];
  for (let i = 0; i < arr.length - k + 1; i++) {
    const head = arr.slice(i, i + 1);
    const tailcombs = getCombinations(arr.slice(i + 1), k - 1);
    for (let j = 0; j < tailcombs.length; j++) {
      combs.push(head.concat(tailcombs[j]));
    }
  }
  return combs;
};

export default function MyCardModal({ 
  bets = [], // Default to empty array to prevent crash
  onRemoveBet, 
  onLockBets, 
  onCreateParlay, // We will wire this up later
  onClearCard 
}) {
  const [activeTab, setActiveTab] = useState('builder'); // 'builder' or 'locked'
  const [selectedIds, setSelectedIds] = useState([]);
  const [wager, setWager] = useState('');
  const [mode, setMode] = useState('straight'); // straight, parlay, teaser, robin
  const [robinSize, setRobinSize] = useState(2); 

  // Separate bets by status (New bets vs Locked bets)
  // In our new App, all bets start as 'OPEN' (undefined status) until locked
  const openBets = bets.filter(b => !b.status || b.status === 'OPEN');
  const lockedBets = bets.filter(b => b.status === 'PLACED');

  // Auto-select open bets when switching to builder
  useEffect(() => {
      if (activeTab === 'builder') {
          setSelectedIds(openBets.map(b => b.id));
      }
  }, [openBets.length, activeTab]);

  const toggleSelect = (id) => {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  // --- VALIDATION HELPERS ---
  const isTeasable = (bet) => {
      if (bet.type === 'spread' || bet.type === 'total') return true;
      return false; 
  };

  const isParlayable = (bet) => {
      // Basic check: Can't parlay same game correlations (simplified)
      return true;
  };

  const activeBets = openBets.filter(b => selectedIds.includes(b.id));

  // Filter valid bets for the current mode
  const validModeBets = activeBets.filter(b => {
      if (mode === 'teaser') return isTeasable(b);
      if (mode === 'parlay' || mode === 'robin') return isParlayable(b);
      return true;
  });

  // --- ODDS CALCULATIONS ---
  const calculateParlay = () => {
      if (validModeBets.length < 2) return { odds: null, error: "Pick 2+" };
      // Simplified Decimal Odds Calc
      let decOdds = 1;
      validModeBets.forEach(b => {
          const price = b.odds || -110; 
          const dec = price > 0 ? (price/100) + 1 : (100/Math.abs(price)) + 1;
          decOdds *= dec;
      });
      const amer = decOdds >= 2 ? Math.round((decOdds - 1) * 100) : Math.round(-100 / (decOdds - 1));
      return { odds: amer };
  };

  const calculateTeaser = () => {
      const count = validModeBets.length;
      if (count < 2) return { odds: null, error: "Pick 2+" };
      if (count > 6) return { odds: null, error: "Max 6" };
      return { odds: TEASER_PAYOUTS[count] };
  };

  const { odds: parlayOdds, error: parlayError } = calculateParlay();
  const { odds: teaserOdds, error: teaserError } = calculateTeaser();
  
  // --- HANDLE PLACE BET ---
  const handlePlace = () => {
      if (mode === 'straight') {
          // Lock the selected bets
          if(onLockBets) onLockBets(selectedIds);
          alert("Bets Locked!");
      } else {
          alert(`${mode.toUpperCase()} feature coming in next update!`);
      }
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-xl w-full max-w-4xl mx-auto">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Calculator className="text-emerald-400" /> Betting Card
          </h2>
          <div className="flex bg-slate-800 p-1 rounded-lg">
              <button onClick={() => setActiveTab('builder')} className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${activeTab === 'builder' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Builder ({openBets.length})</button>
              <button onClick={() => setActiveTab('locked')} className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${activeTab === 'locked' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>Locked ({lockedBets.length})</button>
          </div>
      </div>

      {/* --- BUILDER VIEW --- */}
      {activeTab === 'builder' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* LEFT: BET LIST */}
            <div className="md:col-span-2 space-y-3">
                {openBets.length === 0 && (
                    <div className="text-center py-10 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                        Your slip is empty. <br/> Add picks from the Dashboard.
                    </div>
                )}

                {openBets.map(bet => {
                    const isSelected = selectedIds.includes(bet.id);
                    return (
                        <div key={bet.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${isSelected ? 'bg-slate-800 border-indigo-500/50' : 'bg-slate-900/50 border-slate-800 opacity-60'}`}>
                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(bet.id)} className="rounded bg-slate-700 border-slate-600 text-indigo-500"/>
                            <div className="flex-1">
                                <div className="flex justify-between">
                                    <span className="text-sm font-bold text-white">{bet.game}</span>
                                    <button onClick={() => onRemoveBet(bet.id)} className="text-slate-500 hover:text-rose-500"><Trash2 size={14}/></button>
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                    {bet.selection} <span className="text-emerald-400 font-mono">{bet.line > 0 ? `+${bet.line}` : bet.line}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* RIGHT: CALCULATOR */}
            <div className="space-y-4">
                {/* Mode Selector */}
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-800 rounded-lg">
                    <button onClick={() => setMode('straight')} className={`text-[10px] font-bold py-1.5 rounded ${mode === 'straight' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}>Straight</button>
                    <button onClick={() => setMode('parlay')} className={`text-[10px] font-bold py-1.5 rounded ${mode === 'parlay' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>Parlay</button>
                    <button onClick={() => setMode('teaser')} className={`text-[10px] font-bold py-1.5 rounded ${mode === 'teaser' ? 'bg-purple-600 text-white' : 'text-slate-400'}`}>Teaser</button>
                </div>

                {/* Odds Display */}
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-center">
                    <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">
                        {mode === 'straight' ? 'Straight Bets' : 'Combined Odds'}
                    </div>
                    <div className="text-2xl font-black text-white">
                        {mode === 'straight' ? '-' : 
                         mode === 'parlay' ? (parlayOdds ? `+${parlayOdds}` : '---') :
                         mode === 'teaser' ? (teaserOdds ? `+${teaserOdds}` : '---') : '-'}
                    </div>
                </div>

                {/* Place Button */}
                <button 
                    onClick={handlePlace}
                    disabled={activeBets.length === 0}
                    className={`w-full py-3 rounded-lg font-bold text-sm uppercase tracking-wide shadow-lg transition-all
                        ${mode === 'straight' ? 'bg-slate-700 hover:bg-slate-600 text-white' : 
                          mode === 'parlay' ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 
                          'bg-purple-600 hover:bg-purple-500 text-white'}
                        disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {mode === 'straight' ? 'Lock In Bets' : `Create ${mode}`}
                </button>
            </div>
        </div>
      )}

      {/* --- LOCKED VIEW --- */}
      {activeTab === 'locked' && (
          <div className="space-y-3">
              {lockedBets.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">No locked bets yet.</div>
              ) : (
                  lockedBets.map(bet => (
                      <div key={bet.id} className="bg-slate-800/50 border border-emerald-500/30 p-3 rounded-lg flex justify-between items-center">
                          <div className="text-sm text-slate-300">
                              <span className="text-emerald-400 font-bold mr-2">LOCKED</span>
                              {bet.game}: {bet.selection} ({bet.line})
                          </div>
                      </div>
                  ))
              )}
          </div>
      )}

    </div>
  );
}