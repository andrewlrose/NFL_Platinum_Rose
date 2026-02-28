// src/components/analytics/RiskAnalysis.jsx
// Volatility, streaks, standard deviation, avg profit per bet

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { formatCurrency } from './analyticsFormatters';

export default function RiskAnalysis({ riskMetrics }) {
  if (!riskMetrics) return null;

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <AlertTriangle size={24} className="text-amber-400" />
          <h2 className="text-xl font-bold text-white">Risk Analysis</h2>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-700 rounded-lg p-3">
            <p className="text-slate-400 text-xs">Avg Profit/Bet</p>
            <p className={`text-lg font-bold ${riskMetrics.avgProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(riskMetrics.avgProfit)}
            </p>
          </div>
          <div className="bg-slate-700 rounded-lg p-3">
            <p className="text-slate-400 text-xs">Volatility</p>
            <p className="text-white text-lg font-bold">
              {(riskMetrics.volatility * 100).toFixed(1)}%
            </p>
          </div>
          <div className="bg-slate-700 rounded-lg p-3">
            <p className="text-slate-400 text-xs">Max Win Streak</p>
            <p className="text-emerald-400 text-lg font-bold">
              {riskMetrics.streaks?.maxWinStreak || 0}
            </p>
          </div>
          <div className="bg-slate-700 rounded-lg p-3">
            <p className="text-slate-400 text-xs">Max Loss Streak</p>
            <p className="text-red-400 text-lg font-bold">
              {riskMetrics.streaks?.maxLossStreak || 0}
            </p>
          </div>
        </div>

        <div className="bg-slate-700 rounded-lg p-3">
          <p className="text-slate-400 text-xs mb-2">Standard Deviation</p>
          <p className="text-white text-lg font-bold">
            {formatCurrency(riskMetrics.standardDeviation)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Measures bet-to-bet profit variance
          </p>
        </div>
      </div>
    </div>
  );
}
