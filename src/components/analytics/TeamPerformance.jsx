// src/components/analytics/TeamPerformance.jsx
// Per-team betting record, win-rate, profit, and ROI

import React from 'react';
import { Target } from 'lucide-react';
import { formatCurrency, formatPercent } from './analyticsFormatters';

export default function TeamPerformance({ teamPerformance }) {
  if (!teamPerformance || Object.keys(teamPerformance).length === 0) return null;

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <Target size={24} className="text-emerald-400" />
          <h2 className="text-xl font-bold text-white">Team Performance</h2>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
          {Object.entries(teamPerformance).slice(0, 12).map(([team, stats]) => (
            <div key={team} className="bg-slate-700 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium text-white">{team}</h3>
                <span className="text-xs text-slate-400">{stats.bets} bets</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Record:</span>
                  <span className="text-white">{stats.wins}-{stats.bets - stats.wins}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Win Rate:</span>
                  <span className={`${stats.winRate >= 60 ? 'text-emerald-400' : stats.winRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {stats.winRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Profit:</span>
                  <span className={stats.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {formatCurrency(stats.profit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ROI:</span>
                  <span className={stats.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {formatPercent(stats.roi)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
