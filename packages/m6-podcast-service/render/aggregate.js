/**
 * Pure data-shaping helpers for the digest renderer.
 * No I/O, no Supabase — importable offline and in tests.
 */

// ── Season calendar ────────────────────────────────────────────────────────
// Key: season year → Date of the first regular-season game (Week 1 opener).
// These are the actual first-game dates for each season.
const NFL_SEASON_STARTS = {
  2023: new Date('2023-09-07T00:00:00Z'),
  2024: new Date('2024-09-05T00:00:00Z'),
  2025: new Date('2025-09-04T00:00:00Z'),
  2026: new Date('2026-09-03T00:00:00Z'), // estimate
};

// Regular season is 18 weeks; playoffs run through roughly week 22.
const MAX_WEEK = 22;

/**
 * Derive { season, week } from an episode pub_date string (YYYY-MM-DD).
 * Prefers pick.season/week when available — this is only the fallback.
 *
 * @param {string} dateStr  YYYY-MM-DD
 * @returns {{ season: number, week: number }}
 */
export function seasonWeekFromDate(dateStr) {
  // Append T12:00:00 to avoid UTC midnight date-display trap.
  const date = new Date(dateStr + 'T12:00:00');
  const year = date.getFullYear();

  // Check current year first, then previous (covers Jan/Feb playoff episodes).
  for (const season of [year, year - 1]) {
    const start = NFL_SEASON_STARTS[season];
    if (!start) continue;
    const diffMs = date.getTime() - start.getTime();
    if (diffMs < 0) continue;
    const week = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
    if (week <= MAX_WEEK) {
      return { season, week };
    }
  }

  // Offseason or unmapped year — bucket to the most recent known season, week 0.
  const knownSeasons = Object.keys(NFL_SEASON_STARTS).map(Number);
  const fallback = Math.max(...knownSeasons.filter((s) => s <= year));
  return { season: isFinite(fallback) ? fallback : year, week: 0 };
}

/**
 * Build a week tag string like "2025-W5".
 * Priority: pick.season + pick.week → derive from episode.pub_date.
 *
 * @param {object} pick
 * @param {object} episode  needs .pub_date
 * @returns {string}
 */
export function weekTagFor(pick, episode) {
  if (pick?.season != null && pick?.week != null) {
    return `${pick.season}-W${pick.week}`;
  }
  const { season, week } = seasonWeekFromDate(episode.pub_date ?? '1970-01-01');
  return `${season}-W${week}`;
}

/**
 * Lowercase, spaces→hyphen, strip non-alnum-hyphen, trim leading/trailing
 * hyphens, cap at 64 chars. Must satisfy ^[a-z0-9-]{1,64}$ (Phase 8 contract).
 *
 * @param {string} name
 * @returns {string}
 */
export function slugify(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'unknown';
}

/**
 * Detect expert names that map to the same slug.
 * Returns an array of collision groups: [{ slug, experts: [name, name, ...] }].
 *
 * @param {Array<{podcast_feeds: {expert: string}}>} episodes
 * @returns {Array<{slug: string, experts: string[]}>}
 */
export function detectSlugCollisions(episodes) {
  /** @type {Map<string, Set<string>>} */
  const slugToExperts = new Map();
  for (const ep of episodes) {
    const expert = ep.podcast_feeds?.expert;
    if (!expert) continue;
    const slug = slugify(expert);
    if (!slugToExperts.has(slug)) slugToExperts.set(slug, new Set());
    slugToExperts.get(slug).add(expert);
  }
  const collisions = [];
  for (const [slug, experts] of slugToExperts) {
    if (experts.size > 1) {
      collisions.push({ slug, experts: [...experts] });
    }
  }
  return collisions;
}

/**
 * Group done episodes by expert slug.
 * Returns Map<slug, { expert, name, slug, episodes[] }>
 *
 * @param {object[]} episodes  already filtered to status='done'
 * @returns {Map<string, {expert: string, name: string, slug: string, episodes: object[]}>}
 */
export function groupByExpert(episodes) {
  /** @type {Map<string, {expert: string, name: string, slug: string, episodes: object[]}>} */
  const groups = new Map();
  for (const ep of episodes) {
    const feed = ep.podcast_feeds;
    if (!feed?.expert) continue;
    const slug = slugify(feed.expert);
    if (!groups.has(slug)) {
      groups.set(slug, { expert: feed.expert, name: feed.name ?? feed.expert, slug, episodes: [] });
    }
    groups.get(slug).episodes.push(ep);
  }
  return groups;
}

/**
 * Group all episodes' picks into a weekly consensus structure.
 *
 * Returns:
 *   Map<weekTag, Map<matchupKey, {
 *     team1: string, team2: string, matchupKey: string,
 *     picks: object[]
 *   }>>
 *
 * matchupKey = sorted([team1, team2]).join('_')
 * Only picks with needs_review !== true are included.
 *
 * @param {object[]} episodes
 * @returns {Map<string, Map<string, {team1:string, team2:string, matchupKey:string, picks:object[]}>>}
 */
export function weeklyConsensus(episodes) {
  /** @type {Map<string, Map<string, object>>} */
  const weeks = new Map();

  for (const ep of episodes) {
    const transcript = normalizeTranscript(ep);
    const picks = transcript.picks ?? [];

    for (const pick of picks) {
      if (pick.needs_review) continue;
      const weekTag = weekTagFor(pick, ep);

      if (!weeks.has(weekTag)) weeks.set(weekTag, new Map());
      const weekMap = weeks.get(weekTag);

      if (!pick.team1 || !pick.team2) continue;
      const matchupKey = [pick.team1, pick.team2].sort().join('_');

      if (!weekMap.has(matchupKey)) {
        weekMap.set(matchupKey, {
          team1: pick.team1,
          team2: pick.team2,
          matchupKey,
          picks: [],
        });
      }
      weekMap.get(matchupKey).picks.push({ ...pick, _expertSlug: slugify(ep.podcast_feeds?.expert ?? '') });
    }
  }

  return weeks;
}

/**
 * Normalise the podcast_transcripts field: Supabase may return an object
 * (one-to-one join) or an array (one-to-many join). Always return an object.
 *
 * @param {object} episode
 * @returns {{ picks: object[], intel: string[] }}
 */
export function normalizeTranscript(episode) {
  const t = episode.podcast_transcripts;
  if (Array.isArray(t)) return t[0] ?? { picks: [], intel: [] };
  return t ?? { picks: [], intel: [] };
}
