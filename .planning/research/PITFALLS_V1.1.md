# Pitfalls Research: v1.1 Wizard + Export

**Project:** FlyerMap
**Milestone:** v1.1 - Wizard onboarding + Zone export
**Focus:** Common mistakes when adding wizard and OSM export to existing Leaflet app
**Researched:** 2026-02-05
**Confidence:** MEDIUM (verified with official docs and community sources)

## Summary

Adding wizard onboarding and OSM-based export features to an existing vanilla JS Leaflet application introduces four high-risk areas:

1. **Wizard state management** - Data loss on navigation, multi-tab conflicts, refresh behavior
2. **Overpass API integration** - Rate limiting, query optimization, timeout handling
3. **PDF generation** - Performance degradation, map rendering quality, memory constraints
4. **French API dependencies** - API deprecation (happening now in 2026), error handling gaps

**Critical risks:**
- Overpass API rate limits hit during sequential zone exports (HTTP 429 errors)
- localStorage quota exceeded when storing wizard state + existing app data
- Map tiles not loaded before PDF export, resulting in blank/incomplete PDFs
- French Address API (api-adresse.data.gouv.fr) deprecated end of January 2026

---

## Wizard Onboarding Pitfalls

### Pitfall 1: Wizard State Loss on Browser Back/Forward

**Risk:** Users click browser back button during wizard, all entered data disappears.

**Why it happens:** Browser navigation bypasses JavaScript state unless explicitly handled. Default browser behavior doesn't preserve form state in SPAs.

**Warning signs:**
- No persistence mechanism in wizard code
- Wizard steps change URL without state backup
- User complaints about "starting over"

**Prevention:**
```javascript
// Save wizard state on each step
function saveWizardState(step, data) {
  sessionStorage.setItem('wizard_state', JSON.stringify({
    currentStep: step,
    data: data,
    timestamp: Date.now()
  }));
}

// Restore on page load
function restoreWizardState() {
  const saved = sessionStorage.getItem('wizard_state');
  if (saved) {
    const state = JSON.parse(saved);
    // Check timestamp - clear if > 24h old
    if (Date.now() - state.timestamp < 86400000) {
      return state;
    }
  }
  return null;
}
```

**localStorage vs sessionStorage choice:**
- Use **sessionStorage** for wizard state (clears on browser close, tab-specific)
- Use **localStorage** only for "remember me" preferences
- NEVER mix wizard state with existing app's localStorage keys

**Phase:** Phase 1 (Wizard UI) - implement before user testing

**Source confidence:** MEDIUM - Pattern verified across multiple sources ([React state persistence guide](https://medium.com/@roman_j/mastering-state-persistence-with-local-storage-in-react-a-complete-guide-1cf3f56ab15c), [GeeksforGeeks persistence tutorial](https://www.geeksforgeeks.org/reactjs/how-to-persist-state-with-local-or-session-storage-in-react/))

---

### Pitfall 2: Multi-Tab Wizard Conflicts

**Risk:** User opens wizard in two tabs, data from one tab silently overwrites the other, causing confusion and data loss.

**Why it happens:** sessionStorage is tab-specific but localStorage is global across tabs. If using localStorage for wizard state, concurrent edits conflict.

**Warning signs:**
- Using localStorage for wizard temporary state
- No tab/session isolation mechanism
- No conflict detection on save

**Prevention:**
```javascript
// Use sessionStorage (tab-isolated) for wizard
// OR add session ID if localStorage required
const sessionId = crypto.randomUUID(); // Generate per tab
const key = `wizard_${sessionId}`;

// Detect existing sessions
const existingSessions = Object.keys(localStorage)
  .filter(k => k.startsWith('wizard_'));

if (existingSessions.length > 0) {
  // Warn user or offer to resume existing session
  console.warn('Another wizard session detected');
}
```

**Alternative approach:** Detect tab visibility and warn on conflict.

**Phase:** Phase 1 (Wizard UI) - early design decision

**Source confidence:** MEDIUM ([sessionStorage behavior documentation](https://christinakozanian.medium.com/managing-session-data-with-sessionstorage-in-react-de071463639d))

---

### Pitfall 3: localStorage Quota Exceeded with Wizard State

**Risk:** Adding wizard state + CSV preview data exceeds localStorage 5MB quota, causing silent save failures or corrupting existing app data.

**Why it happens:**
- FlyerMap already stores zones, colistiers, assignments in localStorage
- Wizard adds: postal code, commune GeoJSON boundary, CSV preview data
- localStorage has ~5MB limit (varies by browser)
- Quota checks happen DURING save, not before

**Warning signs:**
- No quota monitoring in existing storage.js
- Large commune boundaries (île-de-France communes can be 500KB+ GeoJSON)
- CSV preview stores entire file content
- QuotaExceededError in console (error code 22 or 1014)

**Prevention:**
```javascript
// Add to existing storage.js quota check
function estimateWizardQuota(postalCode, communeGeoJSON, csvPreview) {
  const wizardData = {
    postalCode,
    communeGeoJSON,
    csvPreview: csvPreview.slice(0, 100) // Only first 100 rows for preview
  };

  const serialized = JSON.stringify(wizardData);
  const bytes = serialized.length * 2; // UTF-16 encoding

  // Check against existing usage
  const currentUsage = calculateCurrentUsage();
  const projectedUsage = currentUsage + bytes;
  const QUOTA = 5 * 1024 * 1024;

  if (projectedUsage > QUOTA * 0.9) { // 90% threshold
    throw new Error('QUOTA_WARNING');
  }
}

// Cleanup wizard data after completion
function completeWizard() {
  // Save final config
  saveCommuneConfig(selectedCommune);

  // Clear temporary wizard data
  sessionStorage.removeItem('wizard_state');
  sessionStorage.removeItem('wizard_csv_preview');
}
```

**Critical detail:** Your existing storage.js has quota monitoring, but:
- It checks AFTER serialization, not before
- It doesn't account for wizard temporary data
- Warning threshold (80%) may be too late if wizard adds 2MB

**Phase:** Phase 1 (Wizard UI) - before CSV upload implementation

**Source confidence:** HIGH - Verified in existing codebase and localStorage specs

---

### Pitfall 4: CSV Upload Validation Failures

**Risk:** Wizard accepts malformed CSV files, causing parse errors during geocoding or colistier import, breaking the flow after user invests time.

**Why it happens:**
- File extension check (.csv) insufficient - Excel exports can have .xlsx or .xls
- MIME type unreliable (varies by system: `text/csv`, `application/vnd.ms-excel`, `text/plain`)
- Encoding issues with accented characters (French names/addresses)
- Missing or extra columns compared to expected format

**Warning signs:**
- Only checking `file.type === 'text/csv'`
- No encoding detection (assumes UTF-8)
- No column validation before preview
- Parse errors occur AFTER "Next" button click

**Prevention:**
```javascript
async function validateCSV(file) {
  // 1. Extension check (first line of defense)
  if (!file.name.endsWith('.csv')) {
    // Allow .txt but warn
    if (!file.name.endsWith('.txt')) {
      return { valid: false, error: 'FILE_TYPE' };
    }
  }

  // 2. Read as text (don't use response.json()!)
  const text = await file.text();

  // 3. Detect delimiter (comma, semicolon, tab)
  const firstLine = text.split('\n')[0];
  const delimiter = detectDelimiter(firstLine); // , or ; or \t

  // 4. Parse with detected delimiter
  const rows = text.split('\n').map(line => line.split(delimiter));

  // 5. Validate structure
  const headers = rows[0].map(h => h.trim().toLowerCase());
  const required = ['nom', 'prenom', 'adresse']; // Or 'name', 'address'

  const missing = required.filter(r => !headers.includes(r));
  if (missing.length > 0) {
    return {
      valid: false,
      error: 'MISSING_COLUMNS',
      missing
    };
  }

  // 6. Check for data (not just headers)
  if (rows.length < 2) {
    return { valid: false, error: 'EMPTY_FILE' };
  }

  // 7. Validate data format (addresses not empty, etc.)
  const dataRows = rows.slice(1).filter(r => r.join('').trim()); // Skip empty
  const errors = [];

  dataRows.forEach((row, idx) => {
    const addressIdx = headers.indexOf('adresse');
    if (!row[addressIdx] || row[addressIdx].trim().length === 0) {
      errors.push(`Ligne ${idx + 2}: adresse manquante`);
    }
  });

  if (errors.length > 0) {
    return {
      valid: false,
      error: 'INVALID_DATA',
      details: errors.slice(0, 5) // First 5 errors
    };
  }

  return { valid: true, rows: dataRows };
}

function detectDelimiter(line) {
  const commas = (line.match(/,/g) || []).length;
  const semicolons = (line.match(/;/g) || []).length;
  const tabs = (line.match(/\t/g) || []).length;

  if (semicolons > commas && semicolons > tabs) return ';';
  if (tabs > commas && tabs > semicolons) return '\t';
  return ',';
}
```

**Common mistake:** Using `response.json()` to parse CSV causes "Unexpected token" errors.

**Phase:** Phase 2 (CSV Import) - before allowing file upload

**Source confidence:** HIGH ([CSV validation errors guide](https://csv.js.org/parse/errors/), [File upload validation article](https://thelinuxcode.com/creating-an-html-file-input-that-accepts-csv-files-with-validation-preview-draganddrop-and-real-parsing/))

---

## Overpass API Pitfalls

### Pitfall 5: Rate Limiting During Zone Export Batch

**Risk:** Exporting all zones sequentially hits Overpass rate limits (HTTP 429), causing failures midway through batch export.

**Why it happens:**
- Overpass enforces slot-based rate limiting per IP
- Each request consumes a slot for execution time + cooldown
- Cooldown grows with server load (can exceed execution time)
- Sequential exports = N zones × (execution + cooldown) seconds
- Server rejects requests after 15-second queue time

**Warning signs:**
- HTTP 429 responses from Overpass endpoints
- "Too Many Requests" errors during export
- Successful exports for first 2-3 zones, then failures
- Error message: "Rate limited, wait 15 seconds"

**Prevention:**
```javascript
// 1. Add delay between requests
async function exportAllZones(zones) {
  const results = [];
  const DELAY_MS = 2000; // 2 seconds between requests

  for (const zone of zones) {
    try {
      const streets = await fetchStreetsForZone(zone);
      results.push({ zone, streets });

      // Wait before next request
      if (zones.indexOf(zone) < zones.length - 1) {
        await sleep(DELAY_MS);
      }
    } catch (error) {
      if (error.status === 429) {
        // Rate limited - wait longer
        console.warn(`Rate limited on zone ${zone.name}`);
        await sleep(15000); // Wait 15 seconds
        // Retry this zone
        const streets = await fetchStreetsForZone(zone);
        results.push({ zone, streets });
      } else {
        throw error;
      }
    }
  }

  return results;
}

// 2. Use fallback endpoints (already implemented in overpass.js)
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter', // No rate limits
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];

// 3. Implement exponential backoff on 429
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.status === 429) {
        const waitTime = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        console.warn(`Rate limited, waiting ${waitTime}ms`);
        await sleep(waitTime);
        continue;
      }
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }
}
```

**Critical detail:** Overpass rate limits are:
- ~10,000 requests/day maximum
- ~1 GB download/day maximum
- HTTP 429 (rate limit) or 504 (resource constraint) indicate rejection
- Free alternatives like overpass.kumi.systems claim "unlimited" but may still throttle

**Phase:** Phase 3 (Export Implementation) - before batch export

**Source confidence:** HIGH ([Overpass rate limiting documentation](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html), [Overpass API wiki](https://wiki.openstreetmap.org/wiki/Overpass_API))

---

### Pitfall 6: Overpass Query Timeout on Large Zones

**Risk:** Query times out (default 180s) for large zones, returning no data despite streets existing.

**Why it happens:**
- Default timeout: 180 seconds
- Large communes or complex boundaries slow queries
- Server load varies (shared public resource)
- Memory limit (512 MiB default) can also cause early termination

**Warning signs:**
- Queries work for small zones, fail for large ones
- HTTP 504 Gateway Timeout
- Error: "Query run out of memory"
- Inconsistent results (works sometimes, fails other times)

**Prevention:**
```javascript
// 1. Increase timeout in query
const query = `
[out:json][timeout:300][maxsize:536870912];  // 5min, 512MB
(
  way["highway"](poly:"${polygonCoords}");
);
out geom;
`;

// 2. Use bounding box instead of polygon for initial filter
// (Faster but less precise)
const bbox = getBoundingBox(zoneGeoJSON);
const query = `
[out:json][timeout:90];
way["highway"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
out geom;
`;

// 3. Filter to polygon client-side after bbox query
const streets = await queryBoundingBox(zone);
const filtered = streets.filter(street =>
  isStreetInPolygon(street, zone.geometry)
);

// 4. Add timeout handling
async function queryWithTimeout(query, timeoutMs = 120000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: query,
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('QUERY_TIMEOUT');
    }
    throw error;
  }
}
```

**Optimization strategy:** Your existing overpass.js uses bounding box (good!), but for street extraction you'll need polygon query. Consider:
- Bbox for initial filter, polygon for refinement
- Split very large zones into smaller queries
- Cache results to avoid re-querying

**Phase:** Phase 3 (Export Implementation) - during Overpass integration

**Source confidence:** HIGH ([Overpass timeout documentation](https://osm-queries.ldodds.com/tutorial/26-timeouts-and-endpoints.osm.html), [Performance hints](https://dev.overpass-api.de/blog/performance_hints.html))

---

### Pitfall 7: Polygon Query Returns Ways Crossing Boundary

**Risk:** Streets that only partially intersect the zone are included in results, leading to inflated street lists (streets from neighboring zones).

**Why it happens:**
- Overpass includes any way that intersects the polygon
- If street crosses zone boundary, entire way is returned
- No built-in "clip to polygon" functionality

**Warning signs:**
- Street lists include roads obviously outside zone
- Duplicate streets in adjacent zone exports
- Users report "wrong streets" in export

**Prevention:**
```javascript
// 1. Accept this limitation and document it
// (Most common approach - perfect accuracy not required)

// 2. Client-side filtering (computationally expensive)
function isStreetInZone(street, zonePolygon) {
  // Check if majority of street nodes are inside polygon
  const nodes = street.geometry.coordinates;
  const insideCount = nodes.filter(node =>
    turf.booleanPointInPolygon(node, zonePolygon)
  ).length;

  return insideCount / nodes.length > 0.5; // >50% inside
}

// 3. Use area filter instead of polygon (if commune available)
// More accurate for administrative boundaries
const query = `
[out:json][timeout:90];
area["name"="${communeName}"]["admin_level"="8"]->.searchArea;
way["highway"](area.searchArea);
out geom;
`;

// 4. Label exports with caveat
const exportHeader = `
Zone: ${zone.name}
Note: Les rues qui traversent la limite de zone peuvent apparaître
dans plusieurs zones.
`;
```

**Decision point:** For campaign flyer distribution, partial overlap is acceptable (better to cover than miss). Document this behavior in export.

**Phase:** Phase 3 (Export Implementation) - before user acceptance testing

**Source confidence:** MEDIUM ([Overpass polygon documentation](https://dev.overpass-api.de/overpass-doc/en/full_data/polygon.html), [OSM Help discussion](https://help.openstreetmap.org/questions/21330/extracting-features-that-are-inside-a-polygon-set-with-overpass-api/))

---

### Pitfall 8: Overpass Returns Incomplete Street Names

**Risk:** Query returns ways without name tags, resulting in "Rue sans nom" or blank entries in export, reducing usefulness.

**Why it happens:**
- Not all OSM ways have "name" tag
- Residential driveways, private roads, paths often unnamed
- Different highway types have varying name coverage

**Warning signs:**
- Export contains many "undefined" or blank street names
- Users complain about missing street names they know exist
- Too many "Rue sans nom" entries

**Prevention:**
```javascript
// 1. Filter query to named streets only
const query = `
[out:json][timeout:90];
way["highway"]["name"](poly:"${coords}");
out geom;
`;

// 2. Exclude low-priority highway types
const query = `
[out:json][timeout:90];
(
  way["highway"~"^(primary|secondary|tertiary|residential|living_street)$"]["name"](poly:"${coords}");
);
out geom;
`;

// 3. Provide fallback display
function formatStreetName(way) {
  const name = way.tags?.name;
  if (name) return name;

  const ref = way.tags?.ref; // Road number (D123, etc.)
  if (ref) return `Route ${ref}`;

  const type = way.tags?.highway;
  return `Voie sans nom (${type})`;
}

// 4. Add street type context
function enhanceStreetData(way) {
  return {
    name: way.tags?.name || 'Sans nom',
    type: translateHighwayType(way.tags?.highway),
    ref: way.tags?.ref,
    displayName: formatStreetName(way)
  };
}

function translateHighwayType(type) {
  const types = {
    'primary': 'Route principale',
    'secondary': 'Route secondaire',
    'residential': 'Rue résidentielle',
    'living_street': 'Zone résidentielle',
    'footway': 'Chemin piéton',
    'cycleway': 'Piste cyclable'
  };
  return types[type] || type;
}
```

**Trade-off:** Filtering to named streets only excludes legitimate distribution targets (unnamed residential streets). Consider including but labeling clearly.

**Phase:** Phase 3 (Export Implementation) - during data processing

**Source confidence:** MEDIUM (OSM tagging practices, community experience)

---

## PDF Generation Pitfalls

### Pitfall 9: Leaflet Map Not Rendered Before PDF Export

**Risk:** PDF contains blank map or partially loaded tiles because export happens before tiles finish loading.

**Why it happens:**
- Tile loading is asynchronous
- jsPDF captures canvas immediately
- No automatic wait for tile completion
- Network latency varies

**Warning signs:**
- PDF shows gray squares instead of map
- Map visible in browser but blank in PDF
- Inconsistent results (works sometimes)
- Console warning: "Tiles not loaded"

**Prevention:**
```javascript
// 1. Wait for all tiles to load
function waitForTiles(map) {
  return new Promise((resolve) => {
    const layers = map._layers;
    let tilesLoading = 0;

    // Count loading tiles
    Object.values(layers).forEach(layer => {
      if (layer._tiles) {
        Object.values(layer._tiles).forEach(tile => {
          if (!tile.loaded && !tile.error) {
            tilesLoading++;
          }
        });
      }
    });

    if (tilesLoading === 0) {
      // Add small buffer for rendering
      setTimeout(resolve, 500);
      return;
    }

    // Listen for tile load events
    const checkComplete = () => {
      tilesLoading--;
      if (tilesLoading === 0) {
        map.off('tileload', checkComplete);
        setTimeout(resolve, 500);
      }
    };

    map.on('tileload', checkComplete);
    map.on('tileerror', checkComplete); // Count errors as complete
  });
}

// 2. Use in export flow
async function exportZoneToPDF(zone) {
  // Zoom to zone
  map.fitBounds(zone.getBounds());

  // Wait for tiles
  await waitForTiles(map);

  // Now safe to capture
  const canvas = await captureMapCanvas(map);
  generatePDF(canvas, zone);
}

// 3. Add visual feedback
function showExportProgress() {
  const overlay = document.createElement('div');
  overlay.innerHTML = `
    <div class="export-loading">
      <div class="spinner"></div>
      <p>Chargement de la carte...</p>
      <p class="small">Veuillez patienter pendant le téléchargement des tuiles</p>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}
```

**Alternative approaches:**
- leaflet-image plugin handles tile waiting automatically
- Pre-render map off-screen with forced tile load
- Use static map API for guaranteed rendering (requires API key)

**Phase:** Phase 4 (PDF Export) - critical before release

**Source confidence:** HIGH ([Leaflet PDF export guide](https://gist.github.com/ka7eh/88761650efd3425080035e8535230d15), [Leaflet image issues](https://github.com/mapbox/leaflet-image/issues/82))

---

### Pitfall 10: Low Resolution Map in PDF

**Risk:** PDF map appears blurry or pixelated, making it hard to read street names or identify locations.

**Why it happens:**
- Default canvas capture uses screen resolution (96 DPI)
- Print quality requires 300 DPI
- Scaling up low-res canvas creates blur
- Leaflet renders for screen, not print

**Warning signs:**
- PDF map looks fine on screen, blurry when printed
- Text/labels unreadable in PDF
- User complaints about print quality

**Prevention:**
```javascript
// 1. Increase canvas resolution for export
async function captureHighResMap(map, scale = 2) {
  const originalSize = map.getSize();
  const container = map.getContainer();

  // Temporarily increase map size
  const width = originalSize.x * scale;
  const height = originalSize.y * scale;

  container.style.width = width + 'px';
  container.style.height = height + 'px';

  // Invalidate to trigger redraw
  map.invalidateSize();

  // Wait for high-res tiles
  await waitForTiles(map);

  // Capture canvas
  const canvas = await html2canvas(container, {
    scale: scale,
    useCORS: true,
    logging: false
  });

  // Restore original size
  container.style.width = originalSize.x + 'px';
  container.style.height = originalSize.y + 'px';
  map.invalidateSize();

  return canvas;
}

// 2. Set proper DPI in PDF generation
function generatePDF(canvas, zone) {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  // Calculate dimensions for 300 DPI
  const imgWidth = 210; // A4 width in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  pdf.addImage(
    canvas.toDataURL('image/jpeg', 0.95),
    'JPEG',
    0, 0,
    imgWidth, imgHeight,
    undefined,
    'FAST' // Compression mode
  );

  pdf.save(`zone-${zone.name}.pdf`);
}

// 3. Use vector export if possible (better quality)
// Note: Requires tiles that support CORS
function exportSVG(map) {
  // Libraries like Leaflet.Export can export to SVG
  // Then convert SVG to PDF for best quality
}
```

**Trade-off:** Higher resolution = slower export + more memory. Start with scale=2, allow user to choose if needed.

**Recommended settings:**
- Screen preview: 96 DPI (default)
- PDF export: 150-200 DPI (scale=1.5-2)
- Professional print: 300 DPI (scale=3, may be slow)

**Phase:** Phase 4 (PDF Export) - after basic export works

**Source confidence:** MEDIUM ([Leaflet PDF quality discussion](https://github.com/Leaflet/Leaflet/issues/6068), [Print quality recommendations](https://orenw.wordpress.com/2015/06/07/export-leaflet-map-to-image/))

---

### Pitfall 11: CORS Errors Blocking Map Tile Capture

**Risk:** Cannot capture map tiles to canvas due to CORS restrictions, resulting in blank maps or security errors.

**Why it happens:**
- Canvas becomes "tainted" when loading cross-origin images
- Tainted canvas cannot be exported (toDataURL throws SecurityError)
- Not all tile servers support CORS
- OSM tile servers may or may not allow CORS

**Warning signs:**
- SecurityError: Failed to execute 'toDataURL' on 'HTMLCanvasElement'
- "Tainted canvas may not be exported"
- Map visible but export fails silently

**Prevention:**
```javascript
// 1. Use CORS-enabled tile server
const corsEnabledTiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap',
  crossOrigin: 'anonymous' // CRITICAL: Enable CORS
});

// 2. Check CORS before export
async function checkCORSSupport(tileUrl) {
  try {
    const response = await fetch(tileUrl, { mode: 'cors' });
    return response.ok;
  } catch (error) {
    console.error('CORS not supported:', error);
    return false;
  }
}

// 3. Use proxy for non-CORS tiles (if needed)
function proxiedTileUrl(z, x, y) {
  const originalUrl = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  return `https://your-proxy.com/tile?url=${encodeURIComponent(originalUrl)}`;
}

// 4. Alternative: Use leaflet-image library
// Handles CORS automatically with crossOrigin attribute
import leafletImage from 'leaflet-image';

leafletImage(map, (err, canvas) => {
  if (err) {
    console.error('Canvas capture failed:', err);
    return;
  }

  // Canvas ready for PDF
  const imgData = canvas.toDataURL('image/png');
  generatePDF(imgData);
});

// 5. Fallback: Screenshot with html2canvas (allows CORS proxy)
async function captureWithFallback(map) {
  try {
    // Try native canvas capture first
    return await captureMapCanvas(map);
  } catch (error) {
    if (error.name === 'SecurityError') {
      // CORS blocked - use html2canvas with proxy
      return await html2canvas(map.getContainer(), {
        useCORS: true,
        proxy: 'https://your-proxy.com'
      });
    }
    throw error;
  }
}
```

**Critical detail:** OpenStreetMap tile servers support CORS, but you MUST set `crossOrigin: 'anonymous'` in tile layer options. Current code doesn't set this.

**Recommended tile servers with CORS:**
- OpenStreetMap: ✓ (with crossOrigin flag)
- CartoDB: ✓
- Stamen: ✓
- Mapbox: ✓ (requires API key)

**Phase:** Phase 4 (PDF Export) - before implementing canvas capture

**Source confidence:** HIGH ([Leaflet-image CORS discussion](https://github.com/mapbox/leaflet-image/issues/82), [html2canvas CORS handling](https://github.com/niklasvh/html2canvas/issues/567))

---

### Pitfall 12: Browser Memory Issues with Large PDF Exports

**Risk:** Browser crashes or freezes when generating PDFs with high-resolution maps, especially batch exports.

**Why it happens:**
- High-res canvas uses significant memory (2048×2048 canvas = ~16MB)
- jsPDF keeps entire document in memory
- Batch export multiplies memory usage
- No memory cleanup between exports
- Mobile browsers more constrained

**Warning signs:**
- Browser tab becomes unresponsive
- "Out of memory" errors
- Export works for 1-2 zones, crashes on more
- Works on desktop, fails on mobile

**Prevention:**
```javascript
// 1. Limit canvas size
const MAX_CANVAS_SIZE = 2048; // pixels

function calculateOptimalSize(bounds, maxSize = MAX_CANVAS_SIZE) {
  const aspect = bounds.height / bounds.width;

  if (bounds.width > maxSize) {
    return {
      width: maxSize,
      height: Math.floor(maxSize * aspect)
    };
  }

  return {
    width: bounds.width,
    height: bounds.height
  };
}

// 2. Clean up between batch exports
async function batchExportZones(zones) {
  for (let i = 0; i < zones.length; i++) {
    await exportZoneToPDF(zones[i]);

    // Force garbage collection hint
    if (global.gc) global.gc();

    // Small delay to allow cleanup
    await sleep(500);

    // Update progress
    updateProgress((i + 1) / zones.length * 100);
  }
}

// 3. Offer download instead of storing all in memory
function downloadPDF(pdf, filename) {
  // Use Blob URL for immediate download
  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();

  // Clean up blob URL after delay
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// 4. Compress images in PDF
function addCompressedImage(pdf, canvas) {
  // Convert to JPEG with compression
  const imgData = canvas.toDataURL('image/jpeg', 0.8); // 80% quality
  pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
}

// 5. Monitor memory and warn user
function checkMemoryConstraints() {
  if (performance.memory) {
    const used = performance.memory.usedJSHeapSize;
    const limit = performance.memory.jsHeapSizeLimit;

    if (used / limit > 0.9) {
      console.warn('Memory usage high:', (used / limit * 100).toFixed(1) + '%');
      return false;
    }
  }
  return true;
}
```

**Recommended limits:**
- Single PDF: Max 2048×2048 canvas, JPEG 80% quality
- Batch export: Max 10 zones at once, prompt for continuation
- Mobile: Reduce canvas to 1024×1024 or disable batch export

**Phase:** Phase 4 (PDF Export) - before batch export implementation

**Source confidence:** MEDIUM ([jsPDF performance discussions](https://www.servicenow.com/community/developer-forum/jspdf-is-taking-too-much-time-to-generate-pdf/m-p/1888613), [Client-side PDF limitations](https://elh.mx/jquery/never-use-jspdf-library-for-pdf-generation-in-client-side/))

---

## French API Pitfalls

### Pitfall 13: French Address API Deprecation (CRITICAL - Jan 2026)

**Risk:** French Address API (api-adresse.data.gouv.fr) is being deprecated in January 2026, will stop working mid-project.

**Why it happens:**
- BAN Address API integrated into new Geohub service
- Old endpoint (api-adresse.data.gouv.fr) decommissioned end of January 2026
- Current code likely uses deprecated endpoint

**WARNING SIGNS:**
- HTTP errors from api-adresse.data.gouv.fr
- Documentation redirects to new service
- Deprecation warnings in API responses

**Prevention:**
```javascript
// URGENT: Update to new endpoint
// OLD (deprecated):
const OLD_ENDPOINT = 'https://api-adresse.data.gouv.fr/search';

// NEW (current):
const NEW_ENDPOINT = 'https://api-adresse.data.gouv.fr/search'; // Still working for now

// Monitor for new Geohub endpoint announcement
// Check: https://www.data.gouv.fr/dataservices/ for updates

// Implement fallback chain
const GEOCODING_ENDPOINTS = [
  'https://api-adresse.data.gouv.fr/search', // Primary (for now)
  'https://nominatim.openstreetmap.org/search', // Fallback OSM
];

async function geocodeAddress(address) {
  for (const endpoint of GEOCODING_ENDPOINTS) {
    try {
      const result = await tryGeocode(endpoint, address);
      if (result) return result;
    } catch (error) {
      console.warn(`Geocoding failed for ${endpoint}:`, error);
    }
  }

  throw new Error('All geocoding services failed');
}
```

**CRITICAL ACTION REQUIRED:**
1. Monitor https://www.data.gouv.fr/dataservices/ for Geohub announcement
2. Plan migration before Jan 31, 2026
3. Implement multi-endpoint fallback
4. Test with alternative geocoder (Nominatim)

**Phase:** Phase 0 (Pre-development) - CHECK IMMEDIATELY

**Source confidence:** HIGH ([Official data.gouv.fr announcement](https://www.data.gouv.fr/dataservices/api-adresse-base-adresse-nationale-ban))

---

### Pitfall 14: Postal Code to Commune Ambiguity

**Risk:** Single postal code maps to multiple communes, wizard can't determine which commune user wants.

**Why it happens:**
- Postal codes (78130) don't map 1:1 to communes
- One postal code can cover 2-10 communes
- API returns array, not single commune

**Warning signs:**
- Wizard shows list of communes for single postal code
- User confusion: "I entered my postal code, why ask again?"
- No commune selection UI

**Prevention:**
```javascript
// 1. Query communes by postal code
async function getCommunesByPostalCode(postalCode) {
  const response = await fetch(
    `https://geo.api.gouv.fr/communes?codePostal=${postalCode}&fields=nom,code,centre,contour`
  );

  const communes = await response.json();

  if (communes.length === 0) {
    throw new Error('CODE_POSTAL_INVALIDE');
  }

  return communes;
}

// 2. Handle multiple communes in wizard
async function wizardStep1_PostalCode(postalCode) {
  const communes = await getCommunesByPostalCode(postalCode);

  if (communes.length === 1) {
    // Direct match - proceed to step 2
    return selectCommune(communes[0]);
  }

  // Multiple communes - show selection
  showCommuneSelector(communes);
}

// 3. UI for commune selection
function showCommuneSelector(communes) {
  const html = `
    <div class="commune-selector">
      <h3>Plusieurs communes trouvées pour ce code postal</h3>
      <p>Veuillez sélectionner votre commune :</p>
      <ul>
        ${communes.map(c => `
          <li>
            <button data-commune-code="${c.code}">
              ${c.nom} (${c.code})
            </button>
          </li>
        `).join('')}
      </ul>
    </div>
  `;

  // Show selection UI
  // Wire up buttons to selectCommune()
}

// 4. Validate postal code format before API call
function validatePostalCode(code) {
  // French postal code: 5 digits
  if (!/^\d{5}$/.test(code)) {
    return { valid: false, error: 'Format invalide (5 chiffres attendus)' };
  }

  // Basic range check (01000-98999)
  const num = parseInt(code, 10);
  if (num < 1000 || num > 98999) {
    return { valid: false, error: 'Code postal invalide' };
  }

  return { valid: true };
}
```

**UI recommendation:**
- Step 1: Enter postal code
- Step 1.5 (if needed): Select commune from list
- Step 2: Upload CSV
- Step 3: Confirm

**Phase:** Phase 1 (Wizard UI) - during postal code step design

**Source confidence:** HIGH ([geo.api.gouv.fr documentation](https://geo.api.gouv.fr/decoupage-administratif/communes))

---

### Pitfall 15: geo.api.gouv.fr Rate Limiting (Undocumented)

**Risk:** API rate limiting causes wizard failures, but limits are undocumented.

**Why it happens:**
- No official rate limit documentation
- Likely has limits but not published
- Single-user app unlikely to hit limits, but batch operations might

**Warning signs:**
- HTTP 429 responses (rare)
- Slow responses during peak hours
- Connection timeouts

**Prevention:**
```javascript
// 1. Implement conservative retry logic
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        timeout: 10000 // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Exponential backoff
      await sleep(Math.pow(2, i) * 1000);
    }
  }
}

// 2. Cache commune data after first fetch
const communeCache = new Map();

async function fetchCommuneBoundary(communeCode) {
  if (communeCache.has(communeCode)) {
    return communeCache.get(communeCode);
  }

  const data = await fetch(
    `https://geo.api.gouv.fr/communes/${communeCode}?fields=contour&format=geojson`
  );

  communeCache.set(communeCode, data);
  return data;
}

// 3. Handle errors gracefully
async function getCommuneData(code) {
  try {
    return await fetchWithRetry(
      `https://geo.api.gouv.fr/communes/${code}?fields=nom,contour`
    );
  } catch (error) {
    // Provide helpful error message
    if (error.message.includes('429')) {
      throw new Error('SERVICE_BUSY');
    } else if (error.message.includes('timeout')) {
      throw new Error('SERVICE_TIMEOUT');
    } else {
      throw new Error('SERVICE_ERROR');
    }
  }
}
```

**Conservative approach:** Assume limits exist, implement retries and caching.

**Phase:** Phase 1 (Wizard UI) - during API integration

**Source confidence:** LOW (no official documentation, but prudent defensive coding)

---

## Integration Pitfalls (Existing System)

### Pitfall 16: Wizard State Conflicts with Existing localStorage Keys

**Risk:** Wizard overwrites existing app data (zones, colistiers) or vice versa, causing data loss.

**Why it happens:**
- No namespace separation
- Generic key names collide ('zones', 'config', etc.)
- Wizard temporary data persists after completion

**Warning signs:**
- User reports lost zones after wizard
- Colistier data disappears after reconfiguration
- Debug shows localStorage keys overwritten

**Prevention:**
```javascript
// 1. Use namespaced keys
const STORAGE_KEYS = {
  // Existing app data (keep unchanged)
  zones: 'flyermap_zones',
  colistiers: 'flyermap_colistiers',
  assignments: 'flyermap_assignments',

  // New wizard data (separate namespace)
  wizardState: 'flyermap_wizard_state',
  wizardProgress: 'flyermap_wizard_progress',

  // Configuration
  commune: 'flyermap_commune_config'
};

// 2. Separate wizard completion from app data save
async function completeWizard(wizardData) {
  // Save final configuration
  storage.save(STORAGE_KEYS.commune, {
    code: wizardData.commune.code,
    name: wizardData.commune.name,
    boundary: wizardData.commune.boundary,
    center: wizardData.commune.center,
    configuredAt: new Date().toISOString()
  });

  // Import colistiers (separate operation)
  if (wizardData.colistiers) {
    storage.save(STORAGE_KEYS.colistiers, wizardData.colistiers);
  }

  // CRITICAL: Clear wizard temporary data
  sessionStorage.removeItem(STORAGE_KEYS.wizardState);
  sessionStorage.removeItem(STORAGE_KEYS.wizardProgress);

  // Mark wizard as completed (prevent re-showing)
  storage.save('flyermap_wizard_completed', true);
}

// 3. Check wizard vs app state on load
function initializeApp() {
  const wizardCompleted = storage.load('flyermap_wizard_completed');
  const hasCommune = storage.load(STORAGE_KEYS.commune);

  if (!wizardCompleted || !hasCommune) {
    // Show wizard
    showWizard();
  } else {
    // Load existing app data
    loadAppData();
  }
}

// 4. Validate no key conflicts
const APP_KEYS = ['flyermap_zones', 'flyermap_colistiers', 'flyermap_assignments'];
const WIZARD_KEYS = ['flyermap_wizard_state', 'flyermap_commune_config'];

function validateStorageKeys() {
  const conflicts = APP_KEYS.filter(k => WIZARD_KEYS.includes(k));
  if (conflicts.length > 0) {
    console.error('Storage key conflicts:', conflicts);
    throw new Error('STORAGE_CONFLICT');
  }
}
```

**Recommendation:** Prefix ALL keys with 'flyermap_' to avoid conflicts with other apps or libraries.

**Phase:** Phase 1 (Wizard UI) - before wizard implementation starts

**Source confidence:** HIGH (standard practice, verified from codebase structure)

---

### Pitfall 17: Wizard CSV Import Incompatible with Existing Import Flow

**Risk:** Wizard CSV import has different format/behavior than existing Phase 2 import, causing user confusion or data corruption.

**Why it happens:**
- Two separate CSV import implementations
- Different validation rules
- Different geocoding behavior
- Inconsistent error handling

**Warning signs:**
- CSV works in wizard, fails in main app import
- Different column requirements
- Geocoding results differ
- Duplicate colistier entries

**Prevention:**
```javascript
// 1. Use SAME CSV import module for both
// Import from existing csvImport.js, don't reimplement

// In wizard step 2:
import { parseCSV, validateColistiers } from '../services/csvImport.js';
import { geocodeAddress } from '../services/geocoding.js';

async function wizardImportCSV(file) {
  // Use existing parser
  const colistiers = await parseCSV(file);

  // Use existing validation
  const validation = validateColistiers(colistiers);
  if (!validation.valid) {
    showValidationErrors(validation.errors);
    return;
  }

  // Use existing geocoder
  const geocoded = await geocodeColistiers(colistiers);

  return geocoded;
}

// 2. Ensure same CSV format requirements
const CSV_FORMAT = {
  requiredColumns: ['nom', 'prenom', 'adresse'],
  optionalColumns: ['telephone', 'email'],
  delimiter: ';', // Or auto-detect
  encoding: 'UTF-8'
};

// 3. Unify error messages
const CSV_ERRORS = {
  MISSING_COLUMNS: 'Colonnes manquantes: ${columns}',
  INVALID_FORMAT: 'Format de fichier invalide',
  GEOCODING_FAILED: 'Adresse introuvable: ${address}',
  EMPTY_FILE: 'Fichier vide ou sans données'
};

// 4. Test both paths with same CSV
// Unit test: same CSV file works in both wizard and main import
```

**Critical:** Don't duplicate CSV parsing logic. Reuse existing code or refactor into shared module.

**Phase:** Phase 2 (CSV Import) - during wizard CSV step implementation

**Source confidence:** HIGH (DRY principle, verified from existing csvImport.js)

---

## Severity Summary

### Critical (Address Immediately)

1. **French Address API Deprecation** (Pitfall 13) - API stops working Jan 2026
2. **Overpass Rate Limiting** (Pitfall 5) - Blocks batch export entirely
3. **localStorage Quota Exceeded** (Pitfall 3) - Data loss risk
4. **Leaflet Map Not Rendered** (Pitfall 9) - Blank PDFs unusable

### High Priority (Address During Development)

5. **Wizard State Loss on Back Button** (Pitfall 1) - Poor UX, user frustration
6. **CSV Validation Failures** (Pitfall 4) - Breaks onboarding flow
7. **CORS Errors in PDF** (Pitfall 11) - PDF export fails silently
8. **Storage Key Conflicts** (Pitfall 16) - Corrupts existing data

### Medium Priority (Address Before Release)

9. **Multi-Tab Wizard Conflicts** (Pitfall 2) - Edge case but confusing
10. **Overpass Query Timeout** (Pitfall 6) - Fails on large zones
11. **Low Resolution PDF** (Pitfall 10) - Quality complaints
12. **Postal Code Ambiguity** (Pitfall 14) - Missing commune selection UI

### Low Priority (Can Defer or Accept)

13. **Polygon Boundary Overlap** (Pitfall 7) - Acceptable for use case
14. **Incomplete Street Names** (Pitfall 8) - Minor display issue
15. **Memory Issues** (Pitfall 12) - Only affects large batch exports
16. **geo.api.gouv.fr Rate Limiting** (Pitfall 15) - Unlikely to hit
17. **CSV Import Duplication** (Pitfall 17) - Code quality issue

---

## Phase-Specific Warnings

### Phase 1: Wizard UI Foundation

**Critical risks:**
- Pitfall 1: State loss on navigation
- Pitfall 2: Multi-tab conflicts
- Pitfall 3: localStorage quota
- Pitfall 16: Storage key conflicts

**Must address:** sessionStorage strategy, namespaced keys, quota monitoring

---

### Phase 2: Postal Code + CSV Import

**Critical risks:**
- Pitfall 4: CSV validation failures
- Pitfall 13: API deprecation
- Pitfall 14: Postal code ambiguity
- Pitfall 17: Import duplication

**Must address:** Robust CSV validation, API fallback, commune selection UI

---

### Phase 3: OSM Street Extraction

**Critical risks:**
- Pitfall 5: Overpass rate limiting
- Pitfall 6: Query timeouts
- Pitfall 7: Boundary overlap

**Must address:** Rate limit handling, endpoint fallback, timeout configuration

---

### Phase 4: PDF Export

**Critical risks:**
- Pitfall 9: Tiles not loaded
- Pitfall 10: Low resolution
- Pitfall 11: CORS errors
- Pitfall 12: Memory issues

**Must address:** Tile wait mechanism, CORS configuration, resolution settings

---

## Testing Checklist

Before each phase completion, verify:

### Wizard Testing
- [ ] Back button doesn't lose data
- [ ] Refresh doesn't lose data
- [ ] localStorage quota warning appears at 80%
- [ ] Multi-tab warning shown
- [ ] CSV with French accents parses correctly
- [ ] Postal code with multiple communes shows selection
- [ ] Wizard completion clears temporary data

### Overpass Testing
- [ ] Single zone export works
- [ ] Batch export (5 zones) completes without 429 errors
- [ ] Large zone (>1000 streets) doesn't timeout
- [ ] Fallback endpoints work when primary fails
- [ ] Street names display correctly (handle missing names)

### PDF Testing
- [ ] Map tiles fully loaded before capture
- [ ] PDF resolution readable when printed
- [ ] CORS doesn't block tile capture
- [ ] Batch export (10 PDFs) completes without memory errors
- [ ] PDF file size reasonable (<5MB per zone)

---

## Sources

**Overpass API:**
- [Overpass API Rate Limits and Commons](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html) - HIGH confidence
- [Overpass Performance Hints](https://dev.overpass-api.de/blog/performance_hints.html) - HIGH confidence
- [Overpass API by Example](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_API_by_Example) - HIGH confidence
- [Overpass Polygon Documentation](https://dev.overpass-api.de/overpass-doc/en/full_data/polygon.html) - HIGH confidence
- [Overpass Timeout Guide](https://osm-queries.ldodds.com/tutorial/26-timeouts-and-endpoints.osm.html) - MEDIUM confidence
- [How to Get Streets with Overpass API](https://dev.to/toodaniels/how-to-get-streets-data-using-overpass-api-2b2g) - MEDIUM confidence

**Wizard State Management:**
- [State Management in Vanilla JS 2026](https://medium.com/@chirag.dave/state-management-in-vanilla-js-2026-trends-f9baed7599de) - MEDIUM confidence
- [Managing Session Data with sessionStorage](https://christinakozanian.medium.com/managing-session-data-with-sessionstorage-in-react-de071463639d) - MEDIUM confidence
- [Preserving Form State in Navigation](https://gal.hagever.com/posts/react-forms-and-history-state) - MEDIUM confidence

**CSV Validation:**
- [CSV Parse Errors Documentation](https://csv.js.org/parse/errors/) - HIGH confidence
- [HTML File Input CSV Validation Guide](https://thelinuxcode.com/creating-an-html-file-input-that-accepts-csv-files-with-validation-preview-draganddrop-and-real-parsing/) - MEDIUM confidence
- [5 CSV File Import Errors](https://ingestro.com/blog/5-csv-file-import-errors-and-how-to-fix-them-quickly) - MEDIUM confidence

**PDF Generation:**
- [jsPDF PDF Generation Guide](https://pdfbolt.com/blog/generate-html-to-pdf-with-jspdf) - MEDIUM confidence
- [Leaflet PDF Export Gist](https://gist.github.com/ka7eh/88761650efd3425080035e8535230d15) - HIGH confidence
- [Leaflet-image CORS Issues](https://github.com/mapbox/leaflet-image/issues/82) - HIGH confidence
- [jsPDF Performance Discussion](https://www.servicenow.com/community/developer-forum/jspdf-is-taking-too-much-time-to-generate-pdf/m-p/1888613) - MEDIUM confidence
- [Never Use jsPDF for Client-Side Generation](https://elh.mx/jquery/never-use-jspdf-library-for-pdf-generation-in-client-side/) - LOW confidence (opinionated)

**French APIs:**
- [geo.api.gouv.fr Communes API](https://geo.api.gouv.fr/decoupage-administratif/communes) - HIGH confidence
- [BAN Address API Deprecation Notice](https://www.data.gouv.fr/dataservices/api-adresse-base-adresse-nationale-ban) - HIGH confidence

**Existing Codebase:**
- `/Users/mmaudet/work/flyermap/src/data/storage.js` - HIGH confidence
- `/Users/mmaudet/work/flyermap/src/services/overpass.js` - HIGH confidence
- `/Users/mmaudet/work/flyermap/.planning/PROJECT.md` - HIGH confidence

---

**Overall Confidence:** MEDIUM
- High confidence on Overpass API, French APIs, existing codebase analysis
- Medium confidence on wizard patterns (React-focused sources adapted to vanilla JS)
- Lower confidence on undocumented API limits (geo.api.gouv.fr)

**Recommended Next Steps:**
1. ✓ Check French Address API status IMMEDIATELY (Jan 2026 deadline)
2. Prototype wizard state management with sessionStorage
3. Test Overpass rate limits with sequential requests
4. Verify OSM tile CORS support before PDF implementation
