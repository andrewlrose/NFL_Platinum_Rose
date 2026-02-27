#!/usr/bin/env node

/**
 * Verify The-Odds-API Key
 * Run from terminal: node verify-odds-api-key.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testAPI() {
  console.log('\n🧪 Testing The-Odds-API Key\n');
  
  // Always read from .env file directly (bypass environment cache)
  let apiKey = null;
  
  try {
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    
    // Find the LAST occurrence of VITE_ODDS_API_KEY (in case there are duplicates)
    const lines = envContent.split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (line.includes('VITE_ODDS_API_KEY') && !line.startsWith('#')) {
        const match = line.match(/VITE_ODDS_API_KEY=(.+)/);
        if (match) {
          apiKey = match[1].trim();
          break;
        }
      }
    }
  } catch (err) {
    console.error('❌ Could not read .env file:', err.message);
  }
  
  if (!apiKey) {
    console.error('❌ ERROR: VITE_ODDS_API_KEY not found in .env file');
    console.log('\nTo fix:');
    console.log('  1. Open .env file');
    console.log('  2. Make sure you have: VITE_ODDS_API_KEY=your_api_key_here');
    console.log('  3. Save and try again\n');
    process.exit(1);
  }
  
  console.log('✓ API Key found:', apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4));
  console.log('  Full key: ' + apiKey);
  console.log('📡 Attempting to connect to The-Odds-API...\n');
  
  try {
    const url = `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds?regions=us&markets=h2h,spreads,totals&bookmakers=draftkings,fanduel,betmgm&apiKey=${apiKey}&oddsFormat=american`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.status === 200) {
      console.log('✅ SUCCESS: API Key is valid!\n');
      console.log('📊 Sample Response:');
      if (data.data && data.data.length > 0) {
        const game = data.data[0];
        console.log(`  Game: ${game.away_team} @ ${game.home_team}`);
        console.log(`  Bookmakers: ${game.bookmakers?.length || 0} available`);
        console.log(`  Markets: ${game.bookmakers?.[0]?.markets?.map(m => m.key).join(', ')}`);
      }
      console.log('\n✅ API Connection Status: WORKING\n');
    } else if (response.status === 401) {
      console.error('❌ AUTHENTICATION FAILED (401)');
      console.error('   Your API key is INVALID or EXPIRED.');
      console.error('   The key you provided:', apiKey);
      console.error('\n   Options:');
      console.error('   1. Get a fresh API key at: https://the-odds-api.com');
      console.error('   2. Update .env with the new key');
      console.error('   3. Run this test again\n');
    } else if (response.status === 429) {
      console.error('❌ RATE LIMIT EXCEEDED (429)');
      console.error('   You\'ve exceeded your API quota.');
      console.error('   Check usage at: https://api.the-odds-api.com/dashboard\n');
    } else {
      console.error(`❌ ERROR (${response.status}):`, data?.message || 'Unknown error');
      console.log('Full response:', data);
    }
    
  } catch (error) {
    console.error('❌ Network Error:', error.message);
    console.log('\nMake sure you have internet connection and the API is accessible.');
  }
}

testAPI();
