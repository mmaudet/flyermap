# Domain Pitfalls: Interactive Mapping with Polygon Zone Management

**Domain:** Interactive web mapping with zone/polygon management
**Researched:** 2026-02-05
**Confidence:** MEDIUM (verified through official documentation, GitHub issues, and multiple community sources)

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or major technical issues.

### Pitfall 1: Using Unmaintained Leaflet.draw

**What goes wrong:** Leaflet.draw hasn't seen significant updates for several years, leading to compatibility issues with modern browsers, security vulnerabilities, and lack of bug fixes.

**Why it happens:** Developers follow outdated tutorials or documentation that still recommend Leaflet.draw as the standard drawing library.

**Consequences:**
- Touch support problems on mobile devices (users can only draw two-point polygons in Chrome)
- Broken polygon editing on touch devices where taps on existing points create new vertices
- No support for modern features like rotation, scaling, or advanced snapping
- Security risks from unmaintained dependencies

**Prevention:**
- Use Leaflet-Geoman instead of Leaflet.draw (actively maintained, modern features)
- If using Leaflet.draw, apply the `leaflet-draw-with-touch` patch for mobile support
- Check library maintenance status (last commit, open issues) before adoption

**Detection:**
- High number of open GitHub issues with no maintainer response
- Last commit date older than 12-18 months
- User reports of touch/mobile issues
- Console errors on modern browsers

**Phase to address:** Architecture/Stack Selection (Phase 1)

**Sources:**
- [Leaflet-Geoman vs Leaflet.draw comparison](https://geoman.io/blog/leaflet-geoman-vs-leaflet-draw)
- [Leaflet.draw touch support issues](https://github.com/Leaflet/Leaflet.draw/issues/789)

---

### Pitfall 2: GeoJSON Polygon Coordinate Integrity Errors

**What goes wrong:** Invalid polygon coordinates in GeoJSON cause maps to break, zones to disappear, or data imports to fail silently.

**Why it happens:** Hand-editing coordinates, improper serialization, copy-paste errors, or incorrect understanding of GeoJSON coordinate structure.

**Consequences:**
- Unclosed polygons (first and last coordinates must be identical) render incorrectly
- Self-intersecting polygons create invalid zones
- Wrong coordinate order (GeoJSON uses [lng, lat], not [lat, lng]) places zones in wrong locations
- Interior rings (holes) not fully contained within exterior ring causes validation errors
- Data loss when exporting/importing between systems

**Prevention:**
- Always validate GeoJSON before save/export using libraries or online validators
- Use structured serialization (JSON.stringify) never hand-edit coordinates
- Add coordinate validation in save workflow: check closed rings, no self-intersections
- Document coordinate order convention (GeoJSON [lng,lat] vs Leaflet [lat,lng])
- Test import/export round-trips early

**Detection:**
- Polygons not rendering on map after load
- Console errors about invalid coordinates
- Zones appearing in wrong geographic location (coordinate order swap)
- Validation errors during data import

**Phase to address:** Data Persistence (Phase 2), Import/Export (Phase 3)

**Sources:**
- [GeoJSON File Errors: Common Errors & Simple Solutions](https://tracextech.com/geojson-file-errors/)
- [GeoJSON specification](https://geojson.org/)
- [8th Light Geographic Coordinate Systems](https://8thlight.com/insights/geographic-coordinate-systems-101)

---

### Pitfall 3: localStorage Data Loss Without Warning

**What goes wrong:** Users lose all zone and marker data without warning when localStorage quota is exceeded or browser clears storage.

**Why it happens:** Assuming localStorage is reliable and unlimited, not handling quota errors, not implementing backup strategies.

**Consequences:**
- QuotaExceededError thrown when trying to save (typically at 5-10MB limit)
- Silent data loss in private/incognito mode where localStorage may not work
- Complete data wipe when users clear browser history
- Lost work if browser crashes before data persists
- No recovery mechanism for corrupted data

**Prevention:**
- Wrap all localStorage.setItem() calls in try-catch blocks
- Check available quota before large saves
- Implement fallback to sessionStorage if localStorage fails
- Show user warnings when approaching storage limits (>80% used)
- Provide JSON export/download as backup mechanism
- Add "last saved" indicator so users know data state
- Consider IndexedDB for larger datasets (>5MB expected)

**Detection:**
- QuotaExceededError (code 22 or NS_ERROR_DOM_QUOTA_REACHED)
- Failed to execute 'setItem' on 'Storage' errors
- User reports of lost data after closing browser
- Data not persisting in private browsing mode

**Phase to address:** Data Persistence (Phase 2)

**Sources:**
- [Handling localStorage errors](https://mmazzarolo.com/blog/2022-06-25-local-storage-status/)
- [Understanding localStorage Quota Exceeded Errors](https://medium.com/@zahidbashirkhan/understanding-and-resolving-localstorage-quota-exceeded-errors-5ce72b1d577a)
- [MDN Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)

---

### Pitfall 4: Coordinate Reference System Confusion

**What goes wrong:** Mixing WGS84 (EPSG:4326) with Web Mercator (EPSG:3857) causes coordinates to be off by up to 40km.

**Why it happens:** Not understanding that WGS84 is unprojected lat/lng while Web Mercator is projected for web display, or confusing coordinate order conventions.

**Consequences:**
- Geocoded addresses appear in wrong locations (ocean instead of London)
- Zones drawn on map don't align with saved coordinates
- Distance calculations wildly incorrect
- Polygon areas severely distorted, especially near poles
- Data incompatibility with external GIS systems

**Prevention:**
- Use consistent CRS throughout application (EPSG:4326 for storage, automatic Web Mercator for display)
- Document coordinate order: GeoJSON uses [lng, lat], Leaflet uses [lat, lng]
- Never mix CRS without explicit transformation
- Validate geocoding results against expected bounds (France: lat 41-51°N, lng -5-10°E)
- Test with known reference points early

**Detection:**
- Markers/zones appearing in ocean when should be on land
- Coordinates with latitude outside -90 to 90 or longitude outside -180 to 180
- Massive distances between nearby points
- Geocoding results far from expected location

**Phase to address:** Map Initialization (Phase 1), Geocoding (Phase 4)

**Sources:**
- [WGS84 & EPSG:4326 Geodetic Systems](https://www.smarty.com/articles/what-is-wgs84-epsg-4326-geodetic-systems)
- [8th Light Geographic Coordinate Systems](https://8thlight.com/insights/geographic-coordinate-systems-101)

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or user experience issues.

### Pitfall 5: No Undo/Redo Functionality

**What goes wrong:** Users accidentally delete zones or markers with no way to recover, leading to frustration and data re-entry.

**Why it happens:** Drawing libraries don't provide undo/redo out-of-the-box; requires custom state management that's often deferred.

**Prevention:**
- Implement state history stack early (Phase 2)
- Store snapshots of map state after each edit action
- Limit history to last 20-50 actions to manage memory
- Provide keyboard shortcuts (Ctrl+Z, Ctrl+Y) from day one
- Show undo/redo buttons in UI
- Use libraries like Leaflet-Geoman which have built-in undo support

**Detection:**
- User complaints about accidental deletions
- Requests for "undo" feature in feedback
- Users manually redrawing deleted zones

**Phase to address:** Interactive Editing (Phase 3)

**Sources:**
- [ArcGIS JavaScript API undo/redo patterns](https://developers.arcgis.com/javascript/3/jssamples/graphics_undoredo.html)

---

### Pitfall 6: Poor Touch/Mobile Support

**What goes wrong:** Polygon drawing doesn't work on mobile/tablet devices, or users experience accidental point creation and panning issues.

**Why it happens:** Drawing libraries optimized for mouse, not touch; insufficient tap tolerance; mixing tap and pan gestures.

**Consequences:**
- Can only draw two-point polygons on Chrome mobile
- Tapping existing vertices creates new points instead of selecting
- Map pans when user tries to place points
- No way to close polygon on touch devices
- Double-tap to zoom interferes with drawing

**Prevention:**
- Test on actual mobile devices early (not just browser DevTools)
- Use Leaflet-Geoman which has better touch support than Leaflet.draw
- Implement larger tap targets for vertices (minimum 44x44px)
- Add explicit "Finish" button for closing polygons
- Disable map panning while in drawing mode
- Set appropriate `tapTolerance` (15-20px) to account for finger imprecision

**Detection:**
- High bounce rate on mobile devices
- Users unable to complete polygon drawing on tablets
- Console errors about touch events
- User reports of "map moving instead of drawing"

**Phase to address:** Interactive Editing (Phase 3), Mobile Optimization (Phase 5)

**Sources:**
- [Leaflet.draw touch support issues](https://github.com/Leaflet/Leaflet.draw/issues/789)
- [Tap on polygon point creates new point](https://github.com/Leaflet/Leaflet.draw/issues/548)

---

### Pitfall 7: Missing Point-in-Polygon Validation

**What goes wrong:** Users can assign team members to multiple zones or no zone at all; zones can overlap without validation.

**Why it happens:** Assuming UI constraints are sufficient; not implementing spatial query validation on data save.

**Prevention:**
- Implement point-in-polygon algorithm (use turf.js or point-in-polygon library)
- Validate marker assignments on every save operation
- Show visual feedback when marker is in/out of zone
- Prevent overlapping zones or show warning
- Add data integrity checks before export

**Detection:**
- Markers appearing in multiple zones in reports
- Export data with invalid zone assignments
- User confusion about which zone contains which marker

**Phase to address:** Marker Assignment (Phase 4)

**Sources:**
- [point-in-polygon npm package](https://www.npmjs.com/package/point-in-polygon)
- [Mastering Point in Polygon algorithms](https://www.numberanalytics.com/blog/ultimate-guide-point-in-polygon-computational-geometry)

---

### Pitfall 8: French Address Geocoding Errors

**What goes wrong:** Geocoded addresses appear in wrong locations or fail to geocode valid French addresses.

**Why it happens:** Using international geocoding services (Google, Mapbox) that lack French address precision; not validating geocoding results.

**Prevention:**
- Use Base Adresse Nationale (BAN) API for French addresses (government-maintained, free)
- Implement fallback chain: BAN → commercial service → manual entry
- Validate geocoded coordinates are within France bounds (41-51°N, -5-10°E)
- Show geocoded location on map for user verification before save
- Handle common address variants (rue/avenue abbreviations)

**Detection:**
- Addresses geocoding to wrong cities
- Common addresses failing to geocode
- Coordinates outside of France
- User reports of wrong marker placements

**Phase to address:** Geocoding (Phase 4)

**Sources:**
- [Geocoding French addresses with BAN](https://www.data.gouv.fr/en/reuses/geocoding-french-addresses-with-ban/)
- [France Address Verification](https://www.postgrid.com/address-validation/france-address-verification/)

---

### Pitfall 9: FeatureGroup State Synchronization Issues

**What goes wrong:** Polygons disappear after editing, layer visibility doesn't update correctly, or events don't fire after layer modifications.

**Why it happens:** Not properly managing FeatureGroup references; removing and re-adding layers breaks event bindings.

**Prevention:**
- Initialize FeatureGroup once and pass to draw control
- Never remove and re-add FeatureGroup from map
- Update layer properties in-place rather than replacing layers
- Use layer IDs to track layers across state changes
- Listen to draw:created, draw:edited, draw:deleted events
- Re-bind events if layers are replaced

**Detection:**
- Edited polygons don't save
- Zones disappear after editing
- Click events stop working after layer updates
- Console warnings about invalid layer references

**Phase to address:** Interactive Editing (Phase 3)

**Sources:**
- [Leaflet FeatureGroup layer management](https://runebook.dev/en/articles/leaflet/index/featuregroup)
- [Layer order issues in Leaflet](https://github.com/Leaflet/Leaflet/issues/2086)

---

## Minor Pitfalls

Mistakes that cause annoyance but are easily fixable.

### Pitfall 10: No Visual Feedback During Drawing

**What goes wrong:** Users don't know if they're in drawing mode, which zone is selected, or if action succeeded.

**Prevention:**
- Show clear "Drawing mode active" indicator
- Highlight selected zones with distinct color
- Display cursor change (crosshair) when in drawing mode
- Show toast/notification after save succeeds
- Add "last saved" timestamp
- Visual confirmation for delete actions

**Phase to address:** UI Polish (Phase 5)

---

### Pitfall 11: Polygon Self-Intersection Allowed

**What goes wrong:** Users can draw figure-eight or self-intersecting polygons that create invalid zones.

**Prevention:**
- Set `allowIntersection: false` in draw options
- Show error message when intersection attempted
- Validate polygon geometry before save

**Phase to address:** Interactive Editing (Phase 3)

**Sources:**
- [Leaflet.draw documentation](https://leaflet.github.io/Leaflet.draw/docs/leaflet-draw-latest.html)

---

### Pitfall 12: Missing Data Export Before Major Changes

**What goes wrong:** Users lose data when testing features or making bulk changes without backup.

**Prevention:**
- Add prominent "Export JSON" button from day one
- Auto-download backup before clear/reset operations
- Show warning before destructive actions

**Phase to address:** Data Persistence (Phase 2)

---

### Pitfall 13: No Keyboard Shortcuts

**What goes wrong:** Power users have to use mouse for everything, slowing down workflow.

**Prevention:**
- Escape key: cancel current drawing
- Delete/Backspace: remove selected zone
- Ctrl+Z/Y: undo/redo
- Document shortcuts in UI

**Phase to address:** UI Polish (Phase 5)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Map Initialization | Using Leaflet.draw instead of Leaflet-Geoman | Research library maintenance status; choose actively maintained library |
| Data Persistence | No localStorage error handling | Wrap all storage operations in try-catch; implement quota checking |
| Polygon Drawing | Touch support issues on mobile | Test on real devices; use library with good touch support |
| Geocoding | Poor French address results | Use BAN API as primary; validate coordinates within France bounds |
| Marker Assignment | No point-in-polygon validation | Implement spatial query validation on save |
| Import/Export | GeoJSON coordinate integrity | Validate GeoJSON structure; test round-trip import/export |
| Data Model | Coordinate reference system confusion | Document CRS usage; use consistent [lat,lng] or [lng,lat] order |

---

## Validation Checklist

Before launching each phase, verify these pitfalls are addressed:

**Phase 1 (Map Foundation):**
- [ ] Using maintained drawing library (Leaflet-Geoman, not Leaflet.draw)
- [ ] Coordinate system documented (storage vs display)
- [ ] Base map tile provider selected with appropriate license

**Phase 2 (Data Persistence):**
- [ ] localStorage operations wrapped in try-catch
- [ ] Quota checking implemented
- [ ] Export/download backup functionality available
- [ ] GeoJSON validation on save

**Phase 3 (Interactive Editing):**
- [ ] Touch support tested on real mobile devices
- [ ] Self-intersecting polygons blocked
- [ ] FeatureGroup properly initialized and managed
- [ ] Visual feedback for all actions

**Phase 4 (Geocoding & Markers):**
- [ ] BAN API integrated for French addresses
- [ ] Geocoding results validated (bounds checking)
- [ ] Point-in-polygon validation for marker assignment
- [ ] Manual coordinate entry fallback available

**Phase 5 (Polish & Mobile):**
- [ ] Keyboard shortcuts implemented
- [ ] Mobile touch targets sized appropriately (44x44px minimum)
- [ ] Undo/redo functionality working
- [ ] Loading states and error messages clear

---

## Sources

### High Confidence (Official Documentation & GitHub Issues)
- [Leaflet Documentation](https://leafletjs.com/reference.html)
- [Leaflet-Geoman vs Leaflet.draw](https://geoman.io/blog/leaflet-geoman-vs-leaflet-draw)
- [GeoJSON Specification](https://geojson.org/)
- [GeoJSON File Errors Guide](https://tracextech.com/geojson-file-errors/)
- [Leaflet.draw GitHub Issues](https://github.com/Leaflet/Leaflet.draw/issues)

### Medium Confidence (Community Sources & Technical Articles)
- [Handling localStorage Errors](https://mmazzarolo.com/blog/2022-06-25-local-storage-status/)
- [Geographic Coordinate Systems 101](https://8thlight.com/insights/geographic-coordinate-systems-101)
- [Point-in-Polygon Algorithms](https://www.numberanalytics.com/blog/ultimate-guide-point-in-polygon-computational-geometry)
- [BAN French Geocoding](https://www.data.gouv.fr/en/reuses/geocoding-french-addresses-with-ban/)

### Additional References
- [MDN Storage API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- [WGS84 Geodetic Systems](https://www.smarty.com/articles/what-is-wgs84-epsg-4326-geodetic-systems)
- [Leaflet Mobile Touch Issues](https://github.com/Leaflet/Leaflet.draw/issues/789)
