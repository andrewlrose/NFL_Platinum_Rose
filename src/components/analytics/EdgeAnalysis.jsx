// src/components/analytics/EdgeAnalysis.jsx
// Kelly criterion recommendations, historical edge, and risk alerts

import React from 'react';
import { Award, AlertTriangle } from 'lucide-react';

export default function EdgeAnalysis({ analytics, detailedStats }) {
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <Award size={24} className="text-yellow-400" />
          <h2 className="text-xl font-bold text-white">Edge Analysis</h2>
        </div>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Historical Edge */}
          <div className="bg-slate-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">Historical Edge</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Closing Line Value:</span>
                <span className="text-white">+2.3%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Implied Edge:</span>
                <span className="text-emerald-400">+{((analytics?.winRate || 0) - 52.38).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">True Win Rate:</span>
                <span className="text-white">{(analytics?.winRate || 0).toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Kelly Recommendation */}
          <div className="bg-slate-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">Kelly Recommendation</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Optimal Unit Size:</span>
                <span className="text-white">
                  {analytics?.winRate > 52.38
                    ? `${Math.min(((analytics.winRate / 100) - 0.5238) * 20, 5).toFixed(1)} units`
                    : '0.5 units'
                  }
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Risk Level:</span>
                <span className={`${analytics?.winRate > 60 ? 'text-emerald-400' : analytics?.winRate > 52.38 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {analytics?.winRate > 60 ? 'Low' : analytics?.winRate > 52.38 ? 'Moderate' : 'High'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Confidence:</span>
                <span className="text-white">{analytics?.totalBets > 100 ? 'High' : analytics?.totalBets > 50 ? 'Medium' : 'Low'}</span>
              </div>
            </div>
          </div>

          {/* Risk Alerts */}
          <div className="bg-slate-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-3">Risk Alerts</h3>
            <div className="space-y-2">
              {analytics?.currentStreak?.type === 'loss' && analytics.currentStreak.count >= 3 && (
                <div className="text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangle size={12} />
                  Losing streak: {analytics.currentStreak.count}
                </div>
              )}
              {detailedStats?.riskMetrics?.volatility > 1.5 && (
                <div className="text-amber-400 text-xs flex items-center gap-2">
                  <AlertTriangle size={12} />
                  High volatility detected
                </div>
              )}
              {analytics?.roi < -10 && (
                <div className="text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangle size={12} />
                  ROI below -10%
                </div>
              )}
              {!analytics?.currentStreak && analytics?.roi > 5 && analytics?.winRate > 55 && (
                <div className="text-emerald-400 text-xs">
                  ✓ Strong performance
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
