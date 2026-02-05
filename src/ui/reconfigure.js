/**
 * Reconfigure module - handles commune reconfiguration flow
 * Allows users to reset all data and restart the welcome wizard
 */
import storage from '../data/storage.js';
import { store } from '../state/store.js';

/**
 * Update the data counts shown in the confirmation dialog
 * Shows current number of team members and zones that will be deleted
 */
function updateDataCounts() {
  const memberCount = store.getTeamMembers().length;
  const zoneCount = store.getZones().length;

  document.getElementById('member-count').textContent = memberCount;
  document.getElementById('zone-count').textContent = zoneCount;
}

/**
 * Clear all user data from localStorage
 * Removes commune config and all team/zone data
 */
function clearAllUserData() {
  storage.remove('flyermap_commune');
  storage.remove('flyermap_data');
  console.log('FlyerMap data cleared');
}

/**
 * Initialize the reconfigure button and dialog handlers
 * Sets up click event on button and close event on dialog
 */
export function initReconfigure() {
  const btn = document.getElementById('reconfigure-btn');
  const dialog = document.getElementById('reconfigure-confirm');

  if (!btn || !dialog) {
    console.error('Reconfigure elements not found');
    return;
  }

  // Open dialog when button clicked
  btn.addEventListener('click', () => {
    updateDataCounts();
    dialog.showModal();
  });

  // Handle dialog close (form submission)
  dialog.addEventListener('close', () => {
    if (dialog.returnValue === 'confirm') {
      clearAllUserData();
      window.location.reload();
    }
    // 'cancel' or ESC - dialog just closes, data preserved
  });
}
