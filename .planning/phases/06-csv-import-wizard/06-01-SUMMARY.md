---
phase: 06-csv-import-wizard
plan: 01
subsystem: ui
tags: [wizard-js, csv, html]

# Dependency graph
requires:
  - phase: 05-wizard-foundation
    provides: Wizard-JS setup with 3-step flow
provides:
  - 7-step wizard HTML structure for full onboarding flow
  - CSV template file for colistiers import
affects: [06-02, 06-03]

# Tech tracking
tech-stack:
  added: []
  patterns: [multi-step wizard extension, downloadable templates]

key-files:
  created:
    - public/templates/colistiers-template.csv
  modified:
    - index.html

key-decisions:
  - "Renamed Step 3 from 'Confirmation' to 'Apercu' to avoid conflict with final step"
  - "Template CSV uses French column names (nom, adresse, telephone) with French/English alternatives documented"

patterns-established:
  - "Wizard steps follow naming pattern: informational title in data-wz-title"
  - "Template files go in public/templates/ directory"

# Metrics
duration: 1min
completed: 2026-02-05
---

# Phase 6 Plan 1: Wizard HTML Steps and CSV Template Summary

**Extended wizard from 3 to 7 steps with CSV import flow structure and downloadable template file**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-05T12:07:41Z
- **Completed:** 2026-02-05T12:08:55Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Extended wizard HTML structure to 7 steps (was 3)
- Created CSV format explanation step with column documentation
- Created file upload step with drop zone and input fallback
- Created validation results and geocoding progress steps
- Created downloadable CSV template with realistic French example data

## Task Commits

Each task was committed atomically:

1. **Task 1: Add 4 CSV import steps to wizard HTML** - `759054c` (feat)
2. **Task 2: Create CSV template file** - `6b703e8` (feat)

**Plan metadata:** (to be committed)

## Files Created/Modified

- `index.html` - Added 4 new wizard-step divs (Steps 4-7) for CSV import flow
- `public/templates/colistiers-template.csv` - Downloadable CSV template with header and 3 example rows

## Decisions Made

- **Renamed Step 3 title:** Changed from "Confirmation" to "Apercu" to distinguish commune preview from final import confirmation
- **French column names:** Template uses nom/adresse/telephone (not name/address/phone) as primary, matching French UI

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- HTML structure ready for JavaScript implementation
- Template file served correctly from /templates/colistiers-template.csv
- Ready for Plan 06-02: File upload and validation with error display

---
*Phase: 06-csv-import-wizard*
*Completed: 2026-02-05*
