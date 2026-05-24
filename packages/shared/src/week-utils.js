'use strict';

/**
 * NFL week utilities — shared between game-odds-ingest.js and
 * betting-splits-ingest.js.
 *
 * Uses UTC-based arithmetic throughout to avoid DST ambiguity.
 * Season anchor: the first Thursday in September (UTC).
 */

/**
 * Returns the NFL week number (1-based) for a given kickoff datetime.
 *
 * @param {string|Date} dt   - Kickoff time (ISO 8601 string or Date object).
 * @param {number}      season - Four-digit season year (e.g. 2026).
 * @returns {number}
 */
function weekFromDate(dt, season) {
  // Parse to UTC milliseconds; ISO strings stay UTC-clean.
  const kickoffMs = typeof dt === 'string' ? Date.parse(dt) : dt.getTime();

  // Build Sep 1 of the season at UTC midnight.
  const sep1Ms = Date.UTC(season, 8, 1); // month 8 = September (0-indexed)

  // Day-of-week for Sep 1 in UTC (0=Sun … 6=Sat).
  const sep1DayOfWeek = new Date(sep1Ms).getUTCDay();

  // Advance to the first Thursday (day 4) of September.
  const daysToThu = (4 - sep1DayOfWeek + 7) % 7;
  const week1ThuMs = sep1Ms + daysToThu * 86400000;

  // Week 1 starts on Tuesday (2 days before the first Thursday).
  const week1StartMs = week1ThuMs - 2 * 86400000;

  const diffDays = Math.floor((kickoffMs - week1StartMs) / 86400000);
  return Math.max(1, Math.ceil(diffDays / 7));
}

/**
 * Builds a stable game ID from team abbreviations, kickoff time, and season.
 *
 * Format: `{season}_{WW}_{home}_{away}` — e.g. `2026_01_KC_BUF`.
 *
 * @param {string} homeAbbr
 * @param {string} awayAbbr
 * @param {string|Date} startTime
 * @param {number} season
 * @returns {string}
 */
function buildGameId(homeAbbr, awayAbbr, startTime, season) {
  const week = weekFromDate(startTime, season);
  const ww = String(week).padStart(2, '0');
  return `${season}_${ww}_${homeAbbr}_${awayAbbr}`;
}

module.exports = { weekFromDate, buildGameId };
