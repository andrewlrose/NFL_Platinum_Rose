// src/components/analytics/TrendChart.jsx
// Weekly performance trend cards (bets, win-rate, profit, ROI)

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { formatCurrency, formatPercent } from './analyticsFormatters';

export default function TrendChart({ trends }) {
  if (!trends || trends.length === 0) return null;

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <TrendingUp size={24} className="text-blue-400" />
          <h2 className="text-xl font-bold text-white">Performance Trends</h2>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {trends.slice(-8).map((period) => (
            <div key={period.period} className="bg-slate-700 rounded-lg p-4">
              <h3 className="text-white font-medium text-sm mb-3">{period.period}</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Bets:</span>
                  <span className="text-white">{period.bets}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Win Rate:</span>
                  <span className={`${period.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {period.winRate.toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Profit:</span>
                  <span className={period.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {formatCurrency(period.profit)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">ROI:</span>
                  <span className={period.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {formatPercent(period.roi)}
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
