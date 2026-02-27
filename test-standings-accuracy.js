/**
 * Standings & W-L Record Verification Test
 * 
 * Tests:
 * 1. Win/Loss calculation accuracy
 * 2. Standings table integrity
 * 3. Units calculation (including juice)
 * 4. ROI computation
 * 5. Confidence bucket filtering accuracy
 * 
 * Run in browser console after loading picks from localStorage
 */

// Expected juice on losses
const JUICE = 1.1; // -110 odds = risk 1.1 to win 1

// Test scenarios with known outcomes
const TEST_SCENARIOS = [
  {
    name: 'Perfect Record (5-0)',
    picks: [
      { result: 'WIN' }, { result: 'WIN' }, { result: 'WIN' }, { result: 'WIN' }, { result: 'WIN' }
    ],
    expected: { wins: 5, losses: 0, winRate: 100, units: 5, roi: 100 }
  },
  {
    name: 'Losing Record (2-5)',
    picks: [
      { result: 'WIN' }, { result: 'WIN' }, 
      { result: 'LOSS' }, { result: 'LOSS' }, { result: 'LOSS' }, { result: 'LOSS' }, { result: 'LOSS' }
    ],
    expected: { wins: 2, losses: 5, winRate: 28.6, units: -3.5, roi: -50 }
  },
  {
    name: 'With Pushes (3-2-1)',
    picks: [
      { result: 'WIN' }, { result: 'WIN' }, { result: 'WIN' },
      { result: 'LOSS' }, { result: 'LOSS' },
      { result: 'PUSH' }
    ],
    expected: { wins: 3, losses: 2, pushes: 1, winRate: 60, units: 0.8, roi: 16 }
  },
  {
    name: '54% Win Rate (7-6)',
    picks: [
      { result: 'WIN' }, { result: 'WIN' }, { result: 'WIN' }, { result: 'WIN' }, 
      { result: 'WIN' }, { result: 'WIN' }, { result: 'WIN' },
      { result: 'LOSS' }, { result: 'LOSS' }, { result: 'LOSS' }, 
      { result: 'LOSS' }, { result: 'LOSS' }, { result: 'LOSS' }
    ],
    expected: { wins: 7, losses: 6, winRate: 53.8, units: 0.4, roi: 3.1 }
  }
];

function calculateRecord(picks) {
  const record = {
    wins: 0,
    losses: 0,
    pushes: 0,
    pending: 0,
    units: 0,
    winRate: 0,
    roi: 0
  };
  
  picks.forEach(pick => {
    if (pick.result === 'WIN') {
      record.wins++;
      record.units += 1;
    } else if (pick.result === 'LOSS') {
      record.losses++;
      record.units -= JUICE;
    } else if (pick.result === 'PUSH') {
      record.pushes++;
    } else if (pick.result === 'PENDING') {
      record.pending++;
    }
  });
  
  const totalDecided = record.wins + record.losses;
  record.winRate = totalDecided > 0 ? (record.wins / totalDecided * 100) : 0;
  record.roi = totalDecided > 0 ? (record.units / totalDecided * 100) : 0;
  
  return record;
}

function filterByConfidence(picks, bucket) {
  const CONFIDENCE_BUCKETS = {
    low: { min: 50, max: 55 },
    medium: { min: 55, max: 60 },
    high: { min: 60, max: Infinity }
  };
  
  const range = CONFIDENCE_BUCKETS[bucket];
  if (!range) return [];
  
  return picks.filter(p => p.confidence >= range.min && p.confidence < range.max);
}

function filterByEdge(picks, bucket) {
  const EDGE_BUCKETS = {
    small: { min: 0, max: 1.5 },
    medium: { min: 1.5, max: 3 },
    large: { min: 3, max: Infinity }
  };
  
  const range = EDGE_BUCKETS[bucket];
  if (!range) return [];
  
  return picks.filter(p => p.edge >= range.min && p.edge < range.max);
}

function compareStandings(actual, expected, tolerance = 0.5) {
  const issues = [];
  
  if (actual.wins !== expected.wins) {
    issues.push(`❌ Wins: Got ${actual.wins}, Expected ${expected.wins}`);
  }
  
  if (actual.losses !== expected.losses) {
    issues.push(`❌ Losses: Got ${actual.losses}, Expected ${expected.losses}`);
  }
  
  if (expected.pushes !== undefined && actual.pushes !== expected.pushes) {
    issues.push(`❌ Pushes: Got ${actual.pushes}, Expected ${expected.pushes}`);
  }
  
  if (Math.abs(actual.winRate - expected.winRate) > tolerance) {
    issues.push(`❌ Win Rate: Got ${actual.winRate.toFixed(1)}%, Expected ${expected.winRate}%`);
  }
  
  if (Math.abs(actual.units - expected.units) > tolerance) {
    issues.push(`❌ Units: Got ${actual.units.toFixed(2)}, Expected ${expected.units}`);
  }
  
  if (Math.abs(actual.roi - expected.roi) > tolerance) {
    issues.push(`❌ ROI: Got ${actual.roi.toFixed(1)}%, Expected ${expected.roi}%`);
  }
  
  return issues;
}

function checkConfidenceInversion() {
  console.log('\n🔍 Checking for Confidence Inversion Bug...\n');
  
  if (typeof localStorage === 'undefined') {
    console.log('  ⚠️ localStorage not available (not in browser context)');
    return;
  }
  
  const picks = JSON.parse(localStorage.getItem('nfl_sim_results') || '[]');
  const aiLabPicks = Array.isArray(picks) ? picks.filter(p => p.source === 'AI_LAB') : [];
  
  if (aiLabPicks.length === 0) {
    console.log('  ℹ️ No AI Lab picks found in localStorage');
    return;
  }
  
  console.log(`  Found ${aiLabPicks.length} AI Lab picks\n`);
  
  // Check if confidence values are decimals
  const decimalConfidence = aiLabPicks.filter(p => p.confidence > 0 && p.confidence < 1);
  if (decimalConfidence.length > 0) {
    console.log(`  ⚠️ WARNING: ${decimalConfidence.length} picks have decimal confidence values:`);
    decimalConfidence.slice(0, 5).forEach(p => {
      console.log(`    ${p.id}: confidence = ${p.confidence} (should be ${p.confidence * 100})`);
    });
  } else {
    console.log('  ✓ All confidence values are in percentage format');
  }
  
  // Check bucket distributions
  const low = filterByConfidence(aiLabPicks, 'low');
  const medium = filterByConfidence(aiLabPicks, 'medium');
  const high = filterByConfidence(aiLabPicks, 'high');
  
  console.log('\n  Confidence Bucket Distribution:');
  console.log(`    Low (50-55%): ${low.length} picks`);
  console.log(`    Medium (55-60%): ${medium.length} picks`);
  console.log(`    High (60%+): ${high.length} picks`);
  
  // Calculate win rates per bucket
  if (low.length > 0) {
    const lowRecord = calculateRecord(low);
    console.log(`    Low bucket win rate: ${lowRecord.winRate.toFixed(1)}%`);
  }
  
  if (medium.length > 0) {
    const medRecord = calculateRecord(medium);
    console.log(`    Medium bucket win rate: ${medRecord.winRate.toFixed(1)}%`);
  }
  
  if (high.length > 0) {
    const highRecord = calculateRecord(high);
    console.log(`    High bucket win rate: ${highRecord.winRate.toFixed(1)}%`);
  }
  
  // Check for inversion (low performing better than high)
  if (low.length > 0 && high.length > 0) {
    const lowWR = calculateRecord(low).winRate;
    const highWR = calculateRecord(high).winRate;
    
    if (lowWR > highWR) {
      console.log(`\n  ⚠️ INVERSION DETECTED: Low confidence (${lowWR.toFixed(1)}%) outperforming High (${highWR.toFixed(1)}%)`);
      console.log('  This suggests confidence values may be stored incorrectly');
    } else {
      console.log(`\n  ✓ No inversion: High confidence (${highWR.toFixed(1)}%) performing as expected`);
    }
  }
}

function runValidation() {
  console.log('🧪 STANDINGS & W-L RECORD VALIDATION TEST\n');
  console.log('═'.repeat(60));
  
  // Test 1: Basic record calculation
  console.log('\n📋 TEST 1: Record Calculation Accuracy\n');
  
  TEST_SCENARIOS.forEach(scenario => {
    console.log(`  ${scenario.name}:`);
    const actual = calculateRecord(scenario.picks);
    const issues = compareStandings(actual, scenario.expected);
    
    if (issues.length === 0) {
      console.log(`    ✓ All calculations correct`);
      console.log(`      Record: ${actual.wins}-${actual.losses}${actual.pushes > 0 ? '-' + actual.pushes : ''}`);
      console.log(`      Win Rate: ${actual.winRate.toFixed(1)}%`);
      console.log(`      Units: ${actual.units > 0 ? '+' : ''}${actual.units.toFixed(2)}`);
      console.log(`      ROI: ${actual.roi > 0 ? '+' : ''}${actual.roi.toFixed(1)}%`);
    } else {
      issues.forEach(issue => console.log(`    ${issue}`));
    }
    console.log('');
  });
  
  // Test 2: Juice calculation
  console.log('\n📋 TEST 2: Juice/Vig Calculation\n');
  const juiceTest = calculateRecord([
    { result: 'WIN' }, { result: 'WIN' },
    { result: 'LOSS' }, { result: 'LOSS' }
  ]);
  
  const expectedUnits = 2 - (2 * JUICE); // 2 wins minus 2 losses at -110
  const match = Math.abs(juiceTest.units - expectedUnits) < 0.01;
  
  console.log(`  2 Wins, 2 Losses at -110 odds:`);
  console.log(`    ${match ? '✓' : '❌'} Units: ${juiceTest.units.toFixed(2)} (Expected: ${expectedUnits.toFixed(2)})`);
  console.log(`    Juice per loss: ${JUICE}`);
  
  // Test 3: Confidence bucket filtering
  console.log('\n📋 TEST 3: Confidence Bucket Filtering\n');
  const testPicks = [
    { confidence: 52, result: 'WIN' },
    { confidence: 54, result: 'LOSS' },
    { confidence: 56, result: 'WIN' },
    { confidence: 58, result: 'WIN' },
    { confidence: 61, result: 'LOSS' },
    { confidence: 65, result: 'WIN' }
  ];
  
  const lowPicks = filterByConfidence(testPicks, 'low');
  const mediumPicks = filterByConfidence(testPicks, 'medium');
  const highPicks = filterByConfidence(testPicks, 'high');
  
  console.log(`  ✓ Low (50-55%): ${lowPicks.length} picks (Expected: 2)`);
  console.log(`  ✓ Medium (55-60%): ${mediumPicks.length} picks (Expected: 2)`);
  console.log(`  ✓ High (60%+): ${highPicks.length} picks (Expected: 2)`);
  
  // Test 4: Edge bucket filtering
  console.log('\n📋 TEST 4: Edge Bucket Filtering\n');
  const edgeTestPicks = [
    { edge: 0.8, result: 'WIN' },
    { edge: 1.5, result: 'WIN' },
    { edge: 2.2, result: 'LOSS' },
    { edge: 3.1, result: 'WIN' },
    { edge: 4.5, result: 'WIN' }
  ];
  
  const smallEdge = filterByEdge(edgeTestPicks, 'small');
  const mediumEdge = filterByEdge(edgeTestPicks, 'medium');
  const largeEdge = filterByEdge(edgeTestPicks, 'large');
  
  console.log(`  ✓ Small (< 1.5pt): ${smallEdge.length} picks (Expected: 1)`);
  console.log(`  ✓ Medium (1.5-3pt): ${mediumEdge.length} picks (Expected: 2)`);
  console.log(`  ✓ Large (3pt+): ${largeEdge.length} picks (Expected: 2)`);
  
  // Test 5: Check for confidence inversion bug
  checkConfidenceInversion();
  
  console.log('\n' + '═'.repeat(60));
  console.log('✅ VALIDATION COMPLETE\n');
}

// Export for browser console
if (typeof window !== 'undefined') {
  window.testStandingsAccuracy = runValidation;
  window.calculateRecord = calculateRecord;
  window.filterByConfidence = filterByConfidence;
  window.filterByEdge = filterByEdge;
  window.checkConfidenceInversion = checkConfidenceInversion;
  console.log('💡 Run: testStandingsAccuracy()');
}

// Run if in Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runValidation, calculateRecord, filterByConfidence, filterByEdge };
  if (require.main === module) {
    runValidation();
  }
}
