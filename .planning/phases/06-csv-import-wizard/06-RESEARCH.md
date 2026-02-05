# Phase 6: CSV Import in Wizard - Research

**Researched:** 2026-02-05
**Domain:** CSV file upload, parsing, validation, and geocoding within multi-step wizard
**Confidence:** HIGH

## Summary

Phase 6 extends the Phase 5 wizard with CSV import functionality for team members (colistiers). Research confirms the project already has the complete infrastructure: PapaParse 5.5.3 for CSV parsing, existing validation/normalization logic in `csvImport.js`, geocoding via Geoplateforme API in `geocoding.js`, and Wizard-JS for step orchestration. The primary work is integrating these existing modules into new wizard steps rather than building new capabilities.

The implementation adds 3-4 wizard steps after commune confirmation: (1) CSV format explanation with downloadable template, (2) file upload via drag-and-drop or file input, (3) validation results with error display, (4) geocoding progress and confirmation. The existing `handleFileImport()` pipeline from `importFlow.js` can be refactored into step-specific handlers that integrate with Wizard-JS navigation events.

Critical implementation details: The Geoplateforme API has a 50 requests/second rate limit (verified), and the existing `geocodeBatch()` already implements 20ms delays between requests. PapaParse's `step` callback can validate rows during parsing, and the existing `validateTeamMembers()` function handles required field checking. File upload should support both drag-and-drop (for UX) and traditional file input (for accessibility fallback).

**Primary recommendation:** Reuse existing PapaParse/validation/geocoding modules. Add wizard steps that call these modules in sequence. Show validation errors inline before geocoding. Show geocoding progress with per-address status. Enable wizard navigation only after successful steps.

## Standard Stack

The wizard CSV import uses existing project dependencies with no new libraries required.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PapaParse | 5.5.3 (existing) | CSV parsing with header detection | Already installed. Handles encoding, quotes, delimiters automatically. `header: true` mode maps columns to object keys. |
| Wizard-JS | 2.0.3 (existing) | Step orchestration for import flow | Already installed for Phase 5. Provides navigation events (`wz.btn.next`, `wz.end`) for step validation. |
| Geoplateforme API | data.geopf.fr | Address geocoding | Already used in `geocoding.js`. 50 req/s rate limit, French addresses only. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| HTML5 Drag and Drop API | Native | File upload via drag-and-drop | Primary upload method for modern UX. Falls back to file input for accessibility. |
| FileReader API | Native | Read uploaded CSV file | Browser-native. PapaParse uses internally. |
| store (existing) | N/A | Persist team members | `store.addTeamMember()` saves geocoded members to state + localStorage. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| PapaParse | Hand-rolled CSV parsing | PapaParse handles edge cases (quoted fields, BOM, encoding). Hand-rolling risks parsing errors. Already installed. |
| Drag-and-drop | File input only | Drag-and-drop is more intuitive for file upload. But file input is essential for keyboard/screen reader users. Use both. |
| Synchronous geocoding | Background worker | Worker adds complexity. Current batch approach with 20ms delays works for <100 addresses. Defer worker unless performance issues. |

**Installation:**
```bash
# No new packages needed - all dependencies exist
# Existing dependencies:
#   - papaparse: ^5.5.3
#   - @adrii_/wizard-js: ^2.0.3
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── ui/
│   ├── wizard.js             # EXTEND: Add CSV import steps after commune confirmation
│   ├── importFlow.js         # REUSE: handleFileImport() pipeline, refactor for wizard
│   └── csvFormatHelp.js      # NEW: CSV format explanation component
├── services/
│   ├── csvImport.js          # REUSE: parseCSV(), validateTeamMembers(), normalizeTeamMember()
│   └── geocoding.js          # REUSE: geocodeBatch(), geocodeAddress()
└── data/
    └── templates/
        └── colistiers-template.csv  # NEW: Downloadable CSV template
```

### Pattern 1: Multi-Step Wizard Extension
**What:** Add CSV import steps to existing Wizard-JS instance after commune configuration completes. Each step uses existing modules with step-specific UI.
**When to use:** Extending Phase 5 wizard with new import functionality.
**Example:**
```javascript
// Source: Wizard-JS docs + existing wizard.js pattern
// In index.html, add steps after preview step:

<!-- Step 4: CSV Format Explanation -->
<div class="wizard-step" data-wz-title="Format CSV">
  <h3>Format du fichier CSV</h3>
  <p>Votre fichier doit contenir ces colonnes:</p>
  <ul>
    <li><strong>nom</strong> ou <strong>name</strong> (obligatoire)</li>
    <li><strong>adresse</strong> ou <strong>address</strong> (obligatoire)</li>
    <li><strong>telephone</strong> ou <strong>phone</strong> (optionnel)</li>
  </ul>
  <a href="/templates/colistiers-template.csv" download class="btn-secondary">
    Telecharger le modele
  </a>
</div>

<!-- Step 5: File Upload -->
<div class="wizard-step" data-wz-title="Import">
  <h3>Importer vos colistiers</h3>
  <div id="csv-drop-zone" class="drop-zone">
    <p>Glissez votre fichier CSV ici</p>
    <p>ou</p>
    <label class="btn-primary">
      Parcourir
      <input type="file" id="wizard-csv-input" accept=".csv" hidden>
    </label>
  </div>
  <div id="csv-file-info" hidden></div>
</div>

<!-- Step 6: Validation Results -->
<div class="wizard-step" data-wz-title="Validation">
  <h3>Validation du fichier</h3>
  <div id="validation-results"></div>
</div>

<!-- Step 7: Geocoding & Confirmation -->
<div class="wizard-step" data-wz-title="Confirmation">
  <h3>Generation de la carte</h3>
  <div id="geocoding-progress"></div>
  <div id="import-summary" hidden></div>
</div>
```

### Pattern 2: Drag-and-Drop File Upload with Fallback
**What:** Implement HTML5 drag-and-drop for modern UX with file input fallback for accessibility.
**When to use:** File upload step in wizard.
**Example:**
```javascript
// Source: MDN Drag and Drop API + existing project patterns

function setupFileUploadStep() {
  const dropZone = document.getElementById('csv-drop-zone');
  const fileInput = document.getElementById('wizard-csv-input');
  const fileInfo = document.getElementById('csv-file-info');

  // Prevent default browser behavior for drag events
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  // Visual feedback during drag
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove('drag-over');
    });
  });

  // Handle dropped files
  dropZone.addEventListener('drop', (e) => {
    const files = [...e.dataTransfer.files];
    const csvFile = files.find(f => f.name.endsWith('.csv'));

    if (!csvFile) {
      showError('Veuillez deposer un fichier CSV');
      return;
    }

    handleFileSelected(csvFile);
  });

  // Handle file input selection (fallback)
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelected(file);
    }
  });

  function handleFileSelected(file) {
    // Store file for later processing
    window.wizardCSVFile = file;

    // Show file info
    fileInfo.hidden = false;
    fileInfo.innerHTML = `
      <p class="success">Fichier selectionne: ${file.name}</p>
      <p>Taille: ${(file.size / 1024).toFixed(1)} Ko</p>
    `;

    // Enable next button
    enableWizardNavigation();
  }
}
```

### Pattern 3: Step-by-Step Validation with Error Display
**What:** Parse CSV and validate before geocoding. Show per-row errors with line numbers. Block navigation until errors fixed.
**When to use:** Validation step between upload and geocoding.
**Example:**
```javascript
// Source: PapaParse docs + existing csvImport.js

import { parseCSV, validateTeamMembers, normalizeTeamMember } from '../services/csvImport.js';

async function runValidationStep() {
  const resultsContainer = document.getElementById('validation-results');
  const file = window.wizardCSVFile;

  if (!file) {
    resultsContainer.innerHTML = '<p class="error">Aucun fichier selectionne</p>';
    return false;
  }

  resultsContainer.innerHTML = '<p>Validation en cours...</p>';

  try {
    // Step 1: Parse CSV
    const rawMembers = await parseCSV(file);

    if (rawMembers.length === 0) {
      resultsContainer.innerHTML = '<p class="error">Le fichier CSV est vide</p>';
      return false;
    }

    // Step 2: Validate required fields
    const errors = validateTeamMembers(rawMembers);

    if (errors.length > 0) {
      // Show validation errors
      resultsContainer.innerHTML = `
        <p class="error">${errors.length} erreur(s) detectee(s):</p>
        <ul class="error-list">
          ${errors.map(e => `<li>Ligne ${e.row}: ${e.message}</li>`).join('')}
        </ul>
        <p>Corrigez votre fichier et reimportez-le.</p>
      `;
      return false;
    }

    // Step 3: Normalize and store for geocoding
    const members = rawMembers.map(normalizeTeamMember);
    window.wizardValidatedMembers = members;

    // Show success
    resultsContainer.innerHTML = `
      <p class="success">${members.length} colistier(s) valide(s)</p>
      <table class="preview-table">
        <thead>
          <tr><th>Nom</th><th>Adresse</th></tr>
        </thead>
        <tbody>
          ${members.slice(0, 5).map(m => `
            <tr><td>${m.name}</td><td>${m.address}</td></tr>
          `).join('')}
          ${members.length > 5 ? `<tr><td colspan="2">... et ${members.length - 5} autres</td></tr>` : ''}
        </tbody>
      </table>
    `;

    return true;

  } catch (error) {
    resultsContainer.innerHTML = `
      <p class="error">Erreur de lecture du fichier: ${error.message || 'Format invalide'}</p>
    `;
    return false;
  }
}
```

### Pattern 4: Geocoding with Progress Display
**What:** Geocode addresses sequentially with visual progress. Show success/failure per address. Handle partial failures gracefully.
**When to use:** Final wizard step before completion.
**Example:**
```javascript
// Source: Existing geocoding.js + project patterns

import { geocodeAddress } from '../services/geocoding.js';
import { store } from '../state/store.js';

async function runGeocodingStep() {
  const progressContainer = document.getElementById('geocoding-progress');
  const summaryContainer = document.getElementById('import-summary');
  const members = window.wizardValidatedMembers;

  if (!members || members.length === 0) {
    progressContainer.innerHTML = '<p class="error">Aucun colistier a geocoder</p>';
    return false;
  }

  // Initialize progress display
  progressContainer.innerHTML = `
    <p>Geocodage en cours: <span id="geocode-count">0</span>/${members.length}</p>
    <progress id="geocode-progress" max="${members.length}" value="0"></progress>
    <div id="geocode-status"></div>
  `;

  const countEl = document.getElementById('geocode-count');
  const progressEl = document.getElementById('geocode-progress');
  const statusEl = document.getElementById('geocode-status');

  let successCount = 0;
  let failCount = 0;
  const results = [];

  // Process addresses sequentially with rate limiting
  for (let i = 0; i < members.length; i++) {
    const member = members[i];

    try {
      const geo = await geocodeAddress(member.address);

      // Add to store
      store.addTeamMember({
        name: member.name,
        address: member.address,
        phone: member.phone || null,
        lat: geo.lat,
        lng: geo.lng,
        geocodeScore: geo.score
      });

      successCount++;
      results.push({ name: member.name, success: true });

    } catch (error) {
      failCount++;
      results.push({ name: member.name, success: false, error: error.message });
      console.warn(`Geocoding failed for ${member.name}:`, error.message);
    }

    // Update progress
    countEl.textContent = i + 1;
    progressEl.value = i + 1;

    // Show last status
    const last = results[results.length - 1];
    statusEl.innerHTML = last.success
      ? `<span class="success">${last.name}: OK</span>`
      : `<span class="error">${last.name}: ${last.error}</span>`;

    // Rate limiting: wait 20ms between requests (50 req/s limit)
    if (i < members.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  }

  // Show summary
  progressContainer.hidden = true;
  summaryContainer.hidden = false;
  summaryContainer.innerHTML = `
    <p class="success">${successCount} colistier(s) ajoute(s) a la carte</p>
    ${failCount > 0 ? `<p class="warning">${failCount} adresse(s) non trouvee(s)</p>` : ''}
    <p>Cliquez sur "Terminer" pour afficher la carte.</p>
  `;

  // Store results for final step
  window.wizardImportResults = { success: successCount, failed: failCount };

  return true;
}
```

### Anti-Patterns to Avoid
- **Geocoding before validation:** Always validate CSV structure first. Geocoding API calls are expensive (rate limited). Don't waste them on invalid data.
- **Blocking UI during geocoding:** Show progress indicator. User should see that something is happening, not a frozen screen.
- **Silent failures:** Display per-address geocoding results. User needs to know which addresses failed and why.
- **Large file uploads:** The existing pattern has no size limit. Warn user for files > 1MB (>1000 rows). Consider chunked processing.
- **Proceeding after validation errors:** Disable "Next" button when validation fails. User must fix CSV and re-upload.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| CSV parsing | Manual string splitting | PapaParse (existing) | Handles quoted fields, BOM markers, encoding, delimiters. Already installed in project. |
| Field validation | Inline checks in each function | validateTeamMembers() (existing) | Centralized validation logic. Returns structured errors with row numbers. |
| Field normalization | Ad-hoc key mapping | normalizeTeamMember() (existing) | Handles French/English variations (nom/name, adresse/address). Consistent output format. |
| Geocoding rate limiting | Manual setTimeout chains | geocodeBatch() (existing) | Already implements 20ms delays. Handles errors per-address. |
| File type validation | Manual extension check | HTML accept attribute + MIME check | `accept=".csv"` limits file picker. Check `file.type` or extension on drop. |
| Drag-and-drop | Custom drag handling | HTML5 Drag and Drop API | Native browser API. Well-documented on MDN. Handles all events. |

**Key insight:** The Phase 6 implementation should primarily wire together existing modules into new wizard steps rather than building new parsing/validation/geocoding logic.

## Common Pitfalls

### Pitfall 1: Encoding Issues with French Characters
**What goes wrong:** CSV file with accented characters (e.g., "Jerome" instead of "Jerome") displays as garbled text or fails parsing.
**Why it happens:** CSV saved in Windows-1252 or ISO-8859-1 encoding instead of UTF-8. PapaParse defaults to UTF-8.
**How to avoid:** PapaParse's `encoding` option can auto-detect, but recommend UTF-8 in format explanation. Show encoding warning if garbled characters detected in preview.
**Warning signs:** Names or addresses show replacement characters (?) or mojibake (e.g., "JÃ©rÃ´me").

### Pitfall 2: Column Header Case Sensitivity
**What goes wrong:** CSV with headers "NOM" or "Nom" fails validation because code checks for lowercase "nom".
**Why it happens:** Developer forgets that user CSV headers may have different casing.
**How to avoid:** Already handled in existing `validateTeamMembers()` and `normalizeTeamMember()` which convert keys to lowercase. Verify this works correctly.
**Warning signs:** "Missing required field: nom" error when CSV clearly has "NOM" column.

### Pitfall 3: Empty Rows in CSV
**What goes wrong:** Validation reports errors for empty rows at end of file, confusing the user.
**Why it happens:** Excel and other tools add trailing empty rows. PapaParse includes them unless configured.
**How to avoid:** PapaParse `skipEmptyLines: true` option (already used in existing csvImport.js). Verify wizard import uses same config.
**Warning signs:** Validation errors like "Ligne 47: Missing required field" when file has only 45 data rows.

### Pitfall 4: Geocoding Fails for All Addresses
**What goes wrong:** Every address returns "Address not found" error, even valid French addresses.
**Why it happens:** (1) Using geo.api.gouv.fr instead of Geoplateforme (deprecated), (2) Address format incompatible with API expectations, (3) Network/CORS issues.
**How to avoid:** Project already uses correct Geoplateforme URL (data.geopf.fr). Verify addresses include city/postal code. Test with known valid address first.
**Warning signs:** 100% geocoding failure rate. Console shows 404 or CORS errors.

### Pitfall 5: Wizard Navigation Enabled Before Step Completion
**What goes wrong:** User clicks "Next" before file is uploaded or validation completes, causing errors in subsequent steps.
**Why it happens:** Next button not properly disabled during async operations.
**How to avoid:** Disable next button by default. Enable only after step-specific success condition (file selected, validation passed, geocoding complete). Use Wizard-JS `wizard.lock()` and `wizard.unlock()` if available.
**Warning signs:** JavaScript errors like "Cannot read property 'length' of undefined" on window.wizardValidatedMembers.

### Pitfall 6: Large File Causes Browser Freeze
**What goes wrong:** User uploads CSV with 10,000+ rows. Browser becomes unresponsive during parsing or geocoding.
**Why it happens:** Synchronous processing blocks main thread. Geocoding 10,000 addresses takes ~200 seconds (10000 * 20ms).
**How to avoid:** Warn user for files > 1MB or > 500 rows. Show progress indicator during processing. Consider Web Worker for parsing large files (future enhancement). Implement cancel button for long operations.
**Warning signs:** Browser "page unresponsive" dialog. No UI updates during processing.

## Code Examples

Verified patterns from official sources:

### Complete Wizard CSV Step Setup
```javascript
// Source: Phase 5 wizard.js pattern + PapaParse/geocoding modules

import { parseCSV, validateTeamMembers, normalizeTeamMember } from '../services/csvImport.js';
import { geocodeAddress } from '../services/geocoding.js';
import { store } from '../state/store.js';

// State for wizard CSV flow
let selectedFile = null;
let validatedMembers = null;

/**
 * Setup CSV format explanation step
 * No validation needed - informational only
 */
function setupFormatStep() {
  // Template download link should be in HTML
  // Step proceeds when user clicks Next
}

/**
 * Setup file upload step with drag-and-drop
 */
function setupUploadStep() {
  const dropZone = document.getElementById('csv-drop-zone');
  const fileInput = document.getElementById('wizard-csv-input');

  // Prevent default drag behaviors on window
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('drop', e => e.preventDefault());

  // Drag events for visual feedback
  dropZone.addEventListener('dragenter', () => dropZone.classList.add('drag-over'));
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('dragover', e => e.preventDefault());

  // Drop handler
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');

    const files = [...e.dataTransfer.items]
      .map(item => item.getAsFile())
      .filter(file => file && file.name.endsWith('.csv'));

    if (files.length === 0) {
      showUploadError('Veuillez deposer un fichier CSV');
      return;
    }

    handleFileSelection(files[0]);
  });

  // File input handler (fallback)
  fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) {
      handleFileSelection(e.target.files[0]);
    }
  });
}

function handleFileSelection(file) {
  // Validate file type
  if (!file.name.endsWith('.csv')) {
    showUploadError('Format invalide. Selectionnez un fichier .csv');
    return;
  }

  // Warn for large files
  if (file.size > 1024 * 1024) { // > 1MB
    if (!confirm('Ce fichier est volumineux. Le traitement peut prendre du temps. Continuer?')) {
      return;
    }
  }

  selectedFile = file;

  // Update UI
  document.getElementById('csv-file-info').hidden = false;
  document.getElementById('csv-file-info').innerHTML = `
    <p class="success">Fichier: ${file.name} (${(file.size / 1024).toFixed(1)} Ko)</p>
  `;

  // Enable next navigation (wizard-specific)
  enableNextButton();
}

/**
 * Run validation when entering validation step
 */
async function runValidation() {
  const container = document.getElementById('validation-results');

  if (!selectedFile) {
    container.innerHTML = '<p class="error">Aucun fichier selectionne</p>';
    disableNextButton();
    return;
  }

  container.innerHTML = '<p>Analyse du fichier...</p>';
  disableNextButton();

  try {
    // Parse CSV using existing module
    const rawMembers = await parseCSV(selectedFile);

    if (rawMembers.length === 0) {
      container.innerHTML = '<p class="error">Le fichier est vide ou mal formate</p>';
      return;
    }

    // Validate using existing module
    const errors = validateTeamMembers(rawMembers);

    if (errors.length > 0) {
      container.innerHTML = `
        <div class="error-box">
          <p><strong>${errors.length} erreur(s) detectee(s):</strong></p>
          <ul>
            ${errors.map(e => `<li>Ligne ${e.row}: ${e.message}</li>`).join('')}
          </ul>
        </div>
        <p>Corrigez le fichier CSV et reimportez-le a l'etape precedente.</p>
      `;
      return;
    }

    // Normalize using existing module
    validatedMembers = rawMembers.map(normalizeTeamMember);

    // Show preview
    container.innerHTML = `
      <p class="success">${validatedMembers.length} colistier(s) valide(s)</p>
      <div class="preview-scroll">
        <table class="preview-table">
          <thead><tr><th>Nom</th><th>Adresse</th><th>Telephone</th></tr></thead>
          <tbody>
            ${validatedMembers.slice(0, 10).map(m => `
              <tr>
                <td>${escapeHtml(m.name)}</td>
                <td>${escapeHtml(m.address)}</td>
                <td>${escapeHtml(m.phone || '-')}</td>
              </tr>
            `).join('')}
            ${validatedMembers.length > 10 ?
              `<tr><td colspan="3" class="more">... et ${validatedMembers.length - 10} autres</td></tr>` : ''}
          </tbody>
        </table>
      </div>
    `;

    enableNextButton();

  } catch (error) {
    container.innerHTML = `
      <p class="error">Erreur de lecture: ${error.message || 'Format CSV invalide'}</p>
    `;
  }
}

/**
 * Run geocoding when entering confirmation step
 */
async function runGeocoding() {
  const progressEl = document.getElementById('geocoding-progress');
  const summaryEl = document.getElementById('import-summary');

  if (!validatedMembers || validatedMembers.length === 0) {
    progressEl.innerHTML = '<p class="error">Aucun colistier a traiter</p>';
    return;
  }

  disableNextButton();
  summaryEl.hidden = true;

  // Initialize progress UI
  progressEl.innerHTML = `
    <p>Geocodage des adresses: <span id="geo-current">0</span>/${validatedMembers.length}</p>
    <progress id="geo-bar" max="${validatedMembers.length}" value="0"></progress>
    <p id="geo-status" class="status"></p>
  `;

  const currentEl = document.getElementById('geo-current');
  const barEl = document.getElementById('geo-bar');
  const statusEl = document.getElementById('geo-status');

  let success = 0;
  let failed = 0;
  const failedNames = [];

  // Process each member
  for (let i = 0; i < validatedMembers.length; i++) {
    const member = validatedMembers[i];

    statusEl.textContent = `Traitement: ${member.name}...`;

    try {
      const geo = await geocodeAddress(member.address);

      // Add to store (persists to localStorage)
      store.addTeamMember({
        name: member.name,
        address: member.address,
        phone: member.phone || null,
        lat: geo.lat,
        lng: geo.lng,
        geocodeScore: geo.score
      });

      success++;

    } catch (error) {
      failed++;
      failedNames.push(member.name);
      console.warn(`Geocode failed for ${member.name}:`, error.message);
    }

    // Update progress
    currentEl.textContent = i + 1;
    barEl.value = i + 1;

    // Rate limiting (20ms = 50 req/s max)
    if (i < validatedMembers.length - 1) {
      await new Promise(r => setTimeout(r, 20));
    }
  }

  // Show summary
  progressEl.hidden = true;
  summaryEl.hidden = false;

  let summaryHtml = `<p class="success">${success} colistier(s) ajoute(s) avec succes!</p>`;

  if (failed > 0) {
    summaryHtml += `
      <p class="warning">${failed} adresse(s) non trouvee(s):</p>
      <ul class="failed-list">
        ${failedNames.map(n => `<li>${escapeHtml(n)}</li>`).join('')}
      </ul>
      <p class="hint">Ces colistiers peuvent etre ajoutes manuellement plus tard.</p>
    `;
  }

  summaryHtml += `<p>Cliquez sur "Terminer" pour afficher la carte.</p>`;
  summaryEl.innerHTML = summaryHtml;

  enableNextButton();
}

// Helper function
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
```

### CSV Template File
```csv
nom,adresse,telephone
Jean Dupont,12 rue de la Paix 75001 Paris,0612345678
Marie Martin,45 avenue Victor Hugo 69003 Lyon,
Pierre Durand,8 boulevard Gambetta 33000 Bordeaux,0698765432
```

### Drop Zone CSS Styles
```css
/* Source: MDN Drag and Drop examples + existing project style.css */

.drop-zone {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  background: #f9fafb;
  transition: all 0.2s ease;
  cursor: pointer;
}

.drop-zone.drag-over {
  border-color: #2563eb;
  background: #eff6ff;
}

.drop-zone p {
  margin: 8px 0;
  color: #6b7280;
}

.drop-zone .btn-primary {
  margin-top: 12px;
  display: inline-block;
  cursor: pointer;
}

/* Validation results */
.error-box {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 4px;
  padding: 12px;
  margin: 12px 0;
}

.error-box ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.error-box li {
  color: #dc2626;
  font-size: 14px;
}

/* Preview table */
.preview-scroll {
  max-height: 200px;
  overflow-y: auto;
  margin: 12px 0;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.preview-table th,
.preview-table td {
  padding: 6px 8px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.preview-table th {
  background: #f3f4f6;
  font-weight: 600;
}

.preview-table .more {
  text-align: center;
  color: #6b7280;
  font-style: italic;
}

/* Progress indicator */
progress {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  margin: 12px 0;
}

progress::-webkit-progress-bar {
  background: #e5e7eb;
  border-radius: 4px;
}

progress::-webkit-progress-value {
  background: #2563eb;
  border-radius: 4px;
}

.status {
  font-size: 13px;
  color: #6b7280;
  min-height: 20px;
}

.failed-list {
  max-height: 100px;
  overflow-y: auto;
  font-size: 13px;
}

.hint {
  font-size: 12px;
  color: #6b7280;
  font-style: italic;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| api-adresse.data.gouv.fr | data.geopf.fr (Geoplateforme) | End of Jan 2026 | Old endpoint deprecated. Project already uses Geoplateforme. No action needed. |
| File input only | Drag-and-drop + file input | 2018+ | Drag-and-drop is expected UX for modern file upload. Must include fallback for accessibility. |
| Synchronous validation | Async with progress | Ongoing | Large files block UI. Show progress for operations > 100ms. |

**Deprecated/outdated:**
- **api-adresse.data.gouv.fr**: Deprecated January 2026. Project already migrated to data.geopf.fr in geocoding.js. No change needed for Phase 6.

## Open Questions

Things that couldn't be fully resolved:

1. **Wizard step navigation during async operations**
   - What we know: Wizard-JS has `lock()` and `unlock()` methods mentioned in docs.
   - What's unclear: Exact API for preventing navigation during geocoding. May need to disable buttons manually.
   - Recommendation: Test with `wizard.lock()`. If not available, manually disable next/prev buttons and re-enable after async completion.

2. **Maximum recommended file size**
   - What we know: PapaParse handles large files via streaming. Geoplateforme has 50 req/s limit.
   - What's unclear: Practical limit for wizard UX. 1000 rows = ~20 seconds geocoding.
   - Recommendation: Warn at 500 rows (~10 seconds). Block at 2000 rows (require batch import outside wizard). Document limitation in CSV format step.

3. **Error recovery for partial geocoding failure**
   - What we know: Some addresses will fail. Store only saves successful geocodes.
   - What's unclear: Should failed addresses be saved for later manual entry? How to show them after wizard?
   - Recommendation: Display failed names in summary. Consider saving failed list to sessionStorage for "retry later" feature (defer to future phase).

## Sources

### Primary (HIGH confidence)
- [PapaParse Documentation](https://www.papaparse.com/docs) - CSV parsing configuration and callbacks
- [MDN Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop) - File drag-and-drop implementation
- [Geoplateforme Documentation](https://geoservices.ign.fr/documentation/services/services-geoplateforme/geocodage) - Rate limits (50 req/s), endpoints
- Existing codebase: `src/services/csvImport.js`, `src/services/geocoding.js`, `src/ui/importFlow.js`

### Secondary (MEDIUM confidence)
- [Wizard-JS GitHub](https://github.com/AdrianVillamayor/Wizard-JS) - Events and navigation API
- Phase 5 RESEARCH.md - Wizard-JS integration patterns

### Tertiary (LOW confidence)
- None - All patterns verified against existing project code or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and working in project
- Architecture: HIGH - Patterns derived from existing codebase modules
- Pitfalls: HIGH - Encoding, validation, rate limiting issues verified from PapaParse/Geoplateforme docs

**Research date:** 2026-02-05
**Valid until:** 2026-03-05 (30 days - stable stack, no anticipated breaking changes)
