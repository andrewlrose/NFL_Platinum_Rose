import React, { useState, useMemo } from 'react';
import { X, Upload, CheckCircle2, AlertTriangle, ArrowRight, Zap } from 'lucide-react';
import { parseGUnitSpreadsheet, calculateGUnitEdges } from '../../lib/gunitParser';
import { addPick } from '../../lib/picksDatabase';

/**
 * GUnitImportModal
 *
 * Flow:
 *  1. User pastes G-Unit spreadsheet text
 *  2. Parser extracts lines into structured edges
 *  3. Edges are matched against the current schedule to compute market delta
 *  4. User reviews matches and confirms import → picks saved to picksDatabase
 */
export default function GUnitImportModal({ isOpen, onClose, schedule = [] }) {
  const [rawText, setRawText] = useState('');
  const [step, setStep] = useState('paste'); // 'paste' | 'review' | 'done'
  const [parseResult, setParsed] = useState({ parsed: [], errors: [] });
  const [edges, setEdges] = useState([]);
  const [importedCount, setImportedCount] = useState(0);
  const [unmatchedCorrections, setUnmatchedCorrections] = useState({});

  if (!isOpen) return null;

  const handleParse = () => {
    const result = parseGUnitSpreadsheet(rawText);
    setParsed(result);

    // Calculate edges against schedule
    let calculated = calculateGUnitEdges(result.parsed, schedule);

    // Guarantee unmatched entries for normalization failures
    calculated = calculated.map(edge => {
      // If team or opponent is missing or normalization failed, mark as unmatched
      if (!edge.team || !edge.opponent || edge.team === '' || edge.opponent === '') {
        return { ...edge, matched: false };
      }
      return edge;
    });

    setEdges(calculated);
    setUnmatchedCorrections({});
    setStep('review');
  };

  const handleConfirm = () => {
    let saved = 0;
    edges.forEach(edge => {
      if (!edge.matched) return;

      const pick = addPick({
        source:     'GUNIT',
        gameId:     edge.gameId,
        pickType:   edge.pickType,
        selection:  edge.selection || edge.team,
        line:       edge.line,
        edge:       edge.edge || 0,
        confidence: 50, // G-Unit doesn't provide confidence — use baseline
        home:       edge.home,
        visitor:    edge.visitor,
        gameDate:   edge.gameDate || null,
        gameTime:   edge.gameTime || null,
        commenceTime: edge.commenceTime || null,
        isHomeTeam: edge.isHomeTeam ?? false,
      });
      if (pick) saved++;
    });

    setImportedCount(saved);
    setStep('done');
  };

  const handleReset = () => {
    setRawText('');
    setParsed({ parsed: [], errors: [] });
    setEdges([]);
    setStep('paste');
    setImportedCount(0);
  };

  const matchedEdges = edges.filter(e => e.matched);
  const unmatchedEdges = edges.filter(e => !e.matched);

  // Correction handler for unmatched lines
  const handleCorrection = (idx, team, opponent) => {
    // Update the correction map
    setUnmatchedCorrections(prev => ({ ...prev, [idx]: { team, opponent } }));
    // Re-run edge calculation with corrections
    const corrected = edges.map((e, i) => {
      if (!e.matched && prev[idx]) {
        // Use corrected team/opponent
        return { ...e, team: team || e.team, opponent: opponent || e.opponent };
      }
      return e;
    });
    // Recalculate edges
    const recalculated = calculateGUnitEdges(corrected, schedule);
    setEdges(recalculated);
  };

  // Dismiss handler for unmatched lines
  const handleDismiss = (idx) => {
    setEdges(edges.filter((_, i) => i !== idx));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-purple-600/20 p-2 rounded-lg">
              <Upload size={18} className="text-purple-400" />
            </div>
            <div>
              <h2 className="text-white font-bold">Import G-Unit Edges</h2>
              <p className="text-xs text-slate-500">Paste spreadsheet data → Preview → Confirm</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Step 1: Paste */}
          {step === 'paste' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-300 mb-2 block">
                  Paste G-Unit Spreadsheet Lines
                </label>
                <textarea
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder={`Duke -7.5 vs UNC\nOver 145.5 Duke/UNC\nKansas +3 @ Kentucky\nUnder 138 Kansas/Kentucky`}
                  rows={10}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white font-mono focus:outline-none focus:border-purple-500 resize-none placeholder:text-slate-700"
                />
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 text-xs text-slate-500 space-y-1">
                <div className="font-bold text-slate-400 mb-1">Supported formats:</div>
                <div>• Spread: <span className="text-slate-300">Duke -7.5 vs UNC</span></div>
                <div>• Spread: <span className="text-slate-300">Kansas +3 @ Kentucky</span></div>
                <div>• Total: <span className="text-slate-300">Over 145.5 Duke/UNC</span></div>
                <div>• Total: <span className="text-slate-300">Under 138 Kansas vs Kentucky</span></div>
                <div>• Short: <span className="text-slate-300">o145.5 Duke/UNC</span></div>
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {step === 'review' && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="flex gap-3">
                <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-emerald-400">{matchedEdges.length}</div>
                  <div className="text-xs text-emerald-300/70">Matched</div>
                </div>
                <div className="flex-1 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-amber-400">{unmatchedEdges.length}</div>
                  <div className="text-xs text-amber-300/70">No Match</div>
                </div>
                <div className="flex-1 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-rose-400">{parseResult.errors.length}</div>
                  <div className="text-xs text-rose-300/70">Parse Errors</div>
                </div>
              </div>

              {/* Matched edges */}
              {matchedEdges.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400" /> Ready to Import
                  </h3>
                  <div className="space-y-2">
                    {matchedEdges.map((e, i) => (
                      <div key={i} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-white">
                            {e.pickType === 'spread'
                              ? `${e.selection} ${e.line > 0 ? '+' : ''}${e.line}`
                              : `${e.selection} ${e.line}`
                            }
                          </div>
                          <div className="text-xs text-slate-500">{e.visitor} @ {e.home}</div>
                        </div>
                        <div className="text-right">
                          {e.edge > 0 && (
                            <div className={`text-xs font-bold ${e.edge >= 3 ? 'text-emerald-400' : e.edge >= 1.5 ? 'text-amber-400' : 'text-slate-400'}`}>
                              {e.edge}pt edge
                            </div>
                          )}
                          {e.marketLine != null && (
                            <div className="text-[10px] text-slate-600">market: {e.marketLine}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Unmatched */}
              {unmatchedEdges.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-2">
                    <AlertTriangle size={14} /> No Schedule Match
                  </h3>
                  <div className="space-y-1">
                    {unmatchedEdges.map((e, i) => {
                      // Find possible team matches from schedule
                      const scheduleTeams = schedule.map(g => g.home).concat(schedule.map(g => g.visitor));
                      const teamOptions = scheduleTeams.filter(t => t && t.toLowerCase().includes((e.team || '').toLowerCase()));
                      const opponentOptions = scheduleTeams.filter(t => t && t.toLowerCase().includes((e.opponent || '').toLowerCase()));
                      return (
                        <div key={i} className="bg-slate-800/30 rounded p-2 flex flex-col gap-2">
                          <div className="text-xs text-slate-500">
                            {e.rawLine || `${e.selection} ${e.line}`} — <span className="font-bold text-rose-400">{e.team}</span> vs <span className="font-bold text-rose-400">{e.opponent}</span>
                          </div>
                          <div className="flex gap-2 items-center">
                            <span className="text-xs text-slate-400">Correct team:</span>
                            <select
                              value={unmatchedCorrections[i]?.team || ''}
                              onChange={ev => handleCorrection(i, ev.target.value, unmatchedCorrections[i]?.opponent || e.opponent)}
                              className="bg-slate-900 border border-slate-700 text-xs text-white rounded px-2 py-1"
                            >
                              <option value="">--</option>
                              {teamOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            <span className="text-xs text-slate-400">Opponent:</span>
                            <select
                              value={unmatchedCorrections[i]?.opponent || ''}
                              onChange={ev => handleCorrection(i, unmatchedCorrections[i]?.team || e.team, ev.target.value)}
                              className="bg-slate-900 border border-slate-700 text-xs text-white rounded px-2 py-1"
                            >
                              <option value="">--</option>
                              {opponentOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            <button
                              onClick={() => handleDismiss(i)}
                              className="ml-2 text-xs text-rose-400 bg-slate-900 border border-rose-500/30 rounded px-2 py-1 hover:bg-rose-900/30"
                            >Dismiss</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Parse errors */}
              {parseResult.errors.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-rose-400 mb-2">Parse Errors</h3>
                  <div className="space-y-1">
                    {parseResult.errors.map((err, i) => (
                      <div key={i} className="text-xs text-slate-500 bg-rose-500/5 rounded p-2">{err}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Done */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="bg-emerald-500/20 p-4 rounded-full mb-4">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Import Complete</h3>
              <p className="text-sm text-slate-400">
                <span className="text-emerald-400 font-bold">{importedCount}</span> G-Unit pick{importedCount !== 1 ? 's' : ''} saved to tracker.
              </p>
              <p className="text-xs text-slate-500 mt-2">
                View them in the <strong>All Picks</strong> tab or grade them once games finish.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-5 border-t border-slate-800">
          {step === 'paste' && (
            <>
              <button onClick={onClose} className="text-sm text-slate-500 hover:text-white transition-colors">Cancel</button>
              <button
                onClick={handleParse}
                disabled={!rawText.trim()}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all"
              >
                Parse & Preview <ArrowRight size={14} />
              </button>
            </>
          )}
          {step === 'review' && (
            <>
              <button onClick={handleReset} className="text-sm text-slate-500 hover:text-white transition-colors">← Back</button>
              <button
                onClick={handleConfirm}
                disabled={matchedEdges.length === 0}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all"
              >
                <Zap size={14} /> Import {matchedEdges.length} Pick{matchedEdges.length !== 1 ? 's' : ''}
              </button>
            </>
          )}
          {step === 'done' && (
            <>
              <button onClick={handleReset} className="text-sm text-slate-500 hover:text-white transition-colors">Import More</button>
              <button
                onClick={onClose}
                className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2 rounded-lg font-bold text-sm transition-all"
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
