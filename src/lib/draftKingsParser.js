// src/lib/draftKingsParser.js

export const parseDraftKingsDump = (text) => {
    if (!text) return [];
    
    const teamData = [];
    const lines = text.split('\n');

    // Map varying DK names to standard names
    const normalizeName = (name) => {
        const map = {
            'KC Chiefs': 'Chiefs', 'BUF Bills': 'Bills', 'BAL Ravens': 'Ravens', 'CIN Bengals': 'Bengals',
            'CLE Browns': 'Browns', 'PIT Steelers': 'Steelers', 'TEN Titans': 'Titans', 'IND Colts': 'Colts',
            'HOU Texans': 'Texans', 'JAX Jaguars': 'Jaguars', 'MIA Dolphins': 'Dolphins', 'NY Jets': 'Jets',
            'NE Patriots': 'Patriots', 'LV Raiders': 'Raiders', 'DEN Broncos': 'Broncos', 'LAC Chargers': 'Chargers',
            'SEA Seahawks': 'Seahawks', 'SF 49ers': '49ers', 'ARI Cardinals': 'Cardinals', 'LA Rams': 'Rams',
            'CHI Bears': 'Bears', 'GB Packers': 'Packers', 'MIN Vikings': 'Vikings', 'DET Lions': 'Lions',
            'ATL Falcons': 'Falcons', 'CAR Panthers': 'Panthers', 'NO Saints': 'Saints', 'TB Buccaneers': 'Buccaneers',
            'DAL Cowboys': 'Cowboys', 'PHI Eagles': 'Eagles', 'NY Giants': 'Giants', 'WAS Commanders': 'Commanders',
            'Washington': 'Commanders'
        };
        return map[name] || name;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Regex looks for: TeamName (optional spread) (Handle%) (Bets%)
        // Example: "Chiefs -4.5 76% 82%"
        const match = line.match(/^([A-Za-z\s\d]+?)\s+([-+]?[\d\.]+)?\s*(\d+)%\s+(\d+)%/);
        
        if (match) {
            const rawName = match[1].trim();
            const team = normalizeName(rawName);
            const money = parseInt(match[3]); // Handle %
            const ticket = parseInt(match[4]); // Bets %

            teamData.push({ team, money, ticket });
        }
    }

    return teamData;
};