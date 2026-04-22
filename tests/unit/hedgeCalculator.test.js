/**
 * Unit tests for src/lib/hedgeCalculator.js
 *
 * Run: npx vitest run
 * Coverage: npx vitest run --coverage
 */
import { describe, it, expect, vi } from 'vitest';

// Mock storage so futures.js (depended on by hedgeCalculator.js) never
// touches localStorage in the Node test environment.
vi.mock('../../src/lib/storage.js', () => ({
  loadFromStorage: vi.fn(() => null),
  saveToStorage: vi.fn(),
  PR_STORAGE_KEYS: {},
}));

import {
  lockHedgeStake,
  breakEvenHedgeStake,
  analyzeScenario,
  noHedgeBaseline,
  computeAllModes,
} from '../../src/lib/hedgeCalculator.js';

describe('hedgeCalculator', () => {
  describe('lockHedgeStake', () => {
    it('computes lock stake for positive-odds hedge', () => {
      // futurePayout $250, hedge at +150 → decimal 2.5 → 250/2.5 = 100
      expect(lockHedgeStake(250, 150)).toBeCloseTo(100, 2);
    });

    it('computes lock stake for negative-odds hedge', () => {
      // futurePayout $250, hedge at -110 → decimal ≈1.909 → ≈130.95
      expect(lockHedgeStake(250, -110)).toBeCloseTo(130.95, 0);
    });

    it('returns 0 stake when futurePayout is 0', () => {
      expect(lockHedgeStake(0, -110)).toBe(0);
    });
  });

  describe('breakEvenHedgeStake', () => {
    it('computes break-even stake for positive odds', () => {
      // futureStake $100, hedge at +150 → D=2.5 → 100/(2.5-1) ≈ 66.67
      expect(breakEvenHedgeStake(100, 150)).toBeCloseTo(66.67, 1);
    });

    it('computes break-even stake for negative odds', () => {
      // futureStake $100, hedge at -110 → D≈1.909 → 100/(1.909-1) ≈ 110
      expect(breakEvenHedgeStake(100, -110)).toBeCloseTo(110, 0);
    });

    it('returns a very large stake for extreme favourite odds (near 0 edge)', () => {
      // At -100000: D ≈ 1.001 → 100/(D-1) ≈ 100000 — guard fires only when D≤1
      // Valid American odds always produce D > 1, so no real-world guard trigger.
      const result = breakEvenHedgeStake(100, -100000);
      expect(result).toBeGreaterThan(1000);
    });
  });

  describe('analyzeScenario', () => {
    it('is locked when using the lock stake', () => {
      const stake = lockHedgeStake(250, -110);
      const result = analyzeScenario(100, 250, stake, -110);
      expect(result.isLocked).toBe(true);
    });

    it('hedgePayout equals futurePayout when using lock stake at +100', () => {
      // lockStake at +100 → D=2 → lockStake = 300/2 = 150; hedgePayout = 300
      const stake = lockHedgeStake(300, 100);
      const result = analyzeScenario(100, 300, stake, 100);
      expect(result.hedgePayout).toBeCloseTo(300, 1);
    });

    it('computes totalInvested as futureStake + hedgeStake', () => {
      const result = analyzeScenario(100, 250, 50, 150);
      expect(result.totalInvested).toBeCloseTo(150, 2);
    });

    it('is NOT locked for arbitrary partial hedge stake', () => {
      // Hedging only $50 when lock stake is ~130 should not be locked
      const result = analyzeScenario(100, 250, 50, -110);
      expect(result.isLocked).toBe(false);
    });
  });

  describe('noHedgeBaseline', () => {
    it('returns correct win and loss P&L', () => {
      const result = noHedgeBaseline(100, 250);
      expect(result.futuresWin).toBeCloseTo(150, 2);
      expect(result.futuresLose).toBeCloseTo(-100, 2);
    });

    it('totalInvested equals futureStake', () => {
      const result = noHedgeBaseline(100, 250);
      expect(result.totalInvested).toBe(100);
    });

    it('ROI reflects profit / stake × 100', () => {
      // 150 profit on 100 stake → 150%
      const result = noHedgeBaseline(100, 250);
      expect(result.roi).toBeCloseTo(150, 1);
    });
  });

  describe('computeAllModes', () => {
    it('returns lock, breakEven, and noHedge keys', () => {
      const result = computeAllModes(100, 250, -110);
      expect(result).toHaveProperty('lock');
      expect(result).toHaveProperty('breakEven');
      expect(result).toHaveProperty('noHedge');
    });

    it('lock mode has isLocked=true', () => {
      const result = computeAllModes(100, 250, -110);
      expect(result.lock.isLocked).toBe(true);
    });

    it('noHedge worst-case is a loss of futureStake', () => {
      const result = computeAllModes(100, 250, -110);
      expect(result.noHedge.futuresLose).toBeCloseTo(-100, 2);
    });
  });
});
