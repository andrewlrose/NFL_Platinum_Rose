/**
 * API Usage Monitor
 * 
 * Track and prevent excessive API calls to The Odds API
 * Paste this in browser console to monitor usage
 */

class APIUsageMonitor {
  constructor() {
    this.storageKey = 'odds_api_usage_tracker';
    this.warningThreshold = 450; // Warn at 90%
    this.dangerThreshold = 490;  // Alert at 98%
    this.monthlyLimit = 500;
  }

  // Track an API call
  recordCall(endpoint, success = true) {
    const data = this.getData();
    const now = Date.now();
    
    data.calls.push({
      timestamp: now,
      endpoint,
      success,
      date: new Date(now).toISOString()
    });
    
    data.totalCalls++;
    if (success) data.successfulCalls++;
    else data.failedCalls++;
    
    this.saveData(data);
    this.checkThresholds(data.totalCalls);
    
    return data.totalCalls;
  }

  // Get usage data
  getData() {
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Initialize new tracking
    return {
      calls: [],
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      startDate: Date.now(),
      lastReset: Date.now()
    };
  }

  // Save data
  saveData(data) {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  // Reset monthly counter (call on 1st of month)
  reset() {
    const data = {
      calls: [],
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      startDate: Date.now(),
      lastReset: Date.now()
    };
    this.saveData(data);
    console.log('✅ API usage counter reset');
  }

  // Check thresholds
  checkThresholds(count) {
    const remaining = this.monthlyLimit - count;
    
    if (count >= this.dangerThreshold) {
      console.error(`🚨 CRITICAL: ${count}/${this.monthlyLimit} API calls used! Only ${remaining} remaining!`);
      console.error('⚠️ STOP making API calls immediately!');
    } else if (count >= this.warningThreshold) {
      console.warn(`⚠️ WARNING: ${count}/${this.monthlyLimit} API calls used. ${remaining} remaining.`);
    }
  }

  // Get report
  getReport() {
    const data = this.getData();
    const now = Date.now();
    const ageMs = now - data.startDate;
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
    const ageHours = Math.floor((ageMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    const remaining = this.monthlyLimit - data.totalCalls;
    const percentUsed = ((data.totalCalls / this.monthlyLimit) * 100).toFixed(1);
    
    console.log('\n📊 API USAGE REPORT\n' + '═'.repeat(60));
    console.log(`Total Calls: ${data.totalCalls} / ${this.monthlyLimit} (${percentUsed}%)`);
    console.log(`Remaining: ${remaining} calls`);
    console.log(`Successful: ${data.successfulCalls}`);
    console.log(`Failed: ${data.failedCalls}`);
    console.log(`Tracking Since: ${new Date(data.startDate).toLocaleString()}`);
    console.log(`Duration: ${ageDays} days, ${ageHours} hours`);
    console.log(`Last Reset: ${new Date(data.lastReset).toLocaleString()}`);
    
    if (remaining < 10) {
      console.log(`\n🚨 CRITICAL: Only ${remaining} calls left!`);
      console.log('⚠️ Stop using API immediately until next month!');
    } else if (remaining < 50) {
      console.log(`\n⚠️ WARNING: Only ${remaining} calls left!`);
      console.log('💡 Use cached data and disable auto-refresh');
    }
    
    // Recent calls
    if (data.calls.length > 0) {
      console.log('\n📋 Recent API Calls (last 10):');
      const recent = data.calls.slice(-10).reverse();
      console.table(recent.map(c => ({
        Time: new Date(c.timestamp).toLocaleTimeString(),
        Endpoint: c.endpoint,
        Success: c.success ? '✅' : '❌'
      })));
    }
    
    // Daily breakdown
    this.getDailyBreakdown(data.calls);
    
    console.log('═'.repeat(60) + '\n');
  }

  // Get daily breakdown
  getDailyBreakdown(calls) {
    const daily = {};
    
    calls.forEach(call => {
      const date = new Date(call.timestamp).toLocaleDateString();
      if (!daily[date]) daily[date] = 0;
      daily[date]++;
    });
    
    console.log('\n📅 Daily Breakdown:');
    Object.entries(daily).forEach(([date, count]) => {
      console.log(`  ${date}: ${count} calls`);
    });
  }

  // Estimate when you'll hit limit
  estimateLimit() {
    const data = this.getData();
    if (data.calls.length < 2) {
      console.log('Not enough data to estimate');
      return;
    }
    
    const ageMs = Date.now() - data.startDate;
    const callsPerDay = (data.totalCalls / ageMs) * (1000 * 60 * 60 * 24);
    const remaining = this.monthlyLimit - data.totalCalls;
    const daysRemaining = remaining / callsPerDay;
    
    console.log('\n📈 Usage Projection:');
    console.log(`  Calls per day: ${callsPerDay.toFixed(1)}`);
    console.log(`  Days until limit: ${daysRemaining.toFixed(1)}`);
    
    if (daysRemaining < 7) {
      console.log('  ⚠️ You will hit your limit within a week!');
    }
  }

  // Clear all tracking data
  clearData() {
    localStorage.removeItem(this.storageKey);
    console.log('✅ All tracking data cleared');
  }
}

// Create global instance
const apiMonitor = new APIUsageMonitor();

// Intercept fetch calls to TheOddsAPI
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const url = args[0];
  
  // Track calls to TheOddsAPI
  if (typeof url === 'string' && url.includes('the-odds-api.com')) {
    console.log('🔍 Detected API call:', url.split('?')[0]);
    
    return originalFetch.apply(this, args).then(response => {
      const endpoint = url.split('/').pop().split('?')[0];
      apiMonitor.recordCall(endpoint, response.ok);
      
      if (!response.ok && response.status === 401) {
        console.error('🚨 401 Error - Check your API key or request limit!');
      }
      
      return response;
    });
  }
  
  return originalFetch.apply(this, args);
};

// Export functions for console use
window.apiMonitor = apiMonitor;
window.getAPIReport = () => apiMonitor.getReport();
window.resetAPICounter = () => apiMonitor.reset();
window.clearAPITracking = () => apiMonitor.clearData();

console.log('✅ API Usage Monitor Active');
console.log('💡 Commands:');
console.log('  getAPIReport()      - View usage report');
console.log('  resetAPICounter()   - Reset monthly counter');
console.log('  clearAPITracking()  - Clear all data');
console.log('\n🔍 Now monitoring all API calls to the-odds-api.com...\n');

// Auto-report on load
setTimeout(() => {
  apiMonitor.getReport();
}, 1000);
