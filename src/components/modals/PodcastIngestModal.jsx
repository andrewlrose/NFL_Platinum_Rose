// src/components/modals/PodcastIngestModal.jsx
// Podcast Intel modal — browse episodes processed by PodcastIngestAgent,
// review extracted picks + intel, and import to Picks Tracker in one click.

import React, { useState, useEffect, useCallback } from 'react';
import {
  Mic, X, RefreshCw, ChevronDown, ChevronRight, CheckCircle2,
  Radio, AlertTriangle, Download, Zap, BookOpen, Clock
} from 'lucide-react';
import { getPodcastEpisodes } from '../../lib/supabase';
import { addExpertPick } from '../../lib/picksDatabase';

// ─── helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch { return iso; }
};

const fmtDuration = (secs) => {
  if (!secs) return null;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const typeChip = (type) => {
  const map = {
    spread:    'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    moneyline: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    total:     'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };
  return map[type] || 'bg-slate-700/40 text-slate-400 border-slate-600/30';
};

const sourceColor = (expert) => {
  const map = {
    'Sharp or Square':      'text-cyan-400',
    'Even Money':           'text-emerald-400',
    'Action Network':       'text-orange-400',
    'Warren Sharp':         'text-purple-400',
  };
  return map[expert] || 'text-slate-300';
};

// ─── EpisodeCard ──────────────────────────────────────────────────────────────

function EpisodeCard({ episode, onImport }) {
  const [expanded, setExpanded]     = useState(false);
  const [imported, setImported]     = useState(false);
  const [importing, setImporting]   = useState(false);

  const picks = episode.podcast_transcripts?.picks ?? [];
  const intel = episode.podcast_transcripts?.intel ?? [];
  const expert = episode.podcast_feeds?.expert ?? 'Podcast';

  const handleImport = async () => {
    if (importing || imported || picks.length === 0) return;
    setImporting(true);
    try {
      let count = 0;
      for (const pick of picks) {
        addExpertPick({
          expertName:  expert,
          selection:   pick.selection,
          team1:       pick.team1 ?? pick.selection,
          team2:       pick.team2 ?? '',
          type:        pick.type,
          line:        pick.line ?? null,
          confidence:  pick.confidence ?? 65,
          rationale:   pick.summary ?? '',
          units:       pick.units ?? 1,
          gameDate:    pick.game_date ?? null,
        });
        count++;
      }
      setImported(true);
      onImport?.(count);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-all hover:border-slate-700">
      {/* Episode header row */}
      <button
        className="w-full text-left p-4 flex items-start gap-3"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="mt-0.5 text-slate-500">
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-bold ${sourceColor(episode.podcast_feeds?.expert)}`}>
              {episode.podcast_feeds?.name ?? 'Podcast'}
            </span>
            {episode.is_partial && (
              <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded">
                PARTIAL AUDIO
              </span>
            )}
          </div>
          <div className="text-sm font-bold text-white truncate pr-4">
            {episode.title}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
            <span>{fmtDate(episode.pub_date)}</span>
            {fmtDuration(episode.duration_secs) && (
              <span className="flex items-center gap-1">
                <Clock size={10} /> {fmtDuration(episode.duration_secs)}
              </span>
            )}
            <span className="text-emerald-400 font-medium">{picks.length} pick{picks.length !== 1 ? 's' : ''}</span>
            {intel.length > 0 && (
              <span className="text-slate-400">{intel.length} intel notes</span>
            )}
          </div>
        </div>

        {/* Import button — always visible on right */}
        {picks.length > 0 && (
          <button
            onClick={e => { e.stopPropagation(); handleImport(); }}
            disabled={importing || imported}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
              imported
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 cursor-default'
                : 'bg-[#00d2be]/10 text-[#00d2be] border-[#00d2be]/30 hover:bg-[#00d2be]/20'
            } disabled:opacity-60`}
          >
            {imported
              ? <><CheckCircle2 size={12} /> Imported</>
              : importing
              ? <><RefreshCw size={12} className="animate-spin" /> Importing…</>
              : <><Download size={12} /> Import {picks.length}</>
            }
          </button>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-slate-800 p-4 space-y-4">
          {/* Picks */}
          {picks.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Zap size={11} className="text-emerald-400" /> Picks
              </h4>
              <div className="space-y-2">
                {picks.map((pick, i) => (
                  <div key={i} className="bg-slate-800/50 rounded-lg p-3 flex items-start gap-3">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${typeChip(pick.type)}`}>
                      {(pick.type ?? 'pick').toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white">
                        {pick.type === 'total'
                          ? `${pick.selection} ${pick.line}`
                          : `${pick.selection} ${pick.line != null ? (pick.line > 0 ? '+' : '') + pick.line : ''}`
                        }
                      </div>
                      {pick.summary && (
                        <div className="text-xs text-slate-400 mt-0.5">{pick.summary}</div>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                        {pick.team1 && pick.team2 && (
                          <span>{pick.team2} @ {pick.team1}</span>
                        )}
                        {pick.game_date && <span>{fmtDate(pick.game_date)}</span>}
                        {pick.confidence && <span>{pick.confidence}% conf</span>}
                        {pick.units && <span>{pick.units}u</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Intel */}
          {intel.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BookOpen size={11} className="text-[#00d2be]" /> Intel Notes
              </h4>
              <div className="space-y-1.5">
                {intel.map((note, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="text-[#00d2be] mt-0.5 shrink-0">•</span>
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {picks.length === 0 && intel.length === 0 && (
            <p className="text-xs text-slate-600 italic">No picks or intel extracted from this episode.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function PodcastIngestModal({ isOpen, onClose, onPicksImported }) {
  const [episodes, setEpisodes]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [importMsg, setImportMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPodcastEpisodes(30);
      setEpisodes(data ?? []);
    } catch (e) {
      setError(e.message ?? 'Failed to load podcast episodes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      load();
      setImportMsg('');
    }
  }, [isOpen, load]);

  const handleImport = (count) => {
    setImportMsg(`✓ ${count} pick${count !== 1 ? 's' : ''} added to Picks Tracker`);
    onPicksImported?.();
  };

  if (!isOpen) return null;

  // Group by expert/feed
  const grouped = episodes.reduce((acc, ep) => {
    const key = ep.podcast_feeds?.name ?? 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(ep);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#00d2be]/10 rounded-lg">
              <Mic size={20} className="text-[#00d2be]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Podcast Intel</h2>
              <p className="text-xs text-slate-400">Auto-ingested picks + analysis from expert podcasts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all"
              title="Refresh"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-all"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Import success bar */}
        {importMsg && (
          <div className="mx-5 mt-4 px-4 py-2.5 bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 text-sm rounded-lg flex items-center gap-2 shrink-0">
            <CheckCircle2 size={14} /> {importMsg}
          </div>
        )}

        {/* Feeds legend */}
        <div className="px-5 pt-4 pb-2 flex gap-3 flex-wrap shrink-0">
          {[
            { name: 'Sharp or Square',      color: 'text-cyan-400' },
            { name: 'Even Money',           color: 'text-emerald-400' },
            { name: 'Action Network',       color: 'text-orange-400' },
            { name: 'Warren Sharp',         color: 'text-purple-400' },
          ].map(f => (
            <span key={f.name} className={`text-xs font-medium ${f.color} flex items-center gap-1`}>
              <Radio size={10} /> {f.name}
            </span>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 min-h-0">
          {loading && (
            <div className="flex items-center justify-center py-20 text-slate-500 gap-3">
              <RefreshCw size={18} className="animate-spin" />
              <span className="text-sm">Loading podcast episodes…</span>
            </div>
          )}

          {!loading && error && (
            <div className="flex items-center gap-3 py-6 text-rose-400 text-sm">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          {!loading && !error && episodes.length === 0 && (
            <div className="text-center py-20">
              <Mic size={48} className="mx-auto mb-4 text-slate-700" />
              <p className="text-slate-500 font-bold">No Episodes Yet</p>
              <p className="text-slate-600 text-sm mt-2 max-w-xs mx-auto">
                The podcast agent runs every 6 hours on GitHub Actions.
                Check back after the next scheduled run.
              </p>
              <div className="mt-4 text-xs text-slate-600 space-y-1">
                <p>Monitoring: Sharp or Square • Even Money</p>
                <p>Action Network • Warren Sharp</p>
              </div>
            </div>
          )}

          {!loading && !error && Object.entries(grouped).map(([feedName, eps]) => (
            <div key={feedName}>
              <h3 className={`text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2 ${sourceColor(eps[0]?.podcast_feeds?.expert)}`}>
                <Radio size={11} /> {feedName}
                <span className="text-slate-600 normal-case font-normal tracking-normal">
                  {eps.length} episode{eps.length !== 1 ? 's' : ''}
                </span>
              </h3>
              <div className="space-y-3">
                {eps.map(ep => (
                  <EpisodeCard key={ep.id} episode={ep} onImport={handleImport} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 px-5 py-3 shrink-0 flex items-center justify-between">
          <p className="text-xs text-slate-600">
            Agent runs every 6 hours • Whisper + GPT-4o extraction
          </p>
          <button
            onClick={onClose}
            className="text-sm text-slate-400 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
