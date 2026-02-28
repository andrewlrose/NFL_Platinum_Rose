// src/components/analytics/KeyMetricsGrid.jsx
// Top-level KPI cards: Total P&L, Win Rate, ROI, Total Bets

import React from 'react';
import { TrendingUp, TrendingDown, Target, Percent, Hash } from 'lucide-react';
import { formatCurrency } from './analyticsFormatters';

export default function KeyMetricsGrid({ analytics, detailedStats }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total P&L */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm font-medium">Total P&L</p>
            <p className={`text-2xl font-bold mt-1 ${analytics?.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(analytics?.totalProfit)}
            </p>
          </div>
          <div className={`p-3 rounded-full ${analytics?.totalProfit >= 0 ? 'bg-emerald-900/20' : 'bg-red-900/20'}`}>
            {analytics?.totalProfit >= 0 ?
              <TrendingUp className="w-6 h-6 text-emerald-400" /> :
              <TrendingDown className="w-6 h-6 text-red-400" />
            }
          </div>
        </div>
      </div>

      {/* Win Rate */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm font-medium">Win Rate</p>
            <p className="text-2xl font-bold text-white mt-1">{analytics?.winRate?.toFixed(1) || '0.0'}%</p>
          </div>
          <div className="p-3 rounded-full bg-blue-900/20">
            <Target className="w-6 h-6 text-blue-400" />
          </div>
        </div>
      </div>

      {/* ROI */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm font-medium">ROI</p>
            <p className={`text-2xl font-bold mt-1 ${analytics?.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {analytics?.roi !== null && analytics?.roi !== undefined
                ? `${analytics.roi > 0 ? '+' : ''}${analytics.roi.toFixed(1)}%`
                : '0.0%'}
            </p>
          </div>
          <div className="p-3 rounded-full bg-purple-900/20">
            <Percent className="w-6 h-6 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Total Bets */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm font-medium">Total Bets</p>
            <p className="text-2xl font-bold text-white mt-1">{detailedStats?.settledBets || 0}</p>
          </div>
          <div className="p-3 rounded-full bg-amber-900/20">
            <Hash className="w-6 h-6 text-amber-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
