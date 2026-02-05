# Project Research Summary

**Project:** Map Vivons Chapet - Interactive Electoral Distribution Zone Manager
**Domain:** Interactive web mapping with zone management for political campaigns
**Researched:** 2026-02-05
**Confidence:** HIGH

## Executive Summary

Map Vivons Chapet is an interactive zone management mapping application for political campaign coordination. Research reveals this sits at the intersection of web mapping (standard patterns, well-documented), territory management (enterprise patterns simplified for single-user), and static-hosted web applications. The recommended approach centers on Leaflet 1.9.4 with Leaflet-Geoman for polygon drawing, Vite for build tooling, and LocalStorage for persistence—a lightweight, proven stack requiring no backend infrastructure.

The critical success factor is avoiding common pitfalls that plague mapping applications: using unmaintained libraries (Leaflet.draw is deprecated), GeoJSON coordinate integrity errors, and localStorage data loss without warning. For French address geocoding, there's an urgent deadline: the current api-adresse.data.gouv.fr API will be decommissioned end of January 2026, requiring immediate use of the Géoplateforme API at data.geopf.fr/geocodage.

The architecture follows a layered pattern with clear separation: Map Controller orchestrates specialized layer groups (markers for team members, zones for polygons), State Manager provides single source of truth, and Persistence Layer handles LocalStorage serialization. Build order should follow dependency chains: map foundation → state infrastructure → markers → zones → assignment logic, validating each layer before adding complexity.

## Key Findings

### Recommended Stack

For static-hosted mapping with polygon drawing and French address support, the 2025 standard stack prioritizes lightweight, actively maintained libraries with zero API keys required. Leaflet dominates the space (1.4M+ weekly downloads) over alternatives like Mapbox GL JS (proprietary license, costs money) and OpenLayers (too complex for this use case).

**Core technologies:**
- **Leaflet 1.9.4**: Interactive map rendering — lightweight (42KB), mobile-friendly, excellent performance for <50K features, largest ecosystem, zero dependencies
- **Leaflet-Geoman Free 2.19.2**: Polygon draw/edit/drag/cut/rotate — actively maintained (Feb 2025 release), superior to deprecated Leaflet.draw, comprehensive feature set
- **Vite 7.3.1**: Build tool and dev server — lightning-fast (<1s startup), native ESM, zero-config TypeScript support, designed for static sites
- **Géoplateforme Geocoding**: French address geocoding — official replacement for deprecated api-adresse API (critical deadline: Jan 2026), free, 50 req/s/IP, no API key
- **LocalStorage**: Client-side persistence — simple API, GDPR-compliant, adequate for hundreds of team members (~25K records in 5MB limit)
- **PapaParse 5.4.1+**: CSV parsing — industry standard (1.4M weekly downloads), RFC 4180 compliant, handles edge cases
- **TypeScript 5.7+** (optional): Type safety — recommended if team knows TS or project >1K LOC
- **GitHub Pages** (hosting): Static hosting — completely free, no bandwidth limits, automatic HTTPS, zero config

**Critical version notes:**
- Do NOT use Leaflet.draw (development stalled, no maintenance since 2019)
- Do NOT use api-adresse.data.gouv.fr (deprecated Jan 2026 — WEEKS away!)
- Leaflet 2.0.0-alpha.1 available but use 1.9.4 for production stability

### Expected Features

Interactive zone management applications have three distinct feature tiers: table stakes (missing = broken), differentiators (competitive advantage), and anti-features (enterprise complexity that doesn't fit single-user scope).

**Must have (table stakes):**
- Interactive basemap display with zoom/pan controls
- Marker display for team member locations (distinguish assigned/unassigned)
- Polygon drawing (click-to-add-vertex, double-click-to-close)
- Polygon editing (drag vertices, add/remove points, delete polygon)
- Save work to LocalStorage + JSON file export
- Load work from LocalStorage + file import
- Visual zone boundaries with colors and labels
- Marker-to-zone assignment logic (point-in-polygon)

**Should have (competitive):**
- Auto-assignment by proximity — killer feature that saves hours of manual work
- Zone metadata (name, priority, notes, assignment status)
- Visual assignment status (color-coding for covered vs unassigned zones)
- Export to GeoJSON/KML for sharing with external tools
- Import CSV/JSON for team member data
- Undo/redo for mistake recovery
- Search/filter markers by name (valuable beyond ~10 team members)
- Zone statistics (area, perimeter, member count)
- Mobile-friendly responsive design (coordinators work in the field)
- Offline capability via service worker (connectivity gaps in communes)

**Defer (v2+):**
- Real-time multi-user collaboration (single user scenario, massive complexity)
- Route optimization (zone assignment ≠ turn-by-turn navigation)
- AI-powered zone balancing (overkill for small teams)
- Advanced GIS analysis (not a GIS platform)
- User accounts and authentication (browser storage sufficient)
- Native mobile app (PWA sufficient)
- CRM/database integration (CSV import/export adequate)

### Architecture Approach

Leaflet-based zone management applications follow a layered architecture with centralized map instance orchestrating specialized layer groups. The core pattern: Single Map Instance, Multiple Specialized FeatureGroups—all visual elements exist as layers within one Leaflet map, with FeatureGroups providing logical separation and batch operations. GeoJSON serves as universal data format for both persistence and inter-layer communication.

**Major components:**
1. **Map Controller** — initializes map, manages zoom/pan state, coordinates layer lifecycle (hub for all layer communication)
2. **State Manager** — central truth store for application state (team members, zones, assignments), single source of truth that layers read but don't modify directly
3. **Layer Manager: Team Markers** — creates/updates/removes team member markers, handles marker interactions
4. **Layer Manager: Zones** — creates/updates/removes zone polygons, handles drawing/editing via Leaflet-Geoman
5. **Layer Manager: Boundaries** — loads and displays commune boundaries from GeoJSON
6. **Persistence Layer** — serializes/deserializes state to LocalStorage with debounced writes, handles schema migrations
7. **Drawing Control** — provides UI for polygon creation/editing (Leaflet-Geoman integration)
8. **Assignment Logic** — determines team-to-zone assignments via point-in-polygon, validates constraints
9. **Geocoding Service** — interfaces with Géoplateforme API, resolves French addresses to coordinates

**Key architectural rules:**
- Map Controller is the hub: no direct layer-to-layer communication
- State Manager is single source of truth: layers dispatch changes, don't mutate directly
- Events flow upward: user interactions emit events that bubble to application layer
- GeoJSON as universal format: all geographic data stored/transmitted as GeoJSON
- Debounced persistence: batch state changes to avoid thrashing LocalStorage

### Critical Pitfalls

1. **Using unmaintained Leaflet.draw** — library hasn't seen updates in years, causing touch support failures (can only draw two-point polygons on Chrome mobile), broken editing on touch devices, no modern features. **Prevention:** Use Leaflet-Geoman instead (actively maintained, Feb 2025 release).

2. **GeoJSON coordinate integrity errors** — invalid polygons cause zones to disappear, wrong coordinate order ([lng,lat] vs [lat,lng]) places zones in wrong locations, unclosed rings render incorrectly. **Prevention:** Always validate GeoJSON before save, use structured serialization (never hand-edit), test import/export round-trips early, document coordinate order convention.

3. **localStorage data loss without warning** — QuotaExceededError at 5-10MB limit, silent data loss in private/incognito mode, complete wipe when users clear history. **Prevention:** Wrap all localStorage.setItem() in try-catch, check quota before large saves, show warnings at >80% usage, provide JSON export as backup, add "last saved" indicator.

4. **Coordinate Reference System confusion** — mixing WGS84 (EPSG:4326) with Web Mercator (EPSG:3857) causes coordinates off by up to 40km, geocoded addresses appear in ocean. **Prevention:** Use consistent CRS throughout (EPSG:4326 for storage, auto Web Mercator for display), validate geocoding results against France bounds (lat 41-51°N, lng -5-10°E).

5. **French address geocoding errors** — using international services lacks French precision, common addresses fail to geocode. **Prevention:** Use Géoplateforme (BAN) API as primary, implement fallback chain, validate coordinates within France bounds, show geocoded location for user verification.

## Implications for Roadmap

Based on research, suggested phase structure follows dependency chains and validation opportunities:

### Phase 1: Foundation (Map + Static Layers)
**Rationale:** Establishes coordinate system, verifies tile loading, provides geographic context before adding interactive layers. No dependencies—pure Leaflet + GeoJSON.

**Delivers:** Static map displaying commune boundaries from GeoJSON, proper zoom/pan controls, visual confirmation of geographic scope.

**Addresses features:** Interactive basemap display, zoom/pan controls, visual boundaries

**Avoids pitfalls:** Coordinate Reference System confusion (document CRS usage early), using unmaintained libraries (choose Leaflet-Geoman from start)

**Stack elements:** Leaflet 1.9.4, OpenStreetMap tiles, GeoJSON for boundaries

**Research flag:** SKIP—well-documented patterns, Leaflet initialization is standard

### Phase 2: State Infrastructure
**Rationale:** Foundation for all dynamic data before adding interactive layers. Enables validation of persistence patterns without complexity of drawing/editing.

**Delivers:** State management API with LocalStorage round-trip working, JSON export/import, debounced save mechanism, quota checking, "last saved" indicator.

**Addresses features:** Save work, load work, export to shareable format

**Avoids pitfalls:** localStorage data loss (wrap in try-catch, quota checks), missing backup (export JSON from day one)

**Stack elements:** LocalStorage API, JSON serialization, debounced writes pattern

**Architecture component:** State Manager + Persistence Layer

**Research flag:** SKIP—LocalStorage patterns well-documented, straightforward implementation

### Phase 3: Team Markers Layer
**Rationale:** Simpler than zones (points vs polygons), validates State → Layer rendering pipeline, establishes event-driven update patterns.

**Delivers:** Add/remove team members with geocoded positions, markers persist across sessions, visual distinction between assigned/unassigned, popups with member details.

**Addresses features:** Marker display, search/filter markers, import existing data (CSV)

**Avoids pitfalls:** French address geocoding errors (use Géoplateforme API), coordinate validation (check France bounds)

**Stack elements:** Leaflet markers API, Géoplateforme geocoding, PapaParse for CSV import

**Architecture component:** Layer Manager: Team Markers + Geocoding Service

**Research flag:** NEEDS RESEARCH—Géoplateforme API integration specifics (rate limits, response format, error handling)

### Phase 4: Zones Layer (Drawing + Editing)
**Rationale:** Most complex layer, requires understanding of FeatureGroup editing and GeoJSON serialization. Built after markers so assignment logic has both data sources available.

**Delivers:** Full polygon drawing/editing capabilities with persistence, zone metadata (name, notes), visual zone boundaries, styled based on assignment status.

**Addresses features:** Polygon drawing, polygon editing, zone metadata, visual zone boundaries, visual assignment status

**Avoids pitfalls:** Using unmaintained Leaflet.draw (use Geoman), GeoJSON integrity errors (validate before save), FeatureGroup state sync issues (initialize once, pass to draw control), polygon self-intersection (set allowIntersection: false)

**Stack elements:** Leaflet-Geoman Free 2.19.2, GeoJSON validation

**Architecture component:** Layer Manager: Zones + Drawing Control

**Research flag:** LIGHT RESEARCH—Leaflet-Geoman integration patterns well-documented, but verify touch support configuration for mobile

### Phase 5: Assignment Logic
**Rationale:** Requires both markers and zones to exist, implements core business value (auto-assignment by proximity).

**Delivers:** Functional assignment system with validation rules, point-in-polygon detection, auto-assignment by proximity algorithm, visual feedback on assignment, zone statistics.

**Addresses features:** Marker-to-zone assignment, auto-assignment by proximity, zone statistics

**Avoids pitfalls:** Missing point-in-polygon validation (implement spatial query on save), no undo/redo (implement state history stack)

**Stack elements:** Point-in-polygon algorithm (turf.js or point-in-polygon library), distance calculation (haversine)

**Architecture component:** Assignment Logic + State Manager extensions

**Research flag:** LIGHT RESEARCH—Point-in-polygon algorithms well-known, but verify performance for overlap detection

### Phase 6: Polish (UI + Mobile)
**Rationale:** Pure presentation layer, no new architectural patterns. Deferred until functionality working to avoid premature optimization.

**Delivers:** Responsive mobile design, touch support for drawing (larger tap targets, explicit "Finish" button), keyboard shortcuts (Ctrl+Z/Y, Escape, Delete), visual feedback for all actions, loading states.

**Addresses features:** Mobile-friendly interface, undo/redo, keyboard shortcuts

**Avoids pitfalls:** Poor touch/mobile support (test on real devices, set tapTolerance: 15-20px, disable panning during draw), no visual feedback during drawing

**Research flag:** LIGHT RESEARCH—Test mobile touch interactions on real devices, verify Leaflet-Geoman touch config

### Deferred to Post-MVP
- **Offline capability** (PWA with service workers): Add if field testing reveals connectivity issues—HIGH complexity for uncertain value
- **Advanced zone operations** (merge, split, buffer): Rarely needed in practice, adds complexity without validation of need
- **Historical version tracking**: Single "current" state sufficient until user requests snapshots

### Phase Ordering Rationale

**Dependencies:**
- Phase 1 (Map) must precede all others—provides rendering context
- Phase 2 (State) must precede Phase 3 & 4—provides persistence infrastructure
- Phase 3 (Markers) and Phase 4 (Zones) can be parallel but Phase 3 is simpler validation of patterns
- Phase 5 (Assignment) requires Phase 3 & 4 complete—needs both data sources
- Phase 6 (Polish) is pure presentation—no architectural dependencies

**Validation opportunities:**
- Each phase delivers working functionality that can be tested
- Early phases establish patterns (state management, layer rendering) reused in later phases
- Geocoding validation happens in Phase 3 before zone complexity added
- Assignment logic builds on established layer patterns

**Risk mitigation:**
- Choosing Leaflet-Geoman in Phase 1 avoids rewrite from deprecated Leaflet.draw
- localStorage error handling in Phase 2 prevents data loss before users invest work
- Géoplateforme API in Phase 3 avoids January 2026 deprecation deadline
- GeoJSON validation in Phase 4 prevents coordinate integrity issues at source

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 3 (Team Markers):** Géoplateforme API integration—need response format, rate limits, error codes, CORS configuration
- **Phase 5 (Assignment Logic):** Point-in-polygon performance with overlapping zones—verify algorithm choice, potential need for spatial index at scale

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Foundation):** Leaflet map initialization well-documented, OpenStreetMap tiles standard
- **Phase 2 (State):** LocalStorage patterns standard, debouncing well-known
- **Phase 4 (Zones):** Leaflet-Geoman has comprehensive docs, GeoJSON standard format
- **Phase 6 (Polish):** Responsive design standard, keyboard shortcuts straightforward

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | **HIGH** | All versions verified via official docs (Leaflet 1.9.4, Geoman 2.19.2, Vite 7.3.1), npm downloads confirmed, performance benchmarks available (Aug 2025), deprecation dates verified (api-adresse Jan 2026) |
| Features | **MEDIUM** | Table stakes consistent across mapping apps, differentiators based on campaign software research and territory management patterns, anti-features inferred from enterprise features that don't fit single-user scope |
| Architecture | **HIGH** | Leaflet architecture patterns well-documented in official docs, FeatureGroup patterns standard, GeoJSON universal format, React Leaflet core architecture applicable to vanilla JS |
| Pitfalls | **MEDIUM** | Critical pitfalls verified through GitHub issues (Leaflet.draw touch problems), official docs (GeoJSON spec), and community sources (localStorage errors), but some scenarios inferred from common mapping mistakes |

**Overall confidence:** HIGH

Research quality is strong due to official documentation verification, recent publication dates (2025-2026), and multiple corroborating sources. Stack recommendations verified through npm downloads, GitHub activity, and performance benchmarks. Architecture patterns drawn from official Leaflet docs and established web mapping practices.

### Gaps to Address

**Géoplateforme API specifics:** Research documents the API endpoint (data.geopf.fr/geocodage) and basic usage, but implementation details need validation during Phase 3:
- Exact response format and error codes
- Rate limiting behavior (50 req/s/IP documented but retry strategy needed)
- CORS configuration for browser requests
- Fallback strategy if API unavailable
- **Mitigation:** Add light research phase before Phase 3 implementation, or test with small API calls during Phase 1 to validate connectivity

**Mobile touch interaction edge cases:** Research identifies touch support as critical issue with Leaflet.draw, but Leaflet-Geoman touch behavior needs real-device validation:
- Optimal tapTolerance value (15-20px suggested but device-dependent)
- Pan-vs-draw disambiguation
- Polygon close gesture (double-tap vs explicit button)
- **Mitigation:** Test on representative devices (iPhone, Android tablet) during Phase 4, adjust based on usability findings

**LocalStorage quota actual behavior:** 5-10MB limit documented but browser-specific behavior varies:
- Exact quota calculation (does it include keys? metadata?)
- Private browsing mode restrictions
- Quota errors in different browsers (Chrome vs Firefox vs Safari)
- **Mitigation:** Implement conservative threshold (warn at 4MB), test across browsers during Phase 2

**Point-in-polygon performance at scale:** Algorithm choice depends on zone complexity and overlap scenarios:
- Ray casting sufficient for simple non-overlapping zones
- Spatial index (R-tree) needed only if hundreds of zones or frequent queries
- **Mitigation:** Start with simple algorithm (turf.js or point-in-polygon library), profile performance during Phase 5, optimize only if needed

**Campaign coordinator workflow assumptions:** Feature priorities assume single coordinator managing 5-15 volunteers, but actual team size and usage patterns unvalidated:
- Marker clustering needed if team >50 members
- Batch geocoding queue needed if importing >100 addresses
- **Mitigation:** Validate with actual campaign coordinator during requirements definition, adjust phase priorities if team size larger

## Sources

### Primary (HIGH confidence)
- [Leaflet Download & Versions](https://leafletjs.com/download.html) — Verified stable (1.9.4) and alpha (2.0.0-alpha.1) versions
- [Geoman.io Official Site](https://geoman.io/) — Verified free version features and v2.19.0 release date (Feb 2025)
- [Géoplateforme Geocoding API Docs](https://adresse.data.gouv.fr/outils/api-doc/adresse) — Official French API with deprecation notice (api-adresse.data.gouv.fr decommissioned Jan 2026)
- [Vite Official Docs](https://vite.dev/guide/why) — v7.3.1 documentation
- [Leaflet Official Documentation](https://leafletjs.com/reference.html) — Core architecture and API reference
- [GeoJSON Specification](https://geojson.org/) — Coordinate format standards

### Secondary (MEDIUM confidence)
- [Vector Data Rendering Performance Analysis (Aug 2025)](https://www.mdpi.com/2220-9964/14/9/336) — Leaflet vs OpenLayers vs Mapbox performance benchmarks
- [Maptive Territory Mapping Research](https://www.maptive.com/15-best-sales-territory-mapping-software/) — Enterprise territory management feature patterns
- [Leaflet-Geoman vs Leaflet.draw Comparison](https://geoman.io/blog/leaflet-geoman-vs-leaflet-draw) — Maintenance status and feature comparison
- [GeoJSON File Errors Guide](https://tracextech.com/geojson-file-errors/) — Common coordinate integrity issues
- [Handling localStorage Errors](https://mmazzarolo.com/blog/2022-06-25-local-storage-status/) — Quota exceeded patterns
- [LocalStorage vs IndexedDB Guide](https://dev.to/tene/localstorage-vs-indexeddb-javascript-guide-storage-limits-best-practices-fl5) — Storage strategy comparison
- [Point-in-Polygon Algorithms](https://www.numberanalytics.com/blog/ultimate-guide-point-in-polygon-computational-geometry) — Spatial query implementation
- [State Management in Vanilla JS: 2026 Trends](https://medium.com/@chirag.dave/state-management-in-vanilla-js-2026-trends-f9baed7599de) — Modern state patterns
- [Campaign Software Feature Research](https://www.maptive.com/mapping-software-for-political-campaigns/) — Political campaign territory management patterns

### Tertiary (community sources)
- [Leaflet.draw GitHub Issues](https://github.com/Leaflet/Leaflet.draw/issues) — Touch support problems documented (#789, #548)
- [JavaScript CSV Parsers Comparison](https://leanylabs.com/blog/js-csv-parsers-benchmarks/) — PapaParse performance data
- [GitHub Pages vs Vercel 2025](https://www.freetiers.com/blog/vercel-vs-github-pages-comparison) — Static hosting analysis
- [Geographic Coordinate Systems 101](https://8thlight.com/insights/geographic-coordinate-systems-101) — CRS confusion patterns
- [Vitest vs Jest 2025](https://medium.com/@ruverd/jest-vs-vitest-which-test-runner-should-you-use-in-2025-5c85e4f2bda9) — Testing framework comparison

---
*Research completed: 2026-02-05*
*Ready for roadmap: yes*
