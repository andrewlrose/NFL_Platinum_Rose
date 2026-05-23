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
    validatePick,
    gradeSpread,
    gradeTotal,
    gradeMoneyline,
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
