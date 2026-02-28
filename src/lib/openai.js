// src/lib/openai.js
// ═══════════════════════════════════════════════════════════════════════════════
// OpenAI API Integration — Extracted from App.jsx handleAIAnalyze
// ═══════════════════════════════════════════════════════════════════════════════

import { OPENAI_API } from './apiConfig.js';

/**
 * Extract NFL betting picks from a transcript using GPT-4o.
 *
 * @param {string} text - Raw transcript text (truncated to 15k chars internally)
 * @param {object} sourceData - { name: string, apiKey: string } — expert source info
 * @param {string[]} availableGames - Array of "VISITOR @ HOME" strings for context
 * @returns {Promise<object[]>} - Array of extracted pick objects
 * @throws {Error} - On API error or parse failure
 */
export async function extractPicksFromTranscript(text, sourceData, availableGames) {
  const prompt = `
Analyze this NFL betting transcript and extract picks.
Source: ${sourceData.name}

Available games THIS WEEK: ${availableGames.join(', ')}

For each pick, identify:
1. The TEAM (must be one of the available games)
2. The TYPE (Spread, Total, or Moneyline)
3. The LINE (the spread/total value, or "ML" for moneyline)
4. The analysis/rationale
5. Units (confidence level)

Return a valid JSON object with this exact format:
{
  "picks": [
    {
      "selection": "SEA",
      "team1": "Seattle",
      "team2": "New England",
      "type": "Spread",
      "line": "-4.5",
      "summary": "Key reasons for this pick",
      "analysis": "Detailed analysis",
      "units": 2
    }
  ]
}

Make sure "selection" is the team's abbreviation or clear identifier from the available games.

Transcript: ${text.substring(0, 15000)}
`;

  const response = await fetch(OPENAI_API.BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${sourceData.apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_API.MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a betting analyst JSON extractor. Return ONLY a valid JSON object with \'picks\' array. Ensure team names match the available games provided.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`OpenAI Error: ${data.error.message}`);
  }

  const content = JSON.parse(data.choices[0].message.content);
  let picks = content.picks || content;
  if (!Array.isArray(picks)) picks = [picks];

  return picks;
}
