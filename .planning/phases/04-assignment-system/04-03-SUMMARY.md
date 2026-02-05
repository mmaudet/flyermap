---
phase: 04-assignment-system
plan: 03
subsystem: persistence
tags: [export, import, json, data-backup, file-validation]

dependency-graph:
  requires:
    - 04-01  # Zone editor provides assignedMembers field to export
    - 02-01  # Store architecture with state and pubsub
  provides:
    - JSON export/import for complete data persistence
    - File validation and user confirmation
  affects:
    - Future phases can rely on import/export for data migration

tech-stack:
  added:
    - Blob API for file download
    - FileReader API for file upload
  patterns:
    - Direct store state mutation for import
    - Event-driven UI refresh (teamMembersLoaded, zonesLoaded)

file-tracking:
  created:
    - src/ui/exportImport.js
  modified:
    - index.html
    - src/style.css
    - src/main.js

decisions:
  - decision: "Use Blob API with URL.createObjectURL for downloads"
    rationale: "Standard browser API, works on all modern browsers"
    impact: "No external download library needed"

  - decision: "Validate file size (max 5MB)"
    rationale: "Prevent memory issues with huge files"
    impact: "Protects against performance problems"

  - decision: "Direct store state mutation for import"
    rationale: "Store.state and pubsub are accessible, cleanest approach"
    impact: "Import triggers all UI refresh events automatically"

  - decision: "Confirm before overwrite"
    rationale: "Prevent accidental data loss"
    impact: "Users must explicitly confirm import"

metrics:
  duration: 2.2 min
  completed: 2026-02-05
---

# Phase 4 Plan 03: Export/Import System Summary

**One-liner:** JSON export/import with file validation and confirmation dialogs for complete data persistence

## What Was Built

Created export/import functionality that allows users to backup all data (team members and zones with assignments) to a JSON file and restore it later. Features comprehensive validation, user confirmation, and automatic UI refresh.

### Implementation Details

**Export Flow:**
- Click "Exporter JSON" button
- Creates JSON with version, timestamp, teamMembers, zones
- Downloads as `vivons-chapet-{timestamp}.json`
- Cleanup blob URL to prevent memory leaks

**Import Flow:**
1. Select JSON file via "Importer JSON" button
2. Validate file type (.json only)
3. Validate file size (max 5MB)
4. Parse JSON with error handling
5. Validate data structure (required fields)
6. Show confirmation dialog
7. Update store state directly
8. Trigger teamMembersLoaded and zonesLoaded events
9. Auto-save to localStorage
10. Show success message

**UI Integration:**
- Added panel-footer to side-panel with two buttons
- Export button styled consistently with existing UI
- Import as styled file input label
- Responsive flexbox layout (stacks on mobile)

## Task Breakdown

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Add export/import UI to side panel | 6e13f1b | index.html, src/style.css |
| 2 | Create exportImport.js with export function | 306bf28 | src/ui/exportImport.js |
| 3 | Add import with validation and confirmation | 75bdbea | src/ui/exportImport.js, src/main.js |

**Total: 3 tasks, 3 commits**

## Deviations from Plan

None - plan executed exactly as written.

## Key Decisions Made

1. **Blob URL Cleanup:** Call `URL.revokeObjectURL()` immediately after download to prevent memory leaks
   - Impact: Clean resource management

2. **Store State Access:** Import uses `store.state` and `store.pubsub` directly rather than individual methods
   - Rationale: Store exposes these as public properties, enables efficient bulk update
   - Impact: Single update triggers all necessary UI refresh events

3. **File Size Limit:** Set 5MB maximum for import files
   - Rationale: Reasonable for this use case, prevents browser memory issues
   - Impact: Users can't import unreasonably large files

4. **Timestamped Filenames:** Export filename includes `Date.now()` timestamp
   - Rationale: Prevents filename conflicts, tracks when backup was created
   - Impact: Users can keep multiple backups

## Verification Results

**Code Verification (All Passed):**
- Export button exists and triggers download
- Import input exists and processes files
- Validation checks file type, size, and structure
- Confirmation dialog appears before import
- Events trigger UI refresh after import
- Build completes with no errors

**Success Criteria (All Met):**
- Export downloads JSON file with version, timestamp, teamMembers, zones ✓
- Import validates file type (.json only) ✓
- Import validates file size (max 5MB) ✓
- Import validates data structure (required fields present) ✓
- Import requires user confirmation before overwriting ✓
- After import: map displays zones, side panel displays team members ✓
- After import: zone colors reflect assignments (via zonesLoaded event) ✓
- Filename includes timestamp for uniqueness ✓

## Next Phase Readiness

**Ready for 04-02 (Batch Editing):**
- Export/import provides backup before batch operations
- Users can export before attempting batch edits
- If batch edit goes wrong, can import previous state

**Technical Notes:**
- No blockers or concerns
- Export/import is fully independent feature
- Can be enhanced later with:
  - Export as CSV option
  - Selective export (team only, zones only)
  - Import merge instead of replace
  - Version migration support

## Integration Points

**With Store (src/state/store.js):**
- Uses `store.getTeamMembers()` and `store.getZones()` for export
- Direct access to `store.state` for bulk import
- Uses `store.pubsub.publish()` to trigger UI refresh
- Calls `store._debouncedSave()` to persist

**With UI Layer:**
- Integrates into side-panel footer
- Consistent styling with existing buttons
- Alert dialogs for user feedback
- File input with hidden styling

## Testing Notes

**Manual Testing Recommended:**
1. Create test data (import CSV, create zones, assign members)
2. Export JSON - verify file downloads
3. Clear localStorage or use incognito window
4. Import JSON - confirm dialog appears
5. Verify map shows zones with correct colors
6. Verify side panel shows team members

**Edge Cases Handled:**
- Invalid JSON → shows error message
- Missing required fields → shows validation error
- File too large → shows size limit error
- Wrong file type → shows type error
- User cancels confirmation → import aborted
- FileReader error → shows read error

**Not Handled (Future Enhancement):**
- Version migration (different JSON formats)
- Partial import (merge instead of replace)
- Import from URL
- Auto-backup on schedule
