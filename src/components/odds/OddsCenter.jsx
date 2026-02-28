// src/components/odds/OddsCenter.jsx
// Main container for all live odds and line shopping features

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Target, Activity } from 'lucide-react';
import LiveOddsDashboard from './LiveOddsDashboard';
import LineMovementTracker from './LineMovementTracker';
import ArbitrageFinder from './ArbitrageFinder';
import SteamMoveTracker from './SteamMoveTracker';
import {
  findArbitrageOpportunities,
  generateMockMultiBookData,
  getLineMovements,
} from '../../lib/enhancedOddsApi';

export default function OddsCenter() {
  const [activeTab, setActiveTab] = useState('live-odds');
  const [arbBadge, setArbBadge]     = useState(0);
  const [steamBadge, setSteamBadge] = useState(0);

  useEffect(() => {
    // --- Arbitrage badge: mirrors ArbitrageFinder.loadOpportunities ---
    const computeArbCount = () => {
      const cached = localStorage.getItem('cached_odds_data');
      if (cached) {
        try {
          const games = JSON.parse(cached);
          const arbs = findArbitrageOpportunities(games);
          if (arbs.length > 0) return arbs.length;
        } catch (_) { /* fall through */ }
      }
      // Fall back to mock multi-book data (same as child component)
      return findArbitrageOpportunities(generateMockMultiBookData()).length;
    };

    // --- Steam badge: mirrors SteamMoveTracker.load ---
    const computeSteamCount = () => getLineMovements(24).length;

    setArbBadge(computeArbCount());
    setSteamBadge(computeSteamCount());
  }, []);

  const tabs = [
    {
      id: 'live-odds',
      label: 'Live Odds',
      icon: BarChart3,
      description: 'Real-time odds comparison'
    },
    {
      id: 'line-movements',
      label: 'Line Movements',
      icon: TrendingUp,
      description: 'Track line changes and alerts'
    },
    {
      id: 'arbitrage',
      label: 'Arbitrage',
      icon: Target,
      description: 'Find guaranteed profit opportunities',
      badge: arbBadge > 0 ? String(arbBadge) : null,
    },
    {
      id: 'steam-moves',
      label: 'Steam Moves',
      icon: Activity,
      description: 'Sharp money movements',
      badge: steamBadge > 0 ? String(steamBadge) : null,
    }
  ];

  const renderContent = () => {
    switch(activeTab) {
      case 'live-odds':
        return <LiveOddsDashboard />;
      case 'line-movements':
        return <LineMovementTracker />;
      case 'arbitrage':
        return <ArbitrageFinder />;
      case 'steam-moves':
        return <SteamMoveTracker />;
      default:
        return <LiveOddsDashboard />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
        <div className="flex overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-6 py-4 min-w-fit relative ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <Icon size={20} />
                <div className="text-left">
                  <div className="font-medium">{tab.label}</div>
                  <div className="text-xs opacity-75">{tab.description}</div>
                </div>
                {tab.badge && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div>
        {renderContent()}
      </div>
    </div>
  );
}
