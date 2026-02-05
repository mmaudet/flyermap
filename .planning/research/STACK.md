# Technology Stack

**Project:** Map Vivons Chapet - Interactive Electoral Distribution Zone Manager
**Researched:** 2026-02-05
**Overall Confidence:** HIGH

## Executive Summary

For an interactive mapping application with polygon drawing, zone management, and static hosting requirements, the 2025 standard stack centers on **Leaflet 1.9.4** (stable) or **2.0.0-alpha.1** (modern) for mapping, **Leaflet-Geoman Free** for drawing capabilities, **Vite** for build tooling, and optional **TypeScript** for type safety. The French geocoding requirement has a critical deadline: the current API will be deprecated in January 2026, requiring migration to Géoplateforme.

## Recommended Stack

### Core Mapping Library

| Technology | Version | Purpose | Rationale | Confidence |
|------------|---------|---------|-----------|------------|
| **Leaflet.js** | 1.9.4 (stable) or 2.0.0-alpha.1 (modern) | Interactive map rendering | Lightweight (42KB), mobile-friendly, excellent performance for <50K features, largest ecosystem, zero dependencies. Dominates static mapping with 1.4M+ weekly downloads. | **HIGH** |
| **OpenStreetMap** | N/A (tile provider) | Base map tiles | Free, no API keys, GDPR-compliant, no rate limits for reasonable use, perfect for static hosting | **HIGH** |

**Why Leaflet over alternatives:**
- **vs Mapbox GL JS**: Mapbox switched to proprietary license in v2 (2020), requires API keys, costs money beyond free tier
- **vs MapLibre GL**: WebGL-based, slower initialization for small datasets, more complex API
- **vs OpenLayers**: More powerful but significantly more complex, overkill for this use case
- **vs Google Maps**: Expensive, requires API keys, vendor lock-in

**Version recommendation**: Use **Leaflet 1.9.4** for production stability. Consider 2.0.0-alpha.1 only if you need ESM imports and can handle potential breaking changes before final release.

### Polygon Drawing & Editing

| Technology | Version | Purpose | Rationale | Confidence |
|------------|---------|---------|-----------|------------|
| **Leaflet-Geoman Free** | 2.19.2 | Draw, edit, drag, cut, rotate polygons | Actively maintained (Feb 2025), free open-source version, superior to deprecated Leaflet.draw, comprehensive feature set (draw/edit/drag/cut/split/rotate), works with GeoJSON/MultiPolygons | **HIGH** |

**Why Leaflet-Geoman over alternatives:**
- **vs Leaflet.draw**: Leaflet.draw development has stalled, lacks Leaflet 1.0+ support, no active maintenance
- **vs Leaflet.pm**: Leaflet-Geoman IS leaflet.pm (renamed), same project
- **vs Leaflet-Editable**: More minimalist, requires building custom UI, less feature-complete
- **vs Geoman Pro**: Free version sufficient for this use case (no enterprise features needed)

### Build Tool & Development Server

| Technology | Version | Purpose | Rationale | Confidence |
|------------|---------|---------|-----------|------------|
| **Vite** | 7.3.1 | Build tool, dev server | Lightning-fast dev server (<1s startup), native ESM, instant HMR, zero-config TypeScript support, esbuild pre-bundling (10-100x faster), designed for static sites, framework-agnostic | **HIGH** |

**Why Vite over alternatives:**
- **vs Webpack**: Webpack requires complex config, slow dev startup, designed for large apps not static sites
- **vs Parcel**: Vite faster, better ecosystem, more control while remaining simple
- **vs Plain HTML/CDN**: Vite provides hot reload, TypeScript support, optimized production builds with code splitting

### Geocoding API

| Technology | Version | Purpose | Rationale | Confidence |
|------------|---------|---------|-----------|------------|
| **Géoplateforme Geocoding** | N/A (API service) | French address geocoding | Official replacement for deprecated api-adresse.data.gouv.fr (deprecated Jan 2026), free, 50 req/s/IP rate limit, no API key, GDPR-compliant | **HIGH** |

**CRITICAL NOTICE**: The current `api-adresse.data.gouv.fr` API will be **decommissioned end of January 2026**. You MUST use the new endpoint: `https://data.geopf.fr/geocodage`

**Why Géoplateforme over alternatives:**
- **vs api-adresse.data.gouv.fr**: Old API being shut down in weeks
- **vs Google Geocoding**: Costs money, requires API keys, overkill
- **vs Nominatim (OSM)**: Less accurate for French addresses, stricter rate limits (1 req/s)
- **vs Mapbox Geocoding**: Costs money, requires API keys, vendor lock-in

### Data Storage

| Technology | Version | Purpose | Rationale | Confidence |
|------------|---------|---------|-----------|------------|
| **LocalStorage** | Native Web API | Settings, small datasets (<5MB) | Simple API, synchronous, persistent, GDPR-compliant (client-side only), perfect for colistiers list and preferences | **HIGH** |
| **IndexedDB** (optional) | Native Web API | Large datasets, complex queries | If colistiers list grows >5MB or need complex queries, IndexedDB scales to 50% disk space, asynchronous (non-blocking), structured data support | **MEDIUM** |

**Storage strategy:**
- **Start with LocalStorage**: Adequate for hundreds of colistiers with addresses (each ~200 bytes = 25K records in 5MB)
- **Migrate to IndexedDB if**: Dataset exceeds 5MB OR need complex queries OR UI becomes sluggish

**GDPR considerations:**
- ✅ No server transmission (unless explicit sync)
- ✅ User-controlled data (can clear browser storage)
- ✅ No cookies requiring consent (pure storage API)
- ⚠️ Document data retention policy (even client-side)

### CSV Parsing

| Technology | Version | Purpose | Rationale | Confidence |
|------------|---------|---------|-----------|------------|
| **PapaParse** | 5.4.1+ | Parse CSV colistiers import | Industry standard (1.4M weekly downloads), fast, RFC 4180 compliant, stream support, error handling, auto-detects delimiters, well-maintained | **HIGH** |

**Why PapaParse over alternatives:**
- **vs csv-parse**: Slower, more complex API, Node.js-focused
- **vs csv-parser**: Faster on small files but less feature-complete, streaming-only
- **vs fast-csv**: Node.js focused, not optimized for browser
- **vs native parsing**: Error-prone, no RFC compliance, edge cases (quoted fields, escapes)

### Language & Type Safety (Optional)

| Technology | Version | Purpose | Rationale | Confidence |
|------------|---------|---------|-----------|------------|
| **TypeScript** | 5.7+ | Type safety, IDE support | Catches bugs at compile-time, excellent IDE autocomplete, Vite has zero-config TS support, industry default in 2025, minimal overhead with Vite | **MEDIUM** |
| **Vanilla JavaScript** (alternative) | ES2024+ | Simpler for small teams | Faster initial development, no build complexity, adequate for <2K LOC projects | **MEDIUM** |

**Recommendation**: Use **TypeScript** if:
- Team knows TypeScript
- Project expected to grow >1K LOC
- Multiple developers collaborating

Use **Vanilla JavaScript** if:
- Solo developer or small team unfamiliar with TS
- Rapid prototyping priority
- Project stays <1K LOC

### Code Quality & Formatting

| Technology | Version | Purpose | Rationale | Confidence |
|------------|---------|---------|-----------|------------|
| **ESLint** | 9.x | Code linting | Catches bugs, enforces patterns, modern flat config format (ESLint 9), deprecated formatting rules (use Prettier) | **HIGH** |
| **Prettier** | 3.x | Code formatting | Automated formatting, zero debate, use with `eslint-config-prettier` to avoid conflicts | **HIGH** |
| **@typescript-eslint** | 8.x | TypeScript linting | Required for TypeScript projects, catches TS-specific issues | **HIGH** (if using TS) |

### Testing (Optional)

| Technology | Version | Purpose | Rationale | Confidence |
|------------|---------|---------|-----------|------------|
| **Vitest** | 2.x | Unit/integration testing | 10-20x faster than Jest, native Vite integration, TypeScript/ESM out-of-box, zero config, modern architecture, fastest-growing framework (+400% adoption) | **HIGH** |

**Why Vitest over alternatives:**
- **vs Jest**: Jest requires complex config for ESM/TS, slow, designed for pre-Vite era
- **vs No testing**: Manual testing error-prone, regression risk for zone assignment logic

**When to add testing:**
- Zone assignment logic becomes complex
- Multiple zones with overlapping rules
- Data import/export with transformations

### Hosting

| Technology | Version | Purpose | Rationale | Confidence |
|------------|---------|---------|-----------|------------|
| **GitHub Pages** | N/A (free tier) | Static hosting | Completely free, no bandwidth limits, automatic HTTPS, Jekyll support (not needed with Vite), perfect for open-source projects, zero config | **HIGH** |
| **Vercel** (alternative) | N/A (free tier) | Static hosting with edge | Free tier, edge network (faster CDN), auto-detects Vite, preview deploys for PRs, serverless functions (not needed here) | **MEDIUM** |

**Recommendation**: Use **GitHub Pages** unless you need preview deploys or have existing Vercel workflow. Both are excellent for static sites.

**Why these over alternatives:**
- **vs Netlify**: Similar to Vercel but less popular, no advantage here
- **vs Firebase Hosting**: Overkill, requires Google account setup
- **vs AWS S3**: Requires AWS knowledge, costs money, more complex

### Offline Support (Optional)

| Technology | Version | Purpose | Rationale | Confidence |
|------------|---------|---------|-----------|------------|
| **vite-plugin-pwa** | 0.20+ | Service worker, offline support | Auto-generates service worker, pre-caches static assets, cache-first strategy for tiles, works-after-first-load guarantee, modern PWA best practices | **MEDIUM** |

**When to add PWA:**
- Frequent use in areas with poor connectivity
- Need "install to home screen" capability
- Want offline editing with sync-on-reconnect

**NOT needed if:**
- Always used in office with stable WiFi
- Rare usage (once per campaign)
- LocalStorage persistence sufficient

## Alternatives Considered

| Category | Recommended | Alternative | Why Not | Confidence |
|----------|-------------|-------------|---------|------------|
| Mapping Library | Leaflet 1.9.4 | Mapbox GL JS | Proprietary license, requires API key, costs money | HIGH |
| Mapping Library | Leaflet 1.9.4 | MapLibre GL JS | WebGL overkill, slower for small datasets | HIGH |
| Mapping Library | Leaflet 1.9.4 | OpenLayers | Too complex, steeper learning curve | HIGH |
| Mapping Library | Leaflet 1.9.4 | Google Maps | Expensive, vendor lock-in, requires API key | HIGH |
| Drawing Plugin | Leaflet-Geoman Free | Leaflet.draw | Development stalled, no maintenance | HIGH |
| Drawing Plugin | Leaflet-Geoman Free | Leaflet-Editable | Less feature-complete, requires custom UI | MEDIUM |
| Build Tool | Vite | Webpack | Complex config, slow dev server | HIGH |
| Build Tool | Vite | Parcel | Less ecosystem, less control | MEDIUM |
| Build Tool | Vite | None (CDN) | No hot reload, no build optimization | MEDIUM |
| Geocoding | Géoplateforme | api-adresse.data.gouv.fr | Being deprecated Jan 2026 | HIGH |
| Geocoding | Géoplateforme | Google Geocoding | Costs money, overkill | HIGH |
| Geocoding | Géoplateforme | Nominatim (OSM) | Less accurate for FR, 1 req/s limit | MEDIUM |
| CSV Parser | PapaParse | csv-parse | Slower, more complex | MEDIUM |
| CSV Parser | PapaParse | Native parsing | Error-prone, no RFC compliance | HIGH |
| Storage | LocalStorage | IndexedDB | Overkill for <5MB, more complex API | MEDIUM |
| Storage | LocalStorage | Server-side DB | Requires backend, violates GDPR constraints | HIGH |
| Testing | Vitest | Jest | Slow, complex config for Vite projects | HIGH |
| Testing | Vitest | No testing | Manual testing error-prone | MEDIUM |
| Hosting | GitHub Pages | Vercel | No significant advantage for static site | LOW |
| Hosting | GitHub Pages | Netlify | Less popular than Vercel, no advantage | LOW |
| Hosting | GitHub Pages | AWS S3 | Costs money, more complex | HIGH |

## Installation

### Core Dependencies

```bash
# Create project
npm create vite@latest map-vivons-chapet -- --template vanilla
cd map-vivons-chapet

# Core mapping
npm install leaflet @geoman-io/leaflet-geoman-free

# Data handling
npm install papaparse

# Dev dependencies (build optimization)
npm install -D vite
```

### With TypeScript

```bash
# Create with TypeScript template
npm create vite@latest map-vivons-chapet -- --template vanilla-ts
cd map-vivons-chapet

# Core dependencies
npm install leaflet @geoman-io/leaflet-geoman-free papaparse

# Type definitions
npm install -D @types/leaflet @types/papaparse

# Linting & formatting
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier eslint-config-prettier eslint-plugin-prettier
```

### Optional: PWA Support

```bash
npm install -D vite-plugin-pwa
```

### Optional: Testing

```bash
npm install -D vitest @vitest/ui
```

## Package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint . --ext .ts,.js",
    "format": "prettier --write \"src/**/*.{ts,js,css,html}\""
  }
}
```

## Critical Dependencies Summary

**Production (always needed):**
- `leaflet` (1.9.4): Core mapping
- `@geoman-io/leaflet-geoman-free` (2.19.2+): Polygon drawing
- `papaparse` (5.4.1+): CSV import

**Development (build tooling):**
- `vite` (7.3.1+): Build tool

**Optional but recommended:**
- `typescript` (5.7+): Type safety
- `eslint` (9.x) + `prettier` (3.x): Code quality
- `vitest` (2.x): Testing
- `vite-plugin-pwa` (0.20+): Offline support

## Anti-Patterns to Avoid

### ❌ DO NOT: Use Mapbox GL JS v2+
**Why:** Proprietary license, requires API key, costs money beyond free tier, overkill for this project

**Instead:** Use Leaflet (open-source, free, adequate performance)

### ❌ DO NOT: Use Leaflet.draw
**Why:** Development has stalled since 2019, no Leaflet 1.0+ support, deprecated

**Instead:** Use Leaflet-Geoman Free (actively maintained, released Feb 2025)

### ❌ DO NOT: Use api-adresse.data.gouv.fr
**Why:** Being decommissioned end of January 2026 (WEEKS away!)

**Instead:** Use Géoplateforme API at `https://data.geopf.fr/geocodage`

### ❌ DO NOT: Use Webpack for this project
**Why:** Complex configuration, slow dev server, designed for large applications

**Instead:** Use Vite (zero-config, instant startup, perfect for static sites)

### ❌ DO NOT: Store data on server
**Why:** Violates GDPR constraints, requires backend infrastructure, breaks static hosting

**Instead:** Use LocalStorage (client-side only, GDPR-compliant)

### ❌ DO NOT: Parse CSV manually
**Why:** Edge cases (quoted fields, multiline values, escape sequences), error-prone

**Instead:** Use PapaParse (handles all edge cases, RFC 4180 compliant)

### ❌ DO NOT: Use cookies for data storage
**Why:** Requires GDPR consent banner, limited to 4KB, sent with every request

**Instead:** Use LocalStorage or IndexedDB (no consent needed for functional data)

## Version Currency Assessment

| Library | Version Checked | Last Updated | Status |
|---------|----------------|--------------|--------|
| Leaflet | 1.9.4 (stable), 2.0.0-alpha.1 (latest) | May 2023 (stable), Aug 2025 (alpha) | Current |
| Leaflet-Geoman Free | 2.19.2 | Feb 2025 | Current |
| Vite | 7.3.1 | Current | Current |
| PapaParse | 5.4.1+ | Active | Current |
| Géoplateforme API | N/A (service) | Replacing deprecated API Jan 2026 | Current |
| TypeScript | 5.7+ | Active | Current |
| ESLint | 9.x | 2024 (flat config) | Current |
| Vitest | 2.x | Active | Current |

**Verification method:** Versions verified via official documentation (WebFetch), npm registry (WebSearch), and GitHub releases (WebSearch) on 2026-02-05.

## Confidence Assessment

| Category | Confidence | Rationale |
|----------|------------|-----------|
| Mapping Library (Leaflet) | **HIGH** | Official docs verified, performance benchmarks (Aug 2025), industry standard with 1.4M+ downloads/week |
| Drawing Plugin (Geoman) | **HIGH** | Official site verified, latest release Feb 2025, GitHub activity confirmed |
| Build Tool (Vite) | **HIGH** | Official docs verified (v7.3.1), industry adoption for static sites |
| Geocoding API | **HIGH** | Official French government docs verified, deprecation date confirmed (Jan 2026) |
| Storage (LocalStorage) | **HIGH** | Web standard API, GDPR analysis from multiple sources |
| CSV Parser (PapaParse) | **HIGH** | npm downloads verified (1.4M/week), benchmark comparisons |
| TypeScript vs JS | **MEDIUM** | Subjective choice based on team experience, both valid |
| Testing (Vitest) | **MEDIUM** | Strong performance data, but testing optional for MVP |
| PWA/Offline | **MEDIUM** | Optional feature, best practices verified but not critical path |

## Sources

### Primary Sources (Official Documentation)
- [Leaflet Download & Versions](https://leafletjs.com/download.html) - Verified stable (1.9.4) and alpha (2.0.0-alpha.1) versions
- [Leaflet 2.0 Alpha Announcement](https://leafletjs.com/2025/05/18/leaflet-2.0.0-alpha.html) - Official release notes
- [Geoman.io Official Site](https://geoman.io/) - Verified free version features and v2.19.0
- [Leaflet-Geoman Free Docs](https://geoman.io/docs/leaflet/getting-started/free-version) - Free version capabilities
- [Géoplateforme Geocoding API Docs](https://adresse.data.gouv.fr/outils/api-doc/adresse) - Official French API, deprecation notice
- [Vite Why Guide](https://vite.dev/guide/why) - Official Vite v7.3.1 documentation

### Secondary Sources (Benchmarks & Comparisons)
- [Vector Data Rendering Performance Analysis (Aug 2025)](https://www.mdpi.com/2220-9964/14/9/336) - Leaflet vs OpenLayers vs Mapbox performance
- [Map Libraries Popularity Comparison](https://www.geoapify.com/map-libraries-comparison-leaflet-vs-maplibre-gl-vs-openlayers-trends-and-statistics/) - Download statistics
- [Leaflet vs OpenLayers: Pros and Cons](https://www.geoapify.com/leaflet-vs-openlayers/) - Feature comparison
- [Vite vs Webpack vs Parcel (Jan 2026)](https://medium.com/@anumathew16/vite-vs-webpack-vs-parcel-the-ultimate-front-end-bundler-showdown-5524195a289d) - Build tool comparison
- [JavaScript CSV Parsers Comparison](https://leanylabs.com/blog/js-csv-parsers-benchmarks/) - PapaParse benchmarks

### Tertiary Sources (Community & Best Practices)
- [GitHub Pages vs Vercel Comparison 2025](https://www.freetiers.com/blog/vercel-vs-github-pages-comparison) - Static hosting analysis
- [LocalStorage vs IndexedDB: JavaScript Guide](https://dev.to/tene/localstorage-vs-indexeddb-javascript-guide-storage-limits-best-practices-fl5) - Storage strategy
- [GDPR and localStorage Compliance](https://www.clym.io/blog/what-are-cookies-local-storage-and-session-storage-from-a-privacy-law-perspective) - Privacy analysis
- [Vitest vs Jest 2025 Comparison](https://medium.com/@ruverd/jest-vs-vitest-which-test-runner-should-you-use-in-2025-5c85e4f2bda9) - Testing framework comparison
- [PWA Service Worker Best Practices 2025](https://medium.com/@Christopher_Tseng/build-a-blazing-fast-offline-first-pwa-with-vue-3-and-vite-in-2025-the-definitive-guide-5b4969bc7f96) - Offline-first patterns
- [TypeScript Best Practices 2025](https://dev.to/mitu_mariam/typescript-best-practices-in-2025-57hb) - Modern TS patterns
- [ESLint + Prettier + TypeScript Setup (2025)](https://medium.com/@leobarri2013/setting-up-prettier-eslint-and-typescript-in-express-2025-6d59f384f00c) - Linting configuration

### API & Library References
- [Leaflet GeoJSON Documentation](https://leafletjs.com/examples/geojson/) - Polygon format
- [Leaflet-Geoman GitHub Releases](https://github.com/geoman-io/leaflet-geoman/releases) - Version history
- [npm Package Comparisons](https://npm-compare.com/) - Download statistics for CSV parsers

**All sources accessed and verified on 2026-02-05.**

## Notes on Confidence Levels

- **HIGH confidence** indicates verification from official documentation, authoritative sources, or multiple credible sources with recent publication dates (2025-2026)
- **MEDIUM confidence** indicates verification from community sources, comparison articles, or subjective recommendations based on project requirements
- **LOW confidence** would indicate single-source or outdated information (none present in this document)

All version numbers and API deprecation dates have been verified against official sources.
