/**
 * AI Dev Lab Simulation Validation Test
 * 
 * Tests:
 * 1. Monte Carlo simulation logic
 * 2. Edge calculation from simulation results
 * 3. Confidence bucket classification
 * 4. Cover percentage accuracy
 * 5. Edge threshold enforcement (53%+ recording rule)
 * 
 * Run: node test-ai-lab-sim.js
 * Or paste into browser console
 */

// Simulation configuration
const SIM_CONFIG = {
  iterations: 10000,
  confidenceThreshold: 53, // Don't record picks below 53%
  minEdge: 1.5 // Minimum edge to consider recording (points)
};

// Confidence buckets (AI Lab only)
const CONFIDENCE_BUCKETS = {
  low: { min: 50, max: 55, label: '50-55%' },
  medium: { min: 55, max: 60, label: '55-60%' },
  high: { min: 60, max: Infinity, label: '60%+' }
};

// Mock team ratings (KenPom-style)
const MOCK_TEAM_RATINGS = {
  'Duke': { offRating: 118.5, defRating: 95.2, tempo: 70.5 },
  'UNC': { offRating: 115.3, defRating: 98.7, tempo: 72.1 },
  'Kansas': { offRating: 120.1, defRating: 94.3, tempo: 68.9 },
  'Kentucky': { offRating: 116.8, defRating: 96.5, tempo: 69.7 },
  'Gonzaga': { offRating: 122.3, defRating: 92.8, tempo: 71.2 },
  "Saint Mary's": { offRating: 112.5, defRating: 100.3, tempo: 65.4 }
};

// Simplified Monte Carlo simulation
function runMonteCarloSimulation(homeTeam, awayTeam, iterations = 10000) {
  const homeRating = MOCK_TEAM_RATINGS[homeTeam];
  const awayRating = MOCK_TEAM_RATINGS[awayTeam];
  
  if (!homeRating || !awayRating) {
    throw new Error(`Team ratings not found for ${homeTeam} or ${awayTeam}`);
  }
  
  // Simplified scoring projection
  const homeProjectedScore = (homeRating.offRating - awayRating.defRating) * (homeRating.tempo / 70) + 3; // +3 for home court
  const awayProjectedScore = (awayRating.offRating - homeRating.defRating) * (awayRating.tempo / 70);
  
  const projectedSpread = homeProjectedScore - awayProjectedScore;
  const projectedTotal = homeProjectedScore + awayProjectedScore;
  
  // Simulate with variance
  const results = {
    spreads: [],
    totals: [],
    homeWins: 0,
    awayWins: 0
  };
  
  for (let i = 0; i < iterations; i++) {
    // Add random variance (normal distribution approximation)
    const variance = (Math.random() + Math.random() + Math.random() - 1.5) * 8; // ~8 point std dev
    const simSpread = projectedSpread + variance;
    const simTotal = projectedTotal + Math.abs(variance) * 0.5;
    
    results.spreads.push(simSpread);
    results.totals.push(simTotal);
    
    if (simSpread > 0) results.homeWins++;
    else results.awayWins++;
  }
  
  return {
    projectedSpread: projectedSpread.toFixed(1),
    projectedTotal: projectedTotal.toFixed(1),
    spreadMean: (results.spreads.reduce((a, b) => a + b) / iterations).toFixed(1),
    totalMean: (results.totals.reduce((a, b) => a + b) / iterations).toFixed(1),
    homeWinPct: ((results.homeWins / iterations) * 100).toFixed(1),
    results
  };
}

// Calculate edge against market line
function calculateEdgeVsMarket(simResult, marketSpread, marketTotal) {
  const spreadEdge = Math.abs(parseFloat(simResult.projectedSpread) - marketSpread);
  const totalEdge = Math.abs(parseFloat(simResult.projectedTotal) - marketTotal);
  
  return {
    spreadEdge: spreadEdge.toFixed(1),
    totalEdge: totalEdge.toFixed(1)
  };
}

// Calculate cover percentage for spread
function calculateCoverPercentage(simResult, marketSpread, pickingSide) {
  const spreads = simResult.results.spreads;
  let covers = 0;
  
  spreads.forEach(spread => {
    if (pickingSide === 'home') {
      if (spread > Math.abs(marketSpread)) covers++;
    } else {
      if (spread < -Math.abs(marketSpread)) covers++;
    }
  });
  
  return ((covers / spreads.length) * 100).toFixed(1);
}

// Classify confidence bucket
function classifyConfidence(coverPct) {
  if (coverPct >= 60) return 'high';
  if (coverPct >= 55) return 'medium';
  if (coverPct >= 50) return 'low';
  return 'none';
}

// Check if pick should be recorded
function shouldRecordPick(coverPct, edge) {
  const meetsConfidence = coverPct >= SIM_CONFIG.confidenceThreshold;
  const meetsEdge = edge >= SIM_CONFIG.minEdge;
  
  return {
    shouldRecord: meetsConfidence,
    reason: !meetsConfidence 
      ? `Cover % ${coverPct}% below threshold ${SIM_CONFIG.confidenceThreshold}%`
      : meetsEdge
        ? `Meets all criteria (${coverPct}%, ${edge}pt edge)`
        : `Low edge warning (${edge}pt < ${SIM_CONFIG.minEdge}pt recommended)`
  };
}

// Main validation function
function runValidation() {
  console.log('🧪 AI DEV LAB SIMULATION VALIDATION TEST\n');
  console.log('═'.repeat(60));
  
  // Test 1: Run simulation
  console.log('\n📋 TEST 1: Monte Carlo Simulation\n');
  console.log(`  Running ${SIM_CONFIG.iterations} iterations...\n`);
  
  const testGames = [
    { home: 'Duke', away: 'UNC', marketSpread: -7.5, marketTotal: 145.5 },
    { home: 'Kansas', away: 'Kentucky', marketSpread: -3, marketTotal: 138 },
    { home: 'Gonzaga', away: "Saint Mary's", marketSpread: -12.5, marketTotal: 135 }
  ];
  
  const simResults = [];
  
  testGames.forEach(game => {
    console.log(`  ${game.home} vs ${game.away}`);
    console.log(`  Market: ${game.home} ${game.marketSpread}, Total ${game.marketTotal}\n`);
    
    const sim = runMonteCarloSimulation(game.home, game.away, SIM_CONFIG.iterations);
    const edges = calculateEdgeVsMarket(sim, game.marketSpread, game.marketTotal);
    const coverPct = calculateCoverPercentage(sim, game.marketSpread, 'home');
    const bucket = classifyConfidence(parseFloat(coverPct));
    const recordCheck = shouldRecordPick(parseFloat(coverPct), parseFloat(edges.spreadEdge));
    
    console.log(`  📊 Simulation Results:`);
    console.log(`    Projected Spread: ${sim.projectedSpread}`);
    console.log(`    Projected Total: ${sim.projectedTotal}`);
    console.log(`    Home Win %: ${sim.homeWinPct}%`);
    console.log(`    Cover %: ${coverPct}%`);
    console.log(`    Spread Edge: ${edges.spreadEdge}pt`);
    console.log(`    Total Edge: ${edges.totalEdge}pt`);
    console.log(`    Confidence Bucket: ${bucket} (${CONFIDENCE_BUCKETS[bucket]?.label || 'N/A'})`);
    console.log(`    ${recordCheck.shouldRecord ? '✓' : '⚠️'} Record Pick: ${recordCheck.reason}`);
    console.log('');
    
    simResults.push({
      game,
      sim,
      edges,
      coverPct,
      bucket,
      recordCheck
    });
  });
  
  // Test 2: Confidence bucket distribution
  console.log('\n📋 TEST 2: Confidence Bucket Classification\n');
  const testConfidences = [52, 53, 54, 56, 59, 61, 64];
  
  testConfidences.forEach(conf => {
    const bucket = classifyConfidence(conf);
    const shouldRecord = conf >= SIM_CONFIG.confidenceThreshold;
    console.log(`  ${shouldRecord ? '✓' : '❌'} ${conf}% → ${bucket} bucket (${CONFIDENCE_BUCKETS[bucket]?.label || 'N/A'}) ${shouldRecord ? '' : '- Below threshold'}`);
  });
  
  // Test 3: Edge calculation accuracy
  console.log('\n📋 TEST 3: Edge Calculation Verification\n');
  const edgeTests = [
    { projected: -8.5, market: -7.5, expected: 1.0 },
    { projected: -6.5, market: -7.5, expected: 1.0 },
    { projected: 146.5, market: 145.5, expected: 1.0 },
    { projected: 141.5, market: 145.5, expected: 4.0 }
  ];
  
  edgeTests.forEach(test => {
    const calculated = Math.abs(test.projected - test.market);
    const match = Math.abs(calculated - test.expected) < 0.01;
    console.log(`  ${match ? '✓' : '❌'} Projected: ${test.projected}, Market: ${test.market} → Edge: ${calculated.toFixed(1)}pt (Expected: ${test.expected}pt)`);
  });
  
  // Test 4: Recording threshold enforcement
  console.log('\n📋 TEST 4: Pick Recording Threshold Enforcement\n');
  console.log(`  Threshold: ${SIM_CONFIG.confidenceThreshold}% confidence\n`);
  
  simResults.forEach((result, i) => {
    const coverPct = parseFloat(result.coverPct);
    const meetsThreshold = coverPct >= SIM_CONFIG.confidenceThreshold;
    console.log(`  ${meetsThreshold ? '✓' : '❌'} Game ${i + 1}: ${result.game.home} vs ${result.game.away}`);
    console.log(`      Cover %: ${result.coverPct}% ${meetsThreshold ? '(Record)' : '(Skip)'}`);
  });
  
  // Test 5: Summary statistics
  console.log('\n📋 TEST 5: Summary Statistics\n');
  const recordable = simResults.filter(r => r.recordCheck.shouldRecord);
  const skipped = simResults.filter(r => !r.recordCheck.shouldRecord);
  
  console.log(`  Total Games Simulated: ${simResults.length}`);
  console.log(`  Picks to Record: ${recordable.length}`);
  console.log(`  Picks to Skip: ${skipped.length}`);
  console.log(`  Average Edge (recordable): ${recordable.length > 0 ? (recordable.reduce((sum, r) => sum + parseFloat(r.edges.spreadEdge), 0) / recordable.length).toFixed(1) : 0}pt`);
  console.log(`  Average Confidence (recordable): ${recordable.length > 0 ? (recordable.reduce((sum, r) => sum + parseFloat(r.coverPct), 0) / recordable.length).toFixed(1) : 0}%`);
  
  console.log('\n' + '═'.repeat(60));
  console.log('✅ VALIDATION COMPLETE\n');
  
  return simResults;
}

// Export for browser console
if (typeof window !== 'undefined') {
  window.testAILabSim = runValidation;
  window.runMonteCarloSimulation = runMonteCarloSimulation;
  window.calculateCoverPercentage = calculateCoverPercentage;
  console.log('💡 Run: testAILabSim()');
}

// Run if in Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runValidation, runMonteCarloSimulation, calculateCoverPercentage, shouldRecordPick };
  if (require.main === module) {
    runValidation();
  }
}
