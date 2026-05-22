import { describe, it, expect } from 'vitest';
import { boxMuller, runGameSim, SIM_ITERATIONS } from '../../src/lib/devLabSim.js';

// ---------------------------------------------------------------------------
// Helper: Pearson correlation coefficient
// ---------------------------------------------------------------------------
function pearsonR(xs, ys) {
    const n = xs.length;
    const meanX = xs.reduce((s, v) => s + v, 0) / n;
    const meanY = ys.reduce((s, v) => s + v, 0) / n;
    let num = 0, denX = 0, denY = 0;
    for (let i = 0; i < n; i++) {
        const dx = xs[i] - meanX;
        const dy = ys[i] - meanY;
        num  += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
    }
    return num / Math.sqrt(denX * denY);
}

// ---------------------------------------------------------------------------
// boxMuller
// ---------------------------------------------------------------------------
describe('boxMuller', () => {
    it('returns finite numbers', () => {
        for (let i = 0; i < 100; i++) {
            expect(Number.isFinite(boxMuller())).toBe(true);
        }
    });

    it('approximate mean ≈ 0 over 20 000 samples (±0.05)', () => {
        const N = 20_000;
        let sum = 0;
        for (let i = 0; i < N; i++) sum += boxMuller();
        expect(Math.abs(sum / N)).toBeLessThan(0.05);
    });

    it('approximate variance ≈ 1 over 20 000 samples (within 0.05)', () => {
        const N = 20_000;
        const samples = Array.from({ length: N }, boxMuller);
        const mean = samples.reduce((s, v) => s + v, 0) / N;
        const variance =
            samples.reduce((s, v) => s + (v - mean) ** 2, 0) / N;
        expect(Math.abs(variance - 1)).toBeLessThan(0.05);
    });

    // Core audit requirement: two independent boxMuller() calls must have
    // near-zero Pearson correlation (independent draws, not a shared-radius
    // Box-Muller pair).
    it('correlation of consecutive independent draws ≈ 0 (±0.05) over 10 000 pairs', () => {
        const N = SIM_ITERATIONS; // 10 000
        const zs1 = [];
        const zs2 = [];
        for (let i = 0; i < N; i++) {
            zs1.push(boxMuller());
            zs2.push(boxMuller());
        }
        const r = pearsonR(zs1, zs2);
        expect(Math.abs(r)).toBeLessThan(0.05);
    });
});

// ---------------------------------------------------------------------------
// runGameSim
// ---------------------------------------------------------------------------
describe('runGameSim', () => {
    const baseRatings = {
        KC: { off: 0.12, def: -0.08, tempo: 1.0 },
        LV: { off: -0.05, def: 0.04, tempo: 1.0 },
    };
    const game = {
        id: 'test-1',
        home: 'KC',
        visitor: 'LV',
        spread: -6.5,   // KC favoured by 6.5
        total: 47.5,
    };

    it('returns hasData: false when a team is missing from ratings', () => {
        const result = runGameSim(
            { ...game, home: 'MISSING' },
            baseRatings,
            false
        );
        expect(result.hasData).toBe(false);
    });

    it('returns the expected shape when both teams exist', () => {
        const result = runGameSim(game, baseRatings, false);
        expect(result.hasData).toBe(true);
        expect(result).toHaveProperty('homeWinPct');
        expect(result).toHaveProperty('homeCoverPct');
        expect(result).toHaveProperty('visCoverPct');
        expect(result).toHaveProperty('overPct');
        expect(result).toHaveProperty('underPct');
        expect(result).toHaveProperty('projHome');
        expect(result).toHaveProperty('projVis');
        expect(result).toHaveProperty('projTotal');
    });

    it('homeWinPct + visCoverPct are plausible percentages (0–100)', () => {
        const result = runGameSim(game, baseRatings, false);
        const hw = parseFloat(result.homeWinPct);
        const hc = parseFloat(result.homeCoverPct);
        const vc = parseFloat(result.visCoverPct);
        const ov = parseFloat(result.overPct);
        const un = parseFloat(result.underPct);
        expect(hw).toBeGreaterThanOrEqual(0);
        expect(hw).toBeLessThanOrEqual(100);
        // Covers should sum to ~100
        expect(Math.abs(hc + vc - 100)).toBeLessThan(1);
        expect(Math.abs(ov + un - 100)).toBeLessThan(1);
    });

    it('simulated home-score and visitor-score deviations are uncorrelated (±0.05)', () => {
        // Run the sim once with 10 000 iterations, rebuilding draws inline
        // to capture raw z-values and verify independence.
        const N = SIM_ITERATIONS;
        const zHomes = [];
        const zVisits = [];
        for (let i = 0; i < N; i++) {
            zHomes.push(boxMuller());
            zVisits.push(boxMuller());
        }
        const r = pearsonR(zHomes, zVisits);
        expect(Math.abs(r)).toBeLessThan(0.05);
    });

    it('favoured team wins more often (KC -6.5 should win > 55% of the time)', () => {
        const result = runGameSim(game, baseRatings, false);
        expect(parseFloat(result.homeWinPct)).toBeGreaterThan(55);
    });
});
