/**
 * Unit tests for src/lib/actionParser.js
 *
 * parseActionNetworkDump(text) is a pure function — no network, no mocks.
 * It uses NAME_MAP from teams.js (short team nicknames like "Eagles", "Cowboys").
 *
 * Run: npx vitest run tests/unit/actionParser.test.js
 */

import { describe, it, expect } from 'vitest';
import {
  parseActionNetworkDump,
  parseActionNetworkSplits,
  parseActionNetworkMoneyline,
  parseActionNetworkAuto,
} from '../../src/lib/actionParser.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

// Build the compact stats block format: "visBets%homeBets%visCash%homeCash%"
const statsBlock = (visBets, homeBets, visCash, homeCash) =>
  `${visBets}%${homeBets}%${visCash}%${homeCash}%`;

// ── Basic parsing ─────────────────────────────────────────────────────────────

describe('parseActionNetworkDump — basic parsing', () => {
  it('returns an array', () => {
    const result = parseActionNetworkDump('');
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns empty array for empty input', () => {
    expect(parseActionNetworkDump('')).toHaveLength(0);
  });

  it('returns empty array when no teams or stats tokens found', () => {
    expect(parseActionNetworkDump('random text without nfl teams')).toHaveLength(0);
  });

  it('returns empty array when stats block exists but no preceding teams', () => {
    const result = parseActionNetworkDump(statsBlock(45, 55, 40, 60));
    expect(result).toHaveLength(0);
  });

  it('returns empty array when only one team precedes stats block', () => {
    const text = `Eagles ${statsBlock(45, 55, 40, 60)}`;
    const result = parseActionNetworkDump(text);
    expect(result).toHaveLength(0);
  });
});

// ── Matched game parsing ──────────────────────────────────────────────────────

describe('parseActionNetworkDump — matched games', () => {
  it('parses a single game matchup', () => {
    // Format: visitor team · home team · stats block
    const text = `Eagles Cowboys ${statsBlock(45, 55, 40, 60)}`;
    const result = parseActionNetworkDump(text);
    expect(result).toHaveLength(1);
  });

  it('parsed game has visitor, home, and splits fields', () => {
    const text = `Eagles Cowboys ${statsBlock(45, 55, 40, 60)}`;
    const [game] = parseActionNetworkDump(text);
    expect(game).toHaveProperty('visitor');
    expect(game).toHaveProperty('home');
    expect(game).toHaveProperty('splits');
    expect(game.splits).toHaveProperty('spread');
  });

  it('extracts home spread tickets and cash percentages', () => {
    const text = `Eagles Cowboys ${statsBlock(45, 55, 40, 60)}`;
    const [game] = parseActionNetworkDump(text);
    // Cowboys is home (last team before stats block)
    expect(game.splits.spread.tickets).toBe(55);
    expect(game.splits.spread.cash).toBe(60);
  });

  it('home and visitor team names are assigned correctly', () => {
    const text = `Eagles Cowboys ${statsBlock(45, 55, 40, 60)}`;
    const [game] = parseActionNetworkDump(text);
    expect(game.home).toBe('Cowboys');
    expect(game.visitor).toBe('Eagles');
  });

  it('parses multiple games from a single text blob', () => {
    const text = [
      `Eagles Cowboys ${statsBlock(45, 55, 40, 60)}`,
      `Chiefs Broncos ${statsBlock(60, 40, 65, 35)}`,
    ].join(' ');
    const result = parseActionNetworkDump(text);
    expect(result).toHaveLength(2);
  });

  it('handles newlines by normalizing them to spaces', () => {
    const text = `Eagles\nCowboys\n${statsBlock(45, 55, 40, 60)}`;
    const result = parseActionNetworkDump(text);
    expect(result).toHaveLength(1);
  });

  it('home team is the one immediately before the stats block', () => {
    const text = `Eagles Cowboys ${statsBlock(45, 55, 40, 60)}`;
    const [game] = parseActionNetworkDump(text);
    // Cowboys is home (closer to stats block), Eagles is visitor
    expect(game.home).toBe('Cowboys');
    expect(game.visitor).toBe('Eagles');
  });

  it('uses full team names in the output (from NAME_MAP lookup)', () => {
    const text = `Eagles Cowboys ${statsBlock(45, 55, 40, 60)}`;
    const [game] = parseActionNetworkDump(text);
    // NAME_MAP maps "Eagles" → "Eagles" (short name)
    expect(typeof game.home).toBe('string');
    expect(game.home.length).toBeGreaterThan(0);
  });

  it('ignores unknown words between team names and stats', () => {
    const text = `Eagles UNKNOWNWORD Cowboys ${statsBlock(45, 55, 40, 60)}`;
    const result = parseActionNetworkDump(text);
    // "UNKNOWNWORD" is not a team; Eagles and Cowboys should still match
    expect(result).toHaveLength(1);
  });

  it('handles 50/50 splits correctly', () => {
    const text = `Packers Bears ${statsBlock(50, 50, 50, 50)}`;
    const [game] = parseActionNetworkDump(text);
    expect(game.splits.spread.tickets).toBe(50);
    expect(game.splits.spread.cash).toBe(50);
  });

  it('handles multiple spaces between tokens', () => {
    const text = `Eagles  Cowboys   ${statsBlock(45, 55, 40, 60)}`;
    const result = parseActionNetworkDump(text);
    expect(result).toHaveLength(1);
  });
});

// ── Full NFL team name keys ───────────────────────────────────────────────────

describe('parseActionNetworkDump — full team names', () => {
  it('recognizes "Cardinals" as a known team', () => {
    const text = `Cardinals Seahawks ${statsBlock(45, 55, 40, 60)}`;
    const result = parseActionNetworkDump(text);
    expect(result).toHaveLength(1);
  });

  it('recognizes "Patriots" and "Jets"', () => {
    const text = `Patriots Jets ${statsBlock(30, 70, 25, 75)}`;
    const result = parseActionNetworkDump(text);
    expect(result).toHaveLength(1);
    const [game] = result;
    // Jets is home (last team before stats); splits.spread.tickets = homeBets = 70
    expect(game.splits.spread.tickets).toBe(70);
  });

  it('recognizes "Chiefs" and "Raiders"', () => {
    const text = `Raiders Chiefs ${statsBlock(35, 65, 30, 70)}`;
    const result = parseActionNetworkDump(text);
    expect(result).toHaveLength(1);
  });
});

// ── parseActionNetworkSplits ──────────────────────────────────────────────────

describe('parseActionNetworkSplits', () => {
  it('returns an array', () => {
    expect(Array.isArray(parseActionNetworkSplits(''))).toBe(true);
  });

  it('returns empty for input with no teams', () => {
    expect(parseActionNetworkSplits('random text')).toHaveLength(0);
  });

  it('returns empty when fewer than 4 percentages found on own lines', () => {
    const text = `Seahawks\n35%\n65%\n`;
    expect(parseActionNetworkSplits(text)).toHaveLength(0);
  });

  it('parses two teams with 4 percentage lines', () => {
    // tabular format — teams on own lines, percentages on own lines
    const text = [
      'Patriots',
      'Seahawks',
      '35%',
      '65%',
      '30%',
      '70%',
    ].join('\n');
    const result = parseActionNetworkSplits(text);
    expect(result).toHaveLength(1);
    const [game] = result;
    expect(game).toHaveProperty('visitor');
    expect(game).toHaveProperty('home');
    expect(game).toHaveProperty('splits');
  });

  it('result has splits.spread.tickets equal to homeBets', () => {
    const text = [
      'Patriots',
      'Seahawks',
      '35%',
      '65%',
      '30%',
      '70%',
    ].join('\n');
    const [game] = parseActionNetworkSplits(text);
    // homeBets = second percentage (index 1) = 65
    expect(game.splits.spread.tickets).toBe(65);
  });
});

// ── parseActionNetworkMoneyline ───────────────────────────────────────────────

describe('parseActionNetworkMoneyline', () => {
  it('returns an array', () => {
    expect(Array.isArray(parseActionNetworkMoneyline(''))).toBe(true);
  });

  it('returns empty for input with no teams', () => {
    expect(parseActionNetworkMoneyline('77% 23% 78% 22%')).toHaveLength(0);
  });

  it('parses Seahawks vs Patriots moneyline format', () => {
    const text = [
      'Scheduled | Open | Best Odds | % of Bets | % of Money',
      'Sun 2/08, 3:30 PM',
      'Seahawks Team Icon | Seahawks | -225 | 77% | 78%',
      'Patriots Team Icon | Patriots | +185 | 23% | 22%',
    ].join('\n');
    const result = parseActionNetworkMoneyline(text);
    expect(result).toHaveLength(1);
    const [game] = result;
    expect(game.splits).toHaveProperty('ml');
    expect(game.splits.ml).toHaveProperty('visitorTicket');
    expect(game.splits.ml).toHaveProperty('homeTicket');
  });

  it('assigns first found team as visitor, second as home', () => {
    const text = [
      'Seahawks Team Icon | Seahawks | -225 | 77% | 78%',
      'Patriots Team Icon | Patriots | +185 | 23% | 22%',
    ].join('\n');
    const [game] = parseActionNetworkMoneyline(text);
    expect(game.visitor).toBe('Seahawks');
    expect(game.home).toBe('Patriots');
  });
});

// ── parseActionNetworkAuto ────────────────────────────────────────────────────

describe('parseActionNetworkAuto', () => {
  it('returns an array', () => {
    expect(Array.isArray(parseActionNetworkAuto(''))).toBe(true);
  });

  it('returns empty for empty input', () => {
    expect(parseActionNetworkAuto('')).toHaveLength(0);
  });

  it('routes to parseActionNetworkDump for inline %% format', () => {
    const text = `Eagles Cowboys ${statsBlock(45, 55, 40, 60)}`;
    const result = parseActionNetworkAuto(text);
    expect(result).toHaveLength(1);
    expect(result[0].home).toBe('Cowboys');
  });

  it('routes to moneyline parser for team-icon format with odds', () => {
    const text = [
      'Seahawks Team Icon | Seahawks | -225 | 77% | 78%',
      'Patriots Team Icon | Patriots | +185 | 23% | 22%',
    ].join('\n');
    const result = parseActionNetworkAuto(text);
    expect(result).toHaveLength(1);
  });
});
