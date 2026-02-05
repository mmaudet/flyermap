# Phase 1: Foundation - Research

**Researched:** 2026-02-05
**Domain:** Interactive web mapping with Leaflet.js
**Confidence:** HIGH

## Summary

Phase 1 requires building an interactive map centered on Chapet (78130) with commune boundaries and street labels. The technical approach is well-established: Leaflet.js for map interactivity, OpenStreetMap tiles for base map visualization, and geo.api.gouv.fr for French administrative boundaries in GeoJSON format.

Leaflet 1.9.4 is the current stable version (as of May 2023), with solid documentation and proven integration with Vite. The stack is mature and widely adopted. Key implementation considerations include proper CSS import order, coordinate system consistency (WGS84/EPSG:4326 throughout), and GeoJSON coordinate order handling (Leaflet auto-converts from GeoJSON's [lng, lat] to its [lat, lng] convention).

The main pitfall to avoid is Coordinate Reference System (CRS) confusion between Leaflet's [latitude, longitude] convention and GeoJSON's [longitude, latitude] standard. Leaflet's L.geoJSON() handles this conversion automatically, but developers must remain aware when working with raw coordinates or different data sources.

**Primary recommendation:** Use Leaflet 1.9.4 with standard OpenStreetMap tiles, fetch Chapet boundary from geo.api.gouv.fr at initialization, and import Leaflet CSS directly in JavaScript for proper Vite bundling. Document CRS usage explicitly (WGS84/EPSG:4326) in code comments to prevent future confusion.

## Standard Stack

The established libraries/tools for interactive web mapping with Leaflet:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Leaflet | 1.9.4 | Interactive map library | Industry standard for web mapping, mobile-friendly, extensive plugin ecosystem, well-documented |
| OpenStreetMap tiles | N/A | Base map visualization | Free, open-source tiles with street names, standard attribution requirements, globally comprehensive |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| geo.api.gouv.fr | N/A (API) | French administrative boundaries | Authoritative source for commune boundaries in France, returns GeoJSON in WGS84 |
| Vite | (project standard) | Build tool | Fast development server, native ESM support, automatic CSS bundling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Leaflet 1.9.4 | Leaflet 2.0.0-alpha | 2.0 is still alpha (as of Aug 2025), drops IE support, breaking API changes, not production-ready |
| OpenStreetMap | MapTiler, Mapbox | Commercial providers require API keys, may have costs, OSM is free with attribution |
| geo.api.gouv.fr | Direct GeoJSON files | Static files lack updates, API ensures current administrative boundaries |

**Installation:**
```bash
npm install leaflet@1.9.4
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── main.js              # Entry point, Leaflet initialization
├── map/                 # Map-related modules
│   ├── config.js        # Map configuration (center coords, zoom levels)
│   └── layers.js        # Layer management (boundaries, markers)
├── data/                # Data fetching and transformation
│   └── commune.js       # Fetch commune boundary from geo.api.gouv.fr
├── styles/              # CSS files
│   └── map.css          # Map-specific styles
└── index.html           # HTML with map container div
```

### Pattern 1: Leaflet Initialization with Vite
**What:** Import Leaflet CSS and JavaScript as ES modules, initialize map after DOM loads
**When to use:** All Vite-based Leaflet projects for proper bundling and HMR support
**Example:**
```javascript
// Source: https://docs.maptiler.com/leaflet/examples/vite-vanilla-js-default/
// main.js
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './style.css';

// Initialize map after DOM ready
const map = L.map('map').setView([48.969, 1.932], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);
```

### Pattern 2: Loading GeoJSON from API
**What:** Fetch GeoJSON boundary data and add to map with styling
**When to use:** When loading commune boundaries or other GeoJSON features from APIs
**Example:**
```javascript
// Source: https://leafletjs.com/examples/geojson/
// Fetch and display commune boundary
fetch('https://geo.api.gouv.fr/communes/78140?format=geojson&geometry=contour')
  .then(response => response.json())
  .then(data => {
    L.geoJSON(data, {
      style: {
        color: '#0066cc',
        weight: 2,
        fillOpacity: 0.1
      }
    }).addTo(map);
  });
```

### Pattern 3: Map Container Setup
**What:** Create HTML container with explicit height and ensure map renders correctly
**When to use:** Every Leaflet implementation to prevent rendering issues
**Example:**
```html
<!-- Source: https://leafletjs.com/examples/quick-start/ -->
<div id="map" style="height: 600px;"></div>
```
```css
/* For responsive full-height maps */
#map {
  height: 100vh;
  width: 100%;
}
```

### Anti-Patterns to Avoid
- **Relative height on map container (height: 100%):** Without explicit parent heights, browser calculates to 0px. Use fixed heights (px, vh) or ensure all parent elements have heights.
- **Not importing Leaflet CSS:** Map will render with broken layout and missing icons. Always `import 'leaflet/dist/leaflet.css'` before custom styles.
- **Hardcoding coordinates in [longitude, latitude] order:** Leaflet expects [latitude, longitude]. While L.geoJSON() auto-converts, raw coordinates must follow Leaflet's convention.
- **Forgetting map.invalidateSize():** When map container is initially hidden (tabs, modals), call `map.invalidateSize()` after container becomes visible.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fetch and parse GeoJSON | Custom XMLHttpRequest or complex fetch logic | `fetch()` + `L.geoJSON()` | Leaflet's L.geoJSON() handles coordinate conversion, styling, and feature iteration automatically |
| Marker icon paths | Manual image path management | Default Leaflet markers or import from leaflet/dist/images | Vite bundling can break relative paths; Leaflet provides working defaults |
| Map tile URL templates | Custom tile server logic | Standard tile providers (OSM, MapTiler, Mapbox) | URL templates handle zoom/pan logic, caching headers, and coordinate math |
| Coordinate transformations | Manual lat/lng conversions | Leaflet's built-in CRS handling + L.geoJSON() | Leaflet auto-converts between CRS systems, handles projection edge cases |

**Key insight:** Leaflet's L.geoJSON() method is surprisingly powerful. It handles coordinate order conversion (GeoJSON's [lng, lat] to Leaflet's [lat, lng]), applies styling, enables feature-by-feature callbacks (onEachFeature), and supports filtering. Custom GeoJSON parsing almost always misses edge cases that Leaflet already solves.

## Common Pitfalls

### Pitfall 1: Coordinate Order Confusion (Lat/Lng vs Lng/Lat)
**What goes wrong:** GeoJSON uses [longitude, latitude] order, but Leaflet uses [latitude, longitude]. Manually creating coordinates in wrong order shifts map features thousands of kilometers.
**Why it happens:** Mathematical convention (X, Y = lng, lat) differs from geographic convention (lat, lng). GeoJSON follows math convention; Leaflet follows geographic convention.
**How to avoid:**
- Always use L.geoJSON() to load GeoJSON data (auto-converts)
- When manually creating L.marker() or L.latLng(), use [lat, lng] order
- Document coordinate order in comments: `// [48.969, 1.932] = [lat, lng] for Chapet`
**Warning signs:** Map shows gray tiles or loads wrong continent, features appear in unexpected locations
**Source:** [GitHub Issue #1455](https://github.com/Leaflet/Leaflet/issues/1455), [Medium article on coordinate order](https://adequatica.medium.com/latitude-and-longitude-order-in-frontend-oriented-applications-0de61453ed4a)

### Pitfall 2: Map Container Has Zero Height
**What goes wrong:** Map renders as invisible 0-height element or shows gray background without tiles.
**Why it happens:** CSS percentage heights require parent elements to have explicit heights. `height: 100%` on #map div calculates to 0px if parents lack heights.
**How to avoid:**
- Use explicit heights: `height: 600px` or `height: 100vh`
- If using `height: 100%`, ensure all parent elements (including html, body) have `height: 100%`
- Alternatively, use `position: absolute` with `top: 0; bottom: 0; left: 0; right: 0`
**Warning signs:** Blank page, gray rectangle where map should be, console errors about map container
**Source:** [GitHub Issue #1266](https://github.com/Leaflet/Leaflet/issues/1266), [Stack Exchange discussion](https://copyprogramming.com/howto/set-leaflet-map-to-height-100-of-container)

### Pitfall 3: Missing or Incorrect OpenStreetMap Attribution
**What goes wrong:** Violating OSM's tile usage policy and license requirements by omitting or incorrectly displaying attribution.
**Why it happens:** Developers overlook attribution parameter or hide it with CSS thinking it's optional.
**How to avoid:**
- Always include `attribution` option in L.tileLayer(): `attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'`
- Don't hide attribution with CSS (display: none) or place it behind UI elements
- Link "OpenStreetMap" text to openstreetmap.org/copyright
- Attribution must be visible in bottom-right corner by default
**Warning signs:** Missing copyright notice, legal compliance issues, potential tile access blocking
**Source:** [OSM Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/), [OSM Attribution Guidelines](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines)

### Pitfall 4: Not Calling invalidateSize() After Container Resize
**What goes wrong:** Map displays incorrectly after tab/modal opens, tiles misaligned, map centered incorrectly.
**Why it happens:** Leaflet caches container dimensions at initialization. Hidden containers (display: none) report 0x0 size. When container becomes visible, Leaflet doesn't auto-detect the change.
**How to avoid:**
- Call `map.invalidateSize()` after making hidden containers visible
- Add event listeners to tab/modal show events: `tabButton.addEventListener('click', () => map.invalidateSize())`
- For React/Vue components, call in useEffect/onMounted after DOM updates
- Use `setTimeout(() => map.invalidateSize(), 100)` if immediate call doesn't work
**Warning signs:** Map tiles offset, zoom controls in wrong position, panning feels broken, popups misaligned
**Source:** [GitHub Issue #941](https://github.com/Leaflet/Leaflet/issues/941), [Drupal issue discussion](https://www.drupal.org/project/leaflet/issues/2845418)

### Pitfall 5: CORS Issues When Fetching GeoJSON
**What goes wrong:** Browser blocks geo.api.gouv.fr requests with "CORS policy" error, map loads but boundary doesn't appear.
**Why it happens:** Browser security prevents loading resources from different origins unless server sends CORS headers.
**How to avoid:**
- geo.api.gouv.fr *should* support CORS by default (government API)
- If issues arise, check network tab for actual error message
- For non-CORS APIs, proxy through your own server or use CORS proxy services (dev only)
- Test API endpoint in browser first to verify CORS headers
**Warning signs:** Console error "blocked by CORS policy", fetch() promise rejected, empty GeoJSON layer
**Source:** [GitHub discussion](https://github.com/Esri/esri-leaflet/issues/563), [Medium tutorial](https://fmuchembi.medium.com/consuming-a-geospatial-rest-api-with-react-leaflet-and-data-filtering-363502a50cc2)

## Code Examples

Verified patterns from official sources:

### Complete Minimal Leaflet Setup with Vite
```javascript
// Source: https://docs.maptiler.com/leaflet/examples/vite-vanilla-js-default/
// main.js
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './style.css';

// Chapet coordinates: 48.969°N, 1.932°E
const map = L.map('map').setView([48.969, 1.932], 13);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
```

### Fetch Commune Boundary from geo.api.gouv.fr
```javascript
// Source: Verified from https://geo.api.gouv.fr/decoupage-administratif/communes
// and https://leafletjs.com/examples/geojson/

// Chapet INSEE code: 78140
const CHAPET_INSEE = '78140';

async function loadCommuneBoundary() {
  try {
    const response = await fetch(
      `https://geo.api.gouv.fr/communes/${CHAPET_INSEE}?format=geojson&geometry=contour`
    );
    const geojson = await response.json();

    L.geoJSON(geojson, {
      style: {
        color: '#0066cc',
        weight: 2,
        fillColor: '#0066cc',
        fillOpacity: 0.1
      }
    }).addTo(map);
  } catch (error) {
    console.error('Failed to load commune boundary:', error);
  }
}

// Call after map initialization
loadCommuneBoundary();
```

### GeoJSON Layer with Popup
```javascript
// Source: https://leafletjs.com/examples/geojson/
L.geoJSON(geojsonFeature, {
  onEachFeature: function(feature, layer) {
    if (feature.properties && feature.properties.nom) {
      layer.bindPopup(feature.properties.nom);
    }
  },
  style: function(feature) {
    return {
      color: feature.properties.color || '#3388ff',
      weight: 2
    };
  }
}).addTo(map);
```

### HTML Structure
```html
<!-- Source: https://leafletjs.com/examples/quick-start/ -->
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Carte de Chapet</title>
</head>
<body>
  <div id="map"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

```css
/* src/style.css */
html, body {
  margin: 0;
  padding: 0;
  height: 100%;
}

#map {
  height: 100vh;
  width: 100%;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Including Leaflet via CDN | npm install + ES modules | 2020+ | Better tree-shaking, version control, dev experience with Vite |
| jQuery for AJAX requests | Native fetch() API | 2015+ (ES6) | Eliminates jQuery dependency, modern promise-based async |
| Global L variable | import L from 'leaflet' | 2020+ (ES modules) | Better bundling, explicit dependencies, easier testing |
| Lambert 93 (EPSG:2154) for France | WGS84 (EPSG:4326) for web maps | N/A | OSM tiles require WGS84, Leaflet default is EPSG:3857 (Web Mercator) |

**Deprecated/outdated:**
- **Leaflet 0.7.x**: Last major pre-1.0 version, lacks modern features, poor mobile support
- **Google Maps API v2**: Deprecated in 2010, v3 required until 2016, now requires billing
- **Leaflet.ajax plugin**: No longer needed with native fetch() API
- **marker-icon.png manual copying**: Vite handles asset bundling, imports work automatically

**Upcoming:**
- **Leaflet 2.0.0-alpha**: Released May 2025, drops IE support, moves to ES modules, removes global L variable from core. Breaking changes mean 1.9.4 remains stable choice for production until 2.0 reaches stable release.

## Open Questions

Things that couldn't be fully resolved:

1. **geo.api.gouv.fr Response Size and Caching**
   - What we know: Documentation mentions contour geometry responses are ~34MB for all regions (vs 480KB without geometry)
   - What's unclear: Single commune boundary size, whether API sends cache headers, optimal client-side caching strategy
   - Recommendation: Fetch on first load, measure actual response size for Chapet, implement localStorage caching if > 100KB

2. **Leaflet 2.0 Migration Timeline**
   - What we know: 2.0.0-alpha released August 2025, breaking API changes, modern ES modules
   - What's unclear: Stable release timeline, plugin ecosystem compatibility, migration effort
   - Recommendation: Stay on 1.9.4 for Phase 1, monitor 2.0 release status, plan migration for later phase if stable by Q2 2026

3. **OpenStreetMap Tile Server Rate Limits**
   - What we know: OSM tile usage policy exists, caching required (7+ days), attribution mandatory
   - What's unclear: Specific request rate limits for tile.openstreetmap.org, when to use alternative CDN
   - Recommendation: Implement proper cache headers, consider MapTiler/OSM US Tiles if rate limits become issue

## Sources

### Primary (HIGH confidence)
- [Leaflet Download Page](https://leafletjs.com/download.html) - Version info, installation methods
- [Leaflet Quick Start](https://leafletjs.com/examples/quick-start/) - Initialization patterns
- [Leaflet API Reference](https://leafletjs.com/reference.html) - API methods, coordinate conventions
- [Leaflet GeoJSON Tutorial](https://leafletjs.com/examples/geojson/) - GeoJSON layer patterns
- [geo.api.gouv.fr Communes API](https://geo.api.gouv.fr/decoupage-administratif/communes) - Boundary API documentation
- [geo.api.gouv.fr User Guide](https://guides.data.gouv.fr/reutiliser-des-donnees/utiliser-les-api-geographiques/utiliser-lapi-decoupage-administratif) - GeoJSON format parameters, CRS info
- [OSM Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/) - Attribution requirements, caching rules
- [OSM Attribution Guidelines](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines) - Legal requirements for OSM usage

### Secondary (MEDIUM confidence)
- [MapTiler Leaflet + Vite Tutorial](https://docs.maptiler.com/leaflet/examples/vite-vanilla-js-default/) - Vite setup patterns (verified with official Leaflet docs)
- [GitHub: Coordinate order discussion](https://github.com/Leaflet/Leaflet/issues/1455) - Historical context on lat/lng convention
- [Medium: Latitude/Longitude Order](https://adequatica.medium.com/latitude-and-longitude-order-in-frontend-oriented-applications-0de61453ed4a) - Coordinate order explanation
- [GitHub: Map container height issue](https://github.com/Leaflet/Leaflet/issues/1266) - CSS height pitfall documentation
- [GitHub: invalidateSize discussion](https://github.com/Leaflet/Leaflet/issues/941) - When to call invalidateSize()

### Tertiary (LOW confidence - WebSearch only)
- [EPSG:4326 documentation](https://epsg.io/4326) - WGS84 coordinate system specs
- [Map-France.com Chapet coordinates](https://www.map-france.com/Chapet-78130/) - Chapet center coordinates (48.969°N, 1.932°E)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Leaflet 1.9.4 verified from official docs, widely used stable version
- Architecture: HIGH - Patterns from official tutorials, Vite setup documented by multiple sources
- Pitfalls: HIGH - All pitfalls documented in official GitHub issues or Stack Exchange with community consensus
- geo.api.gouv.fr: MEDIUM - API documented but CRS not explicitly stated (inferred WGS84 from context)
- Chapet coordinates: MEDIUM - From mapping sites, not official INSEE source (adequate for initial centering)

**Research date:** 2026-02-05
**Valid until:** 2026-04-05 (60 days - stable ecosystem, Leaflet 1.9.4 released 2023, no major changes expected)

**Notes:**
- Leaflet 2.0.0-alpha exists but not production-ready; 1.9.4 remains stable choice
- geo.api.gouv.fr uses WGS84 (EPSG:4326) based on API guide context and GeoJSON standard
- All coordinate references in code should be documented as [lat, lng] order for clarity
- Phase 1 success depends on proper CRS documentation to avoid confusion in future phases
