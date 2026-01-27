// src/lib/actionParser.js

const NAME_MAP = {
    "Falcons": "Falcons", "Atlanta Falcons": "Falcons",
    "Buccaneers": "Buccaneers", "Tampa Bay Buccaneers": "Buccaneers",
    "Chargers": "Chargers", "Los Angeles Chargers": "Chargers",
    "Chiefs": "Chiefs", "Kansas City Chiefs": "Chiefs",
    "Raiders": "Raiders", "Las Vegas Raiders": "Raiders",
    "Eagles": "Eagles", "Philadelphia Eagles": "Eagles",
    "Dolphins": "Dolphins", "Miami Dolphins": "Dolphins",
    "Steelers": "Steelers", "Pittsburgh Steelers": "Steelers",
    "Bills": "Bills", "Buffalo Bills": "Bills",
    "Patriots": "Patriots", "New England Patriots": "Patriots",
    "Jets": "Jets", "New York Jets": "Jets",
    "Jaguars": "Jaguars", "Jacksonville Jaguars": "Jaguars",
    "Cardinals": "Cardinals", "Arizona Cardinals": "Cardinals",
    "Texans": "Texans", "Houston Texans": "Texans",
    "Browns": "Browns", "Cleveland Browns": "Browns",
    "Bears": "Bears", "Chicago Bears": "Bears",
    "Commanders": "Commanders", "Washington Commanders": "Commanders",
    "Giants": "Giants", "New York Giants": "Giants",
    "Packers": "Packers", "Green Bay Packers": "Packers",
    "Broncos": "Broncos", "Denver Broncos": "Broncos",
    "Lions": "Lions", "Detroit Lions": "Lions",
    "Rams": "Rams", "Los Angeles Rams": "Rams",
    "Panthers": "Panthers", "Carolina Panthers": "Panthers",
    "Saints": "Saints", "New Orleans Saints": "Saints",
    "Titans": "Titans", "Tennessee Titans": "Titans",
    "49ers": "49ers", "San Francisco 49ers": "49ers",
    "Vikings": "Vikings", "Minnesota Vikings": "Vikings",
    "Cowboys": "Cowboys", "Dallas Cowboys": "Cowboys",
    "Ravens": "Ravens", "Baltimore Ravens": "Ravens",
    "Bengals": "Bengals", "Cincinnati Bengals": "Bengals",
    "Colts": "Colts", "Indianapolis Colts": "Colts",
    "Seahawks": "Seahawks", "Seattle Seahawks": "Seahawks"
};

export const parseActionNetworkDump = (text) => {
    const updates = [];
    
    // 1. Normalize the text: Remove all newlines and condense multiple spaces into one.
    // This turns the vertical "mess" into a single long string of tokens.
    const normalizedText = text.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ");

    console.log("Parsing Normalized Stream...");

    // 2. Identify all known teams in the stream
    // We create a list of found tokens in order: [{type: 'team', val: 'Falcons'}, {type: 'team', val: 'Buccaneers'}...]
    const tokens = [];
    
    // Split by space to iterate words, but re-assemble for teams with spaces (like 'San Francisco') if needed
    // Actually, simpler approach: Regex search for the teams + regex search for stats
    
    // Let's iterate the original NAME_MAP keys and find their positions
    // This is tricky because "Eagles" appears multiple times. 
    // Better: Split by " " and match against map.
    
    const words = normalizedText.split(" ");
    
    for (let i = 0; i < words.length; i++) {
        let word = words[i];
        
        // Handle 2-word teams if necessary (though your map uses short names mostly)
        // Check if word is a known team
        if (NAME_MAP[word]) {
            tokens.push({ type: 'team', value: NAME_MAP[word], index: i });
        }
        // Check for Stats Block: 34%66%66%34%
        else if (word.match(/(\d+)%(\d+)%(\d+)%(\d+)%/)) {
             const match = word.match(/(\d+)%(\d+)%(\d+)%(\d+)%/);
             tokens.push({ 
                 type: 'stats', 
                 visBets: parseInt(match[1]), 
                 homeBets: parseInt(match[2]),
                 visCash: parseInt(match[3]),
                 homeCash: parseInt(match[4]),
                 index: i
             });
        }
    }

    console.log("Tokens found:", tokens);

    // 3. Match Pattern: Team -> Team -> ... -> Stats
    // We look for a stats block, then look backwards for the 2 closest teams.
    
    tokens.forEach((token, idx) => {
        if (token.type === 'stats') {
            // Look back for Home Team (should be idx-1 or close to it)
            // Look back for Visitor Team (should be idx-2)
            
            // Scan backwards from this stat token
            let home = null;
            let visitor = null;
            
            for (let j = idx - 1; j >= 0; j--) {
                if (tokens[j].type === 'team') {
                    if (!home) {
                        home = tokens[j].value;
                    } else {
                        visitor = tokens[j].value;
                        break; // Found pair
                    }
                }
            }

            if (home && visitor) {
                console.log(`✅ MATCH: ${visitor} @ ${home} -> ${token.homeBets}% Tickets / ${token.homeCash}% Cash`);
                
                updates.push({
                    visitor,
                    home,
                    splits: {
                        spread: {
                            tickets: token.homeBets,
                            cash: token.homeCash
                        },
                        total: { tickets: 50, cash: 50 }
                    }
                });
            }
        }
    });

    return updates;
};