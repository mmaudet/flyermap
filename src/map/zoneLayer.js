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

  // Load existing zones
  loadZonesFromStore();

  // Subscribe to zone reload events
  subscribe('zonesLoaded', () => {
    // Clear existing layers
    zoneGroup.clearLayers();
    layersByZoneId.clear();
    // Reload from store
    loadZonesFromStore();
  });

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
 * Load zones from store and add to map
 */
function loadZonesFromStore() {
  const zones = store.getZones();

  zones.forEach(zone => {
    // Create layer from GeoJSON
    const geoJSONLayer = L.geoJSON(zone.geojson, {
      style: ZONE_STYLE,
      onEachFeature: (feature, layer) => {
        // Store zone ID in layer
        layer.options.zoneId = zone.id;

        // Add to FeatureGroup
        zoneGroup.addLayer(layer);

        // Store reference
        layersByZoneId.set(zone.id, layer);

        // Bind popup
        layer.bindPopup(`<strong>${zone.name}</strong>`);

        // Bind edit event
        layer.on('pm:update', () => {
          store.updateZone(zone.id, {
            geojson: layer.toGeoJSON()
          });
        });
      }
    });
  });
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

  // Handle zone editing
  // Use pm:update instead of pm:edit to avoid duplicate saves during vertex drag
  // pm:update fires once when editing completes, pm:edit fires continuously
  map.on('pm:update', (e) => {
    const layer = e.layer;
    const zoneId = layer.options.zoneId;

    if (zoneId) {
      // Update zone geometry in store
      store.updateZone(zoneId, {
        geojson: layer.toGeoJSON()
      });
    }
  });

  // Handle zone removal
  map.on('pm:remove', (e) => {
    const layer = e.layer;
    const zoneId = layer.options.zoneId;

    if (zoneId) {
      // Remove from store
      store.removeZone(zoneId);

      // Clean up layer reference
      layersByZoneId.delete(zoneId);
    }
  });
}
