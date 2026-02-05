---
phase: 02-team-management
plan: 02
type: execute
subsystem: data-services
status: complete
tags: [geocoding, csv, api-integration, data-processing]

requires:
  - 01-01: Leaflet coordinate format [lat, lng]

provides:
  - CSV import with PapaParse and field validation
  - Géoplateforme geocoding service with rate limiting
  - French/English field name normalization

affects:
  - 02-03: Import pipeline will use these services
  - Future phases: All geocoding uses data.geopf.fr endpoint

tech-stack:
  added:
    - papaparse: 5.5.3 (CSV parsing)
  patterns:
    - Service module pattern for external integrations
    - Promise-based async API design
    - Rate limiting with setTimeout
    - Error handling that doesn't fail entire batch

key-files:
  created:
    - src/services/csvImport.js: CSV parsing and validation
    - src/services/geocoding.js: Géoplateforme API integration
  modified:
    - package.json: Added papaparse dependency

decisions:
  - Use Géoplateforme API (data.geopf.fr) not deprecated api-adresse
  - Accept multiple field name variations (French/English)
  - Batch geocoding continues on individual failures
  - 20ms rate limit for Géoplateforme (50 req/s)

metrics:
  duration: 1.5 min
  tasks: 2
  commits: 2
  files_created: 2
  completed: 2026-02-05
---

# Phase 2 Plan 2: Data Processing Services Summary

**One-liner:** CSV import with PapaParse and Géoplateforme geocoding with coordinate swap and rate limiting

## What Was Built

### CSV Import Service (csvImport.js)
- **parseCSV**: Promise-based CSV parsing with header detection
- **validateTeamMembers**: Required field validation (name/address)
- **normalizeTeamMember**: Maps French/English variations (nom/name, adresse/address, telephone/phone)

### Geocoding Service (geocoding.js)
- **geocodeAddress**: Single address geocoding with optional postcode
- **geocodeBatch**: Batch geocoding with 20ms rate limiting
- **Coordinate swap**: GeoJSON [lng, lat] → Leaflet [lat, lng]
- **France bounds validation**: Warns if coordinates outside France

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install PapaParse and create CSV import service | a1b9f31 | package.json, src/services/csvImport.js |
| 2 | Create Géoplateforme geocoding service | c35270f | src/services/geocoding.js |

## Technical Decisions

### 1. Géoplateforme API Over Deprecated Service
**Context:** French address geocoding has migrated from api-adresse.data.gouv.fr to data.geopf.fr

**Decision:** Use https://data.geopf.fr/geocodage/search exclusively

**Rationale:**
- Official migration path
- Better maintained
- Same response format

**Impact:** All geocoding calls use the new endpoint

### 2. Critical Coordinate Swap
**Context:** GeoJSON uses [longitude, latitude] but Leaflet expects [latitude, longitude]

**Decision:** Explicitly swap coordinates: `{lat: coords[1], lng: coords[0]}`

**Rationale:**
- Prevents map markers appearing at wrong locations
- Follows Leaflet convention established in Phase 1
- Documented in code with CRITICAL comment

**Impact:** All geocoded coordinates work correctly with Leaflet

### 3. Field Name Flexibility
**Context:** Users export CSV from different systems (French vs English, variations)

**Decision:** Accept multiple variations: nom/name, adresse/address, telephone/phone/tel

**Rationale:**
- Real-world CSV files have inconsistent headers
- Normalizing after parsing is cleaner than forcing specific format

**Impact:** Users can import CSV from various sources without preprocessing

### 4. Graceful Batch Failure Handling
**Context:** Batch geocoding of many addresses - some may be invalid

**Decision:** Return `{success: false, error: string}` for failures, continue processing

**Rationale:**
- Don't lose entire batch if one address is bad
- Caller can identify which addresses failed
- User can review and fix specific failures

**Impact:** Import pipeline will handle partial successes

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification checks passed:

1. ✅ PapaParse 5.5.3 installed and listed in package.json
2. ✅ CSV parsing uses header detection (header: true)
3. ✅ Validation catches missing name/address fields with row numbers
4. ✅ Field normalization handles French/English variations
5. ✅ Geocoding uses data.geopf.fr (not deprecated API)
6. ✅ Coordinates correctly swapped (lat = coords[1], lng = coords[0])
7. ✅ Batch geocoding continues after individual failures
8. ✅ No reference to deprecated api-adresse.data.gouv.fr

## Code Quality Notes

### Strengths
- Clear separation of concerns (parsing vs validation vs normalization)
- Comprehensive error handling with descriptive messages
- Rate limiting prevents API throttling
- France bounds validation catches geocoding errors
- Well-documented functions with JSDoc

### Testing Considerations
For manual testing (browser console):
```javascript
// CSV test
import { parseCSV, validateTeamMembers, normalizeTeamMember } from './src/services/csvImport.js';
const testBlob = new Blob(['nom,adresse\nJean,1 rue Test\n'], {type: 'text/csv'});
const testFile = new File([testBlob], 'test.csv');
const data = await parseCSV(testFile);
console.log(data); // [{nom: 'Jean', adresse: '1 rue Test'}]
const normalized = normalizeTeamMember(data[0]);
console.log(normalized); // {name: 'Jean', address: '1 rue Test'}

// Geocoding test
import { geocodeAddress, geocodeBatch } from './src/services/geocoding.js';
const result = await geocodeAddress('Mairie de Chapet', '78130');
console.log(result); // {lat: ~48.97, lng: ~1.93, label: '...', score: >0.5}
```

## Integration Points

### Dependencies
- **From Phase 1:** [lat, lng] coordinate format convention

### Provides to Next Phase
- **CSV parsing pipeline:** parseCSV → validateTeamMembers → normalizeTeamMember
- **Geocoding pipeline:** Single or batch address → coordinates
- **Error handling patterns:** Validation errors with row numbers, batch failures with details

## Next Phase Readiness

**Phase 2 Plan 3 Prerequisites:**
- ✅ CSV import service ready
- ✅ Geocoding service ready
- ✅ Error handling patterns established
- ✅ Field normalization handles real-world data

**Blockers:** None

**Concerns:** None - services are independent and testable

## Files Modified

**Created:**
- `src/services/csvImport.js` (103 lines) - CSV parsing, validation, normalization
- `src/services/geocoding.js` (110 lines) - Géoplateforme geocoding with rate limiting

**Modified:**
- `package.json` - Added papaparse@^5.5.3

## Performance Notes

- **Geocoding rate limit:** 50 req/s (20ms delay)
- **Batch processing:** Sequential with rate limiting
- **CSV parsing:** Streams data, no memory issues for reasonable file sizes

For 100 addresses: ~2 seconds + network latency

## Security Notes

- Geocoding uses HTTPS (data.geopf.fr)
- No API keys required (public API)
- CSV parsing doesn't execute code (safe)
- Input validation prevents processing invalid data
