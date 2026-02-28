// src/lib/teams.js
// ═══════════════════════════════════════════════════════════════════════════════
// UNIFIED NFL TEAM DATABASE - Single Source of Truth
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Canonical team data for all 32 NFL teams.
 * Key = standard short name used throughout the app (e.g. "Cardinals")
 */
export const NFL_TEAMS = {
  Cardinals: {
    name: "Cardinals",
    fullName: "Arizona Cardinals",
    city: "Arizona",
    abbreviation: "ARI",
    altAbbreviations: ["AZ"],
    aliases: ["cardinals", "arizona", "cards", "ari", "az"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/ari.png",
    division: "NFC West",
    conference: "NFC",
    dome: true
  },
  Falcons: {
    name: "Falcons",
    fullName: "Atlanta Falcons",
    city: "Atlanta",
    abbreviation: "ATL",
    altAbbreviations: [],
    aliases: ["falcons", "atlanta", "atl", "dirty birds"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/atl.png",
    division: "NFC South",
    conference: "NFC",
    dome: true
  },
  Ravens: {
    name: "Ravens",
    fullName: "Baltimore Ravens",
    city: "Baltimore",
    abbreviation: "BAL",
    altAbbreviations: [],
    aliases: ["ravens", "baltimore", "bal", "balt"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/bal.png",
    division: "AFC North",
    conference: "AFC",
    dome: false
  },
  Bills: {
    name: "Bills",
    fullName: "Buffalo Bills",
    city: "Buffalo",
    abbreviation: "BUF",
    altAbbreviations: [],
    aliases: ["bills", "buffalo", "buf", "buff"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/buf.png",
    division: "AFC East",
    conference: "AFC",
    dome: false
  },
  Panthers: {
    name: "Panthers",
    fullName: "Carolina Panthers",
    city: "Carolina",
    abbreviation: "CAR",
    altAbbreviations: [],
    aliases: ["panthers", "carolina", "car"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/car.png",
    division: "NFC South",
    conference: "NFC",
    dome: false
  },
  Bears: {
    name: "Bears",
    fullName: "Chicago Bears",
    city: "Chicago",
    abbreviation: "CHI",
    altAbbreviations: [],
    aliases: ["bears", "chicago", "chi"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/chi.png",
    division: "NFC North",
    conference: "NFC",
    dome: false
  },
  Bengals: {
    name: "Bengals",
    fullName: "Cincinnati Bengals",
    city: "Cincinnati",
    abbreviation: "CIN",
    altAbbreviations: [],
    aliases: ["bengals", "cincinnati", "cincy", "cin"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/cin.png",
    division: "AFC North",
    conference: "AFC",
    dome: false
  },
  Browns: {
    name: "Browns",
    fullName: "Cleveland Browns",
    city: "Cleveland",
    abbreviation: "CLE",
    altAbbreviations: [],
    aliases: ["browns", "cleveland", "cle"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/cle.png",
    division: "AFC North",
    conference: "AFC",
    dome: false
  },
  Cowboys: {
    name: "Cowboys",
    fullName: "Dallas Cowboys",
    city: "Dallas",
    abbreviation: "DAL",
    altAbbreviations: [],
    aliases: ["cowboys", "dallas", "dal", "america's team"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/dal.png",
    division: "NFC East",
    conference: "NFC",
    dome: true
  },
  Broncos: {
    name: "Broncos",
    fullName: "Denver Broncos",
    city: "Denver",
    abbreviation: "DEN",
    altAbbreviations: [],
    aliases: ["broncos", "denver", "den"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/den.png",
    division: "AFC West",
    conference: "AFC",
    dome: false
  },
  Lions: {
    name: "Lions",
    fullName: "Detroit Lions",
    city: "Detroit",
    abbreviation: "DET",
    altAbbreviations: [],
    aliases: ["lions", "detroit", "det"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/det.png",
    division: "NFC North",
    conference: "NFC",
    dome: true
  },
  Packers: {
    name: "Packers",
    fullName: "Green Bay Packers",
    city: "Green Bay",
    abbreviation: "GB",
    altAbbreviations: ["GNB"],
    aliases: ["packers", "green bay", "gb", "gnb", "pack"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/gb.png",
    division: "NFC North",
    conference: "NFC",
    dome: false
  },
  Texans: {
    name: "Texans",
    fullName: "Houston Texans",
    city: "Houston",
    abbreviation: "HOU",
    altAbbreviations: [],
    aliases: ["texans", "houston", "hou"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/hou.png",
    division: "AFC South",
    conference: "AFC",
    dome: true
  },
  Colts: {
    name: "Colts",
    fullName: "Indianapolis Colts",
    city: "Indianapolis",
    abbreviation: "IND",
    altAbbreviations: [],
    aliases: ["colts", "indianapolis", "indy", "ind"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/ind.png",
    division: "AFC South",
    conference: "AFC",
    dome: true
  },
  Jaguars: {
    name: "Jaguars",
    fullName: "Jacksonville Jaguars",
    city: "Jacksonville",
    abbreviation: "JAX",
    altAbbreviations: ["JAC"],
    aliases: ["jaguars", "jacksonville", "jax", "jac", "jags"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/jax.png",
    division: "AFC South",
    conference: "AFC",
    dome: false
  },
  Chiefs: {
    name: "Chiefs",
    fullName: "Kansas City Chiefs",
    city: "Kansas City",
    abbreviation: "KC",
    altAbbreviations: ["KAN"],
    aliases: ["chiefs", "kansas city", "kc", "kan"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/kc.png",
    division: "AFC West",
    conference: "AFC",
    dome: false
  },
  Raiders: {
    name: "Raiders",
    fullName: "Las Vegas Raiders",
    city: "Las Vegas",
    abbreviation: "LV",
    altAbbreviations: ["LVR", "OAK"],
    aliases: ["raiders", "las vegas", "vegas", "lv", "lvr", "oakland", "oak"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/lv.png",
    division: "AFC West",
    conference: "AFC",
    dome: true
  },
  Chargers: {
    name: "Chargers",
    fullName: "Los Angeles Chargers",
    city: "Los Angeles",
    abbreviation: "LAC",
    altAbbreviations: ["SD"],
    aliases: ["chargers", "los angeles chargers", "la chargers", "lac", "bolts", "san diego", "sd"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/lac.png",
    division: "AFC West",
    conference: "AFC",
    dome: true
  },
  Rams: {
    name: "Rams",
    fullName: "Los Angeles Rams",
    city: "Los Angeles",
    abbreviation: "LAR",
    altAbbreviations: ["LA", "STL"],
    aliases: ["rams", "los angeles rams", "la rams", "lar", "la", "st. louis", "stl"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/lar.png",
    division: "NFC West",
    conference: "NFC",
    dome: true
  },
  Dolphins: {
    name: "Dolphins",
    fullName: "Miami Dolphins",
    city: "Miami",
    abbreviation: "MIA",
    altAbbreviations: [],
    aliases: ["dolphins", "miami", "mia", "fins"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/mia.png",
    division: "AFC East",
    conference: "AFC",
    dome: false
  },
  Vikings: {
    name: "Vikings",
    fullName: "Minnesota Vikings",
    city: "Minnesota",
    abbreviation: "MIN",
    altAbbreviations: [],
    aliases: ["vikings", "minnesota", "minny", "min"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/min.png",
    division: "NFC North",
    conference: "NFC",
    dome: true
  },
  Patriots: {
    name: "Patriots",
    fullName: "New England Patriots",
    city: "New England",
    abbreviation: "NE",
    altAbbreviations: ["NWE"],
    aliases: ["patriots", "new england", "pats", "ne", "nwe"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/ne.png",
    division: "AFC East",
    conference: "AFC",
    dome: false
  },
  Saints: {
    name: "Saints",
    fullName: "New Orleans Saints",
    city: "New Orleans",
    abbreviation: "NO",
    altAbbreviations: ["NOR"],
    aliases: ["saints", "new orleans", "no", "nor", "nola"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/no.png",
    division: "NFC South",
    conference: "NFC",
    dome: true
  },
  Giants: {
    name: "Giants",
    fullName: "New York Giants",
    city: "New York",
    abbreviation: "NYG",
    altAbbreviations: [],
    aliases: ["giants", "ny giants", "new york giants", "nyg", "gmen", "big blue"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png",
    division: "NFC East",
    conference: "NFC",
    dome: false
  },
  Jets: {
    name: "Jets",
    fullName: "New York Jets",
    city: "New York",
    abbreviation: "NYJ",
    altAbbreviations: [],
    aliases: ["jets", "ny jets", "new york jets", "nyj", "gang green"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png",
    division: "AFC East",
    conference: "AFC",
    dome: false
  },
  Eagles: {
    name: "Eagles",
    fullName: "Philadelphia Eagles",
    city: "Philadelphia",
    abbreviation: "PHI",
    altAbbreviations: [],
    aliases: ["eagles", "philadelphia", "philly", "phi"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/phi.png",
    division: "NFC East",
    conference: "NFC",
    dome: false
  },
  Steelers: {
    name: "Steelers",
    fullName: "Pittsburgh Steelers",
    city: "Pittsburgh",
    abbreviation: "PIT",
    altAbbreviations: [],
    aliases: ["steelers", "pittsburgh", "pit", "pitt", "steel curtain"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/pit.png",
    division: "AFC North",
    conference: "AFC",
    dome: false
  },
  "49ers": {
    name: "49ers",
    fullName: "San Francisco 49ers",
    city: "San Francisco",
    abbreviation: "SF",
    altAbbreviations: ["SFO"],
    aliases: ["49ers", "san francisco", "niners", "sf", "sfo", "9ers"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/sf.png",
    division: "NFC West",
    conference: "NFC",
    dome: false
  },
  Seahawks: {
    name: "Seahawks",
    fullName: "Seattle Seahawks",
    city: "Seattle",
    abbreviation: "SEA",
    altAbbreviations: [],
    aliases: ["seahawks", "seattle", "sea", "hawks"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/sea.png",
    division: "NFC West",
    conference: "NFC",
    dome: false
  },
  Buccaneers: {
    name: "Buccaneers",
    fullName: "Tampa Bay Buccaneers",
    city: "Tampa Bay",
    abbreviation: "TB",
    altAbbreviations: ["TAM", "TBB"],
    aliases: ["buccaneers", "tampa bay", "tampa", "bucs", "tb", "tam"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/tb.png",
    division: "NFC South",
    conference: "NFC",
    dome: false
  },
  Titans: {
    name: "Titans",
    fullName: "Tennessee Titans",
    city: "Tennessee",
    abbreviation: "TEN",
    altAbbreviations: [],
    aliases: ["titans", "tennessee", "ten", "tenn"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/ten.png",
    division: "AFC South",
    conference: "AFC",
    dome: false
  },
  Commanders: {
    name: "Commanders",
    fullName: "Washington Commanders",
    city: "Washington",
    abbreviation: "WAS",
    altAbbreviations: ["WSH"],
    aliases: ["commanders", "washington", "commies", "was", "wsh", "redskins", "football team"],
    logo: "https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png",
    division: "NFC East",
    conference: "NFC",
    dome: false
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// PRECOMPUTED LOOKUP MAPS (for fast access)
// ═══════════════════════════════════════════════════════════════════════════════

// Build master alias → team name lookup (lowercase keys)
const _aliasLookup = {};
const _abbrLookup = {};

Object.entries(NFL_TEAMS).forEach(([teamName, data]) => {
  // Add all aliases
  data.aliases.forEach(alias => {
    _aliasLookup[alias.toLowerCase()] = teamName;
  });
  
  // Add abbreviation
  _abbrLookup[data.abbreviation.toLowerCase()] = teamName;
  data.altAbbreviations.forEach(abbr => {
    _abbrLookup[abbr.toLowerCase()] = teamName;
  });
  
  // Add full name
  _aliasLookup[data.fullName.toLowerCase()] = teamName;
  
  // Add standard name
  _aliasLookup[teamName.toLowerCase()] = teamName;
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalize any team identifier to the canonical team name.
 * Handles abbreviations, full names, nicknames, and common variations.
 * @param {string} input - Raw team name/abbreviation
 * @returns {string|null} - Canonical team name (e.g. "Chiefs") or null if not found
 */
export function normalizeTeam(input) {
  if (!input) return null;
  const clean = String(input).toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
  
  // Direct lookup (exact match)
  if (_aliasLookup[clean]) return _aliasLookup[clean];
  if (_abbrLookup[clean]) return _abbrLookup[clean];
  
  // Try matching individual words first (handles "KC Chiefs" → matches "chiefs")
  const words = clean.split(/\s+/);
  for (const word of words) {
    if (_aliasLookup[word]) return _aliasLookup[word];
    if (_abbrLookup[word]) return _abbrLookup[word];
  }
  
  // Partial match - prioritize LONGER alias matches to avoid "chi" matching before "chiefs"
  // Sort aliases by length descending so we match "chiefs" before "chi"
  const sortedAliases = Object.entries(_aliasLookup)
    .sort((a, b) => b[0].length - a[0].length);
  
  for (const [alias, teamName] of sortedAliases) {
    // Only match if alias is a substantial part (avoid 2-3 char false positives)
    if (alias.length >= 4 && clean.includes(alias)) {
      return teamName;
    }
  }
  
  // Finally try short aliases but require they match as whole word or at boundary
  for (const [alias, teamName] of sortedAliases) {
    if (alias.length < 4) {
      // For short aliases like "kc", "sf", "gb" - require word boundary or start/end
      const regex = new RegExp(`(^|\\s)${alias}($|\\s)`);
      if (regex.test(clean) || clean === alias) {
        return teamName;
      }
    }
  }
  
  return null;
}

/**
 * Get team data by any identifier
 * @param {string} input - Any team name/abbreviation
 * @returns {object|null} - Full team data object or null
 */
export function getTeam(input) {
  const name = normalizeTeam(input);
  return name ? NFL_TEAMS[name] : null;
}

/**
 * Get team logo URL by any identifier
 * @param {string} input - Any team name/abbreviation
 * @returns {string|null} - Logo URL or null
 */
export function getTeamLogo(input) {
  const team = getTeam(input);
  return team ? team.logo : null;
}

/**
 * Get team abbreviation by any identifier
 * @param {string} input - Any team name/abbreviation
 * @returns {string|null} - Standard abbreviation (e.g. "KC") or null
 */
export function getTeamAbbreviation(input) {
  const team = getTeam(input);
  return team ? team.abbreviation : null;
}

/**
 * Check if team plays in a dome
 * @param {string} input - Any team name/abbreviation
 * @returns {boolean}
 */
export function isTeamDome(input) {
  const team = getTeam(input);
  return team ? team.dome : false;
}

/**
 * Get list of all dome teams (for weather logic)
 * @returns {string[]} - Array of team names
 */
export function getDomeTeams() {
  return Object.entries(NFL_TEAMS)
    .filter(([_, data]) => data.dome)
    .map(([name]) => name);
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY COMPATIBILITY MAPS (for gradual migration)
// These match the exact formats used in existing files
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * TEAM_ALIASES format (used in App.jsx)
 * Maps lowercase aliases → lowercase standard nickname
 */
export const TEAM_ALIASES = Object.entries(NFL_TEAMS).reduce((acc, [name, data]) => {
  const lowerName = name.toLowerCase();
  data.aliases.forEach(alias => {
    acc[alias] = lowerName;
  });
  return acc;
}, {});

/**
 * TEAM_MAP format (used in smartParser.js)
 * Maps lowercase aliases → Display name (capitalized)
 */
export const TEAM_MAP = Object.entries(NFL_TEAMS).reduce((acc, [name, data]) => {
  data.aliases.forEach(alias => {
    acc[alias] = name;
  });
  return acc;
}, {});

/**
 * NAME_MAP format (used in actionParser.js)
 * Maps full names and nicknames → Short nickname
 */
export const NAME_MAP = Object.entries(NFL_TEAMS).reduce((acc, [name, data]) => {
  acc[name] = name;
  acc[data.fullName] = name;
  return acc;
}, {});

/**
 * TEAM_MAPPING format (used in oddsApi.js)
 * Maps API full names → Short nickname
 */
export const TEAM_MAPPING = Object.entries(NFL_TEAMS).reduce((acc, [name, data]) => {
  acc[data.fullName] = name;
  return acc;
}, {});

/**
 * LOGO_URLS format (used in TeamLogo.jsx)
 * Maps team name → ESPN logo URL
 */
export const LOGO_URLS = Object.entries(NFL_TEAMS).reduce((acc, [name, data]) => {
  acc[name] = data.logo;
  return acc;
}, {});

/**
 * TEAM_LOGOS — Comprehensive logo lookup (abbreviation + name + city → URL)
 * Drop-in replacement for the inline TEAM_LOGOS maps in MatchupCard / DevLab.
 * Handles: "KC", "Chiefs", "Kansas City", "WSH", etc.
 */
export const TEAM_LOGOS = Object.entries(NFL_TEAMS).reduce((acc, [name, data]) => {
  // Standard abbreviation (ARI, ATL, KC, …)
  acc[data.abbreviation] = data.logo;
  // Alt abbreviations (WSH, GNB, OAK, …)
  data.altAbbreviations.forEach(abbr => { acc[abbr] = data.logo; });
  // Team name (Cardinals, Falcons, …)
  acc[name] = data.logo;
  // City name (Arizona, Atlanta, …)
  if (data.city) acc[data.city] = data.logo;
  return acc;
}, {});

/**
 * Abbreviation aliases (used in simulation.js)
 * Maps abbreviation → lowercase team name
 */
export const ABBREV_TO_TEAM = Object.entries(NFL_TEAMS).reduce((acc, [name, data]) => {
  const lowerName = name.toLowerCase();
  acc[data.abbreviation.toLowerCase()] = lowerName;
  data.altAbbreviations.forEach(abbr => {
    acc[abbr.toLowerCase()] = lowerName;
  });
  return acc;
}, {});

/**
 * DraftKings format normalizer (used in draftKingsParser.js)
 * @param {string} dkName - DraftKings format name (e.g. "KC Chiefs")
 * @returns {string} - Standard name (e.g. "Chiefs")
 */
export function normalizeDKName(dkName) {
  return normalizeTeam(dkName) || dkName;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════
// Primary: NFL_TEAMS, normalizeTeam, getTeam, getTeamLogo, getTeamAbbreviation
// Legacy: TEAM_ALIASES, TEAM_MAP, NAME_MAP, TEAM_MAPPING, LOGO_URLS, TEAM_LOGOS, ABBREV_TO_TEAM
