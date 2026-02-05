---
phase: 04-assignment-system
plan: 01
type: execute
subsystem: ui-interaction
completed: 2026-02-05
duration: 2.9 min

tags:
  - dialog
  - form
  - assignment
  - persistence

dependency-graph:
  requires:
    - 03-01 # Zone creation foundation
    - 02-01 # Store infrastructure with PubSub
    - 02-02 # Team member data
  provides:
    - Zone editor dialog UI
    - Team assignment to zones
    - Zone metadata (mailbox count, notes)
    - Multi-select team assignment
  affects:
    - 04-02 # May enhance editor with advanced features
    - 04-03 # Assignment data feeds into zone visualization

tech-stack:
  added:
    - Native HTML dialog element
    - FormData API
    - Multi-select input
  patterns:
    - Modal dialog pattern
    - Event-driven form submission
    - Dataset for temporary storage

key-files:
  created:
    - src/ui/zoneEditor.js
    - test-zone-editor.html
  modified:
    - index.html
    - src/map/zoneLayer.js
    - src/main.js
    - src/style.css

decisions:
  - decision: Use native dialog element
    rationale: Modern, accessible, no library needed
    impact: Clean modal behavior with ::backdrop styling

  - decision: FormData API for form collection
    rationale: Standard browser API for form data extraction
    impact: Simple form handling without manual DOM traversal

  - decision: L.DomEvent.stopPropagation on zone clicks
    rationale: Prevent map events from interfering with dialog opening
    impact: Zone clicks don't trigger Geoman edit mode or map pan

  - decision: Store team member IDs in assignedMembers array
    rationale: Normalized data - team member details stored once
    impact: Easy to update team member info without touching zones

  - decision: Bind click events to both restored and new zones
    rationale: Comprehensive editor access for all zones
    impact: Click-to-edit works consistently regardless of zone source

---

# Phase 4 Plan 01: Zone Assignment System Summary

**One-liner:** Click-to-edit zone dialog with multi-select team assignment, mailbox counting, and notes

## What Was Built

Created a modal dialog system that allows users to click any zone polygon to open an editing interface. The dialog provides:

1. **Zone metadata editing**: Name, mailbox count, and notes fields
2. **Team assignment**: Multi-select dropdown populated from store's team members
3. **Persistence**: All data saves to localStorage via store.updateZone
4. **Native HTML dialog**: Using modern `<dialog>` element with form method="dialog"

## Implementation Details

### Dialog Component (`src/ui/zoneEditor.js`)

**Exports:**
- `initZoneEditor()`: Initializes dialog, sets up form submit handler
- `openZoneEditor(zone)`: Populates form from zone data, shows modal

**Key features:**
- Form submit handler checks `returnValue` to distinguish Save vs Cancel
- Multi-select population with pre-selection of assigned members
- FormData API for clean form data collection
- Dataset storage of zoneId for submit reference

### Zone Click Wiring (`src/map/zoneLayer.js`)

Added click handlers in two locations:
1. **loadZonesFromStore()**: Restored zones from localStorage
2. **pm:create handler**: Newly drawn zones

Both handlers:
- Use `L.DomEvent.stopPropagation(e)` to prevent map event conflicts
- Fetch fresh zone data from store before opening editor
- Call `openZoneEditor(zone)` to show dialog

**Bug fix applied (deviation Rule 1):** Added missing `pm:update` handler to newly created zones. Without this, editing a newly drawn zone's geometry wouldn't save to store until page refresh.

### Styling (`src/style.css`)

Dialog styling provides:
- Semi-transparent backdrop (rgba(0, 0, 0, 0.5))
- Centered modal with rounded corners and shadow
- Full-width form inputs with focus states
- Multi-select sized at 150px min-height for visibility
- Button row with flexbox layout and gap

### Test Harness (`test-zone-editor.html`)

Comprehensive manual test document with:
- Step-by-step verification instructions
- Console commands for localStorage inspection
- Test checklist with 11 verification points
- Edge case scenarios (cancel, empty fields, multiple zones)

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| d0b6de6 | feat | Add zone editor dialog component |
| 21b4b4c | feat | Wire zone click to open editor dialog |
| a7d3a9e | test | Add zone editor verification test harness |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Missing pm:update handler on newly created zones**

- **Found during:** Task 2 (wiring zone clicks)
- **Issue:** Newly created zones could be clicked to open editor, but editing their geometry wouldn't trigger store updates. Only restored zones from localStorage had the pm:update handler bound.
- **Fix:** Added pm:update handler binding in the pm:create event handler, matching the pattern used in loadZonesFromStore()
- **Files modified:** src/map/zoneLayer.js
- **Commit:** 21b4b4c (included in Task 2 commit)
- **Impact:** Now all zones (new and restored) properly save geometry edits

## Technical Decisions

### Why Native Dialog Element?

Modern browsers (2022+) support `<dialog>` natively. Benefits:
- No JavaScript required for backdrop
- Semantic HTML for accessibility
- Built-in focus trapping
- method="dialog" gives automatic form closure

Alternative was a custom modal div, which requires more JavaScript for proper accessibility and backdrop handling.

### Why FormData API?

Instead of manually querying each input by ID:
```javascript
// Instead of this:
const name = document.getElementById('zone-name').value;
const mailboxCount = document.getElementById('mailbox-count').value;
// ...

// We use:
const formData = new FormData(form);
const name = formData.get('name');
```

Cleaner, less brittle (survives ID changes), and standard.

### Why Store Team Member IDs Instead of Full Objects?

Zone's `assignedMembers` array stores IDs like `["abc123", "def456"]`, not full member objects.

**Rationale:** Team member details (name, address, lat/lng) are stored once in `state.teamMembers`. Zones reference by ID. If a team member's address gets geocoded to a new location, or their name spelling is corrected, zones don't need updating.

**Trade-off:** Requires a join operation (lookup by ID) when displaying assigned member details. But this is cheap and worth the normalization benefit.

## Next Phase Readiness

### What's Ready

- Zone editing UI is functional and accessible
- Assignment data structure is in place
- Persistence layer handles all fields correctly
- Multi-select pattern works for team assignment

### What's Not Ready

No blockers for Phase 4 continuation.

### Recommendations for Next Plans

1. **Visual assignment feedback (04-02?)**: Show team member markers or initials inside zones they're assigned to
2. **Assignment validation**: Warn if a team member is assigned to overlapping zones
3. **Zone statistics**: Display total mailboxes, coverage percentage, members per zone
4. **Bulk operations**: Select multiple zones, assign same team, etc.

### Known Issues

None identified during execution.

## Testing Notes

Manual testing steps documented in `test-zone-editor.html`. Key verification points:

1. **Dialog opening**: Click zone -> dialog appears
2. **Form population**: Fields show current zone data
3. **Multi-select**: Ctrl/Cmd+click assigns multiple members
4. **Persistence**: Refresh page -> data still present
5. **Cancel behavior**: Changes discarded when clicking Annuler

**Suggested test data:**
- Import CSV with 5+ team members
- Create 2-3 zones
- Assign different members to each
- Add varied mailbox counts (50, 150, 200)
- Refresh and verify

## Performance Notes

- Dialog initialization is synchronous and fast
- Form population requires iterating team members (O(n) where n = team size)
- For typical team sizes (10-50 members), this is imperceptible
- Multi-select rendering is native browser behavior, performant

## Lessons Learned

1. **Event binding on zone creation matters**: Need to bind all interactive events (click, pm:update) when zones are created, not just when loaded from storage

2. **L.DomEvent.stopPropagation is critical**: Without it, zone clicks can trigger Geoman edit mode or conflict with map pan/zoom gestures

3. **Dialog returnValue pattern**: The method="dialog" + button value pattern is elegant for distinguishing Save vs Cancel without additional state management

4. **FormData API simplicity**: Using FormData reduces boilerplate and makes form handling more maintainable

---

**Phase 4, Plan 01 completed:** 2026-02-05
**Execution time:** 2.9 minutes
**Status:** All tasks complete, verification passed
