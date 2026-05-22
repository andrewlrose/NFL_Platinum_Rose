/**
 * simulationWorker.js — Web Worker for DevLab Monte Carlo.
 *
 * Runs the simulation loop off the main thread to keep the UI
 * responsive during a full-slate run (16 games × 10 000 iterations).
 *
 * Protocol
 * --------
 * Receive:  { games, ratings, useTempo }
 * Post back: { results }   — keyed by game.id, same shape as before
 */

import { runGameSim } from '../lib/devLabSim.js';

self.onmessage = function ({ data: { games, ratings, useTempo } }) {
    const results = {};

    games.forEach(game => {
        results[game.id] = runGameSim(game, ratings, useTempo);
    });

    self.postMessage({ results });
};
