import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_FILE = path.join(__dirname, '../public/schedule.json');

const ESPN_API = "http://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

async function fetchSchedule() {
    console.log("🏈 Connecting to ESPN Data Network...");

    try {
        const response = await fetch(ESPN_API);
        const data = await response.json();

        const games = data.events.map(event => {
            const competition = event.competitions[0];
            const competitors = competition.competitors;
            const odds = competition.odds ? competition.odds[0] : null;

            // Get Home/Away Teams
            const homeComp = competitors.find(t => t.homeAway === 'home');
            const awayComp = competitors.find(t => t.homeAway === 'away');

            // 1. USE ABBREVIATIONS FOR LOGOS (e.g. "WAS" instead of "Commanders")
            const home = homeComp.team.abbreviation; 
            const visitor = awayComp.team.abbreviation;

            // 2. Format Time
            const dateObj = new Date(competition.date);
            const timeString = dateObj.toLocaleTimeString('en-US', { 
                weekday: 'short', 
                hour: 'numeric', 
                minute: '2-digit',
                timeZone: 'America/New_York'
            }).replace(':00 ', ' ');

            // 3. EXTRACT ODDS (Restores Dev Lab)
            // ESPN details usually look like "DAL -5.5" or "Over 48.5"
            let spread = 0;
            let total = 0;

            if (odds && odds.details) {
                // Parse Spread (e.g. "DAL -5.5")
                const parts = odds.details.split(' ');
                if (parts.length === 2) {
                    spread = parseFloat(parts[1]);
                    // If the favorite is the visitor, flip the spread for the home perspective if needed
                    // But usually, standard format is enough. We'll store raw number.
                }
            }
            if (odds && odds.overUnder) {
                total = odds.overUnder;
            }

            return {
                id: event.id,
                visitor: visitor,   // e.g. "DAL"
                home: home,         // e.g. "WAS"
                visitorName: awayComp.team.displayName, // e.g. "Cowboys"
                homeName: homeComp.team.displayName,    // e.g. "Commanders"
                time: timeString,
                spread: spread || 0,
                total: total || 0
            };
        });

        games.sort((a, b) => new Date(a.time) - new Date(b.time));

        console.log(`✅ Extracted ${games.length} games with Logos & Odds.`);
        
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(games, null, 4));
        console.log(`💾 Schedule saved to: ${OUTPUT_FILE}`);

    } catch (error) {
        console.error("❌ Error fetching schedule:", error);
    }
}

fetchSchedule();