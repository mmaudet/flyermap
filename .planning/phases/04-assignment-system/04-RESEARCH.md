# Phase 4: Assignment System - Research

**Researched:** 2026-02-05
**Domain:** Zone assignment UI, data export/import, dynamic polygon styling
**Confidence:** HIGH

## Summary

Phase 4 implements zone assignment functionality where team members are assigned to zones with visual feedback through polygon color changes, an editing panel for zone properties, and JSON export/import for data persistence. The research focused on five core areas: assignment UI patterns, dynamic Leaflet polygon styling, modal/panel UI implementation, and browser-based file export/import.

The standard approach uses native HTML `<dialog>` elements for modal editing panels, Leaflet's `setStyle()` method for dynamic polygon color updates, and the Blob API with `URL.createObjectURL()` for file downloads. For imports, the FileReader API with proper validation handles JSON file uploads. The existing PubSub state management pattern extends naturally to assignment operations.

Team member assignments follow a many-to-one pattern (multiple team members can be assigned to a single zone), requiring multi-select UI components. Zone color visualization maps the first assigned team member's color to the polygon's border and fill, with the existing color palette from `markerStyles.js` providing consistency.

**Primary recommendation:** Use native `<dialog>` element with `showModal()` for zone editing panel, Leaflet's style functions for dynamic coloring based on zone.assignedMembers property, and defensive validation for all JSON import operations.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Leaflet | 1.9.x | Dynamic polygon styling | Built-in setStyle() method, style functions, click events |
| Native `<dialog>` | HTML5 | Modal editing panel | Browser-native, accessibility built-in, Esc key handling |
| Blob API | Browser API | File download | Standard browser API for creating downloadable files |
| FileReader API | Browser API | File upload/import | Standard async file reading with validation support |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Ajv | 8.x | JSON schema validation | Optional: For strict data validation on import |
| URL API | Browser API | Object URL creation | Always: For blob URL lifecycle management |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `<dialog>` | Custom modal div | Lose accessibility, keyboard handling, focus management |
| Blob API | Data URLs | Size limitations, memory inefficiency for large exports |
| FileReader | Direct JSON.parse | No file validation, poor error handling |

**Installation:**
```bash
# No additional packages required - all browser APIs
# Optional: Add JSON schema validation
npm install ajv
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── ui/
│   ├── sidePanel.js          # Existing team list
│   ├── zoneEditor.js         # NEW: Zone editing dialog
│   └── exportImport.js       # NEW: File operations
├── map/
│   ├── zoneLayer.js          # EXTEND: Add click handlers, dynamic styling
│   └── markerStyles.js       # EXTEND: Export color mapping function
├── state/
│   └── store.js              # EXTEND: Add updateZone with assignment field
└── data/
    ├── storage.js            # Existing localStorage
    └── validator.js          # NEW: JSON import validation
```

### Pattern 1: Zone Click to Edit Panel
**What:** Click event on polygon opens modal dialog with zone properties
**When to use:** Any time zone needs editing (assignment, name, mailbox count)
**Example:**
```javascript
// Source: Leaflet docs + MDN dialog element
layer.on('click', (e) => {
  const zoneId = e.target.options.zoneId;
  const zone = store.getZones().find(z => z.id === zoneId);
  openZoneEditor(zone);
});

function openZoneEditor(zone) {
  const dialog = document.getElementById('zone-editor');

  // Populate form fields
  document.getElementById('zone-name').value = zone.name;
  document.getElementById('mailbox-count').value = zone.mailboxCount || '';

  // Store zone ID for save operation
  dialog.dataset.zoneId = zone.id;

  // Open as modal
  dialog.showModal();
}
```

### Pattern 2: Dynamic Polygon Styling Based on Assignment
**What:** Polygon color changes when team members are assigned
**When to use:** After assignment changes, on zone load
**Example:**
```javascript
// Source: Leaflet GeoJSON documentation
function updateZoneStyle(zoneId, assignedMembers) {
  const layer = layersByZoneId.get(zoneId);

  if (assignedMembers && assignedMembers.length > 0) {
    // Use first assigned member's color
    const memberIndex = store.getTeamMembers()
      .findIndex(m => m.id === assignedMembers[0]);
    const color = getTeamMemberColor(memberIndex);

    layer.setStyle({
      color: color,
      fillColor: color,
      fillOpacity: 0.2
    });
  } else {
    // Unassigned zone - red
    layer.setStyle({
      color: '#ef4444',
      fillColor: '#fca5a5',
      fillOpacity: 0.2
    });
  }
}
```

### Pattern 3: JSON Export with Blob Download
**What:** Create downloadable JSON file from application state
**When to use:** User clicks "Export" button
**Example:**
```javascript
// Source: MDN Blob API, URL.createObjectURL
function exportData() {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    teamMembers: store.getTeamMembers(),
    zones: store.getZones()
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `vivons-chapet-${Date.now()}.json`;
  a.click();

  // Clean up
  URL.revokeObjectURL(url);
}
```

### Pattern 4: JSON Import with Validation
**What:** Read and validate JSON file from user upload
**When to use:** User selects file via input element
**Example:**
```javascript
// Source: MDN FileReader API
const fileInput = document.getElementById('import-file');

fileInput.addEventListener('change', async () => {
  const [file] = fileInput.files;

  if (!file) return;

  // Validate file type
  if (!file.name.endsWith('.json')) {
    alert('Please select a JSON file');
    return;
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    alert('File is too large');
    return;
  }

  const reader = new FileReader();

  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);

      // Validate structure
      if (!data.teamMembers || !data.zones) {
        throw new Error('Invalid data structure');
      }

      // Validate arrays
      if (!Array.isArray(data.teamMembers) || !Array.isArray(data.zones)) {
        throw new Error('teamMembers and zones must be arrays');
      }

      // Import data
      importData(data);

    } catch (error) {
      alert('Invalid JSON file: ' + error.message);
    }
  };

  reader.onerror = () => {
    alert('Error reading file');
  };

  reader.readAsText(file);
});
```

### Pattern 5: Multi-Select Assignment UI
**What:** Select multiple team members to assign to zone
**When to use:** In zone editor dialog
**Example:**
```javascript
// Source: HTML select multiple attribute
// HTML:
// <select id="assigned-members" multiple size="5">
//   <!-- options populated from team members -->
// </select>

function populateAssignmentSelect(zone) {
  const select = document.getElementById('assigned-members');
  const members = store.getTeamMembers();

  select.innerHTML = members.map(member => {
    const isAssigned = zone.assignedMembers?.includes(member.id);
    return `<option value="${member.id}" ${isAssigned ? 'selected' : ''}>
      ${member.name}
    </option>`;
  }).join('');
}

function saveAssignment() {
  const select = document.getElementById('assigned-members');
  const assignedMembers = Array.from(select.selectedOptions)
    .map(option => option.value);

  const zoneId = dialog.dataset.zoneId;
  store.updateZone(zoneId, { assignedMembers });

  // Update visual style
  updateZoneStyle(zoneId, assignedMembers);
}
```

### Anti-Patterns to Avoid
- **Browser prompt for editing:** Already in codebase for zone naming, replace with modal dialog for better UX
- **Storing assignments outside zone data:** Keep assignedMembers array in zone object for data coherence
- **Not validating import data:** Always validate structure, types, and required fields
- **Forgetting to revoke blob URLs:** Memory leak - always call URL.revokeObjectURL()
- **Using data URLs for export:** File size limits and memory inefficiency vs Blob API
- **Not handling FileReader errors:** Always add onerror handler

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal dialogs | Custom div overlays | Native `<dialog>` element | Accessibility (ARIA, focus management), keyboard handling (Esc), browser-native ::backdrop |
| File downloads | Manual blob handling | Blob + URL.createObjectURL() pattern | Memory management, browser compatibility, standard pattern |
| File uploads | Custom file parsing | FileReader API | Async handling, error management, binary/text support |
| JSON validation | Custom object checking | Schema validation or defensive checks | Edge cases (null vs undefined, array vs object, nested structures) |
| Color mapping | String manipulation | Existing getTeamMemberColor() function | Consistent palette, index wrapping |
| Form submission | Manual data collection | FormData API or method="dialog" | Handles form validation, submit events, accessibility |

**Key insight:** Browser APIs for file operations and dialogs have matured significantly. Custom implementations add complexity without benefits and miss accessibility features.

## Common Pitfalls

### Pitfall 1: Dialog Not Closing on Form Submit
**What goes wrong:** Form submits, page reloads or dialog stays open
**Why it happens:** Forgot `method="dialog"` on form element
**How to avoid:** Always use `<form method="dialog">` inside `<dialog>` elements
**Warning signs:** Dialog remains visible after clicking save/cancel buttons
```javascript
// WRONG - requires preventDefault and manual close
<form onsubmit="saveZone()">

// RIGHT - automatically closes dialog
<form method="dialog" onsubmit="saveZone()">
```

### Pitfall 2: Memory Leak from Blob URLs
**What goes wrong:** Application memory usage grows over repeated exports
**Why it happens:** `URL.createObjectURL()` creates persistent reference until revoked
**How to avoid:** Always call `URL.revokeObjectURL()` after download triggers
**Warning signs:** Browser memory usage increases with each export
```javascript
// WRONG - URL never cleaned up
const url = URL.createObjectURL(blob);
a.href = url;

// RIGHT - revoke after download
const url = URL.createObjectURL(blob);
a.href = url;
a.click();
URL.revokeObjectURL(url);
```

### Pitfall 3: Zone Color Not Updating After Assignment
**What goes wrong:** Assign team member but polygon color stays red
**Why it happens:** Forgot to call `setStyle()` after `store.updateZone()`
**How to avoid:** Always update visual layer after state update
**Warning signs:** Store has correct data but map doesn't reflect changes
```javascript
// WRONG - state updates but visual doesn't
store.updateZone(zoneId, { assignedMembers });

// RIGHT - update both state and visual
store.updateZone(zoneId, { assignedMembers });
updateZoneStyle(zoneId, assignedMembers);
```

### Pitfall 4: Import Overwrites Without Confirmation
**What goes wrong:** User imports file, loses all current work
**Why it happens:** No confirmation dialog before replacing state
**How to avoid:** Always confirm before destructive operations
**Warning signs:** User complaints about lost data after import
```javascript
// WRONG - immediate overwrite
function importData(data) {
  store.state.teamMembers = data.teamMembers;
  store.state.zones = data.zones;
}

// RIGHT - confirm first
function importData(data) {
  if (!confirm('Import will replace all current data. Continue?')) {
    return;
  }
  // Then import...
}
```

### Pitfall 5: Invalid JSON Crashes Application
**What goes wrong:** User uploads malformed JSON, app breaks
**Why it happens:** No try/catch around JSON.parse()
**How to avoid:** Wrap all parse operations in try/catch
**Warning signs:** Console errors, blank screen after file selection
```javascript
// WRONG - throws on invalid JSON
const data = JSON.parse(event.target.result);

// RIGHT - graceful error handling
try {
  const data = JSON.parse(event.target.result);
  validateData(data);
  importData(data);
} catch (error) {
  alert('Invalid JSON file: ' + error.message);
}
```

### Pitfall 6: Lost Layer References After Import
**What goes wrong:** After import, clicking zones doesn't work
**Why it happens:** Forgot to rebuild layersByZoneId Map
**How to avoid:** Trigger 'zonesLoaded' event to rebuild layers
**Warning signs:** Zones appear but click handlers don't fire
```javascript
// WRONG - zones array updated but layers not synced
store.state.zones = importedZones;

// RIGHT - trigger reload to rebuild layer references
store.state.zones = importedZones;
store.pubsub.publish('zonesLoaded', importedZones);
```

## Code Examples

Verified patterns from official sources:

### Complete Zone Editor Dialog
```javascript
// Source: MDN dialog element + Leaflet events
// HTML structure:
/*
<dialog id="zone-editor">
  <form method="dialog">
    <h2>Edit Zone</h2>

    <label>
      Zone Name:
      <input type="text" id="zone-name" required />
    </label>

    <label>
      Assigned Team Members:
      <select id="assigned-members" multiple size="5">
        <!-- Populated dynamically -->
      </select>
    </label>

    <label>
      Mailbox Count (estimate):
      <input type="number" id="mailbox-count" min="0" />
    </label>

    <label>
      Notes:
      <textarea id="zone-notes" rows="3"></textarea>
    </label>

    <div class="dialog-buttons">
      <button type="submit" value="save">Save</button>
      <button type="submit" value="cancel">Cancel</button>
    </div>
  </form>
</dialog>
*/

// Initialize dialog
const dialog = document.getElementById('zone-editor');
const form = dialog.querySelector('form');

// Handle form submission
form.addEventListener('submit', (e) => {
  if (dialog.returnValue === 'save') {
    const zoneId = dialog.dataset.zoneId;
    const assignedSelect = document.getElementById('assigned-members');

    const updates = {
      name: document.getElementById('zone-name').value,
      assignedMembers: Array.from(assignedSelect.selectedOptions)
        .map(option => option.value),
      mailboxCount: parseInt(document.getElementById('mailbox-count').value) || null,
      notes: document.getElementById('zone-notes').value
    };

    // Update store
    store.updateZone(zoneId, updates);

    // Update visual style
    const layer = layersByZoneId.get(zoneId);
    updateZoneStyle(layer, updates.assignedMembers);

    // Update popup
    layer.setPopupContent(`<strong>${updates.name}</strong>`);
  }
});

// Open dialog for zone
function openZoneEditor(zone) {
  // Populate fields
  document.getElementById('zone-name').value = zone.name;
  document.getElementById('mailbox-count').value = zone.mailboxCount || '';
  document.getElementById('zone-notes').value = zone.notes || '';

  // Populate team member select
  const select = document.getElementById('assigned-members');
  const members = store.getTeamMembers();
  select.innerHTML = members.map(member => {
    const isAssigned = zone.assignedMembers?.includes(member.id);
    return `<option value="${member.id}" ${isAssigned ? 'selected' : ''}>
      ${member.name}
    </option>`;
  }).join('');

  // Store zone ID
  dialog.dataset.zoneId = zone.id;

  // Open dialog
  dialog.showModal();
}

// Add click handlers to zones
map.on('pm:create', (e) => {
  const layer = e.layer;
  layer.on('click', () => {
    const zoneId = layer.options.zoneId;
    const zone = store.getZones().find(z => z.id === zoneId);
    openZoneEditor(zone);
  });
});
```

### Dynamic Zone Styling Function
```javascript
// Source: Leaflet documentation - setStyle method
function updateZoneStyle(layer, assignedMembers) {
  if (!assignedMembers || assignedMembers.length === 0) {
    // Unassigned - red
    layer.setStyle({
      color: '#ef4444',
      fillColor: '#fca5a5',
      fillOpacity: 0.2,
      weight: 2
    });
  } else {
    // Assigned - use first member's color
    const members = store.getTeamMembers();
    const memberIndex = members.findIndex(m => m.id === assignedMembers[0]);

    if (memberIndex !== -1) {
      const color = getTeamMemberColor(memberIndex);
      layer.setStyle({
        color: color,
        fillColor: color,
        fillOpacity: 0.2,
        weight: 2
      });
    }
  }
}
```

### Complete Export/Import Implementation
```javascript
// Source: MDN Blob API, FileReader API
// Export functionality
function exportToJSON() {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    teamMembers: store.getTeamMembers(),
    zones: store.getZones()
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `vivons-chapet-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Clean up blob URL
  URL.revokeObjectURL(url);
}

// Import functionality
function setupImport() {
  const fileInput = document.getElementById('import-file');

  fileInput.addEventListener('change', () => {
    const [file] = fileInput.files;
    if (!file) return;

    // Validate file
    if (!file.name.endsWith('.json')) {
      alert('Please select a JSON file');
      fileInput.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File too large (max 5MB)');
      fileInput.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);

        // Validate structure
        if (!validateImportData(data)) {
          throw new Error('Invalid data structure');
        }

        // Confirm before overwrite
        if (!confirm('Import will replace all current data. Continue?')) {
          fileInput.value = '';
          return;
        }

        // Import data
        importData(data);

        alert('Data imported successfully');
        fileInput.value = '';

      } catch (error) {
        alert('Invalid JSON file: ' + error.message);
        fileInput.value = '';
      }
    };

    reader.onerror = () => {
      alert('Error reading file');
      fileInput.value = '';
    };

    reader.readAsText(file);
  });
}

function validateImportData(data) {
  // Check required fields
  if (!data.teamMembers || !data.zones) {
    return false;
  }

  // Check arrays
  if (!Array.isArray(data.teamMembers) || !Array.isArray(data.zones)) {
    return false;
  }

  // Validate team member structure
  for (const member of data.teamMembers) {
    if (!member.id || !member.name) {
      return false;
    }
  }

  // Validate zone structure
  for (const zone of data.zones) {
    if (!zone.id || !zone.name || !zone.geojson) {
      return false;
    }
  }

  return true;
}

function importData(data) {
  // Update state
  store.state.teamMembers = data.teamMembers;
  store.state.zones = data.zones;

  // Trigger reload events
  store.pubsub.publish('teamMembersLoaded', data.teamMembers);
  store.pubsub.publish('zonesLoaded', data.zones);

  // Save to localStorage
  store._debouncedSave();
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom modal overlays | Native `<dialog>` element | March 2022 (baseline) | Built-in accessibility, simpler code |
| XML + XMLHttpRequest | JSON + Fetch API | ES6 (2015+) | Cleaner syntax, promise-based |
| Data URLs for downloads | Blob + createObjectURL | HTML5 File API | No size limits, better memory |
| Manual property checks | JSON Schema validation | Ongoing trend | More robust validation |
| alert() for confirmations | Custom dialog elements | Modern UX | Better user experience |

**Deprecated/outdated:**
- **Data URLs for large files:** Size limitations (~2MB in many browsers), base64 encoding overhead
- **XMLHttpRequest:** Replaced by Fetch API for cleaner promise-based code
- **window.open() for downloads:** Blocked by popup blockers, use anchor download attribute
- **Manual accessibility:** Native dialog handles ARIA, focus trapping automatically

## Open Questions

Things that couldn't be fully resolved:

1. **Multi-assignment visual indicator**
   - What we know: Zone takes first assigned member's color
   - What's unclear: Should UI show all assigned members visually?
   - Recommendation: Start with first-member color, could add badge/icon for multi-assignment in future

2. **Import merge vs replace strategy**
   - What we know: Full replace is simplest, prevents ID conflicts
   - What's unclear: Do users need to merge imported data with existing?
   - Recommendation: Start with replace-all, add merge option only if users request it

3. **Zone validation on import**
   - What we know: GeoJSON structure can be complex
   - What's unclear: How strict should polygon validation be?
   - Recommendation: Basic structure checks (required fields), rely on Leaflet to reject invalid GeoJSON

4. **Assignment history tracking**
   - What we know: Current state is stored, no history
   - What's unclear: Do users need to see who was assigned previously?
   - Recommendation: Out of scope for Phase 4, can add in future if needed

## Sources

### Primary (HIGH confidence)
- [Leaflet Documentation](https://leafletjs.com/reference.html) - Layer events, click handling
- [Leaflet GeoJSON Tutorial](https://leafletjs.com/examples/geojson/) - Style functions, feature properties
- [MDN dialog element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) - showModal(), close(), method="dialog"
- [MDN File API](https://developer.mozilla.org/en-US/docs/Web/API/File_API) - FileReader, Blob, URL.createObjectURL()

### Secondary (MEDIUM confidence)
- [Blob API best practices](https://javascript.info/blob) - Memory management, URL revocation
- [Modal dialog best practices 2026](https://www.cssscript.com/best-modal/) - Accessibility patterns
- [JSON Schema validation guide](https://qubittool.com/blog/json-schema-validation-guide) - Import validation patterns

### Tertiary (LOW confidence)
- WebSearch results on multi-select patterns - General guidance, not Leaflet-specific
- Community tutorials on file downloads - Patterns verified against MDN

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All browser-native APIs, well-documented
- Architecture: HIGH - Patterns from official docs, existing codebase structure
- Pitfalls: MEDIUM - Based on common patterns, not phase-specific testing

**Research date:** 2026-02-05
**Valid until:** 2026-03-05 (30 days - stable APIs, no breaking changes expected)
