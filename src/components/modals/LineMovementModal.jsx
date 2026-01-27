// File: src/components/modals/LineMovementModal.jsx
import React, { useState, useMemo } from 'react';
import { X, Activity, Calendar, ArrowRight, TrendingUp, Minus } from 'lucide-react';

export default function LineHistoryModal({ isOpen, game, onClose }) {
  const [activeTab, setActiveTab] = useState('spread');

  // --- 1. DATA ADAPTER ---
  const historyData = useMemo(() => {
    if (!game) return [];
    
    // Check for real history recorded by App.jsx
    const realHistory = game.lineHistory || [];
    
    const relevantHistory = realHistory.map(h => ({
        label: new Date(h.timestamp).toLocaleDateString('en-US', { weekday: 'short' }),
        val: activeTab === 'spread' ? h.spread : h.total
    })).filter(h => h.val !== undefined && h.val !== null);

    // IF WE HAVE REAL DATA (at least 2 points), USE IT
    if (relevantHistory.length >= 2) {
        const currentVal = activeTab === 'spread' ? game.spread : game.total;
        return [...relevantHistory, { label: 'Now', val: currentVal }];
    }

    // --- FALLBACK: SIMULATOR (To show the UI when no history exists yet) ---
    const currentVal = activeTab === 'spread' ? game.spread : game.total;
    const isSpread = activeTab === 'spread';
    const volatility = isSpread ? 0.5 : 1.5; 
    
    const points = [
        { label: 'Open', val: currentVal + (Math.random() > 0.5 ? volatility : -volatility) },
        { label: 'Mon', val: currentVal + (Math.random() > 0.5 ? volatility * 0.5 : -volatility * 0.5) },
        { label: 'Tue', val: currentVal + (Math.random() > 0.5 ? 0.5 : 0) },
        { label: 'Wed', val: currentVal - (Math.random() > 0.5 ? 0.5 : 0) },
        { label: 'Now', val: currentVal } 
    ];
    return points.map(p => ({ ...p, val: Math.round(p.val * 2) / 2 }));
  }, [game, activeTab]);

  if (!isOpen || !game) return null;

  // --- 2. STATS & THEMING ---
  const startVal = historyData.length > 0 ? historyData[0].val : 0;
  const endVal = historyData.length > 0 ? historyData[historyData.length - 1].val : 0;
  const diff = endVal - startVal;
  const hasMoved = diff !== 0;

  // Dynamic Colors based on Tab
  const isSpread = activeTab === 'spread';
  const themeColor = isSpread ? '#10b981' : '#f59e0b'; // Emerald vs Amber
  const themeText = isSpread ? 'text-emerald-400' : 'text-amber-400';
  const themeBorder = isSpread ? 'border-emerald-500' : 'border-amber-500';
  const themeShadow = isSpread ? 'drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]';

  // --- 3. SCALING LOGIC ---
  let minVal = Math.min(...historyData.map(d => d.val));
  let maxVal = Math.max(...historyData.map(d => d.val));
  
  // Add padding so line isn't stuck to edges
  minVal -= (isSpread ? 1 : 2);
  maxVal += (isSpread ? 1 : 2);
  
  // Handle Flat Line (Prevent divide by zero & center the line)
  if (minVal === maxVal) { minVal -= 1; maxVal += 1; }
  
  const range = maxVal - minVal;

  const getY = (val) => {
      const pct = (val - minVal) / range;
      return 190 - (pct * 180); 
  };

  const getX = (idx) => {
      // 50px padding left/right
      return (idx / (historyData.length - 1)) * 400 + 50; 
  };

  const pointsString = historyData.map((d, i) => `${getX(i)},${getY(d.val)}`).join(" ");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
            <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Activity className={themeText} /> Line Movement Analysis
                </h2>
                <p className="text-slate-400 text-sm">
                    {game.visitor} @ {game.home}
                </p>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
        </div>

        {/* TABS */}
        <div className="flex border-b border-slate-800">
            <button 
                onClick={() => setActiveTab('spread')} 
                className={`flex-1 py-3 text-sm font-bold transition-colors ${isSpread ? `bg-slate-900 text-white border-b-2 ${themeBorder}` : 'text-slate-500 hover:text-white hover:bg-slate-800/50'}`}
            >
                Spread History
            </button>
            <button 
                onClick={() => setActiveTab('total')} 
                className={`flex-1 py-3 text-sm font-bold transition-colors ${!isSpread ? `bg-slate-900 text-white border-b-2 ${themeBorder}` : 'text-slate-500 hover:text-white hover:bg-slate-800/50'}`}
            >
                Total History
            </button>
        </div>

        {/* STATS SUMMARY (TALE OF THE TAPE) */}
        <div className="flex items-center justify-between px-8 py-4 bg-slate-900/50 border-b border-slate-800">
             <div className="text-center">
                 <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Opening</div>
                 <div className="text-2xl font-black text-slate-300">{startVal > 0 && isSpread ? `+${startVal}` : startVal}</div>
             </div>
             
             <div className="flex flex-col items-center px-4">
                 <ArrowRight className="text-slate-600 mb-1" />
                 <div className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${hasMoved ? 'bg-slate-800 text-white' : 'bg-slate-800/50 text-slate-500'}`}>
                    {hasMoved ? (
                        <><TrendingUp size={10} /> Moved {Math.abs(diff).toFixed(1)} pts</>
                    ) : (
                        <><Minus size={10} /> No Movement</>
                    )}
                 </div>
             </div>

             <div className="text-center">
                 <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Current</div>
                 <div className={`text-3xl font-black ${themeText}`}>{endVal > 0 && isSpread ? `+${endVal}` : endVal}</div>
             </div>
        </div>

        {/* GRAPH CONTAINER */}
        <div className="p-8 bg-slate-900 relative h-72 w-full">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200">
                
                {/* GRID LINES */}
                {[10, 55, 100, 145, 190].map((y, i) => (
                    <line key={`h-${i}`} x1="40" y1={y} x2="460" y2={y} stroke="#334155" strokeWidth="1" strokeDasharray="4" opacity="0.3" />
                ))}
                {historyData.map((_, i) => (
                    <line key={`v-${i}`} x1={getX(i)} y1="10" x2={getX(i)} y2="190" stroke="#334155" strokeWidth="1" strokeDasharray="4" opacity="0.3" />
                ))}

                {/* GRAPH LINE */}
                <polyline 
                    points={pointsString} 
                    fill="none" 
                    stroke={themeColor} 
                    strokeWidth="4" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    className={`transition-all duration-500 ${themeShadow}`} 
                />

                {/* DATA POINTS */}
                {historyData.map((d, i) => {
                    const x = getX(i);
                    const y = getY(d.val);
                    return (
                        <g key={i} className="group cursor-pointer">
                            <circle cx={x} cy={y} r="20" fill="transparent" />
                            <circle cx={x} cy={y} r="6" fill="#0f172a" stroke={themeColor} strokeWidth="3" className="transition-all group-hover:r-8" />
                            <text x={x} y={y - 15} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" className="drop-shadow-md select-none">
                                {d.val > 0 && isSpread ? `+${d.val}` : d.val}
                            </text>
                            <text x={x} y="215" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="bold" style={{textTransform: 'uppercase'}} className="select-none">
                                {d.label}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>

        {/* FOOTER */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 text-center">
             <p className="text-xs text-slate-500 italic flex items-center justify-center gap-2">
                <Calendar size={12} /> 
                {game.lineHistory && game.lineHistory.length > 0 
                    ? "Displaying tracked real-time line history." 
                    : "Data is simulated based on opening line estimates."}
             </p>
        </div>
      </div>
    </div>
  );
}