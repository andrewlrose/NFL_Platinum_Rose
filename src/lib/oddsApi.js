// src/lib/oddsApi.js
// Uses unified team database from teams.js

import { TEAM_MAPPING, normalizeTeam, getDomeTeams, getTeamAbbreviation } from './teams.js';
import { ODDS_API_KEY, ODDS_API } from './apiConfig.js';

// Mock Weather Generator - Uses unified dome list from teams.js
const getWeather = (homeTeam) => {
    const domes = getDomeTeams();
    const normalized = normalizeTeam(homeTeam);
    if (normalized && domes.includes(normalized)) return "DOME";

    const conditions = ["Clear", "Cloudy", "Rain", "Snow", "Windy"];
    const temps = [20, 32, 45, 50, 55, 60, 65, 70];
    const randTemp = temps[Math.floor(Math.random() * temps.length)];
    const randCond = conditions[Math.floor(Math.random() * conditions.length)];
    
    return `${randTemp}° ${randCond}`;
};

export const fetchLiveOdds = async () => {
    // Safety Check
    if (!ODDS_API_KEY) {
        console.warn("⚠️ No API Key found in .env (VITE_ODDS_API_KEY). Returning empty odds.");
        return [];
    }

    try {
        console.log("🔄 Fetching live odds from API...");
        const url = `${ODDS_API.BASE_URL}?regions=${ODDS_API.REGION}&markets=${ODDS_API.MARKETS}&apiKey=${ODDS_API_KEY}&oddsFormat=american`;
        
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
        return [];
    }
};
// --- HELPER: Normalize API Format ---
const normalizeData = (rawData, isMock) => {
    if (isMock) return rawData;

    return rawData.map(game => {
        // 1. Get first available bookmaker
        const bookmaker = game.bookmakers.find(b => ODDS_API.BOOKMAKERS.includes(b.key)) || game.bookmakers[0];
        
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

        // 2. Clean Team Names - use normalizeTeam for consistency
        const cleanName = (fullName) => {
            // Try unified normalizeTeam first
            const normalized = normalizeTeam(fullName);
            if (normalized) return normalized;
            
            // Fallback to TEAM_MAPPING
            if (TEAM_MAPPING[fullName]) return TEAM_MAPPING[fullName];
            if (fullName.includes("49ers")) return "49ers";
            const parts = fullName.split(' ');
            return parts[parts.length - 1]; 
        };

        // Get abbreviation for matching with schedule.json (uses unified teams.js)
        const getAbbrev = (fullName) => {
            return getTeamAbbreviation(fullName) || cleanName(fullName);
        };

        return {
            id: game.id, // Keep the API ID
            home: cleanName(game.home_team),
            visitor: cleanName(game.away_team),
            home_abbrev: getAbbrev(game.home_team),
            visitor_abbrev: getAbbrev(game.away_team),
            home_full: game.home_team,
            visitor_full: game.away_team,
            
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