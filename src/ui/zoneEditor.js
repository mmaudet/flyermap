/**
 * Zone editor dialog component
 * Handles team assignment, zone naming, and metadata editing
 */
import { store } from '../state/store.js';
import { updateZoneStyle, removeZone } from '../map/zoneLayer.js';
import { countBuildingsDetailed, getStreetsInBbox } from '../services/overpass.js';
import { getTeamMemberColor } from '../map/markerStyles.js';
import { exportZonePDF, exportZoneCSV } from '../services/zoneExport.js';

let dialog = null;
let currentZone = null;
let mapInstance = null;

/**
 * Initialize zone editor dialog
 * Sets up form handlers and event listeners
 * @param {L.Map} map - Leaflet map instance for export capture
 */
export function initZoneEditor(map) {
  mapInstance = map;
  dialog = document.getElementById('zone-editor');
  const form = dialog.querySelector('form');

  // Handle estimate button
  const estimateBtn = document.getElementById('estimate-btn');
  estimateBtn.addEventListener('click', handleEstimate);

  // Handle delete button
  const deleteBtn = document.getElementById('delete-zone-btn');
  deleteBtn.addEventListener('click', handleDelete);

  // Handle export buttons
  const exportPdfBtn = document.getElementById('export-pdf-btn');
  const exportCsvBtn = document.getElementById('export-csv-btn');
  exportPdfBtn.addEventListener('click', handleExportPDF);
  exportCsvBtn.addEventListener('click', handleExportCSV);

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

      // Get selected members from checkboxes
      const checkboxes = document.querySelectorAll('#members-checkboxes input[type="checkbox"]:checked');
      const assignedMembers = Array.from(checkboxes).map(cb => cb.value);

      // Update zone in store
      store.updateZone(zoneId, {
        name,
        assignedMembers,
        mailboxCount: mailboxCount ? parseInt(mailboxCount, 10) : null,
        notes: notes || ''
      });

      // Update visual style immediately
      updateZoneStyle(zoneId);
    }

    // Reset form and clear status
    form.reset();
    document.getElementById('estimate-status').textContent = '';
    document.getElementById('export-status').textContent = '';
    currentZone = null;
  });
}

/**
 * Handle delete button click
 */
function handleDelete() {
  if (!currentZone) return;

  const zoneName = currentZone.name || 'cette zone';
  if (confirm(`Supprimer "${zoneName}" ? Cette action est irréversible.`)) {
    removeZone(currentZone.id);
    dialog.close();
  }
}

/**
 * Handle estimate button click
 */
async function handleEstimate() {
  if (!currentZone || !currentZone.geojson) {
    return;
  }

  const statusEl = document.getElementById('estimate-status');
  const mailboxInput = document.getElementById('mailbox-count');
  const estimateBtn = document.getElementById('estimate-btn');

  try {
    estimateBtn.disabled = true;
    statusEl.textContent = 'Interrogation OpenStreetMap...';
    statusEl.className = '';

    const count = await countBuildingsDetailed(currentZone.geojson);

    mailboxInput.value = count;
    statusEl.textContent = `${count} bâtiments trouvés via OSM`;
    statusEl.className = 'success';
  } catch (error) {
    statusEl.textContent = 'Erreur: impossible de contacter OSM';
    statusEl.className = 'error';
  } finally {
    estimateBtn.disabled = false;
  }
}

/**
 * Open zone editor dialog for a specific zone
 * @param {Object} zone - Zone object from store
 */
export function openZoneEditor(zone) {
  if (!dialog) {
    console.error('Zone editor not initialized - dialog is null');
    return;
  }

  // Store current zone for estimation
  currentZone = zone;

  // Store zone ID for later reference
  dialog.dataset.zoneId = zone.id;

  // Populate zone name
  document.getElementById('zone-name').value = zone.name || '';

  // Populate mailbox count
  document.getElementById('mailbox-count').value = zone.mailboxCount || '';

  // Populate notes
  document.getElementById('zone-notes').value = zone.notes || '';

  // Clear estimate status
  document.getElementById('estimate-status').textContent = '';

  // Populate team member checkboxes
  const container = document.getElementById('members-checkboxes');
  container.innerHTML = '';

  const teamMembers = store.getTeamMembers();
  teamMembers.forEach((member, index) => {
    const isChecked = zone.assignedMembers && zone.assignedMembers.includes(member.id);
    const color = getTeamMemberColor(index);

    const label = document.createElement('label');
    label.className = `member-checkbox ${isChecked ? 'checked' : ''}`;
    label.style.borderLeftColor = color;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = member.id;
    checkbox.checked = isChecked;
    checkbox.addEventListener('change', () => {
      label.classList.toggle('checked', checkbox.checked);
    });

    const colorDot = document.createElement('span');
    colorDot.className = 'color-dot';
    colorDot.style.backgroundColor = color;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'member-name';
    nameSpan.textContent = member.name;

    label.appendChild(checkbox);
    label.appendChild(colorDot);
    label.appendChild(nameSpan);
    container.appendChild(label);
  });

  // Clear export status
  document.getElementById('export-status').textContent = '';

  // Show the dialog as modal
  dialog.showModal();
}

/**
 * Handle PDF export button click
 */
async function handleExportPDF() {
  if (!currentZone || !mapInstance) return;

  const exportPdfBtn = document.getElementById('export-pdf-btn');
  const exportCsvBtn = document.getElementById('export-csv-btn');
  const exportStatus = document.getElementById('export-status');

  try {
    exportPdfBtn.disabled = true;
    exportCsvBtn.disabled = true;
    exportStatus.className = '';

    await exportZonePDF(currentZone, mapInstance, (message) => {
      exportStatus.textContent = message;
    });

    exportStatus.textContent = 'PDF téléchargé';
    exportStatus.className = 'success';
  } catch (error) {
    console.error('PDF export failed:', error);
    exportStatus.textContent = 'Erreur: ' + error.message;
    exportStatus.className = 'error';
  } finally {
    exportPdfBtn.disabled = false;
    exportCsvBtn.disabled = false;
  }
}

/**
 * Handle CSV export button click
 */
async function handleExportCSV() {
  if (!currentZone) return;

  const exportPdfBtn = document.getElementById('export-pdf-btn');
  const exportCsvBtn = document.getElementById('export-csv-btn');
  const exportStatus = document.getElementById('export-status');

  try {
    exportPdfBtn.disabled = true;
    exportCsvBtn.disabled = true;
    exportStatus.textContent = 'Récupération des rues...';
    exportStatus.className = '';

    const streets = await getStreetsInBbox(currentZone.geojson);
    exportZoneCSV(currentZone, streets);

    exportStatus.textContent = 'CSV téléchargé';
    exportStatus.className = 'success';
  } catch (error) {
    console.error('CSV export failed:', error);
    exportStatus.textContent = 'Erreur: ' + error.message;
    exportStatus.className = 'error';
  } finally {
    exportPdfBtn.disabled = false;
    exportCsvBtn.disabled = false;
  }
}
