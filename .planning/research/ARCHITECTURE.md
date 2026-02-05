# Architecture Patterns: Leaflet Zone Management Applications

**Domain:** Interactive web mapping with zone management
**Researched:** 2026-02-05
**Confidence:** HIGH

## Executive Summary

Leaflet-based zone management applications follow a layered architecture with clear separation between map rendering, data management, and user interaction. The core pattern centers on a centralized map instance orchestrating specialized layer groups (markers for team members, vector layers for zones), with GeoJSON serving as the universal data format for both persistence and inter-layer communication. For static-hosted applications without backends, LocalStorage provides persistence while maintaining simplicity.

## Recommended Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│  (Business Logic: Assignment, Validation, Workflows)    │
└────────────────────┬────────────────────────────────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
    ▼                ▼                ▼
┌──────────┐  ┌──────────┐  ┌──────────────┐
│  State   │  │   Map    │  │    Data      │
│ Manager  │◄─┤ Controller│◄─┤ Persistence  │
└──────────┘  └──────────┘  └──────────────┘
    │              │                │
    │         ┌────┴─────┐         │
    │         ▼          ▼         │
    │    ┌────────┐ ┌────────┐    │
    └───►│ Layers │ │Controls│◄───┘
         └────────┘ └────────┘
              │
         ┌────┴─────┐
         ▼          ▼
    ┌────────┐ ┌────────┐
    │ Markers│ │ Zones  │
    │(Team)  │ │(Polys) │
    └────────┘ └────────┘
```

### Core Architectural Principle

**Single Map Instance, Multiple Specialized Layer Groups**: All visual elements exist as layers within one Leaflet map, with FeatureGroups providing logical separation and batch operations.

## Component Boundaries

| Component | Responsibility | Communicates With | Exports |
|-----------|---------------|-------------------|---------|
| **Map Controller** | Initializes map, manages zoom/pan state, coordinates layer lifecycle | All layers, State Manager, Controls | Map instance reference |
| **Layer Manager: Team Markers** | Creates/updates/removes team member markers, handles marker interactions | Map Controller, State Manager | Marker FeatureGroup |
| **Layer Manager: Zones** | Creates/updates/removes zone polygons, handles drawing/editing | Map Controller, State Manager, Leaflet.draw | Editable FeatureGroup |
| **Layer Manager: Boundaries** | Loads and displays commune boundaries from GeoJSON | Map Controller, Data Loader | Boundary Layer |
| **State Manager** | Central truth store for application state (team members, zones, assignments) | All Layer Managers, Persistence Layer, Application Logic | State accessor API |
| **Persistence Layer** | Serializes/deserializes state to LocalStorage, handles migrations | State Manager | save(), load(), clear() |
| **Drawing Control** | Provides UI for polygon creation/editing (Leaflet.draw) | Zones Layer Manager, Map Controller | Drawing event handlers |
| **Assignment Logic** | Determines team-to-zone assignments, validates constraints | State Manager, Layers | Assignment functions |
| **Geocoding Service** | Interfaces with French geocoding API, resolves addresses | Team Markers Layer Manager | geocode(), reverseGeocode() |

### Component Interaction Rules

1. **Map Controller is the Hub**: No direct layer-to-layer communication. All coordination flows through Map Controller.
2. **State Manager is Single Source of Truth**: Layers read state but don't modify it directly—they dispatch changes.
3. **Persistence is Async Boundary**: State changes trigger debounced saves; loads are initialization-time only.
4. **Events Flow Upward**: User interactions (click marker, edit zone) emit events that bubble to Application Layer.

## Data Flow

### Initialization Flow (Application Start)

```
1. Persistence Layer loads from LocalStorage → returns JSON state
2. State Manager initializes from loaded data (or defaults)
3. Map Controller creates Leaflet map instance
4. Layer Managers query State Manager for their data:
   - Team Markers Layer fetches team members array
   - Zones Layer fetches zones array
   - Boundaries Layer fetches commune boundary GeoJSON
5. Each Layer Manager populates its FeatureGroup
6. FeatureGroups added to Map Controller
7. Drawing Control attached to map
```

**Key Pattern**: State hydration before rendering. All data flows from State Manager → Layers, never reverse during initialization.

### User Interaction Flow (Drawing a New Zone)

```
1. User clicks polygon tool in Drawing Control
2. User draws polygon on map → Leaflet.draw emits 'draw:created' event
3. Zones Layer Manager catches event:
   - Extracts GeoJSON from layer
   - Generates unique ID
   - Dispatches to State Manager: addZone(id, geojson, metadata)
4. State Manager updates internal state
5. State Manager emits 'state:changed' event
6. Persistence Layer catches event → debounced save to LocalStorage
7. Any dependent UI (assignment panel) re-renders from new state
```

**Key Pattern**: Event-driven state updates. UI actions → Events → State mutations → Persistence → UI refresh.

### Assignment Flow (Assigning Team Member to Zone)

```
1. User drags team marker into zone (or uses assignment UI)
2. Application Logic detects spatial relationship:
   - Gets marker coordinates
   - Gets all zone polygons from State Manager
   - Uses Leaflet's contains() or Turf.js for point-in-polygon test
3. Application Logic validates assignment:
   - Check if member already assigned
   - Check zone capacity constraints (if any)
4. If valid, dispatches to State Manager: assignMemberToZone(memberId, zoneId)
5. State Manager:
   - Updates zone.assignedMembers array
   - Updates member.assignedZone property
6. State Manager emits 'state:changed'
7. Persistence Layer saves
8. Layers update visuals:
   - Marker changes color/icon to show assignment
   - Zone polygon style updates to show occupancy
```

**Key Pattern**: Application Logic orchestrates complex operations across multiple state domains. Layers are presentational.

### Data Persistence Flow

```
State Manager (in-memory JavaScript objects)
         ↓ (on change)
    Serializer (JSON.stringify with transforms)
         ↓
   LocalStorage.setItem('map-app-state', json)

On load:
   LocalStorage.getItem('map-app-state')
         ↓
    Deserializer (JSON.parse + validation)
         ↓
State Manager (reconstructed state)
```

**Schema Example**:
```javascript
{
  version: "1.0.0",
  lastUpdated: "2026-02-05T14:30:00Z",
  teamMembers: [
    { id: "tm-1", name: "Alice", coords: [48.8566, 2.3522], assignedZone: "zone-1" }
  ],
  zones: [
    { id: "zone-1", name: "Zone Nord", geojson: {...}, assignedMembers: ["tm-1"] }
  ],
  boundaries: { geojson: {...} }  // Commune boundaries
}
```

## Suggested Build Order

Build order follows dependency chains and validation opportunities:

### Phase 1: Foundation (Map + Static Layers)
**Build first**: Map Controller + Boundaries Layer
- **Why first**: Establishes coordinate system, verifies tile loading, provides geographic context
- **Validation**: Can you see a map with commune boundaries?
- **Dependencies**: None (pure Leaflet + GeoJSON)
- **Deliverable**: Static map displaying commune boundaries from local or API-fetched GeoJSON

### Phase 2: State Infrastructure
**Build second**: State Manager + Persistence Layer
- **Why second**: Foundation for all dynamic data before adding interactive layers
- **Validation**: Can you save/load a simple object to LocalStorage?
- **Dependencies**: Phase 1 (need map container for testing)
- **Deliverable**: State management API with LocalStorage round-trip working

### Phase 3: Team Markers Layer
**Build third**: Team Markers Layer Manager + Geocoding integration
- **Why third**: Simpler than zones (points vs polygons), validates State → Layer rendering
- **Validation**: Can you add a marker, see it on map, refresh page and see it persisted?
- **Dependencies**: Phase 2 (needs state infrastructure)
- **Deliverable**: Add/remove team members with geocoded positions, persisted across sessions

### Phase 4: Drawing Control
**Build fourth**: Zones Layer Manager + Leaflet.draw integration
- **Why fourth**: Most complex layer, requires understanding of FeatureGroup editing
- **Validation**: Can you draw, edit, and delete polygons with persistence?
- **Dependencies**: Phase 2 & 3 (needs state + understanding of layer patterns from markers)
- **Deliverable**: Full drawing/editing capabilities with zone persistence

### Phase 5: Assignment Logic
**Build fifth**: Application Logic for team-to-zone assignments
- **Why fifth**: Requires both markers and zones to exist
- **Validation**: Can you assign a team member to a zone and see visual feedback?
- **Dependencies**: Phase 3 & 4 (needs both layer types)
- **Deliverable**: Functional assignment system with validation rules

### Phase 6: UI Polish
**Build last**: Custom controls, styling, assignment panel UI
- **Why last**: Pure presentation layer, no new architectural patterns
- **Dependencies**: Phase 5 (all functionality working)
- **Deliverable**: Production-ready user interface

**Critical Path Dependencies**:
```
Phase 1 (Map) → Phase 2 (State) → Phase 3 (Markers)
                                         ↓
Phase 1 (Map) → Phase 2 (State) → Phase 4 (Zones)
                                         ↓
                                  Phase 5 (Assignment) → Phase 6 (UI)
```

## Patterns to Follow

### Pattern 1: FeatureGroup Segregation
**What**: Separate FeatureGroups for each logical layer type
**When**: Always. Prevents layer interference and enables batch operations.
**Example**:
```javascript
const teamMarkersGroup = L.featureGroup();
const zonesGroup = L.featureGroup();
const boundariesGroup = L.featureGroup();

map.addLayer(teamMarkersGroup);
map.addLayer(zonesGroup);
map.addLayer(boundariesGroup);

// Later: batch operations per group
zonesGroup.clearLayers();  // Remove all zones without touching markers
```

### Pattern 2: GeoJSON as Universal Data Format
**What**: All geographic data stored and transmitted as GeoJSON
**When**: For zones, boundaries, and any vector data requiring persistence
**Example**:
```javascript
// Drawing event provides Leaflet layer
const layer = e.layer;

// Convert to GeoJSON for storage
const geojson = layer.toGeoJSON();

// Store in state
stateManager.addZone({
  id: generateId(),
  geojson: geojson,
  name: "Zone name"
});

// Later: reconstruct from GeoJSON
L.geoJSON(zone.geojson).addTo(zonesGroup);
```
**Why**: GeoJSON is portable, human-readable, compatible with all geo tools, and Leaflet has native support.

### Pattern 3: Debounced LocalStorage Writes
**What**: Batch state changes and delay writes to avoid thrashing storage
**When**: For all state mutations during user interactions (drawing, dragging)
**Example**:
```javascript
class PersistenceLayer {
  constructor() {
    this.saveTimeout = null;
    this.DEBOUNCE_MS = 500;
  }

  onStateChanged(state) {
    clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => {
      localStorage.setItem('app-state', JSON.stringify(state));
    }, this.DEBOUNCE_MS);
  }
}
```
**Why**: LocalStorage writes are synchronous and block the main thread. Debouncing during active editing improves responsiveness.

### Pattern 4: Event-Driven Layer Updates
**What**: Layers subscribe to state change events rather than polling
**When**: Any time state changes should reflect in the map
**Example**:
```javascript
class TeamMarkersLayer {
  constructor(map, stateManager) {
    this.featureGroup = L.featureGroup().addTo(map);

    stateManager.on('teamMembers:changed', (members) => {
      this.render(members);
    });
  }

  render(members) {
    this.featureGroup.clearLayers();
    members.forEach(member => {
      const marker = L.marker(member.coords)
        .bindPopup(member.name);
      this.featureGroup.addLayer(marker);
    });
  }
}
```

### Pattern 5: Optimistic UI Updates
**What**: Update UI immediately on user action, before persistence completes
**When**: All user interactions (drawing, editing, assigning)
**Example**:
```javascript
function assignMemberToZone(memberId, zoneId) {
  // 1. Immediate UI update
  updateMarkerStyle(memberId, 'assigned');
  updateZoneStyle(zoneId, 'occupied');

  // 2. State update (triggers async save)
  stateManager.assignMember(memberId, zoneId);

  // 3. No need to wait for LocalStorage write
}
```
**Why**: LocalStorage is fast enough that save failures are rare. Optimistic updates feel instant.

### Pattern 6: Layer Factory Functions
**What**: Factory functions that encapsulate layer creation logic
**When**: For complex layers with multiple style variations
**Example**:
```javascript
function createTeamMarker(member, options = {}) {
  const isAssigned = !!member.assignedZone;
  const icon = isAssigned ? assignedIcon : unassignedIcon;

  return L.marker(member.coords, {
    icon: icon,
    draggable: options.draggable || false,
    memberId: member.id  // Custom property for event handlers
  }).bindPopup(`
    <strong>${member.name}</strong><br>
    ${isAssigned ? `Zone: ${member.assignedZone}` : 'Unassigned'}
  `);
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Bypassing State Manager
**What**: Directly modifying layer properties and assuming state will sync
**Why bad**: Creates divergence between map visuals and stored state. After page refresh, changes are lost.
**Instead**: All mutations flow through State Manager:
```javascript
// BAD
marker.setLatLng(newCoords);
// State and storage now out of sync!

// GOOD
stateManager.updateMemberPosition(memberId, newCoords);
// State Manager updates internal state, triggers persistence,
// and emits event that causes layer to update
```

### Anti-Pattern 2: Storing Leaflet Layer Objects
**What**: Saving Leaflet layer instances (L.marker, L.polygon) in state or LocalStorage
**Why bad**: Leaflet layers are complex objects with circular references and methods. They don't serialize to JSON.
**Instead**: Store minimal data (coordinates, GeoJSON) and reconstruct layers on demand:
```javascript
// BAD
const state = {
  markers: [leafletMarkerInstance]  // Won't serialize!
};

// GOOD
const state = {
  teamMembers: [
    { id: 'tm-1', name: 'Alice', coords: [48.8566, 2.3522] }
  ]
};
// Reconstruct marker from data when needed
```

### Anti-Pattern 3: Global State Variables
**What**: Using scattered global variables for map, layers, and state
**Why bad**: Makes testing impossible, causes naming collisions, obscures dependencies
**Instead**: Use module pattern or simple class to encapsulate:
```javascript
// BAD
let map;
let markers = [];
let zones = [];
function init() { map = L.map('map'); }

// GOOD
class MapApplication {
  constructor(containerId) {
    this.map = L.map(containerId);
    this.stateManager = new StateManager();
    this.layerManagers = {
      markers: new TeamMarkersLayer(this.map, this.stateManager),
      zones: new ZonesLayer(this.map, this.stateManager)
    };
  }
}
```

### Anti-Pattern 4: Synchronous Geocoding in Loops
**What**: Calling geocoding API inside loops without batching or rate limiting
**Why bad**: Geocoding APIs have rate limits. Rapid sequential calls cause failures.
**Instead**: Batch geocoding requests or implement queue with delays:
```javascript
// BAD
teamMembers.forEach(member => {
  geocode(member.address);  // Slams API!
});

// GOOD
const queue = new GeocodingQueue({ delayMs: 100 });
teamMembers.forEach(member => {
  queue.add(member.address).then(coords => {
    stateManager.updateMemberCoords(member.id, coords);
  });
});
```

### Anti-Pattern 5: Mixing Business Logic in Layer Classes
**What**: Putting assignment rules, validation, or domain logic inside layer managers
**Why bad**: Layers should be purely presentational. Business logic mixed with rendering makes testing and reuse difficult.
**Instead**: Keep layers dumb, logic in application layer:
```javascript
// BAD - assignment logic in layer
class ZonesLayer {
  assignMember(memberId, zoneId) {
    if (this.zones[zoneId].members.length >= 5) return;  // Business rule!
    // ...render logic...
  }
}

// GOOD - layer just renders
class ZonesLayer {
  highlightZone(zoneId) { /* pure rendering */ }
}

// Business logic separate
class AssignmentService {
  canAssign(memberId, zoneId) {
    const zone = stateManager.getZone(zoneId);
    return zone.members.length < 5;  // Rule lives here
  }
}
```

## Implementation Checklist

### Initialization Phase
- [ ] Map container in HTML with explicit height (Leaflet requires height in CSS)
- [ ] Tile layer configured (OpenStreetMap or other provider)
- [ ] Initial viewport set to appropriate bounds (center on commune)
- [ ] State Manager instantiated with default empty state
- [ ] Persistence Layer checks LocalStorage for existing state
- [ ] All layer groups created and added to map

### State Management
- [ ] State schema defined with versioning (for future migrations)
- [ ] State Manager provides subscribe/notify pattern for changes
- [ ] All state mutations go through State Manager methods
- [ ] State changes automatically trigger persistence (debounced)
- [ ] State validation on load (handle corrupted LocalStorage)

### Team Markers Layer
- [ ] Marker icons differentiate assigned vs unassigned
- [ ] Markers show popups with team member details
- [ ] Drag handlers update state on marker move (optional)
- [ ] Marker click handlers trigger assignment UI
- [ ] Geocoding service integrated for address → coordinates
- [ ] Error handling for geocoding failures

### Zones Layer
- [ ] Leaflet.draw control added with polygon/rectangle tools
- [ ] Draw toolbar configured with appropriate options
- [ ] 'draw:created' event handler adds zone to state
- [ ] 'draw:edited' event handler updates zone geometry
- [ ] 'draw:deleted' event handler removes zone from state
- [ ] Zone polygons styled to show assignment status
- [ ] Zone popups display zone name and assigned members

### Boundaries Layer
- [ ] Commune boundary GeoJSON loaded (local file or API)
- [ ] Boundary layer non-interactive (no clicks/hovers blocking other layers)
- [ ] Boundary styled distinctly (e.g., dashed line, subtle color)
- [ ] Layer ordering: boundaries → zones → markers (markers on top)

### Assignment Logic
- [ ] Spatial query function for point-in-polygon detection
- [ ] Assignment validation rules (prevent double-assignment, etc.)
- [ ] Visual feedback on assignment (marker color, zone style)
- [ ] Unassignment capability
- [ ] Assignment persistence

### Error Handling
- [ ] LocalStorage quota exceeded handling (unlikely but possible)
- [ ] Geocoding API errors (rate limits, network failures)
- [ ] Invalid GeoJSON detection and recovery
- [ ] State corruption detection with fallback to defaults

## Scalability Considerations

| Concern | At 10 Members / 5 Zones | At 100 Members / 50 Zones | At 1000+ Members |
|---------|-------------------------|---------------------------|------------------|
| **Rendering** | No issues | Consider marker clustering for dense areas | REQUIRED: Leaflet.markercluster plugin |
| **LocalStorage** | ~5-10 KB | ~50-100 KB | May hit 5-10 MB limit; consider chunking or compression |
| **State updates** | Instant | Debouncing important | Virtualization or lazy loading of off-screen layers |
| **Geocoding** | Manual entry acceptable | Batch import with queue | CSV import + background processing queue |
| **Search** | Linear array search | Consider indexing by ID | REQUIRED: spatial index (R-tree or quadtree) |

**Recommendation for Project Scope**: Given "team members" and "zones" suggests <100 entities, standard approach suffices. Implement clustering only if real-world usage shows density issues.

## Technology-Specific Notes

### Leaflet.draw Configuration
```javascript
const drawControl = new L.Control.Draw({
  draw: {
    polygon: {
      allowIntersection: false,  // Prevent self-intersecting polygons
      showArea: true,            // Show area measurement
      metric: true               // Use metric units (km²)
    },
    rectangle: true,
    circle: false,               // Zones should be polygons, not circles (for spatial queries)
    marker: false,               // Don't allow drawing markers (use team layer for that)
    polyline: false              // Not needed for zones
  },
  edit: {
    featureGroup: zonesGroup,    // CRITICAL: must specify which group is editable
    remove: true
  }
});
```

### French Geocoding API Integration
**API**: `geo.api.gouv.fr` provides two key services:
1. **Découpage administratif API**: For commune boundaries
2. **Adresse API**: For geocoding addresses

**Example: Fetching Commune Boundary**:
```javascript
async function fetchCommuneBoundary(communeCode) {
  const response = await fetch(
    `https://geo.api.gouv.fr/communes/${communeCode}?fields=nom,code,contour&format=geojson`
  );
  return await response.json();
}
```

**Example: Geocoding Address**:
```javascript
async function geocodeAddress(address) {
  const response = await fetch(
    `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=1`
  );
  const data = await response.json();
  if (data.features.length > 0) {
    const [lon, lat] = data.features[0].geometry.coordinates;
    return [lat, lon];  // Note: API returns [lon, lat], Leaflet expects [lat, lon]
  }
  throw new Error('Address not found');
}
```

### LocalStorage Size Monitoring
```javascript
function getLocalStorageSize() {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return (total / 1024).toFixed(2) + ' KB';
}

// Warn if approaching limit (5 MB = 5120 KB)
if (parseFloat(getLocalStorageSize()) > 4096) {
  console.warn('LocalStorage approaching quota limit');
}
```

## Sources

### HIGH Confidence (Official Documentation)
- [Leaflet Documentation](https://leafletjs.com/reference.html) - Core architecture and API reference
- [Leaflet Examples and Tutorials](https://leafletjs.com/examples.html) - Architectural patterns and best practices
- [Leaflet.draw GitHub Repository](https://github.com/Leaflet/Leaflet.draw) - Drawing plugin architecture and FeatureGroup usage
- [geo.api.gouv.fr](https://geo.api.gouv.fr/) - French geocoding and administrative boundaries API

### MEDIUM Confidence (Framework Integration & Modern Patterns)
- [React Leaflet Core Architecture](https://react-leaflet.js.org/docs/core-architecture/) - Component patterns (applicable to vanilla JS)
- [State Management in Vanilla JS: 2026 Trends](https://medium.com/@chirag.dave/state-management-in-vanilla-js-2026-trends-f9baed7599de) - Modern state patterns
- [The Complete Guide to Frontend Architecture Patterns in 2026](https://dev.to/sizan_mahmud0_e7c3fd0cb68/the-complete-guide-to-frontend-architecture-patterns-in-2026-3ioo) - Current architectural approaches

### MEDIUM Confidence (Specific Patterns)
- [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster) - Marker clustering for scalability
- [Using GeoJSON with Leaflet](https://leafletjs.com/examples/geojson/) - GeoJSON integration patterns

---

**Last Updated**: 2026-02-05
**Next Review**: When beginning Phase 4 (Zones Layer) implementation - validate Leaflet.draw integration assumptions
