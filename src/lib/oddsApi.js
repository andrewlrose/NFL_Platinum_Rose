// src/lib/oddsApi.js

const API_KEY = import.meta.env.VITE_ODDS_API_KEY; 

const BASE_URL = 'https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds';
const REGION = 'us'; 
const MARKETS = 'h2h,spreads,totals';
const BOOKMAKERS = 'draftkings,betonline,bookmaker,fanduel,mgm';

// Team Name Mapping (API Name -> Dashboard Name)
const TEAM_MAPPING = {
    "Arizona Cardinals": "Cardinals",
    "Atlanta Falcons": "Falcons",
    "Baltimore Ravens": "Ravens",
    "Buffalo Bills": "Bills",
    "Carolina Panthers": "Panthers",
    "Chicago Bears": "Bears",
    "Cincinnati Bengals": "Bengals",
    "Cleveland Browns": "Browns",
    "Dallas Cowboys": "Cowboys",
    "Denver Broncos": "Broncos",
    "Detroit Lions": "Lions",
    "Green Bay Packers": "Packers",
    "Houston Texans": "Texans",
    "Indianapolis Colts": "Colts",
    "Jacksonville Jaguars": "Jaguars",
    "Kansas City Chiefs": "Chiefs",
    "Las Vegas Raiders": "Raiders",
    "Los Angeles Chargers": "Chargers",
    "Los Angeles Rams": "Rams",
    "Miami Dolphins": "Dolphins",
    "Minnesota Vikings": "Vikings",
    "New England Patriots": "Patriots",
    "New Orleans Saints": "Saints",
    "New York Giants": "Giants",
    "New York Jets": "Jets",
    "Philadelphia Eagles": "Eagles",
    "Pittsburgh Steelers": "Steelers",
    "San Francisco 49ers": "49ers",
    "Seattle Seahawks": "Seahawks",
    "Tampa Bay Buccaneers": "Buccaneers",
    "Tennessee Titans": "Titans",
    "Washington Commanders": "Commanders"
};

// Mock Weather Generator (Same as your Python script)
const getWeather = (homeTeam) => {
    const domes = ["Falcons", "Lions", "Vikings", "Saints", "Colts", "Texans", "Raiders", "Rams", "Chargers", "Cardinals", "Cowboys"];
    if (domes.includes(homeTeam)) return "DOME";

    const conditions = ["Clear", "Cloudy", "Rain", "Snow", "Windy"];
    const temps = [20, 32, 45, 50, 55, 60, 65, 70];
    const randTemp = temps[Math.floor(Math.random() * temps.length)];
    const randCond = conditions[Math.floor(Math.random() * conditions.length)];
    
    return `${randTemp}° ${randCond}`;
};

export const fetchLiveOdds = async () => {
    // Safety Check
    if (!API_KEY) {
        console.warn("⚠️ No API Key found in .env (VITE_ODDS_API_KEY). Using Mock Data.");
        return normalizeData(MOCK_GAMES, true);
    }

    try {
        console.log("🔄 Fetching live odds from API...");
        const url = `${BASE_URL}?regions=${REGION}&markets=${MARKETS}&apiKey=${API_KEY}&oddsFormat=american`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            if (response.status === 401) throw new Error("Invalid API Key");
            if (response.status === 429) throw new Error("API Quota Exceeded");
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`✅ Success! Fetched ${data.length} games.`);
        return normalizeData(data, false);

    } catch (error) {
        console.error("❌ Failed to fetch odds:", error);
        // Fallback to mock data so the app doesn't break
        return normalizeData(MOCK_GAMES, true);
    }
};
// --- HELPER: Normalize API Format ---
const normalizeData = (rawData, isMock) => {
    if (isMock) return rawData;

    return rawData.map(game => {
        // 1. Get first available bookmaker
        const bookmaker = game.bookmakers.find(b => BOOKMAKERS.includes(b.key)) || game.bookmakers[0];
        
        let spread = 0;
        let total = 0;
        
        // Moneyline variables (Optional, but good to have)
        let homeMl = 0;
        let visitorMl = 0;

        if (bookmaker && bookmaker.markets) {
            // Spread
            const spreadMarket = bookmaker.markets.find(m => m.key === 'spreads');
            if (spreadMarket) {
                const homeOutcome = spreadMarket.outcomes.find(o => o.name === game.home_team);
                if (homeOutcome) spread = homeOutcome.point;
            }

            // Total
            const totalMarket = bookmaker.markets.find(m => m.key === 'totals');
            if (totalMarket) {
                const overOutcome = totalMarket.outcomes.find(o => o.name === 'Over');
                if (overOutcome) total = overOutcome.point;
            }
            
            // Moneyline (h2h) - Fetching this now for future use
            const h2hMarket = bookmaker.markets.find(m => m.key === 'h2h');
            if (h2hMarket) {
                const homeOutcome = h2hMarket.outcomes.find(o => o.name === game.home_team);
                const visitorOutcome = h2hMarket.outcomes.find(o => o.name === game.away_team);
                if (homeOutcome) homeMl = homeOutcome.price;
                if (visitorOutcome) visitorMl = visitorOutcome.price;
            }
        }

        // 2. Clean Team Names
        const cleanName = (fullName) => {
            if (TEAM_MAPPING[fullName]) return TEAM_MAPPING[fullName]; // Use the robust map first
            if (fullName.includes("49ers")) return "49ers";
            const parts = fullName.split(' ');
            return parts[parts.length - 1]; 
        };

        return {
            id: game.id, // Keep the API ID
            home: cleanName(game.home_team),
            visitor: cleanName(game.away_team),
            
            // 🔥 THIS WAS MISSING - ADD IT NOW:
            commence_time: game.commence_time, 
            
            spread,
            total,
            home_ml: homeMl,    // Added ML
            visitor_ml: visitorMl, // Added ML
            weather: null 
        };
    });
};