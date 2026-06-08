/**
 * Unit tests for src/lib/picksDatabase.js — pure/exported functions
 *
 * Tests:
 * - CONFIDENCE_BUCKETS / EDGE_BUCKETS constants
 * - validatePick
 * - gradeSpread
 * - gradeTotal
 * - gradeMoneyline
 *
 * Storage-dependent functions (addPick, loadPicks, etc.) are NOT tested here
 * because they require full localStorage + supabase mock wiring.
 *
 * Run: npx vitest run tests/unit/picksDatabase.test.js
 */

import { describe, it, expect, vi } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../src/lib/storage.js', () => ({
    loadFromStorage: vi.fn(() => []),
    saveToStorage:   vi.fn(),
    PR_STORAGE_KEYS: {
        PICKS:        { key: 'picks', permanence: 'critical' },
        GAME_RESULTS: { key: 'game_results', permanence: 'critical' },
    },
}));

vi.mock('../../src/lib/supabase.js', () => ({
    syncPick:          vi.fn(() => Promise.resolve()),
    deleteSyncedPick:  vi.fn(() => Promise.resolve()),
}));

vi.mock('../../src/lib/syncQueue.js', () => ({
    enqueueDirty:   vi.fn(),
    dequeueSuccess: vi.fn(),
}));

import {
    CONFIDENCE_BUCKETS,
    EDGE_BUCKETS,
    ALL_PICK_TYPES,
    validatePick,
    validateParlay,
    validateRoundRobin,
    gradeSpread,
    gradeTotal,
    gradeMoneyline,
    statsByPickType,
    setPickResult,
} from '../../src/lib/picksDatabase.js';

// ── CONFIDENCE_BUCKETS ────────────────────────────────────────────────────────

describe('CONFIDENCE_BUCKETS', () => {
    it('has low, medium, high keys', () => {
        expect(CONFIDENCE_BUCKETS).toHaveProperty('low');
        expect(CONFIDENCE_BUCKETS).toHaveProperty('medium');
        expect(CONFIDENCE_BUCKETS).toHaveProperty('high');
    });

    it('low bucket starts at 50', () => {
        expect(CONFIDENCE_BUCKETS.low.min).toBe(50);
    });

    it('high bucket has no finite max', () => {
        expect(CONFIDENCE_BUCKETS.high.max).toBe(Infinity);
    });
});

// ── EDGE_BUCKETS ──────────────────────────────────────────────────────────────

describe('EDGE_BUCKETS', () => {
    it('has small, medium, large keys', () => {
        expect(EDGE_BUCKETS).toHaveProperty('small');
        expect(EDGE_BUCKETS).toHaveProperty('medium');
        expect(EDGE_BUCKETS).toHaveProperty('large');
    });

    it('small bucket starts at 0', () => {
        expect(EDGE_BUCKETS.small.min).toBe(0);
    });
});

// ── validatePick ──────────────────────────────────────────────────────────────

const BASE_PICK = {
    gameId:     'game_001',
    source:     'AI_LAB',
    pickType:   'spread',
    selection:  'KC',
    line:       -7.5,
    home:       'KC',
    visitor:    'BUF',
    gameDate:   '2026-01-10',
    confidence: 65,
};

describe('validatePick', () => {
    it('returns valid: true for a complete pick', () => {
        expect(validatePick(BASE_PICK)).toEqual({ valid: true });
    });

    it('fails when gameId is missing', () => {
        const { valid, errors } = validatePick({ ...BASE_PICK, gameId: '' });
        expect(valid).toBe(false);
        expect(errors.join(' ')).toMatch(/gameId/i);
    });

    it('fails for invalid source', () => {
        const { valid, errors } = validatePick({ ...BASE_PICK, source: 'UNKNOWN' });
        expect(valid).toBe(false);
        expect(errors.join(' ')).toMatch(/source/i);
    });

    it('fails for invalid pickType', () => {
        const { valid, errors } = validatePick({ ...BASE_PICK, pickType: 'futures' });
        expect(valid).toBe(false);
        expect(errors.join(' ')).toMatch(/pickType/i);
    });

    it('fails when selection is missing', () => {
        const { valid, errors } = validatePick({ ...BASE_PICK, selection: '' });
        expect(valid).toBe(false);
        expect(errors.join(' ')).toMatch(/selection/i);
    });

    it('fails when line is not a number', () => {
        const { valid, errors } = validatePick({ ...BASE_PICK, line: 'bad' });
        expect(valid).toBe(false);
        expect(errors.join(' ')).toMatch(/line/i);
    });

    it('fails when home is missing', () => {
        const { valid, errors } = validatePick({ ...BASE_PICK, home: '' });
        expect(valid).toBe(false);
        expect(errors.join(' ')).toMatch(/home.*visitor|visitor.*home/i);
    });

    it('fails when gameDate is missing', () => {
        const { valid, errors } = validatePick({ ...BASE_PICK, gameDate: '' });
        expect(valid).toBe(false);
        expect(errors.join(' ')).toMatch(/gameDate/i);
    });

    it('accepts EXPERT as a valid source', () => {
        expect(validatePick({ ...BASE_PICK, source: 'EXPERT' })).toEqual({ valid: true });
    });

    it('accepts moneyline pickType', () => {
        expect(validatePick({ ...BASE_PICK, pickType: 'moneyline' })).toEqual({ valid: true });
    });

    it('accepts total pickType', () => {
        expect(validatePick({ ...BASE_PICK, pickType: 'total', selection: 'OVER' })).toEqual({ valid: true });
    });

    it('normalizes decimal confidence (0.65 → 65) without error', () => {
        const result = validatePick({ ...BASE_PICK, confidence: 0.65 });
        expect(result.valid).toBe(true);
    });

    it('fails for confidence out of range', () => {
        const { valid, errors } = validatePick({ ...BASE_PICK, confidence: 200 });
        expect(valid).toBe(false);
        expect(errors.join(' ')).toMatch(/confidence/i);
    });
});

// ── gradeSpread ───────────────────────────────────────────────────────────────

describe('gradeSpread', () => {
    const homeFav = { isHomeTeam: true, line: -7.5 };   // home favored by 7.5
    const awayDog = { isHomeTeam: false, line: 7.5 };   // away team +7.5

    it('home team WIN when covers the spread', () => {
        // home wins 24-14 (margin 10 > 7.5)
        expect(gradeSpread(homeFav, 24, 14)).toBe('WIN');
    });

    it('home team LOSS when fails to cover', () => {
        // home wins 20-17 (margin 3 < 7.5)
        expect(gradeSpread(homeFav, 20, 17)).toBe('LOSS');
    });

    it('home team PUSH when margin equals line', () => {
        // home wins 7.5 exactly (not integer but testing the math)
        expect(gradeSpread({ isHomeTeam: true, line: -7 }, 24, 17)).toBe('PUSH');
    });

    it('away team WIN when home team fails to cover', () => {
        // home wins 20-17 (margin 3 < 7.5 → away covers)
        expect(gradeSpread(awayDog, 20, 17)).toBe('WIN');
    });

    it('away team LOSS when home covers', () => {
        // home wins 24-14 (margin 10 > 7.5 → away loses)
        expect(gradeSpread(awayDog, 24, 14)).toBe('LOSS');
    });

    it('away team PUSH when margin equals line', () => {
        expect(gradeSpread({ isHomeTeam: false, line: 7 }, 24, 17)).toBe('PUSH');
    });
});

// ── gradeTotal ────────────────────────────────────────────────────────────────

describe('gradeTotal', () => {
    it('OVER WIN when actual total exceeds line', () => {
        expect(gradeTotal({ selection: 'OVER', line: 45 }, 28, 24)).toBe('WIN');
    });

    it('OVER LOSS when actual total is under line', () => {
        expect(gradeTotal({ selection: 'OVER', line: 55 }, 28, 24)).toBe('LOSS');
    });

    it('UNDER WIN when actual total is under line', () => {
        expect(gradeTotal({ selection: 'UNDER', line: 55 }, 28, 24)).toBe('WIN');
    });

    it('UNDER LOSS when actual total exceeds line', () => {
        expect(gradeTotal({ selection: 'UNDER', line: 45 }, 28, 24)).toBe('LOSS');
    });

    it('PUSH when total exactly equals line (OVER)', () => {
        expect(gradeTotal({ selection: 'OVER', line: 52 }, 28, 24)).toBe('PUSH');
    });

    it('PUSH when total exactly equals line (UNDER)', () => {
        expect(gradeTotal({ selection: 'UNDER', line: 52 }, 28, 24)).toBe('PUSH');
    });

    it('selection is case-insensitive', () => {
        expect(gradeTotal({ selection: 'over', line: 45 }, 28, 24)).toBe('WIN');
    });
});

// ── gradeMoneyline ────────────────────────────────────────────────────────────

describe('gradeMoneyline', () => {
    it('WIN when home team wins and isHomeTeam is true', () => {
        expect(gradeMoneyline({ isHomeTeam: true }, 28, 14)).toBe('WIN');
    });

    it('LOSS when home team loses and isHomeTeam is true', () => {
        expect(gradeMoneyline({ isHomeTeam: true }, 14, 28)).toBe('LOSS');
    });

    it('WIN when away team wins and isHomeTeam is false', () => {
        expect(gradeMoneyline({ isHomeTeam: false }, 14, 28)).toBe('WIN');
    });

    it('LOSS when away team loses and isHomeTeam is false', () => {
        expect(gradeMoneyline({ isHomeTeam: false }, 28, 14)).toBe('LOSS');
    });

    it('PUSH on exact tie', () => {
        expect(gradeMoneyline({ isHomeTeam: true }, 21, 21)).toBe('PUSH');
        expect(gradeMoneyline({ isHomeTeam: false }, 21, 21)).toBe('PUSH');
    });
});

// ── ALL_PICK_TYPES ────────────────────────────────────────────────────────────

describe('ALL_PICK_TYPES', () => {
    it('includes spread, total, moneyline', () => {
        expect(ALL_PICK_TYPES).toContain('spread');
        expect(ALL_PICK_TYPES).toContain('total');
        expect(ALL_PICK_TYPES).toContain('moneyline');
    });

    it('includes parlay and round_robin', () => {
        expect(ALL_PICK_TYPES).toContain('parlay');
        expect(ALL_PICK_TYPES).toContain('round_robin');
    });
});

// ── validateParlay ────────────────────────────────────────────────────────────

const BASE_PARLAY = {
    legs: [
        { team: 'KC', game: 'KC @ BUF', line: -3.5 },
        { team: 'PHI', game: 'PHI @ DAL', line: 1.5 },
        { team: 'DET', game: 'DET @ GB', line: -2.5 },
    ],
    combinedOdds: 600,
    stake: 1,
    gameDate: '2026-09-14',
};

describe('validateParlay', () => {
    it('returns valid for a complete 3-leg parlay', () => {
        expect(validateParlay(BASE_PARLAY)).toEqual({ valid: true });
    });

    it('fails with fewer than 2 legs', () => {
        const { valid, errors } = validateParlay({ ...BASE_PARLAY, legs: [BASE_PARLAY.legs[0]] });
        expect(valid).toBe(false);
        expect(errors.join(' ')).toMatch(/at least 2 legs/i);
    });

    it('fails when legs array is missing', () => {
        const { valid, errors } = validateParlay({ ...BASE_PARLAY, legs: undefined });
        expect(valid).toBe(false);
        expect(errors.join(' ')).toMatch(/legs/i);
    });

    it('fails when a leg is missing team', () => {
        const badLegs = [{ game: 'KC @ BUF', line: -3.5 }, BASE_PARLAY.legs[1]];
        const { valid, errors } = validateParlay({ ...BASE_PARLAY, legs: badLegs });
        expect(valid).toBe(false);
        expect(errors.join(' ')).toMatch(/team.*game|game.*team/i);
    });

    it('fails when combinedOdds is not a number', () => {
        const { valid, errors } = validateParlay({ ...BASE_PARLAY, combinedOdds: '+600' });
        expect(valid).toBe(false);
        expect(errors.join(' ')).toMatch(/combinedOdds/i);
    });

    it('fails when stake is zero', () => {
        const { valid, errors } = validateParlay({ ...BASE_PARLAY, stake: 0 });
        expect(valid).toBe(false);
        expect(errors.join(' ')).toMatch(/stake/i);
    });

    it('fails when gameDate is missing', () => {
        const { valid, errors } = validateParlay({ ...BASE_PARLAY, gameDate: '' });
        expect(valid).toBe(false);
        expect(errors.join(' ')).toMatch(/gameDate/i);
    });

    it('accepts negative combinedOdds (heavy-favourite parlay)', () => {
        expect(validateParlay({ ...BASE_PARLAY, combinedOdds: -150 })).toEqual({ valid: true });
    });
});

// ── validateRoundRobin ────────────────────────────────────────────────────────

const EIGHT_LEGS = Array.from({ length: 8 }, (_, i) => ({
    team: 'T' + i,
    game: 'T' + i + ' @ T' + (i + 1),
    line: -3,
}));

const BASE_RR = {
    legs: EIGHT_LEGS,
    totalLegs: 8,
    parlaySize: 4,
    stakePer: 0.5,
    gameDate: '2026-09-14',
};

describe('validateRoundRobin', () => {
    it('returns valid for a complete 8-pick/4-team RR', () => {
        expect(validateRoundRobin(BASE_RR)).toEqual({ valid: true });
    });

    it('fails with fewer than 5 legs', () => {
        const shortLegs = EIGHT_LEGS.slice(0, 4);
        const { valid, errors } = validateRoundRobin({ ...BASE_RR, legs: shortLegs, totalLegs: 4 });
        expect(valid).toBe(false);
        expect(errors.join(' ')).toMatch(/5/);
    });

    it('fails when parlaySize >= totalLegs', () => {
        const { valid, errors } = validateRoundRobin({ ...BASE_RR, parlaySize: 8 });
        expect(valid).toBe(false);
        expect(errors.join(' ')).toMatch(/parlaySize.*less|less.*parlaySize/i);
    });

    it('fails when parlaySize is 1', () => {
        const { valid, errors } = validateRoundRobin({ ...BASE_RR, parlaySize: 1 });
        expect(valid).toBe(false);
        expect(errors.join(' ')).toMatch(/parlaySize.*2/i);
    });

    it('fails when stakePer is zero', () => {
        const { valid, errors } = validateRoundRobin({ ...BASE_RR, stakePer: 0 });
        expect(valid).toBe(false);
        expect(errors.join(' ')).toMatch(/stakePer/i);
    });

    it('fails when gameDate is missing', () => {
        const { valid, errors } = validateRoundRobin({ ...BASE_RR, gameDate: '' });
        expect(valid).toBe(false);
        expect(errors.join(' ')).toMatch(/gameDate/i);
    });

    it('accepts a 5-pick/2-team RR (minimum valid)', () => {
        const fiveLegs = EIGHT_LEGS.slice(0, 5);
        expect(validateRoundRobin({ legs: fiveLegs, totalLegs: 5, parlaySize: 2, stakePer: 1, gameDate: '2026-09-14' }))
            .toEqual({ valid: true });
    });
});

// ── statsByPickType ───────────────────────────────────────────────────────────
// Storage mock returns [] so all types have 0 picks — tests cover shape + zero-state.

describe('statsByPickType', () => {
    it('returns an entry for each of the 5 pick types', () => {
        const stats = statsByPickType();
        ['spread', 'total', 'moneyline', 'parlay', 'round_robin'].forEach(t => {
            expect(stats).toHaveProperty(t);
        });
    });

    it('each type entry has required numeric fields', () => {
        const stats = statsByPickType();
        ['spread', 'total', 'moneyline', 'parlay', 'round_robin'].forEach(type => {
            expect(stats[type]).toMatchObject({
                wins:    expect.any(Number),
                losses:  expect.any(Number),
                pushes:  expect.any(Number),
                winRate: expect.any(Number),
                units:   expect.any(Number),
                total:   expect.any(Number),
            });
        });
    });

    it('parlay entry has byTeamCount sub-breakdown', () => {
        const stats = statsByPickType();
        expect(stats.parlay).toHaveProperty('byTeamCount');
        expect(typeof stats.parlay.byTeamCount).toBe('object');
    });

    it('round_robin entry has byConfig sub-breakdown', () => {
        const stats = statsByPickType();
        expect(stats.round_robin).toHaveProperty('byConfig');
        expect(typeof stats.round_robin.byConfig).toBe('object');
    });

    it('winRate is 0 when no graded picks exist', () => {
        const stats = statsByPickType();
        expect(stats.spread.winRate).toBe(0);
        expect(stats.parlay.winRate).toBe(0);
    });
});

// ── setPickResult ─────────────────────────────────────────────────────────────

describe('setPickResult', () => {
    it('returns null when pick is not found', () => {
        expect(setPickResult('nonexistent-id', 'WIN')).toBeNull();
    });

    it('returns null for invalid result value', () => {
        expect(setPickResult('any-id', 'INVALID')).toBeNull();
    });

    it('does not throw on valid result values', () => {
        expect(() => setPickResult('x', 'WIN')).not.toThrow();
        expect(() => setPickResult('x', 'LOSS')).not.toThrow();
        expect(() => setPickResult('x', 'PUSH')).not.toThrow();
    });
});
