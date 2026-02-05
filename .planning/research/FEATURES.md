# Features Research: v1.1 Wizard Onboarding + Zone Export

**Domain:** Territory mapping app for political campaign flyer distribution
**Research Date:** 2026-02-05
**Focus:** NEW features for v1.1 (wizard onboarding + zone export)
**Confidence:** MEDIUM (WebSearch verified with domain patterns)

## Summary

This research examines expected UX patterns for two feature categories being added to FlyerMap v1.1:

1. **Wizard Onboarding** - First-launch experience to configure commune location and import team data
2. **Zone Export** - Print/digital distribution of zone assignments with street lists

Research synthesizes patterns from:
- Onboarding wizard best practices (SaaS/productivity apps)
- Territory mapping software (field service, sales, canvassing)
- Political campaign tools (door-to-door canvassing, walk sheets)
- Address/location picker patterns
- CSV import/validation workflows

**Key finding:** Users expect wizards to be 3-5 steps max with clear progress indicators, and zone exports to include both printable maps AND structured data (street lists, assignments).

---

## Wizard Onboarding

### Table Stakes

Features users expect for first-launch setup. Missing these = app feels incomplete.

| Feature | Why Essential | Complexity |
|---------|---------------|------------|
| **Welcome screen with action prompt** | 90% of onboarding sequences start with welcome message. Sets expectations and tone. Users need clear entry point. | Low |
| **Progress indicator (stepper)** | Shows where user is (current step) and what remains. Reduces anxiety, increases completion rates. | Low |
| **Step validation before advance** | Prevents users from proceeding with invalid data. Catches errors early. Standard pattern for multi-step forms. | Medium |
| **Clear "Next" and "Back" navigation** | Users expect bidirectional flow in wizards. Back button lets them fix mistakes without starting over. | Low |
| **Auto-detection/suggestion where possible** | Postal code → commune lookup expected. Manual entry feels tedious. Territory apps emphasize "quick data import" and "rapid time-to-value". | Medium |
| **Skip/Cancel option visible** | Users need escape hatch. Reduces perceived commitment. Standard accessibility pattern. | Low |
| **Success confirmation at end** | Wizard ends with result summary. Reinforces trust, provides satisfying closure. | Low |

### Differentiators

Features that would make it better than basic implementation.

| Feature | Competitive Advantage | Complexity | Notes |
|---------|----------------------|------------|-------|
| **Postal code field with instant commune preview** | Territory mapping apps show "see results quickly". Reduce TtFV (time to first value) by showing map preview before CSV import. | Medium | Preview map boundary as soon as commune confirmed |
| **CSV column auto-detection** | Bulk import UX best practice: auto-match CSV headers to expected fields. Reduce user friction. | Medium | Detect "adresse", "nom", "telephone" variants |
| **Sample CSV download link** | Reduces support burden. Users can match format exactly. | Low | Provide example with French headers |
| **"Use browser location" shortcut** | ZIP code auto-detection performs well in testing. Saves typing for users in target commune. | Low | Optional convenience feature |
| **Drag-and-drop CSV upload** | Modern file upload pattern. Feels more polished than file picker only. | Low | Fallback to file picker for accessibility |
| **Inline validation messages** | Errors flagged instantly in row/column where they occur. Standard for import UX. Increases confidence. | Medium | Show "3 addresses couldn't be geocoded" with list |
| **Progress persistence across refreshes** | If wizard interrupted, resume at current step. Modern SaaS pattern (Airtable, etc.). | Medium | Use LocalStorage for wizard state |

### Anti-Features

Things to deliberately NOT build for simplicity and scope control.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Multi-page welcome tour with tooltips** | Best product tours = 3-5 tooltips max. More feels like hassle. App is simple enough to not need tour. | Single welcome screen, then straight to wizard |
| **Account creation / authentication** | Violates RGPD-local-only constraint. Adds complexity. Not needed for single-user coordinator tool. | Keep LocalStorage-only approach |
| **Commune search with autocomplete** | Postal code is simpler and unambiguous. Search adds complexity (multiple communes with same name). | Postal code → commune lookup only |
| **Personalization / AI-driven flows** | Overkill for 4-step wizard with single use case. Current AI trend but not applicable here. | Fixed linear flow is cleaner |
| **Save draft / partial setup** | Wizard should complete in 2-3 minutes. If user abandons, starting over is fine. | Focus on completion speed instead |
| **Wizard as modal overlay** | Users need full screen for map preview and CSV upload. Modal feels cramped. | Dedicated wizard page, then redirect to main app |
| **Animated transitions between steps** | Nice-to-have polish, but not table stakes. Can feel slow. | Instant step transitions are fine |

---

## Zone Export

### Table Stakes

Features users expect for zone export/print functionality.

| Feature | Why Expected | Complexity |
|---------|--------------|------------|
| **PDF export option** | Door-to-door canvassing standard. Field workers need printable walk sheets. "Print walk sheets for door-to-door canvassing" is explicit feature in campaign tools. | High |
| **Zone name + assignment visible** | Core purpose = know who covers which zone. Must be prominent on export. | Low |
| **Street list included** | Territory maps for field service include street lists. Political campaign "walk sheets" list streets. Without streets, export is just a map image (not actionable). | Medium-High |
| **Assigned team member(s) contact info** | Field workers need to know who else is in their zone or contact coordinator. Standard in territory management. | Low |
| **Map visual of zone boundary** | Users expect visual + data. Map shows spatial context (where zone is relative to landmarks). | Medium |
| **Export per zone** | Standard pattern: "Export territory assignments" generates per-territory files. Users distribute sheets to assigned workers. | Medium |
| **CSV export option** | Alternative format for data manipulation. Field service apps provide "export to CSV" for integration with other systems. | Medium |

### Differentiators

Features that would make it better than basic implementation.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Street list from OpenStreetMap** | Accurate, free, always current. Overpass API allows extracting streets within polygon boundary. Better than manual street entry. | High | Use Overpass API query: ways within area |
| **Checkbox list format for tracking** | Makes printout actionable. Workers can check off streets as they complete distribution. Common in door-to-door sales apps. | Low | Add checkbox column to street list |
| **Building count estimate visible** | v1.0 already has this feature. Export should include it so workers know expected volume. Helps with time estimation. | Low | Already calculated, just display |
| **Export all zones at once (batch)** | Convenience for coordinator. Generate all walk sheets in one click vs per-zone clicks. | Medium | ZIP file with PDFs or single multi-page PDF |
| **Zone map with neighboring zones visible** | Spatial context. Worker knows if they're near other zones, can coordinate with neighbors. | Medium | Show zone highlighted + adjacent zones faded |
| **Export filename with zone name** | Organizational convenience. "Zone-Centre-Ville.pdf" vs "export-1.pdf". | Low | Sanitize zone name for filesystem |
| **Print-optimized layout** | Margins, page breaks, readability. Territory mapping apps export "high-quality visuals for stakeholder presentations". | Medium | CSS print styles, A4 portrait orientation |

### Anti-Features

Things to deliberately NOT build for v1.1.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Interactive PDF (form fields)** | Complexity explosion (PDF generation libraries with forms). Workers will mark up physical printouts anyway. | Static PDF with checkbox graphics |
| **QR code for mobile tracking** | Out of scope for v1.1. This is v2 "suivi distribution" feature. Requires backend for check-ins. | Defer to future milestone |
| **Route optimization within zone** | "Optimisation automatique de répartition" explicitly in v2 scope. Complex algorithm, not needed for MVP export. | List streets alphabetically, let worker decide route |
| **Photos/satellite view in export** | Increases file size significantly. OSM base map is sufficient. Not standard in walk sheet exports. | Stick to OSM tile rendering |
| **Per-worker custom exports** | FlyerMap is coordinator tool, not worker tool. Coordinator generates and distributes exports. | Export by zone only, coordinator distributes |
| **Email delivery from app** | No backend, LocalStorage only. Coordinator will email/print manually. | Download files, coordinator handles distribution |
| **Historical export archive** | Not needed for campaign use case. Workers get current assignment, past versions irrelevant. | Single-point-in-time export |
| **Multi-language exports** | Campaign is local French commune. No internationalization needed for v1.1. | French-only export labels |

---

## Feature Dependencies

**Wizard Flow:**
```
Welcome Screen
    ↓
Postal Code Entry → Commune Confirmation
    ↓
CSV Upload → Column Mapping → Validation
    ↓
Generate Map → Success Screen
```

**Export Flow:**
```
Select Zone(s)
    ↓
Fetch OSM Streets (Overpass API)
    ↓
Generate Layout (map + street list + assignment)
    ↓
Export Format Choice (PDF / CSV)
    ↓
Download File
```

**Dependencies on Existing Features:**
- Wizard depends on: commune boundary API (v1.0), geocoding API (v1.0), CSV parsing (v1.0)
- Export depends on: zone polygons (v1.0), assignments (v1.0), building estimates (v1.0)
- Export adds: OSM Overpass API integration, PDF generation library, CSV export logic

---

## MVP Recommendation for v1.1

### Wizard Onboarding - Include in v1.1:

**Must-have (table stakes):**
1. Welcome screen with "Get Started" CTA
2. 4-step wizard: Postal Code → Confirm Commune → Upload CSV → View Map
3. Progress indicator (1/4, 2/4, 3/4, 4/4)
4. Postal code validation with commune lookup
5. CSV upload with drag-and-drop
6. Basic validation (required columns, geocoding errors)
7. Success screen with "Open Map" button

**Nice-to-have (differentiators for polish):**
- Postal code field shows commune preview on blur
- Sample CSV download link
- CSV column auto-detection (match "adresse"/"address"/"Address" variants)
- Inline error messages for geocoding failures

**Defer to post-v1.1:**
- Progress persistence across refreshes (not critical for 3-minute wizard)
- Browser geolocation shortcut
- Advanced CSV column mapping UI

### Zone Export - Include in v1.1:

**Must-have (table stakes):**
1. "Export Zone" button on zone detail panel
2. PDF format with:
   - Zone name (large, top)
   - Assigned team member(s) with phone numbers
   - Map showing zone boundary
   - Street list from OSM (alphabetical, with checkboxes)
   - Building count estimate
3. CSV format with: zone name, assigned members, street names
4. Export filename includes zone name

**Nice-to-have (differentiators for polish):**
- "Export All Zones" button (generates ZIP or multi-page PDF)
- Print-optimized CSS (margins, page breaks)
- Neighboring zones visible (faded) on map

**Defer to post-v1.1:**
- Interactive PDF forms
- QR codes for tracking
- Route optimization
- Email delivery

---

## Implementation Notes

### Wizard State Management

Store wizard progress in LocalStorage to handle:
- User closes tab mid-wizard → resume on return
- Step validation state (which steps completed)
- Temporary commune selection before final confirmation

Clear wizard state once setup complete and redirect to main app.

### OSM Street Extraction

**Overpass API Query Pattern:**
```
[out:json];
area["name"="CommuneName"]["admin_level"="8"]->.commune;
way(area.commune)[highway][name];
out body;
```

**Considerations:**
- Overpass API has rate limits (check timestamp_areas_base)
- Cache results per zone to avoid repeated queries
- Handle unnamed streets (exclude or show as "Rue sans nom")
- Filter highway types (exclude motorways, include residential/tertiary)

### PDF Generation Library Options

Research needed in implementation phase, but common approaches:
- **jsPDF** - Client-side, works with LocalStorage-only constraint
- **Puppeteer** (backend) - Better rendering, but violates no-backend constraint
- **Browser print CSS + Save as PDF** - Simplest, relies on browser print dialog

For v1.1 MVP, browser print CSS is likely sufficient (no library dependency).

### CSV Export Format

```csv
Zone,Assigned Members,Street Name,Building Count
"Centre-Ville","Jean Dupont (06 12 34 56 78), Marie Martin (06 98 76 54 32)","Rue de la République",12
"Centre-Ville","Jean Dupont (06 12 34 56 78), Marie Martin (06 98 76 54 32)","Avenue du Général de Gaulle",8
```

One row per street, zone and members repeated.

---

## Sources

### Onboarding Wizards
- [Onboarding Wizard Definition and Examples](https://userguiding.com/blog/what-is-an-onboarding-wizard-with-examples) - UserGuiding best practices
- [17 Best Onboarding Flow Examples (2026)](https://whatfix.com/blog/user-onboarding-examples/) - Whatfix pattern compilation
- [Wizard UI Pattern Guide](https://www.eleken.co/blog-posts/wizard-ui-pattern-explained) - When to use wizards, design principles
- [Progress Trackers and Indicators](https://userguiding.com/blog/progress-trackers-and-indicators) - Progress UI patterns
- [Multi-Step Form Best Practices (2025)](https://www.webstacks.com/blog/multi-step-form) - Form wizard completion rates

### Territory Mapping & Field Service
- [Territory Management Software Guide](https://www.espatial.com/territory-management) - eSpatial feature standards
- [Dynamics 365 Field Service Territories](https://learn.microsoft.com/en-us/dynamics365/field-service/set-up-territories) - Microsoft territory patterns
- [Best Sales Mapping Software (2026)](https://monday.com/blog/crm-and-sales/sales-mapping-software/) - Monday.com territory features
- [Top Territory Mapping Software (2026)](https://salesmotion.io/blog/sales-territory-mapping-software) - Salesmotion territory management

### Political Campaign Tools
- [NationBuilder: Cut Turf and Print Walk Sheets](https://support.nationbuilder.com/en/articles/2363270-campaign-cut-turf-and-print-walk-sheets) - Walk sheet standard format
- [Knockbase Door-to-Door Canvassing Software](https://www.knockbase.com/) - Territory assignment and mobile features
- [Political Campaign Mapping (Maptive)](https://www.maptive.com/mapping-software-for-political-campaigns/) - Campaign territory patterns
- [Best Political Campaign Software (2026)](https://research.com/software/best-political-campaign-software) - Feature comparison

### CSV Import & Validation
- [Best UI Patterns for File Uploads](https://blog.csvbox.io/file-upload-patterns/) - CSVBox upload UX
- [How to Design Bulk Import UX](https://smart-interface-design-patterns.com/articles/bulk-ux/) - Smart Interface Design validation patterns
- [5 Common Data Import Errors](https://dromo.io/blog/common-data-import-errors-and-how-to-fix-them) - Dromo error handling
- [CSV Geocoding Best Practices](https://support.esri.com/en-us/knowledge-base/faq-what-are-some-best-practices-for-geocoding-addresse-000021393) - ESRI geocoding workflow

### Location Picker & Postal Code UX
- [Checkout UX: Zip Code Auto-detection](https://baymard.com/blog/zip-code-auto-detection) - Baymard postal code patterns
- [Postcode Lookup UX Requirements](https://econsultancy.com/seven-important-ux-requirements-for-online-postcode-validation/) - Econsultancy validation best practices
- [Address Field Design Best Practices](https://uxplanet.org/address-field-design-best-practices-a80390caaee0) - UX Planet address forms

### OpenStreetMap Integration
- [Overpass API by Example](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_API_by_Example) - OSM query patterns
- [Overpass API Language Guide](https://wiki.openstreetmap.org/wiki/Overpass_API/Language_Guide) - Official OSM documentation
- [Extract Streets from Polygon (OSM Help)](https://help.openstreetmap.org/questions/85980/how-to-get-all-nodes-and-streets-of-any-polygon-with-a-known-user-current-location) - OSM community solutions
- [Overpass Query for Street Names](https://gist.github.com/JamesChevalier/b861388d35476cee4fcc3626a60af60f) - GitHub Gist example

---

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Wizard UX patterns | HIGH | Multiple authoritative sources (UserGuiding, NN/G, Material UI) agree on standards |
| Territory export features | MEDIUM | Extrapolated from field service and political campaign tools, but FlyerMap use case is niche |
| CSV validation patterns | HIGH | Well-documented in bulk import literature (CSVBox, Smart Interface Design) |
| OSM street extraction | MEDIUM | OSM community examples exist, but implementation complexity varies |
| PDF generation approach | LOW | Needs phase-specific research to evaluate library options within constraints |

---

## Next Steps for Requirements Definition

1. **Specify exact wizard step flow** - Detail each screen (inputs, validation, messaging)
2. **Define CSV column requirements** - Which fields required vs optional, header variants to detect
3. **Research PDF generation libraries** - Evaluate options compatible with LocalStorage-only constraint
4. **Design export layout** - Mockup for print format (A4 dimensions, margins, font sizes)
5. **Define OSM query specifics** - Which highway types to include, how to handle unnamed streets
6. **Plan error handling** - What happens when OSM API unavailable, geocoding fails, CSV invalid
