# NCAA Files Found in NFL Dashboard - Cleanup List

**Date:** February 6, 2026  
**Project:** NFL Dashboard (Platinum Rose)  
**Status:** These files should be removed/relocated to separate NCAA project

---

## NCAA-Related Files to Remove

### Root Directory Files
1. **FIX_NCAA_API_401.md** - NCAA Basketball API troubleshooting guide
2. **test-ncaa-api-key.js** - NCAA Basketball API key verification script
3. **VALIDATION_GUIDE.md** - NCAA Basketball validation testing guide (title says "NCAA Basketball Dashboard")
4. **README_ValidationTests.md** - NCAA Basketball validation tests (title says "NCAA Basketball Dashboard")

### Test/Utility Files with NCAA Content
5. **test-picks-database.js** - Contains NCAA picks database migration code (line 210-211)
6. **test-standings-accuracy.js** - References NCAA picks tracker in localStorage (line 151)

### localStorage References in Code
These files have NCAA-specific localStorage keys that should be removed:
- `ncaa_picks_tracker_v1` - NCAA picks tracking
- `ncaa_picks_database` - Legacy NCAA database

---

## Files NOT in NFL Dashboard (Correctly Separated)

✅ No NCAA components in `/src` directory  
✅ No NCAA modals in `/src/components/modals`  
✅ No NCAA logic in `/src/lib`  
✅ No NCAA utilities or helpers  

---

## Recommendation

**Remove these files to keep NFL Dashboard clean:**

```powershell
# Option 1: Delete individual files
rm FIX_NCAA_API_401.md
rm test-ncaa-api-key.js
rm VALIDATION_GUIDE.md
rm README_ValidationTests.md

# Option 2: Archive NCAA files if needed later
mkdir ../NCAA_Archived
move FIX_NCAA_API_401.md ../NCAA_Archived/
move test-ncaa-api-key.js ../NCAA_Archived/
move VALIDATION_GUIDE.md ../NCAA_Archived/
move README_ValidationTests.md ../NCAA_Archived/
```

**For test files (test-picks-database.js, test-standings-accuracy.js):**
- Either delete or remove NCAA-related code sections
- These contain NFL-specific content + NCAA code mixed together

---

## NCAA localStorage Keys to Ignore

If you ever see these in browser console, they're legacy NCAA data:
- `ncaa_picks_tracker_v1`
- `ncaa_picks_database`

These will NOT interfere with NFL Dashboard as they use different key prefixes than NFL data:
- NFL prefixes: `nfl_splits`, `nfl_expert_consensus`, `nfl_sim_results`, etc.

---

## Conclusion

**The NFL Dashboard source code is CLEAN** - no NCAA components in `/src`  
**Only documentation and test files contain NCAA references** - these should be removed or moved to separate NCAA project

