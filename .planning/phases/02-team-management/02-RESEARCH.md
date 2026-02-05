# Phase 2: Team Management - Research

**Researched:** 2026-02-05
**Domain:** CSV parsing, French address geocoding, Leaflet markers, LocalStorage persistence, state management
**Confidence:** HIGH

## Summary

Phase 2: Team Management requires integrating five technical domains: CSV parsing for team member import, French address geocoding to convert addresses to coordinates, Leaflet markers to display team members on the map, LocalStorage for data persistence, and vanilla JavaScript state management to coordinate these components. Research reveals a well-established stack with actively maintained libraries and clear architectural patterns.

The critical finding is the urgency of using the new Géoplateforme API (data.geopf.fr/geocodage) instead of the deprecated api-adresse.data.gouv.fr API, which was decommissioned in January 2026. PapaParse 5.0 is the industry standard for CSV parsing with robust error handling. For markers, Leaflet's DivIcon with CSS provides lightweight, colored markers without requiring image files. LocalStorage requires defensive error handling with try-catch blocks around all write operations due to quota limits (5MB) and silent failures in private browsing mode.

The recommended architecture follows a State Manager pattern with PubSub for reactivity: CSV import → geocoding → state storage → marker rendering → LocalStorage persistence. This creates a unidirectional data flow that's easier to debug and maintain than direct DOM manipulation.

**Primary recommendation:** Build a centralized State Manager using the PubSub pattern with Proxy-based reactivity, wrap all LocalStorage operations in try-catch with quota monitoring, use PapaParse for CSV import with header validation, implement Géoplateforme API with proper rate limiting (50 req/s), and render markers using DivIcon with CSS for performance.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PapaParse | 5.0+ | CSV parsing to JSON | Industry standard (1.4M+ weekly downloads), RFC 4180 compliant, graceful error handling, header detection |
| Géoplateforme API | Current | French address geocoding | Official replacement for deprecated api-adresse, free, no API key, 50 req/s, BAN data source |
| Leaflet | 1.9.4 | Marker rendering | Already in project, native marker support, DivIcon for HTML/CSS markers |
| LocalStorage API | Native | Data persistence | Native browser API, GDPR compliant, synchronous, adequate for 5MB limit |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | N/A | State management | Vanilla JS PubSub pattern sufficient for this scale |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PapaParse | Papa.parse or manual splitting | Manual parsing breaks on edge cases (quoted commas, multiline fields) |
| Géoplateforme | Google Geocoding API | Requires API key, costs money, overkill for French-only addresses |
| DivIcon | Image-based custom icons | Image icons require file management, less flexible styling, larger payload |
| LocalStorage | IndexedDB | IndexedDB is async with complex API, overkill for simple key-value storage under 5MB |
| Vanilla state | Redux/MobX | External dependencies add complexity for simple single-user app |

**Installation:**
```bash
npm install papaparse@^5.0.0
```

Note: Géoplateforme API, Leaflet 1.9.4, and LocalStorage are already available (Leaflet installed in Phase 1, others are native/API-based).

## Architecture Patterns

### Recommended Project Structure
```
src/
├── data/
│   ├── teamMembers.js      # Team member state management
│   └── storage.js          # LocalStorage persistence layer
├── services/
│   ├── geocoding.js        # Géoplateforme API integration
│   └── csvImport.js        # PapaParse CSV parsing
├── map/
│   ├── markers.js          # Marker layer management
│   └── markerStyles.js     # DivIcon color generation
└── state/
    └── store.js            # PubSub state manager
```

### Pattern 1: PubSub State Manager

**What:** Centralized state with event-driven updates enabling decoupled components
**When to use:** All state changes (team member add/remove/update, geocoding results)

**Example:**
```javascript
// Source: https://css-tricks.com/build-a-state-management-system-with-vanilla-javascript/
class PubSub {
  constructor() {
    this.events = {};
  }

  subscribe(event, callback) {
    if(!this.events.hasOwnProperty(event)) {
      this.events[event] = [];
    }
    return this.events[event].push(callback);
  }

  publish(event, data = {}) {
    if(!this.events.hasOwnProperty(event)) {
      return [];
    }
    return this.events[event].map(callback => callback(data));
  }
}

// Usage
const pubsub = new PubSub();
pubsub.subscribe('teamMemberAdded', (member) => {
  // Update marker layer
  markerLayer.addMarker(member);
  // Persist to LocalStorage
  storage.save();
});
```

### Pattern 2: Defensive LocalStorage Wrapper

**What:** Try-catch wrapper with quota monitoring for all LocalStorage operations
**When to use:** Every localStorage.setItem call

**Example:**
```javascript
// Source: https://mmazzarolo.com/blog/2022-06-25-local-storage-status/
class Storage {
  save(key, data) {
    try {
      const serialized = JSON.stringify(data);

      // Check quota before save (warn at 80%)
      if (this.isNearQuota(serialized)) {
        console.warn('LocalStorage approaching quota limit');
      }

      localStorage.setItem(key, serialized);
      return { success: true };
    } catch (error) {
      // QuotaExceededError: code 22 (most browsers) or code 1014 (Firefox)
      if (error.code === 22 || error.code === 1014 ||
          error.name === 'QuotaExceededError') {
        return { success: false, error: 'QUOTA_EXCEEDED' };
      }
      return { success: false, error: 'STORAGE_FAILED' };
    }
  }

  isNearQuota(newData) {
    // Estimate storage: iterate all keys and sum lengths
    let used = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        used += localStorage[key].length + key.length;
      }
    }
    used += newData.length;
    const quota = 5 * 1024 * 1024; // 5MB
    return used / quota > 0.8;
  }
}
```

### Pattern 3: Debounced State Persistence

**What:** Batch state changes to avoid thrashing LocalStorage on rapid updates
**When to use:** State changes that happen frequently (geocoding results streaming in)

**Example:**
```javascript
// Source: https://www.joshwcomeau.com/react/persisting-react-state-in-localstorage/
class StateManager {
  constructor(storage) {
    this.storage = storage;
    this.saveTimer = null;
    this.DEBOUNCE_MS = 500;
  }

  debouncedSave(state) {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.storage.save('teamMembers', state);
    }, this.DEBOUNCE_MS);
  }

  // For critical saves (user explicitly clicks "Save")
  immediateSave(state) {
    clearTimeout(this.saveTimer);
    this.storage.save('teamMembers', state);
  }
}
```

### Pattern 4: CSV Import with Validation

**What:** Parse CSV with PapaParse, validate required fields, handle errors gracefully
**When to use:** User imports team member CSV file

**Example:**
```javascript
// Source: https://www.papaparse.com/docs
import Papa from 'papaparse';

function importCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,  // Use first row as field names
      skipEmptyLines: true,
      complete: (results) => {
        // Validate required fields
        const errors = validateTeamMembers(results.data);
        if (errors.length > 0) {
          reject({ type: 'VALIDATION_ERROR', errors });
          return;
        }
        resolve(results.data);
      },
      error: (error) => {
        reject({ type: 'PARSE_ERROR', error });
      }
    });
  });
}

function validateTeamMembers(members) {
  const errors = [];
  const requiredFields = ['name', 'address'];

  members.forEach((member, index) => {
    requiredFields.forEach(field => {
      if (!member[field] || member[field].trim() === '') {
        errors.push({
          row: index + 2, // +2: 1-indexed + header row
          field,
          message: `Missing required field: ${field}`
        });
      }
    });
  });

  return errors;
}
```

### Pattern 5: Batch Geocoding with Rate Limiting

**What:** Geocode multiple addresses while respecting API rate limits (50 req/s)
**When to use:** Importing multiple team members from CSV

**Example:**
```javascript
// Source: Géoplateforme API docs
class GeocodingService {
  constructor() {
    this.RATE_LIMIT_MS = 20; // 50 req/s = 1 req per 20ms
    this.BASE_URL = 'https://data.geopf.fr/geocodage/search';
  }

  async geocodeAddress(address) {
    const params = new URLSearchParams({
      q: address,
      limit: 1,
      index: 'address'
    });

    const response = await fetch(`${this.BASE_URL}?${params}`);
    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }

    const data = await response.json();
    if (data.features && data.features.length > 0) {
      const coords = data.features[0].geometry.coordinates;
      return {
        lat: coords[1],  // GeoJSON is [lng, lat]
        lng: coords[0],
        confidence: data.features[0].properties.score || 0
      };
    }

    throw new Error('Address not found');
  }

  async geocodeBatch(addresses) {
    const results = [];
    for (let i = 0; i < addresses.length; i++) {
      try {
        const result = await this.geocodeAddress(addresses[i]);
        results.push({ success: true, ...result });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }

      // Rate limiting: wait before next request
      if (i < addresses.length - 1) {
        await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_MS));
      }
    }
    return results;
  }
}
```

### Pattern 6: DivIcon Colored Markers

**What:** Create colored markers using CSS without image files
**When to use:** Displaying team members with unique colors

**Example:**
```javascript
// Source: https://www.geoapify.com/create-custom-map-marker-icon/
function createColoredMarker(color, label) {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `
      <div class="marker-pin" style="background-color: ${color}"></div>
      <div class="marker-label">${label}</div>
    `,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -42]
  });
}

// CSS (in style.css):
// .marker-pin {
//   width: 30px;
//   height: 30px;
//   border-radius: 50% 50% 50% 0;
//   position: absolute;
//   transform: rotate(-45deg);
//   left: 50%;
//   top: 50%;
//   margin: -15px 0 0 -15px;
// }
// .marker-pin::after {
//   content: '';
//   width: 24px;
//   height: 24px;
//   margin: 3px 0 0 3px;
//   background: #fff;
//   position: absolute;
//   border-radius: 50%;
// }
// .marker-label {
//   position: absolute;
//   top: 35px;
//   left: 50%;
//   transform: translateX(-50%);
//   font-size: 10px;
//   white-space: nowrap;
// }

// Usage
const marker = L.marker([48.986, 1.898], {
  icon: createColoredMarker('#c30b82', 'Jean')
}).addTo(map);
```

### Pattern 7: Marker Layer Management with FeatureGroup

**What:** Use FeatureGroup to manage multiple markers as a single layer
**When to use:** Adding/removing/updating team member markers

**Example:**
```javascript
// Source: https://leafletjs.com/examples/layers-control/
class MarkerLayer {
  constructor(map) {
    this.map = map;
    this.featureGroup = L.featureGroup().addTo(map);
    this.markersByMemberId = new Map();
  }

  addMarker(member) {
    const icon = createColoredMarker(member.color, member.name);
    const marker = L.marker([member.lat, member.lng], { icon });

    // Bind popup with member details
    marker.bindPopup(`
      <strong>${member.name}</strong><br>
      ${member.address}<br>
      ${member.phone || ''}
    `);

    this.featureGroup.addLayer(marker);
    this.markersByMemberId.set(member.id, marker);
  }

  removeMarker(memberId) {
    const marker = this.markersByMemberId.get(memberId);
    if (marker) {
      this.featureGroup.removeLayer(marker);
      this.markersByMemberId.delete(memberId);
    }
  }

  clearAll() {
    this.featureGroup.clearLayers();
    this.markersByMemberId.clear();
  }
}
```

### Anti-Patterns to Avoid

- **Direct DOM manipulation instead of state-driven updates:** Updating markers directly without updating state leads to inconsistencies between localStorage and UI
- **Synchronous geocoding blocking UI:** Geocoding is async; batch operations must not freeze the interface
- **Missing error boundaries for API failures:** Géoplateforme API can fail; must handle gracefully with user feedback
- **Hand-rolling CSV parsing with string.split(','):** Breaks on quoted fields containing commas, newlines in cells, escape characters
- **Storing raw File objects in state:** Files can't be serialized; extract data before state storage
- **No validation on CSV import:** Missing required fields cause errors later; validate at import boundary

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | string.split(',') line-by-line | PapaParse | Handles quoted fields, multiline cells, BOM, encoding issues, RFC 4180 compliance |
| French address geocoding | Custom API wrapper | Géoplateforme search endpoint | Official source, handles CEDEX, ordinals, Paris formats, postal codes |
| Colored markers | Generate PNG files | DivIcon with CSS | No file management, flexible styling, smaller payload, dynamic colors |
| LocalStorage quota detection | Assume 5MB works | Try-catch + quota calculation | Browsers fail silently in private mode, errors vary by browser |
| Rate limiting | Manual setTimeout tracking | Batch with sleep pattern | Prevents API throttling, handles retry logic, respects 50 req/s limit |
| State synchronization | Callback spaghetti | PubSub pattern | Decouples components, easier to debug, centralized event flow |

**Key insight:** CSV parsing and address geocoding have dozens of edge cases that aren't obvious until production. Using battle-tested libraries prevents data loss and API failures that are expensive to debug.

## Common Pitfalls

### Pitfall 1: GeoJSON Coordinate Order Confusion
**What goes wrong:** Coordinates appear in ocean or wrong location because GeoJSON uses [lng, lat] while Leaflet uses [lat, lng]
**Why it happens:** Géoplateforme API returns GeoJSON with coordinates in [longitude, latitude] order, but Leaflet's L.marker expects [latitude, longitude]
**How to avoid:**
- Always swap coordinates when converting from GeoJSON to Leaflet: `[coords[1], coords[0]]`
- Document coordinate order in code comments
- Add validation that lat is between 41-51°N and lng is between -5-10°E for France
**Warning signs:** Markers appear in the Atlantic Ocean or completely off map

### Pitfall 2: LocalStorage Quota Exceeded Without Warning
**What goes wrong:** Data loss when localStorage hits 5MB limit; silent failure in private/incognito mode; complete wipe when users clear browsing history
**Why it happens:** Browsers throw QuotaExceededError at 5-10MB, private browsing mode blocks localStorage completely, clearing history wipes all data
**How to avoid:**
- Wrap ALL localStorage.setItem() in try-catch blocks
- Check quota before large saves using length calculation
- Show warning at >80% usage with "Export to JSON" prompt
- Add "last saved" indicator to show persistence is working
- Provide JSON export as backup mechanism
**Warning signs:** Users report "lost work", no error messages in console, data doesn't persist across sessions

### Pitfall 3: Geocoding API Failures with No Fallback
**What goes wrong:** Import fails completely if geocoding API is down or rate limited; users lose work
**Why it happens:** Network failures, API maintenance, rate limit exceeded (>50 req/s), malformed addresses
**How to avoid:**
- Implement retry logic with exponential backoff
- Show progress indicator during batch geocoding
- Allow partial success: save geocoded members, flag failed addresses
- Validate address format before API call
- Cache geocoding results to avoid re-geocoding same address
- Provide manual coordinate entry as fallback
**Warning signs:** Import hangs indefinitely, no feedback on geocoding progress, all-or-nothing import behavior

### Pitfall 4: CSV Field Name Mismatches
**What goes wrong:** Import fails or creates incomplete records because CSV headers don't match expected field names
**Why it happens:** Users export from different systems with different column names (e.g., "Nom" vs "Name", "Adresse" vs "Address")
**How to avoid:**
- Accept multiple field name variations (case-insensitive: name/nom/Name/Nom)
- Show field mapping UI during import
- Validate required fields exist before processing
- Provide CSV template download
- Show preview of parsed data before confirming import
**Warning signs:** Imported members have missing fields, user says "the CSV has all the data"

### Pitfall 5: Memory Leaks from Marker Management
**What goes wrong:** Performance degrades over time as markers are added/removed without proper cleanup
**Why it happens:** Event listeners not removed, markers not cleared from FeatureGroup, references kept in closure
**How to avoid:**
- Use FeatureGroup.clearLayers() when removing all markers
- Call marker.remove() to detach from map
- Remove event listeners with .off() before removing markers
- Don't keep marker references in multiple places
- Use Map() for ID→marker lookup instead of plain objects
**Warning signs:** Memory usage grows over time, map becomes sluggish after multiple imports, browser tab crashes

### Pitfall 6: Race Conditions in Batch Geocoding
**What goes wrong:** Geocoding results appear in wrong order or get assigned to wrong team members
**Why it happens:** Async geocoding completes out of order, state updates race with UI updates
**How to avoid:**
- Use Promise.all() or sequential await for batch operations
- Pass member ID through geocoding pipeline to maintain association
- Update state atomically (all results at once, not one-by-one)
- Show loading state during batch operations
- Disable import button until current operation completes
**Warning signs:** Markers appear at wrong addresses, coordinates swapped between team members

### Pitfall 7: French Address Format Edge Cases
**What goes wrong:** Valid French addresses fail to geocode due to format issues
**Why it happens:** Paris uses "Rue de Rivoli 85" instead of "85 Rue de Rivoli", ordinal streets (1er, 2e), CEDEX codes, postal box addresses
**How to avoid:**
- Use Géoplateforme API which handles French formats
- Don't validate address format client-side (too many edge cases)
- Allow user to review geocoded location before confirming
- Show confidence score from geocoding API
- Provide manual correction option for low-confidence results
**Warning signs:** Common addresses like "1er Arrondissement" fail to geocode, Paris addresses geocode to wrong locations

## Code Examples

Verified patterns from official sources:

### Initializing PapaParse
```javascript
// Source: https://www.papaparse.com/docs
import Papa from 'papaparse';

function handleFileSelect(event) {
  const file = event.target.files[0];

  Papa.parse(file, {
    header: true,           // First row is field names
    dynamicTyping: true,    // Convert numbers to number type
    skipEmptyLines: true,   // Ignore blank lines
    complete: (results) => {
      console.log('Parsed data:', results.data);
      console.log('Errors:', results.errors);
      console.log('Meta:', results.meta);
    },
    error: (error) => {
      console.error('Parse failed:', error);
    }
  });
}
```

### Geocoding with Géoplateforme API
```javascript
// Source: https://geoservices.ign.fr/documentation/services/services-geoplateforme/geocodage
async function geocode(address, postcode = null) {
  const params = new URLSearchParams({
    q: address,
    limit: 1,
    index: 'address'
  });

  if (postcode) {
    params.append('postcode', postcode);
  }

  const url = `https://data.geopf.fr/geocodage/search?${params}`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.features && data.features.length > 0) {
    const feature = data.features[0];
    return {
      lat: feature.geometry.coordinates[1],  // Swap: GeoJSON is [lng,lat]
      lng: feature.geometry.coordinates[0],
      label: feature.properties.label,
      score: feature.properties.score  // Confidence 0-1
    };
  }

  throw new Error('Address not found');
}
```

### Creating Marker Popup
```javascript
// Source: https://leafletjs.com/reference.html#marker
function createMarkerWithPopup(member) {
  const marker = L.marker([member.lat, member.lng], {
    icon: createColoredMarker(member.color, member.name)
  });

  // Bind popup with HTML content
  marker.bindPopup(`
    <div class="member-popup">
      <h3>${member.name}</h3>
      <p><strong>Adresse:</strong><br>${member.address}</p>
      ${member.phone ? `<p><strong>Téléphone:</strong><br>${member.phone}</p>` : ''}
    </div>
  `);

  return marker;
}
```

### Debounced LocalStorage Save
```javascript
// Source: https://www.joshwcomeau.com/react/persisting-react-state-in-localstorage/
class DebouncedStorage {
  constructor(key, delayMs = 500) {
    this.key = key;
    this.delayMs = delayMs;
    this.timer = null;
  }

  save(data) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      try {
        localStorage.setItem(this.key, JSON.stringify(data));
      } catch (error) {
        console.error('Storage save failed:', error);
      }
    }, this.delayMs);
  }

  load() {
    try {
      const item = localStorage.getItem(this.key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Storage load failed:', error);
      return null;
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| api-adresse.data.gouv.fr | data.geopf.fr/geocodage | Jan 2026 | CRITICAL: Old API decommissioned, must use new endpoint |
| Image-based marker icons | DivIcon with CSS | Always available | Lighter weight, no file management, dynamic styling |
| Manual CSV parsing | PapaParse library | Industry standard since 2013 | Handles edge cases that break manual parsing |
| Callbacks for async flow | Async/await | ES2017 | Cleaner code, easier error handling, no callback hell |
| Plain objects for state | Proxy-based reactivity | ES2015 | Automatic change detection without explicit watchers |

**Deprecated/outdated:**
- **api-adresse.data.gouv.fr:** Decommissioned January 2026, replaced by Géoplateforme API at data.geopf.fr/geocodage
- **Leaflet.draw:** Unmaintained since 2019, use Leaflet-Geoman instead (relevant for Phase 3, not Phase 2)
- **jQuery CSV plugins:** PapaParse is framework-agnostic and better maintained

## Open Questions

Things that couldn't be fully resolved:

1. **Géoplateforme API CORS configuration**
   - What we know: API is accessible via fetch(), endpoint is public
   - What's unclear: Whether CORS headers are set for all origins or specific domains
   - Recommendation: Test early in implementation; if CORS fails, may need proxy or backend

2. **Optimal batch size for geocoding**
   - What we know: Rate limit is 50 req/s per IP
   - What's unclear: Whether smaller batches with delays are better than hitting rate limit
   - Recommendation: Start with 20ms delay (50 req/s), monitor for 429 errors, adjust if needed

3. **LocalStorage quota calculation accuracy**
   - What we know: Browsers generally provide 5MB, but calculation includes keys + values
   - What's unclear: Exact overhead per key-value pair, browser-specific variations
   - Recommendation: Use conservative 4MB threshold for warnings, provide JSON export as safety net

4. **Side panel implementation approach**
   - What we know: Requirement TEAM-04 needs side panel with team member list
   - What's unclear: Whether to use Leaflet plugin (leaflet-sidebar) or custom HTML/CSS panel
   - Recommendation: Research during implementation—try native CSS first (simpler), use plugin if complex features needed

5. **Color assignment strategy for team members**
   - What we know: Each team member needs unique color for marker
   - What's unclear: Whether colors should be user-selectable, auto-generated, or from predefined palette
   - Recommendation: Start with predefined palette (8-12 distinct colors), allow manual override later

## Sources

### Primary (HIGH confidence)
- [PapaParse Documentation](https://www.papaparse.com/) - Version 5.0 features, API reference, configuration options
- [Géoplateforme API Documentation](https://geoservices.ign.fr/documentation/services/services-geoplateforme/geocodage) - Official endpoints, rate limits, response format
- [Géoplateforme API Guide (data.gouv.fr)](https://guides.data.gouv.fr/reutiliser-des-donnees/prendre-en-main-lapi-adresse-portee-par-lign) - Request parameters, examples, error handling
- [Leaflet Marker Reference](https://leafletjs.com/reference.html#marker) - Marker creation, options, methods, events
- [Leaflet Icon Reference](https://leafletjs.com/reference.html#icon) - Icon and DivIcon API, customization options
- [Leaflet Layer Groups](https://leafletjs.com/examples/layers-control/) - FeatureGroup usage, layer management patterns
- [MDN Storage API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) - Storage quotas, eviction criteria

### Secondary (MEDIUM confidence)
- [Handling localStorage errors](https://mmazzarolo.com/blog/2022-06-25-local-storage-status/) - Error detection patterns, quota exceeded handling
- [Fix Failed to execute 'setItem' on 'Storage'](https://trackjs.com/javascript-errors/failed-to-execute-setitem-on-storage/) - Browser-specific error codes, debugging strategies
- [LocalStorage vs IndexedDB Guide](https://dev.to/tene/localstorage-vs-indexeddb-javascript-guide-storage-limits-best-practices-fl5) - Storage comparison, when to use each, limits
- [Build a state management system with vanilla JavaScript](https://css-tricks.com/build-a-state-management-system-with-vanilla-javascript/) - PubSub pattern, Proxy-based reactivity, Store architecture
- [State Management in Vanilla JS: 2026 Trends](https://medium.com/@chirag.dave/state-management-in-vanilla-js-2026-trends-f9baed7599de) - Modern patterns, when to use each approach
- [Persisting React State in localStorage](https://www.joshwcomeau.com/react/persisting-react-state-in-localstorage/) - Debouncing patterns for storage (applicable to vanilla JS)
- [Create custom map marker icon](https://www.geoapify.com/create-custom-map-marker-icon/) - DivIcon implementation with CSS, complete examples
- [Geocoding French addresses with BAN](https://joelgombin.github.io/banR/articles/geocode.html) - French address peculiarities, common errors
- [Address Guidelines for France](https://docs.precisely.com/docs/sftw/spectrum/12.0/webhelp/en/EnterpriseGeocoding/FRA/FRA_SOAP/EnterpriseGeocoding/FRA/source/input_recommendations.html) - French address formats, ordinals, CEDEX handling
- [Validating CSV data with PapaParse](https://app.studyraid.com/en/read/11463/359359/validating-csv-data) - Field validation strategies, error handling patterns
- [Optimizing Leaflet Performance with Many Markers](https://medium.com/@silvajohnny777/optimizing-leaflet-performance-with-a-large-number-of-markers-0dea18c2ec99) - Performance strategies, memory leak prevention
- [Understand memory leak prevention in Leaflet](https://app.studyraid.com/en/read/11881/378250/memory-leak-prevention) - Event listener cleanup, layer removal patterns
- [Debounce vs Throttle in JavaScript](https://ansibytecode.com/understanding-debounce-and-throttle-in-javascript/) - Implementation patterns, when to use each
- [Understanding LocalStorage Quota Exceeded Errors](https://medium.com/@zahidbashirkhan/understanding-and-resolving-localstorage-quota-exceeded-errors-5ce72b1d577a) - Quota management strategies, fallback approaches
- [CSV to JSON parsing validation errors](https://www.linkedin.com/advice/0/what-most-common-challenges-converting-csv-gmgqc) - Common edge cases, data structure issues

### Tertiary (LOW confidence)
- [Leaflet Side Panel Plugins](https://github.com/maxwell-ilai/Leaflet.SidePanel) - Plugin options for side panel (unverified compatibility with Leaflet 1.9.4)
- [store-local-storage-debounce.js](https://gist.github.com/davidgilbertson/8be8bf9d870a28e34631dfc876274deb) - Community debouncing pattern (unverified in production)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - PapaParse and Leaflet verified via official docs, Géoplateforme API verified via official IGN/data.gouv.fr documentation
- Architecture: HIGH - PubSub pattern widely documented, LocalStorage patterns standard, marker management from official Leaflet docs
- Pitfalls: MEDIUM - LocalStorage quota issues verified via multiple sources, geocoding edge cases from official French address docs, some scenarios inferred from community sources

**Research date:** 2026-02-05
**Valid until:** ~60 days (2026-04-05) - Stable domain with mature libraries; Géoplateforme API is new but stable; PapaParse and Leaflet have infrequent breaking changes
