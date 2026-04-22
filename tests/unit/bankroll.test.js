/**
 * Unit tests for src/lib/bankroll.js
 *
 * Run: npx vitest run
 * Coverage: npx vitest run --coverage
 */
import { describe, it, expect, vi } from 'vitest';

// Mock storage and supabase to avoid localStorage/network in Node.
vi.mock('../../src/lib/storage.js', () => ({
  loadFromStorage: vi.fn(() => null),
  saveToStorage: vi.fn(),
  PR_STORAGE_KEYS: {
    BANKROLL: { key: 'nfl_bankroll_v1' },
  },
}));

vi.mock('../../src/lib/supabase.js', () => ({
  syncBet: vi.fn(async () => null),
  supabase: null,
}));

import {
  BET_STATUS,
  BET_TYPES,
  calculateKellyUnit,
} from '../../src/lib/bankroll.js';

describe('bankroll', () => {
  describe('BET_STATUS', () => {
    it('exports all five status values', () => {
      expect(BET_STATUS.PENDING).toBeDefined();
      expect(BET_STATUS.WON).toBeDefined();
      expect(BET_STATUS.LOST).toBeDefined();
      expect(BET_STATUS.PUSHED).toBeDefined();
      expect(BET_STATUS.VOID).toBeDefined();
    });

    it('PENDING is a non-empty string', () => {
      expect(typeof BET_STATUS.PENDING).toBe('string');
      expect(BET_STATUS.PENDING.length).toBeGreaterThan(0);
    });

    it('all status values are distinct', () => {
      const values = Object.values(BET_STATUS);
      const unique = new Set(values);
      expect(unique.size).toBe(values.length);
    });
  });

  describe('BET_TYPES', () => {
    it('exports all seven bet types', () => {
      expect(BET_TYPES.SPREAD).toBeDefined();
      expect(BET_TYPES.MONEYLINE).toBeDefined();
      expect(BET_TYPES.TOTAL).toBeDefined();
      expect(BET_TYPES.PROP).toBeDefined();
      expect(BET_TYPES.TEASER).toBeDefined();
      expect(BET_TYPES.PARLAY).toBeDefined();
      expect(BET_TYPES.FUTURES).toBeDefined();
    });

    it('all type values are distinct strings', () => {
      const values = Object.values(BET_TYPES);
      const unique = new Set(values);
      expect(unique.size).toBe(values.length);
    });
  });

  describe('calculateKellyUnit', () => {
    it('returns positive amount for a clearly +EV bet', () => {
      // 60% win at +200: b=2, p=0.6, q=0.4 → f=(2×0.6-0.4)/2=0.4 → cap 25% → 250
      const unit = calculateKellyUnit(60, 200, 1000);
      expect(unit).toBeCloseTo(250, 0);
    });

    it('returns 0 for a negative Kelly fraction (-EV bet)', () => {
      // 40% win at -110 → Kelly is negative → floored to 0
      const unit = calculateKellyUnit(40, -110, 1000);
      expect(unit).toBe(0);
    });

    it('never exceeds 25% of bankroll (safety cap)', () => {
      // Even extreme win probability / large +odds should cap at 25%
      const unit = calculateKellyUnit(90, 500, 1000);
      expect(unit).toBeLessThanOrEqual(250);
    });

    it('scales proportionally with bankroll size', () => {
      const half  = calculateKellyUnit(60, 200, 500);
      const full  = calculateKellyUnit(60, 200, 1000);
      expect(full).toBeCloseTo(half * 2, 1);
    });

    it('returns 0 for 0% win probability', () => {
      expect(calculateKellyUnit(0, 200, 1000)).toBe(0);
    });
  });
});
