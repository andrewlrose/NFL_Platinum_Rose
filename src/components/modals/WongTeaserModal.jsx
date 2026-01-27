import React, { useState } from 'react';
import { List, X } from 'lucide-react';
import TeamLogo from '../dashboard/TeamLogo';
import { Badge } from '../ui/Shared';

export default function WongTeaserModal({ isOpen, onClose, games }) {
  const [strictMode, setStrictMode] = useState(true); 
  if (!isOpen) return null;
  const candidates = games.flatMap(game => {
      const legs = [];
      const isTotalValid = strictMode ? game.total <= 49 : true;
      if (!isTotalValid) return [];
      const spread = game.spread; 
      if (spread <= -7.5 && spread >= -8.5) { legs.push({ team: game.home, line: spread, teased: spread + 6, type: "Favorite", side: "Home" }); } else if (spread >= 1.5 && spread <= 2.5) { legs.push({ team: game.home, line: spread, teased: spread + 6, type: "Underdog", side: "Home" }); }
      const vSpread = -spread;
      if (vSpread <= -7.5 && vSpread >= -8.5) { legs.push({ team: game.visitor, line: vSpread, teased: vSpread + 6, type: "Favorite", side: "Visitor" }); } else if (vSpread >= 1.5 && vSpread <= 2.5) { legs.push({ team: game.visitor, line: vSpread, teased: vSpread + 6, type: "Underdog", side: "Visitor" }); }
      return legs.map(leg => ({ ...leg, game }));
  });
  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-purple-900/20">
          <div className="flex gap-2 text-purple-400 items-center"><List size={20}/><h3 className="font-bold text-lg">Wong Teaser Finder</h3></div><button onClick={onClose} className="text-gray-500 hover:text-white"><X size={20}/></button>
        </div>
        <div className="p-4 bg-gray-800/50 border-b border-gray-700 flex justify-between items-center">
            <div className="text-xs text-gray-400"><strong>The Rules:</strong> Cross 3 & 7. <br/>Favorites: -7.5 to -8.5. Underdogs: +1.5 to +2.5.</div>
            <div className="flex items-center gap-2"><span className="text-xs font-bold text-gray-300">Strict Mode (Total &le; 49)</span><button onClick={() => setStrictMode(!strictMode)} className={`w-10 h-5 rounded-full relative transition-colors ${strictMode ? 'bg-purple-600' : 'bg-gray-600'}`}><div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${strictMode ? 'left-6' : 'left-1'}`}></div></button></div>
        </div>
        <div className="p-6 overflow-y-auto">
           {candidates.length === 0 ? <div className="text-center text-gray-500 py-8">No qualifying Wong Teaser legs found {strictMode ? "with Total <= 49" : ""}.</div> : (
               <div className="grid gap-3">{candidates.map((c, i) => (<div key={i} className="bg-gray-800 border border-purple-500/30 p-3 rounded flex justify-between items-center group hover:bg-gray-750 transition-colors"><div><div className="flex items-center gap-2"><TeamLogo team={c.team} color="bg-gray-700"/><span className="font-bold text-lg text-white">{c.team}</span><Badge className="bg-purple-900 text-purple-200 border border-purple-700">{c.line > 0 ? `+${c.line}` : c.line} &rarr; <span className="text-white">{c.teased > 0 ? `+${c.teased}` : c.teased}</span></Badge></div><div className="text-xs text-gray-500 mt-1 pl-14">vs {c.side === 'Home' ? c.game.visitor : c.game.home} • Total: {c.game.total}</div></div><div className="text-right"><div className="text-xs text-gray-400 uppercase tracking-wide font-bold mb-1">{c.type}</div><div className="text-[10px] text-gray-500">Crosses 3 & 7</div></div></div>))}</div>
           )}
        </div>
      </div>
    </div>
  );
}