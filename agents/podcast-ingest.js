// agents/podcast-ingest.js
// PodcastIngestAgent — polls configured RSS feeds, transcribes new episodes via
// OpenAI Whisper, extracts NFL picks + intel via GPT-4o, writes to Supabase.
//
// Runtime:    Node.js 20+ ESM (GitHub Actions)
// Schedule:   Every 6 hours (see .github/workflows/podcast-ingest.yml)
// Env vars:   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY
// Optional:   DRY_RUN=true   — discover episodes but skip transcription + writes
//             MAX_PER_RUN=2  — limit new episodes processed per run (default: 3)

import { createClient }    from '@supabase/supabase-js';
import { createWriteStream, readFileSync, unlinkSync, statSync } from 'node:fs';
import { pipeline }        from 'node:stream/promises';
import { tmpdir }          from 'node:os';
import { join }            from 'node:path';

// ─── Config ───────────────────────────────────────────────────────────────────

const MAX_RETRIES      = 3;
const MAX_RUNTIME_MS   = 10 * 60 * 1000;   // 10 minutes hard ceiling
const MAX_AUDIO_BYTES  = 24 * 1024 * 1024; // 24 MB (Whisper limit is 25 MB)
const MAX_PER_RUN      = parseInt(process.env.MAX_PER_RUN ?? '3', 10);
const DRY_RUN          = process.env.DRY_RUN === 'true';

const SUPABASE_URL     = process.env.SUPABASE_URL;
const SUPABASE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_KEY       = process.env.OPENAI_API_KEY;

// ─── Supabase client ──────────────────────────────────────────────────────────

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Missing Supabase env vars');
  return createClient(SUPABASE_URL, SUPABASE_KEY);
}

// ─── Lightweight RSS parser ───────────────────────────────────────────────────

/** Extract text content between the first occurrence of <tag...>...</tag> */
function tag(xml, tagName) {
  const open  = new RegExp(`<${tagName}(?:\\s[^>]*)?>`, 'i');
  const close = new RegExp(`<\\/${tagName}>`, 'i');
  const openM = xml.match(open);
  if (!openM) return null;
  const start = openM.index + openM[0].length;
  const closeM = xml.slice(start).match(close);
  if (!closeM) return null;
  return xml.slice(start, start + closeM.index).replace(/<!\[CDATA\[|\]\]>/g, '').trim();
}

/** Extract attribute value from a self-closing or open tag */
function attr(xml, tagName, attrName) {
  const tagRe = new RegExp(`<${tagName}[^>]+${attrName}\\s*=\\s*["']([^"']+)["']`, 'i');
  const m = xml.match(tagRe);
  return m ? m[1] : null;
}

/** Parse <itunes:duration> — handles HH:MM:SS and plain seconds */
function parseDuration(raw) {
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return parseInt(raw, 10);
  const parts = raw.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

/**
 * Parse an RSS feed XML string into an array of episode objects.
 * Only returns episodes published in the last 7 days to limit scope.
 */
function parseRssFeed(xml) {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;

  // Split on <item> boundaries
  const items = xml.split(/<item[\s>]/).slice(1);

  return items.flatMap(itemXml => {
    const pubDateStr = tag(itemXml, 'pubDate');
    const pubDate    = pubDateStr ? new Date(pubDateStr) : null;

    // Skip episodes older than 7 days
    if (pubDate && pubDate.getTime() < cutoff) return [];

    const guid     = tag(itemXml, 'guid') ?? attr(itemXml, 'guid', 'isPermaLink') ?? null;
    const title    = tag(itemXml, 'title');
    const audioUrl = attr(itemXml, 'enclosure', 'url');
    const duration = parseDuration(tag(itemXml, 'itunes:duration'));

    if (!guid || !audioUrl) return [];

    return [{
      guid,
      title:         title ?? '(untitled)',
      pub_date:      pubDate?.toISOString() ?? null,
      audio_url:     audioUrl,
      duration_secs: duration,
    }];
  });
}

// ─── RSS fetching ─────────────────────────────────────────────────────────────

async function fetchRss(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'NFL-Platinum-Rose-PodcastAgent/1.0' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`RSS fetch failed: HTTP ${res.status} for ${url}`);
  return res.text();
}

// ─── Audio download ───────────────────────────────────────────────────────────

/**
 * Downloads audio to a temp file. If Content-Length > MAX_AUDIO_BYTES,
 * uses a Range request to fetch only the first MAX_AUDIO_BYTES (partial MP3 —
 * Whisper handles truncated MP3 gracefully since frames are sequential).
 * Returns { filePath, isPartial, sizeBytes }.
 */
async function downloadAudio(url) {
  const tmpPath = join(tmpdir(), `pr-podcast-${Date.now()}.mp3`);

  // Check file size via HEAD request first
  let isPartial = false;
  let sizeBytes = null;
  try {
    const head = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(15_000),
    });
    const cl = head.headers.get('content-length');
    if (cl) sizeBytes = parseInt(cl, 10);
  } catch {
    // HEAD not supported by some CDNs — proceed with GET
  }

  const headers = { 'User-Agent': 'NFL-Platinum-Rose-PodcastAgent/1.0' };
  if (sizeBytes !== null && sizeBytes > MAX_AUDIO_BYTES) {
    headers['Range'] = `bytes=0-${MAX_AUDIO_BYTES - 1}`;
    isPartial = true;
    console.log(`  ↳ Large file (${(sizeBytes / 1024 / 1024).toFixed(1)} MB) — fetching first 24 MB`);
  }

  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok && res.status !== 206) {
    throw new Error(`Audio download failed: HTTP ${res.status}`);
  }

  await pipeline(res.body, createWriteStream(tmpPath));

  const actualSize = statSync(tmpPath).size;
  if (actualSize > MAX_AUDIO_BYTES) {
    // Shouldn't happen after Range request, but truncate just in case
    isPartial = true;
  }

  return { filePath: tmpPath, isPartial, sizeBytes: actualSize };
}

// ─── Whisper transcription ────────────────────────────────────────────────────

async function transcribeAudio(filePath) {
  const audioBuffer = readFileSync(filePath);
  const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });

  const form = new FormData();
  form.append('file', blob, 'episode.mp3');
  form.append('model', 'whisper-1');
  form.append('language', 'en');
  form.append('response_format', 'text');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_KEY}` },
    body: form,
    signal: AbortSignal.timeout(300_000), // 5 min for long audio
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Whisper error: ${err}`);
  }

  return res.text(); // whisper-1 + response_format=text returns plain string
}

// ─── Pick extraction via GPT-4o ───────────────────────────────────────────────

const EXTRACTION_SYSTEM = `You are an NFL betting analyst. 
Extract all betting picks and notable analysis from the transcript.
Return ONLY valid JSON — no prose, no markdown fences.`;

const EXTRACTION_USER = (transcript, source) => `
Source: ${source}
Transcript (may be partial):
---
${transcript.slice(0, 12000)}
---

Return JSON with this exact shape:
{
  "picks": [
    {
      "selection": "string (team name, OVER, or UNDER)",
      "team1": "string (home team or first team)",
      "team2": "string (away team or second team)",
      "type": "spread | moneyline | total",
      "line": number | null,
      "summary": "string (brief rationale, max 200 chars)",
      "units": number (1-5),
      "confidence": number (50-95),
      "game_date": "YYYY-MM-DD | null"
    }
  ],
  "intel": [
    "string (key insight, injury note, weather, sharp money report, etc.)"
  ]
}

Rules:
- Only include picks that are clearly stated as recommendations
- "selection" for spreads/ML = the team getting the pick
- "selection" for totals = "OVER" or "UNDER" (uppercase)
- "line" = the spread number (negative for favored) or the total number
- "units" = bet size 1-5 (use 1 if not mentioned)
- "confidence" = 50-95 (use 65 if not mentioned)
- "intel" = up to 10 key analytical points (not picks, just context)
- If no picks found, return { "picks": [], "intel": [] }
`.trim();

async function extractPicksAndIntel(transcript, sourceName) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: 0.1,
      max_tokens: 2048,
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM },
        { role: 'user',   content: EXTRACTION_USER(transcript, sourceName) },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GPT-4o error: ${err}`);
  }

  const data = await res.json();
  const raw  = data.choices?.[0]?.message?.content?.trim() ?? '{}';

  // Strip markdown code fences if GPT returned them anyway
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  try {
    const parsed = JSON.parse(clean);
    return {
      picks: Array.isArray(parsed.picks) ? parsed.picks : [],
      intel: Array.isArray(parsed.intel) ? parsed.intel : [],
    };
  } catch {
    throw new Error(`GPT-4o returned invalid JSON: ${clean.slice(0, 200)}`);
  }
}

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchWithRetry(fn, retries = MAX_RETRIES) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < retries - 1) {
        const delay = 2 ** i * 1000;
        console.warn(`  ↳ Retry ${i + 1}/${retries - 1} after ${delay}ms: ${err.message}`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastErr;
}

// ─── Main run ─────────────────────────────────────────────────────────────────

async function run() {
  const startedAt = Date.now();

  if (!OPENAI_KEY)  { console.error('❌ Missing OPENAI_API_KEY'); process.exit(1); }
  if (DRY_RUN) console.log('🔍 DRY RUN mode — no Supabase writes, no transcription');

  const supabase = getSupabase();

  // 1. Load active feeds from Supabase
  const { data: feeds, error: feedErr } = await supabase
    .from('podcast_feeds')
    .select('*')
    .eq('active', true);

  if (feedErr) { console.error('❌ Failed to load feeds:', feedErr.message); process.exit(1); }
  console.log(`📡 Loaded ${feeds.length} active feeds`);

  let totalDiscovered = 0;
  let totalProcessed  = 0;
  let totalErrors     = 0;

  for (const feed of feeds) {
    if (Date.now() - startedAt > MAX_RUNTIME_MS) {
      console.warn('⏱ Approaching max runtime — stopping early');
      break;
    }

    console.log(`\n📻 ${feed.name}`);

    // 2. Fetch + parse RSS
    let episodes;
    try {
      const xml = await fetchWithRetry(() => fetchRss(feed.rss_url));
      episodes  = parseRssFeed(xml);
      console.log(`  ↳ ${episodes.length} recent episodes in feed`);
    } catch (err) {
      console.error(`  ❌ RSS fetch failed: ${err.message}`);
      continue;
    }

    if (episodes.length === 0) continue;

    // 3. Filter out already-known guids
    const guids = episodes.map(e => e.guid);
    const { data: existing } = await supabase
      .from('podcast_episodes')
      .select('guid')
      .in('guid', guids);

    const knownGuids = new Set((existing ?? []).map(r => r.guid));
    const newEps     = episodes.filter(e => !knownGuids.has(e.guid));
    console.log(`  ↳ ${newEps.length} new (${knownGuids.size} already known)`);

    if (newEps.length === 0) continue;

    // 4. Insert new episodes as 'pending' in Supabase
    const insertRows = newEps.map(ep => ({
      feed_id:       feed.id,
      guid:          ep.guid,
      title:         ep.title,
      pub_date:      ep.pub_date,
      audio_url:     ep.audio_url,
      duration_secs: ep.duration_secs,
      status:        'pending',
    }));

    if (!DRY_RUN) {
      const { error: insertErr } = await supabase
        .from('podcast_episodes')
        .insert(insertRows);
      if (insertErr) {
        console.error(`  ❌ Insert episodes failed: ${insertErr.message}`);
        continue;
      }
    }

    totalDiscovered += newEps.length;

    // 5. Process each new episode (up to MAX_PER_RUN total across all feeds)
    for (const ep of newEps) {
      if (totalProcessed >= MAX_PER_RUN) {
        console.log(`  ⏭ Reached MAX_PER_RUN (${MAX_PER_RUN}) — remaining episodes queued`);
        break;
      }
      if (Date.now() - startedAt > MAX_RUNTIME_MS) break;

      console.log(`\n  🎙 "${ep.title.slice(0, 70)}"`);

      // Fetch the episode's DB id (just inserted)
      let episodeId = null;
      if (!DRY_RUN) {
        const { data: row } = await supabase
          .from('podcast_episodes')
          .select('id')
          .eq('guid', ep.guid)
          .single();
        episodeId = row?.id;
      }

      if (DRY_RUN) {
        console.log(`  ✅ [DRY RUN] Would transcribe + extract picks`);
        continue;
      }

      // Mark as 'transcribing'
      await supabase
        .from('podcast_episodes')
        .update({ status: 'transcribing' })
        .eq('id', episodeId);

      let tmpFile = null;
      try {
        // 5a. Download audio
        console.log(`    ⬇ Downloading audio...`);
        const { filePath, isPartial, sizeBytes } = await fetchWithRetry(
          () => downloadAudio(ep.audio_url)
        );
        tmpFile = filePath;

        console.log(`    📦 ${(sizeBytes / 1024 / 1024).toFixed(1)} MB${isPartial ? ' (partial)' : ''}`);

        // Update file_size + is_partial in DB
        await supabase
          .from('podcast_episodes')
          .update({ file_size_bytes: sizeBytes, is_partial: isPartial })
          .eq('id', episodeId);

        // 5b. Whisper transcription
        console.log(`    🎤 Transcribing via Whisper...`);
        const transcript = await fetchWithRetry(() => transcribeAudio(filePath));
        const wordCount  = transcript.split(/\s+/).length;
        console.log(`    ✍ ${wordCount.toLocaleString()} words transcribed`);

        // 5c. Mark as 'extracting'
        await supabase
          .from('podcast_episodes')
          .update({ status: 'extracting' })
          .eq('id', episodeId);

        // 5d. Pick + intel extraction via GPT-4o
        console.log(`    🤖 Extracting picks + intel...`);
        const { picks, intel } = await fetchWithRetry(
          () => extractPicksAndIntel(transcript, feed.expert)
        );
        console.log(`    ✅ ${picks.length} picks, ${intel.length} intel items`);

        // 5e. Write transcript to Supabase
        const whisperMinutes = ep.duration_secs ? Math.ceil(ep.duration_secs / 60) : null;
        const { error: txErr } = await supabase
          .from('podcast_transcripts')
          .insert({
            episode_id:      episodeId,
            transcript_text: transcript,
            picks:           picks,
            intel:           intel,
            whisper_minutes: whisperMinutes,
            model_used:      'whisper-1+gpt-4o',
          });

        if (txErr) throw new Error(`Transcript insert failed: ${txErr.message}`);

        // 5f. Mark episode as 'done'
        await supabase
          .from('podcast_episodes')
          .update({ status: 'done' })
          .eq('id', episodeId);

        totalProcessed++;

      } catch (err) {
        console.error(`    ❌ Processing failed: ${err.message}`);
        totalErrors++;

        if (episodeId) {
          await supabase
            .from('podcast_episodes')
            .update({ status: 'error', error_msg: err.message.slice(0, 500) })
            .eq('id', episodeId);
        }
      } finally {
        // Always clean up temp file
        if (tmpFile) {
          try { unlinkSync(tmpFile); } catch { /* ignore */ }
        }
      }
    }
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\n📊 Run complete in ${elapsed}s`);
  console.log(`   Discovered: ${totalDiscovered} new episodes`);
  console.log(`   Processed:  ${totalProcessed} transcribed + extracted`);
  console.log(`   Errors:     ${totalErrors}`);

  if (totalErrors > 0) process.exit(1);
}

run().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
