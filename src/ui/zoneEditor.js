/**
 * Zone editor dialog component
 * Handles team assignment, zone naming, and metadata editing
 */
import { store } from '../state/store.js';
import { updateZoneStyle } from '../map/zoneLayer.js';

let dialog = null;

/**
 * Initialize zone editor dialog
 * Sets up form handlers and event listeners
 */
export function initZoneEditor() {
  dialog = document.getElementById('zone-editor');
  const form = dialog.querySelector('form');

  // Handle dialog close to process form data
  dialog.addEventListener('close', () => {
    // Check if user clicked "save" button
    if (dialog.returnValue === 'save') {
      // Get zone ID from dialog dataset
      const zoneId = dialog.dataset.zoneId;
      if (!zoneId) {
        console.error('No zone ID found in dialog');
        return;
      }

      // Collect form data
      const formData = new FormData(form);
      const name = formData.get('name');
      const mailboxCount = formData.get('mailboxCount');
      const notes = formData.get('notes');

      // Get selected members from multi-select
      const selectElement = document.getElementById('assigned-members');
      const assignedMembers = Array.from(selectElement.selectedOptions).map(option => option.value);

      // Update zone in store
      store.updateZone(zoneId, {
        name,
        assignedMembers,
        mailboxCount: mailboxCount ? parseInt(mailboxCount, 10) : null,
        notes: notes || ''
      });

      // Update visual style immediately
      updateZoneStyle(zoneId);

      // Update popup content
      // Note: This will be reflected when zone is clicked again
    }

    // Reset form for both save and cancel
    form.reset();
  });
}

/**
 * Open zone editor dialog for a specific zone
 * @param {Object} zone - Zone object from store
 */
export function openZoneEditor(zone) {
  if (!dialog) {
    console.error('Zone editor not initialized');
    return;
  }

  // Store zone ID for later reference
  dialog.dataset.zoneId = zone.id;

  // Populate zone name
  document.getElementById('zone-name').value = zone.name || '';

  // Populate mailbox count
  document.getElementById('mailbox-count').value = zone.mailboxCount || '';

  // Populate notes
  document.getElementById('zone-notes').value = zone.notes || '';

  // Populate team member select
  const selectElement = document.getElementById('assigned-members');
  selectElement.innerHTML = ''; // Clear existing options

  const teamMembers = store.getTeamMembers();
  teamMembers.forEach(member => {
    const option = document.createElement('option');
    option.value = member.id;
    option.textContent = `${member.name} - ${member.address}`;

    // Mark as selected if member is assigned to this zone
    if (zone.assignedMembers && zone.assignedMembers.includes(member.id)) {
      option.selected = true;
    }

    selectElement.appendChild(option);
  });

  // Show the dialog as modal
  dialog.showModal();
}
