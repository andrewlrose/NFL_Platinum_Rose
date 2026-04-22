/**
 * Unit tests for src/lib/agentTools.js
 *
 * Run: npx vitest run
 * Coverage: npx vitest run --coverage
 */
import { describe, it, expect, vi } from 'vitest';

// Mock all I/O dependencies so the module loads cleanly in Node.
vi.mock('../../src/lib/supabase.js', () => ({
  getLatestOddsSnapshot: vi.fn(async () => null),
  getLineMovementsDB: vi.fn(async () => []),
  supabase: null,
}));

vi.mock('../../src/lib/picksDatabase.js', () => ({
  addPick: vi.fn(() => ({ success: true, pick: { id: 'test-pick-1' } })),
}));

vi.mock('../../src/lib/storage.js', () => ({
  loadFromStorage: vi.fn(() => null),
  saveToStorage: vi.fn(),
  PR_STORAGE_KEYS: {},
}));

vi.mock('../../src/lib/apiConfig.js', () => ({
  LOCAL_DATA: { SCHEDULE: '', WEEKLY_STATS: '' },
  ESPN_API: { INJURIES_URL: '' },
}));

import {
  BETTING_TOOLS,
  OPENAI_BETTING_TOOLS,
  executeTool,
} from '../../src/lib/agentTools.js';

describe('agentTools', () => {
  describe('BETTING_TOOLS', () => {
    it('exports exactly 7 tools', () => {
      expect(BETTING_TOOLS).toHaveLength(7);
    });

    it('each tool has name, description, and input_schema', () => {
      for (const tool of BETTING_TOOLS) {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('input_schema');
        expect(typeof tool.name).toBe('string');
      }
    });

    it('tool names match the expected set', () => {
      const names = BETTING_TOOLS.map(t => t.name).sort();
      expect(names).toEqual([
        'analyze_matchup',
        'calculate_hedge',
        'calculate_teaser',
        'get_injury_report',
        'get_line_movement',
        'get_odds',
        'log_pick',
      ]);
    });

    it('calculate_hedge has required fields declared', () => {
      const hedge = BETTING_TOOLS.find(t => t.name === 'calculate_hedge');
      expect(hedge.input_schema.required).toEqual(
        expect.arrayContaining([
          'original_bet_amount',
          'original_odds',
          'hedge_odds',
        ]),
      );
    });
  });

  describe('OPENAI_BETTING_TOOLS', () => {
    it('has same count as BETTING_TOOLS', () => {
      expect(OPENAI_BETTING_TOOLS).toHaveLength(BETTING_TOOLS.length);
    });

    it('each entry is wrapped in OpenAI function-call format', () => {
      for (const tool of OPENAI_BETTING_TOOLS) {
        expect(tool.type).toBe('function');
        expect(tool.function).toHaveProperty('name');
        expect(tool.function).toHaveProperty('description');
        expect(tool.function).toHaveProperty('parameters');
      }
    });

    it('tool names are preserved in the OpenAI wrapper', () => {
      const bettingNames = BETTING_TOOLS.map(t => t.name).sort();
      const openaiNames = OPENAI_BETTING_TOOLS.map(t => t.function.name).sort();
      expect(openaiNames).toEqual(bettingNames);
    });
  });

  describe('executeTool', () => {
    it('returns error object for unknown tool name', async () => {
      const result = await executeTool('not_a_real_tool', {});
      expect(result).toEqual({ error: 'Unknown tool: not_a_real_tool' });
    });

    it('calculate_hedge returns a structured result', async () => {
      const result = await executeTool('calculate_hedge', {
        original_bet_amount: 100,
        original_odds: 150,
        hedge_odds: -150,
      });
      expect(result).toHaveProperty('original');
      expect(result).toHaveProperty('break_even_hedge');
      expect(result.original.stake).toBe(100);
    });

    it('calculate_hedge break-even stake is mathematically correct', async () => {
      // +150 original: payout = 100×2.5 = 250
      // -150 hedge: decimal = 100/150+1 ≈ 1.667
      // breakEvenStake = 250/1.667 ≈ 150
      const result = await executeTool('calculate_hedge', {
        original_bet_amount: 100,
        original_odds: 150,
        hedge_odds: -150,
      });
      expect(result.break_even_hedge.hedge_stake).toBeCloseTo(150, 0);
    });

    it('calculate_hedge with target_profit returns target_hedge block', async () => {
      const result = await executeTool('calculate_hedge', {
        original_bet_amount: 100,
        original_odds: 200,
        hedge_odds: -200,
        target_profit: 25,
      });
      expect(result.target_hedge).not.toBeNull();
      expect(result.target_hedge.guaranteed_profit).toBe(25);
    });

    it('calculate_teaser requires at least 2 legs', async () => {
      const result = await executeTool('calculate_teaser', { legs: [] });
      expect(result).toHaveProperty('error');
    });
  });
});
