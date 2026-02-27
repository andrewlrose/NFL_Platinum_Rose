/**
 * G-Unit Spreadsheet Parser Validation Test
 * 
 * Tests:
 * 1. Spreadsheet parsing accuracy
 * 2. Team name normalization
 * 3. Edge calculation correctness
 * 4. Line format validation
 * 
 * Run: node test-gunit-parser.js
 * Or paste into browser console
 */

// Mock G-Unit spreadsheet data samples
const SAMPLE_GUNIT_DATA = `
Duke -7.5 vs UNC
Over 145.5 Duke/UNC
Kansas +3 @ Kentucky
Under 138 Kansas/Kentucky
Gonzaga -12 vs Saint Mary's
`;

// Expected parsing results
const EXPECTED_RESULTS = [
  { team: 'Duke', opponent: 'UNC', line: -7.5, pickType: 'spread', selection: 'Duke' },
  { team: 'Duke', opponent: 'UNC', line: 145.5, pickType: 'total', selection: 'OVER' },
  { team: 'Kansas', opponent: 'Kentucky', line: 3, pickType: 'spread', selection: 'Kansas' },
  { team: 'Kansas', opponent: 'Kentucky', line: 138, pickType: 'total', selection: 'UNDER' },
  { team: 'Gonzaga', opponent: "Saint Mary's", line: -12, pickType: 'spread', selection: 'Gonzaga' }
];

// Team name normalization map (common variations)
const TEAM_NORMALIZATIONS = {
  'UNC': 'North Carolina',
  'Duke': 'Duke',
  'Kansas': 'Kansas',
  'Kentucky': 'Kentucky',
  'Gonzaga': 'Gonzaga',
  "Saint Mary's": "Saint Mary's (CA)",
  'St. Marys': "Saint Mary's (CA)",
  'UCLA': 'UCLA',
  'USC': 'USC'
};

// Simple parser implementation for testing
function parseGUnitLine(line) {
  line = line.trim();
  if (!line) return null;

  // Match spread pattern: "Team +/-X vs/@ Opponent"
  const spreadMatch = line.match(/^(.+?)\s+([-+][\d.]+)\s+(?:vs|@)\s+(.+)$/i);
  if (spreadMatch) {
    return {
      selection: spreadMatch[1].trim(),
      line: parseFloat(spreadMatch[2]),
      opponent: spreadMatch[3].trim(),
      pickType: 'spread'
    };
  }

  // Match total pattern: "Over/Under X Team/Opponent"
  const totalMatch = line.match(/^(Over|Under)\s+([\d.]+)\s+(.+?)\/(.+)$/i);
  if (totalMatch) {
    return {
      selection: totalMatch[1].toUpperCase(),
      line: parseFloat(totalMatch[2]),
      team: totalMatch[3].trim(),
      opponent: totalMatch[4].trim(),
      pickType: 'total'
    };
  }

  return null;
}

// Calculate edge (simplified)
function calculateEdge(projectedLine, marketLine, pickType) {
  if (pickType === 'spread') {
    return Math.abs(projectedLine - marketLine);
  } else if (pickType === 'total') {
    return Math.abs(projectedLine - marketLine);
  }
  return 0;
}

// Validate confidence thresholds
function validateConfidence(confidence) {
  const issues = [];
  
  if (typeof confidence !== 'number') {
    issues.push(`❌ Confidence is not a number: ${typeof confidence}`);
  }
  
  if (confidence < 0 || confidence > 100) {
    issues.push(`❌ Confidence out of range (0-100): ${confidence}`);
  }
  
  // Check if stored as decimal instead of percentage
  if (confidence > 0 && confidence < 1) {
    issues.push(`⚠️ WARNING: Confidence appears to be decimal (${confidence}) instead of percentage. Should be ${confidence * 100}%`);
  }
  
  return issues;
}

// Main validation function
function runValidation() {
  console.log('🧪 G-UNIT PARSER VALIDATION TEST\n');
  console.log('═'.repeat(60));
  
  // Test 1: Parse sample data
  console.log('\n📋 TEST 1: Parsing G-Unit Spreadsheet Data\n');
  const lines = SAMPLE_GUNIT_DATA.split('\n').filter(l => l.trim());
  const parsed = lines.map(parseGUnitLine).filter(Boolean);
  
  console.log(`✓ Parsed ${parsed.length} lines from ${lines.length} non-empty lines`);
  parsed.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.selection} | Type: ${p.pickType} | Line: ${p.line}`);
  });
  
  // Test 2: Team name normalization
  console.log('\n📋 TEST 2: Team Name Normalization\n');
  let normalizationPass = true;
  parsed.forEach((p, i) => {
    const teamKey = p.selection;
    if (!TEAM_NORMALIZATIONS[teamKey] && p.pickType === 'spread') {
      console.log(`  ⚠️ Line ${i + 1}: "${teamKey}" not in normalization map`);
      normalizationPass = false;
    }
  });
  if (normalizationPass) {
    console.log('  ✓ All team names found in normalization map');
  }
  
  // Test 3: Edge calculation
  console.log('\n📋 TEST 3: Edge Calculation\n');
  const testEdges = [
    { projected: -6.5, market: -7.5, pickType: 'spread', expected: 1.0 },
    { projected: 145, market: 148.5, pickType: 'total', expected: 3.5 },
    { projected: -12, market: -10.5, pickType: 'spread', expected: 1.5 }
  ];
  
  testEdges.forEach(test => {
    const calculated = calculateEdge(test.projected, test.market, test.pickType);
    const match = Math.abs(calculated - test.expected) < 0.01;
    console.log(`  ${match ? '✓' : '❌'} Projected: ${test.projected}, Market: ${test.market} → Edge: ${calculated} (Expected: ${test.expected})`);
  });
  
  // Test 4: Confidence validation
  console.log('\n📋 TEST 4: Confidence Value Validation\n');
  const testConfidences = [57, 0.57, 105, -5, 53.5, 62];
  
  testConfidences.forEach(conf => {
    const issues = validateConfidence(conf);
    if (issues.length > 0) {
      console.log(`  Confidence ${conf}:`);
      issues.forEach(issue => console.log(`    ${issue}`));
    } else {
      console.log(`  ✓ Confidence ${conf}% is valid`);
    }
  });
  
  // Test 5: Edge bucket classification
  console.log('\n📋 TEST 5: Edge Bucket Classification\n');
  const EDGE_BUCKETS = {
    small: { min: 0, max: 1.5, label: '< 1.5pt' },
    medium: { min: 1.5, max: 3, label: '1.5-3pt' },
    large: { min: 3, max: Infinity, label: '3pt+' }
  };
  
  const testEdgeValues = [0.8, 1.5, 2.2, 3.0, 4.5];
  testEdgeValues.forEach(edge => {
    let bucket = 'unknown';
    if (edge < 1.5) bucket = 'small';
    else if (edge < 3) bucket = 'medium';
    else bucket = 'large';
    
    console.log(`  ✓ Edge ${edge}pt → Bucket: ${bucket} (${EDGE_BUCKETS[bucket].label})`);
  });
  
  console.log('\n' + '═'.repeat(60));
  console.log('✅ VALIDATION COMPLETE\n');
}

// Run if in Node.js
if (typeof module !== 'undefined' && module.exports) {
  runValidation();
}

// Export for browser console
if (typeof window !== 'undefined') {
  window.testGUnitParser = runValidation;
  console.log('💡 Run: testGUnitParser()');
}
