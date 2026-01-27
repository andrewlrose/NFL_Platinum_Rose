import React, { useState } from 'react';
import { Calendar, ChevronDown, LineChart, PlusCircle, ExternalLink, RefreshCw, Microscope } from 'lucide-react';
import { Badge, ProgressBar } from '../ui/Shared';
import WeatherBadge from './WeatherBadge'; 
import TeamLogo from './TeamLogo'; 
import { BettingDropdown } from './BettingDropdown';
import { 
  ContestValue, 
  PlayerPropsList, 
  ProSplits, 
  WongFlag, 
  InjuryBadge,  
  ConflictingSignal,
  SharpPublicBadge // <--- NEW IMPORT
} from './GameBadges.jsx';
import { INITIAL_EXPERTS } from '../../lib/constants';

export default function ConsensusCard({ game, onVote, onUpdateGame, onAnalyzePick, onPlaceBet, onShowHistory, experts, simResults }) {
  const [expanded, setExpanded] = useState(false);
  const spreadDisplay = game.spread < 0 ? `${game.home} ${game.spread}` : `${game.visitor} -${game.spread}`;
  const expertList = experts || INITIAL_EXPERTS; 

  const calcConsensus = (type) => {
      const picks = game.expertPicks?.[type] || [];
      
      // FALLBACK: If no expert picks, show Public Consensus from the data file
      if (picks.length === 0) {
          if (type === 'spread' && game.consensusSpread) {
              return { left: game.consensusSpread.visitor, right: game.consensusSpread.home };
          }
          if (type === 'total' && game.consensusTotal) {
              return { left: game.consensusTotal.over, right: game.consensusTotal.under };
          }
          return { left: 50, right: 50 };
      }

      // STANDARD LOGIC: Calculate Expert Consensus
      let leftScore = 0; let rightScore = 0; 
      picks.forEach(p => {
          if (p.isTeaser) return; 
          let weight = 1.0; 
          if (p.pickType === 'Best Bet') weight = 1.25;
          else if (p.pickType === 'Lean') weight = 0.35;

          const pickName = p.pick.toLowerCase();
          if (type === 'spread') {
              if (pickName === game.visitor.toLowerCase() || pickName.includes(game.visitor.toLowerCase())) { leftScore += weight; } 
              else if (pickName === game.home.toLowerCase() || pickName.includes(game.home.toLowerCase())) { rightScore += weight; }
          } else if (type === 'total') {
              if (pickName.includes('over')) { leftScore += weight; } else if (pickName.includes('under')) { rightScore += weight; }
          }
      });

      const total = leftScore + rightScore;
      if (total === 0) return { left: 50, right: 50 };
      return { left: Math.round((leftScore / total) * 100), right: Math.round((rightScore / total) * 100) };
  };

  const spreadStats = calcConsensus('spread');
  const totalStats = calcConsensus('total');

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-lg relative transition-all hover:border-gray-600">
       <button onClick={()=>onShowHistory(game)} className="absolute top-3 right-3 text-gray-500 hover:text-blue-400 z-10"><LineChart size={16}/></button>
      
      {/* Header with Weather */}
      <div className="bg-gray-900/50 p-3 flex justify-between items-center border-b border-gray-700">
        <div className="flex gap-2 text-xs text-gray-400">
            <Calendar size={12}/>
            {/* DATE FIX: Uses game.date */}
            <span>{game.date}, {game.time}</span>
        </div>
        <WeatherBadge weather={game.weather} />
      </div>

      <div className="p-4 grid grid-cols-3 items-center gap-4">
        <div className="text-center"><TeamLogo team={game.visitor} color={game.visitorColor}/><span className="mt-2 font-bold text-gray-100 block">{game.visitor}</span><span className="text-xs text-gray-500 block">({game.visitorRecord})</span></div>
        <div className="text-center"><div className="text-xs text-gray-400">Spread</div><div className="font-bold text-white">{spreadDisplay}</div><div className="text-xs text-gray-400 mt-1">Total: {game.total}</div></div>
        <div className="text-center"><TeamLogo team={game.home} color={game.homeColor}/><span className="mt-2 font-bold text-gray-100 block">{game.home}</span><span className="text-xs text-gray-500 block">({game.homeRecord})</span></div>
      </div>

      <div className="px-4 pb-4 space-y-4">
        <div>
          <div className="flex justify-between text-xs mb-1 text-gray-400 uppercase font-bold tracking-wider">Spread Consensus</div>
          <div className="flex items-center gap-2">
            <div className="flex items-center"><button onClick={()=>onVote('spread','visitor')} className="px-2 py-1 bg-gray-800 border border-gray-600 text-gray-400 rounded-l text-xs hover:bg-gray-700">{game.spread > 0 ? -game.spread : `+${Math.abs(game.spread)}`}</button><BettingDropdown gameId={game.id} type="spread" side="visitor" baseLine={game.spread > 0 ? -game.spread : Math.abs(game.spread)} onPlaceBet={onPlaceBet} className="px-1 py-1 bg-green-900/50 border-y border-r border-green-700 text-green-400 rounded-r hover:bg-green-800 flex items-center justify-center" odds={game.spreadOdds?.visitor}/></div>
            
            <ProgressBar 
                leftLabel="" 
                rightLabel="" 
                leftPercent={spreadStats.left} 
                rightPercent={spreadStats.right}
            />
            
            <div className="flex items-center"><BettingDropdown gameId={game.id} type="spread" side="home" baseLine={game.spread < 0 ? game.spread : game.spread} onPlaceBet={onPlaceBet} className="px-1 py-1 bg-green-900/50 border-y border-l border-green-700 text-green-400 rounded-l hover:bg-green-800 flex items-center justify-center" odds={game.spreadOdds?.home}/><button onClick={()=>onVote('spread','home')} className="px-2 py-1 bg-gray-800 border border-gray-600 text-gray-400 rounded-r text-xs hover:bg-gray-700">{game.spread < 0 ? game.spread : `+${game.spread}`}</button></div>
          </div>
          <div className="flex justify-between mt-1 px-1"><button onClick={()=>onPlaceBet(game.id, 'moneyline', 'visitor', 'ML', game.moneyline?.visitor)} className="text-[10px] text-gray-400 hover:text-white border border-gray-700 rounded px-2 py-0.5 flex items-center gap-1">ML {game.moneyline?.visitor > 0 ? '+' : ''}{game.moneyline?.visitor} <PlusCircle size={8}/></button><button onClick={()=>onPlaceBet(game.id, 'moneyline', 'home', 'ML', game.moneyline?.home)} className="text-[10px] text-gray-400 hover:text-white border border-gray-700 rounded px-2 py-0.5 flex items-center gap-1">ML {game.moneyline?.home > 0 ? '+' : ''}{game.moneyline?.home} <PlusCircle size={8}/></button></div>
        </div>
        <div>
            <div className="flex justify-between text-xs mb-1 text-gray-400 uppercase font-bold tracking-wider">Total Consensus</div>
            <div className="flex items-center gap-2"><div className="flex items-center"><button className="px-2 py-1 bg-gray-800 border border-gray-600 text-gray-400 rounded-l text-xs">O</button><BettingDropdown gameId={game.id} type="total" side="over" baseLine={game.total} onPlaceBet={onPlaceBet} className="px-1 py-1 bg-green-900/50 border-y border-r border-green-700 text-green-400 rounded-r hover:bg-green-800 flex items-center justify-center" odds={game.totalOdds?.over}/></div>
            
            <ProgressBar 
                leftLabel="" 
                rightLabel="" 
                leftPercent={totalStats.left} 
                rightPercent={totalStats.right} 
                leftColor="bg-orange-500" 
                rightColor="bg-blue-500"
            />
            
            <div className="flex items-center"><BettingDropdown gameId={game.id} type="total" side="under" baseLine={game.total} onPlaceBet={onPlaceBet} className="px-1 py-1 bg-green-900/50 border-y border-l border-green-700 text-green-400 rounded-l hover:bg-green-800 flex items-center justify-center" odds={game.totalOdds?.under}/><button className="px-2 py-1 bg-gray-800 border border-gray-600 text-gray-400 rounded-r text-xs">U</button></div></div>
        </div>
        
        {/* Badges and Signals */}
        <div className="flex flex-wrap gap-2 justify-center mt-3">
            {/* 1. Sharp/Public Monitor */}
            <SharpPublicBadge splits={game.splits} />

            <ContestValue liveSpread={game.spread} contestSpread={game.contestSpread} homeTeam={game.home} visitorTeam={game.visitor} />
            {game.splits && <ProSplits splits={game.splits} home={game.home} visitor={game.visitor}/>}
            <WongFlag game={game} />
            <InjuryBadge injuries={game.injuries} />
            
            {/* 2. Math vs Man Alert */}
            {simResults && <ConflictingSignal game={game} simData={simResults} />}
        </div>
      </div>

      <div className="border-t border-gray-700 bg-gray-900/30">
        <button onClick={()=>setExpanded(!expanded)} className="w-full py-2 flex justify-center text-xs text-gray-400">{expanded?"Hide":"Show"} Picks <ChevronDown size={14}/></button>
        {expanded && (
          <div className="p-4 space-y-3">
             {(!game.expertPicks || (game.expertPicks.spread?.length === 0 && game.expertPicks.total?.length === 0)) ? (
                 <div className="text-center text-xs text-gray-600 italic">No expert picks tracked yet.</div>
             ) : (
               <>
                 {game.expertPicks.spread?.map((p,i)=> (
                     <div key={i} className="flex justify-between items-center text-xs text-gray-300 border-b border-gray-800 pb-2 last:border-0">
                        <div className="flex items-center gap-2">
                            <span>{expertList.find(e=>e.id===p.expertId)?.name || "Unknown"}: <span className="font-bold text-white">{p.pick}</span></span>
                            {p.line && <span className={`text-xs px-1.5 py-0.5 rounded font-bold border shadow-sm ${p.isTeaser ? 'bg-purple-900 text-purple-200 border-purple-700' : 'bg-gray-700 text-emerald-400 border-gray-600'}`}>{p.line}</span>}
                            {p.isTeaser && <Badge className="bg-purple-600 text-[10px] text-white">Teaser</Badge>}
                            {p.isParlay && <Badge className="bg-orange-600 text-[10px] text-white flex items-center gap-1"><ExternalLink size={8}/> Parlay</Badge>}
                            {p.isRoundRobin && <Badge className="bg-pink-600 text-[10px] text-white flex items-center gap-1"><RefreshCw size={8}/> Round Robin</Badge>}
                            {p.pickType && p.pickType !== 'Standard' && (<Badge className={`text-[10px] ${p.pickType === 'Best Bet' ? 'bg-yellow-500 text-black' : p.pickType === 'Lean' ? 'bg-gray-600 text-white' : 'bg-blue-600 text-white'}`}>{p.pickType}</Badge>)}
                        </div>
                        {p.analysis && (<button onClick={()=>onAnalyzePick(p, expertList.find(e=>e.id===p.expertId)?.name)} className="text-gray-500 hover:text-emerald-400 p-1"><Microscope size={16}/></button>)}
                     </div>
                 ))}
                 {game.expertPicks.total?.map((p,i)=> (
                     <div key={i} className="flex justify-between items-center text-xs text-gray-300 border-b border-gray-800 pb-2 last:border-0">
                        <div className="flex items-center gap-2"><span>{expertList.find(e=>e.id===p.expertId)?.name || "Unknown"}: <span className="font-bold text-white">{p.pick}</span></span>{p.line && <span className="text-xs bg-gray-700 px-1.5 py-0.5 rounded text-orange-400 font-bold border border-gray-600 shadow-sm">{p.line}</span>}{p.isTeaser && <Badge className="bg-purple-600 text-[10px] text-white">Teaser</Badge>}{p.isParlay && <Badge className="bg-orange-600 text-[10px] text-white flex items-center gap-1"><ExternalLink size={8}/> Parlay</Badge>}{p.isRoundRobin && <Badge className="bg-pink-600 text-[10px] text-white flex items-center gap-1"><RefreshCw size={8}/> Round Robin</Badge>}{p.pickType && p.pickType !== 'Standard' && (<Badge className={`text-[10px] ${p.pickType === 'Best Bet' ? 'bg-yellow-500 text-black' : p.pickType === 'Lean' ? 'bg-gray-600 text-white' : 'bg-blue-600 text-white'}`}>{p.pickType}</Badge>)}</div>
                        {p.analysis && (<button onClick={()=>onAnalyzePick(p, expertList.find(e=>e.id===p.expertId)?.name)} className="text-gray-500 hover:text-emerald-400 p-1"><Microscope size={16}/></button>)}
                     </div>
                 ))}
               </>
             )}
             <PlayerPropsList props={game.playerProps} homeTeam={game.home} visitorTeam={game.visitor}/>
          </div>
        )}
      </div>
    </div>
  );
}