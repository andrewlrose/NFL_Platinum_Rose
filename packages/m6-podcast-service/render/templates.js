/**
 * HTML templating for podcast digest pages.
 *
 * Security rule: EVERY dynamic value must pass through esc().
 * These pages are served to the public via Phase 8. Stored XSS from a
 * podcast transcript into a partner's browser is the headline risk.
 */

/**
 * Escape a value for safe HTML insertion.
 * Covers & < > " ' — sufficient to prevent stored XSS in attribute and text contexts.
 *
 * @param {unknown} val
 * @returns {string}
 */
export function esc(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Shared <head> + opening <body> with inline dark-theme styles.
 * No external CSS — pages are self-contained static files.
 *
 * @param {{ title: string }} opts
 * @returns {string}
 */
export function pageHead({ title }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} | NFL Podcast Digest</title>
<style>
  *, *::before, *::after { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #0f0f0f; color: #e5e5e5; margin: 0; padding: 1.5rem 2rem; max-width: 900px; }
  h1 { color: #00d2be; margin: 0 0 0.25em; }
  h2 { color: #00d2be; margin: 1.25em 0 0.5em; font-size: 1.1em; text-transform: uppercase; letter-spacing: 0.05em; }
  h3 { color: #aaa; margin: 1em 0 0.3em; font-size: 0.95em; }
  a { color: #00d2be; text-decoration: none; }
  a:hover { text-decoration: underline; }
  p { margin: 0.3em 0; color: #bbb; font-size: 0.9em; }

  /* ── Category badges ── */
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.72em; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
  .spread     { background: #1e3a5f; color: #90c0ff; }
  .total      { background: #1e3f2a; color: #90ffb0; }
  .moneyline  { background: #3f1e1e; color: #ffb090; }
  .future     { background: #2e1e3f; color: #c090ff; }
  .prop       { background: #3f3e1e; color: #ffe090; }

  /* ── Pick card ── */
  .pick-card { border: 1px solid #2a2a2a; border-radius: 6px; padding: 0.75rem 1rem; margin: 0.5rem 0; background: #161616; }
  .pick-card .pick-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.3rem; }
  .pick-card .matchup { color: #888; font-size: 0.85em; }
  .pick-card .line { font-size: 1.05em; font-weight: 600; color: #e5e5e5; margin: 0.1em 0; }
  .pick-card .summary { color: #aaa; font-size: 0.88em; margin: 0.25em 0; }
  .pick-card .meta { font-size: 0.78em; color: #555; margin-top: 0.3em; }

  /* ── Intel list ── */
  .intel-list { list-style: none; padding: 0; margin: 0.5rem 0; }
  .intel-list li { padding: 0.2em 0; color: #bbb; font-size: 0.88em; }
  .intel-list li::before { content: "• "; color: #00d2be; }

  /* ── Partial banner ── */
  .partial-banner { background: #3a2800; border: 1px solid #8a6000; border-radius: 6px; padding: 0.6rem 1rem; margin: 0.75rem 0; color: #ffe090; font-size: 0.9em; }

  /* ── Weekly consensus table ── */
  .consensus-table { width: 100%; border-collapse: collapse; margin: 0.75rem 0; }
  .consensus-table th { text-align: left; padding: 0.4rem 0.75rem; border-bottom: 1px solid #2a2a2a; color: #00d2be; font-size: 0.8em; text-transform: uppercase; }
  .consensus-table td { padding: 0.4rem 0.75rem; border-bottom: 1px solid #1a1a1a; font-size: 0.88em; color: #ccc; }
  .consensus-table tr:last-child td { border-bottom: none; }

  /* ── Expert/episode index ── */
  .week-group { margin: 1rem 0 0.5rem; }
  .episode-link { display: block; padding: 0.3rem 0; color: #bbb; font-size: 0.88em; border-bottom: 1px solid #1a1a1a; }
  .episode-link:hover { color: #00d2be; }

  /* ── Metadata strip ── */
  .meta-strip { display: flex; gap: 1.5rem; flex-wrap: wrap; margin: 0.5rem 0 1rem; }
  .meta-strip span { color: #666; font-size: 0.82em; }
  .meta-strip strong { color: #999; font-weight: 500; }

  /* ── Page footer ── */
  .page-footer { margin-top: 2.5rem; padding-top: 0.75rem; border-top: 1px solid #222; color: #444; font-size: 0.78em; }
</style>
</head>
<body>`;
}

/**
 * Closing </body></html> + generated-at footer.
 *
 * @param {{ generatedAt: string }} opts
 * @returns {string}
 */
export function pageFooter({ generatedAt }) {
  return `<div class="page-footer">Generated ${esc(generatedAt)}</div>
</body>
</html>`;
}

/**
 * Wrap body content in a full HTML document.
 *
 * @param {string} title
 * @param {string} bodyContent  already-escaped HTML
 * @returns {string}
 */
export function layout(title, bodyContent) {
  const generatedAt = new Date().toISOString();
  return `${pageHead({ title })}
<h1>${esc(title)}</h1>
${bodyContent}
${pageFooter({ generatedAt })}`;
}

/**
 * Render a single pick as a card.
 * Every dynamic value is esc()'d.
 *
 * @param {object} pick
 * @returns {string}
 */
export function pickCard(pick) {
  const category = pick.category ?? 'spread';
  const catClass = esc(category);

  const selectionText = pick.selection
    ? esc(pick.selection)
    : pick.team1
      ? esc(pick.team1)
      : '';

  const lineText =
    pick.line != null
      ? ` ${pick.line > 0 ? '+' : ''}${esc(String(pick.line))}`
      : '';

  const oddsText =
    pick.odds_american != null
      ? ` (${pick.odds_american > 0 ? '+' : ''}${esc(String(pick.odds_american))})`
      : '';

  const matchupText =
    pick.team1 && pick.team2
      ? `<span class="matchup">${esc(pick.team1)} vs ${esc(pick.team2)}</span>`
      : '';

  const unitsText = pick.units != null ? `${esc(String(pick.units))}u` : '';
  const qsText =
    pick.quality_score != null
      ? `QS: ${esc(String(Math.round(pick.quality_score * 100)))}%`
      : '';

  const metaParts = [unitsText, qsText].filter(Boolean).join(' &nbsp;·&nbsp; ');

  return `<div class="pick-card">
  <div class="pick-header">
    <span class="badge ${catClass}">${catClass}</span>
    ${matchupText}
  </div>
  <div class="line">${selectionText}${lineText}${oddsText}</div>
  ${pick.summary ? `<div class="summary">${esc(pick.summary)}</div>` : ''}
  ${metaParts ? `<div class="meta">${metaParts}</div>` : ''}
</div>`;
}

/**
 * Render an intel bullet list. Returns '' for empty/null input.
 *
 * @param {string[]} items
 * @returns {string}
 */
export function intelList(items) {
  if (!items?.length) return '';
  const lis = items.map((item) => `  <li>${esc(item)}</li>`).join('\n');
  return `<ul class="intel-list">\n${lis}\n</ul>`;
}
