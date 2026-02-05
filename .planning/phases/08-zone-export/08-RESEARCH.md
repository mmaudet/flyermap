# Phase 8: Zone Export - Research

**Researched:** 2026-02-05
**Domain:** PDF generation, map export, OSM street queries, CSV export
**Confidence:** HIGH

## Summary

This phase implements export functionality for zones, allowing users to generate PDF documents and CSV files containing zone details, assigned team members, visual maps, and street listings from OpenStreetMap.

The research identifies a proven stack for browser-based PDF generation (jsPDF), map screenshot capture (leaflet-simple-map-screenshoter or modern-screenshot), OSM street queries (Overpass API extension of existing service), and CSV export (native browser APIs with Blob/URL.createObjectURL).

The project already has established patterns for downloads (exportImport.js), Overpass queries (overpass.js), and zone data access (store.js). The recommended approach extends these patterns rather than introducing new architectural concepts.

**Primary recommendation:** Use jsPDF for PDF generation with leaflet-simple-map-screenshoter for map capture, extend existing overpass.js service for street queries, and use native Blob API for CSV export.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jsPDF | 4.1.0 | PDF generation | Most popular client-side PDF lib, 45k+ GitHub stars, well-maintained |
| leaflet-simple-map-screenshoter | 3.3.0 | Map to image capture | Promise-based, works with Leaflet 1.9.x, handles tile loading |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| modern-screenshot | latest | DOM to image fallback | If leaflet-simple-map-screenshoter has issues with specific map layers |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jsPDF | pdfmake | Better for complex layouts/tables, but larger bundle and different API paradigm |
| leaflet-simple-map-screenshoter | html2canvas + manual capture | More control but requires manual tile-load handling |
| leaflet-simple-map-screenshoter | leaflet-image (Mapbox) | Older, less actively maintained |

**Installation:**
```bash
npm install jspdf leaflet-simple-map-screenshoter
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── services/
│   ├── overpass.js        # Extended with getStreetsInBbox()
│   └── zoneExport.js      # NEW: PDF/CSV generation service
├── ui/
│   └── zoneEditor.js      # Extended with export buttons
└── utils/
    └── mapCapture.js      # NEW: Map screenshot utility
```

### Pattern 1: Export Service Module
**What:** Centralize export logic in a service module
**When to use:** Any zone export operation
**Example:**
```javascript
// src/services/zoneExport.js
import { jsPDF } from 'jspdf';
import { store } from '../state/store.js';
import { captureZoneMap } from '../utils/mapCapture.js';
import { getStreetsInBbox } from './overpass.js';

export async function exportZonePDF(zone) {
  // 1. Show loading indicator
  // 2. Fetch streets via Overpass (async)
  // 3. Capture map screenshot (async)
  // 4. Generate PDF with jsPDF
  // 5. Trigger download
}

export function exportZoneCSV(zone, streets) {
  // Generate CSV and download
}
```

### Pattern 2: Map Capture with Zoom-to-Fit
**What:** Temporarily adjust map view to show full zone before capture
**When to use:** PDF map generation
**Example:**
```javascript
// src/utils/mapCapture.js
import { SimpleMapScreenshoter } from 'leaflet-simple-map-screenshoter';

export async function captureZoneMap(map, zone) {
  const screenshoter = new SimpleMapScreenshoter({
    hidden: true,
    preventDownload: true
  }).addTo(map);

  // Store current view
  const originalBounds = map.getBounds();
  const originalZoom = map.getZoom();

  // Fit to zone
  const zoneBounds = L.geoJSON(zone.geojson).getBounds();
  map.fitBounds(zoneBounds, { padding: [20, 20] });

  // Wait for tiles to load
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Capture
  const blob = await screenshoter.takeScreen('blob');

  // Restore view
  map.setView(originalBounds.getCenter(), originalZoom);

  // Cleanup
  map.removeControl(screenshoter);

  return blob;
}
```

### Pattern 3: Overpass Street Query
**What:** Query named highways within zone bounding box
**When to use:** Fetching street list for PDF/CSV
**Example:**
```javascript
// Extension to src/services/overpass.js
export async function getStreetsInBbox(geojson) {
  const bbox = getBoundingBox(geojson);
  const bboxStr = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;

  const query = `
[out:json][timeout:30];
(
  way["highway"~"^(residential|primary|secondary|tertiary|unclassified|living_street)$"]
     ["name"]
     (${bboxStr});
);
out tags;
`;

  // ... fetch with fallback endpoints
  // Return unique sorted street names
  const names = data.elements
    .map(el => el.tags?.name)
    .filter(Boolean);
  return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'fr'));
}
```

### Pattern 4: CSV Generation (Native)
**What:** Generate CSV without external library
**When to use:** Structured data export
**Example:**
```javascript
// CSV export using existing pattern from exportImport.js
function generateCSV(zone, streets, members) {
  const rows = [
    ['Zone', 'Rue', 'Colistiers'],
    ...streets.map((street, i) => [
      i === 0 ? zone.name : '',
      street,
      i === 0 ? members.map(m => m.name).join(', ') : ''
    ])
  ];

  const csv = rows.map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  // Download trigger (same pattern as exportImport.js)
  const a = document.createElement('a');
  a.href = url;
  a.download = `zone-${zone.name}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

### Anti-Patterns to Avoid
- **Server-side rendering for PDFs:** Project is vanilla JS client-side only; don't introduce server dependencies
- **Synchronous exports:** Street fetching and map capture are async; always show loading indicator
- **Direct DOM manipulation in export service:** Keep export logic in services, UI feedback in zoneEditor.js

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF generation | Custom canvas/text rendering | jsPDF | Handles fonts, positioning, page breaks |
| Map screenshot | Manual canvas copying | leaflet-simple-map-screenshoter | Handles tile loading, CORS, layer ordering |
| CSV escaping | Simple string replace | Proper CSV quoting | Edge cases: newlines, commas, quotes in data |
| Image in PDF | Manual base64 encoding | jsPDF.addImage() | Handles format detection, compression |

**Key insight:** PDF generation and map capture have many edge cases (font embedding, CORS, async tile loading, memory management). Libraries handle these; custom solutions will miss edge cases.

## Common Pitfalls

### Pitfall 1: Map Tiles Not Loaded Before Screenshot
**What goes wrong:** Screenshot captures gray/missing tiles
**Why it happens:** Tiles load asynchronously; screenshot fires too early
**How to avoid:** Add delay (1-2 seconds) after fitBounds before capture, or listen for 'tileload' events
**Warning signs:** Sporadic blank areas in exported maps

### Pitfall 2: CORS Issues with Tile Providers
**What goes wrong:** Map screenshot fails silently or shows black
**Why it happens:** Some tile providers block cross-origin canvas access
**How to avoid:** Project uses standard OpenStreetMap tiles which are CORS-friendly; don't change tile provider without testing export
**Warning signs:** "Tainted canvas" errors in console

### Pitfall 3: Overpass Rate Limiting
**What goes wrong:** Street fetch fails for rapid exports
**Why it happens:** Public Overpass endpoints have rate limits
**How to avoid:** Existing overpass.js has fallback endpoints; maintain this pattern; don't allow rapid re-exports
**Warning signs:** HTTP 429 errors or timeouts

### Pitfall 4: Large Zone Performance
**What goes wrong:** PDF generation hangs or browser becomes unresponsive
**Why it happens:** Very large zones may have thousands of streets; map capture of large areas may exhaust memory
**How to avoid:** Consider pagination in PDF for many streets; warn user for very large zones
**Warning signs:** Long loading times, browser warnings about page responsiveness

### Pitfall 5: French Character Encoding in CSV
**What goes wrong:** Accented characters display incorrectly in Excel
**Why it happens:** Missing BOM or wrong encoding
**How to avoid:** Add UTF-8 BOM ('\ufeff') at start of CSV; specify charset in Blob type
**Warning signs:** "Rue" displays as "RuÃ©"

## Code Examples

Verified patterns from official sources:

### jsPDF Basic Document
```javascript
// Source: https://github.com/parallax/jsPDF
import { jsPDF } from 'jspdf';

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4'
});

// A4 dimensions: 210 x 297 mm
const pageWidth = 210;
const margin = 15;

// Title
doc.setFontSize(18);
doc.text('Zone: ' + zoneName, margin, 20);

// Subtitle
doc.setFontSize(12);
doc.text('Colistiers: ' + memberNames, margin, 30);

// Save
doc.save(`zone-${zoneName}.pdf`);
```

### jsPDF Add Image from Blob
```javascript
// Source: https://artskydj.github.io/jsPDF/docs/module-addImage.html
// Convert blob to base64 first
const reader = new FileReader();
reader.onload = () => {
  const base64 = reader.result;
  // addImage(imageData, format, x, y, width, height)
  doc.addImage(base64, 'PNG', margin, 40, pageWidth - (margin * 2), 100);
  doc.save('output.pdf');
};
reader.readAsDataURL(blob);
```

### leaflet-simple-map-screenshoter
```javascript
// Source: https://github.com/grinat/leaflet-simple-map-screenshoter
import { SimpleMapScreenshoter } from 'leaflet-simple-map-screenshoter';

const screenshoter = new SimpleMapScreenshoter({
  hidden: true,           // Don't show button
  preventDownload: true,  // We handle download ourselves
  mimeType: 'image/png'
}).addTo(map);

// Programmatic capture
const blob = await screenshoter.takeScreen('blob');
// Or: const dataUrl = await screenshoter.takeScreen('image');
// Or: const canvas = await screenshoter.takeScreen('canvas');

// Cleanup when done
map.removeControl(screenshoter);
```

### Overpass Street Query
```javascript
// Source: https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_API_by_Example
const query = `
[out:json][timeout:30];
(
  way["highway"~"^(residential|primary|secondary|tertiary|unclassified|living_street)$"]
     ["name"]
     (${south},${west},${north},${east});
);
out tags;
`;

const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: `data=${encodeURIComponent(query)}`
});

const data = await response.json();
const streetNames = data.elements.map(el => el.tags.name);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| dom-to-image | html-to-image or modern-screenshot | 2023-2024 | dom-to-image unmaintained; forks have better compat |
| jsPDF 2.x | jsPDF 4.x | 2024 | Better ESM support, improved image handling |
| Manual tile waiting | leaflet-simple-map-screenshoter | 2022+ | Handles async tile loading automatically |

**Deprecated/outdated:**
- dom-to-image: Unmaintained since 2020, use html-to-image or modern-screenshot
- jsPDF html() plugin: Complex setup; prefer direct text/image API for simple documents

## Open Questions

Things that couldn't be fully resolved:

1. **Map screenshot scale for print quality**
   - What we know: leaflet-simple-map-screenshoter supports scale option
   - What's unclear: Optimal scale for A4 PDF at 300 DPI
   - Recommendation: Start with scale: 2, test print quality, adjust if needed

2. **Street query coverage vs zone polygon**
   - What we know: Overpass bounding box includes streets crossing the boundary
   - What's unclear: Whether to filter streets to only those fully within polygon
   - Recommendation: Use bounding box (simpler, faster); accept minor over-inclusion

## Sources

### Primary (HIGH confidence)
- [jsPDF GitHub](https://github.com/parallax/jsPDF) - Installation, basic API, version 4.1.0
- [jsPDF addImage API](https://artskydj.github.io/jsPDF/docs/module-addImage.html) - Image insertion parameters
- [leaflet-simple-map-screenshoter](https://github.com/grinat/leaflet-simple-map-screenshoter) - Installation, API, configuration
- [OSM Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL) - Query syntax for highways
- [Overpass examples](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_API_by_Example) - Street query patterns

### Secondary (MEDIUM confidence)
- [modern-screenshot GitHub](https://github.com/qq15725/modern-screenshot) - Alternative to dom-to-image
- [npm-compare html-to-image](https://npm-compare.com/dom-to-image,html-to-image,html2canvas) - Library comparison 2025-2026
- [Overpass street query gist](https://gist.github.com/JamesChevalier/b861388d35476cee4fcc3626a60af60f) - Highway filtering patterns

### Tertiary (LOW confidence)
- WebSearch results for PDF library comparison - confirms jsPDF popularity
- WebSearch results for Leaflet export methods - confirms leaflet-simple-map-screenshoter recommendation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - jsPDF and leaflet-simple-map-screenshoter are well-documented with official sources
- Architecture: HIGH - Follows existing project patterns (services, utils, store)
- Pitfalls: MEDIUM - Based on common issues documented in library issues and community posts

**Research date:** 2026-02-05
**Valid until:** 2026-03-05 (30 days - stable libraries)
