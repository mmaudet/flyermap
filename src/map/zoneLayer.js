/**
 * Zone layer management with Leaflet-Geoman
 * Handles polygon drawing, editing, and removal
 */
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import { store, subscribe } from '../state/store.js';

// Module-level variables
let map = null;
let zoneGroup = null;
const layersByZoneId = new Map();

// Zone style constants
const ZONE_STYLE = {
  color: '#ef4444',      // Red border
  weight: 2,
  fillColor: '#fca5a5',
  fillOpacity: 0.2
};

/**
 * Initialize zone layer and Geoman controls
 * @param {L.Map} mapInstance - Leaflet map instance
 * @returns {L.FeatureGroup} Zone feature group
 */
export function initZoneLayer(mapInstance) {
  map = mapInstance;

  // Create FeatureGroup for zone management
  zoneGroup = L.featureGroup().addTo(map);

  // Add Geoman controls
  map.pm.addControls({
    position: 'topleft',
    drawMarker: false,
    drawCircleMarker: false,
    drawPolyline: false,
    drawRectangle: false,
    drawCircle: false,
    drawPolygon: true,
    editMode: true,
    dragMode: false,
    cutPolygon: false,
    removalMode: true
  });

  // Set global options for drawing
  map.pm.setGlobalOptions({
    pathOptions: ZONE_STYLE,
    snappable: true,
    snapDistance: 20,
    allowSelfIntersection: false
  });

  // Event handlers
  setupEventHandlers();

  return zoneGroup;
}

/**
 * Generate unique zone ID
 * @returns {string} Unique ID
 */
function generateZoneId() {
  return 'zone_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Setup event handlers for zone creation
 */
function setupEventHandlers() {
  // Handle zone creation
  map.on('pm:create', (e) => {
    const layer = e.layer;

    // Only handle polygons
    if (e.shape !== 'Polygon') return;

    // Add to FeatureGroup
    zoneGroup.addLayer(layer);

    // Generate ID and default name
    const zoneId = generateZoneId();
    const defaultName = `Zone ${store.getZones().length + 1}`;

    // Store ID in layer options
    layer.options.zoneId = zoneId;

    // Prompt for name (browser prompt for MVP)
    const name = prompt('Nom de la zone:', defaultName);
    const finalName = (name && name.trim()) ? name.trim() : defaultName;

    // Apply style to ensure consistency
    layer.setStyle(ZONE_STYLE);

    // Save to store
    store.addZone({
      id: zoneId,
      name: finalName,
      geojson: layer.toGeoJSON()
    });

    // Bind popup with zone name
    layer.bindPopup(`<strong>${finalName}</strong>`);

    // Store layer reference
    layersByZoneId.set(zoneId, layer);
  });
}
