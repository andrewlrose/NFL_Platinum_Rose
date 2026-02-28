// src/components/analytics/BettingPatterns.jsx
// Day-of-week win-rate and profit breakdown

import React from 'react';
import { Calendar } from 'lucide-react';
import { formatCurrency } from './analyticsFormatters';

export default function BettingPatterns({ patterns }) {
  if (!patterns?.dayOfWeek) return null;

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <Calendar size={24} className="text-purple-400" />
          <h2 className="text-xl font-bold text-white">Betting Patterns</h2>
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-white font-medium mb-3">Performance by Day of Week</h3>
        <div className="space-y-2">
          {Object.entries(patterns.dayOfWeek).map(([day, stats]) => (
            stats.bets > 0 && (
              <div key={day} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <span className="text-white text-sm w-16">{day.slice(0, 3)}</span>
                  <div className="text-xs text-slate-400">
                    {stats.bets} bet{stats.bets !== 1 ? 's' : ''}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm">
                    <span className={`${stats.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {stats.winRate.toFixed(0)}%
                    </span>
                  </div>
                  <div className={`text-sm font-medium ${stats.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {formatCurrency(stats.profit)}
                  </div>
                </div>
              </div>
            )
          ))}
        </div>
      </div>
    </div>
  );
}
