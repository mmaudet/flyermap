# Project Research Summary

**Project:** FlyerMap v1.1 (Wizard Onboarding + Zone Export)
**Domain:** Territory mapping for political campaign flyer distribution
**Researched:** 2026-02-05
**Confidence:** HIGH

## Executive Summary

FlyerMap v1.1 adds wizard onboarding and zone export capabilities to an existing vanilla JavaScript Leaflet application. Research confirms this can be achieved with minimal new dependencies (jsPDF, Wizard-JS) while maintaining the lightweight, client-side-only architecture. The wizard will guide users through postal code entry, commune selection, and CSV import, while the export system generates print-ready PDFs and CSVs with street lists fetched from OpenStreetMap's Overpass API.

The recommended approach is additive integration: extend existing services (commune.js, overpass.js) rather than refactoring, use native dialog elements for consistency, and leverage browser-native APIs (Fetch, sessionStorage) where possible. This keeps the stack simple and aligns with the project's "no framework" philosophy. Total bundle size impact is approximately 255KB minified (78KB gzipped), primarily from jsPDF and jspdf-autotable.

Critical risks center on API dependencies and timing issues: the French Address API (api-adresse.data.gouv.fr) is being deprecated end of January 2026, Overpass API rate limiting can block batch exports (429 errors), and Leaflet map tiles must fully load before PDF capture to avoid blank exports. Migration patterns and caching strategies address these risks effectively.

## Key Findings

### Recommended Stack

Four new capabilities require minimal library additions while leveraging existing vanilla JS architecture. Research confirms that browser-native APIs can handle most functionality (Overpass queries, commune lookups), with libraries only for complex UI (wizard) and PDF generation.

**Core additions:**
- **Wizard-JS 2.0.3**: Multi-step wizard UI — Pure vanilla JavaScript with zero dependencies, ARIA-compliant accessibility, built-in form validation. Active maintenance (140+ commits, updated 2026). CDN available for no-build integration.
- **jsPDF 4.1.0 + jspdf-autotable 5.0.7**: Browser-based PDF generation — Proven maturity (8.7M weekly downloads), lightweight core, excellent plugin ecosystem. Version 4.1.0 (January 2026) includes security fixes. Can embed Leaflet canvas as image and generate street tables.
- **Overpass API (direct Fetch calls)**: OSM street extraction — Zero dependencies, official read-only API for OpenStreetMap data. Flexible Overpass QL queries provide precise control over street filtering. No wrapper library needed.
- **geo.api.gouv.fr API (direct Fetch calls)**: French commune boundaries — Official government API, no authentication required, returns GeoJSON polygons for commune contours. Direct postal code lookup available.

**No installation needed:**
- Overpass API and geo.api.gouv.fr accessed via browser Fetch API
- sessionStorage for wizard state persistence (no library)
- PapaParse already installed (reuse for CSV export via Papa.unparse)

**Bundle impact:** +255KB minified (~78KB gzipped), keeping total app under 500KB.

### Expected Features

Research identifies clear table stakes versus differentiators for both wizard onboarding and zone export.

**Wizard Onboarding - Must have (table stakes):**
- Welcome screen with action prompt — 90% of onboarding sequences start with welcome, sets expectations
- Progress indicator (stepper) — Shows current step and what remains, reduces abandonment
- Step validation before advance — Prevents invalid data propagation, catches errors early
- Clear "Next" and "Back" navigation — Bidirectional flow expected in wizards
- Postal code → commune auto-lookup — Users expect quick data import, manual entry feels tedious
- Success confirmation at end — Reinforces trust, provides satisfying closure

**Wizard Onboarding - Should have (competitive):**
- CSV column auto-detection — Match "adresse"/"address" variants, reduce friction
- Sample CSV download link — Reduces support burden, users match format exactly
- Inline validation messages — Errors flagged instantly where they occur
- Drag-and-drop CSV upload — Modern file upload pattern, feels polished

**Zone Export - Must have (table stakes):**
- PDF export with zone name, assigned members, map visual, street list, building count — Door-to-door canvassing standard
- CSV export option — Alternative format for data manipulation
- Street list from OSM (alphabetical) — Without streets, export is just map image (not actionable)
- Export filename with zone name — Organizational convenience

**Zone Export - Should have (competitive):**
- Checkbox list format for printout — Makes PDF actionable for field workers
- Print-optimized layout (margins, A4) — Territory apps emphasize "high-quality visuals"
- Export all zones at once (batch) — Convenience for coordinator

**Defer to v2+:**
- Interactive PDF (form fields) — Complexity explosion, workers mark physical printouts anyway
- QR codes for tracking — Explicitly in v2 scope per roadmap
- Route optimization — Explicitly in v2 scope per roadmap
- Account creation / authentication — Violates LocalStorage-only constraint

### Architecture Approach

Integration follows additive pattern: extend existing services without breaking v1.0 architecture. Wizard implemented as native dialog element (consistent with zoneEditor.js), new export service handles PDF/CSV generation, and state management extends existing PubSub/LocalStorage pattern with versioned schema.

**Major components:**

1. **Wizard Component (src/ui/wizard.js)** — 3-step state machine using native dialog element. Handles postal code input, commune selection, and CSV import (reuses existing csvImport.js). Saves commune config to store on completion. Uses sessionStorage for step progress (tab-isolated).

2. **Export Service (src/services/export.js)** — Fetches street names from Overpass API, generates PDFs with jsPDF (map canvas + street tables), generates CSVs with PapaParse. Handles rate limiting, tile waiting, and download triggers.

3. **Storage Schema V1 (src/data/storage.js)** — Adds configVersion field and commune object to LocalStorage. Migration logic detects v1.0 data (no configVersion) and upgrades to v1.1 schema with backward compatibility. Namespace all keys with 'flyermap_' prefix to avoid conflicts.

4. **Commune Service Extension (src/data/commune.js)** — Adds searchCommunesByPostalCode() and handles multiple commune results. Existing fetchCommuneBoundary() reused.

5. **Overpass Service Extension (src/services/overpass.js)** — Adds getStreetNames(geojson) alongside existing countBuildingsDetailed(). Reuses endpoint fallback logic for rate limit handling.

**Data flow:** Main.js checks configVersion on load → show wizard if missing/incomplete → wizard saves commune config → main app loads with configured commune → zone editor triggers export → export service queries Overpass + generates PDF/CSV.

### Critical Pitfalls

Research identifies 17 pitfalls across wizard state, API integration, PDF generation, and French API dependencies. Top 5 critical risks require immediate attention.

1. **French Address API Deprecation (CRITICAL - Jan 2026)** — api-adresse.data.gouv.fr being deprecated end of January 2026. Implement multi-endpoint fallback (api-adresse primary, Nominatim fallback). Monitor data.gouv.fr for Geohub migration announcement. Affects existing geocoding, not commune lookup (geo.api.gouv.fr separate and stable).

2. **Overpass API Rate Limiting During Batch Export** — Sequential zone exports hit rate limits (HTTP 429). Implement 2-second delay between requests, exponential backoff on 429 responses, and fallback to overpass.kumi.systems endpoint. Critical for "Export All Zones" feature.

3. **Leaflet Map Tiles Not Loaded Before PDF Export** — Asynchronous tile loading causes blank PDFs if captured too early. Implement waitForTiles() function that counts loading tiles and listens for tileload events. Add 500ms buffer after last tile loads. Use loading indicator during wait.

4. **localStorage Quota Exceeded with Wizard State** — Wizard temporary data (commune GeoJSON, CSV preview) plus existing app data can exceed 5MB limit. Use sessionStorage for wizard state (not localStorage), implement quota checking before wizard completion, clear wizard data after successful completion.

5. **CORS Errors Blocking Map Tile Capture** — Canvas becomes "tainted" when loading cross-origin images without CORS headers. Set crossOrigin: 'anonymous' in Leaflet tile layer options. OpenStreetMap tiles support CORS but flag must be explicit. Without this, toDataURL() throws SecurityError.

**Secondary risks (address during development):**
- Postal code maps to multiple communes (needs selection UI)
- CSV validation failures (detect delimiter, validate columns)
- Overpass query timeout on large zones (increase timeout, use bbox filter)
- PDF low resolution for print (capture at 2x scale for 150-200 DPI)

## Implications for Roadmap

Research suggests 4 implementation phases based on dependencies and risk sequencing. Each phase delivers testable functionality while building toward complete feature set.

### Phase 1: Storage Schema & Wizard Foundation

**Rationale:** Foundation work enables all subsequent phases. Storage migration must happen first to avoid data corruption. Wizard state management patterns inform all UI work.

**Delivers:**
- LocalStorage schema v1 with configVersion and commune fields
- Migration logic for v1.0 → v1.1 upgrade
- Wizard dialog skeleton with 3-step state machine
- sessionStorage-based state persistence

**Addresses:**
- Pitfall 16 (storage key conflicts) — namespaced keys prevent data loss
- Pitfall 3 (quota exceeded) — quota monitoring before wizard saves
- Pitfall 1 (state loss on navigation) — sessionStorage restores wizard progress

**Avoids:** Building wizard UI before storage patterns defined, which leads to refactoring pain.

**Research flag:** SKIP research-phase (standard localStorage migration pattern, well-documented)

### Phase 2: Postal Code Lookup & Commune Selection

**Rationale:** Core wizard functionality depends on geo.api.gouv.fr integration. Postal code → commune mapping must handle multi-commune edge cases before CSV import step.

**Delivers:**
- Postal code validation (5-digit format, range check)
- geo.api.gouv.fr API integration for commune lookup
- Commune selection UI for multi-commune postal codes
- Commune boundary display on map preview

**Uses:**
- geo.api.gouv.fr /communes?codePostal={code} endpoint
- Leaflet GeoJSON layer for boundary rendering
- Existing commune.js service (extend with searchCommunesByPostalCode)

**Implements:**
- Wizard step 1: postal code entry
- Wizard step 1.5: commune selection (conditional)

**Addresses:**
- Pitfall 14 (postal code ambiguity) — selection UI for multiple communes
- Pitfall 15 (API rate limiting) — retry logic and caching

**Research flag:** SKIP research-phase (API documented, integration straightforward)

### Phase 3: CSV Import Integration

**Rationale:** Wizard final step reuses existing CSV import flow. Must validate compatibility between wizard CSV import and main app import to avoid Pitfall 17.

**Delivers:**
- CSV file upload with drag-and-drop
- Reuse existing csvImport.js for parsing and validation
- Column auto-detection (match "adresse"/"address" variants)
- Inline error messages for geocoding failures
- Wizard completion → save commune config + import colistiers

**Uses:**
- Existing PapaParse library
- Existing geocoding.js service
- sessionStorage for CSV preview (clear after completion)

**Implements:**
- Wizard step 3: CSV upload and validation
- Wizard success screen with "Open Map" redirect

**Addresses:**
- Pitfall 4 (CSV validation failures) — robust delimiter detection, column validation
- Pitfall 17 (import duplication) — reuse existing csvImport.js, no duplicate logic

**Research flag:** SKIP research-phase (leverages existing implementation)

### Phase 4: Overpass Street Extraction

**Rationale:** Export depends on street data from OSM. Overpass integration must handle rate limiting and timeouts before PDF generation begins. Test caching strategy to minimize API calls.

**Delivers:**
- Overpass QL query for streets within polygon
- getStreetNames(geojson) function in overpass.js
- Rate limit handling (2s delay, exponential backoff)
- Endpoint fallback (overpass.kumi.systems)
- Street name filtering (include named streets, exclude footways)

**Uses:**
- Overpass API /interpreter endpoint
- Existing overpass.js fallback pattern
- Browser Fetch API with POST body

**Implements:**
- Street data fetching for single zone
- Street deduplication and alphabetical sorting

**Addresses:**
- Pitfall 5 (rate limiting) — delay between requests, retry on 429
- Pitfall 6 (query timeout) — increase timeout to 90s, use bbox filter for large zones
- Pitfall 8 (incomplete names) — filter to named streets, provide fallback display

**Research flag:** NEEDS research-phase if Overpass queries fail in testing (query optimization, polygon complexity)

### Phase 5: PDF Export Implementation

**Rationale:** Most complex phase with multiple integration points (Leaflet canvas, jsPDF, Overpass data). Tile loading and CORS must work before release. High user visibility (printouts used in field).

**Delivers:**
- jsPDF integration with map canvas capture
- waitForTiles() function to ensure complete rendering
- Print-optimized layout (A4, margins, page breaks)
- Street list with checkbox format
- Zone metadata (name, assigned members, building count)
- CORS-enabled tile layer (crossOrigin: 'anonymous')

**Uses:**
- jsPDF 4.1.0 + jspdf-autotable 5.0.7
- Leaflet canvas toDataURL() for map image
- Street data from Phase 4

**Implements:**
- Export buttons in zone editor dialog
- PDF generation with map + street table
- Download trigger with sanitized filename

**Addresses:**
- Pitfall 9 (tiles not loaded) — waitForTiles() before canvas capture
- Pitfall 11 (CORS errors) — crossOrigin flag on tile layer
- Pitfall 10 (low resolution) — 2x scale capture for 150-200 DPI

**Research flag:** NEEDS research-phase if PDF quality issues arise (font embedding for French characters, image compression)

### Phase 6: CSV Export & Batch Operations

**Rationale:** CSV export simpler than PDF (reuse PapaParse), but batch export requires careful memory management and rate limiting. Polish phase that completes feature set.

**Delivers:**
- CSV export with Papa.unparse()
- UTF-8 BOM for Excel compatibility
- Batch export with progress indicator
- Memory cleanup between batch exports
- Export all zones feature (ZIP or sequential downloads)

**Uses:**
- Existing PapaParse library
- Street data from Phase 4
- Rate limit handling from Phase 4

**Implements:**
- CSV download trigger
- Batch export loop with delays
- Progress UI with "X of N zones exported"

**Addresses:**
- Pitfall 12 (memory issues) — clean up between exports, limit batch size
- Pitfall 5 (rate limiting) — 2s delay between batch requests

**Research flag:** SKIP research-phase (straightforward implementation)

### Phase Ordering Rationale

**Dependencies:**
- Phase 1 (Storage) must precede all others — changes schema foundation
- Phase 2 (Postal) depends on Phase 1 — uses new commune config storage
- Phase 3 (CSV) depends on Phase 1-2 — saves wizard completion state
- Phase 4 (Overpass) independent but precedes Phase 5-6 — provides street data
- Phase 5 (PDF) depends on Phase 4 — needs street lists for export
- Phase 6 (CSV Export) depends on Phase 4 — reuses street data infrastructure

**Validation opportunities:**
- Each phase delivers working functionality that can be tested
- Early phases establish patterns (state management, API integration) reused in later phases
- Wizard validation happens in Phase 3 before export complexity added
- Export infrastructure builds incrementally (Overpass → PDF → CSV)

**Risk mitigation:**
- Storage migration in Phase 1 avoids data corruption before users invest work
- Overpass rate limiting tested in Phase 4 before batch export in Phase 6
- CORS and tile loading verified in Phase 5 before CSV export reuses patterns
- sessionStorage strategy in Phase 1 prevents wizard state conflicts

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 4 (Overpass):** If queries timeout on large zones or rate limits hit unexpectedly, research query optimization (simplified geometry, bbox filters, area queries)
- **Phase 5 (PDF):** If jsPDF doesn't render French characters correctly (é, à, ç), research custom font embedding or alternative libraries

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Storage):** localStorage migration is well-documented pattern (Redux Persist, RxDB examples)
- **Phase 2 (Postal):** geo.api.gouv.fr API documented, commune selection is standard dropdown UI
- **Phase 3 (CSV):** Reuses existing csvImport.js, standard file upload patterns
- **Phase 6 (CSV Export):** PapaParse.unparse() well-documented, batch export is iteration pattern

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All libraries verified (npm, GitHub repos, official APIs). Versions current as of January 2026. Integration patterns tested against vanilla JS constraint. |
| Features | MEDIUM | Wizard patterns extrapolated from SaaS/productivity apps. Territory mapping patterns from field service and political campaign tools. FlyerMap use case is niche but similar. |
| Architecture | HIGH | Existing v1.0 codebase reviewed. Additive integration follows established patterns (dialog, PubSub, LocalStorage). No framework conflicts. |
| Pitfalls | MEDIUM | Overpass API and CORS issues verified via official docs and GitHub issues. Wizard state patterns from React sources adapted to vanilla JS. French API deprecation confirmed but new endpoint not announced yet. |

**Overall confidence:** HIGH

Research draws from official documentation (OpenStreetMap, geo.api.gouv.fr, jsPDF), verified npm packages with active maintenance, and existing codebase analysis. Feature patterns synthesized from multiple authoritative sources with domain expertise. Only uncertainty is around undocumented rate limits (geo.api.gouv.fr) and exact timeline for French Address API migration (Geohub announcement pending).

### Gaps to Address

**French Address API migration endpoint:** api-adresse.data.gouv.fr deprecation confirmed (end January 2026), but replacement Geohub endpoint not yet announced. Monitor https://www.data.gouv.fr/dataservices/ for updates. Implement Nominatim fallback as interim solution.

**Overpass API undocumented behavior:** Rate limits vary by server load. Public documentation lists ~10,000 requests/day maximum but cooldown times unpredictable. Test batch export with 10+ zones in production-like scenario to validate delay settings (currently 2s between requests).

**jsPDF French character rendering:** Default Helvetica font may not render accents correctly. Research recommends testing with real French text before committing to jsPDF. If issues arise, consider pdf-lib (supports Unicode fonts) or custom font embedding (adds bundle size).

**CSV column header variations:** Research identifies "adresse"/"address"/"Address" variants but may miss regional formats. Implement flexible matching algorithm (lowercase, trim whitespace) and provide clear error messages for unmapped columns.

**Mitigation strategy:** Each gap has research flag in corresponding phase. Conduct targeted research-phase investigation if implementation reveals issues. All gaps have fallback options (alternative APIs, libraries, or simplified features).

## Sources

### Primary (HIGH confidence)

**Stack Research:**
- [jsPDF GitHub Repository](https://github.com/parallax/jsPDF) — PDF generation library verification
- [jsPDF npm package](https://www.npmjs.com/package/jspdf) — Version 4.1.0 confirmed, weekly downloads
- [jspdf-autotable GitHub](https://github.com/simonbengtsson/jsPDF-AutoTable) — Table plugin documentation
- [Wizard-JS GitHub Repository](https://github.com/AdrianVillamayor/Wizard-JS) — Vanilla JS wizard verification
- [Overpass API Wiki](https://wiki.openstreetmap.org/wiki/Overpass_API) — Official OSM documentation
- [Overpass API Language Guide](https://wiki.openstreetmap.org/wiki/Overpass_API/Language_Guide) — Query syntax
- [API Découpage Administratif](https://geo.api.gouv.fr/decoupage-administratif/communes) — French government API

**Features Research:**
- [Onboarding Wizard Definition](https://userguiding.com/blog/what-is-an-onboarding-wizard-with-examples) — UX patterns
- [17 Best Onboarding Examples (2026)](https://whatfix.com/blog/user-onboarding-examples/) — Pattern compilation
- [NationBuilder Walk Sheets](https://support.nationbuilder.com/en/articles/2363270-campaign-cut-turf-and-print-walk-sheets) — Political campaign standards
- [Territory Management Software](https://www.espatial.com/territory-management) — Feature standards

**Architecture Research:**
- [Multi-Step Forms Vanilla JS](https://css-tricks.com/how-to-create-multi-step-forms-with-vanilla-javascript-and-css/) — Implementation patterns
- [jsPDF Complete Guide](https://pdfbolt.com/blog/generate-html-to-pdf-with-jspdf) — Integration examples
- [Papa Parse Documentation](https://www.papaparse.com/docs) — CSV parsing/generation

**Pitfalls Research:**
- [Overpass API Rate Limits](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html) — Official rate limit documentation
- [Overpass Performance Hints](https://dev.overpass-api.de/blog/performance_hints.html) — Query optimization
- [Leaflet-image CORS Issues](https://github.com/mapbox/leaflet-image/issues/82) — Canvas capture troubleshooting
- [BAN Address API Deprecation](https://www.data.gouv.fr/dataservices/api-adresse-base-adresse-nationale-ban) — Official deprecation notice

### Secondary (MEDIUM confidence)

**Stack:**
- [Top JS PDF Libraries Comparison](https://www.nutrient.io/blog/top-js-pdf-libraries/) — Library evaluation
- [10 Best Form Wizard Plugins](https://www.jqueryscript.net/blog/best-form-wizard.html) — Wizard library survey

**Features:**
- [Wizard UI Pattern Guide](https://www.eleken.co/blog-posts/wizard-ui-pattern-explained) — Design principles
- [Bulk Import UX](https://smart-interface-design-patterns.com/articles/bulk-ux/) — Validation patterns
- [Overpass Query Examples](https://gist.github.com/JamesChevalier/b861388d35476cee4fcc3626a60af60f) — Street query samples

**Pitfalls:**
- [State Management in Vanilla JS](https://medium.com/@chirag.dave/state-management-in-vanilla-js-2026-trends-f9baed7599de) — Persistence patterns
- [CSV Validation Guide](https://thelinuxcode.com/creating-an-html-file-input-that-accepts-csv-files-with-validation-preview-draganddrop-and-real-parsing/) — Upload UX
- [jsPDF Performance Discussion](https://www.servicenow.com/community/developer-forum/jspdf-is-taking-too-much-time-to-generate-pdf/m-p/1888613) — Memory optimization

### Tertiary (LOW confidence)

**Pitfalls:**
- [Never Use jsPDF Client-Side](https://elh.mx/jquery/never-use-jspdf-library-for-pdf-generation-in-client-side/) — Opinionated critique (conflicts with other sources recommending jsPDF for simple use cases)

---

*Research completed: 2026-02-05*
*Ready for roadmap: YES*
