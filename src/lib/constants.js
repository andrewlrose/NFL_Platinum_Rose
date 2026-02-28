// --- CONFIGURATION ---
export const APP_VERSION = "v2.0 (GitHub Live)";

/**
 * Derive current NFL week from date.
 * 2025 season: Week 1 = Sep 4, 2025. Regular season = 18 weeks.
 * Returns { week: number, phase: string, label: string }
 */
export const getNFLWeekInfo = () => {
    const SEASON_START = new Date('2025-09-02T00:00:00'); // Tuesday before Week 1 kickoff
    const now = new Date();
    
    // Before season
    if (now < SEASON_START) {
        return { week: 0, phase: 'preseason', label: 'PRESEASON' };
    }

    const diffDays = Math.floor((now - SEASON_START) / (1000 * 60 * 60 * 24));
    const rawWeek = Math.floor(diffDays / 7) + 1;

    if (rawWeek <= 18) {
        return { week: rawWeek, phase: 'regular', label: `WEEK ${rawWeek}` };
    }

    // Playoff mapping (approximate — weeks 19-22 after season start)
    const playoffWeek = rawWeek - 18;
    if (playoffWeek === 1) return { week: 19, phase: 'playoffs', label: 'WILD CARD' };
    if (playoffWeek === 2) return { week: 20, phase: 'playoffs', label: 'DIVISIONAL' };
    if (playoffWeek === 3) return { week: 21, phase: 'playoffs', label: 'CONFERENCE' };
    if (playoffWeek === 4) return { week: 22, phase: 'playoffs', label: 'SUPER BOWL' };

    return { week: rawWeek, phase: 'offseason', label: 'OFFSEASON' };
};

export const CURRENT_WEEK = getNFLWeekInfo().week; 

// --- STORAGE KEYS ---
// We only need this one so your "My Card" saves to your browser
export const STORAGE_KEY_BETS = 'platinum_rose_bets_v17'; 

// --- EXPERTS ---
// Re-export from unified experts.js for backward compatibility
export { INITIAL_EXPERTS, EXPERTS, findExpert } from './experts.js';

// Note: WEEK_17_SCHEDULE removed — schedule is loaded dynamically from public/schedule.json
// Note: INITIAL_EXPERTS is now defined in experts.js and re-exported above