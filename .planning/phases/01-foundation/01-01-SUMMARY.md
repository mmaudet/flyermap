---
phase: 01-foundation
plan: 01
subsystem: map-foundation
tags: [vite, leaflet, openstreetmap, geojson]
requires: []
provides:
  - interactive-map-with-boundary
  - commune-boundary-data-layer
  - vite-leaflet-foundation
affects:
  - 02-team-markers
  - 03-zone-drawing
  - 04-assignment-logic
tech-stack:
  added:
    - vite@5.0.8
    - leaflet@1.9.4
  patterns:
    - client-side-geojson-fetch
    - openstreetmap-tiles
    - modular-map-config
key-files:
  created:
    - src/main.js
    - src/map/config.js
    - src/data/commune.js
    - src/style.css
    - index.html
    - vite.config.js
    - package.json
  modified: []
decisions:
  - decision: Use OpenStreetMap tiles as base layer
    rationale: Free, open-source, shows street names clearly for orientation
    alternatives: [Mapbox, Google Maps]
    committed: 2026-02-05
  - decision: Fetch commune boundary from geo.api.gouv.fr at runtime
    rationale: Official French government API, always up-to-date GeoJSON data
    alternatives: [Static GeoJSON file, Local database]
    committed: 2026-02-05
  - decision: Use [lat, lng] coordinate format per Leaflet convention
    rationale: Leaflet's native format, avoids conversion errors
    alternatives: [GeoJSON [lng, lat] format]
    committed: 2026-02-05
metrics:
  tasks-completed: 2
  tasks-total: 2
  commits: 2
  files-created: 7
  files-modified: 0
  duration: 3.8min
  completed: 2026-02-05
---

# Phase 01 Plan 01: Foundation Summary

**One-liner:** Vite + Leaflet interactive map showing Chapet commune with blue boundary polygon from geo.api.gouv.fr

## What Was Built

Created the foundational map application using Vite and Leaflet. The application displays an interactive OpenStreetMap centered on Chapet (78130, Yvelines) with the commune boundary rendered as a blue polygon fetched from the French government's geo.api.gouv.fr API.

### Core Components

1. **Vite Project Structure**
   - Vanilla JavaScript template with ES modules
   - Development server with hot module replacement
   - Production build configuration

2. **Leaflet Map Integration**
   - Interactive map with zoom controls (levels 12-19, default 14)
   - Pan/drag functionality
   - OpenStreetMap tile layer with proper attribution
   - Centered on Chapet coordinates: [48.969, 1.932]

3. **Commune Boundary Layer**
   - Runtime fetch from `https://geo.api.gouv.fr/communes/78140?format=geojson&geometry=contour`
   - Blue border (#2563eb) with 3px weight
   - Light blue fill (#3b82f6) with 10% opacity
   - Automatic GeoJSON rendering via L.geoJSON()

### File Organization

```
map_vivons_chapet/
├── index.html              # Entry point with French locale
├── package.json            # Dependencies: leaflet@1.9.4, vite@5.0.8
├── vite.config.js          # Vite configuration
├── src/
│   ├── main.js            # Map initialization and boundary loading
│   ├── style.css          # Full-viewport map styling
│   ├── map/
│   │   └── config.js      # Chapet coordinates, zoom levels, INSEE code
│   └── data/
│       └── commune.js     # Boundary fetching logic
```

## Decisions Made

### Technical Stack Choices

**Decision 1: Vite as build tool**
- Fast development server with instant HMR
- Native ES modules support
- Simple configuration for vanilla JavaScript
- Alternative considered: Parcel, Webpack (more complex)

**Decision 2: OpenStreetMap tiles**
- Free and open-source
- Street names visible for user orientation (critical requirement)
- No API key required
- Alternatives: Mapbox (requires key), Google Maps (costly)

**Decision 3: Runtime GeoJSON fetch from geo.api.gouv.fr**
- Official French government API
- Always returns current boundary data
- No need to maintain static files
- GeoJSON format natively supported by Leaflet
- Alternatives: Static GeoJSON file (outdated risk), local database (overkill)

### Implementation Patterns

**Decision 4: Coordinate format convention**
- Followed Leaflet's [latitude, longitude] format in config
- Leaflet's L.geoJSON() automatically handles GeoJSON's [lng, lat] conversion
- Prevents common coordinate swap bugs
- Documented in comments for maintainability

**Decision 5: Modular file structure**
- Separated configuration (map/config.js) from logic (main.js)
- Isolated data fetching (data/commune.js) for reusability
- Future-proof: new data layers can follow same pattern
- Makes testing easier in future phases

**Decision 6: Styling approach**
- Full-viewport map (100vh height, 100% width)
- Blue color scheme (#2563eb, #3b82f6) for commune boundary
- 10% fill opacity: shows boundary without obscuring map details
- Visual hierarchy: boundary visible but not dominant

## Deviations from Plan

None - plan executed exactly as written.

All planned files created, all verification criteria met, no blocking issues encountered.

## Validation Results

### Manual Verification

Ran development server and confirmed:
- ✅ Map centered on Chapet (48.969, 1.932)
- ✅ Zoom controls visible and functional (levels 12-19)
- ✅ Pan/drag works smoothly
- ✅ Blue commune boundary polygon renders correctly
- ✅ Street names readable on OSM tiles (Rue de la Mairie, etc.)
- ✅ OpenStreetMap attribution displayed in bottom-right

### Console Checks

- No JavaScript errors
- No failed network requests
- GeoJSON fetch from geo.api.gouv.fr succeeds
- All imports resolve correctly

### Code Quality

- Follows ES6 module pattern
- Proper error handling in boundary fetch
- Clear comments explaining coordinate formats
- Attribution included per OSM requirements
- .gitignore properly excludes node_modules and build artifacts

## Success Criteria Met

All three Phase 1 success criteria validated:

1. ✅ **User can see an interactive map centered on Chapet (78130) with zoom and pan controls**
   - Map initializes at [48.969, 1.932] zoom level 14
   - Zoom controls visible and functional (12-19 range)
   - Pan/drag enabled by default

2. ✅ **Chapet commune boundary displays as a visible polygon on the map**
   - Blue polygon renders from geo.api.gouv.fr GeoJSON
   - Border: #2563eb, 3px weight
   - Fill: #3b82f6 at 10% opacity

3. ✅ **Street names are visible on the map tiles for orientation**
   - OpenStreetMap tiles include street labels
   - Readable at default zoom level (14)
   - Attribution properly displayed

## Next Phase Readiness

### Phase 2 Prerequisites

Phase 2 (Team Markers) can begin immediately. This phase provides:

- ✅ Working Leaflet map instance (exported if needed)
- ✅ Coordinate system established (WGS84/EPSG:4326)
- ✅ Map configuration pattern (map/config.js)
- ✅ Data fetching pattern (data/commune.js)
- ✅ Development environment ready (Vite server)

### Potential Issues

None identified. Foundation is stable.

### Recommendations for Phase 2

1. Follow established patterns:
   - Add team data fetching in `src/data/teams.js`
   - Add marker configuration in `src/map/markers.js`

2. Coordinate format:
   - Continue using [lat, lng] format for Leaflet
   - Document if data source uses different format

3. Testing:
   - Consider adding test data file for offline development
   - Prevents API dependency during iteration

## Artifacts

### Commits

1. **a2fa880** - `chore(01-01): create Vite project with Leaflet`
   - Initialized Vite with vanilla template
   - Installed Leaflet 1.9.4
   - Created HTML entry point and styling
   - Files: package.json, vite.config.js, index.html, src/style.css, .gitignore

2. **6c8c6e9** - `feat(01-01): initialize Leaflet map with commune boundary`
   - Created map configuration with Chapet coordinates
   - Implemented boundary fetching from geo.api.gouv.fr
   - Initialized interactive map with OSM tiles
   - Files: src/main.js, src/map/config.js, src/data/commune.js

### Key Files Created

| File | Purpose | Key Exports/Content |
|------|---------|-------------------|
| `src/main.js` | Map initialization | Leaflet map instance, boundary rendering |
| `src/map/config.js` | Map configuration | CHAPET_CENTER, zoom levels, INSEE code |
| `src/data/commune.js` | Data fetching | fetchCommuneBoundary() function |
| `src/style.css` | Map styling | Full-viewport layout |
| `index.html` | Entry point | Map container div, module script |
| `vite.config.js` | Build config | Dev server port 5173 |
| `package.json` | Dependencies | leaflet@1.9.4, vite@5.0.8 |

### Dependencies Added

```json
{
  "dependencies": {
    "leaflet": "1.9.4"
  },
  "devDependencies": {
    "vite": "^5.0.8"
  }
}
```

## Lessons Learned

### What Went Well

1. **Modular structure paid off immediately**
   - Clean separation between config, data, and presentation
   - Easy to understand and modify
   - Sets good pattern for future phases

2. **Leaflet coordinate convention documented**
   - Comments prevent future confusion
   - Critical for debugging coordinate issues

3. **Government API integration smooth**
   - geo.api.gouv.fr API worked perfectly
   - GeoJSON format ideal for Leaflet
   - No authentication required

### Technical Notes

1. **CSS import order matters**
   - Must import `leaflet/dist/leaflet.css` before custom styles
   - Vite handles CSS bundling automatically

2. **L.geoJSON() handles coordinate conversion**
   - GeoJSON uses [lng, lat]
   - Leaflet uses [lat, lng]
   - L.geoJSON() converts automatically - don't manually swap

3. **OSM attribution is mandatory**
   - Included per OpenStreetMap license
   - Critical for legal compliance

### Future Considerations

1. **Error states**
   - Currently logs to console if boundary fetch fails
   - Phase 2+ might want user-visible error messages

2. **Loading states**
   - Map renders immediately, boundary loads asynchronously
   - Future: consider loading indicator for boundary

3. **Performance**
   - Single commune boundary is lightweight
   - Future phases with many markers may need clustering

## Duration

**Total execution time:** 3.8 minutes (228 seconds)

- Task 1 (Vite + Leaflet setup): ~2 min
- Task 2 (Map initialization): ~1.8 min
- Verification and documentation: concurrent

## Links

- [Leaflet Documentation](https://leafletjs.com/)
- [geo.api.gouv.fr Documentation](https://geo.api.gouv.fr/)
- [OpenStreetMap Attribution](https://www.openstreetmap.org/copyright)
- [Vite Documentation](https://vitejs.dev/)
