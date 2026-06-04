// Entry point for `node src/server.js` and the systemd unit.
import { buildServer } from './app.js';
import { config } from './config.js';
import { buildRenderer } from '../render/index.js';

// Phase 7a: build an incremental re-render hook when Supabase creds are
// available. Skip when creds are absent (dev / Windows) so the service boots
// for /health without credentials.
let onRunComplete;
if (config.supabaseUrl && config.supabaseServiceRoleKey) {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supa = createClient(config.supabaseUrl, config.supabaseServiceRoleKey);
    const renderer = buildRenderer({