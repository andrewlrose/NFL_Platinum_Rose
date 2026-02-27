# API Usage - Critical Fixes Applied

## 🚨 Problem Identified

You've used **499/500 requests** but only clicked Sync ~24 times. Here's why:

### Culprit #1: Auto-Refresh (FIXED ✅)
```javascript
// LiveOddsDashboard.jsx - Line 26
const interval = setInterval(loadOdds, 120000); // Every 2 minutes!
```

**Impact:**
- Leaving Odds tab open for 1 hour = 30 API calls
- 8 hours of work = 240 API calls
- 2 days = 480 API calls! 🔥

### Culprit #2: App Startup (FIXED ✅)
```javascript
// App.jsx - Line 77
fetchLiveOdds().catch(err => { ... })
```

**Impact:**
- Every browser refresh = 1 API call
- 50 refreshes during development = 50 API calls

---

## ✅ Fixes Applied

### 1. Disabled Auto-Refresh
- ❌ No longer calls API every 2 minutes
- ✅ Only fetches when you manually click Sync
- ✅ Added 10-minute caching

### 2. Disabled Startup API Call
- ❌ No longer calls API on page load
- ✅ Only calls when explicitly requested

### 3. Added Caching
- Saves API responses in localStorage
- Reuses cached data for 10 minutes
- Prevents duplicate calls

### 4. Added Usage Warnings
- Logs "this counts against your limit" on each call
- Shows cache age when using cached data

---

## 📊 Monitoring Tool

Use `monitor-api-usage.js` to track calls in browser console:

```javascript
// Paste monitor-api-usage.js into console, then:

getAPIReport()      // See usage stats
resetAPICounter()   // Reset on 1st of month
clearAPITracking()  // Clear all data
```

---

## 🎯 Best Practices Moving Forward

### During Development:
1. **Use Mock Data** - Comment out API calls entirely
2. **Cache Aggressively** - 10 minute cache is now enabled
3. **Manual Refresh Only** - Click Sync only when needed
4. **Check Usage** - Run `getAPIReport()` regularly

### Recommended Usage:
- **Dev/Testing**: 0-5 calls per day (use cache/mock data)
- **Production**: 10-20 calls per day (sync morning/evening)
- **Critical**: Stop at 490 calls, wait for reset

### Cache Settings:
```javascript
// Current: 10 minute cache
// To extend: Change this in LiveOddsDashboard.jsx
if (age < 10 * 60 * 1000) // Change 10 to 60 for 1 hour cache
```

---

## 🔧 Emergency Actions (You're at 499/500!)

### Option 1: Wait for Reset
Your plan started **Feb 18, 2022** so it resets **March 1, 12AM UTC**

Days until reset: **~24 days** (it's Feb 5, 2026)

### Option 2: Use Mock Data
Enable mock data mode in `enhancedOddsApi.js`:

```javascript
// Force mock data
export const fetchMultiBookOdds = async () => {
  return generateMockMultiBookData(); // Skip API entirely
};
```

### Option 3: Upgrade Plan
- **Starter**: $0/month, 500 requests
- **Basic**: $39/month, 10,000 requests
- **Pro**: $99/month, 50,000 requests

---

## 📋 What Changed

### File: LiveOddsDashboard.jsx
```diff
- const interval = setInterval(loadOdds, 120000);
+ // ⚠️ AUTO-REFRESH DISABLED to save API requests
+ // Uncomment only if you have unlimited API plan

+ // Cache odds for 10 minutes
+ localStorage.setItem('cached_odds_data', JSON.stringify(oddsData));
+ localStorage.setItem('cached_odds_time', Date.now().toString());
```

### File: App.jsx
```diff
- fetchLiveOdds().catch(err => { ... }),
+ // Disabled on startup to save API requests
+ Promise.resolve([]),
```

---

## 🧪 Testing

### Test Cache is Working:
1. Open dashboard
2. Go to Odds tab
3. Click Sync Odds (1 API call)
4. Console should show: `✅ Loaded odds for X games (cached for 10 minutes)`
5. Refresh page
6. Console should show: `📦 Using cached odds (age: X min)`
7. **No API call made!** ✅

### Test Monitoring:
1. Open browser console
2. Paste `monitor-api-usage.js` contents
3. Run `getAPIReport()`
4. Should show your usage stats

---

## 💡 Development Tips

### Use Mock Data:
```javascript
// In enhancedOddsApi.js
const USE_MOCK = true; // Set this during development

if (USE_MOCK) {
  return generateMockMultiBookData();
}
```

### Test Without API:
1. Set `USE_MOCK = true` in enhancedOddsApi.js
2. Develop features using mock data
3. Test with real API only before deployment

### Cache Strategy:
- **Development**: 1 hour cache
- **Testing**: 30 minute cache
- **Production**: 5-10 minute cache

---

## 🔮 What Probably Happened

**Most Likely Scenario:**

1. You opened the Odds tab to check it works ✅
2. Left it open while working on other features
3. Auto-refresh hit API every 2 minutes
4. 8 hours later = 240 API calls gone
5. Plus ~50 refreshes during dev = 50 more
6. Plus manual Sync clicks = 24 more
7. **Total: ~314 calls** from one session!

8. Then you did this again over multiple days...
9. Result: **499/500 calls used** 😱

---

## 🎯 Action Items

- [x] Disabled auto-refresh
- [x] Disabled startup API call
- [x] Added 10-minute caching
- [x] Added usage warnings
- [ ] **YOU: Test that cache is working**
- [ ] **YOU: Install monitoring script**
- [ ] **YOU: Wait for March 1st reset OR use mock data**

---

*Fixed: February 5, 2026*
