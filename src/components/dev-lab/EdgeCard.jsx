// src/components/dev-lab/EdgeCard.jsx
import React from 'react';
import { Target, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import TeamLogo from '../dashboard/TeamLogo';

export default function EdgeCard({ game, simData, vegasSpread }) {
  if (!simData) return null;

  // Calculate Edge
  // Vegas: -6.5 (Home Favored by 6.5) | Sim: -9.0 (Home Favored by 9)
  // Edge: 2.5 points of value on Home Team
  
  const diff = Math.abs(simData.trueLine - vegasSpread);
  const isHomeValue = simData.trueLine < vegasSpread; // Sim thinks home wins by MORE than vegas
  const isVisValue = simData.trueLine > vegasSpread;  // Sim thinks visitor loses by LESS or wins

  const edgeTeam = isHomeValue ? game.home : game.visitor;
  const edgeColor = diff >= 2.5 ? 'text-emerald-400' : diff >= 1.0 ? 'text-blue-400' : 'text-gray-500';
  const borderColor = diff >= 2.5 ? 'border-emerald-500/50' : 'border-gray-700';
  const bg = diff >= 2.5 ? 'bg-emerald-900/10' : 'bg-gray-800';

  return (
    <div className={`rounded-xl border ${borderColor} ${bg} p-4 flex flex-col gap-3 transition-all hover:shadow-lg`}>
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b border-gray-700/50">
         <div className="flex gap-2 items-center">
            <TeamLogo team={game.visitor} />
            <span className="text-gray-400 text-xs">@</span>
            <TeamLogo team={game.home} />
         </div>
         <div className="text-xs font-bold text-gray-400">
             Vegas: {vegasSpread > 0 ? `+${vegasSpread}` : vegasSpread}
         </div>
      </div>

      {/* The Core Stats */}
      <div className="grid grid-cols-2 gap-4 text-center">
          <div>
              <div className="text-[10px] uppercase text-gray-500 font-bold">Projected Score</div>
              <div className="text-sm font-mono text-white">{simData.avgVis} - {simData.avgHome}</div>
          </div>
          <div>
              <div className="text-[10px] uppercase text-gray-500 font-bold">True Line</div>
              <div className={`text-xl font-bold font-mono ${simData.trueLine < 0 ? 'text-blue-300' : 'text-orange-300'}`}>
                  {simData.trueLine > 0 ? `+${simData.trueLine}` : simData.trueLine}
              </div>
          </div>
      </div>

      {/* The Edge Meter */}
      <div className="mt-1 bg-gray-900 rounded-lg p-2 border border-gray-700 flex justify-between items-center">
         <div className="flex items-center gap-2">
            {diff >= 1.5 ? <Target size={16} className={edgeColor}/> : <TrendingUp size={16} className="text-gray-600"/>}
            <span className={`font-bold text-sm ${edgeColor}`}>
                {diff.toFixed(1)} pts Edge
            </span>
         </div>
         <span className="text-xs font-bold text-white">{edgeTeam}</span>
      </div>

      {/* Win Probability Bar */}
      <div className="mt-2">
         <div className="flex justify-between text-[10px] text-gray-400 mb-1">
             <span>{game.visitor} {100 - simData.homeWinProb}%</span>
             <span>{game.home} {simData.homeWinProb}%</span>
         </div>
         <div className="h-1.5 w-full bg-gray-700 rounded-full overflow-hidden flex">
             <div className="bg-orange-500 h-full" style={{width: `${100 - simData.homeWinProb}%`}}></div>
             <div className="bg-blue-600 h-full" style={{width: `${simData.homeWinProb}%`}}></div>
         </div>
      </div>
    </div>
  );
}