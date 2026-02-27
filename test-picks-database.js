/**
 * Picks Database Integrity Validation Test
 * 
 * Tests:
 * 1. Pick schema validation
 * 2. Pending status correctness
 * 3. Grading logic accuracy
 * 4. Standings calculation verification
 * 5. Storage key migration
 * 
 * Run in browser console (requires localStorage access)
 * Or adapt for Node.js with mock localStorage
 */

// Expected pick schema
const PICK_SCHEMA = {
  id: 'string',
  gameId: 'string',
  source: ['AI_LAB', 'GUNIT'],
  pickType: ['spread', 'total'],
  selection: 'string',
  line: 'number',
  edge: 'number',
  confidence: 'number',
  home: 'string',
  visitor: 'string',
  gameDate: 'string',
  gameTime: 'string',
  isHomeTeam: 'boolean',
  createdAt: 'string',
  result: ['WIN', 'LOSS', 'PUSH', 'PENDING'],
  homeScore: ['number', 'null'],
  visitorScore: ['number', 'null'],
  gradedAt: ['string', 'null']
};

// Mock sample picks for testing
const SAMPLE_PICKS = [
  {
    id: 'AI_LAB-game1-spread-123456',
    gameId: 'game1',
    source: 'AI_LAB',
    pickType: 'spread',
    selection: 'KC',
    line: -7.5,
    edge: 2.3,
    confidence: 57,
    home: 'KC',
    visitor: 'SEA',
    gameDate: '2026-02-06',
    gameTime: '19:00',
    isHomeTeam: true,
    createdAt: '2026-02-05T10:00:00Z',
    result: 'PENDING',
    homeScore: null,
    visitorScore: null,
    gradedAt: null
  },
  {
    id: 'GUNIT-game2-total-123457',
    gameId: 'game2',
    source: 'GUNIT',
    pickType: 'total',
    selection: 'OVER',
    line: 145.5,
    edge: 3.2,
    confidence: 65,
    home: 'Kansas',
    visitor: 'Kentucky',
    gameDate: '2026-02-05',
    gameTime: '21:00',
    isHomeTeam: false,
    createdAt: '2026-02-05T11:00:00Z',
    result: 'PENDING',
    homeScore: null,
    visitorScore: null,
    gradedAt: null
  },
  // Graded pick
  {
    id: 'AI_LAB-game3-spread-123458',
    gameId: 'game3',
    source: 'AI_LAB',
    pickType: 'spread',
    selection: 'Gonzaga',
    line: -12.5,
    edge: 1.8,
    confidence: 54,
    home: 'Gonzaga',
    visitor: "Saint Mary's",
    gameDate: '2026-02-04',
    gameTime: '22:00',
    isHomeTeam: true,
    createdAt: '2026-02-04T15:00:00Z',
    result: 'WIN',
    homeScore: 88,
    visitorScore: 72,
    gradedAt: '2026-02-05T01:00:00Z'
  }
];

// Grading logic
function gradeSpreadPick(pick, homeScore, visitorScore) {
  const actualSpread = homeScore - visitorScore;
  const isHomeTeamPick = pick.isHomeTeam;
  const line = pick.line;
  
  if (isHomeTeamPick) {
    // Picked home team with line (e.g., KC -7.5)
    const coverMargin = actualSpread - Math.abs(line);
    if (coverMargin > 0) return 'WIN';
    if (coverMargin < 0) return 'LOSS';
    return 'PUSH';
  } else {
    // Picked away team with line (e.g., SEA +7.5)
    const coverMargin = actualSpread + Math.abs(line);
    if (coverMargin < 0) return 'WIN';
    if (coverMargin > 0) return 'LOSS';
    return 'PUSH';
  }
}

function gradeTotalPick(pick, homeScore, visitorScore) {
  const actualTotal = homeScore + visitorScore;
  const line = pick.line;
  const isOver = pick.selection === 'OVER';
  
  if (isOver) {
    if (actualTotal > line) return 'WIN';
    if (actualTotal < line) return 'LOSS';
    return 'PUSH';
  } else {
    if (actualTotal < line) return 'WIN';
    if (actualTotal > line) return 'LOSS';
    return 'PUSH';
  }
}

function validatePickSchema(pick) {
  const errors = [];
  
  Object.keys(PICK_SCHEMA).forEach(key => {
    if (!(key in pick)) {
      errors.push(`Missing field: ${key}`);
      return;
    }
    
    const expectedType = PICK_SCHEMA[key];
    const actualValue = pick[key];
    
    if (Array.isArray(expectedType)) {
      // Enum validation
      if (!expectedType.includes(actualValue) && actualValue !== null) {
        errors.push(`${key}: Invalid value "${actualValue}". Expected one of: ${expectedType.join(', ')}`);
      }
    } else if (expectedType === 'number' && actualValue !== null) {
      if (typeof actualValue !== 'number') {
        errors.push(`${key}: Expected number, got ${typeof actualValue}`);
      }
    } else if (expectedType === 'string' && actualValue !== null) {
      if (typeof actualValue !== 'string') {
        errors.push(`${key}: Expected string, got ${typeof actualValue}`);
      }
    } else if (expectedType === 'boolean') {
      if (typeof actualValue !== 'boolean') {
        errors.push(`${key}: Expected boolean, got ${typeof actualValue}`);
      }
    }
  });
  
  return errors;
}

function calculateStandings(picks) {
  const standings = {
    AI_LAB: { wins: 0, losses: 0, pushes: 0, pending: 0, units: 0 },
    GUNIT: { wins: 0, losses: 0, pushes: 0, pending: 0, units: 0 }
  };
  
  picks.forEach(pick => {
    const source = pick.source;
    if (!standings[source]) return;
    
    if (pick.result === 'WIN') {
      standings[source].wins++;
      standings[source].units += 1; // Assuming 1 unit per pick
    } else if (pick.result === 'LOSS') {
      standings[source].losses++;
      standings[source].units -= 1.1; // -1.1 for juice
    } else if (pick.result === 'PUSH') {
      standings[source].pushes++;
    } else if (pick.result === 'PENDING') {
      standings[source].pending++;
    }
  });
  
  // Calculate win rate
  Object.keys(standings).forEach(source => {
    const s = standings[source];
    const total = s.wins + s.losses;
    s.winRate = total > 0 ? (s.wins / total * 100).toFixed(1) : 0;
    s.roi = total > 0 ? (s.units / total * 100).toFixed(1) : 0;
  });
  
  return standings;
}

function checkStorageMigration() {
  const issues = [];
  const oldKey = 'nfl_picks_database';
  const newKey = 'nfl_picks_tracker_v1';
  
  if (typeof localStorage === 'undefined') {
    return ['⚠️ localStorage not available (not in browser context)'];
  }
  
  const oldData = localStorage.getItem(oldKey);
  const newData = localStorage.getItem(newKey);
  
  if (oldData && !newData) {
    issues.push(`⚠️ Old key "${oldKey}" has data but new key "${newKey}" is empty. Migration may be needed.`);
  }
  
  if (oldData && newData) {
    const oldPicks = JSON.parse(oldData);
    const newPicks = JSON.parse(newData);
    if (oldPicks.length > newPicks.length) {
      issues.push(`⚠️ Old key has ${oldPicks.length} picks but new key only has ${newPicks.length}. Some picks may be missing.`);
    }
  }
  
  if (!oldData && !newData) {
    issues.push('ℹ️ No picks data found in localStorage (both keys empty)');
  }
  
  return issues.length > 0 ? issues : ['✓ Storage migration check passed'];
}

// Main validation function
function runValidation() {
  console.log('🧪 PICKS DATABASE VALIDATION TEST\n');
  console.log('═'.repeat(60));
  
  // Test 1: Schema validation
  console.log('\n📋 TEST 1: Pick Schema Validation\n');
  SAMPLE_PICKS.forEach((pick, i) => {
    const errors = validatePickSchema(pick);
    if (errors.length > 0) {
      console.log(`  ❌ Pick ${i + 1} (${pick.id}):`);
      errors.forEach(err => console.log(`     - ${err}`));
    } else {
      console.log(`  ✓ Pick ${i + 1} schema valid (${pick.source}, ${pick.pickType})`);
    }
  });
  
  // Test 2: Confidence value check
  console.log('\n📋 TEST 2: Confidence Value Format Check\n');
  SAMPLE_PICKS.forEach((pick, i) => {
    const conf = pick.confidence;
    if (conf > 0 && conf < 1) {
      console.log(`  ⚠️ Pick ${i + 1}: Confidence is decimal (${conf}), should be percentage (${conf * 100})`);
    } else if (conf >= 50 && conf <= 100) {
      console.log(`  ✓ Pick ${i + 1}: Confidence ${conf}% is valid`);
    } else {
      console.log(`  ❌ Pick ${i + 1}: Confidence ${conf} is out of valid range`);
    }
  });
  
  // Test 3: Grading logic
  console.log('\n📋 TEST 3: Grading Logic Validation\n');
  const gradingTests = [
    { pick: { ...SAMPLE_PICKS[0], isHomeTeam: true, line: -7.5 }, homeScore: 85, visitorScore: 75, expected: 'WIN' },
    { pick: { ...SAMPLE_PICKS[0], isHomeTeam: true, line: -7.5 }, homeScore: 80, visitorScore: 75, expected: 'LOSS' },
    { pick: { ...SAMPLE_PICKS[1], selection: 'OVER', line: 145.5 }, homeScore: 80, visitorScore: 70, expected: 'WIN' },
    { pick: { ...SAMPLE_PICKS[1], selection: 'UNDER', line: 145.5 }, homeScore: 70, visitorScore: 70, expected: 'WIN' }
  ];
  
  gradingTests.forEach((test, i) => {
    let result;
    if (test.pick.pickType === 'spread') {
      result = gradeSpreadPick(test.pick, test.homeScore, test.visitorScore);
    } else {
      result = gradeTotalPick(test.pick, test.homeScore, test.visitorScore);
    }
    const match = result === test.expected;
    console.log(`  ${match ? '✓' : '❌'} Test ${i + 1}: ${test.pick.pickType} → ${result} (Expected: ${test.expected})`);
    if (!match) {
      console.log(`     Pick: ${JSON.stringify(test.pick, null, 2)}`);
      console.log(`     Scores: H:${test.homeScore}, V:${test.visitorScore}`);
    }
  });
  
  // Test 4: Standings calculation
  console.log('\n📋 TEST 4: Standings Calculation\n');
  const standings = calculateStandings(SAMPLE_PICKS);
  Object.keys(standings).forEach(source => {
    const s = standings[source];
    console.log(`  ${source}:`);
    console.log(`    Record: ${s.wins}-${s.losses}-${s.pushes} (${s.pending} pending)`);
    console.log(`    Win Rate: ${s.winRate}%`);
    console.log(`    Units: ${s.units > 0 ? '+' : ''}${s.units.toFixed(2)}`);
    console.log(`    ROI: ${s.roi > 0 ? '+' : ''}${s.roi}%`);
  });
  
  // Test 5: Storage migration check
  console.log('\n📋 TEST 5: Storage Migration Check\n');
  const migrationIssues = checkStorageMigration();
  migrationIssues.forEach(issue => console.log(`  ${issue}`));
  
  // Test 6: Pending picks validation
  console.log('\n📋 TEST 6: Pending Picks Status\n');
  const pendingPicks = SAMPLE_PICKS.filter(p => p.result === 'PENDING');
  console.log(`  Found ${pendingPicks.length} pending picks`);
  pendingPicks.forEach(pick => {
    const isValid = pick.homeScore === null && pick.visitorScore === null && pick.gradedAt === null;
    console.log(`  ${isValid ? '✓' : '❌'} ${pick.id}: ${pick.selection} (${pick.source})`);
    if (!isValid) {
      console.log(`     Issue: Pending pick has non-null score or gradedAt`);
    }
  });
  
  console.log('\n' + '═'.repeat(60));
  console.log('✅ VALIDATION COMPLETE\n');
  
  // Return summary
  return {
    totalPicks: SAMPLE_PICKS.length,
    standings,
    migrationIssues
  };
}

// Export for browser console
if (typeof window !== 'undefined') {
  window.testPicksDatabase = runValidation;
  window.validatePick = validatePickSchema;
  window.gradeSpreadPick = gradeSpreadPick;
  window.gradeTotalPick = gradeTotalPick;
  window.calculateStandings = calculateStandings;
  console.log('💡 Run: testPicksDatabase()');
}

// Run if in Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runValidation, validatePickSchema, gradeSpreadPick, gradeTotalPick, calculateStandings };
  if (require.main === module) {
    runValidation();
  }
}
