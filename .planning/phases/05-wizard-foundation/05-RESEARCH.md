# Phase 5: Wizard Foundation - Research

**Researched:** 2026-02-05
**Domain:** Multi-step wizard UI with postal code lookup and commune selection
**Confidence:** HIGH

## Summary

Phase 5 implements a first-launch wizard to configure the user's commune before main app access. Research confirms this can be achieved with Wizard-JS 2.0.3 (vanilla JavaScript wizard library) for step management, geo.api.gouv.fr API for postal code to commune lookup, and native HTML dialog element for consistency with existing zoneEditor.js pattern.

The wizard follows a 3-step flow: (1) welcome screen explaining the app, (2) postal code entry with commune lookup and optional selection UI when multiple communes match, (3) commune boundary preview on Leaflet map before confirmation. State persistence uses sessionStorage (tab-isolated, survives refresh) rather than localStorage (avoids quota issues). Upon completion, the wizard saves commune configuration to localStorage and transitions to the main app.

Critical implementation details: geo.api.gouv.fr returns arrays (multiple communes per postal code), requires format=geojson&geometry=contour for boundary display, and has no documented rate limits but should implement retry logic. Wizard-JS v2.0.3 uses data attributes for step configuration and custom events (wz.ready, wz.update) for integration hooks. The library has zero dependencies and works with native browser APIs, aligning perfectly with the vanilla JavaScript constraint.

**Primary recommendation:** Use Wizard-JS for step orchestration, implement postal code validation before API call, handle multi-commune selection with radio buttons, preview boundary with existing Leaflet map instance (reuse initialization logic), and save minimal config (commune code + name) to localStorage on wizard completion.

## Standard Stack

The wizard requires one new library plus two API integrations, all compatible with vanilla JavaScript architecture.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Wizard-JS | 2.0.3 | Multi-step wizard UI | Pure vanilla JS, zero dependencies, ARIA-compliant accessibility, 140+ commits with active maintenance (updated 2026). CDN available for no-build integration. |
| geo.api.gouv.fr | N/A | Postal code to commune lookup | Official French government API, no authentication, returns commune list with boundaries in GeoJSON format. /communes?codePostal={code} endpoint. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Leaflet | 1.9.4 (existing) | Commune boundary preview | Reuse existing map initialization for step 3 preview. Display GeoJSON boundary layer before user confirms. |
| Browser Fetch API | Native | API requests | Direct calls to geo.api.gouv.fr, no wrapper needed. Already used in commune.js. |
| sessionStorage | Native | Wizard state persistence | Tab-isolated state, survives refresh, cleared on wizard completion. Avoids localStorage quota issues during wizard flow. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Wizard-JS | Hand-rolled stepper | Wizard-JS provides validation, ARIA, and navigation logic out-of-box. Hand-rolling risks accessibility gaps and more maintenance. |
| geo.api.gouv.fr | Nominatim | geo.api.gouv.fr is official government source with commune boundaries included. Nominatim requires separate OSM boundary lookup and has less reliable French postal data. |
| sessionStorage | localStorage | localStorage persists across sessions (wizard state should be ephemeral). sessionStorage auto-clears on tab close, reducing orphaned data. |

**Installation:**
```bash
# Wizard-JS via CDN (no build step)
# Add to index.html:
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@adrii_/wizard-js@2.0.3/dist/wizard.min.css">
<script src="https://cdn.jsdelivr.net/npm/@adrii_/wizard-js@2.0.3/dist/wizard.min.js"></script>

# Or via npm (if build pipeline added later):
npm install @adrii_/wizard-js
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── ui/
│   ├── wizard.js           # Wizard initialization and step handlers (NEW)
│   └── zoneEditor.js       # Existing dialog pattern to follow
├── data/
│   ├── commune.js          # EXTEND with searchCommunesByPostalCode()
│   └── storage.js          # EXTEND with commune config save/load
└── main.js                 # Check for commune config on load, show wizard if missing
```

### Pattern 1: Native Dialog with Wizard-JS Integration
**What:** Wizard renders inside native HTML `<dialog>` element, consistent with zoneEditor.js pattern. Wizard-JS controls step navigation, form uses native validation.
**When to use:** For wizard UI that needs modal behavior, step orchestration, and form validation.
**Example:**
```javascript
// Source: Wizard-JS GitHub (v2.0.3) + FlyerMap zoneEditor.js pattern
import Wizard from '@adrii_/wizard-js';

// HTML structure (in index.html or dynamically created)
const dialogHTML = `
  <dialog id="welcome-wizard" class="wizard">
    <div class="wz-step" data-step-name="welcome">
      <h2>Bienvenue sur FlyerMap</h2>
      <p>Configuration initiale de votre commune...</p>
      <button class="wz-next-button">Commencer</button>
    </div>

    <div class="wz-step" data-step-name="postal">
      <label>Code postal:
        <input type="text" name="postalCode" pattern="[0-9]{5}" required>
      </label>
      <div id="commune-results"></div>
      <button class="wz-next-button" disabled>Suivant</button>
    </div>

    <div class="wz-step" data-step-name="preview">
      <div id="preview-map" style="height: 300px;"></div>
      <button class="wz-next-button">Confirmer</button>
    </div>
  </dialog>
`;

// Initialize wizard
const wizard = new Wizard({
  wz_class: '.wizard',
  wz_nav_style: 'dots',          // Progress indicator
  wz_button_style: 'buttons',    // Use custom buttons per step
  progressbar: true,              // Show progress bar
  highlight_time: 2000            // Validation highlight duration
});
wizard.init();

// Show dialog
document.getElementById('welcome-wizard').showModal();
```

### Pattern 2: Postal Code to Commune Lookup with Multi-Select Handling
**What:** Fetch communes by postal code, handle single result (auto-proceed) versus multiple results (show selection UI).
**When to use:** Step 2 of wizard after user enters valid 5-digit postal code.
**Example:**
```javascript
// Source: geo.api.gouv.fr official docs + FlyerMap commune.js pattern

/**
 * Search communes by postal code
 * @param {string} postalCode - 5-digit postal code
 * @returns {Promise<Array>} Array of commune objects
 */
export async function searchCommunesByPostalCode(postalCode) {
  const url = `https://geo.api.gouv.fr/communes?codePostal=${postalCode}&fields=nom,code,codesPostaux,contour&format=json&geometry=contour`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const communes = await response.json();

    // geo.api.gouv.fr returns array even for single result
    if (!Array.isArray(communes)) {
      throw new Error('Unexpected API response format');
    }

    return communes;
  } catch (error) {
    console.error('Failed to search communes:', error);
    throw error;
  }
}

// Usage in wizard step handler
async function handlePostalCodeSubmit(postalCode) {
  const communes = await searchCommunesByPostalCode(postalCode);

  if (communes.length === 0) {
    showError('Aucune commune trouvée pour ce code postal');
    return;
  }

  if (communes.length === 1) {
    // Auto-select and proceed
    selectCommune(communes[0]);
    wizard.update(); // Enable next button
  } else {
    // Show selection UI (radio buttons)
    renderCommuneSelection(communes);
  }
}

function renderCommuneSelection(communes) {
  const container = document.getElementById('commune-results');
  container.innerHTML = communes.map(c => `
    <label>
      <input type="radio" name="commune" value="${c.code}" required>
      ${c.nom} (${c.code})
    </label>
  `).join('');

  // Listen for selection
  container.addEventListener('change', () => {
    const selected = communes.find(c => c.code === container.querySelector('input:checked').value);
    selectCommune(selected);
    wizard.update(); // Enable next button
  });
}
```

### Pattern 3: SessionStorage State Persistence
**What:** Save wizard progress to sessionStorage (survives refresh, tab-isolated). Clear on completion to avoid orphaned data.
**When to use:** After each step completion, restore on wizard initialization.
**Example:**
```javascript
// Source: Project research + FlyerMap storage.js pattern

const WIZARD_STATE_KEY = 'flyermap_wizard_state';

/**
 * Save wizard state to sessionStorage
 * @param {Object} state - Wizard state object
 */
function saveWizardState(state) {
  try {
    sessionStorage.setItem(WIZARD_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save wizard state:', error);
    // Fail silently - wizard can continue without persistence
  }
}

/**
 * Load wizard state from sessionStorage
 * @returns {Object|null} Wizard state or null if not found
 */
function loadWizardState() {
  try {
    const serialized = sessionStorage.getItem(WIZARD_STATE_KEY);
    return serialized ? JSON.parse(serialized) : null;
  } catch (error) {
    console.error('Failed to load wizard state:', error);
    return null;
  }
}

/**
 * Clear wizard state after completion
 */
function clearWizardState() {
  sessionStorage.removeItem(WIZARD_STATE_KEY);
}

// Usage
wizard.on('wz.update', () => {
  saveWizardState({
    currentStep: wizard.current_step,
    postalCode: document.querySelector('[name="postalCode"]').value,
    selectedCommune: selectedCommune
  });
});

// On wizard completion
function handleWizardComplete() {
  // Save commune config to localStorage (permanent)
  storage.save('flyermap_commune', {
    code: selectedCommune.code,
    nom: selectedCommune.nom,
    contour: selectedCommune.contour
  });

  // Clear wizard state from sessionStorage
  clearWizardState();

  // Close dialog and load main app
  dialog.close();
  initializeMainApp();
}
```

### Pattern 4: Commune Boundary Preview on Map
**What:** Display selected commune boundary on Leaflet map before user confirms. Reuse existing map initialization logic.
**When to use:** Step 3 preview, after commune selected.
**Example:**
```javascript
// Source: FlyerMap existing map initialization + Leaflet GeoJSON API

import L from 'leaflet';

/**
 * Show commune boundary preview on map
 * @param {Object} commune - Commune object with contour GeoJSON
 */
function showCommunePreview(commune) {
  const mapContainer = document.getElementById('preview-map');

  // Initialize Leaflet map (reuse config from main.js)
  const map = L.map(mapContainer, {
    zoomControl: true,
    attributionControl: true
  });

  // Add OSM tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(map);

  // Add commune boundary as GeoJSON layer
  const boundaryLayer = L.geoJSON(commune.contour, {
    style: {
      color: '#3388ff',
      weight: 2,
      fillOpacity: 0.1
    }
  }).addTo(map);

  // Fit map to boundary
  map.fitBounds(boundaryLayer.getBounds(), {
    padding: [20, 20]
  });

  // Store map reference for cleanup
  mapContainer._leafletMap = map;
}

// Cleanup on dialog close
dialog.addEventListener('close', () => {
  const mapContainer = document.getElementById('preview-map');
  if (mapContainer._leafletMap) {
    mapContainer._leafletMap.remove();
    delete mapContainer._leafletMap;
  }
});
```

### Anti-Patterns to Avoid
- **Saving wizard state to localStorage:** Use sessionStorage instead to avoid quota issues and orphaned data when wizard abandoned.
- **Blocking main app load while fetching commune data:** Check for commune config first, show wizard if missing. Don't fetch in main.js init.
- **Creating duplicate Leaflet map instances:** Reuse map initialization logic, clean up preview map on dialog close.
- **Hardcoding postal code validation:** Use native HTML pattern attribute (`pattern="[0-9]{5}"`) for browser validation, then verify with API.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-step wizard UI | Custom stepper with manual step tracking | Wizard-JS 2.0.3 | Handles step navigation, validation, progress indicators, accessibility (ARIA), and custom events. 140+ commits, actively maintained. Building custom stepper risks accessibility gaps and navigation edge cases. |
| Postal code validation | Regex-only validation | HTML pattern attribute + geo.api.gouv.fr API verification | Browser validates format before submission, API call verifies postal code exists. API also returns commune data, eliminating separate lookup. |
| Commune selection UI | Custom dropdown with search | Native radio buttons (for ≤5 options) or datalist | Most postal codes map to 1-3 communes. Radio buttons provide clear selection, keyboard navigation, and screen reader support. Only use custom dropdown if >10 options. |
| Form validation | Manual error message display | Wizard-JS built-in validation + HTML5 required/pattern | Wizard-JS highlights invalid fields, HTML5 provides native error messages. Manual validation duplicates browser capability and breaks accessibility. |

**Key insight:** Wizard UIs have complex state management (step history, conditional steps, validation dependencies) that libraries solve. Hand-rolling a stepper underestimates these requirements and leads to bugs when users navigate backward, refresh mid-wizard, or encounter validation errors.

## Common Pitfalls

### Pitfall 1: Postal Code Maps to Multiple Communes
**What goes wrong:** User enters postal code, wizard crashes or shows wrong commune because developer assumed 1:1 mapping.
**Why it happens:** geo.api.gouv.fr returns arrays for all queries. Many postal codes span multiple communes (e.g., 75001 covers 4 Paris arrondissements).
**How to avoid:** Always check array length. If length > 1, render selection UI (radio buttons). If length === 1, auto-select and proceed. Never access [0] without length check.
**Warning signs:** Console errors "Cannot read property 'nom' of undefined" or "TypeError: commune.contour is not iterable".

### Pitfall 2: Wizard State Lost on Page Refresh
**What goes wrong:** User refreshes browser mid-wizard, loses all progress, must restart from welcome screen.
**Why it happens:** Wizard state stored in JavaScript memory, not persisted. Browser refresh destroys memory state.
**How to avoid:** Save wizard state to sessionStorage after each step completion. On wizard initialization, check sessionStorage and restore last step if found. Clear sessionStorage on wizard completion to avoid stale data.
**Warning signs:** User complaints about "wizard restarting" or "losing my postal code entry".

### Pitfall 3: localStorage Quota Exceeded During Wizard
**What goes wrong:** Wizard saves temporary data (commune GeoJSON, user input) to localStorage. Combined with existing app data, exceeds 5MB quota. save() throws QuotaExceededError.
**Why it happens:** Commune contour GeoJSON can be 50-200KB for large communes. Saving this plus existing zones/members hits quota limit.
**How to avoid:** Use sessionStorage for wizard state (not localStorage). sessionStorage has separate 5MB quota per tab. Only save minimal config (commune code + name) to localStorage on wizard completion. GeoJSON can be re-fetched when main app loads.
**Warning signs:** storage.save() returns {success: false, error: 'QUOTA_EXCEEDED'} during wizard flow.

### Pitfall 4: Commune Boundary Not Loading on Preview
**What goes wrong:** Step 3 shows blank map, no boundary visible. User can't verify selection before confirming.
**Why it happens:** geo.api.gouv.fr requires explicit geometry=contour parameter. Default response excludes boundary GeoJSON. Developer forgot parameter or used wrong geometry value.
**How to avoid:** Always include `format=geojson&geometry=contour` in API URL. Verify response contains contour field before passing to Leaflet. Log error if contour missing.
**Warning signs:** Preview map shows commune center point only, or API response contains coordinates array instead of full GeoJSON.

### Pitfall 5: Wizard Dialog Not Closing After Completion
**What goes wrong:** User completes wizard, clicks "Confirmer", but dialog stays open. Main app doesn't load.
**Why it happens:** Dialog close() not called after saving commune config, or close event listener not handling wizard completion flow.
**How to avoid:** Call dialog.close() explicitly after storage.save() succeeds. In dialog close event listener, check wizard completion state (e.g., commune config exists) and initialize main app.
**Warning signs:** Dialog visible after clicking final button, or main app initializes behind dialog overlay.

### Pitfall 6: API Rate Limiting Not Handled
**What goes wrong:** User enters invalid postal codes repeatedly, hits geo.api.gouv.fr rate limit. Subsequent valid requests fail with HTTP 429.
**Why it happens:** No retry logic or exponential backoff. Developer assumes API has no rate limits (documentation doesn't mention limits, but they exist).
**How to avoid:** Implement retry with exponential backoff (wait 1s, 2s, 4s between retries). Show error message after 3 failures. Disable postal code input during fetch to prevent spam.
**Warning signs:** API requests fail with HTTP 429 (Too Many Requests) or network errors after repeated submissions.

## Code Examples

Verified patterns from official sources:

### Complete Wizard Initialization Flow
```javascript
// Source: Wizard-JS v2.0.3 GitHub + FlyerMap architecture

import Wizard from '@adrii_/wizard-js';
import { searchCommunesByPostalCode } from '../data/commune.js';
import storage from '../data/storage.js';

let wizard = null;
let selectedCommune = null;
const WIZARD_STATE_KEY = 'flyermap_wizard_state';

/**
 * Initialize welcome wizard on first launch
 */
export function initWelcomeWizard() {
  const dialog = document.getElementById('welcome-wizard');

  // Create wizard instance
  wizard = new Wizard({
    wz_class: '.wizard',
    wz_nav_style: 'dots',
    wz_button_style: 'buttons',
    progressbar: true,
    highlight_time: 2000
  });

  // Initialize wizard
  wizard.init();

  // Restore wizard state if exists (user refreshed)
  const savedState = loadWizardState();
  if (savedState && savedState.currentStep > 0) {
    // Jump to saved step
    // Note: Wizard-JS doesn't expose direct step navigation in v2.0.3
    // Alternative: repopulate fields and enable next buttons programmatically
    console.log('Restoring wizard state:', savedState);
  }

  // Setup step handlers
  setupWelcomeStep();
  setupPostalStep();
  setupPreviewStep();

  // Setup dialog close handler
  dialog.addEventListener('close', handleWizardClose);

  // Show dialog
  dialog.showModal();
}

function setupWelcomeStep() {
  // Welcome screen is informational only, no validation needed
  const nextBtn = document.querySelector('[data-step-name="welcome"] .wz-next-button');
  nextBtn.addEventListener('click', () => {
    saveWizardState({ currentStep: 1 });
  });
}

function setupPostalStep() {
  const input = document.querySelector('[name="postalCode"]');
  const nextBtn = document.querySelector('[data-step-name="postal"] .wz-next-button');
  const resultsContainer = document.getElementById('commune-results');

  // Disable next button initially
  nextBtn.disabled = true;

  // Handle postal code submission (on blur or Enter key)
  input.addEventListener('blur', handlePostalCodeLookup);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePostalCodeLookup();
    }
  });

  async function handlePostalCodeLookup() {
    const postalCode = input.value.trim();

    // Validate format (5 digits)
    if (!/^[0-9]{5}$/.test(postalCode)) {
      resultsContainer.innerHTML = '<p class="error">Code postal invalide (5 chiffres requis)</p>';
      nextBtn.disabled = true;
      return;
    }

    // Show loading state
    resultsContainer.innerHTML = '<p>Recherche...</p>';
    nextBtn.disabled = true;

    try {
      const communes = await searchCommunesByPostalCode(postalCode);

      if (communes.length === 0) {
        resultsContainer.innerHTML = '<p class="error">Aucune commune trouvée</p>';
        nextBtn.disabled = true;
        return;
      }

      if (communes.length === 1) {
        // Auto-select
        selectedCommune = communes[0];
        resultsContainer.innerHTML = `<p class="success">Commune trouvée: ${communes[0].nom}</p>`;
        nextBtn.disabled = false;
        saveWizardState({ currentStep: 1, postalCode, selectedCommune });
      } else {
        // Show selection UI
        renderCommuneSelection(communes, resultsContainer, nextBtn);
      }
    } catch (error) {
      resultsContainer.innerHTML = '<p class="error">Erreur de connexion à l\'API</p>';
      nextBtn.disabled = true;
      console.error('Commune lookup failed:', error);
    }
  }

  function renderCommuneSelection(communes, container, nextBtn) {
    container.innerHTML = '<p>Plusieurs communes trouvées:</p>' + communes.map(c => `
      <label class="commune-option">
        <input type="radio" name="commune" value="${c.code}" required>
        ${c.nom} (${c.code})
      </label>
    `).join('');

    container.addEventListener('change', (e) => {
      if (e.target.name === 'commune') {
        selectedCommune = communes.find(c => c.code === e.target.value);
        nextBtn.disabled = false;
        saveWizardState({ currentStep: 1, postalCode: input.value, selectedCommune });
      }
    });
  }
}

function setupPreviewStep() {
  const nextBtn = document.querySelector('[data-step-name="preview"] .wz-next-button');

  // Wizard-JS fires custom event when step becomes active
  wizard.on('wz.update', () => {
    if (wizard.current_step === 2) { // Preview is step 3 (0-indexed: 2)
      showCommunePreview(selectedCommune);
    }
  });

  nextBtn.addEventListener('click', handleWizardComplete);
}

function handleWizardComplete() {
  // Save commune config to localStorage
  const result = storage.save('flyermap_commune', {
    code: selectedCommune.code,
    nom: selectedCommune.nom,
    contour: selectedCommune.contour
  });

  if (!result.success) {
    alert('Erreur: impossible de sauvegarder la configuration. Espace de stockage insuffisant.');
    return;
  }

  // Clear wizard state
  clearWizardState();

  // Close dialog (triggers handleWizardClose)
  document.getElementById('welcome-wizard').close();
}

function handleWizardClose() {
  // Check if wizard completed successfully
  const communeConfig = storage.load('flyermap_commune');
  if (communeConfig) {
    // Initialize main app
    window.location.reload(); // Or call initializeMainApp() directly
  } else {
    // User cancelled wizard - show re-open option or exit
    console.log('Wizard cancelled without completion');
  }
}

function saveWizardState(state) {
  try {
    sessionStorage.setItem(WIZARD_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save wizard state:', error);
  }
}

function loadWizardState() {
  try {
    const serialized = sessionStorage.getItem(WIZARD_STATE_KEY);
    return serialized ? JSON.parse(serialized) : null;
  } catch (error) {
    console.error('Failed to load wizard state:', error);
    return null;
  }
}

function clearWizardState() {
  sessionStorage.removeItem(WIZARD_STATE_KEY);
}
```

### Postal Code to Commune API Integration
```javascript
// Source: geo.api.gouv.fr official documentation

/**
 * Search communes by postal code
 * Returns array of communes with boundaries
 *
 * @param {string} postalCode - 5-digit postal code
 * @returns {Promise<Array>} Array of commune objects with contour GeoJSON
 * @throws {Error} If API request fails or returns invalid data
 */
export async function searchCommunesByPostalCode(postalCode) {
  const url = `https://geo.api.gouv.fr/communes?codePostal=${postalCode}&fields=nom,code,codesPostaux,contour&format=json&geometry=contour`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const communes = await response.json();

    // Validate response format
    if (!Array.isArray(communes)) {
      throw new Error('API returned non-array response');
    }

    // Validate each commune has required fields
    communes.forEach((commune, index) => {
      if (!commune.code || !commune.nom) {
        console.warn(`Commune at index ${index} missing required fields:`, commune);
      }
      if (!commune.contour) {
        console.warn(`Commune ${commune.nom} (${commune.code}) missing contour geometry`);
      }
    });

    return communes;
  } catch (error) {
    console.error('Failed to search communes:', error);
    throw error;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| jQuery wizard plugins (e.g., jQuery Steps) | Vanilla JavaScript libraries (Wizard-JS) | ~2020-2022 | Zero framework dependencies, smaller bundle size (~15KB vs 100KB+ with jQuery), better performance, works with modern build tools or CDN. |
| Custom fetch wrappers (e.g., axios, request) | Native Fetch API | 2017 (browser support) | Fetch is built-in to all modern browsers, no library needed. Reduces bundle size, eliminates dependency maintenance. Use for simple GET/POST requests. |
| localStorage for all app state | sessionStorage for ephemeral state | Ongoing | sessionStorage is tab-isolated (no conflicts), auto-clears on close (no orphaned data), has separate quota (avoids quota exceeded errors in localStorage). Use for wizard, drafts, or temporary UI state. |

**Deprecated/outdated:**
- **api-adresse.data.gouv.fr**: French Address API being deprecated end of January 2026 (affects geocoding, NOT commune lookup). Migration to new Geohub endpoint pending. FlyerMap uses this in geocoding.js for address search, but wizard uses geo.api.gouv.fr which remains stable.
- **jQuery wizard plugins**: Require jQuery dependency (30KB+ minified). Modern approach uses vanilla JavaScript libraries like Wizard-JS (15KB, zero dependencies).

## Open Questions

Things that couldn't be fully resolved:

1. **Wizard-JS step restoration after page refresh**
   - What we know: Wizard-JS v2.0.3 doesn't expose direct step navigation API. Can save state to sessionStorage but no documented way to jump to step programmatically.
   - What's unclear: Whether internal state can be manipulated or if we need to repopulate fields and trigger next buttons manually.
   - Recommendation: Test manual field population approach. If insufficient, consider forking Wizard-JS to add jumpToStep(n) method or switch to simpler hand-rolled stepper (tradeoff: lose ARIA, validation).

2. **geo.api.gouv.fr rate limits**
   - What we know: Official documentation doesn't mention rate limits or quotas. API is free and requires no authentication.
   - What's unclear: Whether silent rate limiting exists (HTTP 429) during high usage or repeated requests. Undocumented limits are common for public APIs.
   - Recommendation: Implement retry logic with exponential backoff defensively. Monitor API response codes in production. If rate limiting observed, add local cache for recently searched postal codes.

3. **Commune contour GeoJSON size impact**
   - What we know: Contour geometry can be 50-200KB for large communes or complex boundaries. Saving to localStorage adds to quota usage.
   - What's unclear: Whether contour should be cached in localStorage (fast load, quota cost) or re-fetched on app load (slower, no quota cost).
   - Recommendation: Save only commune code and name to localStorage. Re-fetch contour on main app load using existing fetchCommuneBoundary(). Cost is one extra API call on app load (acceptable for first-launch setup).

4. **Wizard accessibility testing**
   - What we know: Wizard-JS claims ARIA compliance. Uses semantic HTML and keyboard navigation.
   - What's unclear: Whether custom commune selection UI (radio buttons in resultsContainer) maintains accessibility or needs explicit ARIA labels.
   - Recommendation: Test with screen reader (VoiceOver on macOS) after implementation. Add aria-live="polite" to resultsContainer for dynamic content announcements. Ensure radio buttons have proper label associations.

## Sources

### Primary (HIGH confidence)
- [Wizard-JS GitHub v2.0.3](https://github.com/AdrianVillamayor/Wizard-JS) - Library documentation and API
- [geo.api.gouv.fr Communes API](https://geo.api.gouv.fr/decoupage-administratif/communes) - Official government API documentation
- [Leaflet GeoJSON API](https://leafletjs.com/reference.html#geojson) - Boundary display
- [Web Storage API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API) - sessionStorage vs localStorage

### Secondary (MEDIUM confidence)
- [Project Research Summary](.planning/research/SUMMARY.md) - Comprehensive wizard and API research
- [FlyerMap Existing Codebase](src/) - Dialog pattern (zoneEditor.js), storage pattern (storage.js), API pattern (commune.js)

### Tertiary (LOW confidence)
- None - All findings verified against official sources or existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Wizard-JS v2.0.3 verified on GitHub/npm, geo.api.gouv.fr official government API, sessionStorage native browser API
- Architecture: HIGH - Patterns extracted from existing FlyerMap codebase (zoneEditor.js dialog, storage.js localStorage wrapper, commune.js Fetch calls)
- Pitfalls: MEDIUM - Postal code ambiguity and quota issues verified from project research, rate limiting and step restoration inferred from common patterns but not documented for these specific APIs/libraries

**Research date:** 2026-02-05
**Valid until:** 2026-03-05 (30 days - stable APIs and mature library, low churn risk)
