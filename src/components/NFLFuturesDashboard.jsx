import React, { useState } from 'react';
import { Trophy, DollarSign, AlertTriangle, ShieldCheck, ArrowRight, TrendingUp } from 'lucide-react';

const NFLFuturesDashboard = () => {
  const [week18Winner, setWeek18Winner] = useState('Steelers');

  // Portfolio Data
  const portfolio = {
    bills: {
      team: 'Buffalo Bills',
      seed: 7,
      opponent: 'New England Patriots',
      equity: 7180,
      riskLevel: 'High',
      status: 'Alive',
      description: 'Must beat Patriots (Away)'
    },
    packers: {
      team: 'Green Bay Packers',
      seed: 7,
      opponent: 'Chicago Bears',
      equity: 7723,
      riskLevel: 'Extreme',
      status: 'Alive',
      description: 'Must beat Bears (Away)'
    },
    niners: {
      team: 'San Francisco 49ers',
      seed: 5,
      opponent: 'Carolina Panthers',
      equity: 5150,
      riskLevel: 'Moderate',
      status: 'Alive',
      description: 'Must beat Panthers (Away)'
    },
    afcNorth: {
      steelersEquity: 4233,
      ravensEquity: 3842,
      opponent: 'Houston Texans'
    }
  };

  const hedgeChest = [
    { id: 1, type: 'Parlay', legs: '2 Open', value: 280, usage: 'Safety Valve' },
    { id: 2, type: 'Parlay', legs: '2 Open', value: 427, usage: 'Doomsday Hedge' },
    { id: 3, type: 'Parlay', legs: '2 Open', value: 891, usage: 'Protect Bills/Packers' },
    { id: 4, type: 'Parlay', legs: '2 Open', value: 520, usage: 'Protect AFC North' },
    { id: 5, type: 'Projected', legs: 'Week 18 Cluster', value: 3000, usage: 'Target for Week 18 Bets' }
  ];

  const currentAfcNorthEquity = week18Winner === 'Steelers' ? portfolio.afcNorth.steelersEquity : portfolio.afcNorth.ravensEquity;
  const currentAfcNorthTeam = week18Winner === 'Steelers' ? 'Pittsburgh Steelers' : 'Baltimore Ravens';

  const totalEquity = portfolio.bills.equity + portfolio.packers.equity + portfolio.niners.equity + currentAfcNorthEquity;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 font-sans">
      {/* Header Section */}
      <header className="mb-8 flex flex-col md:flex-row justify-between items-center border-b border-slate-700 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Trophy className="text-yellow-500" /> NFL Futures Command Center
          </h1>
          <p className="text-slate-400 mt-1">2025 Playoffs | Project: "Hedge Fund"</p>
        </div>
        
        {/* Total Equity Display */}
        <div className="mt-4 md:mt-0 bg-slate-800 p-4 rounded-lg border border-slate-600 shadow-lg text-center">
          <p className="text-sm text-slate-400 uppercase tracking-wider">Total Active Potential</p>
          <p className="text-4xl font-bold text-green-400">${totalEquity.toLocaleString()}</p>
        </div>
      </header>

      {/* Control Panel: Week 18 Toggle */}
      <div className="bg-slate-800 rounded-xl p-6 mb-8 border border-slate-700">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="text-orange-500" /> Week 18 Simulator
            </h2>
            <p className="text-slate-400 text-sm">Toggle the winner of the Steelers vs. Ravens "Play-In" game to see equity shifts.</p>
          </div>
          
          <div className="flex bg-slate-900 p-1 rounded-lg">
            <button
              onClick={() => setWeek18Winner('Steelers')}
              className={`px-6 py-2 rounded-md font-bold transition-all ${
                week18Winner === 'Steelers' 
                  ? 'bg-yellow-500 text-black shadow-lg' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Steelers Win
            </button>
            <button
              onClick={() => setWeek18Winner('Ravens')}
              className={`px-6 py-2 rounded-md font-bold transition-all ${
                week18Winner === 'Ravens' 
                  ? 'bg-purple-600 text-white shadow-lg' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Ravens Win
            </button>
          </div>
        </div>
      </div>

      {/* Main Bracket Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* AFC Column */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-blue-400 border-b border-blue-900 pb-2 mb-4">AFC Path (Wild Card)</h3>
          
          {/* Buffalo Bills Card */}
          <div className="bg-slate-800 rounded-lg p-5 border-l-4 border-blue-500 shadow-md hover:bg-slate-750 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-xs font-bold bg-blue-900 text-blue-200 px-2 py-1 rounded">#7 Seed</span>
                <h4 className="text-xl font-bold mt-1">{portfolio.bills.team}</h4>
                <p className="text-slate-400 text-sm">vs. #2 Patriots (Away)</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-400">${portfolio.bills.equity.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Potential Payout</p>
              </div>
            </div>
            <div className="bg-slate-900 p-3 rounded mt-3 flex justify-between items-center">
              <span className="text-sm text-red-400 font-semibold flex items-center gap-1">
                <AlertTriangle size={14} /> Hedge Priority: HIGH
              </span>
              <span className="text-xs text-slate-400">Target: Bet Patriots ML</span>
            </div>
          </div>

          {/* AFC North Survivor Card */}
          <div className={`bg-slate-800 rounded-lg p-5 border-l-4 shadow-md transition-all ${week18Winner === 'Steelers' ? 'border-yellow-500' : 'border-purple-500'}`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className={`text-xs font-bold px-2 py-1 rounded ${week18Winner === 'Steelers' ? 'bg-yellow-900 text-yellow-200' : 'bg-purple-900 text-purple-200'}`}>
                  #4 Seed ({week18Winner} Scenario)
                </span>
                <h4 className="text-xl font-bold mt-1">{currentAfcNorthTeam}</h4>
                <p className="text-slate-400 text-sm">vs. #5 Texans (Home)</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-400">${currentAfcNorthEquity.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Potential Payout</p>
              </div>
            </div>
            <div className="bg-slate-900 p-3 rounded mt-3 flex justify-between items-center">
              <span className="text-sm text-orange-400 font-semibold flex items-center gap-1">
                <AlertTriangle size={14} /> Hedge Priority: MEDIUM
              </span>
              <span className="text-xs text-slate-400">Target: Bet Texans ML</span>
            </div>
          </div>
        </div>

        {/* NFC Column */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-green-400 border-b border-green-900 pb-2 mb-4">NFC Path (Wild Card)</h3>
          
          {/* Green Bay Packers Card */}
          <div className="bg-slate-800 rounded-lg p-5 border-l-4 border-green-600 shadow-md">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-xs font-bold bg-green-900 text-green-200 px-2 py-1 rounded">#7 Seed</span>
                <h4 className="text-xl font-bold mt-1">{portfolio.packers.team}</h4>
                <p className="text-slate-400 text-sm">vs. #2 Bears (Away)</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-400">${portfolio.packers.equity.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Potential Payout</p>
              </div>
            </div>
            <div className="bg-slate-900 p-3 rounded mt-3 flex justify-between items-center">
              <span className="text-sm text-yellow-400 font-semibold flex items-center gap-1">
                <TrendingUp size={14} /> Role: The Golden Goose
              </span>
              <span className="text-xs text-slate-400">Target: Miracle Run</span>
            </div>
          </div>

          {/* 49ers Card */}
          <div className="bg-slate-800 rounded-lg p-5 border-l-4 border-red-600 shadow-md">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-xs font-bold bg-red-900 text-red-200 px-2 py-1 rounded">#5 Seed</span>
                <h4 className="text-xl font-bold mt-1">{portfolio.niners.team}</h4>
                <p className="text-slate-400 text-sm">vs. #4 Panthers (Away)</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-400">${portfolio.niners.equity.toLocaleString()}</p>
                <p className="text-xs text-slate-500">Potential Payout</p>
              </div>
            </div>
            <div className="bg-slate-900 p-3 rounded mt-3 flex justify-between items-center">
              <span className="text-sm text-green-500 font-semibold flex items-center gap-1">
                <ShieldCheck size={14} /> Role: Safety Net
              </span>
              <span className="text-xs text-slate-400">Status: Let it Ride</span>
            </div>
          </div>
        </div>
      </div>

      {/* Hedge Chest Section */}
      <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <ShieldCheck className="text-blue-400" /> The Hedge Chest (Your Ammo)
        </h3>
        <p className="text-slate-400 mb-6 text-sm">These are your Open Parlays used to protect the portfolio in the Wild Card Round.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {hedgeChest.map((item) => (
            <div key={item.id} className={`p-4 rounded-lg border ${item.type === 'Projected' ? 'border-dashed border-slate-500 bg-slate-800/50' : 'bg-slate-700 border-slate-600'}`}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-300">{item.type} #{item.id}</span>
                <span className="text-xs bg-slate-900 px-2 py-0.5 rounded text-blue-300">{item.legs}</span>
              </div>
              <p className="text-2xl font-bold text-white">${item.value}</p>
              <p className="text-xs text-slate-400 mt-2 border-t border-slate-600 pt-2">{item.usage}</p>
            </div>
          ))}
        </div>
        
        <div className="mt-6 bg-blue-900/30 border border-blue-800 rounded-lg p-4 flex items-start gap-3">
            <ArrowRight className="text-blue-400 mt-1" />
            <div>
                <h4 className="font-bold text-blue-100">Action Plan</h4>
                <p className="text-sm text-blue-200/80">
                    Use the <strong>Projected Week 18 Cluster</strong> to build ~$3,000 more in Hedge Equity. 
                    Then, use Parlays #3 and #4 to cross-hedge the Bills and Steelers in the Wild Card round.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default NFLFuturesDashboard;