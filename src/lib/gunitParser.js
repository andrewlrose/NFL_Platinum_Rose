// src/lib/gunitParser.js
// ─────────────────────────────────────────────────────────────
// G-Unit81 Spreadsheet Parser
//
// Parses pasted G-Unit spreadsheet text into structured edges
// that can be compared against market lines to find value.
// ─────────────────────────────────────────────────────────────

/**
 * Common team-name normalizations.
 * G-Unit sheets may use abbreviations, mascots, or city names.
 * Add to this map as new variations appear.
 */
const TEAM_NORMALIZE = {
  // NCAA Basketball common abbreviations and misspellings
  'unc':           'North Carolina',
  'uconn':         'UConn',
  'st marys':      "Saint Mary's",
  "st. mary's":    "Saint Mary's",
  'st johns':      "St. John's",
  "st. john's":    "St. John's",
  'usc':           'USC',
  'ucla':          'UCLA',
  'byu':           'BYU',
  'smu':           'SMU',
  'tcu':           'TCU',
  'lsu':           'LSU',
  'fau':           'FAU',
  'ucf':           'UCF',
  'ole miss':      'Ole Miss',
  'miami fl':      'Miami (FL)',
  'miami oh':      'Miami (OH)',
  'detriot':       'Detroit',
  'illinios':      'Illinois',
  'texes':         'Texas',
  'pittsburg':     'Pittsburgh',
  'pitt':          'Pittsburgh',
  'stetson':       'Stetson',
  'st francis':    "Saint Francis",
  'st. francis':   "Saint Francis",
  'st bonaventure': "St. Bonaventure",
  'st. bonaventure': "St. Bonaventure",
  'st josephs':    "Saint Joseph's",
  'st. josephs':   "Saint Joseph's",
  'st peters':     "Saint Peter's",
  'st. peters':    "Saint Peter's",
  'mcneese':       'McNeese State',
  'southern cal':  'USC',
  'southern california': 'USC',
  'texas a&m':     'Texas A&M',
  'texas am':      'Texas A&M',
  'texas tech':    'Texas Tech',
  'florida st':    'Florida State',
  'florida state': 'Florida State',
  'mississippi st': 'Mississippi State',
  'mississippi state': 'Mississippi State',
  'oklahoma st':   'Oklahoma State',
  'oklahoma state': 'Oklahoma State',
  'kansas st':     'Kansas State',
  'kansas state':  'Kansas State',
  'iowa st':       'Iowa State',
  'iowa state':    'Iowa State',
  'boise st':      'Boise State',
  'boise state':   'Boise State',
  'san diego st':  'San Diego State',
  'san diego state': 'San Diego State',
  'utah st':       'Utah State',
  'utah state':    'Utah State',
  'colorado st':   'Colorado State',
  'colorado state': 'Colorado State',
  'nc state':      'NC State',
  'north carolina state': 'NC State',
  'stony brook':   'Stony Brook',
  'stonybrook':    'Stony Brook',
  'stephen f austin': 'Stephen F. Austin',
  'sf austin':     'Stephen F. Austin',
  'sf austin':     'Stephen F. Austin',
  'sfa':           'Stephen F. Austin',
  'albany':        'Albany',
  'albany ny':     'Albany',
  'albany new york': 'Albany',
  'boston college': 'Boston College',
  'bc':            'Boston College',
  'csu':           'Colorado State',
  'csu bakersfield': 'CSU Bakersfield',
  'csu fullerton': 'CSU Fullerton',
  'csu northridge': 'CSU Northridge',
  'csu sacramento': 'Sacramento State',
  'sacramento st': 'Sacramento State',
  'sacramento state': 'Sacramento State',
  'long beach st': 'Long Beach State',
  'long beach state': 'Long Beach State',
  'wisc':          'Wisconsin',
  'wisconsin':     'Wisconsin',
  'minnesota':     'Minnesota',
  'minnesota golden gophers': 'Minnesota',
  'rutgers':       'Rutgers',
  'maryland':      'Maryland',
  'indiana':       'Indiana',
  'purdue':        'Purdue',
  'michigan':      'Michigan',
  'michigan st':   'Michigan State',
  'michigan state': 'Michigan State',
  'illinois':      'Illinois',
  'northwestern':  'Northwestern',
  'ohio st':       'Ohio State',
  'ohio state':    'Ohio State',
  'nebraska':      'Nebraska',
  'iowa':          'Iowa',
  'pen st':        'Penn State',
  'penn st':       'Penn State',
  'penn state':    'Penn State',
  'duke':          'Duke',
  'virginia':      'Virginia',
  'virginia tech': 'Virginia Tech',
  'vt':            'Virginia Tech',
  'georgia tech':  'Georgia Tech',
  'gt':            'Georgia Tech',
  'clemson':       'Clemson',
  'florida':       'Florida',
  'tennessee':     'Tennessee',
  'kentucky':      'Kentucky',
  'vanderbilt':    'Vanderbilt',
  'alabama':       'Alabama',
  'auburn':        'Auburn',
  'georgia':       'Georgia',
  'south carolina': 'South Carolina',
  'texas':         'Texas',
  'texas southern': 'Texas Southern',
  'texas state':   'Texas State',
  'texas tech':    'Texas Tech',
  'texas a&m':     'Texas A&M',
  'texas am':      'Texas A&M',
  'houston':       'Houston',
  'rice':          'Rice',
  'smu':           'SMU',
  'tcu':           'TCU',
  'baylor':        'Baylor',
  'oklahoma':      'Oklahoma',
  'oklahoma st':   'Oklahoma State',
  'oklahoma state': 'Oklahoma State',
  'kansas':        'Kansas',
  'kansas st':     'Kansas State',
  'kansas state':  'Kansas State',
  'west virginia': 'West Virginia',
  'wv':            'West Virginia',
  'colorado':      'Colorado',
  'utah':          'Utah',
  'arizona':       'Arizona',
  'arizona st':    'Arizona State',
  'arizona state': 'Arizona State',
  'california':    'California',
  'stanford':      'Stanford',
  'oregon':        'Oregon',
  'oregon st':     'Oregon State',
  'oregon state':  'Oregon State',
  'washington':    'Washington',
  'washington st': 'Washington State',
  'washington state': 'Washington State',
  'idaho':         'Idaho',
  'idaho st':      'Idaho State',
  'idaho state':   'Idaho State',
  'montana':       'Montana',
  'montana st':    'Montana State',
  'montana state': 'Montana State',
  'wyoming':       'Wyoming',
  'nevada':        'Nevada',
  'unlv':          'UNLV',
  'san jose st':   'San Jose State',
  'san jose state': 'San Jose State',
  'fresno st':     'Fresno State',
  'fresno state':  'Fresno State',
  'hawaii':        'Hawaii',
  'air force':     'Air Force',
  'new mexico':    'New Mexico',
  'new mexico st': 'New Mexico State',
  'new mexico state': 'New Mexico State',
  'utep':          'UTEP',
  'utsa':          'UTSA',
  'louisiana':     'Louisiana',
  'louisiana st':  'Louisiana State',
  'louisiana state': 'Louisiana State',
  'la tech':       'Louisiana Tech',
  'louisiana tech': 'Louisiana Tech',
  'southern miss': 'Southern Miss',
  'marshall':      'Marshall',
  'appalachian st': 'Appalachian State',
  'appalachian state': 'Appalachian State',
  'coastal carolina': 'Coastal Carolina',
  'georgia southern': 'Georgia Southern',
  'georgia state': 'Georgia State',
  'arkansas':      'Arkansas',
  'arkansas st':   'Arkansas State',
  'arkansas state': 'Arkansas State',
  'little rock':   'Little Rock',
  'troy':          'Troy',
  'south alabama': 'South Alabama',
  'uab':           'UAB',
  'memphis':       'Memphis',
  'temple':        'Temple',
  'tulane':        'Tulane',
  'tulsa':         'Tulsa',
  'cincinnati':    'Cincinnati',
  'east carolina': 'East Carolina',
  'ecu':           'East Carolina',
  'florida atlantic': 'FAU',
  'fau':           'FAU',
  'florida international': 'FIU',
  'fiu':           'FIU',
  'charlotte':     'Charlotte',
  'north texas':   'North Texas',
  'rice':          'Rice',
  'smu':           'SMU',
  'texas el paso': 'UTEP',
  'utep':          'UTEP',
  'utsa':          'UTSA',
  'western kentucky': 'Western Kentucky',
  'wku':           'Western Kentucky',
  'middle tennessee': 'Middle Tennessee',
  'mtsu':          'Middle Tennessee',
  'old dominion':  'Old Dominion',
  'odu':           'Old Dominion',
  'liberty':       'Liberty',
  'massachusetts': 'Massachusetts',
  'umass':         'Massachusetts',
  'connecticut':   'UConn',
  'uconn':         'UConn',
  'army':          'Army',
  'navy':          'Navy',
  'notre dame':    'Notre Dame',
  'byu':           'BYU',
  'stanford':      'Stanford',
  'california':    'California',
  'usc':           'USC',
  'ucla':          'UCLA',
  'arizona':       'Arizona',
  'arizona st':    'Arizona State',
  'arizona state': 'Arizona State',
  'colorado':      'Colorado',
  'oregon':        'Oregon',
  'oregon st':     'Oregon State',
  'oregon state':  'Oregon State',
  'washington':    'Washington',
  'washington st': 'Washington State',
  'washington state': 'Washington State',
  'idaho':         'Idaho',
  'idaho st':      'Idaho State',
  'idaho state':   'Idaho State',
  'montana':       'Montana',
  'montana st':    'Montana State',
  'montana state': 'Montana State',
  'wyoming':       'Wyoming',
  'nevada':        'Nevada',
  'unlv':          'UNLV',
  'san jose st':   'San Jose State',
  'san jose state': 'San Jose State',
  'fresno st':     'Fresno State',
  'fresno state':  'Fresno State',
  'hawaii':        'Hawaii',
  'air force':     'Air Force',
  'new mexico':    'New Mexico',
  'new mexico st': 'New Mexico State',
  'new mexico state': 'New Mexico State',
  'utep':          'UTEP',
  'utsa':          'UTSA',
  // NFL abbreviations (for flexibility)
  'kc':  'Chiefs', 'ne':  'Patriots', 'gb':  'Packers', 'tb':  'Buccaneers',
  'sf':  '49ers',  'lv':  'Raiders',  'lac': 'Chargers', 'lar': 'Rams',
  'nyg': 'Giants', 'nyj': 'Jets',
};

/**
 * Normalize a team name using the lookup table,
 * or return the original (trimmed + title-cased).
 */
export const normalizeTeamName = (raw) => {
  if (!raw) return '';
  const key = raw.trim().toLowerCase().replace(/['']/g, "'");
  if (TEAM_NORMALIZE[key]) return TEAM_NORMALIZE[key];
  // Title-case fallback
  return raw.trim().replace(/\b\w/g, c => c.toUpperCase());
};

// ── Line Parsers ────────────────────────────────────────────

/**
 * Parse a SPREAD line.
 *
 * Supported formats:
 *   "Duke -7.5 vs UNC"
 *   "Duke -7.5 @ UNC"
 *   "Duke (-7.5) vs UNC"
 *   "Kansas +3 vs Kentucky"
 */
const SPREAD_RE = /^(.+?)\s*\(?\s*([-+]?\d+\.?\d*)\s*\)?\s+(?:vs\.?|@|at)\s+(.+)$/i;

/**
 * Parse a TOTAL line.
 *
 * Supported formats:
 *   "Over 145.5 Duke/UNC"
 *   "Under 138 Kansas vs Kentucky"
 *   "OVER 145.5 Duke @ UNC"
 *   "o145.5 Duke/UNC"
 *   "u138 Kansas/Kentucky"
 */
const TOTAL_RE = /^(over|under|o|u)\s*([\d.]+)\s+(.+?)(?:\s*[/@]\s*|\s+(?:vs\.?|at)\s+)(.+)$/i;

/**
 * Parse a single text line into a structured edge object.
 * Returns null if the line can't be parsed.
 */
export const parseLine = (line) => {
  if (!line) return null;
  line = line.trim();
  if (!line || line.startsWith('#') || line.startsWith('//')) return null;

  // Try total first (starts with Over/Under/o/u)
  const totalMatch = line.match(TOTAL_RE);
  if (totalMatch) {
    const direction = totalMatch[1].toUpperCase().startsWith('O') ? 'OVER' : 'UNDER';
    return {
      pickType:  'total',
      selection: direction,
      line:      parseFloat(totalMatch[2]),
      team:      normalizeTeamName(totalMatch[3]),
      opponent:  normalizeTeamName(totalMatch[4]),
    };
  }

  // Try spread
  const spreadMatch = line.match(SPREAD_RE);
  if (spreadMatch) {
    const team = normalizeTeamName(spreadMatch[1]);
    const rawLine = parseFloat(spreadMatch[2]);
    const opponent = normalizeTeamName(spreadMatch[3]);
    return {
      pickType:  'spread',
      selection: team,
      line:      rawLine,
      team,
      opponent,
      isHomeTeam: !line.toLowerCase().includes(' @ '), // "vs" = home, "@" = away
    };
  }

  return null;
};

// ── Sheet Parser ────────────────────────────────────────────

/**
 * Parse a full G-Unit spreadsheet paste (multi-line text).
 *
 * @param {string} text   — raw pasted text
 * @returns {{ parsed: object[], errors: string[] }}
 */
export const parseGUnitSpreadsheet = (text) => {
  if (!text || typeof text !== 'string') {
    return { parsed: [], errors: ['No text provided'] };
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const parsed = [];
  const errors = [];

  lines.forEach((line, idx) => {
    const result = parseLine(line);
    if (result) {
      parsed.push({ ...result, rawLine: line, lineNumber: idx + 1 });
    } else {
      errors.push(`Line ${idx + 1}: Could not parse → "${line}"`);
    }
  });

  return { parsed, errors };
};

// ── Edge Calculator ─────────────────────────────────────────

/**
 * Calculate edges by comparing G-Unit projections against market lines.
 *
 * @param {object[]} gunitLines  — output from parseGUnitSpreadsheet
 * @param {object[]} schedule    — current schedule with market spreads/totals
 * @returns {object[]} edges with game match info
 */
export const calculateGUnitEdges = (gunitLines, schedule) => {
  if (!Array.isArray(gunitLines) || !Array.isArray(schedule)) return [];

  return gunitLines.map(pick => {
    // Defensive: skip if team/opponent is missing or null
    if (!pick.team || !pick.opponent) {
      console.warn(`G-Unit: Missing team or opponent for line: ${pick.rawLine || JSON.stringify(pick)}`);
      return { ...pick, matched: false, edge: 0, gameId: null };
    }

    // Try to match to a game on the schedule
    const game = schedule.find(g => {
      // Defensive: skip if g, g.home, or g.visitor is null/undefined
      if (!g || !g.home || !g.visitor) return false;
      const h = (g.home || '').toLowerCase();
      const v = (g.visitor || '').toLowerCase();
      const t = (pick.team || '').toLowerCase();
      const o = (pick.opponent || '').toLowerCase();

      // Defensive: skip if any are null
      if (!h || !v || !t || !o) return false;

      return (
        (h.includes(t) || t.includes(h) || h.includes(o) || o.includes(h)) &&
        (v.includes(t) || t.includes(v) || v.includes(o) || o.includes(v))
      );
    });

    if (!game) {
      // Log unmatched teams for debugging
      console.warn(`G-Unit: No match found for team(s): "${pick.team}" vs "${pick.opponent}" (raw: ${pick.rawLine || JSON.stringify(pick)})`);
      return { ...pick, matched: false, edge: 0, gameId: null };
    }

    // Calculate edge
    let edge = 0;
    if (pick.pickType === 'spread') {
      edge = Math.abs(pick.line - game.spread);
    } else if (pick.pickType === 'total') {
      edge = Math.abs(pick.line - game.total);
    }

    return {
      ...pick,
      matched:   true,
      gameId:    game.id,
      home:      game.home,
      visitor:   game.visitor,
      gameDate:  game.gameDate || game.date || null,
      gameTime:  game.gameTime || game.time || null,
      commenceTime: game.commence_time || null,
      marketLine: pick.pickType === 'spread' ? game.spread : game.total,
      edge:      +edge.toFixed(1),
    };
  });
};
