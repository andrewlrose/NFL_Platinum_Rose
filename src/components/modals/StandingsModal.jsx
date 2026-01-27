import React from 'react';
import { Trophy, TrendingUp } from 'lucide-react';

export default function StandingsView({ experts }) {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center gap-3 text-amber-400 mb-6">
                <Trophy size={28} />
                <h2 className="text-2xl font-bold text-white">Expert Standings</h2>
            </div>
            
            <div className="space-y-3">
                {experts.map((expert, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-slate-800 rounded-lg border border-slate-700 hover:border-amber-500/50 transition-colors">
                        <div className="flex items-center gap-4">
                            <span className="text-slate-500 font-mono text-lg font-bold w-8">#{i+1}</span>
                            <div>
                                <div className="text-white text-lg font-bold">{expert.name}</div>
                                <div className="text-sm text-slate-400">{expert.source}</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-mono text-emerald-400 text-xl font-bold">{expert.record}</div>
                            <div className="text-xs text-slate-500 flex items-center justify-end gap-1">
                                Last Wk: {expert.lastWeek} <TrendingUp size={12}/>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
}