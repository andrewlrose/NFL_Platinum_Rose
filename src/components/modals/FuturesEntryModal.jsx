// src/components/modals/FuturesEntryModal.jsx
// Modal to add a new futures position to the portfolio
import React, { useState, useCallback } from 'react';
import { X, Briefcase, DollarSign, AlertCircle, ChevronDown } from 'lucide-react';
import { addPosition, FUTURES_TYPES, FUTURES_TYPE_LABELS, impliedProbability, calcPayout, calcProfit } from '../../lib/futures';

const BOOKS = ['DraftKings', 'FanDuel', 'BetMGM', 'Caesars', 'BetOnline', 'Bookmaker', 'PointsBet', 'Unibet', 'Bovada', 'Other'];

// Selection options per type
const SELECTION_OPTIONS = {
  [FUTURES_TYPES.PLAYOFFS]:   ['Yes', 'No'],
  [FUTURES_TYPES.WINS]:       ['Over', 'Under'],
  [FUTURES_TYPES.DIVISION]:   null, // team name IS selection
  [FUTURES_TYPES.CONFERENCE]: null,
  [FUTURES_TYPES.SUPERBOWL]:  null,
  [FUTURES_TYPES.SB_MATCHUP]: null, // custom entry
};

const INITIAL_FORM = {
  type: FUTURES_TYPES.SUPERBOWL,
  team: '',
  team2: '',
  selection: '',
  line: '',
  odds: '',
  stake: '',
  book: 'DraftKings',
  notes: '',
};

export default function FuturesEntryModal({ isOpen, onClose, onAdded }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState('');

  const set = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  }, []);

  const needsSelection = SELECTION_OPTIONS[form.type] !== null && SELECTION_OPTIONS[form.type] !== undefined;
  const needsLine      = form.type === FUTURES_TYPES.WINS;
  const needsTeam2     = form.type === FUTURES_TYPES.SB_MATCHUP;

  // Live preview
  const oddsNum = Number(form.odds) || 0;
  const stakeNum = Number(form.stake) || 0;
  const preview = {
    impliedProb: oddsNum !== 0 ? (impliedProbability(oddsNum) * 100).toFixed(1) : '—',
    profit: oddsNum !== 0 && stakeNum > 0 ? calcProfit(stakeNum, oddsNum) : 0,
    payout: oddsNum !== 0 && stakeNum > 0 ? calcPayout(stakeNum, oddsNum) : 0,
  };

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!form.team.trim()) return setError('Team is required');
    if (!form.odds || Number(form.odds) === 0) return setError('Odds are required');
    if (!form.stake || Number(form.stake) <= 0) return setError('Stake must be greater than 0');
    if (needsSelection && !form.selection) return setError('Selection is required');
    if (needsLine && !form.line) return setError('Line is required');
    if (needsTeam2 && !form.team2.trim()) return setError('Second team is required for SB Matchup');

    // Determine selection string
    let selection = form.selection;
    if (!needsSelection) {
      selection = form.team; // for winner markets, the team IS the selection
    }
    if (needsLine) {
      selection = `${form.selection} ${form.line}`;
    }

    addPosition({
      type: form.type,
      team: form.team.trim(),
      team2: needsTeam2 ? form.team2.trim() : null,
      selection,
      line: needsLine ? Number(form.line) : null,
      odds: Number(form.odds),
      stake: Number(form.stake),
      book: form.book,
      notes: form.notes.trim(),
    });

    setForm(INITIAL_FORM);
    onAdded?.();
    onClose();
  }, [form, needsSelection, needsLine, needsTeam2, onAdded, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-gradient-to-r from-purple-900/30 to-indigo-900/30">
          <div className="flex items-center gap-2">
            <Briefcase size={18} className="text-purple-400" />
            <h2 className="text-white font-black text-base">Add Futures Position</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 block">Bet Type</label>
            <div className="grid grid-cols-3 gap-1.5">
              {Object.entries(FUTURES_TYPE_LABELS).map(([val, label]) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => { set('type', val); set('selection', ''); }}
                  className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border transition-all text-center
                    ${form.type === val
                      ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                      : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:border-slate-500'
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Team */}
          <div className="grid grid-cols-2 gap-3">
            <div className={needsTeam2 ? '' : 'col-span-2'}>
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 block">Team</label>
              <input
                type="text"
                value={form.team}
                onChange={e => set('team', e.target.value)}
                placeholder="e.g. Kansas City Chiefs"
                className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500 transition placeholder-slate-600"
              />
            </div>
            {needsTeam2 && (
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 block">vs Team</label>
                <input
                  type="text"
                  value={form.team2}
                  onChange={e => set('team2', e.target.value)}
                  placeholder="e.g. Philadelphia Eagles"
                  className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500 transition placeholder-slate-600"
                />
              </div>
            )}
          </div>

          {/* Selection (only for playoffs / wins) */}
          {needsSelection && (
            <div className={needsLine ? 'grid grid-cols-2 gap-3' : ''}>
              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 block">Selection</label>
                <div className="flex gap-1.5">
                  {SELECTION_OPTIONS[form.type]?.map(opt => (
                    <button
                      type="button"
                      key={opt}
                      onClick={() => set('selection', opt)}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-bold border transition-all
                        ${form.selection === opt
                          ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                          : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:border-slate-500'
                        }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              {needsLine && (
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 block">Line</label>
                  <input
                    type="number"
                    step="0.5"
                    value={form.line}
                    onChange={e => set('line', e.target.value)}
                    placeholder="10.5"
                    className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500 transition placeholder-slate-600"
                  />
                </div>
              )}
            </div>
          )}

          {/* Odds + Stake + Book */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 block">Odds (American)</label>
              <input
                type="number"
                value={form.odds}
                onChange={e => set('odds', e.target.value)}
                placeholder="+1400"
                className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500 transition placeholder-slate-600 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 block">Stake ($)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.stake}
                onChange={e => set('stake', e.target.value)}
                placeholder="100"
                className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500 transition placeholder-slate-600 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 block">Sportsbook</label>
              <select
                value={form.book}
                onChange={e => set('book', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500 transition"
              >
                {BOOKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          {/* Live preview */}
          {stakeNum > 0 && oddsNum !== 0 && (
            <div className="grid grid-cols-3 gap-3 bg-slate-800/40 border border-slate-700/50 rounded-lg p-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Implied Prob</span>
                <div className="text-purple-300 font-mono text-sm font-bold">{preview.impliedProb}%</div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">To Win</span>
                <div className="text-emerald-400 font-mono text-sm font-bold">${fmt(preview.profit, 2)}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Payout</span>
                <div className="text-white font-mono text-sm font-bold">${fmt(preview.payout, 2)}</div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1 block">Notes (optional)</label>
            <input
              type="text"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Reasoning, context…"
              className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-purple-500 transition placeholder-slate-600"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
              <AlertCircle size={13} /> {error}
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition">Cancel</button>
            <button type="submit" className="px-5 py-2 text-sm rounded-lg bg-purple-600 text-white font-bold hover:bg-purple-500 transition shadow-lg shadow-purple-900/30">
              <DollarSign size={13} className="inline mr-1 -mt-0.5" />
              Add Position
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function fmt(n, decimals = 0) {
  return n?.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) ?? '—';
}
