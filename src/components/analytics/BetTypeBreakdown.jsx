// src/components/analytics/BetTypeBreakdown.jsx
// Performance breakdown by bet type (spread, total, ML, parlay, props, futures)

import React from 'react';
import { PieChart } from 'lucide-react';
import { formatCurrency, formatPercent } from './analyticsFormatters';

export default function BetTypeBreakdown({ performanceByType }) {
  if (!performanceByType || Object.keys(performanceByType).length === 0) return null;

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <PieChart size={24} className="text-blue-400" />
          <h2 className="text-xl font-bold text-white">Performance by Bet Type</h2>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(performanceByType).map(([type, stats]) => (
            <div key={type} className="bg-slate-700 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium text-white capitalize">{type}</h3>
                <span className="text-xs text-slate-400">{stats.bets} bets</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Win Rate:</span>
                  <span className="text-white">{stats.winRate.toFixed(1)}%</span>
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
