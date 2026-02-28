// src/components/analytics/BettingPatterns.jsx
// Day-of-week + hour-of-day win-rate and profit breakdown

import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { formatCurrency } from './analyticsFormatters';

const winRateClass = (r) =>
  r >= 55 ? 'text-emerald-400' : r >= 50 ? 'text-amber-400' : r > 0 ? 'text-rose-400' : 'text-slate-500';

/** Horizontal fill bar representing win rate vs break-even */
function WinBar({ winRate }) {
  const filled  = Math.max(0, Math.min(100, winRate));
  const breakEven = 52.4;
  return (
    <div className="relative w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
      <div
        className={`absolute inset-y-0 left-0 rounded-full transition-all ${
          winRate >= 52.4 ? 'bg-emerald-500' : winRate > 0 ? 'bg-rose-500' : 'bg-slate-600'
        }`}
        style={{ width: `${filled}%` }}
      />
      {/* Break-even tick */}
      <div
        className="absolute top-0 bottom-0 w-px bg-amber-500/70"
        style={{ left: `${breakEven}%` }}
      />
    </div>
  );
}

export default function BettingPatterns({ patterns }) {
  if (!patterns?.dayOfWeek) return null;

  const activeDays  = Object.entries(patterns.dayOfWeek).filter(([, s]) => s.bets > 0);
  const activeHours = patterns.hourOfDay
    ? Object.entries(patterns.hourOfDay).filter(([, s]) => s.bets > 0)
    : [];

  if (activeDays.length === 0 && activeHours.length === 0) return null;

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <Calendar size={24} className="text-purple-400" />
          <h2 className="text-xl font-bold text-white">Betting Patterns</h2>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Day of week */}
        {activeDays.length > 0 && (
          <div>
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <Calendar size={14} className="text-purple-400" />
              Day of Week
            </h3>
            <div className="space-y-3">
              {activeDays.map(([day, s]) => (
                <div key={day}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm w-20">{day}</span>
                      <span className="text-xs text-slate-500">{s.bets}b</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-medium tabular-nums ${winRateClass(s.winRate)}`}>
                        {s.winRate.toFixed(0)}%
                      </span>
                      <span className={`text-sm font-mono tabular-nums ${
                        s.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {formatCurrency(s.profit)}
                      </span>
                    </div>
                  </div>
                  <WinBar winRate={s.winRate} />
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-3">Amber tick = break-even (52.4%)</p>
          </div>
        )}

        {/* Hour of day */}
        {activeHours.length > 0 && (
          <div>
            <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <Clock size={14} className="text-blue-400" />
              Time of Day (when placed)
            </h3>
            <div className="space-y-3">
              {activeHours.map(([bucket, s]) => (
                <div key={bucket}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-300 text-sm">{bucket}</span>
                      <span className="text-xs text-slate-500">{s.bets}b</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-medium tabular-nums ${winRateClass(s.winRate)}`}>
                        {s.winRate.toFixed(0)}%
                      </span>
                      <span className={`text-sm font-mono tabular-nums ${
                        s.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {formatCurrency(s.profit)}
                      </span>
                    </div>
                  </div>
                  <WinBar winRate={s.winRate} />
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-3">Based on bet placement timestamp</p>
          </div>
        )}

      </div>
    </div>
  );
}
