/**
 * Export and import functionality for data persistence
 */
import { store } from '../state/store.js';
import { getStreetsInBbox } from '../services/overpass.js';
import { jsPDF } from 'jspdf';
import { captureZoneMap } from '../utils/mapCapture.js';

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
  a.download = `flyermap-export-${Date.now()}.json`;
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

// Map instance reference for PDF export
let mapInstance = null;

/**
 * Get assigned member names for a zone
 * @param {Object} zone - Zone object
 * @returns {string} Comma-separated member names
 */
function getAssignedMemberNames(zone) {
  if (!zone.assignedMembers || zone.assignedMembers.length === 0) {
    return 'Aucun';
  }
  const members = store.getTeamMembers();
  return zone.assignedMembers
    .map(id => members.find(m => m.id === id))
    .filter(Boolean)
    .map(m => m.name)
    .join(', ') || 'Aucun';
}

/**
 * Convert a blob to base64 data URL
 * @param {Blob} blob - Image blob
 * @returns {Promise<string>} Base64 data URL
 */
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Export all zones to a combined PDF file
 */
async function exportAllZones() {
  const zones = store.getZones();

  if (zones.length === 0) {
    alert('Aucune zone à exporter');
    return;
  }

  if (!mapInstance) {
    alert('Carte non initialisée');
    return;
  }

  const btn = document.getElementById('export-all-zones-btn');
  const originalText = btn.textContent;

  try {
    btn.disabled = true;

    // Create PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const margin = 15;
    const pageWidth = 210;
    const contentWidth = pageWidth - 2 * margin;
    const pageHeight = 297;
    const bottomMargin = 20;

    for (let i = 0; i < zones.length; i++) {
      const zone = zones[i];
      btn.textContent = `Zone ${i + 1}/${zones.length}...`;

      // Add new page for each zone (except first)
      if (i > 0) {
        doc.addPage();
      }

      let y = 20;

      // Zone name title
      doc.setFontSize(18);
      doc.text(zone.name, margin, y);
      y += 10;

      // Assigned members
      doc.setFontSize(12);
      const memberNames = getAssignedMemberNames(zone);
      doc.text(`Colistiers: ${memberNames}`, margin, y);
      y += 8;

      // Mailbox count if available
      if (zone.mailboxCount) {
        doc.text(`Boîtes aux lettres: ${zone.mailboxCount}`, margin, y);
        y += 10;
      } else {
        y += 2;
      }

      // Capture map screenshot
      btn.textContent = `Zone ${i + 1}/${zones.length} - Capture...`;
      try {
        const mapBlob = await captureZoneMap(mapInstance, zone);
        const mapDataURL = await blobToDataURL(mapBlob);

        // Map image
        const imgHeight = 80;
        doc.addImage(mapDataURL, 'PNG', margin, y, contentWidth, imgHeight);
        y += imgHeight + 8;
      } catch (e) {
        console.warn(`Failed to capture map for zone ${zone.name}:`, e);
        doc.setFontSize(10);
        doc.text('(Capture de carte échouée)', margin, y);
        y += 10;
      }

      // Get streets from OSM
      btn.textContent = `Zone ${i + 1}/${zones.length} - Rues...`;
      let streets = [];
      try {
        streets = await getStreetsInBbox(zone.geojson);
      } catch (e) {
        console.warn(`Failed to get streets for zone ${zone.name}:`, e);
      }

      // Streets header
      doc.setFontSize(14);
      doc.text('Rues de la zone', margin, y);
      y += 7;

      // Street list
      doc.setFontSize(10);
      const lineHeight = 5;

      if (streets.length === 0) {
        doc.text('Aucune rue trouvée', margin, y);
      } else {
        for (const street of streets) {
          // Check if we need a new page
          if (y + lineHeight > pageHeight - bottomMargin) {
            doc.addPage();
            y = 20;
            doc.setFontSize(10);
          }
          doc.text(`• ${street}`, margin, y);
          y += lineHeight;
        }
      }

      // Notes if available
      if (zone.notes) {
        y += 5;
        if (y + 20 > pageHeight - bottomMargin) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(12);
        doc.text('Notes:', margin, y);
        y += 6;
        doc.setFontSize(10);
        const noteLines = doc.splitTextToSize(zone.notes, contentWidth);
        doc.text(noteLines, margin, y);
      }
    }

    // Save PDF
    doc.save(`toutes-zones-${Date.now()}.pdf`);

    btn.textContent = 'Exporté !';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);

  } catch (error) {
    console.error('Export all zones failed:', error);
    alert('Erreur lors de l\'export: ' + error.message);
    btn.textContent = originalText;
  } finally {
    btn.disabled = false;
  }
}

/**
 * Initialize export/import functionality
 * @param {L.Map} map - Leaflet map instance for PDF export
 */
export function initExportImport(map) {
  mapInstance = map;

  const exportBtn = document.getElementById('export-btn');
  const fileInput = document.getElementById('import-file');
  const exportAllBtn = document.getElementById('export-all-zones-btn');

  if (!exportBtn) {
    console.error('Export button not found');
    return;
  }

  if (!fileInput) {
    console.error('Import file input not found');
    return;
  }

  exportBtn.addEventListener('click', exportToJSON);

  if (exportAllBtn) {
    exportAllBtn.addEventListener('click', exportAllZones);
  }

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
