/**
 * Export and import functionality for data persistence
 */
import { store } from '../state/store.js';

/**
 * Export all data to JSON file
 */
export function exportToJSON() {
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

  // Clean up blob URL to prevent memory leak
  URL.revokeObjectURL(url);
}

/**
 * Validate imported data structure
 * @param {Object} data - Data to validate
 * @returns {boolean} True if valid
 */
function validateImportData(data) {
  if (!data.teamMembers || !data.zones) return false;
  if (!Array.isArray(data.teamMembers) || !Array.isArray(data.zones)) return false;

  // Validate team member structure
  for (const member of data.teamMembers) {
    if (!member.id || !member.name) return false;
  }

  // Validate zone structure
  for (const zone of data.zones) {
    if (!zone.id || !zone.name || !zone.geojson) return false;
  }

  return true;
}

/**
 * Import data and update store
 * @param {Object} data - Validated data to import
 */
function importData(data) {
  // Update store state directly (store.state is accessible)
  store.state.teamMembers = data.teamMembers;
  store.state.zones = data.zones;

  // Trigger reload events for all subscribers
  store.pubsub.publish('teamMembersLoaded', data.teamMembers);
  store.pubsub.publish('zonesLoaded', data.zones);

  // Save to localStorage
  store._debouncedSave();
}

/**
 * Initialize export/import functionality
 */
export function initExportImport() {
  const exportBtn = document.getElementById('export-btn');
  const fileInput = document.getElementById('import-file');

  if (!exportBtn) {
    console.error('Export button not found');
    return;
  }

  if (!fileInput) {
    console.error('Import file input not found');
    return;
  }

  exportBtn.addEventListener('click', exportToJSON);

  fileInput.addEventListener('change', () => {
    const [file] = fileInput.files;
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.json')) {
      alert('Veuillez sélectionner un fichier JSON');
      fileInput.value = '';
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Fichier trop volumineux (max 5 Mo)');
      fileInput.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);

        if (!validateImportData(data)) {
          throw new Error('Structure de données invalide');
        }

        // Confirm before overwrite
        if (!confirm('L\'import remplacera toutes les données actuelles. Continuer ?')) {
          fileInput.value = '';
          return;
        }

        importData(data);
        alert('Données importées avec succès');

      } catch (error) {
        alert('Fichier JSON invalide: ' + error.message);
      }
      fileInput.value = '';
    };

    reader.onerror = () => {
      alert('Erreur lors de la lecture du fichier');
      fileInput.value = '';
    };

    reader.readAsText(file);
  });
}
