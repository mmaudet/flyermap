/**
 * Welcome Wizard Module
 *
 * First-launch wizard for commune configuration using Wizard-JS.
 * Guides user through postal code entry, commune selection, and zone preview.
 */

import Wizard from '@adrii_/wizard-js';

// Module-scoped wizard instance (may be recreated)
let wizard = null;

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
 * Get current wizard instance
 *
 * @returns {Wizard|null} Current wizard instance or null if not initialized
 */
export function getWizardInstance() {
  return wizard;
}
