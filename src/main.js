import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './style.css';
import { DEFAULT_CENTER, DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM } from './map/config.js';
import { fetchCommuneBoundary } from './data/commune.js';
import { initMarkerLayer } from './map/markerLayer.js';
import { initZoneLayer } from './map/zoneLayer.js';
import { initSidePanel } from './ui/sidePanel.js';
import { initImportHandler } from './ui/importFlow.js';
import { initZoneEditor } from './ui/zoneEditor.js';
import { initExportImport } from './ui/exportImport.js';
import { initWelcomeWizard } from './ui/wizard.js';
import { loadCommuneConfig } from './data/storage.js';

// Check for commune configuration (first-launch detection)
const communeConfig = loadCommuneConfig();
if (!communeConfig) {
  // First launch - show wizard
  initWelcomeWizard();
  // Add event listener to reload page after wizard closes
  const dialog = document.getElementById('welcome-wizard');
  dialog.addEventListener('close', () => {
    // Re-check if commune config was saved
    if (loadCommuneConfig()) {
      window.location.reload(); // Reload to initialize main app with commune
    }
  });
  // Exit early - don't initialize map until wizard completes
  throw new Error('Wizard flow active - map initialization deferred');
}

// Initialize Leaflet map
const map = L.map('map', {
  center: DEFAULT_CENTER,
  zoom: DEFAULT_ZOOM,
  minZoom: MIN_ZOOM,
  maxZoom: MAX_ZOOM
});

// Add OpenStreetMap tiles with proper attribution
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: MAX_ZOOM,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Load and display commune boundary from saved config
if (communeConfig.contour) {
  L.geoJSON(communeConfig.contour, {
    style: {
      color: '#2563eb',      // Blue border
      weight: 3,
      fillColor: '#3b82f6',
      fillOpacity: 0.1
    }
  }).addTo(map);
} else {
  // Fallback: fetch if contour not saved (shouldn't happen)
  fetchCommuneBoundary()
    .then(geojson => {
      L.geoJSON(geojson, {
        style: {
          color: '#2563eb',
          weight: 3,
          fillColor: '#3b82f6',
          fillOpacity: 0.1
        }
      }).addTo(map);
    })
    .catch(error => {
      console.error('Could not display commune boundary:', error);
    });
}

// Initialize Phase 2 features
initMarkerLayer(map);
initSidePanel();
initImportHandler();

// Initialize Phase 3 features
initZoneLayer(map);

// Initialize Phase 4 features
initZoneEditor();
initExportImport();
