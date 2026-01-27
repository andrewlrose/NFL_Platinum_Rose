// File: src/lib/dataSync.js

// ⚠️ REPLACE THIS with your actual username/repo
const REPO_OWNER = "andrewlrose"; 
const REPO_NAME = "platinum-rose-data";
const BRANCH = "main";

const BASE_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}`;

export const syncPlatinumData = async () => {
    try {
        console.log("📡 Connecting to Platinum Rose Data Repo...");

        // 1. Get Status
        const statusReq = await fetch(`${BASE_URL}/status.json?nocache=${Date.now()}`);
        if (!statusReq.ok) throw new Error("Could not fetch status.json");
        const status = await statusReq.json();
        const week = status.currentWeek;

        // 2. Fetch Data in Parallel (Updated for Automated Architecture)
        const [gamesReq, propsReq, ratingsReq, contestReq] = await Promise.all([
            fetch(`${BASE_URL}/weeks/week${week}/games.json?nocache=${Date.now()}`),
            fetch(`${BASE_URL}/weeks/week${week}/props.txt?nocache=${Date.now()}`),
            // 🔥 UPDATE: Now points to the auto-generated global ratings file
            fetch(`${BASE_URL}/global/team_ratings.csv?nocache=${Date.now()}`),
            fetch(`${BASE_URL}/weeks/week${week}/contest.json?nocache=${Date.now()}`)
        ]);

        if (!gamesReq.ok) throw new Error(`Missing games.json for Week ${week}`);

        // 3. Process Content
        const gamesData = await gamesReq.json();
        const propsText = propsReq.ok ? await propsReq.text() : "";
        const ratingsText = ratingsReq.ok ? await ratingsReq.text() : "";
        
        // Handle Contest Data safely
        let contestData = null;
        if (contestReq.ok) {
            try {
                contestData = await contestReq.json();
            } catch (e) {
                console.warn("Contest JSON invalid", e);
            }
        }

        return {
            success: true,
            week: week,
            games: gamesData,
            propsRaw: propsText,
            ratingsRaw: ratingsText,
            contest: contestData,
            message: status.message
        };

    } catch (err) {
        console.error("❌ Sync Failed:", err);
        return { success: false, error: err.message };
    }
};