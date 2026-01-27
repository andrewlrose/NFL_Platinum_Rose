import React, { useState, useRef, useEffect } from 'react';
import { PlusCircle } from 'lucide-react';

export function BettingDropdown({ gameId, type, side, baseLine, onPlaceBet, className, odds }) {
  const [isOpen, setIsOpen] = useState(false); const dropdownRef = useRef(null);
  
  useEffect(() => { const handleClickOutside = (event) => { if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false); }; document.addEventListener("mousedown", handleClickOutside); return () => document.removeEventListener("mousedown", handleClickOutside); }, []);
  
  const buyOptions = [0, 0.5, 1.0, 1.5, 2.0, 2.5]; 
  
  const handleSelect = (buyAmount) => { 
      let finalLine = baseLine; 
      if (type === 'total') { if (side === 'over') finalLine = baseLine - buyAmount; else finalLine = baseLine + buyAmount; } 
      else { finalLine = baseLine + buyAmount; } 
      finalLine = Math.round(finalLine * 10) / 10; 
      onPlaceBet(gameId, type, side, finalLine, odds || -110); 
      setIsOpen(false); 
  };
  
  const formatOdds = (val) => { 
      if (!val) return ''; 
      let num = parseFloat(val); 
      if (Math.abs(num) >= 100) return num > 0 ? `+${num}` : `${num}`; 
      if (num >= 2.0) { num = (num - 1) * 100; return `+${Math.round(num)}`; } 
      else { num = -100 / (num - 1); return `${Math.round(num)}`; } 
  };
  
  const displayOdds = formatOdds(odds);
  
  return (
    <div className="relative" ref={dropdownRef}>
        <button onClick={() => setIsOpen(!isOpen)} className={className}>{displayOdds && <span className="text-[10px] opacity-70 mr-1">{displayOdds}</span>}<PlusCircle size={12} /></button>
        {isOpen && (<div className="absolute top-full mt-1 bg-gray-900 border border-gray-700 rounded shadow-xl z-50 w-32 text-xs overflow-hidden left-0">{buyOptions.map(pts => { let lineVal = baseLine; if (type === 'total') { lineVal = side === 'over' ? baseLine - pts : baseLine + pts; } else { lineVal = baseLine + pts; } lineVal = Math.round(lineVal * 10) / 10; const display = lineVal > 0 && type !== 'total' ? `+${lineVal}` : lineVal; return (<button key={pts} onClick={() => handleSelect(pts)} className="w-full text-left px-3 py-2 hover:bg-gray-800 text-gray-300 flex justify-between border-b border-gray-800 last:border-0"><span>{pts === 0 ? 'Line' : `Buy ${pts}`}</span><span className="font-bold text-white">{display}</span></button>); })}</div>)}
    </div>
  );
}