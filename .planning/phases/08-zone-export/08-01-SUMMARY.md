---
plan: 08-01
status: complete
duration: 1.2 min
---

# Summary: Install dependencies, extend Overpass for streets, map capture utility

## Completed Tasks

### Task 1: Install export dependencies and extend Overpass service
- Installed jspdf and leaflet-simple-map-screenshoter via npm
- Extended `src/services/overpass.js` with `getStreetsInBbox` function
- Queries Overpass API for named highways within zone bounding box
- Returns sorted unique street names with French locale

### Task 2: Create map capture utility
- Created `src/utils/mapCapture.js` with `captureZoneMap` function
- Uses SimpleMapScreenshoter to capture zone map as PNG blob
- Stores/restores map view, fits to zone bounds, waits for tiles

## Files Modified
- `package.json` - added jspdf and leaflet-simple-map-screenshoter
- `src/services/overpass.js` - added getStreetsInBbox export
- `src/utils/mapCapture.js` - new file with captureZoneMap export

## Verification
- [x] npm run build succeeds
- [x] getStreetsInBbox exported from overpass.js
- [x] captureZoneMap exported from mapCapture.js
- [x] SimpleMapScreenshoter imported and used

## Next
Wave 2: 08-02-PLAN.md - Zone export service (PDF and CSV generation)

---
*Completed: 2026-02-05*
