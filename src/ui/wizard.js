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
import { parseCSV, validateTeamMembers, normalizeTeamMember } from '../services/csvImport.js';

// Module-scoped wizard instance (may be recreated)
let wizard = null;

// Selected commune from postal code lookup
let selectedCommune = null;

// CSV import state
let selectedFile = null;
let validatedMembers = null;

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
    wz_class: '.wizard',
    wz_nav_style: 'dots',
    nav: true,
    buttons: true,
    // French labels for buttons
    prev: 'Précédent',
    next: 'Suivant',
    finish: 'Confirmer'
  });

  // Initialize wizard AFTER dialog is shown
  wizard.init();

  // Setup postal code step handler
  setupPostalStep();

  // Setup preview step handler
  setupPreviewStep();

  // Setup upload step handler
  setupUploadStep();

  // Setup wizard completion handler
  setupWizardCompletion();
}

/**
 * Setup postal code step
 *
 * Handles postal code input, API lookup, and commune selection.
 * Supports both single-result auto-selection and multi-result radio selection.
 */
function setupPostalStep() {
  const input = document.getElementById('postal-code');
  const resultsContainer = document.getElementById('commune-results');

  if (!input || !resultsContainer) {
    console.error('Postal step elements not found');
    return;
  }

  // Handle postal code lookup on blur
  input.addEventListener('blur', () => handlePostalCodeLookup(input, resultsContainer));

  // Handle Enter key
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handlePostalCodeLookup(input, resultsContainer);
    }
  });
}

/**
 * Handle postal code lookup via API
 *
 * Validates postal code, fetches communes, and handles single/multi-result cases.
 *
 * @param {HTMLInputElement} input - Postal code input element
 * @param {HTMLElement} resultsContainer - Results display container
 */
async function handlePostalCodeLookup(input, resultsContainer) {
  const postalCode = input.value.trim();

  // Validate postal code format
  if (!/^[0-9]{5}$/.test(postalCode)) {
    resultsContainer.innerHTML = '<p class="error">Code postal invalide (5 chiffres requis)</p>';
    selectedCommune = null;
    return;
  }

  // Show loading state
  resultsContainer.innerHTML = '<p>Recherche...</p>';
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
      return;
    }

    // Multiple results: show selection UI
    renderCommuneSelection(communes, resultsContainer);
  } catch (error) {
    resultsContainer.innerHTML = '<p class="error">Erreur de connexion à l\'API</p>';
    console.error('Postal code lookup failed:', error);
  }
}

/**
 * Render commune selection UI with radio buttons
 *
 * @param {Array} communes - Array of commune objects
 * @param {HTMLElement} resultsContainer - Results display container
 */
function renderCommuneSelection(communes, resultsContainer) {
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

  if (!container) {
    console.error('Wizard container not found');
    return;
  }

  // Listen for Wizard-JS navigation events
  container.addEventListener('wz.btn.next', () => {
    // Check if we're moving to the preview step (step 2, 0-indexed)
    // This fires BEFORE the step changes, so check if going to step 2
    if (wizard && wizard.current_step === 1 && selectedCommune) {
      // Will be on step 2 after this
      setTimeout(() => showCommunePreview(selectedCommune), 100);
    }
  });

  // Also handle nav clicks
  container.addEventListener('wz.nav.forward', () => {
    if (wizard && wizard.current_step === 2 && selectedCommune) {
      setTimeout(() => showCommunePreview(selectedCommune), 100);
    }
  });
}

/**
 * Setup upload step with drag-and-drop support
 *
 * Handles CSV file upload via drag-and-drop or file browser button.
 */
function setupUploadStep() {
  const dropZone = document.getElementById('csv-drop-zone');
  const fileInput = document.getElementById('wizard-csv-input');
  const fileInfo = document.getElementById('csv-file-info');

  if (!dropZone || !fileInput) {
    console.error('Upload step elements not found');
    return;
  }

  // Prevent default drag behaviors
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  // Add visual feedback on drag
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

  // Handle drop event
  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    const csvFile = Array.from(files).find(f => f.name.toLowerCase().endsWith('.csv'));

    if (!csvFile) {
      if (fileInfo) {
        fileInfo.hidden = false;
        fileInfo.innerHTML = '<span class="error">Veuillez deposer un fichier CSV</span>';
      }
      return;
    }

    handleFileSelected(csvFile);
  });

  // Handle file input change
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelected(file);
    }
  });
}

/**
 * Handle file selection from drop or file picker
 *
 * Validates file extension, warns on large files, and updates UI.
 *
 * @param {File} file - Selected file
 */
function handleFileSelected(file) {
  const fileInfo = document.getElementById('csv-file-info');

  // Validate extension
  if (!file.name.toLowerCase().endsWith('.csv')) {
    if (fileInfo) {
      fileInfo.hidden = false;
      fileInfo.innerHTML = '<span class="error">Le fichier doit etre au format CSV</span>';
    }
    return;
  }

  // Warn if file > 1MB
  if (file.size > 1024 * 1024) {
    if (!confirm(`Le fichier fait ${(file.size / 1024 / 1024).toFixed(1)} Mo. Continuer ?`)) {
      return;
    }
  }

  // Store file and clear previous validation
  selectedFile = file;
  validatedMembers = null;

  // Show file info
  if (fileInfo) {
    fileInfo.hidden = false;
    const sizeKB = (file.size / 1024).toFixed(1);
    fileInfo.innerHTML = `<strong>${file.name}</strong> (${sizeKB} Ko)`;
  }
}

/**
 * Setup wizard completion handler
 *
 * Listens for the wizard end event and saves configuration.
 */
function setupWizardCompletion() {
  const container = document.querySelector('.wizard');

  if (!container) {
    return;
  }

  // Listen for wizard end event (when Finish/Confirm button is clicked)
  container.addEventListener('wz.end', (e) => {
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

  // Close dialog
  const dialog = document.getElementById('welcome-wizard');
  if (dialog) {
    dialog.close();
  }
}

/**
 * Get current wizard instance
 *
 * @returns {Wizard|null} Current wizard instance or null if not initialized
 */
export function getWizardInstance() {
  return wizard;
}
