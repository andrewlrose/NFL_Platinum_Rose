/**
 * devLabSim.js — DevLab Monte Carlo simulation logic.
 *
 * Pure functions with no UI or worker dependencies so they can be
 * imported by both the Web Worker and Vitest unit tests.
 */

export const SIM_ITERATIONS = 10_000;
const STD_DEV = 13.5;
const MULTIPLIER = 35;

/**
 * Box-Muller transform — returns one independent standard-normal sample.
 * Each call draws its own pair of uniforms so consecutive calls are
 * statistically independent (unlike a shared-radius pair).
 */
export function boxMuller() {
    let u, v;
    do { u = Math.random(); } while (u === 0);
    do { v = Math.random(); } while (v === 0);
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/**
 * Simulate a single game via Monte Carlo.
 *
 * @param {Object} game       - { id, home, visitor, spread, total }
 * @param {Object} ratings    - { [teamKey]: { off, def, tempo } }
 * @param {boolean} useTempo  - whether to scale std-dev by pace
 * @param {number}  iterations
 * @returns {Object} result record ready for DevLab state
 */
export function runGameSim(
    game,
    ratings,
    useTempo,
    iterations = SIM_ITERATIONS
) {
    const hR = ratings[game.home];
    const vR = ratings[game.visitor];

    if (!hR || !vR) {
        return { hasData: false };
    }

    const hTempo = useTempo ? (hR.tempo || 1.0) : 1.0;
    const vTempo = useTempo ? (vR.tempo || 1.0) : 1.0;

    const baseHome = (hR.off * MULTIPLIER) + (vR.def * MULTIPLIER);
    const baseVis  = (vR.off * MULTIPLIER) + (hR.def * MULTIPLIER);

    const homeProj = 21.5 + (baseHome * hTempo) + 1.5;
    const visProj  = 21.5 + (baseVis  * vTempo);

    const tempoStdScale = useTempo
        ? Math.sqrt((hTempo + vTempo) / 2)
        : 1.0;
    const adjStdDev = STD_DEV * tempoStdScale;

    let homeWins = 0, homeCovers = 0, overs = 0;

    for (let i = 0; i < iterations; i++) {
        const z1 = boxMuller(); // independent draw for home
        const z2 = boxMuller(); // independent draw for visitor
        const hScore = homeProj + (z1 * adjStdDev);
        const vScore = visProj  + (z2 * adjStdDev);

        if (hScore > vScore) homeWins++;
        if ((hScore - vScore) > (game.spread * -1)) homeCovers++;
        if ((hScore + vScore) > game.total) overs++;
    }

    return {
        homeWinPct:   ((homeWins   / iterations) * 100).toFixed(1),
        homeCoverPct: ((homeCovers / iterations) * 100).toFixed(1),
        visCoverPct:  (100 - (homeCovers / iterations) * 100).toFixed(1),
        overPct:      ((overs      / iterations) * 100).toFixed(1),
        underPct:     (100 - (overs / iterations) * 100).toFixed(1),
        projHome:     homeProj,
        projVis:      visProj,
        projTotal:    homeProj + visProj,
        hasData:      true,
    };
}
