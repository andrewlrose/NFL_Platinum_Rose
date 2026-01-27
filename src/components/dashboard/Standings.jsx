import React from 'react';
import { Trophy, TrendingUp, ExternalLink } from 'lucide-react';

export default function Standings({ experts }) {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-[#1e1e1e] border border-[#333] rounded-xl p-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-center gap-3 text-amber-400 mb-6 border-b border-[#333] pb-4">
                <div className="p-2 bg-amber-400/10 rounded-lg">
                    <Trophy size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white">Expert Standings</h2>
                    <p className="text-xs text-gray-500">Track record vs Spread (Season 2025)</p>
                </div>
            </div>
            
            {/* List */}
            <div className="space-y-3">
                {experts.map((expert, i) => (
                    <div key={expert.id} className="flex justify-between items-center p-4 bg-[#252525] rounded-lg border border-[#333] hover:border-amber-500/50 transition-all group">
                        <div className="flex items-center gap-4">
                            <span className={`font-mono text-lg font-bold w-8 text-center ${i < 3 ? 'text-amber-400' : 'text-gray-600'}`}>
                                #{i+1}
                            </span>
                            <div>
                                <div className="text-white text-lg font-bold group-hover:text-amber-400 transition-colors">
                                    {expert.name}
                                </div>
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                    {expert.source} <ExternalLink size={10} />
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-mono text-emerald-400 text-xl font-bold">{expert.record}</div>
                            <div className="text-xs text-gray-500 flex items-center justify-end gap-1">
                                Last Wk: <span className="text-gray-300">{expert.lastWeek}</span> 
                                {expert.lastWeek !== "0-0" && <TrendingUp size={12} className="text-emerald-500"/>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
}