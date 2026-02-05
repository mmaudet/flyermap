/**
 * Welcome Wizard Module
 *
 * First-launch wizard for commune configuration using Wizard-JS.
 * Guides user through postal code entry, commune selection, and zone preview.
 */

import Wizard from '@adrii_/wizard-js';
import '@adrii_/wizard-js/style.css';
import L from 'leaflet';
import { searchCommunesByPostalCode } from '../data/commune.js';
import { saveCommuneConfig } from '../data/storage.js';

// Module-scoped wizard instance (may be recreated)
let wizard = null;

// Selected commune from postal code lookup
let selectedCommune = null;

/**
 * Initialize and display the welcome wizard
 *
 * Sets up Wizard-JS with progress stepper and step navigation,
 * then displays the wizard modal dialog.
 */
export function initWelcomeWizard() {
  // Get dialog element
  const dialog = document.getElementById('welcome-wizard');
  if (!dialog) {
    console.error('Welcome wizard dialog not found');
    return;
  }

  // Add dialog close listener for map cleanup
  dialog.addEventListener('close', () => {
    const mapContainer = document.getElementById('preview-map');
    if (mapContainer && mapContainer._leafletMap) {
      mapContainer._leafletMap.remove();
      delete mapContainer._leafletMap;
    }
  });

  // Display wizard modal FIRST (so DOM is accessible)
  dialog.showModal();

  // Create Wizard instance with configuration
  wizard = new Wizard({
    wz_class: '.wizard',           // Container selector
    wz_nav_style: 'dots',           // Progress indicator style (dots for steps)
    wz_button_style: 'buttons',     // Use custom buttons per step
    progressbar: true               // Show progress bar
  });

  // Initialize wizard AFTER dialog is shown
  wizard.init();

  // Setup welcome step handler
  setupWelcomeStep();

  // Setup postal code step handler
  setupPostalStep();

  // Setup preview step handler
  setupPreviewStep();
}

/**
 * Setup welcome step navigation
 *
 * Handles "Commencer" button click to advance to next step.
 * Wizard-JS handles the actual navigation automatically.
 */
function setupWelcomeStep() {
  const welcomeButton = document.querySelector('[data-step-name="welcome"] .wz-next-button');

  if (!welcomeButton) {
    console.error('Welcome step next button not found');
    return;
  }

  // Add click listener - Wizard-JS will handle step transition
  welcomeButton.addEventListener('click', () => {
    // Wizard-JS automatically advances to next step when next button clicked
    // No explicit navigation needed here
    console.log('Welcome step completed, advancing to postal code step');
  });
}

/**
 * Setup postal code step
 *
 * Handles postal code input, API lookup, and commune selection.
 * Supports both single-result auto-selection and multi-result radio selection.
 */
function setupPostalStep() {
  const input = document.getElementById('postal-code');
  const nextButton = document.querySelector('[data-step-name="postal"] .wz-next-button');
  const resultsContainer = document.getElementById('commune-results');

  if (!input || !nextButton || !resultsContainer) {
    console.error('Postal step elements not found');
    return;
  }

  // Disable next button initially
  nextButton.disabled = true;

  // Handle postal code lookup on blur
  input.addEventListener('blur', () => handlePostalCodeLookup(input, nextButton, resultsContainer));

  // Handle Enter key
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePostalCodeLookup(input, nextButton, resultsContainer);
    }
  });
}

/**
 * Handle postal code lookup via API
 *
 * Validates postal code, fetches communes, and handles single/multi-result cases.
 *
 * @param {HTMLInputElement} input - Postal code input element
 * @param {HTMLButtonElement} nextButton - Next step button
 * @param {HTMLElement} resultsContainer - Results display container
 */
async function handlePostalCodeLookup(input, nextButton, resultsContainer) {
  const postalCode = input.value.trim();

  // Validate postal code format
  if (!/^[0-9]{5}$/.test(postalCode)) {
    resultsContainer.innerHTML = '<p class="error">Code postal invalide (5 chiffres requis)</p>';
    nextButton.disabled = true;
    selectedCommune = null;
    return;
  }

  // Show loading state
  resultsContainer.innerHTML = '<p>Recherche...</p>';
  nextButton.disabled = true;
  selectedCommune = null;

  try {
    // Call API
    const communes = await searchCommunesByPostalCode(postalCode);

    // Handle empty results
    if (communes.length === 0) {
      resultsContainer.innerHTML = '<p class="error">Aucune commune trouvée</p>';
      return;
    }

    // Single result: auto-select
    if (communes.length === 1) {
      selectedCommune = communes[0];
      resultsContainer.innerHTML = `<p class="success">Commune trouvée : <strong>${communes[0].nom}</strong> (${communes[0].code})</p>`;
      nextButton.disabled = false;
      return;
    }

    // Multiple results: show selection UI
    renderCommuneSelection(communes, nextButton, resultsContainer);
  } catch (error) {
    resultsContainer.innerHTML = '<p class="error">Erreur de connexion à l\'API</p>';
    console.error('Postal code lookup failed:', error);
  }
}

/**
 * Render commune selection UI with radio buttons
 *
 * @param {Array} communes - Array of commune objects
 * @param {HTMLButtonElement} nextButton - Next step button
 * @param {HTMLElement} resultsContainer - Results display container
 */
function renderCommuneSelection(communes, nextButton, resultsContainer) {
  let html = '<p>Plusieurs communes trouvées :</p>';

  for (const commune of communes) {
    html += `
      <label class="commune-option">
        <input type="radio" name="commune" value="${commune.code}" required>
        ${commune.nom} (${commune.code})
      </label>
    `;
  }

  resultsContainer.innerHTML = html;

  // Handle radio button selection
  resultsContainer.addEventListener('change', (e) => {
    if (e.target.name === 'commune') {
      const selectedCode = e.target.value;
      selectedCommune = communes.find(c => c.code === selectedCode);
      nextButton.disabled = false;
    }
  });
}

/**
 * Setup preview step
 *
 * Listens for step changes and displays commune boundary preview
 * when the preview step becomes active.
 */
function setupPreviewStep() {
  const container = document.querySelector('.wizard');
  const nextButton = document.querySelector('[data-step-name="preview"] .wz-next-button');

  if (!container || !nextButton) {
    console.error('Preview step elements not found');
    return;
  }

  // Listen for Wizard-JS step change events
  container.addEventListener('wz.update', () => {
    // Check if we're on the preview step (0-indexed, step 2)
    if (wizard && wizard.current_step === 2 && selectedCommune) {
      showCommunePreview(selectedCommune);
    }
  });

  // Handle wizard completion on confirm button click
  nextButton.addEventListener('click', (e) => {
    e.preventDefault();
    handleWizardComplete();
  });
}

/**
 * Show commune boundary preview on map
 *
 * @param {Object} commune - Commune object with nom and contour
 */
function showCommunePreview(commune) {
  // Update commune name display
  const nameElement = document.getElementById('preview-commune-name');
  if (nameElement) {
    nameElement.textContent = `Commune : ${commune.nom}`;
  }

  // Get map container
  const mapContainer = document.getElementById('preview-map');
  if (!mapContainer) {
    console.error('Preview map container not found');
    return;
  }

  // Cleanup existing map if present
  if (mapContainer._leafletMap) {
    mapContainer._leafletMap.remove();
    delete mapContainer._leafletMap;
  }

  // Initialize Leaflet map
  const map = L.map(mapContainer, {
    zoomControl: true,
    attributionControl: true
  });

  // Add OSM tile layer
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
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
  map.fitBounds(boundaryLayer.getBounds(), { padding: [20, 20] });

  // Store map reference for cleanup
  mapContainer._leafletMap = map;
}

/**
 * Handle wizard completion
 *
 * Saves commune config to localStorage and closes the wizard dialog.
 */
function handleWizardComplete() {
  if (!selectedCommune) {
    console.error('No commune selected');
    return;
  }

  // Save commune configuration
  const result = saveCommuneConfig(selectedCommune);

  if (!result.success) {
    alert('Erreur lors de la sauvegarde. Veuillez réessayer.');
    console.error('Save commune config failed:', result.error);
    return;
  }

  // Clear wizard state
  clearWizardState();

  // Close dialog
  const dialog = document.getElementById('welcome-wizard');
  if (dialog) {
    dialog.close();
  }
}

/**
 * Clear wizard state
 *
 * Stub function for sessionStorage cleanup if persistence is added later.
 */
function clearWizardState() {
  // TODO: Implement sessionStorage cleanup if persistence added
}

/**
 * Get current wizard instance
 *
 * @returns {Wizard|null} Current wizard instance or null if not initialized
 */
export function getWizardInstance() {
  return wizard;
}
