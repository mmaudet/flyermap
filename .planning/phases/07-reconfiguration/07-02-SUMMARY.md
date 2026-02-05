---
phase: 07-reconfiguration
plan: 02
subsystem: ui
tags: [reconfigure, dialog, localStorage, wizard, state]

# Dependency graph
requires:
  - phase: 07-01
    provides: dialog HTML structure and reconfigure button
provides:
  - initReconfigure() function for button/dialog wiring
  - updateDataCounts() for dynamic count display
  - clearAllUserData() for localStorage clearing
affects: [07-03]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - dialog.showModal() for modal confirmation
    - dialog.returnValue for form result detection
    - storage.remove() for selective key clearing

key-files:
  created:
    - src/ui/reconfigure.js
  modified:
    - src/main.js

key-decisions:
  - "Reload page after data clear to trigger wizard (vs re-init modules)"
  - "Early return if DOM elements not found with console.error"
  - "Initialize reconfigure outside conditional to work in both flows"

patterns-established:
  - "Dialog close event with returnValue check for confirmation patterns"
  - "Separate helper functions for testability (updateDataCounts, clearAllUserData)"

# Metrics
duration: 2min
completed: 2026-02-05
---

# Phase 7 Plan 2: Reconfigure Dialog Behavior Summary

**Wired reconfigure button to dialog with data count updates and localStorage clearing on confirm**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-05
- **Completed:** 2026-02-05
- **Tasks:** 3
- **Files created:** 1
- **Files modified:** 1

## Accomplishments
- Created src/ui/reconfigure.js with initReconfigure(), updateDataCounts(), clearAllUserData()
- Integrated reconfigure initialization in main.js after other UI modules
- Button click opens dialog with current member/zone counts
- Cancel/ESC preserves data, Confirm clears localStorage and reloads to wizard

## Task Commits

Each task was committed atomically:

1. **Task 1: Create reconfigure module with dialog logic** - `2cdbaba` (feat)
2. **Task 2: Initialize reconfigure module in main.js** - `c0c8e1d` (feat)
3. **Task 3: Test reconfigure flow** - verification only, no code changes

## Files Created/Modified
- `src/ui/reconfigure.js` - New module with button/dialog wiring and data clearing
- `src/main.js` - Added import and initReconfigure() call

## Decisions Made
- Page reload after data clear: Simplest approach - reload triggers existing first-launch detection which shows wizard
- Early return on missing DOM: Defensive coding for cases where HTML structure changes
- Initialization placement: Outside wizard conditional so button works even during wizard flow

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Reconfigure flow fully functional for manual testing
- Ready for 07-03 (end-to-end integration testing if planned)
- Data clearing verified: removes both flyermap_commune and flyermap_data keys

---
*Phase: 07-reconfiguration*
*Completed: 2026-02-05*
