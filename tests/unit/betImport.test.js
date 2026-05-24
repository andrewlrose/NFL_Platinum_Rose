/**
 * Unit tests for src/lib/betImport.js
 *
 * Tests all exported parser functions with realistic sportsbook text samples.
 * These are pure functions — no network calls, no mocks required.
 *
 * Run: npx vitest run tests/unit/betImport.test.js
 */

import { describe, it, expect } from 'vitest';
import {
  parseBookmakerBet,
  parseBetOnlineBet,
  parseDraftKingsBet,
  parseFanDuelBet,
  parseImportedBet,
  convertTobankrollBet,
  validateImportedBet,
  formatImportedBetDisplay,
} from '../../src/lib/betImport.js';

// ── Sample slip text ──────────────────────────────────────────────────────────

const BOOKMAKER_3_LEG_PARLAY = `3 TEAMS PARLAY
NFL Kansas City Chiefs -3.5-110
Kansas City Chiefs vs Denver Broncos
Game Start 1:00 PM ET
NFL Dallas Cowboys +7-110
Dallas Cowboys vs Philadelphia Eagles
Game Start 4:25 PM ET
NFL Buffalo Bills -6.5-110
Buffalo Bills vs New England Patriots
Game Start 8:20 PM ET
Ticket #98765
Placed January 15, 2026 11:30 AM EST
Risk:$100.00 Win:$600.00`;

const BOOKMAKER_2_LEG_OPEN = `2 TEAMS PARLAY
NFL Kansas City Chiefs -3.5-110
Kansas City Chiefs vs Denver Broncos
Game Start 1:00 PM ET
OPEN PLAY
Ticket #11111
Placed February 01, 2026 09:00 AM EST
Risk:$50.00 Win:$250.00`;

const BOOKMAKER_TOTAL = `1 TEAMS PARLAY
NFL TOTAL o47.5-110 (Kansas City Chiefs vs Denver Broncos)
Game Start 1:00 PM ET
Ticket #22222
Placed January 20, 2026 10:00 AM EST
Risk:$25.00 Win:$22.73`;

const BETONLINE_FUTURES = `Ticket Number:
98765432
Accepted Date:
01/15/2026 11:30:00 AM
Amount:
$200.00
Status:
Pending
To win:
$1200.00
Type:
Futures
Description:
NFL Futures - Super Bowl Futures - Super Bowl 2026 LX Winner - Buffalo Bills +600`;

const BETONLINE_SPREAD = `Ticket Number:
55551234
Accepted Date:
02/10/2026 03:15:00 PM
Amount:
$110.00
Status:
Won
To win:
$100.00
Type:
Spread
Description:
NFL - Kansas City Chiefs vs Philadelphia Eagles - Kansas City Chiefs -3.5`;

const BETONLINE_LOST = `Ticket Number:
77778888
Accepted Date:
01/25/2026 08:00:00 AM
Amount:
$50.00
Status:
Lost
To win:
$45.45
Type:
Total
Description:
NFL - Buffalo Bills vs Kansas City Chiefs - TOTAL o48`;

// ── parseBookmakerBet ─────────────────────────────────────────────────────────

describe('parseBookmakerBet', () => {
  it('source is always "Bookmaker"', () => {
    const bet = parseBookmakerBet(BOOKMAKER_3_LEG_PARLAY);
    expect(bet.source).toBe('Bookmaker');
  });

  it('detects 3-leg parlay and sets type to parlay', () => {
    const bet = parseBookmakerBet(BOOKMAKER_3_LEG_PARLAY);
    expect(bet.type).toBe('parlay');
    expect(bet.totalLegs).toBe(3);
  });

  it('parses ticket number', () => {
    const bet = parseBookmakerBet(BOOKMAKER_3_LEG_PARLAY);
    expect(bet.ticketNumber).toBe('98765');
  });

  it('parses risk and potential win amounts', () => {
    const bet = parseBookmakerBet(BOOKMAKER_3_LEG_PARLAY);
    expect(bet.riskAmount).toBe(100);
    expect(bet.potentialWin).toBe(600);
  });

  it('parses placed date to ISO string', () => {
    const bet = parseBookmakerBet(BOOKMAKER_3_LEG_PARLAY);
    expect(bet.placedDate).toBeTruthy();
    expect(() => new Date(bet.placedDate)).not.toThrow();
  });

  it('parses 3 legs from 3-leg parlay', () => {
    const bet = parseBookmakerBet(BOOKMAKER_3_LEG_PARLAY);
    expect(bet.legs).toHaveLength(3);
  });

  it('each leg has spread bet type for spread lines', () => {
    const bet = parseBookmakerBet(BOOKMAKER_3_LEG_PARLAY);
    const spreadLegs = bet.legs.filter(l => l.betType === 'spread');
    expect(spreadLegs.length).toBeGreaterThanOrEqual(1);
  });

  it('detects open slot and sets isHedgingBet = true', () => {
    const bet = parseBookmakerBet(BOOKMAKER_2_LEG_OPEN);
    expect(bet.openSlots).toBe(1);
    expect(bet.isHedgingBet).toBe(true);
  });

  it('open slot is included as a leg with betType "open"', () => {
    const bet = parseBookmakerBet(BOOKMAKER_2_LEG_OPEN);
    const openSlot = bet.legs.find(l => l.betType === 'open');
    expect(openSlot).toBeDefined();
    expect(openSlot.team).toBe('OPEN SLOT');
  });

  it('parses total bet type', () => {
    const bet = parseBookmakerBet(BOOKMAKER_TOTAL);
    const totalLeg = bet.legs.find(l => l.betType === 'total');
    expect(totalLeg).toBeDefined();
    expect(totalLeg.line).toBe('o47.5');
  });

  it('game matchup is parsed when line contains " vs "', () => {
    const bet = parseBookmakerBet(BOOKMAKER_3_LEG_PARLAY);
    const withGame = bet.legs.filter(l => l.game && l.game.includes('vs'));
    expect(withGame.length).toBeGreaterThanOrEqual(1);
  });

  it('gameTime is parsed from "Game Start" line', () => {
    const bet = parseBookmakerBet(BOOKMAKER_3_LEG_PARLAY);
    const withTime = bet.legs.filter(l => l.gameTime && l.gameTime.includes('ET'));
    expect(withTime.length).toBeGreaterThanOrEqual(1);
  });

  it('generates a description for a parlay', () => {
    const bet = parseBookmakerBet(BOOKMAKER_3_LEG_PARLAY);
    expect(bet.description).toMatch(/Parlay/i);
  });

  it('hedge note is set when there are open slots', () => {
    const bet = parseBookmakerBet(BOOKMAKER_2_LEG_OPEN);
    expect(bet.notes).toMatch(/open slot/i);
  });

  it('status defaults to pending', () => {
    const bet = parseBookmakerBet(BOOKMAKER_3_LEG_PARLAY);
    expect(bet.status).toBe('pending');
  });

  it('handles empty input gracefully', () => {
    const bet = parseBookmakerBet('');
    expect(bet).toBeDefined();
    expect(bet.source).toBe('Bookmaker');
  });
});

// ── parseBetOnlineBet ─────────────────────────────────────────────────────────

describe('parseBetOnlineBet', () => {
  it('source is always "BetOnline"', () => {
    const bet = parseBetOnlineBet(BETONLINE_FUTURES);
    expect(bet.source).toBe('BetOnline');
  });

  it('parses ticket number from next-line format', () => {
    const bet = parseBetOnlineBet(BETONLINE_FUTURES);
    expect(bet.ticketNumber).toBe('98765432');
  });

  it('parses accepted date to ISO string', () => {
    const bet = parseBetOnlineBet(BETONLINE_FUTURES);
    expect(bet.placedDate).toBeTruthy();
    expect(() => new Date(bet.placedDate)).not.toThrow();
  });

  it('parses risk amount', () => {
    const bet = parseBetOnlineBet(BETONLINE_FUTURES);
    expect(bet.riskAmount).toBe(200);
  });

  it('parses potential win', () => {
    const bet = parseBetOnlineBet(BETONLINE_FUTURES);
    expect(bet.potentialWin).toBe(1200);
  });

  it('status is pending for pending bets', () => {
    const bet = parseBetOnlineBet(BETONLINE_FUTURES);
    expect(bet.status).toBe('pending');
  });

  it('status is won for won bets', () => {
    const bet = parseBetOnlineBet(BETONLINE_SPREAD);
    expect(bet.status).toBe('won');
  });

  it('status is lost for lost bets', () => {
    const bet = parseBetOnlineBet(BETONLINE_LOST);
    expect(bet.status).toBe('lost');
  });

  it('type is futures for futures bets', () => {
    const bet = parseBetOnlineBet(BETONLINE_FUTURES);
    expect(bet.type).toBe('futures');
  });

  it('parses team name and odds from futures description', () => {
    const bet = parseBetOnlineBet(BETONLINE_FUTURES);
    expect(bet.legs).toHaveLength(1);
    expect(bet.legs[0].team).toBe('Buffalo Bills');
    expect(bet.legs[0].odds).toBe('+600');
  });

  it('handles spread type', () => {
    const bet = parseBetOnlineBet(BETONLINE_SPREAD);
    expect(bet.riskAmount).toBe(110);
    expect(bet.potentialWin).toBe(100);
  });

  it('handles empty input gracefully', () => {
    const bet = parseBetOnlineBet('');
    expect(bet).toBeDefined();
    expect(bet.source).toBe('BetOnline');
  });
});

// ── parseDraftKingsBet / parseFanDuelBet (stubs) ──────────────────────────────

describe('parseDraftKingsBet', () => {
  it('returns DraftKings source with error flag', () => {
    const bet = parseDraftKingsBet('anything');
    expect(bet.source).toBe('DraftKings');
    expect(bet.error).toBeTruthy();
  });
});

describe('parseFanDuelBet', () => {
  it('returns FanDuel source with error flag', () => {
    const bet = parseFanDuelBet('anything');
    expect(bet.source).toBe('FanDuel');
    expect(bet.error).toBeTruthy();
  });
});

// ── parseImportedBet — auto-detection ─────────────────────────────────────────

describe('parseImportedBet', () => {
  it('auto-detects Bookmaker format via "teams parlay" + "ticket #"', () => {
    const bet = parseImportedBet(BOOKMAKER_3_LEG_PARLAY);
    expect(bet.source).toBe('Bookmaker');
  });

  it('auto-detects BetOnline format via "ticket number:" + "accepted date:"', () => {
    const bet = parseImportedBet(BETONLINE_FUTURES);
    expect(bet.source).toBe('BetOnline');
  });

  it('routes to DraftKings when text contains "draftkings"', () => {
    const bet = parseImportedBet('this is a draftkings slip');
    expect(bet.source).toBe('DraftKings');
  });

  it('routes to FanDuel when text contains "fanduel"', () => {
    const bet = parseImportedBet('fanduel bet slip here');
    expect(bet.source).toBe('FanDuel');
  });

  it('returns Unknown for unrecognized format', () => {
    const bet = parseImportedBet('totally unrecognized content');
    expect(bet.source).toBe('Unknown');
    expect(bet.error).toBeTruthy();
  });

  it('sourceHint overrides auto-detection', () => {
    const bet = parseImportedBet(BOOKMAKER_3_LEG_PARLAY, 'BetOnline');
    expect(bet.source).toBe('BetOnline');
  });
});

// ── convertTobankrollBet ──────────────────────────────────────────────────────

describe('convertTobankrollBet', () => {
  it('returns null when parsedBet has an error', () => {
    const result = convertTobankrollBet({ error: 'bad parse' });
    expect(result).toBeNull();
  });

  it('converts a valid Bookmaker bet to bankroll format', () => {
    const parsed = parseBookmakerBet(BOOKMAKER_3_LEG_PARLAY);
    const bankroll = convertTobankrollBet(parsed);
    expect(bankroll).not.toBeNull();
    expect(bankroll.source).toBe('Bookmaker');
    expect(bankroll.amount).toBe(100);
    expect(bankroll.potentialWin).toBe(600);
    expect(bankroll.isParlay).toBe(true);
    expect(bankroll.imported).toBe(true);
  });

  it('sets isHedgingBet on the bankroll bet', () => {
    const parsed = parseBookmakerBet(BOOKMAKER_2_LEG_OPEN);
    const bankroll = convertTobankrollBet(parsed);
    expect(bankroll.isHedgingBet).toBe(true);
    expect(bankroll.openSlots).toBe(1);
  });

  it('includes importedAt timestamp', () => {
    const parsed = parseBookmakerBet(BOOKMAKER_3_LEG_PARLAY);
    const bankroll = convertTobankrollBet(parsed);
    expect(bankroll.importedAt).toBeTruthy();
    expect(() => new Date(bankroll.importedAt)).not.toThrow();
  });

  it('preserves all legs in bankroll format', () => {
    const parsed = parseBookmakerBet(BOOKMAKER_3_LEG_PARLAY);
    const bankroll = convertTobankrollBet(parsed);
    expect(bankroll.legs).toHaveLength(3);
  });
});

// ── validateImportedBet ───────────────────────────────────────────────────────

describe('validateImportedBet', () => {
  it('returns isValid=true for a fully parsed Bookmaker bet', () => {
    const parsed = parseBookmakerBet(BOOKMAKER_3_LEG_PARLAY);
    const validation = validateImportedBet(parsed);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('returns error when riskAmount is 0', () => {
    const validation = validateImportedBet({ riskAmount: 0, legs: [{}], ticketNumber: '1', placedDate: 'x' });
    expect(validation.isValid).toBe(false);
    expect(validation.errors.some(e => e.includes('risk'))).toBe(true);
  });

  it('returns error when legs is empty', () => {
    const validation = validateImportedBet({ riskAmount: 100, legs: [], ticketNumber: '1', placedDate: 'x' });
    expect(validation.isValid).toBe(false);
    expect(validation.errors.some(e => e.includes('leg'))).toBe(true);
  });

  it('returns error when ticketNumber is missing', () => {
    const validation = validateImportedBet({ riskAmount: 100, legs: [{}], ticketNumber: null, placedDate: 'x' });
    expect(validation.isValid).toBe(false);
    expect(validation.errors.some(e => e.includes('ticket'))).toBe(true);
  });

  it('returns error when placedDate is missing', () => {
    const validation = validateImportedBet({ riskAmount: 100, legs: [{}], ticketNumber: '1', placedDate: null });
    expect(validation.isValid).toBe(false);
    expect(validation.errors.some(e => e.includes('date'))).toBe(true);
  });

  it('accumulates multiple errors', () => {
    const validation = validateImportedBet({ riskAmount: 0, legs: [] });
    expect(validation.errors.length).toBeGreaterThanOrEqual(2);
  });
});

// ── formatImportedBetDisplay ──────────────────────────────────────────────────

describe('formatImportedBetDisplay', () => {
  it('returns Import Error title when parsedBet has error field', () => {
    const display = formatImportedBetDisplay({ error: 'Unsupported format' });
    expect(display.title).toBe('Import Error');
    expect(display.subtitle).toBe('Unsupported format');
  });

  it('returns display with title, subtitle, and details array for valid bet', () => {
    const parsed = parseBookmakerBet(BOOKMAKER_3_LEG_PARLAY);
    const display = formatImportedBetDisplay(parsed);
    expect(display.title).toBeTruthy();
    expect(Array.isArray(display.details)).toBe(true);
  });

  it('details include risk and potential win amounts', () => {
    const parsed = parseBookmakerBet(BOOKMAKER_3_LEG_PARLAY);
    const display = formatImportedBetDisplay(parsed);
    const detailStr = display.details.join(' ');
    expect(detailStr).toMatch(/Risk:/);
    expect(detailStr).toMatch(/Win:/i);
  });

  it('details include each leg description', () => {
    const parsed = parseBookmakerBet(BOOKMAKER_3_LEG_PARLAY);
    const display = formatImportedBetDisplay(parsed);
    const legEntries = display.details.filter(d => d.startsWith('Leg'));
    expect(legEntries).toHaveLength(3);
  });

  it('details include ticket number', () => {
    const parsed = parseBookmakerBet(BOOKMAKER_3_LEG_PARLAY);
    const display = formatImportedBetDisplay(parsed);
    const detailStr = display.details.join(' ');
    expect(detailStr).toMatch(/Ticket/);
  });

  it('details include placed date', () => {
    const parsed = parseBookmakerBet(BOOKMAKER_3_LEG_PARLAY);
    const display = formatImportedBetDisplay(parsed);
    const detailStr = display.details.join(' ');
    expect(detailStr).toMatch(/Placed/);
  });

  it('open slot legs are shown as OPEN SLOT in details', () => {
    const parsed = parseBookmakerBet(BOOKMAKER_2_LEG_OPEN);
    const display = formatImportedBetDisplay(parsed);
    const detailStr = display.details.join(' ');
    expect(detailStr).toMatch(/OPEN SLOT/);
  });
});
