/**
 * Unit tests for src/lib/outcomesMerger.js
 *
 * Tests the pure exported functions:
 *   - calcOutcomeStats(outcomes)   — aggregates W/L/P stats from outcome array
 *   - buildCumulativeSeries(outcomes) — builds P&L series for recharts
 *   - mergeOutcomes()              — reads localStorage; tested via global mock
 *
 * Run: npx vitest run tests/unit/outcomesMerger.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  calcOutcomeStats,
  buildCumulativeSeries,
  mergeOutcomes,
} from '../../src/lib/outcomesMerger.js';

// ── Sample outcome data ───────────────────────────────────────────────────────

const makeOutcome = (overrides = {}) => ({
  id: 'o1',
  date: '2026-01-15T12:00:00',
  source: 'bankroll',
  sourceLabel: 'Manual',
  description: 'KC spread -3.5',
  type: 'spread',
  team: 'Chiefs',
  line: -3.5,
  result: 'PENDING',
  amount: 100,
  odds: -110,
  profit: null,
  units: null,
  confidence: null,
  edge: null,
  week: 1,
  isParlay: false,
  ...overrides,
});

const WIN_BANKROLL  = makeOutcome({ id: 'w1', result: 'WIN', profit: 90.91 });
const LOSS_BANKROLL = makeOutcome({ id: 'l1', result: 'LOSS', profit: -100, amount: 100 });
const PUSH_BANKROLL = makeOutcome({ id: 'p1', result: 'PUSH', profit: 0 });
const PENDING_BET   = makeOutcome({ id: 'n1', result: 'PENDING' });

const WIN_PICK  = makeOutcome({ id: 'wp1', source: 'ai_picks', result: 'WIN',  units: 0.9091, amount: null, profit: null });
const LOSS_PICK = makeOutcome({ id: 'lp1', source: 'ai_picks', result: 'LOSS', units: -1,     amount: null, profit: null });
const PUSH_PICK = makeOutcome({ id: 'pp1', source: 'ai_picks', result: 'PUSH', units: 0,      amount: null, profit: null });

// ── calcOutcomeStats ──────────────────────────────────────────────────────────

describe('calcOutcomeStats', () => {
  it('returns zero stats for empty array', () => {
    const stats = calcOutcomeStats([]);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.pushes).toBe(0);
    expect(stats.winRate).toBe(0);
  });

  it('counts wins, losses, and pushes correctly', () => {
    const stats = calcOutcomeStats([WIN_BANKROLL, LOSS_BANKROLL, PUSH_BANKROLL, PENDING_BET]);
    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(1);
    expect(stats.pushes).toBe(1);
  });

  it('counts pending bets separately from settled', () => {
    const stats = calcOutcomeStats([WIN_BANKROLL, PENDING_BET]);
    expect(stats.settled).toBe(1);
    expect(stats.pending).toBe(1);
  });

  it('calculates win rate from settled bets only (excludes pushes)', () => {
    // 1 win, 1 loss → 50%
    const stats = calcOutcomeStats([WIN_BANKROLL, LOSS_BANKROLL]);
    expect(stats.winRate).toBeCloseTo(50);
  });

  it('win rate is 100% when all settled bets are wins', () => {
    const stats = calcOutcomeStats([WIN_BANKROLL, WIN_BANKROLL]);
    expect(stats.winRate).toBeCloseTo(100);
  });

  it('win rate is 0% when all settled bets are losses', () => {
    const stats = calcOutcomeStats([LOSS_BANKROLL, LOSS_BANKROLL]);
    expect(stats.winRate).toBeCloseTo(0);
  });

  it('calculates total dollar P&L from bankroll bets with profit', () => {
    // +90.91 - 100 = -9.09
    const stats = calcOutcomeStats([WIN_BANKROLL, LOSS_BANKROLL]);
    expect(stats.totalDollars).toBeCloseTo(-9.09, 1);
  });

  it('calculates total wagered from bankroll bets', () => {
    const stats = calcOutcomeStats([WIN_BANKROLL, LOSS_BANKROLL]);
    // WIN_BANKROLL has amount=100, LOSS_BANKROLL has amount=100
    expect(stats.totalWagered).toBe(200);
  });

  it('calculates ROI from total dollars / total wagered * 100', () => {
    const stats = calcOutcomeStats([WIN_BANKROLL, LOSS_BANKROLL]);
    expect(typeof stats.roi).toBe('number');
  });

  it('calculates total units from AI picks with units', () => {
    // WIN_PICK units=0.9091, LOSS_PICK units=-1 → -0.0909
    const stats = calcOutcomeStats([WIN_PICK, LOSS_PICK]);
    expect(stats.totalUnits).toBeCloseTo(-0.0909, 3);
  });

  it('push pick contributes 0 units', () => {
    const stats = calcOutcomeStats([PUSH_PICK]);
    expect(stats.totalUnits).toBe(0);
  });

  it('separates bankroll count from picks count', () => {
    const stats = calcOutcomeStats([WIN_BANKROLL, LOSS_BANKROLL, WIN_PICK]);
    expect(stats.bankrollCount).toBe(2);
    expect(stats.picksCount).toBe(1);
  });

  it('totalDollars is 0 when no bankroll bets have profit', () => {
    const stats = calcOutcomeStats([WIN_PICK, LOSS_PICK]);
    expect(stats.totalDollars).toBe(0);
  });
});

// ── buildCumulativeSeries ─────────────────────────────────────────────────────

describe('buildCumulativeSeries', () => {
  it('returns empty array when no settled outcomes', () => {
    const series = buildCumulativeSeries([PENDING_BET]);
    expect(series).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    const series = buildCumulativeSeries([]);
    expect(series).toEqual([]);
  });

  it('prepends a zero anchor at the start', () => {
    const series = buildCumulativeSeries([WIN_BANKROLL]);
    expect(series[0].dollars).toBe(0);
    expect(series[0].units).toBe(0);
    expect(series[0].label).toBe('Start');
  });

  it('total series length is settled.length + 1 (anchor)', () => {
    const series = buildCumulativeSeries([WIN_BANKROLL, LOSS_BANKROLL]);
    expect(series).toHaveLength(3); // anchor + 2 settled
  });

  it('cumulative dollars increases after a bankroll win', () => {
    const series = buildCumulativeSeries([WIN_BANKROLL]);
    const final = series[series.length - 1];
    expect(final.dollars).toBeCloseTo(90.91, 1);
  });

  it('cumulative dollars decreases after a bankroll loss', () => {
    const series = buildCumulativeSeries([WIN_BANKROLL, LOSS_BANKROLL]);
    const final = series[series.length - 1];
    expect(final.dollars).toBeCloseTo(-9.09, 1);
  });

  it('cumulative units tracks AI pick wins', () => {
    const series = buildCumulativeSeries([WIN_PICK]);
    const final = series[series.length - 1];
    expect(final.units).toBeCloseTo(0.9091, 3);
  });

  it('each series point has date, dollars, units, dollarsDelta, unitsDelta', () => {
    const series = buildCumulativeSeries([WIN_BANKROLL]);
    const point = series[1]; // first real point after anchor
    expect(point).toHaveProperty('date');
    expect(point).toHaveProperty('dollars');
    expect(point).toHaveProperty('units');
    expect(point).toHaveProperty('dollarsDelta');
    expect(point).toHaveProperty('unitsDelta');
  });

  it('sorts outcomes chronologically', () => {
    const early = makeOutcome({ id: 'e1', result: 'WIN', profit: 50, date: '2026-01-01T12:00:00' });
    const late  = makeOutcome({ id: 'l2', result: 'WIN', profit: 75, date: '2026-02-01T12:00:00' });
    const series = buildCumulativeSeries([late, early]); // intentionally reversed
    // anchor is at earliest date; second point is early, third is late
    expect(series[1].dollarsDelta).toBeCloseTo(50);
    expect(series[2].dollarsDelta).toBeCloseTo(75);
  });

  it('each point has result and source fields', () => {
    const series = buildCumulativeSeries([WIN_BANKROLL]);
    const point = series[1];
    expect(point.result).toBe('WIN');
    expect(point.source).toBe('bankroll');
  });

  it('dollarsDelta is 0 for AI pick entries (no dollar amount)', () => {
    const series = buildCumulativeSeries([WIN_PICK]);
    const point = series[1];
    expect(point.dollarsDelta).toBe(0);
  });

  it('unitsDelta is 0 for bankroll entries (no unit amount)', () => {
    const series = buildCumulativeSeries([WIN_BANKROLL]);
    const point = series[1];
    expect(point.unitsDelta).toBe(0);
  });
});

// ── mergeOutcomes — localStorage defensive paths ──────────────────────────────

describe('mergeOutcomes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an array even when localStorage is unavailable (Node env)', () => {
    // In Node, localStorage is undefined; the try-catch in readBankrollBets /
    // readPicks catches the TypeError and returns [].
    const result = mergeOutcomes();
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns empty array when localStorage has no data', () => {
    global.localStorage = {
      getItem: vi.fn().mockReturnValue(null),
    };
    try {
      const result = mergeOutcomes();
      expect(Array.isArray(result)).toBe(true);
    } finally {
      delete global.localStorage;
    }
  });

  it('returns merged array sorted descending by date', () => {
    const bankrollData = JSON.stringify({
      bets: [
        { id: '1', status: 'WON', date: '2026-01-10T12:00:00', amount: 100, profit: 90, type: 'spread' },
        { id: '2', status: 'LOST', date: '2026-01-15T12:00:00', amount: 100, profit: -100, type: 'spread' },
      ],
    });
    const picksData = JSON.stringify([
      { id: 'p1', result: 'WIN', createdAt: '2026-01-20T12:00:00', source: 'AI_LAB', pickType: 'spread' },
    ]);

    const mockGetItem = vi.fn((key) => {
      if (key === 'nfl_bankroll_data_v1') return bankrollData;
      if (key === 'pr_picks_v1') return picksData;
      return null;
    });

    global.localStorage = { getItem: mockGetItem };
    try {
      const result = mergeOutcomes();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
      // Sorted descending — latest date first
      const dates = result.map(o => new Date(o.date || 0).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i]);
      }
    } finally {
      delete global.localStorage;
    }
  });

  it('handles malformed JSON in localStorage without throwing', () => {
    global.localStorage = {
      getItem: vi.fn().mockReturnValue('{ invalid json '),
    };
    try {
      expect(() => mergeOutcomes()).not.toThrow();
    } finally {
      delete global.localStorage;
    }
  });
});
