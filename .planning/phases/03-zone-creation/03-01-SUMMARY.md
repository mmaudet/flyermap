---
phase: 03-zone-creation
plan: 01
title: "Geoman Integration and Zone State Infrastructure"
subsystem: zone-management
tags: [leaflet-geoman, state-management, crud, drawing-tools]
requires: [02-03]
provides: ["zone CRUD operations", "polygon drawing controls", "zone persistence"]
affects: [03-02, 03-03]
tech-stack:
  added: ["@geoman-io/leaflet-geoman-free@2.19.2"]
  patterns: ["zone CRUD methods", "FeatureGroup for zone management"]
key-files:
  created: ["src/map/zoneLayer.js"]
  modified: ["package.json", "src/state/store.js", "src/main.js"]
decisions: []
metrics:
  duration: "2m 15s"
  completed: "2026-02-05"
---

# Phase 03 Plan 01: Geoman Integration and Zone State Infrastructure Summary

**One-liner:** Integrated Leaflet-Geoman polygon controls and extended state store with zone CRUD operations and localStorage persistence

## Objective

Set up Leaflet-Geoman and zone state management infrastructure to enable drawing, editing, and persisting polygon zones.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install Leaflet-Geoman and extend store with zone CRUD | ed5c4d1 | package.json, package-lock.json, src/state/store.js |
| 2 | Create zoneLayer.js with Geoman initialization | 99b0627 | src/map/zoneLayer.js |
| 3 | Wire zoneLayer into main.js and verify controls | a051caa | src/main.js |

## What Was Delivered

### Core Infrastructure

**Leaflet-Geoman Integration**
- Installed @geoman-io/leaflet-geoman-free@2.19.2
- Created src/map/zoneLayer.js with Geoman controls
- Configured drawing controls (polygon only, edit mode, removal mode)
- Set global options: red styling (#ef4444 border, #fca5a5 fill), snapping enabled, self-intersection disabled
- Controls positioned at topleft alongside existing marker controls

**Zone State Management**
- Extended store.js state to include zones array
- Implemented zone CRUD methods following existing teamMember pattern:
  - `getZones()` - returns copy of zones array
  - `addZone(zone)` - adds zone with id, name, geojson, createdAt
  - `updateZone(id, updates)` - updates zone by id with updatedAt timestamp
  - `removeZone(id)` - removes zone by id
- Added zone events: zoneAdded, zoneUpdated, zoneRemoved, zonesLoaded
- Updated storage key from 'vivons_chapet_team' to 'vivons_chapet_data' to support both teamMembers and zones

**Integration**
- Wired initZoneLayer into main.js after marker layer initialization
- Module-level architecture: map reference, zoneGroup FeatureGroup, layersByZoneId Map
- Event handlers (pm:create, pm:edit, pm:remove) deferred to Plan 03-02

## Technical Decisions

### Storage Key Migration
**Decision:** Changed STORAGE_KEY from 'vivons_chapet_team' to 'vivons_chapet_data'
**Rationale:** The state now includes both teamMembers and zones, so a more generic key name is appropriate
**Impact:** Maintains backward compatibility - existing teamMembers data loads correctly under new key structure

### Zone Styling
**Decision:** Red color scheme (border #ef4444, fill #fca5a5) with 0.2 opacity
**Rationale:** Distinct from blue commune boundary (#2563eb) to clearly differentiate zones
**Impact:** Zones visually distinguishable from commune boundary on map

### Geoman Control Configuration
**Decision:** Enable only polygon drawing, edit mode, and removal mode
**Rationale:** Zones are polygons only; other shape tools (markers, circles, rectangles, polylines) would clutter UI
**Impact:** Clean, focused toolbar for zone management

### Self-Intersection Prevention
**Decision:** Set allowSelfIntersection: false
**Rationale:** Self-intersecting polygons cause issues with area calculations and GeoJSON validity
**Impact:** Users cannot create invalid polygon geometries

## Verification Results

### Automated Checks
- ✓ Leaflet-Geoman 2.19.2 installed and listed in package.json
- ✓ Store has zones array in state (line 61)
- ✓ All 4 zone CRUD methods exist (getZones, addZone, updateZone, removeZone)
- ✓ initZoneLayer imported and called in main.js
- ✓ Dev server runs without errors
- ✓ zoneLayer.js exports initZoneLayer function
- ✓ Geoman CSS imported for control styling

### Manual Verification (expected from user)
- Geoman toolbar visible on left side of map with polygon draw button
- Edit and trash buttons present for zone management
- Clicking polygon button changes cursor to crosshair mode
- Existing marker functionality intact and unaffected

### Console Test (for store methods)
```javascript
const { store } = await import('./src/state/store.js');
store.addZone({ name: 'Test Zone', geojson: {} });
console.log(store.getZones()); // Shows array with test zone
```

## Dependencies

**Requires:**
- Phase 02-03: Marker layer and map infrastructure

**Provides for next plans:**
- Zone CRUD operations for Plan 03-02 (event handling)
- Zone persistence for Plan 03-03 (zone restoration on load)

**Affects:**
- Plan 03-02: Will add pm:create, pm:edit, pm:remove event handlers
- Plan 03-03: Will load and display existing zones from localStorage

## Files Changed

### Created
- `src/map/zoneLayer.js` (60 lines) - Zone layer management with Geoman initialization

### Modified
- `package.json` - Added @geoman-io/leaflet-geoman-free dependency
- `package-lock.json` - 28 new packages (Geoman and dependencies)
- `src/state/store.js` - Added zones state, zone CRUD methods, updated storage key
- `src/main.js` - Imported and initialized zoneLayer

## Code Architecture

### Module Organization
```
src/map/zoneLayer.js
├── Imports: leaflet, geoman, geoman.css, store
├── Module variables: map, zoneGroup, layersByZoneId
├── Constants: ZONE_STYLE
└── Export: initZoneLayer(mapInstance)
    ├── Creates FeatureGroup
    ├── Adds Geoman controls
    └── Sets global drawing options
```

### State Flow
```
User action → Geoman event (03-02) → Store method → PubSub event → Persistence
                                                                    ↓
                                                              localStorage
```

## Known Limitations

1. **No event handlers yet** - Drawing polygons creates layers but doesn't persist to store (will be added in Plan 03-02)
2. **No zone restoration** - Existing zones in localStorage not displayed on map load (will be added in Plan 03-03)
3. **No zone naming UI** - Zones created without names until naming dialog added (future enhancement)

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Blockers:** None

**Concerns:** None

**Ready for Plan 03-02:** Yes - all prerequisites met
- Geoman controls functional
- Store has zone CRUD methods
- zoneGroup FeatureGroup ready for layer management
- layersByZoneId Map ready for bidirectional layer-zone tracking
