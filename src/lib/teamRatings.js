// src/lib/teamRatings.js

// Estimated Net Efficiency Ratings (Week 14 Context)
// 0.0 = League Average
// Positive Offense = Good
// Negative Defense = Good (Points allowed below average)

export const REAL_RATINGS = {
    // --- ELITE TIER ---
    'Lions':      { offEPA: 8.5, defEPA: -1.5, tempo: 1.02 }, // Powerhouse
    'Bills':      { offEPA: 7.0, defEPA: -1.0, tempo: 1.05 },
    'Chiefs':     { offEPA: 5.5, defEPA: -3.5, tempo: 0.98 }, // Elite D, Good O
    'Eagles':     { offEPA: 6.0, defEPA: -2.5, tempo: 1.01 },
    'Ravens':     { offEPA: 7.5, defEPA: 1.0,  tempo: 1.03 }, // Great O, Suspect D

    // --- CONTENDER TIER ---
    'Vikings':    { offEPA: 3.5, defEPA: -4.0, tempo: 0.99 },
    'Packers':    { offEPA: 4.0, defEPA: -1.5, tempo: 1.05 },
    'Steelers':   { offEPA: 1.5, defEPA: -5.0, tempo: 0.95 }, // Elite D
    'Chargers':   { offEPA: 2.0, defEPA: -4.5, tempo: 0.92 },
    'Commanders': { offEPA: 4.5, defEPA: 1.5,  tempo: 1.04 },

    // --- MID TIER ---
    'Texans':     { offEPA: 1.5, defEPA: -2.0, tempo: 0.98 },
    'Broncos':    { offEPA: 0.5, defEPA: -3.0, tempo: 0.96 },
    'Cardinals':  { offEPA: 2.0, defEPA: 1.5,  tempo: 1.02 },
    'Buccaneers': { offEPA: 3.0, defEPA: 2.5,  tempo: 1.01 },
    'Seahawks':   { offEPA: 1.0, defEPA: 1.0,  tempo: 1.05 },
    'Rams':       { offEPA: 2.5, defEPA: 1.5,  tempo: 0.99 },
    '49ers':      { offEPA: 3.0, defEPA: -1.0, tempo: 0.97 }, // Assuming health issues
    'Falcons':    { offEPA: 1.0, defEPA: 1.5,  tempo: 1.00 },
    'Colts':      { offEPA: 0.0, defEPA: 0.5,  tempo: 1.02 },
    'Dolphins':   { offEPA: 1.5, defEPA: 1.0,  tempo: 1.01 },

    // --- BOTTOM TIER ---
    'Bengals':    { offEPA: 4.0, defEPA: 4.5,  tempo: 1.03 }, // All O, No D
    'Cowboys':    { offEPA: -1.0, defEPA: 2.0, tempo: 1.04 },
    'Bears':      { offEPA: -1.5, defEPA: -1.0, tempo: 0.98 },
    'Jets':       { offEPA: -2.5, defEPA: -1.5, tempo: 0.96 },
    'Saints':     { offEPA: -0.5, defEPA: 0.5,  tempo: 0.99 },
    'Panthers':   { offEPA: -2.0, defEPA: 4.0,  tempo: 0.95 },
    'Giants':     { offEPA: -3.5, defEPA: 2.0,  tempo: 0.98 },
    'Titans':     { offEPA: -2.5, defEPA: 0.0,  tempo: 0.94 },
    'Browns':     { offEPA: -1.5, defEPA: 0.5,  tempo: 1.02 },
    'Raiders':    { offEPA: -3.0, defEPA: 3.0,  tempo: 1.00 },
    'Jaguars':    { offEPA: 0.5, defEPA: 4.5,  tempo: 1.00 },
    'Patriots':   { offEPA: -2.0, defEPA: 1.5,  tempo: 0.96 },
};