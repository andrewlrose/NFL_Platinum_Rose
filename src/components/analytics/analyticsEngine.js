// src/components/analytics/analyticsEngine.js
// Pure calculation logic for betting analytics — no React dependency

import { BET_STATUS, BET_TYPES } from '../../lib/bankroll';

// ── Helpers ─────────────────────────────────────────────

const getWeekNumber = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

// ── Timeframe filter ────────────────────────────────────

export const filterBetsByTimeframe = (bets, timeframe) => {
  if (timeframe === 'all') return bets;

  const now = new Date();
  const cutoffDate = new Date();

  switch (timeframe) {
    case 'today':
      cutoffDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      cutoffDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      cutoffDate.setMonth(now.getMonth() - 1);
      break;
    case 'season':
      cutoffDate.setFullYear(now.getFullYear(), 8, 1); // Sept 1st
      break;
    default:
      return bets;
  }

  return bets.filter(bet => new Date(bet.timestamp || bet.date) >= cutoffDate);
};

// ── Per-type breakdown ──────────────────────────────────

export const calculatePerformanceByType = (bets) => {
  const typeStats = {};

  Object.values(BET_TYPES).forEach(type => {
    const typeBets = bets.filter(bet => bet.type === type);
    if (typeBets.length === 0) return;

    const wins   = typeBets.filter(bet => bet.status === BET_STATUS.WON).length;
    const losses = typeBets.filter(bet => bet.status === BET_STATUS.LOST).length;
    const totalProfit  = typeBets.reduce((sum, bet) => sum + (bet.profit || 0), 0);
    const totalWagered = typeBets.reduce((sum, bet) => sum + bet.amount, 0);

    typeStats[type] = {
      bets: typeBets.length,
      wins,
      losses,
      winRate: typeBets.length > 0 ? (wins / typeBets.length) * 100 : 0,
      profit: totalProfit,
      roi: totalWagered > 0 ? (totalProfit / totalWagered) * 100 : 0
    };
  });

  return typeStats;
};

// ── Team performance ────────────────────────────────────

export const calculateTeamPerformance = (bets) => {
  const teamStats = {};

  bets.forEach(bet => {
    if (bet.legs && bet.legs.length > 0) {
      const activeLegCount = bet.legs.filter(l => l.betType !== 'open').length;
      bet.legs.forEach(leg => {
        if (leg.team && leg.betType !== 'open') {
          if (!teamStats[leg.team]) teamStats[leg.team] = { bets: 0, wins: 0, profit: 0, wagered: 0 };
          teamStats[leg.team].bets++;
          if (bet.status === BET_STATUS.WON) teamStats[leg.team].wins++;
          teamStats[leg.team].profit  += (bet.profit || 0) / activeLegCount;
          teamStats[leg.team].wagered += bet.amount / activeLegCount;
        }
      });
    } else if (bet.team) {
      if (!teamStats[bet.team]) teamStats[bet.team] = { bets: 0, wins: 0, profit: 0, wagered: 0 };
      teamStats[bet.team].bets++;
      if (bet.status === BET_STATUS.WON) teamStats[bet.team].wins++;
      teamStats[bet.team].profit  += bet.profit || 0;
      teamStats[bet.team].wagered += bet.amount;
    }
  });

  Object.keys(teamStats).forEach(team => {
    const stats = teamStats[team];
    stats.winRate = stats.bets > 0 ? (stats.wins / stats.bets) * 100 : 0;
    stats.roi     = stats.wagered > 0 ? (stats.profit / stats.wagered) * 100 : 0;
  });

  return Object.entries(teamStats)
    .sort(([, a], [, b]) => b.profit - a.profit)
    .reduce((obj, [team, stats]) => { obj[team] = stats; return obj; }, {});
};

// ── Weekly trends ───────────────────────────────────────

export const calculateTrends = (bets) => {
  const trendData = {};

  bets.forEach(bet => {
    const date = new Date(bet.timestamp || bet.date);
    const weekKey = `${date.getFullYear()}-W${getWeekNumber(date)}`;

    if (!trendData[weekKey]) {
      trendData[weekKey] = { period: weekKey, bets: 0, wins: 0, profit: 0, wagered: 0 };
    }

    trendData[weekKey].bets++;
    if (bet.status === BET_STATUS.WON) trendData[weekKey].wins++;
    trendData[weekKey].profit  += bet.profit || 0;
    trendData[weekKey].wagered += bet.amount;
  });

  Object.values(trendData).forEach(period => {
    period.winRate = period.bets > 0 ? (period.wins / period.bets) * 100 : 0;
    period.roi     = period.wagered > 0 ? (period.profit / period.wagered) * 100 : 0;
  });

  return Object.values(trendData).sort((a, b) => a.period.localeCompare(b.period));
};

// ── Streaks ─────────────────────────────────────────────

export const calculateStreaks = (bets) => {
  let currentStreak = 0;
  let maxWinStreak  = 0;
  let maxLossStreak = 0;
  let currentType   = null;

  bets.forEach(bet => {
    if (bet.status === BET_STATUS.WON) {
      if (currentType === 'win') { currentStreak++; } else { currentStreak = 1; currentType = 'win'; }
      maxWinStreak = Math.max(maxWinStreak, currentStreak);
    } else if (bet.status === BET_STATUS.LOST) {
      if (currentType === 'loss') { currentStreak++; } else { currentStreak = 1; currentType = 'loss'; }
      maxLossStreak = Math.max(maxLossStreak, currentStreak);
    }
  });

  return { maxWinStreak, maxLossStreak };
};

// ── Risk metrics ────────────────────────────────────────

export const calculateRiskMetrics = (bets) => {
  if (bets.length === 0) return {};

  const profits   = bets.map(bet => bet.profit || 0);
  const avgProfit = profits.reduce((sum, p) => sum + p, 0) / profits.length;
  const variance  = profits.reduce((sum, p) => sum + Math.pow(p - avgProfit, 2), 0) / profits.length;
  const standardDeviation = Math.sqrt(variance);

  const streaks   = calculateStreaks(bets);

  const avgWager      = bets.reduce((sum, bet) => sum + bet.amount, 0) / bets.length;
  const wagerVariance = bets.reduce((sum, bet) => sum + Math.pow(bet.amount - avgWager, 2), 0) / bets.length;

  return {
    avgProfit,
    standardDeviation,
    variance,
    avgWager,
    wagerVariance,
    streaks,
    volatility: standardDeviation / Math.abs(avgProfit) || 0
  };
};

// ── Day-of-week + hour-of-day patterns ──────────────────

export const calculateBettingPatterns = (bets) => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeekStats = {};
  dayNames.forEach(day => { dayOfWeekStats[day] = { bets: 0, wins: 0, profit: 0 }; });

  // Hour buckets: Early(0-11), Afternoon(12-17), Evening(18-21), Late(22-23)
  const hourBuckets = {
    'Morning (12am–12pm)':  { bets: 0, wins: 0, profit: 0, hours: 'early' },
    'Afternoon (12pm–6pm)': { bets: 0, wins: 0, profit: 0, hours: 'afternoon' },
    'Evening (6pm–10pm)':   { bets: 0, wins: 0, profit: 0, hours: 'evening' },
    'Late (10pm+)':         { bets: 0, wins: 0, profit: 0, hours: 'late' },
  };

  const getHourBucket = (hour) => {
    if (hour < 12) return 'Morning (12am–12pm)';
    if (hour < 18) return 'Afternoon (12pm–6pm)';
    if (hour < 22) return 'Evening (6pm–10pm)';
    return 'Late (10pm+)';
  };

  bets.forEach(bet => {
    const date = new Date(bet.timestamp || bet.date);
    const day  = dayNames[date.getDay()];
    dayOfWeekStats[day].bets++;
    if (bet.status === BET_STATUS.WON) dayOfWeekStats[day].wins++;
    dayOfWeekStats[day].profit += bet.profit || 0;

    const bucket = getHourBucket(date.getHours());
    hourBuckets[bucket].bets++;
    if (bet.status === BET_STATUS.WON) hourBuckets[bucket].wins++;
    hourBuckets[bucket].profit += bet.profit || 0;
  });

  Object.keys(dayOfWeekStats).forEach(day => {
    const s = dayOfWeekStats[day];
    s.winRate = s.bets > 0 ? (s.wins / s.bets) * 100 : 0;
  });
  Object.keys(hourBuckets).forEach(bucket => {
    const s = hourBuckets[bucket];
    s.winRate = s.bets > 0 ? (s.wins / s.bets) * 100 : 0;
  });

  return { dayOfWeek: dayOfWeekStats, hourOfDay: hourBuckets };
};

// ── Sportsbook breakdown ────────────────────────────────

export const calculateBookAnalytics = (bets) => {
  const bookStats = {};

  bets.forEach(bet => {
    const book = bet.source || 'Unknown';
    if (!bookStats[book]) {
      bookStats[book] = { bets: 0, wins: 0, losses: 0, pushes: 0, profit: 0, wagered: 0 };
    }
    const s = bookStats[book];
    s.bets++;
    s.wagered += bet.amount || 0;
    s.profit  += bet.profit || 0;
    if (bet.status === BET_STATUS.WON)    s.wins++;
    if (bet.status === BET_STATUS.LOST)   s.losses++;
    if (bet.status === BET_STATUS.PUSHED) s.pushes++;
  });

  // Enrich with derived fields
  Object.keys(bookStats).forEach(book => {
    const s = bookStats[book];
    const withResult = s.wins + s.losses;
    s.winRate = withResult > 0 ? (s.wins / withResult) * 100 : 0;
    s.roi     = s.wagered   > 0 ? (s.profit / s.wagered) * 100 : 0;
  });

  // Sort by profit desc
  return Object.entries(bookStats)
    .sort(([, a], [, b]) => b.profit - a.profit)
    .map(([book, stats]) => ({ book, ...stats }));
};

// ── Orchestrator: build full detailedStats object ───────

export const calculateDetailedAnalytics = (bets, timeframe, betTypeFilter) => {
  let filteredBets = filterBetsByTimeframe(bets, timeframe);
  if (betTypeFilter !== 'all') {
    filteredBets = filteredBets.filter(bet => bet.type === betTypeFilter);
  }

  const settledBets = filteredBets.filter(bet =>
    [BET_STATUS.WON, BET_STATUS.LOST, BET_STATUS.PUSHED].includes(bet.status)
  );

  return {
    performanceByType: calculatePerformanceByType(settledBets),
    teamPerformance:   calculateTeamPerformance(settledBets),
    trends:            calculateTrends(settledBets),
    riskMetrics:       calculateRiskMetrics(settledBets),
    patterns:          calculateBettingPatterns(settledBets),
    bookAnalytics:     calculateBookAnalytics(settledBets),
    totalBets:         filteredBets.length,
    settledBets:       settledBets.length
  };
};

// ── Test data generator ─────────────────────────────────

export const generateTestData = () => {
  const testBets = [
    { id: 1,  type: 'spread',    status: BET_STATUS.WON,  amount: 110, profit: 100,  team: 'NE',          odds: -110, source: 'DraftKings', timestamp: '2026-01-15T19:00:00Z' },
    { id: 2,  type: 'spread',    status: BET_STATUS.LOST, amount: 55,  profit: -55,  team: 'BUF',         odds: -110, source: 'FanDuel',    timestamp: '2026-01-17T16:00:00Z' },
    { id: 3,  type: 'spread',    status: BET_STATUS.WON,  amount: 110, profit: 100,  team: 'KC',          odds: -110, source: 'DraftKings', timestamp: '2026-01-20T15:00:00Z' },
    { id: 4,  type: 'spread',    status: BET_STATUS.LOST, amount: 110, profit: -110, team: 'LAR',         odds: -110, source: 'BetMGM',     timestamp: '2026-01-22T20:00:00Z' },
    { id: 5,  type: 'total',     status: BET_STATUS.WON,  amount: 100, profit: 90,   team: 'Over',        odds: -110, source: 'Caesars',    timestamp: '2026-01-25T14:00:00Z' },
    { id: 6,  type: 'total',     status: BET_STATUS.WON,  amount: 75,  profit: 68,   team: 'Under',       odds: -110, source: 'FanDuel',    timestamp: '2026-01-28T17:00:00Z' },
    { id: 7,  type: 'total',     status: BET_STATUS.WON,  amount: 50,  profit: 125,  team: 'Over',        odds: 250,  source: 'DraftKings', timestamp: '2026-01-30T19:30:00Z' },
    { id: 8,  type: 'moneyline', status: BET_STATUS.WON,  amount: 100, profit: 180,  team: 'SF',          odds: 180,  source: 'BetOnline',  timestamp: '2026-02-01T16:00:00Z' },
    { id: 9,  type: 'moneyline', status: BET_STATUS.WON,  amount: 50,  profit: 105,  team: 'DET',         odds: 210,  source: 'Caesars',    timestamp: '2026-02-02T13:00:00Z' },
    { id: 10, type: 'moneyline', status: BET_STATUS.LOST, amount: 200, profit: -200, team: 'DAL',         odds: 150,  source: 'FanDuel',    timestamp: '2026-02-03T20:00:00Z' },
    { id: 11, type: 'parlay',    status: BET_STATUS.WON,  amount: 25,  profit: 125,  team: 'Multi',       odds: 500,  source: 'DraftKings', timestamp: '2026-01-18T18:00:00Z' },
    { id: 12, type: 'parlay',    status: BET_STATUS.LOST, amount: 50,  profit: -50,  team: 'Multi',       odds: 300,  source: 'BetMGM',     timestamp: '2026-01-21T15:00:00Z' },
    { id: 13, type: 'parlay',    status: BET_STATUS.WON,  amount: 30,  profit: 180,  team: 'Multi',       odds: 600,  source: 'Caesars',    timestamp: '2026-01-26T14:00:00Z' },
    { id: 14, type: 'prop',      status: BET_STATUS.WON,  amount: 75,  profit: 150,  team: 'J.Allen',     odds: 200,  source: 'BetOnline',  timestamp: '2026-01-29T19:00:00Z' },
    { id: 15, type: 'prop',      status: BET_STATUS.LOST, amount: 100, profit: -100, team: 'C.McCaffrey', odds: 120,  source: 'BetMGM',     timestamp: '2026-01-31T16:30:00Z' },
    { id: 16, type: 'futures',   status: BET_STATUS.WON,  amount: 50,  profit: 450,  team: 'KC',          odds: 900,  source: 'DraftKings', timestamp: '2026-01-16T12:00:00Z' }
  ];

  const wins  = testBets.filter(b => b.status === BET_STATUS.WON).length;
  const losses = testBets.filter(b => b.status === BET_STATUS.LOST).length;
  const totalWagered = testBets.reduce((sum, b) => sum + b.amount, 0);
  const totalProfit  = testBets.reduce((sum, b) => sum + b.profit, 0);

  const analytics = {
    totalBets: testBets.length,
    pendingBets: 0,
    settledBets: testBets.length,
    wins,
    losses,
    pushes: 0,
    totalWagered,
    totalProfit,
    currentBankroll: 1000 + totalProfit,
    winRate: (wins / testBets.length) * 100,
    roi: (totalProfit / totalWagered) * 100,
    unitsWon: totalProfit / 50,
    avgWinOdds:  testBets.filter(b => b.status === BET_STATUS.WON).reduce((s, b) => s + b.odds, 0) / wins,
    avgLossOdds: testBets.filter(b => b.status === BET_STATUS.LOST).reduce((s, b) => s + b.odds, 0) / losses,
    avgWager: totalWagered / testBets.length,
    biggestWin:  Math.max(...testBets.map(b => b.profit)),
    biggestLoss: Math.min(...testBets.map(b => b.profit)),
    currentStreak: { type: 'win', count: 2 },
    longestWinStreak: 4,
    longestLossStreak: 2
  };

  const detailedStats = {
    performanceByType: {
      spread:    { bets: 4, wins: 2, losses: 2, winRate: 50.0,  profit: 35,  roi: 9.46 },
      total:     { bets: 3, wins: 3, losses: 0, winRate: 100.0, profit: 283, roi: 125.78 },
      moneyline: { bets: 3, wins: 2, losses: 1, winRate: 66.7,  profit: 85,  roi: 24.29 },
      parlay:    { bets: 3, wins: 2, losses: 1, winRate: 66.7,  profit: 255, roi: 242.86 },
      prop:      { bets: 2, wins: 1, losses: 1, winRate: 50.0,  profit: 50,  roi: 28.57 },
      futures:   { bets: 1, wins: 1, losses: 0, winRate: 100.0, profit: 450, roi: 900.0 }
    },
    teamPerformance: {
      'KC':    { bets: 2, wins: 2, profit: 550,  wagered: 160, winRate: 100.0, roi: 343.75 },
      'SF':    { bets: 1, wins: 1, profit: 180,  wagered: 100, winRate: 100.0, roi: 180.0 },
      'NE':    { bets: 1, wins: 1, profit: 100,  wagered: 110, winRate: 100.0, roi: 90.91 },
      'DET':   { bets: 1, wins: 1, profit: 105,  wagered: 50,  winRate: 100.0, roi: 210.0 },
      'Over':  { bets: 2, wins: 2, profit: 215,  wagered: 150, winRate: 100.0, roi: 143.33 },
      'Under': { bets: 1, wins: 1, profit: 68,   wagered: 75,  winRate: 100.0, roi: 90.67 },
      'BUF':   { bets: 1, wins: 0, profit: -55,  wagered: 55,  winRate: 0.0,   roi: -100.0 },
      'LAR':   { bets: 1, wins: 0, profit: -110, wagered: 110, winRate: 0.0,   roi: -100.0 },
      'DAL':   { bets: 1, wins: 0, profit: -200, wagered: 200, winRate: 0.0,   roi: -100.0 }
    },
    trends: [
      { period: '2026-W3', bets: 4, wins: 2, profit: 45,  wagered: 325, winRate: 50.0,  roi: 13.85 },
      { period: '2026-W4', bets: 6, wins: 5, profit: 498, wagered: 355, winRate: 83.3,  roi: 140.28 },
      { period: '2026-W5', bets: 6, wins: 4, profit: 615, wagered: 355, winRate: 66.7,  roi: 173.24 }
    ],
    riskMetrics: {
      avgProfit: totalProfit / testBets.length,
      standardDeviation: 125.5,
      variance: 15750.25,
      avgWager: totalWagered / testBets.length,
      wagerVariance: 2100.5,
      streaks: { maxWinStreak: 4, maxLossStreak: 2 },
      volatility: 0.82
    },
    patterns: {
      dayOfWeek: {
        Sunday:    { bets: 6, wins: 4, profit: 380, winRate: 66.7 },
        Monday:    { bets: 3, wins: 2, profit: 125, winRate: 66.7 },
        Tuesday:   { bets: 2, wins: 2, profit: 180, winRate: 100.0 },
        Wednesday: { bets: 3, wins: 2, profit: 45,  winRate: 66.7 },
        Thursday:  { bets: 2, wins: 1, profit: 25,  winRate: 50.0 },
        Friday:    { bets: 0, wins: 0, profit: 0,   winRate: 0 },
        Saturday:  { bets: 0, wins: 0, profit: 0,   winRate: 0 }
      }
    },
    bookAnalytics: [
      { book: 'DraftKings', bets: 5, wins: 5, losses: 0, pushes: 0, wagered: 345,  profit: 900,  winRate: 100.0, roi: 260.87 },
      { book: 'Caesars',    bets: 3, wins: 3, losses: 0, pushes: 0, wagered: 180,  profit: 375,  winRate: 100.0, roi: 208.33 },
      { book: 'BetOnline',  bets: 2, wins: 2, losses: 0, pushes: 0, wagered: 175,  profit: 330,  winRate: 100.0, roi: 188.57 },
      { book: 'FanDuel',    bets: 3, wins: 1, losses: 2, pushes: 0, wagered: 330,  profit: -187, winRate: 33.3,  roi: -56.67 },
      { book: 'BetMGM',     bets: 3, wins: 0, losses: 3, pushes: 0, wagered: 260,  profit: -260, winRate: 0.0,   roi: -100.0 },
    ],
    totalBets: testBets.length,
    settledBets: testBets.length
  };

  return { analytics, detailedStats };
};
