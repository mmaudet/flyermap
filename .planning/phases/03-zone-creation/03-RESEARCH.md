# Phase 3: Zone Creation - Research

**Researched:** 2026-02-05
**Domain:** Interactive polygon drawing and editing on Leaflet maps
**Confidence:** HIGH

## Summary

Phase 3 requires implementing interactive zone creation using polygon drawing and editing capabilities on a Leaflet map. The requirement ZONE-01 explicitly specifies **Leaflet-Geoman** as the solution, making this a locked decision.

Leaflet-Geoman is the industry-standard plugin for drawing and editing geometric layers in Leaflet. The free version (@geoman-io/leaflet-geoman-free) provides all necessary features: polygon drawing, vertex editing, layer deletion, and full GeoJSON serialization support. It self-initializes on import and integrates seamlessly with existing Leaflet maps.

The standard architecture uses a FeatureGroup to manage zone layers, the PubSub pattern for state synchronization (already established in Phase 2), and GeoJSON format for persistence to localStorage. Zone metadata (names) are stored in GeoJSON feature properties, following RFC 7946 specifications.

**Primary recommendation:** Use @geoman-io/leaflet-geoman-free v2.19.2 with FeatureGroup layer management, extend existing store.js PubSub pattern for zones, and persist as GeoJSON with custom properties to localStorage.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @geoman-io/leaflet-geoman-free | 2.19.2 | Polygon drawing/editing UI | De facto standard for Leaflet geometry editing. 2.4k GitHub stars, actively maintained, self-initializing. Explicitly specified in ZONE-01. |
| Leaflet | 1.9.4 (existing) | Map foundation | Already in use, full compatibility with Geoman 2.19 |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | - | - | Geoman handles all geometry operations internally |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Leaflet-Geoman | Leaflet.draw | Deprecated/unmaintained. Geoman is the modern successor. |
| Leaflet-Geoman | Leaflet.Editable | Lower-level API, no built-in UI. Requires custom toolbar. Only choose if Geoman's UI doesn't fit design constraints. |
| FeatureGroup | LayerGroup | LayerGroup lacks styling/event methods needed for vector layers. FeatureGroup is correct choice for polygons. |

**Installation:**

```bash
npm install @geoman-io/leaflet-geoman-free
```

**Import in main.js:**

```javascript
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
```

Note: Leaflet-Geoman "initializes itself" automatically after inclusion. No explicit initialization call needed.

## Architecture Patterns

### Recommended Project Structure

```
src/
├── map/
│   ├── zoneLayer.js          # FeatureGroup management, Geoman event handlers
│   └── config.js             # (existing) Add zone styling constants
├── state/
│   └── store.js              # (existing) Add zones state management
├── data/
│   └── storage.js            # (existing) Reuse for zones
└── ui/
    └── zonePanel.js          # Zone naming UI (edit form/popup)
```

### Pattern 1: FeatureGroup Layer Management

**What:** Use L.FeatureGroup to contain all zone polygons, separate from markers

**When to use:** Essential for managing multiple polygons with collective operations (toGeoJSON, clear, iterate)

**Example:**

```javascript
// Source: Leaflet official docs + Geoman discussions
const zoneGroup = L.featureGroup().addTo(map);

// Get all zones as GeoJSON for persistence
const zonesGeoJSON = zoneGroup.toGeoJSON();

// Iterate through zones
zoneGroup.eachLayer(layer => {
  console.log(layer.toGeoJSON());
});

// Clear all zones
zoneGroup.clearLayers();
```

### Pattern 2: Geoman Event Handling for CRUD

**What:** Listen to pm:create, pm:edit, pm:remove events to sync with state

**When to use:** Required to capture user drawing/editing actions and persist changes

**Example:**

```javascript
// Source: Geoman official docs + GitHub issue #408
map.on('pm:create', (e) => {
  const layer = e.layer;

  // Add to FeatureGroup for management
  zoneGroup.addLayer(layer);

  // Sync to store (triggers persistence)
  store.addZone({
    geojson: layer.toGeoJSON(),
    name: 'Zone ' + (store.getZones().length + 1) // Default name
  });
});

map.on('pm:edit', (e) => {
  const layer = e.layer;
  const zoneId = layer.options.zoneId; // Custom property

  store.updateZone(zoneId, {
    geojson: layer.toGeoJSON()
  });
});

map.on('pm:remove', (e) => {
  const layer = e.layer;
  const zoneId = layer.options.zoneId;

  store.removeZone(zoneId);
});
```

### Pattern 3: GeoJSON with Custom Properties

**What:** Store zone metadata (name, ID) in GeoJSON feature.properties

**When to use:** Always. RFC 7946 standard approach for feature metadata.

**Example:**

```javascript
// Source: RFC 7946 + Leaflet-Geoman discussion #858
const zoneGeoJSON = {
  type: "Feature",
  properties: {
    id: "zone_123",
    name: "Zone Nord",
    createdAt: "2026-02-05T10:30:00Z"
  },
  geometry: {
    type: "Polygon",
    coordinates: [[[lng1, lat1], [lng2, lat2], [lng3, lat3], [lng1, lat1]]]
  }
};

// Restore zone from GeoJSON
const restoredLayer = L.geoJSON(zoneGeoJSON, {
  onEachFeature: (feature, layer) => {
    layer.options.zoneId = feature.properties.id;
    layer.options.zoneName = feature.properties.name;
    zoneGroup.addLayer(layer);
  }
}).getLayers()[0];
```

### Pattern 4: Debounced Persistence (Existing Pattern)

**What:** Reuse Phase 2's 500ms debounced save to avoid excessive writes

**When to use:** Always. Established pattern in store.js.

**Example:**

```javascript
// Source: Existing src/state/store.js
// Already implemented - just extend for zones array
this.state = {
  teamMembers: [],
  zones: []  // Add zones to existing state
};
```

### Pattern 5: Zone Naming UI

**What:** Prompt for zone name on pm:create or provide inline editing

**When to use:** Required by ZONE-04

**Example:**

```javascript
// Source: Leaflet popup pattern + Geoman discussions
map.on('pm:create', (e) => {
  const layer = e.layer;

  // Option A: Immediate popup
  const popup = L.popup()
    .setLatLng(layer.getBounds().getCenter())
    .setContent('<input type="text" placeholder="Nom de la zone" id="zone-name-input" />')
    .openOn(map);

  // Option B: Bind popup to layer for later editing
  layer.bindPopup('<input type="text" class="zone-name-input" value="Zone Nord" />');
});
```

### Anti-Patterns to Avoid

- **Saving entire event object:** Never save `e` from pm:create. Extract `e.layer` and call `.toGeoJSON()`. The event object contains circular references and non-serializable data.
- **Using LayerGroup instead of FeatureGroup:** LayerGroup lacks `.setStyle()` and proper event bubbling for vector layers. Always use FeatureGroup for polygons.
- **Not adding zones to FeatureGroup:** If you don't call `zoneGroup.addLayer(layer)` after pm:create, you lose the ability to iterate/manage zones collectively.
- **Forgetting first=last coordinate:** GeoJSON polygons require first and last coordinates to be identical. Leaflet/Geoman handles this automatically, but when manually constructing, verify closure.
- **Storing layers directly:** Never try to JSON.stringify a Leaflet layer object. Always convert with `.toGeoJSON()` first.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Polygon drawing UI | Custom click handlers + SVG | Leaflet-Geoman | Handles vertex manipulation, snapping, self-intersection detection, mobile touch, undo/redo. 1000+ edge cases solved. |
| Vertex editing | Draggable div elements | Leaflet-Geoman edit mode | Precise coordinate updates, drag constraints, multi-vertex selection. |
| GeoJSON serialization | Manual coordinate extraction | `layer.toGeoJSON()` | RFC 7946 compliant, handles all geometry types, preserves winding order. |
| Layer persistence | Custom format | GeoJSON + localStorage | Standard format, works with all GIS tools, future-proof. |
| Snap-to-grid / vertex snapping | Distance calculations | Geoman snappable option | Built-in with configurable distance, works across layers. |

**Key insight:** Geometry editing is deceptively complex. Self-intersecting polygons, coordinate precision, touch events, and winding order rules require specialized libraries. Leaflet-Geoman has solved these problems over 1000+ commits.

## Common Pitfalls

### Pitfall 1: Bounds Not Updating After Edit

**What goes wrong:** After dragging vertices in edit mode, calling `layer.getBounds()` returns stale bounding box. This breaks spatial calculations like "is point in zone?"

**Why it happens:** Leaflet caches bounds for performance. Editing vertices doesn't automatically invalidate the cache.

**How to avoid:** Call `layer.redraw()` or access `layer.getLatLngs()` which forces recalculation.

**Warning signs:** Point-in-polygon checks fail after editing. Popups appear at wrong location.

**Source:** [GitHub Issue #183](https://github.com/geoman-io/leaflet-geoman/issues/183)

### Pitfall 2: Self-Intersecting Polygons

**What goes wrong:** User draws polygon where edges cross themselves (figure-8 shape). Results in undefined area calculations and broken GeoJSON.

**Why it happens:** Geoman allows self-intersection by default for flexibility.

**How to avoid:** Set `allowSelfIntersection: false` in drawing options if business logic requires simple polygons.

**Warning signs:** Unexpected polygon fill rendering. Area calculations return NaN or negative values.

**Code:**

```javascript
map.pm.enableDraw('Polygon', {
  allowSelfIntersection: false  // Prevents figure-8 shapes
});
```

**Source:** [Geoman changelog](https://geoman.io/docs/leaflet/changelog/free)

### Pitfall 3: Mobile Touch Precision

**What goes wrong:** On mobile, finishing polygon by tapping first vertex is nearly impossible. Users accidentally create extra vertices.

**Why it happens:** Touch target is small (typically 5-10px radius). Finger obscures view.

**How to avoid:** Increase `snapDistance` option (default 20px, consider 30-40px for mobile). Consider showing "Tap to finish" button as alternative.

**Warning signs:** User complaints about difficulty closing polygons on tablets/phones.

**Code:**

```javascript
map.pm.enableDraw('Polygon', {
  snapDistance: 40,  // Larger touch target
  snappable: true
});
```

**Source:** [GitHub Issue #350](https://github.com/geoman-io/leaflet-geoman/issues/350)

### Pitfall 4: Duplicate Saves on Edit

**What goes wrong:** Each vertex drag triggers pm:edit event, causing dozens of localStorage writes during single edit session.

**Why it happens:** pm:edit fires continuously during drag, not just on drag end.

**How to avoid:** Use debouncing (already implemented in store.js). Consider listening to `pm:update` instead of `pm:edit` - it fires only once after all edits complete.

**Warning signs:** Console shows rapid-fire save operations. Performance lag during editing.

**Code:**

```javascript
// Prefer pm:update (fires once at end) over pm:edit (fires during drag)
layer.on('pm:update', (e) => {
  store.updateZone(zoneId, { geojson: e.layer.toGeoJSON() });
});
```

**Source:** [GitHub Discussion #1342](https://github.com/geoman-io/leaflet-geoman/discussions/1342)

### Pitfall 5: Circle Becomes Marker on Reload

**What goes wrong:** If user draws circle (not in scope for this phase, but architectural note), saving/reloading converts it to marker point.

**Why it happens:** GeoJSON spec doesn't include "Circle" type. `.toGeoJSON()` converts circles to Point geometry, losing radius.

**How to avoid:** For this phase (polygons only), not relevant. But if expanding to circles later, store layer type and radius in properties.

**Warning signs:** Circles render as markers after reload.

**Source:** [GitHub Discussion #858](https://github.com/geoman-io/leaflet-geoman/discussions/858)

### Pitfall 6: Minimum Vertex Enforcement

**What goes wrong:** User deletes vertices until polygon collapses. Application crashes on render.

**Why it happens:** Polygon needs minimum 3 vertices. Geoman removes polygon if <3 remain, which can surprise applications expecting persistent reference.

**How to avoid:** Listen for layer removal and clean up references. Don't cache layer references across edits.

**Warning signs:** Console errors about undefined layer after heavy editing.

**Code:**

```javascript
map.on('pm:remove', (e) => {
  const zoneId = e.layer.options.zoneId;
  if (zoneId) {
    store.removeZone(zoneId);  // Clean up reference
  }
});
```

**Source:** Geoman documentation + GitHub changelog

## Code Examples

Verified patterns from official sources:

### Complete Zone Layer Setup

```javascript
// Source: Geoman docs + GitHub discussions #856, #858, #408
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

export function initZoneLayer(map, store) {
  // Create FeatureGroup for zone management
  const zoneGroup = L.featureGroup().addTo(map);

  // Style configuration
  const zoneStyle = {
    color: '#ef4444',      // Red border
    weight: 2,
    fillColor: '#fca5a5',
    fillOpacity: 0.2
  };

  // Enable drawing with options
  map.pm.addControls({
    position: 'topleft',
    drawMarker: false,
    drawCircleMarker: false,
    drawPolyline: false,
    drawRectangle: false,
    drawCircle: false,
    drawPolygon: true,      // Only enable polygon
    editMode: true,
    dragMode: false,
    cutPolygon: false,
    removalMode: true
  });

  // Set drawing options
  map.pm.setGlobalOptions({
    pathOptions: zoneStyle,
    snappable: true,
    snapDistance: 20,
    allowSelfIntersection: false
  });

  // Event handlers
  map.on('pm:create', (e) => {
    const layer = e.layer;
    zoneGroup.addLayer(layer);

    // Generate ID and default name
    const zoneId = generateId();
    const defaultName = `Zone ${store.getZones().length + 1}`;

    // Store ID in layer for reference
    layer.options.zoneId = zoneId;

    // Save to store (triggers debounced persistence)
    store.addZone({
      id: zoneId,
      name: defaultName,
      geojson: layer.toGeoJSON()
    });

    // Prompt for name
    promptForZoneName(layer, zoneId, defaultName);
  });

  map.on('pm:edit', (e) => {
    const layer = e.layer;
    const zoneId = layer.options.zoneId;

    if (zoneId) {
      store.updateZone(zoneId, {
        geojson: layer.toGeoJSON()
      });
    }
  });

  map.on('pm:remove', (e) => {
    const layer = e.layer;
    const zoneId = layer.options.zoneId;

    if (zoneId) {
      store.removeZone(zoneId);
    }
  });

  // Load existing zones from store
  loadZones(zoneGroup, store);

  return zoneGroup;
}
```

### Store Extension for Zones

```javascript
// Source: Existing store.js pattern + Geoman serialization
class Store {
  constructor() {
    this.state = {
      teamMembers: [],
      zones: []  // Add zones array
    };
    // ... existing setup
  }

  getZones() {
    return [...this.state.zones];
  }

  addZone(zone) {
    const newZone = {
      ...zone,
      id: zone.id || this._generateId(),
      createdAt: new Date().toISOString()
    };

    this.state.zones.push(newZone);
    this.pubsub.publish('zoneAdded', newZone);
    this._debouncedSave();

    return newZone;
  }

  updateZone(id, updates) {
    const zone = this.state.zones.find(z => z.id === id);
    if (!zone) return null;

    Object.assign(zone, updates, {
      updatedAt: new Date().toISOString()
    });

    this.pubsub.publish('zoneUpdated', zone);
    this._debouncedSave();

    return zone;
  }

  removeZone(id) {
    const index = this.state.zones.findIndex(z => z.id === id);
    if (index === -1) return false;

    const removed = this.state.zones.splice(index, 1)[0];
    this.pubsub.publish('zoneRemoved', removed);
    this._debouncedSave();

    return true;
  }
}
```

### Loading Zones from Storage

```javascript
// Source: Geoman discussions #858, #1338
function loadZones(zoneGroup, store) {
  const zones = store.getZones();

  zones.forEach(zone => {
    // Parse GeoJSON and add to map
    const geoJSONLayer = L.geoJSON(zone.geojson, {
      style: {
        color: '#ef4444',
        weight: 2,
        fillColor: '#fca5a5',
        fillOpacity: 0.2
      },
      onEachFeature: (feature, layer) => {
        // Restore zone ID to layer
        layer.options.zoneId = zone.id;
        layer.options.zoneName = zone.name;

        // Add to FeatureGroup
        zoneGroup.addLayer(layer);

        // Bind popup for name display/editing
        layer.bindPopup(`
          <div>
            <strong>${zone.name}</strong><br/>
            <button onclick="editZoneName('${zone.id}')">Rename</button>
          </div>
        `);
      }
    });
  });
}
```

### Zone Naming UI (Simple Prompt)

```javascript
// Source: Browser confirm API + Leaflet popup patterns
function promptForZoneName(layer, zoneId, currentName) {
  // Simple approach: browser prompt
  const name = prompt('Nom de la zone:', currentName);

  if (name !== null && name.trim() !== '') {
    store.updateZone(zoneId, { name: name.trim() });
    layer.options.zoneName = name.trim();

    // Update popup if bound
    layer.bindPopup(`<strong>${name.trim()}</strong>`);
  }
}

// Alternative: Custom popup with input
function promptForZoneNamePopup(layer, zoneId, currentName) {
  const center = layer.getBounds().getCenter();

  const popup = L.popup()
    .setLatLng(center)
    .setContent(`
      <div>
        <label>Nom de la zone:</label>
        <input type="text" id="zone-name-${zoneId}" value="${currentName}" />
        <button onclick="saveZoneName('${zoneId}')">OK</button>
      </div>
    `)
    .openOn(map);
}
```

### Save All Zones (Bulk Export)

```javascript
// Source: Geoman PR #649 + discussions
function exportAllZones(zoneGroup) {
  // Get all zones as single FeatureCollection
  const allZonesGeoJSON = zoneGroup.toGeoJSON();

  // Download as file (optional enhancement)
  const dataStr = JSON.stringify(allZonesGeoJSON, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

  const exportFileDefaultName = 'zones.geojson';

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Leaflet.draw | Leaflet-Geoman | ~2018 | Leaflet.draw became unmaintained. Geoman is actively developed with modern features (TypeScript, better mobile, undo/redo). |
| Manual vertex dragging | Geoman edit mode | 2018+ | Built-in snapping, constraints, and UI. No need for custom draggable logic. |
| Storing raw coordinates | GeoJSON with properties | RFC 7946 (2016) | Standard format for geographic data. Interoperable with all GIS tools. |
| Immediate saves | Debounced persistence | Common practice | Reduces write operations, prevents quota issues, improves performance. |
| LayerGroup for vectors | FeatureGroup | Always (Leaflet 1.0+) | FeatureGroup extends LayerGroup with necessary methods for vector styling/events. |

**Deprecated/outdated:**

- **Leaflet.draw**: Archived in 2019. No longer maintained. Security vulnerabilities unfixed. Use Leaflet-Geoman instead.
- **Leaflet.Editable**: Still exists but very low-level. Only choose if you need full control and will build entire UI from scratch. For 99% of use cases, Geoman is better.
- **Manual coordinate management**: Never manipulate `layer._latlngs` directly. Always use public API methods (`getLatLngs()`, `setLatLngs()`).

## Open Questions

Things that couldn't be fully resolved:

1. **Zone Name UI Location**
   - What we know: Options include: (A) prompt on create, (B) popup on layer, (C) side panel list, (D) inline editable labels
   - What's unclear: No explicit requirement for UI placement in ZONE-04
   - Recommendation: Start with simple prompt on creation (easiest). Can enhance to popup or panel in future iterations. Browser `prompt()` is sufficient for MVP.

2. **Zone Color Customization**
   - What we know: Code examples show single color scheme for all zones
   - What's unclear: Requirements don't specify if zones should have different colors or uniform styling
   - Recommendation: Start with uniform color (red/pink as shown in examples). Add per-zone color as future enhancement if needed.

3. **Geoman Pro Features**
   - What we know: Free version includes all required features. Pro adds rotation, scaling, measurement.
   - What's unclear: Whether future phases might need Pro features
   - Recommendation: Stick with Free version. It's MIT licensed and includes everything for Phase 3. Upgrade to Pro only if Phase 4/5 require measurement or advanced transforms.

4. **Delete Confirmation**
   - What we know: Geoman's default removal mode has no confirmation dialog
   - What's unclear: Whether accidental deletion is a UX concern for this application
   - Recommendation: Start without confirmation (simpler). If user testing shows accidental deletions, add confirmation by overriding `map.pm.removeLayer()` method (see Common Pitfalls section).

## Sources

### Primary (HIGH confidence)

- **Leaflet-Geoman Official Docs** - https://geoman.io/docs/leaflet
  - Installation, API reference, drawing modes
- **Leaflet-Geoman GitHub** - https://github.com/geoman-io/leaflet-geoman
  - README, releases, 2.4k stars, TypeScript definitions
- **npm Package** - @geoman-io/leaflet-geoman-free v2.19.2
  - Current version (Feb 2, 2026), installation confirmed
- **RFC 7946: The GeoJSON Format** - https://datatracker.ietf.org/doc/html/rfc7946
  - Official GeoJSON specification, polygon structure, properties
- **Leaflet Official Documentation** - https://leafletjs.com/reference.html
  - FeatureGroup API, GeoJSON layer, popup methods

### Secondary (MEDIUM confidence)

- **GitHub Issue #408** - [How do I save the polygon and re-render it with pm in the future?](https://github.com/geoman-io/leaflet-geoman/issues/408)
  - Maintainer-verified pattern for toGeoJSON() serialization
- **GitHub Discussion #858** - [How do I save data in the free version](https://github.com/geoman-io/leaflet-geoman/discussions/858)
  - Community-verified localStorage pattern with code examples
- **GitHub Discussion #856** - [How to get the geojson of all features](https://github.com/geoman-io/leaflet-geoman/discussions/856)
  - getGeomanLayers() usage pattern
- **GitHub PR #649** - [Add toGeoJSON() to getGeomanLayers()](https://github.com/geoman-io/leaflet-geoman/pull/649)
  - Merged feature for bulk GeoJSON export
- **GitHub Issue #183** - [Polygon's bounding rectangle not updated after edit](https://github.com/geoman-io/leaflet-geoman/issues/183)
  - Confirmed pitfall with workaround
- **GitHub Issue #350** - [Drawing on mobile](https://github.com/geoman-io/leaflet-geoman/issues/350)
  - Mobile touch precision issues documented
- **GitHub Discussion #1342** - [Drawn objects get saved multiple times](https://github.com/geoman-io/leaflet-geoman/discussions/1342)
  - Duplicate save pitfall confirmed

### Tertiary (LOW confidence)

- **WebSearch results** - Various tutorials and blog posts
  - General patterns confirmed across multiple sources
  - Used for discovering issues/discussions to investigate

## Metadata

**Confidence breakdown:**

- **Standard stack:** HIGH - Leaflet-Geoman is explicitly specified in ZONE-01 and verified as actively maintained (v2.19.2, Feb 2026). npm package and GitHub confirm usage.
- **Architecture:** HIGH - FeatureGroup pattern is standard Leaflet practice for vector layer management. GeoJSON persistence is RFC 7946 standard. PubSub pattern already established in Phase 2.
- **Pitfalls:** MEDIUM - All pitfalls sourced from GitHub issues/discussions, but not all have recent activity. Self-intersection and mobile touch issues are well-documented. Bounds updating issue confirmed but unclear if fixed in latest version.

**Research date:** 2026-02-05

**Valid until:** ~30 days (March 2026) for stable API. Leaflet-Geoman has consistent API across minor versions. Next major version (3.x) would require re-validation.
