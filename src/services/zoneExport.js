/**
 * Zone export service - PDF and CSV generation
 */

import { jsPDF } from 'jspdf';
import { store } from '../state/store.js';
import { captureZoneMap } from '../utils/mapCapture.js';
import { getStreetsInBbox } from './overpass.js';

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
 * Export a zone as PDF document
 * @param {Object} zone - Zone object with geojson and assignedMembers
 * @param {L.Map} map - Leaflet map instance
 * @param {Function} onProgress - Progress callback (message) => void
 */
export async function exportZonePDF(zone, map, onProgress = () => {}) {
  // Fetch streets from OSM
  onProgress('Récupération des rues...');
  const streets = await getStreetsInBbox(zone.geojson);

  // Capture map screenshot
  onProgress('Capture de la carte...');
  const mapBlob = await captureZoneMap(map, zone);
  const mapDataURL = await blobToDataURL(mapBlob);

  // Generate PDF
  onProgress('Génération du PDF...');
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const margin = 15;
  const pageWidth = 210;
  const contentWidth = pageWidth - 2 * margin;
  let y = 20;

  // Zone name title
  doc.setFontSize(18);
  doc.text(zone.name, margin, y);
  y += 10;

  // Assigned members
  doc.setFontSize(12);
  const memberNames = getAssignedMemberNames(zone);
  doc.text(`Colistiers: ${memberNames}`, margin, y);
  y += 15;

  // Map image
  const imgHeight = 100;
  doc.addImage(mapDataURL, 'PNG', margin, y, contentWidth, imgHeight);
  y += imgHeight + 10;

  // Streets header
  doc.setFontSize(14);
  doc.text('Rues de la zone', margin, y);
  y += 8;

  // Street list
  doc.setFontSize(10);
  const lineHeight = 5;
  const pageHeight = 297;
  const bottomMargin = 20;

  if (streets.length === 0) {
    doc.text('Aucune rue trouvée', margin, y);
  } else {
    streets.forEach(street => {
      // Check if we need a new page
      if (y + lineHeight > pageHeight - bottomMargin) {
        doc.addPage();
        y = 20;
      }
      doc.text(`• ${street}`, margin, y);
      y += lineHeight;
    });
  }

  // Save PDF
  doc.save(`zone-${zone.name}.pdf`);

  // Return streets for potential CSV export
  return streets;
}

/**
 * Export a zone as CSV file
 * @param {Object} zone - Zone object
 * @param {string[]} streets - Array of street names (pre-fetched)
 */
export function exportZoneCSV(zone, streets) {
  const memberNames = getAssignedMemberNames(zone);

  // Build CSV rows
  const rows = [
    ['Zone', 'Rue', 'Colistiers']
  ];

  if (streets.length === 0) {
    rows.push([zone.name, '', memberNames]);
  } else {
    // First row has zone name and members
    rows.push([zone.name, streets[0], memberNames]);
    // Remaining rows just have street names
    for (let i = 1; i < streets.length; i++) {
      rows.push(['', streets[i], '']);
    }
  }

  // Escape CSV cells
  const escapeCell = (cell) => {
    const str = String(cell);
    // Escape double quotes by doubling them
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  // Build CSV content
  const csvContent = rows
    .map(row => row.map(escapeCell).join(','))
    .join('\n');

  // Add UTF-8 BOM for Excel compatibility
  const bom = '\ufeff';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' });

  // Download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `zone-${zone.name}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
