/**
 * Unit tests for src/lib/storage.js
 *
 * Tests the pure and browser-mocked functions:
 * - loadFromStorage / saveToStorage / clearStorage / removeFromStorage
 * - importAppData (pure validation logic)
 * - PR_STORAGE_KEYS / CRITICAL_KEYS exports
 *
 * Run: npx vitest run tests/unit/storage.test.js
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── localStorage mock ─────────────────────────────────────────────────────────

const localStorageMock = (() => {
    let store = {};
    return {
        getItem: vi.fn((key) => store[key] ?? null),
        setItem: vi.fn((key, value) => { store[key] = value; }),
        removeItem: vi.fn((key) => { delete store[key]; }),
        clear: vi.fn(() => { store = {}; }),
        _store: () => store,
    };
})();

Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true,
});

beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
});

import {
    PR_STORAGE_KEYS,
    CRITICAL_KEYS,
    loadFromStorage,
    saveToStorage,
    clearStorage,
    removeFromStorage,
    importAppData,
} from '../../src/lib/storage.js';

// ── PR_STORAGE_KEYS ───────────────────────────────────────────────────────────

describe('PR_STORAGE_KEYS', () => {
    it('exports an object', () => {
        expect(typeof PR_STORAGE_KEYS).toBe('object');
        expect(PR_STORAGE_KEYS).not.toBeNull();
    });

    it('each entry has a key field', () => {
        for (const entry of Object.values(PR_STORAGE_KEYS)) {
            expect(typeof entry.key).toBe('string');
            expect(entry.key.length).toBeGreaterThan(0);
        }
    });

    it('each entry has a permanence field', () => {
        for (const entry of Object.values(PR_STORAGE_KEYS)) {
            expect(['critical', 'persistent', 'ephemeral']).toContain(entry.permanence);
        }
    });

    it('BANKROLL entry is critical', () => {
        expect(PR_STORAGE_KEYS.BANKROLL.permanence).toBe('critical');
    });

    it('CACHED_ODDS entry is ephemeral', () => {
        expect(PR_STORAGE_KEYS.CACHED_ODDS.permanence).toBe('ephemeral');
    });
});

// ── CRITICAL_KEYS ─────────────────────────────────────────────────────────────

describe('CRITICAL_KEYS', () => {
    it('is a Set', () => {
        expect(CRITICAL_KEYS).toBeInstanceOf(Set);
    });

    it('contains all critical keys', () => {
        const criticals = Object.values(PR_STORAGE_KEYS)
            .filter(e => e.permanence === 'critical')
            .map(e => e.key);
        for (const key of criticals) {
            expect(CRITICAL_KEYS.has(key)).toBe(true);
        }
    });

    it('does not contain ephemeral keys', () => {
        const ephemerals = Object.values(PR_STORAGE_KEYS)
            .filter(e => e.permanence === 'ephemeral')
            .map(e => e.key);
        for (const key of ephemerals) {
            expect(CRITICAL_KEYS.has(key)).toBe(false);
        }
    });
});

// ── loadFromStorage ───────────────────────────────────────────────────────────

describe('loadFromStorage', () => {
    it('returns defaultValue when key is not present', () => {
        expect(loadFromStorage('nonexistent', 42)).toBe(42);
    });

    it('returns parsed value when key is present', () => {
        localStorage.setItem('test_key', JSON.stringify({ x: 1 }));
        expect(loadFromStorage('test_key', null)).toEqual({ x: 1 });
    });

    it('returns defaultValue on JSON parse error', () => {
        localStorage.setItem('bad_key', 'not-json{{{');
        expect(loadFromStorage('bad_key', 'default')).toBe('default');
    });

    it('returns array correctly', () => {
        localStorage.setItem('arr_key', JSON.stringify([1, 2, 3]));
        expect(loadFromStorage('arr_key', [])).toEqual([1, 2, 3]);
    });
});

// ── saveToStorage ─────────────────────────────────────────────────────────────

describe('saveToStorage', () => {
    it('serializes and saves value to localStorage', () => {
        saveToStorage('save_key', { a: 1 });
        expect(localStorage.setItem).toHaveBeenCalledWith(
            'save_key',
            JSON.stringify({ a: 1 })
        );
    });

    it('can save arrays', () => {
        saveToStorage('arr_key', [1, 2]);
        expect(localStorage.setItem).toHaveBeenCalledWith(
            'arr_key', JSON.stringify([1, 2])
        );
    });

    it('can save null', () => {
        saveToStorage('null_key', null);
        expect(localStorage.setItem).toHaveBeenCalledWith('null_key', 'null');
    });
});

// ── clearStorage ─────────────────────────────────────────────────────────────

describe('clearStorage', () => {
    it('writes null by default', () => {
        clearStorage('some_key');
        expect(localStorage.setItem).toHaveBeenCalledWith('some_key', 'null');
    });

    it('writes provided emptyValue', () => {
        clearStorage('some_key', []);
        expect(localStorage.setItem).toHaveBeenCalledWith('some_key', '[]');
    });
});

// ── removeFromStorage ─────────────────────────────────────────────────────────

describe('removeFromStorage', () => {
    it('calls localStorage.removeItem for ephemeral keys', () => {
        const ephemeralKey = PR_STORAGE_KEYS.CACHED_ODDS.key;
        removeFromStorage(ephemeralKey);
        expect(localStorage.removeItem).toHaveBeenCalledWith(ephemeralKey);
    });

    it('does NOT remove critical keys (safety guard)', () => {
        const criticalKey = PR_STORAGE_KEYS.BANKROLL.key;
        removeFromStorage(criticalKey);
        expect(localStorage.removeItem).not.toHaveBeenCalled();
    });
});

// ── importAppData ─────────────────────────────────────────────────────────────

describe('importAppData', () => {
    it('throws for invalid snapshot (no data field)', () => {
        expect(() => importAppData({ version: 1 })).toThrow();
    });

    it('throws for null snapshot', () => {
        expect(() => importAppData(null)).toThrow();
    });

    it('throws when data is not an object', () => {
        expect(() => importAppData({ data: 'bad' })).toThrow();
    });

    it('returns { restored, skipped } for empty data', () => {
        const result = importAppData({ data: {} });
        expect(result).toHaveProperty('restored');
        expect(result).toHaveProperty('skipped');
        expect(result.restored).toBe(0);
    });

    it('skips keys not in PR_STORAGE_KEYS', () => {
        const result = importAppData({ data: { unknown_key_xyz: { foo: 1 } } });
        expect(result.skipped).toBe(1);
        expect(result.restored).toBe(0);
    });

    it('skips null values', () => {
        const knownKey = PR_STORAGE_KEYS.PICKS.key;
        const result = importAppData({ data: { [knownKey]: null } });
        expect(result.skipped).toBe(1);
        expect(result.restored).toBe(0);
    });

    it('restores valid known keys', () => {
        const knownKey = PR_STORAGE_KEYS.PICKS.key;
        const result = importAppData({ data: { [knownKey]: [{ id: 'pick1' }] } });
        expect(result.restored).toBe(1);
        expect(localStorage.setItem).toHaveBeenCalledWith(
            knownKey,
            JSON.stringify([{ id: 'pick1' }])
        );
    });

    it('accumulates restored and skipped counts', () => {
        const knownKey = PR_STORAGE_KEYS.PICKS.key;
        const result = importAppData({
            data: {
                [knownKey]: [{ id: 'pick1' }],
                unknown_key_1: { bad: true },
                unknown_key_2: { also_bad: true },
            },
        });
        expect(result.restored).toBe(1);
        expect(result.skipped).toBe(2);
    });
});
