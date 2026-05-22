/**
 * Unit tests for src/lib/futures.js
 *
 * Run: npx vitest run
 * Coverage: npx vitest run --coverage
 */
import { describe, it, expect, vi } from 'vitest';

// Prevent localStorage access in Node test environment.
vi.mock('../../src/lib/storage.js', () => ({
  loadFromStorage: vi.fn(() => null),
  saveToStorage: vi.fn(),
}));

import {
  americanToDecimal,
  impliedProbability,
  calcPayout,
  calcProfit,
  computeParlayOdds,
  devig,
  calcEV,
  FUTURES_TYPES,
  POSITION_STATUS,
  PARLAY_STATUS,
  LEG_RESULT,
} from '../../src/lib/futures.js';

describe('futures', () => {
  describe('americanToDecimal', () => {
    it('converts positive odds correctly', () => {
      expect(americanToDecimal(150)).toBeCloseTo(2.5, 5);
      expect(americanToDecimal(100)).toBeCloseTo(2.0, 5);
      expect(americanToDecimal(300)).toBeCloseTo(4.0, 5);
    });

    it('converts negative odds correctly', () => {
      expect(americanToDecimal(-110)).toBeCloseTo(1.9091, 3);
      expect(americanToDecimal(-200)).toBeCloseTo(1.5, 5);
    });

    it('even-money -100 converts to 2.0', () => {
      expect(americanToDecimal(-100)).toBeCloseTo(2.0, 5);
    });
  });

  describe('impliedProbability', () => {
    it('+100 is 50/50', () => {
      expect(impliedProbability(100)).toBeCloseTo(0.5, 5);
    });

    it('+150 underdog ≈ 40%', () => {
      expect(impliedProbability(150)).toBeCloseTo(0.4, 5);
    });

    it('-110 favorite ≈ 52.4%', () => {
      expect(impliedProbability(-110)).toBeCloseTo(0.5238, 3);
    });

    it('-200 heavy favorite ≈ 66.7%', () => {
      expect(impliedProbability(-200)).toBeCloseTo(0.6667, 3);
    });
  });

  describe('calcPayout', () => {
    it('stake + profit at +150 = 250 on $100', () => {
      expect(calcPayout(100, 150)).toBeCloseTo(250, 2);
    });

    it('correct payout at -110 on $110 stake', () => {
      expect(calcPayout(110, -110)).toBeCloseTo(210, 1);
    });
  });

  describe('calcProfit', () => {
    it('profit is payout minus stake', () => {
      expect(calcProfit(100, 150)).toBeCloseTo(150, 2);
    });

    it('equals calcPayout - stake for any input', () => {
      const stake = 75;
      expect(calcProfit(stake, -110)).toBeCloseTo(calcPayout(stake, -110) - stake, 5);
    });
  });

  describe('computeParlayOdds', () => {
    it('returns 100 when all legs push', () => {
      const legs = [
        { odds: 150, result: LEG_RESULT.PUSH },
        { odds: -110, result: LEG_RESULT.PUSH },
      ];
      expect(computeParlayOdds(legs)).toBe(100);
    });

    it('combines two active legs into American odds', () => {
      const legs = [
        { odds: 150, result: LEG_RESULT.PENDING },
        { odds: -110, result: LEG_RESULT.PENDING },
      ];
      // decimal = 2.5 × 1.909 ≈ 4.772 → (4.772-1)×100 ≈ 377
      const combined = computeParlayOdds(legs);
      expect(combined).toBeGreaterThan(300);
      expect(combined).toBeLessThan(450);
    });

    it('PUSH leg is excluded from calculation', () => {
      const twoLegs = [
        { odds: 200, result: LEG_RESULT.PENDING },
        { odds: 200, result: LEG_RESULT.PENDING },
      ];
      const threeLegsOnePush = [
        { odds: 200, result: LEG_RESULT.PENDING },
        { odds: 200, result: LEG_RESULT.PENDING },
        { odds: 300, result: LEG_RESULT.PUSH },
      ];
      // The PUSH leg at +300 should have no effect
      expect(computeParlayOdds(threeLegsOnePush)).toBeCloseTo(
        computeParlayOdds(twoLegs),
        0,
      );
    });

    it('single active leg returns its own American odds equivalently', () => {
      const legs = [{ odds: 200, result: LEG_RESULT.PENDING }];
      // decimal=3 → (3-1)×100 = 200 → +200 American
      expect(computeParlayOdds(legs)).toBeCloseTo(200, 0);
    });
  });

  describe('enum exports', () => {
    it('FUTURES_TYPES has expected bet categories', () => {
      expect(FUTURES_TYPES.PLAYOFFS).toBe('playoffs');
      expect(FUTURES_TYPES.SUPERBOWL).toBe('superbowl');
      expect(FUTURES_TYPES.DIVISION).toBe('division');
      expect(FUTURES_TYPES.CONFERENCE).toBe('conference');
    });

    it('POSITION_STATUS covers all lifecycle states', () => {
      expect(POSITION_STATUS.OPEN).toBeDefined();
      expect(POSITION_STATUS.WON).toBeDefined();
      expect(POSITION_STATUS.LOST).toBeDefined();
      expect(POSITION_STATUS.HEDGED).toBeDefined();
      expect(POSITION_STATUS.VOID).toBeDefined();
    });

    it('PARLAY_STATUS covers all states', () => {
      expect(PARLAY_STATUS.LIVE).toBeDefined();
      expect(PARLAY_STATUS.WON).toBeDefined();
      expect(PARLAY_STATUS.LOST).toBeDefined();
      expect(PARLAY_STATUS.PUSHED).toBeDefined();
      expect(PARLAY_STATUS.VOIDED).toBeDefined();
    });
  });

  describe('devig', () => {
    it('two-sided -110/-110 line normalises to 50/50', () => {
      const p = impliedProbability(-110); // ≈ 0.5238
      const [h, a] = devig(p, p);
      expect(h).toBeCloseTo(0.5, 4);
      expect(a).toBeCloseTo(0.5, 4);
    });

    it('fair probabilities sum to 1.0 ± 0.001 for any market', () => {
      const h = impliedProbability(-200); // 0.6667
      const a = impliedProbability(+170); // 0.3704
      const [hFair, aFair] = devig(h, a);
      expect(hFair + aFair).toBeCloseTo(1.0, 3);
    });

    it('preserves relative probability ratio', () => {
      const h = impliedProbability(-150);
      const a = impliedProbability(+130);
      const [hFair, aFair] = devig(h, a);
      expect(hFair / aFair).toBeCloseTo(h / a, 4);
    });

    it('handles n-outcome market (3 teams)', () => {
      const probs = [0.4, 0.35, 0.35]; // overround = 1.10
      const fair = devig(...probs);
      const sum = fair.reduce((s, p) => s + p, 0);
      expect(sum).toBeCloseTo(1.0, 3);
      expect(fair.length).toBe(3);
    });

    it('returns all zeros when total is zero', () => {
      const result = devig(0, 0);
      expect(result).toEqual([0, 0]);
    });
  });

  describe('calcEV', () => {
    it('zero EV on a fair bet (50% at +100)', () => {
      expect(calcEV(0.5, 100)).toBeCloseTo(0, 5);
    });

    it('positive EV when fair prob exceeds book implied', () => {
      // Book: -110 implies 52.38%; fair estimate is 55%
      const ev = calcEV(0.55, -110);
      expect(ev).toBeGreaterThan(0);
    });

    it('negative EV when fair prob is below book implied', () => {
      // Book: -110 implies 52.38%; fair estimate is 48%
      const ev = calcEV(0.48, -110);
      expect(ev).toBeLessThan(0);
    });

    it('standard -110 line is negative EV at 50% fair prob', () => {
      // Book takes vig: a coin-flip at -110 is -EV
      expect(calcEV(0.5, -110)).toBeLessThan(0);
    });

    it('+EV on big underdog when fair prob is higher than book', () => {
      // +300 implies 25%; if truly 30% chance, that is +EV
      const ev = calcEV(0.3, 300);
      expect(ev).toBeGreaterThan(0);
    });
  });
});
