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
 * Initialize export/import functionality
 */
export function initExportImport() {
  const exportBtn = document.getElementById('export-btn');

  if (!exportBtn) {
    console.error('Export button not found');
    return;
  }

  exportBtn.addEventListener('click', exportToJSON);
}
