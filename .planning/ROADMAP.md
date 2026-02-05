# Roadmap: Vivons Chapet - Distribution Tracts

## Overview

Transform a list of volunteer addresses into an interactive zone management system. Start with a Leaflet map showing the commune boundaries, add geocoded team markers with import capability, build polygon drawing/editing for zone creation, and complete with assignment logic connecting volunteers to zones with visual feedback and data export.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Interactive map with commune boundaries
- [ ] **Phase 2: Team Management** - Geocoded team markers with persistence
- [ ] **Phase 3: Zone Creation** - Polygon drawing and editing
- [ ] **Phase 4: Assignment System** - Connect team to zones with export

## Phase Details

### Phase 1: Foundation
**Goal**: Interactive map displays Chapet commune with geographic context
**Depends on**: Nothing (first phase)
**Requirements**: MAP-01, MAP-02, MAP-03
**Success Criteria** (what must be TRUE):
  1. User can see an interactive map centered on Chapet (78130) with zoom and pan controls
  2. Chapet commune boundary displays as a visible polygon on the map
  3. Street names are visible on the map tiles for orientation
**Plans**: TBD

Plans:
- [ ] TBD (planned during phase planning)

### Phase 2: Team Management
**Goal**: Team members appear on map with persistent storage
**Depends on**: Phase 1
**Requirements**: TEAM-01, TEAM-02, TEAM-03, TEAM-04, DATA-01
**Success Criteria** (what must be TRUE):
  1. User can import team members from CSV file and see them geocoded on the map
  2. Each team member displays as a colored marker on the map
  3. User can click a marker to see team member details (name, address, phone)
  4. User can view the complete team list in a side panel with color coding
  5. Team member data persists across browser sessions via LocalStorage
**Plans**: TBD

Plans:
- [ ] TBD (planned during phase planning)

### Phase 3: Zone Creation
**Goal**: User can draw and edit distribution zones on the map
**Depends on**: Phase 2
**Requirements**: ZONE-01, ZONE-02, ZONE-03, ZONE-04
**Success Criteria** (what must be TRUE):
  1. User can draw polygon zones on the map by clicking vertices
  2. User can edit existing zones (move vertices, adjust shape)
  3. User can delete zones from the map
  4. User can name each zone (e.g., "Zone Nord", "Quartier Gare")
  5. Zones persist across sessions
**Plans**: TBD

Plans:
- [ ] TBD (planned during phase planning)

### Phase 4: Assignment System
**Goal**: Team members are assigned to zones with visual feedback and data export
**Depends on**: Phase 3
**Requirements**: ASGN-01, ASGN-02, ASGN-03, ASGN-04, DATA-02, DATA-03
**Success Criteria** (what must be TRUE):
  1. User can assign one or more team members to each zone
  2. Zone polygon color changes to match assigned team member's color
  3. User can click a zone to open an editing panel (name, assignment, notes)
  4. User can record estimated mailbox count for each zone
  5. User can export all data (team, zones, assignments) to JSON file
  6. User can import previously saved JSON to restore complete state
**Plans**: TBD

Plans:
- [ ] TBD (planned during phase planning)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/TBD | Not started | - |
| 2. Team Management | 0/TBD | Not started | - |
| 3. Zone Creation | 0/TBD | Not started | - |
| 4. Assignment System | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-05*
*Depth: quick (4 phases)*
*Coverage: 18/18 requirements mapped*
