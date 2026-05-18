// agents/x-sharp-ingest.js
// ═══════════════════════════════════════════════════════════════════════════════
// F-13: X/Twitter Sharp-Account Ingest Agent
//
// Fetches tweets from curated sharp NFL accounts via RSSHub (open-source X→RSS
// bridge). No X API key required. Deduplicates via SHA-256 of tweet URL.
// Writes to Supabase x_sharp_tweets table (migration 013).
//
// RSSHub URL pattern: {RSSHUB_BASE_URL}/twitter/user/{handle}
//
// Usage:
//   node agents/x-sharp-ingest.js
//   node agents/x-sharp-ingest.js --dry-run
//
// Env vars:
//   SUPABASE_URL              (required)
//   SUPABASE_SERVICE_ROLE_KEY (required)
//   RSSHUB_BASE_URL           default: https://rsshub.app
//   X_LOOKBACK_HOURS          default: 48
//   X_LIMIT_PER_ACCOUNT       default: 20
//   DRY_RUN                   default: false
// ═══════════════════════════════════════════════════════════════════════════════

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const ROOT         = path.resolve(__dirname, '..');
const RECEIPTS_DIR = path.join(ROOT, '.nfl', 'receipts');
const ACCOUNTS_CFG = path.join(ROOT, 'config', 'sharp-accounts.json');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RSSHUB_BASE  = (process.env.RSSHUB_BASE_URL || 'https://rsshub.app').replace(/\/$/, '');
const DRY_RUN      = process.argv.includes('--dry-run') || process.env.DRY_RUN === 'true';
const HOURS        = Number(process.env.X_LOOKBACK_HOURS || 48);
const LIMIT        = Number(process.env.X_LIMIT_PER_ACCOUNT || 20);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSupabase() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });
}

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function cleanHtml(input = '') {
  return String(input)
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstTag(xml, tagName) {
  const open  = new RegExp(`<${tagName}(?:\\s[^>]*)?>`, 'i');
  const close = new RegExp(`</${tagName}>`, 'i');
  const mOpen = xml.match(open);
  if (!mOpen) return null;

  const start  = mOpen.index + mOpen[0].length;
  const mClose = xml.slice(start).match(close);
  if (!mClose) return null;

  return cleanHtml(xml.slice(start, start + mClose.index));
}

/**
 * Extracts tweet URL from RSSHub item GUID or link.
 * RSSHub GUIDs for Twitter look like: https://x.com/{handle}/status/{id}
 * Falls back to <link> if GUID is absent or not a tweet URL.
 */
function extractTweetUrl(guid, link) {
  const candidates = [guid, link].filter(Boolean);
  for (const url of candidates) {
    if (/x\.com\/.+\/status\/\d+|twitter\.com\/.+\/status\/\d+/.test(url)) {
      return url.replace('twitter.com', 'x.com');
    }
  }

  // Return whatever link we have (RSSHub sometimes wraps the feed URL)
  return (link || guid || '').replace('twitter.com', 'x.com');
}

/**
 * Extract numeric tweet ID from a tweet URL.
 * https://x.com/handle/status/1234567890 → "1234567890"
 */
function extractTweetId(url) {
  const m = String(url).match(/\/status\/(\d+)/);
  return m ? m[1] : null;
}

function parseRssItems(xml) {
  return xml
    .split(/<item[\s>]/i)
    .slice(1)
    .map(chunk => {
      const rawTitle   = firstTag(chunk, 'title') || '';
      const link       = firstTag(chunk, 'link')  || '';
      const guid       = firstTag(chunk, 'guid')  || '';
      const desc       = firstTag(chunk, 'description') || '';
      const pubDateRaw = firstTag(chunk, 'pubDate');
      const publishedAt = pubDateRaw
        ? new Date(pubDateRaw).toISOString()
        : null;

      // RSSHub puts the full tweet text in description; title is a truncated
      // version. Prefer description if it is meaningfully longer.
      const tweetText = desc.length > rawTitle.length ? desc : rawTitle;
      const tweetUrl  = extractTweetUrl(guid, link);

      return {
        tweet_id:    extractTweetId(tweetUrl),
        tweet_url:   tweetUrl,
        text:        tweetText.slice(0, 560),
        published_at: publishedAt,
      };
    })
    .filter(item => !!item.tweet_url && !!item.text);
}

async function fetchAccountFeed(handle) {
  const url = `${RSSHUB_BASE}/twitter/user/${handle}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'NFL-Platinum-Rose-SharpIngest/1.0',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      return {
        handle,
        ok: false,
        status: res.status,
        error: `HTTP ${res.status} from RSSHub for @${handle}`,
        items: [],
      };
    }

    const xml   = await res.text();
    const items = parseRssItems(xml).slice(0, LIMIT);

    return { handle, ok: true, status: res.status, items };
  } catch (err) {
    return {
      handle,
      ok: false,
      status: null,
      error: err.message,
      items: [],
    };
  }
}

async function writeReceipt(data) {
  await mkdir(RECEIPTS_DIR, { recursive: true });
  const ts   = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -1);
  const file = path.join(RECEIPTS_DIR, `x-sharp-ingest-${ts}.json`);
  await writeFile(file, JSON.stringify(data, null, 2), 'utf8');
  return file;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const startedAt = new Date().toISOString();
  console.log(`[x-sharp-ingest] Starting — lookback ${HOURS}h, limit ${LIMIT}/account${DRY_RUN ? ' [DRY RUN]' : ''}`);

  // Load account config
  const cfgRaw  = await readFile(ACCOUNTS_CFG, 'utf8');
  const cfg     = JSON.parse(cfgRaw);
  const accounts = cfg.accounts.filter(a => a.active !== false);

  if (accounts.length === 0) {
    console.log('[x-sharp-ingest] No active accounts configured. Exiting.');
    return;
  }

  console.log(`[x-sharp-ingest] Accounts: ${accounts.map(a => '@' + a.handle).join(', ')}`);
  console.log(`[x-sharp-ingest] RSSHub base: ${RSSHUB_BASE}`);

  // Fetch RSS feeds per account (sequential to stay polite)
  const cutoff = new Date(Date.now() - HOURS * 60 * 60 * 1000);
  const feedResults = [];
  const candidates  = [];

  for (const account of accounts) {
    console.log(`  Fetching @${account.handle}…`);
    const result = await fetchAccountFeed(account.handle);
    feedResults.push({
      handle: account.handle,
      tier:   account.tier,
      ok:     result.ok,
      status: result.status,
      error:  result.error || null,
      fetched: result.items.length,
    });

    if (!result.ok || result.items.length === 0) {
      if (!result.ok) {
        console.warn(`  [warn] @${account.handle}: ${result.error}`);
      }
      continue;
    }

    // Apply lookback window filter
    const withinWindow = result.items.filter(item => {
      if (!item.published_at) return true; // include if no date
      return new Date(item.published_at) >= cutoff;
    });

    console.log(`  @${account.handle}: ${result.items.length} items fetched, ${withinWindow.length} within ${HOURS}h`);

    for (const item of withinWindow) {
      const urlHash = sha256(item.tweet_url);
      candidates.push({
        tweet_id:      item.tweet_id,
        author_handle: account.handle,
        author_tier:   account.tier,
        author_tags:   account.tags || [],
        text:          item.text,
        tweet_url:     item.tweet_url,
        url_hash:      urlHash,
        published_at:  item.published_at,
      });
    }

    // Polite delay between accounts
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`[x-sharp-ingest] Total candidates: ${candidates.length}`);

  if (candidates.length === 0 || DRY_RUN) {
    if (DRY_RUN) {
      console.log('[x-sharp-ingest] Dry run — skipping Supabase writes.');
      candidates.forEach(c => {
        console.log(`  @${c.author_handle}: ${c.text.slice(0, 80)}…`);
      });
    }

    const receiptPath = await writeReceipt({
      started_at:    startedAt,
      completed_at:  new Date().toISOString(),
      dry_run:       DRY_RUN,
      lookback_hours: HOURS,
      rsshub_base:   RSSHUB_BASE,
      accounts:      feedResults,
      totals: {
        candidates: candidates.length,
        inserted:   0,
        skipped:    0,
      },
    });
    console.log(`[x-sharp-ingest] Receipt: ${receiptPath}`);
    return;
  }

  // Write to Supabase — upsert on url_hash to skip duplicates
  const supabase = getSupabase();

  // Deduplicate candidates by url_hash (in case same tweet appears in multiple
  // account feeds, e.g., retweets — shouldn't happen but guard defensively)
  const seen    = new Set();
  const unique  = candidates.filter(c => {
    if (seen.has(c.url_hash)) return false;
    seen.add(c.url_hash);
    return true;
  });

  // Insert in chunks of 50 to avoid payload limits
  const CHUNK_SIZE  = 50;
  let inserted = 0;
  let skipped  = 0;

  for (let i = 0; i < unique.length; i += CHUNK_SIZE) {
    const chunk = unique.slice(i, i + CHUNK_SIZE);

    const { data, error } = await supabase
      .from('x_sharp_tweets')
      .upsert(chunk, {
        onConflict: 'url_hash',
        ignoreDuplicates: true,
      })
      .select('id');

    if (error) {
      console.error(`  [error] Supabase upsert failed: ${error.message}`);
      continue;
    }

    const chunkInserted = (data || []).length;
    const chunkSkipped  = chunk.length - chunkInserted;
    inserted += chunkInserted;
    skipped  += chunkSkipped;
    console.log(`  Chunk ${Math.floor(i / CHUNK_SIZE) + 1}: ${chunkInserted} inserted, ${chunkSkipped} skipped (existing)`);
  }

  const receiptPath = await writeReceipt({
    started_at:    startedAt,
    completed_at:  new Date().toISOString(),
    dry_run:       false,
    lookback_hours: HOURS,
    rsshub_base:   RSSHUB_BASE,
    accounts:      feedResults,
    totals: {
      candidates: candidates.length,
      unique:     unique.length,
      inserted,
      skipped,
    },
  });

  console.log(`[x-sharp-ingest] Inserted: ${inserted}, skipped: ${skipped}`);
  console.log(`[x-sharp-ingest] Receipt: ${receiptPath}`);
}

main().catch(err => {
  console.error(`XSharpIngestAgent failed: ${err.message}`);
  process.exit(1);
});
