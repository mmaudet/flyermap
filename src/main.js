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

// Load and display commune boundary
fetchCommuneBoundary()
  .then(geojson => {
    L.geoJSON(geojson, {
      style: {
        color: '#2563eb',      // Blue border
        weight: 3,
        fillColor: '#3b82f6',
        fillOpacity: 0.1
      }
    }).addTo(map);
  })
  .catch(error => {
    console.error('Could not display commune boundary:', error);
  });

// Initialize Phase 2 features
initMarkerLayer(map);
initSidePanel();
initImportHandler();

// Initialize Phase 3 features
initZoneLayer(map);

// Initialize Phase 4 features
initZoneEditor();
initExportImport();
