/**
 * Welcome Wizard Module
 *
 * First-launch wizard for commune configuration using Wizard-JS.
 * Guides user through postal code entry, commune selection, and zone preview.
 */

import Wizard from '@adrii_/wizard-js';
import { searchCommunesByPostalCode } from '../data/commune.js';

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

  // Create Wizard instance with configuration
  wizard = new Wizard({
    wz_class: '.wizard',           // Container selector
    wz_nav_style: 'dots',           // Progress indicator style (dots for steps)
    wz_button_style: 'buttons',     // Use custom buttons per step
    progressbar: true               // Show progress bar
  });

  // Initialize wizard
  wizard.init();

  // Setup welcome step handler
  setupWelcomeStep();

  // Setup postal code step handler
  setupPostalStep();

  // Display wizard modal
  dialog.showModal();
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
 * Get current wizard instance
 *
 * @returns {Wizard|null} Current wizard instance or null if not initialized
 */
export function getWizardInstance() {
  return wizard;
}
