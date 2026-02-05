---
phase: 02-team-management
plan: 01
subsystem: infrastructure
tags: [storage, state-management, pubsub, markers, leaflet]
requires: [01-01]
provides: [storage-wrapper, state-manager, colored-markers]
affects: [02-02, 02-03, 02-04]
tech-stack:
  added: []
  patterns: [pubsub, singleton, debouncing, defensive-programming]
key-files:
  created:
    - src/data/storage.js
    - src/state/store.js
    - src/map/markerStyles.js
  modified:
    - src/style.css
decisions:
  - id: defensive-storage
    choice: Wrap all localStorage operations in try-catch
    rationale: Handle QuotaExceededError and private browsing gracefully
  - id: pubsub-pattern
    choice: Event-driven state updates
    rationale: Decouples state mutations from UI reactions
  - id: debounced-persistence
    choice: 500ms debounce on localStorage writes
    rationale: Avoid thrashing localStorage on rapid state changes
  - id: divicon-markers
    choice: CSS-based DivIcon instead of image files
    rationale: No asset loading, fully customizable with CSS
metrics:
  duration: "1.8 min"
  completed: 2026-02-05
---

# Phase 02 Plan 01: Core Infrastructure Summary

**One-liner:** Defensive LocalStorage wrapper, PubSub state manager with 500ms debounced persistence, and CSS-based colored DivIcon markers for team members

## What Was Built

### 1. Defensive LocalStorage Wrapper (src/data/storage.js)

**Exports:** `storage` (singleton instance)

**Key capabilities:**
- `save(key, data)` - Returns `{success: boolean, error?: string}` instead of throwing
- `load(key)` - JSON.parse with try-catch, returns null on failure
- `remove(key)` - Removes key with error handling
- `isNearQuota(newData)` - Warns at 80% of 5MB quota
- Handles QuotaExceededError (code 22/1014) and private browsing mode

**Error handling:**
- QuotaExceededError → `{success: false, error: 'QUOTA_EXCEEDED'}`
- Other failures → `{success: false, error: 'STORAGE_FAILED'}`
- Console logging for all errors

### 2. PubSub State Manager (src/state/store.js)

**Exports:** `store` (singleton), `subscribe` (helper function)

**Key capabilities:**
- Manages `teamMembers` array with CRUD operations
- Auto-generates unique IDs: `Date.now().toString(36) + Math.random().toString(36).substr(2)`
- Debounced persistence (500ms) to localStorage via storage wrapper
- Loads initial state from localStorage on construction
- PubSub events: `teamMemberAdded`, `teamMemberRemoved`, `teamMemberUpdated`, `teamMembersLoaded`

**API:**
- `getTeamMembers()` - Returns copy of array
- `addTeamMember(member)` - Adds with auto-generated ID, publishes event, debounces save
- `removeTeamMember(id)` - Removes by ID, publishes event, debounces save
- `updateTeamMember(id, updates)` - Updates by ID, adds `updatedAt` timestamp, publishes event
- `subscribe(event, callback)` - Returns unsubscribe function

### 3. Colored Marker Styles (src/map/markerStyles.js + src/style.css)

**Exports:** `createColoredMarker(color, label)`, `getTeamMemberColor(index)`

**Key capabilities:**
- 8-color palette: magenta, blue, green, orange, purple, cyan, red, yellow
- Pin-shaped markers using CSS `border-radius: 50% 50% 50% 0` and `rotate(-45deg)`
- White circle overlay using `::after` pseudo-element
- Team member name labels (truncated at 60px with ellipsis)
- No image files - pure CSS implementation

**CSS classes:**
- `.custom-div-icon` - Transparent container
- `.marker-pin` - Pin shape with background color
- `.marker-pin::after` - White circle overlay
- `.marker-label` - Name label below pin

## Decisions Made

### 1. Defensive Storage Pattern

**Decision:** Wrap all localStorage operations in try-catch, return result objects instead of throwing

**Rationale:**
- QuotaExceededError can occur unpredictably
- Private browsing mode blocks localStorage entirely in some browsers
- Silent failures are worse than explicit error handling
- Caller can decide how to handle storage failures

**Impact:** All storage operations are safe to call without try-catch

### 2. PubSub Event System

**Decision:** Use event-driven architecture for state changes

**Rationale:**
- Decouples state mutations from UI reactions
- Multiple subscribers can listen to same events
- Easy to add logging, analytics, or debugging listeners
- Standard pattern for state management

**Impact:** Future UI components will subscribe to store events rather than polling

### 3. Debounced Persistence

**Decision:** 500ms debounce on localStorage writes

**Rationale:**
- Avoid thrashing localStorage during rapid state changes
- Reduces write operations (important for flash storage longevity)
- Still fast enough that user won't notice delay

**Trade-off:** Up to 500ms of unsaved changes in memory (acceptable for this use case)

**Impact:** High-frequency updates (drag operations, bulk edits) won't cause performance issues

### 4. DivIcon Instead of Image Files

**Decision:** Use Leaflet's DivIcon with CSS styling instead of PNG marker images

**Rationale:**
- No asset loading time
- Fully customizable with CSS (colors, sizes, shapes)
- Easier to generate dynamic markers (one function, not 8 image files)
- Scales perfectly at any zoom level

**Impact:** Marker creation is synchronous and lightweight

## Technical Notes

### Storage Implementation Details

1. **Quota calculation:**
   - Iterates all localStorage keys
   - Sums `(key.length + value.length) * 2` for UTF-16 encoding
   - Assumes 5MB typical quota limit
   - Warns at 80% usage threshold

2. **Error codes:**
   - Code 22: Most browsers (Chrome, Safari, Edge)
   - Code 1014: Firefox
   - Name check: `error.name === 'QuotaExceededError'` as fallback

### State Manager Implementation Details

1. **ID generation:**
   - `Date.now().toString(36)` - Timestamp in base-36 (8 chars)
   - `Math.random().toString(36).substr(2)` - Random string (10 chars)
   - Combined: ~18 character unique ID

2. **Debounce implementation:**
   - Stores timer ID in `this.saveTimer`
   - Clears previous timer on each state change
   - Saves only after 500ms of inactivity

3. **Event safety:**
   - Wraps callbacks in try-catch to prevent one handler from breaking others

### Marker Styling Implementation

1. **Pin shape technique:**
   - Circle (`border-radius: 50%`) with one corner sharp (`50% 50% 50% 0`)
   - Rotated -45deg to point downward
   - White circle overlay using `::after` pseudo-element

2. **Positioning:**
   - `iconAnchor: [15, 42]` - Bottom center of pin
   - `popupAnchor: [0, -42]` - Popup appears above pin
   - Label positioned `top: 35px` relative to pin center

## Verification Results

All verification criteria met:

- [x] Storage module exports default Storage instance with save/load/remove methods
- [x] Store module exports store and subscribe, manages teamMembers array
- [x] MarkerStyles module exports createColoredMarker and getTeamMemberColor
- [x] CSS includes .marker-pin and .marker-label styles
- [x] Data persists across page refresh (via store → storage integration)

**Manual testing:**
```javascript
// Storage wrapper
import storage from './src/data/storage.js';
storage.save('test', {a: 1}); // {success: true}
storage.load('test');          // {a: 1}

// State manager
import { store, subscribe } from './src/state/store.js';
subscribe('teamMemberAdded', (m) => console.log('Added:', m));
store.addTeamMember({name: 'Test', address: '1 rue Test'});
store.getTeamMembers(); // [{id: '...', name: 'Test', ...}]

// Colored markers
import L from 'leaflet';
import { createColoredMarker, getTeamMemberColor } from './src/map/markerStyles.js';
const icon = createColoredMarker(getTeamMemberColor(0), 'Jean');
L.marker([48.969, 1.932], {icon}).addTo(map);
```

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Blockers:** None

**Ready for:** 02-02 (CSV import service), 02-03 (UI components), 02-04 (map integration)

**Dependencies provided:**
- Storage wrapper ready for import by any module needing persistence
- State manager ready to coordinate all team member operations
- Colored markers ready for map display

**Integration points:**
- CSV import will use `store.addTeamMember()`
- UI components will use `subscribe()` to listen for state changes
- Map integration will use `createColoredMarker()` to display team members

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create defensive LocalStorage wrapper | abffae7 | src/data/storage.js |
| 2 | Create PubSub state manager with debounced persistence | 7acc23f | src/state/store.js |
| 3 | Create colored marker styles with DivIcon | a445edd | src/map/markerStyles.js, src/style.css |

**Completion:** 3/3 tasks completed in 1.8 minutes
