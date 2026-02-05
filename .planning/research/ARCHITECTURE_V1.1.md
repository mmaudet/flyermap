# Architecture Research: v1.1 Wizard & Export Integration

**Milestone:** v1.1 Généricité + Export
**Researched:** 2026-02-05
**Overall Confidence:** HIGH

## Summary

This research addresses how to integrate wizard onboarding and zone export functionality into the existing vanilla JS Leaflet application without breaking v1.0 architecture. The goal is to maintain simplicity while adding:

1. **Wizard Flow** - First-launch onboarding (postal code → commune selection → CSV import)
2. **Export System** - PDF and CSV export with OSM street data per zone

**Key architectural principle:** Additive integration. New features should extend, not replace, the existing simple architecture.

## Current Architecture (v1.0 Baseline)

### System Structure

```
FlyerMap v1.0
├── index.html (single page entry)
├── src/
│   ├── main.js (app initialization)
│   ├── state/
│   │   └── store.js (PubSub + state manager)
│   ├── data/
│   │   ├── storage.js (LocalStorage wrapper)
│   │   └── commune.js (geo.api.gouv.fr boundary fetch)
│   ├── map/
│   │   ├── config.js (hardcoded DEFAULT_INSEE, coords)
│   │   ├── markerLayer.js
│   │   ├── markerStyles.js
│   │   └── zoneLayer.js
│   ├── ui/
│   │   ├── sidePanel.js
│   │   ├── importFlow.js
│   │   ├── exportImport.js
│   │   └── zoneEditor.js (uses <dialog> element)
│   └── services/
│       ├── csvImport.js (PapaParse integration)
│       ├── geocoding.js (api-adresse.data.gouv.fr)
│       └── overpass.js (building count estimation)
└── package.json (Vite, Leaflet, Geoman, PapaParse)
```

### Data Flow (v1.0)

1. **Page Load** → main.js initializes map with hardcoded DEFAULT_INSEE
2. **Commune Boundary** → Fetched from geo.api.gouv.fr using DEFAULT_INSEE
3. **User Actions** → Update store via PubSub events
4. **State Changes** → Debounced save to LocalStorage (500ms)
5. **Persistence** → Single key: `flyermap_data` with structure:
   ```json
   {
     "teamMembers": [...],
     "zones": [...]
   }
   ```

### Key Characteristics

- **No routing** - Single page, no URL state
- **No build complexity** - Vite for dev server, but vanilla JS modules
- **Dialog-based modals** - Uses native `<dialog>` element (zoneEditor.js)
- **PubSub events** - Loose coupling between UI and state
- **LocalStorage-first** - No backend, all data client-side

## Integration Strategy

### Wizard Flow Architecture

#### Entry Point Decision

**Challenge:** How does the app know if it's first launch vs. returning user?

**Solution:** Add `configVersion` to LocalStorage schema.

```javascript
// New storage structure
{
  "configVersion": 1,
  "commune": {
    "insee": "78140",
    "name": "Chapet",
    "postalCode": "78130",
    "center": [48.969, 1.932],
    "zoom": 14
  },
  "teamMembers": [...],
  "zones": [...]
}
```

**Detection logic:**
```javascript
// In main.js initialization
const data = storage.load('flyermap_data');

if (!data || !data.configVersion || !data.commune) {
  // First launch or legacy data → Show wizard
  showWizard();
} else {
  // Configured → Load map normally
  initMap(data.commune);
}
```

#### Wizard Steps (State Machine Pattern)

Wizard is a state machine with 3 steps:

1. **Step 1: Postal Code** - User enters postal code
2. **Step 2: Commune Selection** - If multiple communes, user chooses
3. **Step 3: CSV Import** - User uploads team CSV

**Implementation approach:**
- Use native `<dialog>` element (consistent with zoneEditor pattern)
- Class-based state machine (matches existing patterns)
- Store step progress in component state (no persistence needed - wizard completes in one session)

**Transition logic:**
```
Step 1 (Postal Code)
  → API call to geo.api.gouv.fr /communes?codePostal=XXXXX
  → If 1 result: Auto-select, go to Step 3
  → If >1 result: Show selection UI, go to Step 2

Step 2 (Commune Selection)
  → User picks commune from list
  → Go to Step 3

Step 3 (CSV Import)
  → Reuse existing csvImport.js flow
  → On complete: Save commune config to store
  → Close wizard, initialize map
```

#### API Integration Points

**geo.api.gouv.fr endpoints needed:**

1. **Postal code → Communes list:**
   ```
   GET https://geo.api.gouv.fr/communes?codePostal={code}&fields=nom,code,centre,contour
   ```
   Returns: Array of communes (most postal codes = 1 commune, some = multiple)

2. **Commune boundary (existing):**
   ```
   GET https://geo.api.gouv.fr/communes/{insee}?format=geojson&geometry=contour
   ```
   Already implemented in commune.js

**Key consideration:** No rate limiting on geo.api.gouv.fr, free public API.

#### State Tracking

**Where to track "configured" state:**
- LocalStorage key: `flyermap_data.configVersion` (number)
- If missing or < current version → trigger wizard
- Current version: 1

**Migration path from v1.0:**
- v1.0 data has no `configVersion` or `commune` fields
- Migration logic in storage.js or store.js:
  ```javascript
  function migrateToV1(oldData) {
    if (oldData.configVersion === 1) return oldData;

    return {
      configVersion: 1,
      commune: {
        insee: DEFAULT_INSEE,
        name: "Chapet",
        postalCode: "78130",
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM
      },
      teamMembers: oldData.teamMembers || [],
      "zones": oldData.zones || []
    };
  }
  ```

### Export System Architecture

#### Export Trigger

**UI Integration:**
- Add "Export" button to zone editor dialog (next to Delete button)
- Or: Add "Export Zone" item to zone context menu
- Trigger calls export function with zone data

**Recommendation:** Context menu option (right-click on zone) for discoverability.

#### Data Sources for Export

For each zone export:

1. **Zone metadata** (from store):
   - Zone name
   - Assigned team members (names, addresses)
   - Mailbox count
   - Notes

2. **Street names** (from Overpass API):
   - Query all streets (`highway=*`) within zone polygon
   - Extract street names (`name` tag)
   - Deduplicate and sort alphabetically

3. **Commune context** (from store):
   - Commune name (for header)

#### Overpass API Integration

**Current implementation:** `overpass.js` already queries Overpass for building counts.

**New query needed:** Street names within polygon.

**Query structure:**
```javascript
// Overpass QL query for streets in polygon
const streetQuery = `
[out:json][timeout:25];
(
  way["highway"]["name"](poly:"LAT1 LNG1 LAT2 LNG2 ...");
);
out tags;
`;
```

**Data extraction:**
```javascript
async function getStreetNames(geojson) {
  const coords = geojson.geometry.coordinates[0];
  const polyStr = coords.map(([lng, lat]) => `${lat} ${lng}`).join(' ');

  const query = `
[out:json][timeout:25];
(
  way["highway"]["name"](poly:"${polyStr}");
);
out tags;
`;

  const response = await fetch(OVERPASS_ENDPOINT, {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`
  });

  const data = await response.json();

  // Extract unique street names
  const streets = new Set();
  data.elements.forEach(el => {
    if (el.tags?.name) streets.add(el.tags.name);
  });

  return Array.from(streets).sort();
}
```

**Reuse pattern:** Extend `overpass.js` with `getStreetNames(geojson)` function alongside existing `countBuildingsDetailed(geojson)`.

#### PDF Generation

**Library choice: jsPDF**

**Rationale:**
- Lighter than pdfmake (25KB vs 500KB gzipped)
- Better for simple layouts (zone export is straightforward)
- Existing project uses minimal dependencies (keep it simple)
- Direct positioning control (header, member list, street list)

**Alternative considered: pdfmake**
- Better for complex table layouts
- Overkill for this use case
- Heavier dependency

**Implementation pattern:**
```javascript
import jsPDF from 'jspdf';

async function exportZoneToPDF(zone) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.text(zone.name, 20, 20);

  // Team members section
  doc.setFontSize(12);
  doc.text('Colistiers assignés:', 20, 35);

  const members = getAssignedMembers(zone);
  let y = 45;
  members.forEach(member => {
    doc.setFontSize(10);
    doc.text(`• ${member.name} - ${member.address}`, 25, y);
    y += 7;
  });

  // Streets section
  y += 10;
  doc.setFontSize(12);
  doc.text('Rues à distribuer:', 20, y);
  y += 10;

  const streets = await getStreetNames(zone.geojson);
  streets.forEach(street => {
    doc.setFontSize(10);
    doc.text(`☐ ${street}`, 25, y);
    y += 7;

    // Handle page breaks
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
  });

  // Save
  doc.save(`zone-${zone.name}.pdf`);
}
```

**Font consideration:** jsPDF includes Helvetica by default (sufficient for French text without accents). For full French support (é, à, etc.), may need to embed custom font, but test default first.

#### CSV Generation

**Library: PapaParse (already in dependencies)**

**Reuse existing dependency:** Project already uses PapaParse for CSV import. Use `Papa.unparse()` for export.

**CSV structure:**
```csv
Type,Nom,Adresse,Note
Colistier,Jean Dupont,12 rue de la Paix,
Colistier,Marie Martin,5 avenue Victor Hugo,
Rue,Rue de la Paix,,À distribuer
Rue,Avenue Victor Hugo,,À distribuer
Rue,Rue du Centre,,À distribuer
```

**Implementation:**
```javascript
import Papa from 'papaparse';

async function exportZoneToCSV(zone) {
  const rows = [];

  // Add team members
  const members = getAssignedMembers(zone);
  members.forEach(member => {
    rows.push({
      Type: 'Colistier',
      Nom: member.name,
      Adresse: member.address,
      Note: ''
    });
  });

  // Add streets
  const streets = await getStreetNames(zone.geojson);
  streets.forEach(street => {
    rows.push({
      Type: 'Rue',
      Nom: street,
      Adresse: '',
      Note: 'À distribuer'
    });
  });

  const csv = Papa.unparse(rows);

  // Download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zone-${zone.name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

**Encoding:** UTF-8 BOM for Excel compatibility with French characters.

## New Components Needed

### 1. Wizard Component (`src/ui/wizard.js`)

**Responsibilities:**
- Render 3-step wizard dialog
- Handle postal code input and validation
- Call geo.api.gouv.fr for commune lookup
- Display commune selection if multiple results
- Trigger CSV import flow (reuse existing)
- Save commune config to store on completion

**Interface:**
```javascript
export function showWizard();
export function hideWizard();
```

**DOM structure:**
```html
<dialog id="wizard" class="wizard-dialog">
  <div class="wizard-container">
    <div class="wizard-header">
      <h2>Configuration initiale</h2>
      <div class="wizard-progress">
        <span class="step active">1</span>
        <span class="step">2</span>
        <span class="step">3</span>
      </div>
    </div>

    <div class="wizard-body">
      <!-- Step content changes dynamically -->
    </div>

    <div class="wizard-footer">
      <button id="wizard-prev">Précédent</button>
      <button id="wizard-next">Suivant</button>
    </div>
  </div>
</dialog>
```

### 2. Export Service (`src/services/export.js`)

**Responsibilities:**
- Fetch street names from Overpass API
- Generate PDF with jsPDF
- Generate CSV with PapaParse
- Handle download triggers

**Interface:**
```javascript
export async function exportZoneToPDF(zone);
export async function exportZoneToCSV(zone);
export async function exportZoneBoth(zone); // PDF + CSV together
```

### 3. Commune Service Extension (`src/data/commune.js`)

**Current:** Only has `fetchCommuneBoundary()`

**Add:**
```javascript
export async function searchCommunesByPostalCode(postalCode);
export async function getCommuneDetails(inseeCode);
```

### 4. Overpass Service Extension (`src/services/overpass.js`)

**Current:** Only has `countBuildingsDetailed()`

**Add:**
```javascript
export async function getStreetNames(geojson);
```

## Modified Components

### 1. `src/main.js` (Entry Point)

**Current logic:**
```javascript
// Load map immediately with hardcoded config
const map = L.map('map', {
  center: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM
});
```

**New logic:**
```javascript
import { showWizard } from './ui/wizard.js';
import { store } from './state/store.js';

// Check if app is configured
const appConfig = store.getConfig();

if (!appConfig || !appConfig.commune) {
  // First launch → show wizard
  showWizard();
} else {
  // Configured → load map with stored commune
  initMap(appConfig.commune);
}
```

**Refactoring needed:** Extract map initialization into `initMap(communeConfig)` function.

### 2. `src/state/store.js` (State Manager)

**Add commune config management:**

```javascript
class Store {
  constructor() {
    this.state = {
      configVersion: 1,
      commune: null,  // NEW
      teamMembers: [],
      zones: []
    };
  }

  getConfig() {
    return {
      configVersion: this.state.configVersion,
      commune: this.state.commune
    };
  }

  setCommune(communeData) {
    this.state.commune = communeData;
    this.pubsub.publish('communeSet', communeData);
    this._debouncedSave();
  }

  resetConfig() {
    // For "reconfigure" feature
    this.state.commune = null;
    this._debouncedSave();
  }
}
```

**Migration logic:** Add `_migrateData(loadedData)` method to handle v1.0 → v1.1 upgrade.

### 3. `src/data/storage.js` (LocalStorage Wrapper)

**Current:** Generic save/load.

**Add migration support:**

```javascript
class Storage {
  load(key) {
    try {
      const serialized = localStorage.getItem(key);
      if (serialized === null) return null;

      const data = JSON.parse(serialized);

      // Run migrations if needed
      return this._migrate(data);
    } catch (error) {
      console.error('LocalStorage load failed', error);
      return null;
    }
  }

  _migrate(data) {
    // No configVersion = v1.0 data
    if (!data.configVersion) {
      return this._migrateV0toV1(data);
    }

    return data;
  }

  _migrateV0toV1(oldData) {
    // Import default values from config.js
    import { DEFAULT_INSEE, DEFAULT_CENTER, DEFAULT_ZOOM } from '../map/config.js';

    return {
      configVersion: 1,
      commune: {
        insee: DEFAULT_INSEE,
        name: "Chapet",
        postalCode: "78130",
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM
      },
      teamMembers: oldData.teamMembers || [],
      zones: oldData.zones || []
    };
  }
}
```

### 4. `src/map/zoneLayer.js` (Zone Management)

**Add export action to zone context menu:**

```javascript
// When zone is created or updated, add context menu
function addZoneToMap(zone) {
  const layer = L.geoJSON(zone.geojson, { style: getZoneStyle(zone) });

  layer.on('contextmenu', (e) => {
    showZoneContextMenu(e, zone);
  });

  // ... existing code
}

function showZoneContextMenu(event, zone) {
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.style.left = event.containerPoint.x + 'px';
  menu.style.top = event.containerPoint.y + 'px';

  menu.innerHTML = `
    <button onclick="editZone('${zone.id}')">Éditer</button>
    <button onclick="exportZonePDF('${zone.id}')">Exporter PDF</button>
    <button onclick="exportZoneCSV('${zone.id}')">Exporter CSV</button>
  `;

  document.body.appendChild(menu);

  // Remove menu on click outside
  setTimeout(() => {
    document.addEventListener('click', () => menu.remove(), { once: true });
  }, 0);
}
```

**Alternative:** Add export buttons to zone editor dialog (simpler, more discoverable).

### 5. `src/ui/zoneEditor.js` (Zone Editor Dialog)

**Add export buttons to dialog:**

```html
<div class="button-row">
  <button type="button" id="export-pdf-btn" class="btn-action">📄 Export PDF</button>
  <button type="button" id="export-csv-btn" class="btn-action">📊 Export CSV</button>
  <div class="button-spacer"></div>
  <button type="button" id="delete-zone-btn" class="btn-danger">Supprimer</button>
  <button type="submit" value="cancel" class="btn-secondary">Annuler</button>
  <button type="submit" value="save" class="btn-primary">Enregistrer</button>
</div>
```

**Event handlers:**
```javascript
export function initZoneEditor() {
  // ... existing code

  const exportPdfBtn = document.getElementById('export-pdf-btn');
  exportPdfBtn.addEventListener('click', async () => {
    if (!currentZone) return;
    exportPdfBtn.disabled = true;
    exportPdfBtn.textContent = 'Génération...';

    try {
      await exportZoneToPDF(currentZone);
    } finally {
      exportPdfBtn.disabled = false;
      exportPdfBtn.textContent = '📄 Export PDF';
    }
  });

  // Similar for CSV button
}
```

## Build Order (Suggested Implementation Sequence)

### Phase 1: Storage Schema Migration (Foundation)

1. **Extend storage.js with migration logic**
   - Add `_migrate()`, `_migrateV0toV1()` methods
   - Test with existing v1.0 LocalStorage data

2. **Update store.js with commune config**
   - Add `commune` to state
   - Add `getConfig()`, `setCommune()`, `resetConfig()` methods
   - Update `_loadInitialState()` to handle new schema

3. **Test:** Load app with v1.0 data, verify migration works

### Phase 2: Wizard Flow (Core Genericity)

4. **Extend commune.js with API methods**
   - Add `searchCommunesByPostalCode(code)`
   - Add `getCommuneDetails(insee)`
   - Test API responses

5. **Create wizard.js component**
   - Build 3-step state machine
   - Integrate geo.api.gouv.fr API
   - Reuse csvImport.js for Step 3
   - Save commune config on completion

6. **Update main.js entry point**
   - Add wizard check logic
   - Refactor map init into `initMap(commune)`
   - Test first-launch flow

7. **Add reconfigure option**
   - Add "Changer de commune" button in UI
   - Triggers `store.resetConfig()` + `showWizard()`

### Phase 3: Export System (Street Data Integration)

8. **Extend overpass.js with street query**
   - Add `getStreetNames(geojson)`
   - Reuse existing endpoint fallback logic
   - Test with sample zone polygons

9. **Install jsPDF dependency**
   ```bash
   npm install jspdf
   ```

10. **Create export.js service**
    - Implement `exportZoneToPDF(zone)`
    - Implement `exportZoneToCSV(zone)`
    - Test with sample zone data

11. **Update zoneEditor.js with export UI**
    - Add export buttons to dialog
    - Wire up event handlers
    - Add loading states

### Phase 4: Polish & Testing

12. **Add loading indicators**
    - Wizard API calls
    - Overpass API calls (already has for building count)
    - PDF/CSV generation

13. **Error handling**
    - API failures (geo.api.gouv.fr, Overpass)
    - Invalid postal codes
    - Network timeouts

14. **Documentation**
    - Update README with wizard flow
    - Document LocalStorage schema v1
    - Export format examples

## State Management Considerations

### LocalStorage Schema V1

**Key:** `flyermap_data`

**Structure:**
```json
{
  "configVersion": 1,
  "commune": {
    "insee": "78140",
    "name": "Chapet",
    "postalCode": "78130",
    "center": [48.969, 1.932],
    "zoom": 14
  },
  "teamMembers": [
    {
      "id": "...",
      "name": "...",
      "address": "...",
      "lat": ...,
      "lng": ...,
      "createdAt": "..."
    }
  ],
  "zones": [
    {
      "id": "...",
      "name": "...",
      "geojson": {...},
      "assignedMembers": ["id1", "id2"],
      "mailboxCount": 150,
      "notes": "...",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

### Migration Path

**v1.0 → v1.1 migration:**
- Detect: No `configVersion` field
- Action: Add `configVersion: 1` and `commune` object with hardcoded Chapet defaults
- Result: Existing users see their data + wizard skip (already configured)

**Future migrations:**
- v1.1 → v1.2: Increment `configVersion` to 2, apply new migrations
- Pattern: Sequential migration functions (`migrateV1toV2`, `migrateV2toV3`)

### PubSub Events (Additions)

**New events:**
- `communeSet` - Fired when commune config is saved
- `communeReset` - Fired when user reconfigures

**Existing events (unchanged):**
- `teamMembersLoaded`, `teamMemberAdded`, `teamMemberRemoved`, `teamMemberUpdated`
- `zonesLoaded`, `zoneAdded`, `zoneUpdated`, `zoneRemoved`

## Architecture Decision Records

### ADR 1: Use Native Dialog for Wizard (Not Separate Page)

**Decision:** Wizard uses `<dialog>` element, same as zone editor.

**Rationale:**
- Consistency with existing patterns (zoneEditor.js uses `<dialog>`)
- No routing needed (keep single-page simplicity)
- Modal UX prevents user from accessing unconfigured app
- Dialog API is well-supported in modern browsers (Edge 79+, Chrome 37+)

**Alternative considered:** Separate wizard HTML page
- Rejected: Adds routing complexity, multiple HTML files

### ADR 2: Extend LocalStorage Schema with Versioning

**Decision:** Add `configVersion` field and migration logic in storage.js.

**Rationale:**
- Future-proof for schema changes (v1.2, v1.3, etc.)
- Clean upgrade path for existing users
- Industry standard pattern (Redux Persist, RxDB, etc.)

**Alternative considered:** Separate storage key for commune config
- Rejected: Fragmented data, harder to export/import

### ADR 3: jsPDF over pdfmake for Export

**Decision:** Use jsPDF for PDF generation.

**Rationale:**
- Lighter (25KB vs 500KB)
- Simpler API for straightforward layouts
- Direct control over positioning (good for checklist format)
- Project philosophy: minimal dependencies

**Alternative considered:** pdfmake
- Rejected: Overkill for simple zone export layout

### ADR 4: Export Triggered from Zone Editor Dialog

**Decision:** Add export buttons inside zone editor dialog, not context menu.

**Rationale:**
- More discoverable (buttons visible in editor)
- Consistent with existing dialog pattern
- No need to implement custom context menu component
- Users already open editor to view zone details

**Alternative considered:** Right-click context menu on zone
- Rejected: Requires custom menu component, less discoverable

### ADR 5: Reuse PapaParse for CSV Export

**Decision:** Use existing PapaParse dependency (`Papa.unparse()`) for CSV export.

**Rationale:**
- Already installed for CSV import
- No additional dependency
- Simple API for array-to-CSV conversion
- Handles encoding and escaping correctly

**Alternative considered:** Manual CSV string building
- Rejected: Error-prone (quoting, escaping, encoding)

### ADR 6: geo.api.gouv.fr for Commune Lookup (Not Geocoding API)

**Decision:** Use geo.api.gouv.fr for postal code → commune mapping.

**Rationale:**
- Official French government API (authoritative data)
- No rate limits (free, unlimited)
- Returns commune boundaries directly (GeoJSON)
- Already used for commune boundary fetch

**Note:** api-adresse.data.gouv.fr is being deprecated (end of January 2026) in favor of Géoplateforme. For geocoding (addresses), project currently uses api-adresse.data.gouv.fr. Future migration may be needed, but NOT for commune lookup (geo.api.gouv.fr is separate and stable).

## Patterns & Anti-Patterns

### Patterns to Follow

1. **Additive Integration**
   - Don't refactor existing components unless necessary
   - Add new files for new features (wizard.js, export.js)
   - Extend existing services (commune.js, overpass.js)

2. **Dialog-First Modals**
   - Use native `<dialog>` for all modal UI
   - `showModal()` for blocking, `show()` for non-blocking
   - Handle close with `returnValue` (like zoneEditor)

3. **State Machine for Multi-Step Flows**
   - Wizard step tracking with clear state transitions
   - Validate before allowing next step
   - Support back navigation

4. **PubSub for Decoupling**
   - New components subscribe to store events
   - Don't tightly couple UI to state implementation
   - Event names describe what happened (not commands)

5. **Progressive Enhancement**
   - App still works if Overpass API fails (no streets in export)
   - Graceful degradation for old browsers (dialog polyfill if needed)

### Anti-Patterns to Avoid

1. **Over-Engineering State Management**
   - Don't add Redux/Zustand/MobX for two new fields
   - LocalStorage + PubSub is sufficient for this scale

2. **Breaking Existing Data**
   - Never delete old LocalStorage data without migration
   - Always version schema for future changes

3. **Tight Coupling to APIs**
   - Don't assume geo.api.gouv.fr always returns data
   - Handle network failures gracefully
   - Provide manual input fallback if API fails

4. **Heavy Dependencies**
   - Don't add large libraries for simple tasks
   - Prefer vanilla JS + small focused libraries

5. **Complex Export UI**
   - Don't add export preview, print dialog, format options
   - One button = one export format
   - Simple, predictable behavior

## Open Questions & Risks

### Open Questions

1. **Font handling in jsPDF for French characters?**
   - Risk: Default Helvetica may not render é, à, ç correctly
   - Mitigation: Test with real French text, embed custom font if needed

2. **Overpass API polygon query performance?**
   - Risk: Large zones may timeout (25s limit)
   - Mitigation: Already handled in existing overpass.js (fallback endpoints)

3. **Excel CSV encoding?**
   - Risk: French characters may display incorrectly in Excel
   - Mitigation: Use UTF-8 BOM (`\uFEFF` prefix) for Excel compatibility

### Risks

1. **API Deprecation (api-adresse.data.gouv.fr)**
   - **Impact:** Medium (only affects geocoding, not commune lookup)
   - **Timeline:** End of January 2026 (imminent)
   - **Mitigation:** Plan migration to Géoplateforme geocoding service
   - **Note:** This affects existing v1.0 geocoding, not new wizard (uses geo.api.gouv.fr)

2. **LocalStorage Quota (5MB)**
   - **Impact:** Low (zone GeoJSON + team data unlikely to exceed)
   - **Mitigation:** Existing quota warning in storage.js (80% threshold)

3. **Browser Compatibility (dialog element)**
   - **Impact:** Low (supported in all modern browsers since 2022)
   - **Mitigation:** Consider dialog-polyfill for older browsers if needed
   - **Browser support:** Chrome 37+, Edge 79+, Firefox 98+, Safari 15.4+

## Sources

### Wizard & Onboarding Patterns
- [How to Create Multi-Step Forms With Vanilla JavaScript and CSS - CSS-Tricks](https://css-tricks.com/how-to-create-multi-step-forms-with-vanilla-javascript-and-css/)
- [How to Build a Multi Step Form Wizard with JavaScript - Envato Tuts+](https://webdesign.tutsplus.com/tutorials/how-to-build-a-multi-step-form-wizard-with-javascript--cms-93342)
- [Build your own JavaScript onboarding wizard - Yoast](https://yoast.com/developer-blog/javascript-onboarding-wizard/)

### PDF Generation
- [jsPDF GitHub Repository](https://github.com/parallax/jsPDF)
- [How to generate PDFs in the browser with Javascript - Joyfill](https://joyfill.io/blog/how-to-generate-pdfs-in-the-browser-with-javascript-no-server-needed)
- [Generate PDFs with jsPDF: A Complete Guide - PDFBolt](https://pdfbolt.com/blog/generate-html-to-pdf-with-jspdf)
- [Top JavaScript PDF generator libraries for 2025 - Nutrient](https://www.nutrient.io/blog/top-js-pdf-libraries/)

### CSV Export
- [Papa Parse - Powerful CSV Parser for JavaScript](https://www.papaparse.com/)
- [Papa Parse Documentation](https://www.papaparse.com/docs)
- [Papa Parse - npm](https://www.npmjs.com/package/papaparse)

### Overpass API
- [Overpass API by Example - OpenStreetMap Wiki](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_API_by_Example)
- [Overpass API query to retrieve all streets in a city - GitHub Gist](https://gist.github.com/JamesChevalier/b861388d35476cee4fcc3626a60af60f)
- [Create a map with leaflet and Overpass API - Medium](https://medium.com/@elianarubies/create-a-map-with-leaflet-and-overpass-api-6286814bad4b)
- [Leaflet Overpass Layer - npm](https://www.npmjs.com/package/leaflet-overpass-layer)

### Geo APIs
- [API Adresse - Base Adresse Nationale - data.gouv.fr](https://www.data.gouv.fr/dataservices/api-adresse-base-adresse-nationale-ban)
- [API Adresse Documentation - adresse.data.gouv.fr](https://adresse.data.gouv.fr/outils/api-doc/adresse)

### LocalStorage Schema Migration
- [migrate-local-storage - npm](https://www.npmjs.com/package/migrate-local-storage)
- [An Approach to JavaScript Object Schema Migration - DEV Community](https://dev.to/nas5w/an-approach-to-javascript-object-schema-migration-1a94)
- [Pro tips using localStorage - Medium](https://medium.com/@mohamedelayadi/pro-tips-using-localstorage-51931f40f0be)
- [Introduction to a stateful & maintainable React Local Storage hook - DEV Community](https://dev.to/prakash_chokalingam/introduction-to-a-stateful-maintainable-react-local-storage-hook-31ie)

---

**Confidence Level:** HIGH

**Rationale:**
- Existing architecture well-understood (v1.0 codebase reviewed)
- Wizard pattern is well-established (multiple authoritative sources)
- Export libraries (jsPDF, PapaParse) actively maintained and documented
- Overpass API street query verified via OSM wiki examples
- Migration pattern follows industry standards

**Implementation Ready:** Yes. All integration points identified, build order sequenced, no major unknowns.
