# Feature Landscape

**Domain:** Interactive zone management mapping for political campaigns
**Researched:** 2026-02-05
**Confidence:** MEDIUM (verified with multiple web sources, domain-specific examples available)

## Executive Summary

Interactive zone management mapping applications sit at the intersection of web mapping, territory management, and campaign coordination. Research reveals three distinct feature tiers:
1. **Table stakes**: Core mapping interactions without which the application feels broken
2. **Differentiators**: Features that transform a map viewer into a campaign management tool
3. **Anti-features**: Over-engineered capabilities that add complexity without value for single-user scenarios

For a campaign coordinator managing team member distribution zones in a French commune, the feature set should prioritize immediate usability over enterprise complexity.

## Table Stakes

Features users expect. Missing = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Interactive basemap display** | Users cannot orient themselves without a recognizable map | Low | Map library (Leaflet/OpenLayers) + tile provider | French commune requires French-specific tile source (IGN, OSM France) |
| **Zoom and pan controls** | Essential navigation for any web map | Low | Built into map libraries | Both mouse/touch and +/- buttons expected |
| **Marker display** | Team member locations must be visible on map | Low | Map library markers API | Need to distinguish between assigned/unassigned |
| **Polygon drawing** | Core requirement for defining zones | Medium | Drawing library/plugin | Click-to-add-vertex, double-click-to-close pattern is standard |
| **Polygon editing** | Users make mistakes and need corrections | Medium | Drawing library edit mode | Drag vertices, add/remove points, delete entire polygon |
| **Save work** | Losing work destroys trust in the tool | Medium | Storage mechanism (localStorage, file download, or backend) | Single user suggests localStorage + file export sufficient |
| **Load work** | Cannot continue work without loading saved state | Medium | Same as Save | Must handle both localStorage restore and file import |
| **Visual zone boundaries** | Users must see what they drew | Low | Polygon rendering with stroke/fill | Colors distinguish zones; labels identify them |
| **Marker-to-zone assignment** | Core business logic: which team member covers which zone | Medium | Geospatial calculation (point-in-polygon) | Basis for proximity assignment |

### Rationale

These features define the minimum viable product. Without interactive navigation, users cannot explore the commune. Without drawing and editing, users cannot create zones. Without save/load, the tool is a toy. Without assignment logic, it doesn't solve the core problem.

**Sources:** Based on analysis of territory mapping software patterns ([Maptive](https://www.maptive.com/15-best-sales-territory-mapping-software/), [Knockbase](https://www.knockbase.com/features/territory-mapping-software)), web mapping essentials ([FME Web Mapping 101](https://fme.safe.com/blog/2025/11/web-mapping-101-how-to-create-dynamic-web-maps/)), and Leaflet/OpenLayers core feature sets ([Geoapify comparison](https://www.geoapify.com/leaflet-vs-openlayers/)).

## Differentiators

Features that set this product apart. Not expected, but valuable for the campaign use case.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Auto-assignment by proximity** | Automates tedious manual work: assign team members to nearest zone | Medium | Distance calculation (haversine or planar), algorithm to find nearest zone | Major time-saver for coordinator |
| **Zone metadata** | Rich information beyond geometry: zone name, priority, notes, assignment status | Low | Data model extension | Enables better organization and planning |
| **Visual assignment status** | Color-coding shows at-a-glance which zones are covered vs unassigned | Low | Conditional rendering based on zone state | Reduces cognitive load |
| **Export to shareable format** | Generate GeoJSON or KML for sharing with external tools | Low | JSON serialization | Interoperability with other campaign tools |
| **Import existing data** | Load address lists or existing territory data | Medium | CSV/JSON parsing, geocoding (if addresses) | Kickstarts setup instead of manual entry |
| **Undo/Redo** | Recover from mistakes without full reload | Medium | State history management | Significantly improves UX confidence |
| **Search/filter markers** | Find specific team member by name or attributes | Low | Text matching on marker metadata | Useful as team size grows beyond ~10 |
| **Zone statistics** | Show area, perimeter, number of assigned members | Medium | Geometric calculations | Helps balance zone sizes |
| **Mobile-friendly interface** | Coordinator can work from phone or tablet | Medium | Responsive design, touch interactions | Campaign work happens in the field |
| **Offline capability** | Continue working when internet is spotty | High | Service worker, IndexedDB, sync logic | French communes may have connectivity gaps |

### Rationale

Auto-assignment by proximity is the killer feature—it transforms hours of manual work into seconds. Zone metadata and visual status differentiate a planning tool from a drawing tool. Export enables integration with the broader campaign ecosystem. Undo/redo is expected in modern apps but surprisingly rare in mapping tools.

Mobile-friendly and offline are marked as differentiators (not table stakes) because research shows most territory management tools are desktop-first, but campaign coordinators work in the field.

**Sources:** Political campaign software patterns ([Maptive Political Campaigns](https://www.maptive.com/mapping-software-for-political-campaigns/), [Campaign Knock](https://campaignknock.com/), [Qomon](https://qomon.com/solutions/political-campaign)), territory management best practices ([KnockBase Territory Management](https://www.knockbase.com/blog/how-canvassing-software-simplifies-territory-management-for-sales-teams)), and canvassing software features ([Ecanvasser](https://www.ecanvasser.com/blog/political-canvassing-techniques)).

## Anti-Features

Features to explicitly NOT build. Common in enterprise territory management but wrong for this context.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Real-time multi-user collaboration** | Single user scenario; adds massive complexity (conflict resolution, presence, locking) | Simple save/load with file sharing if needed |
| **Route optimization** | This is zone assignment, not turn-by-turn navigation | Focus on zone boundaries; let team members use their own navigation apps |
| **AI-powered zone balancing** | Overkill for small team; coordinator knows context algorithms don't | Manual drawing with helpful visual feedback (e.g., zone area statistics) |
| **Advanced GIS analysis** | Not a GIS platform; coordinator needs simple tools | Stick to point-in-polygon and distance calculations |
| **User accounts and authentication** | Single user doesn't need to log in | Browser storage is sufficient |
| **Historical version tracking** | Adds database complexity without clear value | Single "current" state with export for snapshots |
| **Mobile app (native)** | Responsive web app sufficient; native app is 3x the work | Progressive Web App (PWA) if offline is needed |
| **Integration with CRM/databases** | Small campaign likely has ad-hoc data, not structured systems | CSV import/export is enough |
| **Automated territory rebalancing** | Assumes turnover and dynamic reassignment; campaign is more stable | Manual adjustment is fine |
| **Complex permission system** | Single coordinator doesn't need role-based access | No permissions needed |

### Rationale

The enterprise territory management research reveals heavy investment in multi-user, automation, and integration features. These make sense for sales teams with 50+ reps and high churn. For a single campaign coordinator managing a stable team of 5-15 volunteers in one commune, this complexity is waste.

The temptation will be to build "room to grow," but growth that doesn't happen is technical debt. Start simple; features can be added if the tool succeeds and scope expands.

**Sources:** Analysis of enterprise features in territory management software ([Maptive Sales Territory](https://www.maptive.com/15-best-sales-territory-mapping-software/), [SalesMotion](https://salesmotion.io/blog/sales-territory-mapping-software), [SaaSCounter](https://www.saascounter.com/territory-management-software)) contrasted with campaign coordinator workflow and single-user project scope.

## Feature Dependencies

```
Core Map Display
    ├─> Marker Display
    │       ├─> Search/Filter Markers
    │       └─> Visual Assignment Status
    │
    ├─> Polygon Drawing
    │       ├─> Polygon Editing
    │       ├─> Zone Metadata
    │       ├─> Zone Statistics
    │       └─> Visual Zone Boundaries
    │
    └─> Zoom/Pan Controls

Save/Load System
    ├─> Export (extends Save)
    └─> Import (extends Load)

Marker-to-Zone Assignment
    ├─> Requires: Markers + Polygons
    └─> Enables: Auto-assignment by Proximity

Undo/Redo
    └─> Requires: State management for all drawing operations
```

**Critical path for MVP:** Core Map Display → Marker Display → Polygon Drawing → Polygon Editing → Save/Load → Marker-to-Zone Assignment

**Can be deferred:** Undo/Redo, Search/Filter, Zone Statistics, Import, Offline

## Complexity Analysis

### Low Complexity (1-2 days)
- Interactive basemap display
- Zoom/pan controls
- Marker display
- Visual zone boundaries
- Zone metadata (data model)
- Visual assignment status
- Export to GeoJSON
- Search/filter markers

### Medium Complexity (3-5 days)
- Polygon drawing
- Polygon editing
- Save to localStorage
- Load from localStorage + file
- Marker-to-zone assignment logic
- Auto-assignment by proximity
- Import existing data
- Undo/redo
- Zone statistics
- Mobile-friendly responsive design

### High Complexity (1-2 weeks)
- Offline capability (service workers, sync, IndexedDB)
- Advanced geocoding (if addresses need conversion)
- Complex polygon operations (merge, split, buffer)

## MVP Recommendation

For MVP (Minimum Viable Product), prioritize this sequence:

### Phase 1: Core Interaction (Week 1)
1. Interactive basemap with French commune view (IGN or OSM tiles)
2. Marker display for team member locations
3. Zoom/pan controls
4. Polygon drawing (basic click-to-create)
5. Visual zone boundaries

**Exit criteria:** Can view map, place markers, draw zones, see what was drawn

### Phase 2: Persistence (Week 1)
6. Save work (localStorage + JSON download)
7. Load work (localStorage restore + file upload)
8. Zone metadata (name, notes)

**Exit criteria:** Work persists across sessions; can share work via file

### Phase 3: Assignment Logic (Week 2)
9. Polygon editing (move vertices, delete)
10. Marker-to-zone assignment (manual: click marker → select zone)
11. Visual assignment status (color-coded zones)
12. Auto-assignment by proximity

**Exit criteria:** Can assign team members to zones; coordinator saves hours

### Phase 4: Polish (Week 2)
13. Undo/redo
14. Search markers
15. Zone statistics (area, member count)
16. Export to shareable format (KML or enhanced GeoJSON)

**Exit criteria:** Tool feels professional and prevents frustration

### Defer to Post-MVP
- Import CSV/JSON (can be added when user has data to import)
- Offline capability (add if field testing reveals connectivity issues)
- Mobile optimization (start desktop-first, add responsive if coordinator uses tablet/phone)
- Advanced zone operations (merge, split—rarely needed in practice)

## Competitive Context

**Existing tools coordinators might use:**
- Google My Maps: Free, familiar, but weak on zone assignment logic
- Scribble Maps: Drawing-focused, missing campaign-specific features
- Desktop GIS (QGIS): Powerful but overkill and steep learning curve
- Excel + manual work: Current state for many small campaigns

**Our differentiation:** Purpose-built for campaign zone assignment with auto-proximity and immediate usability. Simpler than GIS, smarter than drawing tools, faster than spreadsheets.

## User Stories (Implied by Features)

1. **As a campaign coordinator, I want to** see a map of my commune **so that** I can visualize the geographic area
2. **As a campaign coordinator, I want to** place markers for team member addresses **so that** I know where my team lives
3. **As a campaign coordinator, I want to** draw zones on the map **so that** I can divide the commune into coverage areas
4. **As a campaign coordinator, I want to** assign team members to zones **so that** everyone knows their responsibility
5. **As a campaign coordinator, I want to** automatically assign based on proximity **so that** I don't waste time on manual placement
6. **As a campaign coordinator, I want to** save my work **so that** I can continue later
7. **As a campaign coordinator, I want to** export my zones **so that** I can share with the team
8. **As a campaign coordinator, I want to** edit zones **so that** I can fix mistakes or adjust boundaries
9. **As a campaign coordinator, I want to** see which zones are covered **so that** I know what still needs assignment

## Technology Implications

Based on feature requirements:

**Map library choice:**
- **Leaflet**: Recommended. Simpler API, lighter weight, sufficient for all table stakes + differentiators
- **OpenLayers**: Overkill. Needed only if advanced GIS features required (we explicitly avoid these)

**Drawing library:**
- Leaflet.draw (or leaflet-geoman): Mature plugins with polygon draw/edit
- Note: Google Maps Drawing Library deprecated (August 2025, removed May 2026)—avoid Google Maps Platform

**Storage:**
- localStorage: Sufficient for MVP (5-10MB limit is ample for coordinate data)
- File export: JSON (GeoJSON format) for sharing and backups
- Backend database: Not needed unless multi-user or sharing requirements emerge

**Data format:**
- GeoJSON: Standard, interoperable, human-readable, supported by all map libraries
- Avoid proprietary formats

**Geocoding:**
- If needed (address → coordinates): Use free tier of Nominatim or French IGN API
- For MVP: Coordinator can place markers manually on map (click to place)

## Research Confidence

| Area | Confidence | Notes |
|------|------------|-------|
| Table stakes features | HIGH | Consistent across all mapping apps; well-documented in Leaflet/OpenLayers |
| Differentiators | MEDIUM | Based on campaign software research; assumptions about coordinator workflow |
| Anti-features | MEDIUM | Inferred from enterprise features that don't fit single-user scope |
| Complexity estimates | MEDIUM | Based on experience; could vary by developer skill |

## Open Questions

1. **Marker data source:** Do team member addresses already exist in structured form (CSV, spreadsheet), or will coordinator enter them manually on the map?
   - *Impact:* Determines priority of import feature and whether geocoding is needed

2. **Sharing model:** Does coordinator need to share read-only maps with team members, or just export zones for reference?
   - *Impact:* If sharing needed, might require hosted solution (not just local files)

3. **Zone complexity:** How many zones are typical? How complex are boundaries (simple circles vs irregular polygons)?
   - *Impact:* Affects UI design for zone list and drawing tool choices

4. **Update frequency:** Is this a "set up once" tool or iterative (frequent zone adjustments)?
   - *Impact:* If frequent, undo/redo and versioning become more valuable

5. **Team size:** 5 people? 50 people?
   - *Impact:* Affects need for search/filter and whether marker clustering is needed

These questions should be validated with the actual campaign coordinator user during requirements definition.

## Sources

### Territory Management & Campaign Software
- [Maptive: 15 Best Sales Territory Mapping Software for 2026](https://www.maptive.com/15-best-sales-territory-mapping-software/)
- [Monday.com: Best Sales Mapping Software Tools 2026](https://monday.com/blog/crm-and-sales/sales-mapping-software/)
- [SalesMotion: Top 12 Sales Territory Mapping Software Tools for 2026](https://salesmotion.io/blog/sales-territory-mapping-software)
- [KnockBase: Effortless Territory Management with Canvassing Software](https://www.knockbase.com/blog/how-canvassing-software-simplifies-territory-management-for-sales-teams)
- [KnockBase: Territory Mapping Software Features](https://www.knockbase.com/features/territory-mapping-software)
- [Campaign Knock: Political Canvassing App](https://campaignknock.com/)
- [CallHub: Complete Canvassing Guide 2026](https://callhub.io/blog/canvassing/canvassing/)
- [Maptive: Mapping Software for Political Campaigns](https://www.maptive.com/mapping-software-for-political-campaigns/)
- [KnockBase: Political Canvassing Software](https://www.knockbase.com/political-canvassing-software)
- [Qomon: Political Campaign Software](https://qomon.com/solutions/political-campaign)

### Web Mapping Core Features
- [FME: Web Mapping 101 - How to Create Dynamic Web Maps](https://fme.safe.com/blog/2025/11/web-mapping-101-how-to-create-dynamic-web-maps/)
- [Maptive: Online Mapping Tools & Features](https://www.maptive.com/features/)
- [Shorthand: 10 Tools to Create Interactive Maps](https://shorthand.com/the-craft/tools-to-create-interactive-maps/index.html)

### Mapping Libraries
- [Geoapify: Leaflet vs OpenLayers Comparison](https://www.geoapify.com/leaflet-vs-openlayers/)
- [Leaflet Official Site](https://leafletjs.com/)
- [OpenLayers Official Site](https://openlayers.org/)
- [LogRocket: 5 JavaScript Mapping APIs Compared](https://blog.logrocket.com/javascript-mapping-apis-compared/)
- [LogRocket: Leaflet Adoption Guide](https://blog.logrocket.com/leaflet-adoption-guide/)

### Drawing & GeoJSON
- [Google Developers: Drawing Polygons (note: Drawing Library deprecated)](https://developers.google.com/maps/documentation/javascript/shapes)
- [Spatialized: Drawing on Google Maps](https://spatialized.io/insights/google-maps/interactivity-and-events/drawing)
- [geojson.io: Web-Based GeoJSON Editor](https://geojson.io/)
- [Leaflet: Using GeoJSON](https://leafletjs.com/examples/geojson/)
- [Google Developers: Data Layer (GeoJSON)](https://developers.google.com/maps/documentation/javascript/datalayer)

### Marker Clustering & Proximity
- [Google Developers: Marker Clustering](https://developers.google.com/maps/documentation/javascript/marker-clustering)
- [Google Maps Platform Blog: How to Cluster Map Markers](https://mapsplatform.google.com/resources/blog/how-cluster-map-markers/)

### Common Pitfalls
- [LinkedIn: Common Pitfalls and Best Practices for Web Mapping](https://www.linkedin.com/advice/1/what-some-common-pitfalls-best-practices-web-mapping)
- [Digital Initiatives: Top Mapping Mistakes](https://gcdi.commons.gc.cuny.edu/2021/05/12/top-mapping-mistakes/)
- [MDPI: Web Map Effectiveness in Responsive UI Context](https://www.mdpi.com/2220-9964/10/3/134)

### Fleet & Zone Management Examples
- [Volvo Buses: Save Time with Upgraded Map Tool 2026](https://www.volvobuses.com/gr/news-stories/volvo-connect-news/2026/jan/save-time-with-the-upgraded-map-tool.html)
