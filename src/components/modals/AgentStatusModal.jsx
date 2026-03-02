// src/components/modals/AgentStatusModal.jsx
// Shows pipeline status: podcast feeds → episodes → transcripts → picks
// Queries Supabase directly (anon key, read-only).

import React, { useState, useEffect, useCallback } from 'react';
import { X, RefreshCw, CheckCircle2, Clock, AlertCircle, Loader2, Bot, Mic, Zap, Target, Radio } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// ─── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  done:         { label: 'Done',         color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', IconComp: CheckCircle2 },
  pending:      { label: 'Pending',      color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/30',   IconComp: Clock },
  transcribing: { label: 'Transcribing', color: 'text-indigo-400',  bg: 'bg-indigo-500/10 border-indigo-500/30', IconComp: Loader2 },
  extracting:   { label: 'Extracting',   color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/30', IconComp: Loader2 },
  error:        { label: 'Error',        color: 'text-rose-400',    bg: 'bg-rose-500/10 border-rose-500/30',     IconComp: AlertCircle },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  const { label, color, bg, IconComp } = cfg;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${color} ${bg}`}>
      <IconComp size={10} className={status === 'transcribing' || status === 'extracting' ? 'animate-spin' : ''} />
      {label}
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, IconComp, color }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
        <IconComp size={12} className={color} />
        {label}
      </div>
      <div className={`text-2xl font-black ${color}`}>{value ?? '—'}</div>
      {sub && <div className="text-[10px] text-slate-500">{sub}</div>}
    </div>
  );
}

// ─── Episode row ─────────────────────────────────────────────────────────────

function EpisodeRow({ ep }) {
  const feedName = ep.podcast_feeds?.name ?? 'Unknown Feed';
  const date     = ep.pub_date ? new Date(ep.pub_date).toLocaleDateString() : '—';
  const picks    = ep.podcast_transcripts?.[0]?.picks?.length ?? null;
  const promoted = !!ep.podcast_transcripts?.[0]?.picks_promoted_at;

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-800/50 last:border-0">
      <div className="mt-0.5 flex-shrink-0">
        <StatusBadge status={ep.status} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-slate-200 truncate">{ep.title ?? '(untitled)'}</div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[10px] text-slate-500">{feedName}</span>
          <span className="text-[10px] text-slate-600">•</span>
          <span className="text-[10px] text-slate-500">{date}</span>
          {ep.duration_secs && (
            <>
              <span className="text-[10px] text-slate-600">•</span>
              <span className="text-[10px] text-slate-500">{Math.round(ep.duration_secs / 60)}m</span>
            </>
          )}
          {ep.status === 'error' && ep.error_msg && (
            <span className="text-[10px] text-rose-400 truncate max-w-[200px]" title={ep.error_msg}>{ep.error_msg.slice(0, 60)}</span>
          )}
        </div>
      </div>
      {ep.status === 'done' && (
        <div className="flex items-center gap-2 flex-shrink-0 text-right">
          {picks !== null && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${picks > 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-500 bg-slate-700/30'}`}>
              {picks} pick{picks !== 1 ? 's' : ''}
            </span>
          )}
          {picks > 0 && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${promoted ? 'text-[#00d2be] bg-[#00d2be]/10' : 'text-amber-400 bg-amber-500/10'}`}>
              {promoted ? '✓ promoted' : 'unpromoted'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

export default function AgentStatusModal({ isOpen, onClose }) {
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [feeds, setFeeds]       = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [stats, setStats]       = useState(null);

  const load = useCallback(async () => {
    if (!supabase) {
      setError('Supabase not configured');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [feedsRes, episodesRes, expertPicksRes] = await Promise.all([
        // Active feeds
        supabase.from('podcast_feeds').select('id, name, rss_url, active').eq('active', true),

        // Recent episodes (last 20), with transcript pick info
        supabase
          .from('podcast_episodes')
          .select(`
            id, title, status, pub_date, duration_secs, error_msg,
            podcast_feeds ( name ),
            podcast_transcripts ( picks, picks_promoted_at )
          `)
          .order('pub_date', { ascending: false })
          .limit(20),

        // Count of EXPERT picks
        supabase.from('user_picks').select('id', { count: 'exact', head: true }).eq('source', 'EXPERT'),
      ]);

      if (feedsRes.error)    throw feedsRes.error;
      if (episodesRes.error) throw episodesRes.error;

      setFeeds(feedsRes.data ?? []);
      setEpisodes(episodesRes.data ?? []);

      // Compute stats from episode list
      const eps = episodesRes.data ?? [];
      const statusCounts = eps.reduce((acc, e) => { acc[e.status] = (acc[e.status] || 0) + 1; return acc; }, {});
      const totalPicks   = eps.reduce((acc, e) => acc + (e.podcast_transcripts?.[0]?.picks?.length ?? 0), 0);

      setStats({
        totalFeeds:   feedsRes.data?.length ?? 0,
        done:         statusCounts.done    ?? 0,
        pending:      (statusCounts.pending ?? 0) + (statusCounts.error ?? 0),
        totalPicks,
        expertPicks:  expertPicksRes.count ?? 0,
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-[#00d2be]/15 border border-[#00d2be]/30 rounded-lg p-2">
              <Bot size={18} className="text-[#00d2be]" />
            </div>
            <div>
              <h2 className="text-white font-black text-base">Agent Status</h2>
              <p className="text-slate-500 text-[10px]">Podcast pipeline · Pick extraction · Last 20 episodes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-all">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="bg-rose-900/20 border border-rose-500/30 rounded-lg p-3 text-rose-400 text-xs">{error}</div>
          )}

          {/* Stat cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Active Feeds"  value={stats.totalFeeds}   sub="RSS sources"         IconComp={Radio}   color="text-[#00d2be]" />
              <StatCard label="Processed"     value={stats.done}         sub="episodes done"        IconComp={Mic}     color="text-emerald-400" />
              <StatCard label="Queued"        value={stats.pending}      sub="pending/error"        IconComp={Zap}     color="text-amber-400" />
              <StatCard label="Expert Picks"  value={stats.expertPicks}  sub="in Picks Tracker"     IconComp={Target}  color="text-purple-400" />
            </div>
          )}

          {/* Feeds list */}
          {feeds.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Active Feeds</h3>
              <div className="flex flex-wrap gap-2">
                {feeds.map(f => (
                  <div key={f.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/50 border border-slate-700/50 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span className="text-xs text-slate-300 font-medium">{f.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Episodes list */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Recent Episodes</h3>
            {loading && episodes.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-slate-500 gap-2">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : episodes.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">No episodes found</div>
            ) : (
              <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl px-4">
                {episodes.map(ep => <EpisodeRow key={ep.id} ep={ep} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
