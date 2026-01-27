import React, { useState, useEffect } from 'react';
import { ListFilter, X, RefreshCw, DownloadCloud, Activity, Save } from 'lucide-react';

export default function ContestLinesModal({ isOpen, onClose, games, onUpdateContestLines }) {
  const [lines, setLines] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  useEffect(() => { if(isOpen) { const i={}; games.forEach(g => i[g.id] = g.contestSpread || ''); setLines(i); } }, [isOpen, games]);
  if(!isOpen) return null;
  const handleLoadOfficial = () => { setIsUpdating(true); const OFFICIAL_LINES = { 'wk14-1': -3.5, 'wk14-2': -6.5, 'wk14-3': 2.5, 'wk14-4': 7.5, 'wk14-5': -9.0, 'wk14-6': -6.5, 'wk14-7': -4.5, 'wk14-8': 3.0, 'wk14-9': 1.5, 'wk14-10': 7.0, 'wk14-11': 7.5, 'wk14-12': -6.0, 'wk14-13': -3.5, 'wk14-14': 3.5 }; setTimeout(() => { const newLines = { ...lines }; games.forEach(g => { if (OFFICIAL_LINES[g.id] !== undefined) { newLines[g.id] = OFFICIAL_LINES[g.id]; } }); setLines(newLines); setIsUpdating(false); }, 800); };
  const handleSyncLive = () => { if(window.confirm("Overwrite all Contest Lines with Live Spreads?")) { const newLines = {}; games.forEach(g => newLines[g.id] = g.spread); setLines(newLines); } };
  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900 shrink-0"><div className="flex items-center gap-2 text-orange-400"><ListFilter size={20}/><h3 className="font-bold text-lg">SuperContest Lines</h3></div><button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20}/></button></div>
        <div className="p-3 bg-gray-800/50 border-b border-gray-700 flex gap-3 justify-center"><button onClick={handleLoadOfficial} disabled={isUpdating} className="px-3 py-1.5 bg-blue-900/50 hover:bg-blue-800 text-blue-200 text-xs rounded border border-blue-700 flex items-center gap-2 transition-all">{isUpdating ? <RefreshCw className="animate-spin" size={14}/> : <DownloadCloud size={14}/>} Fetch Official Lines</button><button onClick={handleSyncLive} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded border border-gray-500 flex items-center gap-2 transition-all"><Activity size={14}/> Sync Live Odds</button></div>
        <div className="p-6 overflow-y-auto grid gap-4 custom-scrollbar">{games.map(g => (<div key={g.id} className="flex justify-between items-center bg-gray-800/50 p-3 rounded border border-gray-700/30"><div className="w-1/3 font-bold text-gray-300 text-sm">{g.visitor}</div><div className="flex items-center gap-2"><span className="text-[10px] text-gray-500 uppercase font-bold">Line</span><input type="number" step="0.5" className="w-20 bg-gray-950 border border-gray-700 rounded py-1 text-center text-white font-mono focus:border-orange-500 outline-none" value={lines[g.id] !== undefined ? lines[g.id] : ''} onChange={e => setLines({...lines, [g.id]: parseFloat(e.target.value)})} /></div><div className="w-1/3 text-right font-bold text-gray-300 text-sm">{g.home}</div></div>))}</div>
        <div className="p-4 border-t border-gray-800 flex justify-end gap-3 bg-gray-900 shrink-0"><button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white text-sm">Cancel</button><button onClick={() => { onUpdateContestLines(lines); onClose(); }} className="px-6 py-2 bg-orange-600 hover:bg-orange-500 rounded text-white font-bold text-sm shadow-lg flex items-center gap-2"><Save size={16}/> Save Updates</button></div>
      </div>
    </div>
  );
}