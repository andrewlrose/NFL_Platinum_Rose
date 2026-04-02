// src/lib/anthropicClient.js
// ═══════════════════════════════════════════════════════════════════════════════
// Anthropic Claude API Client — Browser-side, fetch-based.
// Handles the Anthropic Messages API including multi-turn tool use loops.
//
// Security note: Uses VITE_ANTHROPIC_API_KEY (same browser-key pattern as
// VITE_OPENAI_API_KEY already in use). Personal-app only; never commit real keys.
// ═══════════════════════════════════════════════════════════════════════════════

import { ANTHROPIC_API } from './apiConfig.js';

// ─── Core API Call ───────────────────────────────────────────────────────────

/**
 * POST a single request to the Anthropic Messages API.
 * @param {string} apiKey
 * @param {{ model, system, messages, tools, maxTokens }} config
 * @returns {Promise<object>} - Raw Anthropic API response
 * @throws {Error} - On HTTP error or API-level error
 */
async function callAnthropic(apiKey, { model, system, messages, tools, maxTokens }) {
  const body = {
    model: model || ANTHROPIC_API.MODEL_DEFAULT,
    max_tokens: maxTokens || 4096,
    messages,
  };
  if (system) body.system = system;
  if (tools && tools.length > 0) body.tools = tools;

  const response = await fetch(ANTHROPIC_API.BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_API.VERSION,
      // Required for direct browser access per Anthropic's CORS policy
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    const msg = errBody?.error?.message || `Anthropic API error: ${response.status}`;
    throw new Error(msg);
  }

  return response.json();
}

// ─── Agent Turn (Tool Loop) ──────────────────────────────────────────────────

/**
 * Run a full agent turn, including multi-step tool use loop.
 *
 * Algorithm:
 *   1. POST messages to API
 *   2. If response contains tool_use blocks → execute tools via executeToolFn
 *   3. Append tool_result messages and loop
 *   4. Break when stop_reason === 'end_turn' or message has no tool_use blocks
 *
 * @param {object} params
 * @param {string}   params.apiKey         - Anthropic API key
 * @param {string}   params.systemPrompt   - Full system prompt (with context injected)
 * @param {object[]} params.messages        - Existing conversation (Anthropic format)
 * @param {object[]} params.tools           - Anthropic-format tool definitions
 * @param {string}   [params.model]         - Model override
 * @param {Function} params.executeToolFn   - (name, input) → Promise<any>
 * @param {Function} [params.onStep]        - Called with each step event:
 *   { type: 'assistant', message }
 *   { type: 'tool_start', id, name, input }
 *   { type: 'tool_result', id, name, result }
 *   { type: 'error', error }
 * @returns {Promise<object[]>} - Updated messages array including all new turns
 */
export async function runAgentTurn({ apiKey, systemPrompt, messages, tools, model, executeToolFn, onStep }) {
  const allMessages = [...messages];
  let iterations = 0;
  const MAX_ITERATIONS = 10; // safety guard against infinite tool loops

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    let response;
    try {
      response = await callAnthropic(apiKey, {
        model,
        system: systemPrompt,
        messages: allMessages,
        tools,
      });
    } catch (err) {
      if (onStep) onStep({ type: 'error', error: err });
      throw err;
    }

    // Add assistant message to history
    const assistantMsg = { role: 'assistant', content: response.content };
    allMessages.push(assistantMsg);
    if (onStep) onStep({ type: 'assistant', message: assistantMsg });

    // Check if we're done (no tool calls)
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
    if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') break;

    // Execute each tool and collect results
    const toolResultContents = [];
    for (const block of toolUseBlocks) {
      if (onStep) onStep({ type: 'tool_start', id: block.id, name: block.name, input: block.input });

      let result;
      try {
        result = await executeToolFn(block.name, block.input);
      } catch (e) {
        result = { error: `Tool execution failed: ${e.message}` };
      }

      if (onStep) onStep({ type: 'tool_result', id: block.id, name: block.name, result });

      toolResultContents.push({
        type: 'tool_result',
        tool_use_id: block.id,
        content: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
      });
    }

    // Add tool results as the next user message (Anthropic format)
    allMessages.push({ role: 'user', content: toolResultContents });
  }

  return allMessages;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Extract the final text response from a messages array.
 * Finds the last assistant message and returns its text content blocks joined.
 */
export function extractFinalText(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === 'assistant') {
      const textBlocks = (Array.isArray(msg.content) ? msg.content : [])
        .filter(b => b.type === 'text');
      if (textBlocks.length > 0) return textBlocks.map(b => b.text).join('\n');
    }
  }
  return '';
}

/**
 * Extract all tool call events from a messages array (for display).
 * Returns [{ id, name, input, result }] in order of occurrence.
 */
export function extractToolCalls(messages) {
  const calls = [];
  const resultMap = {};

  for (const msg of messages) {
    if (msg.role === 'user' && Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === 'tool_result') {
          resultMap[block.tool_use_id] = block.content;
        }
      }
    }
    if (msg.role === 'assistant' && Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === 'tool_use') {
          calls.push({ id: block.id, name: block.name, input: block.input });
        }
      }
    }
  }

  return calls.map(c => ({ ...c, result: resultMap[c.id] ?? null }));
}
