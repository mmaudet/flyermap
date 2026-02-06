/**
 * Zone layer management with Leaflet-Geoman
 * Handles polygon drawing, editing, and removal
 */
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import { store, subscribe } from '../state/store.js';
import { openZoneEditor } from '../ui/zoneEditor.js';
import { getTeamMemberColor } from '../map/markerStyles.js';
import { countBuildingsDetailed } from '../services/overpass.js';

// Module-level variables
let map = null;
let zoneGroup = null;
const layersByZoneId = new Map();
const estimatingZones = new Set();

/**
 * Check if a zone is currently being estimated
 * @param {string} zoneId - Zone ID
 * @returns {boolean}
 */
export function isEstimating(zoneId) {
  return estimatingZones.has(zoneId);
}

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

  // Bring zones to front after a short delay to ensure they're above other layers
  setTimeout(() => {
    zoneGroup.bringToFront();
  }, 1000);

  // Subscribe to zone reload events
  subscribe('zonesLoaded', () => {
    // Clear existing layers
    zoneGroup.clearLayers();
    layersByZoneId.clear();
    // Reload from store
    loadZonesFromStore();
  });

  // Subscribe to zone update events for style refresh
  subscribe('zoneUpdated', (zone) => {
    updateZoneStyle(zone.id);
  });

  return zoneGroup;
}

/**
 * Remove a zone from the map and store
 * @param {string} zoneId - Zone ID to remove
 */
export function removeZone(zoneId) {
  const layer = layersByZoneId.get(zoneId);
  if (layer) {
    zoneGroup.removeLayer(layer);
    layersByZoneId.delete(zoneId);
  }
  store.removeZone(zoneId);
}

/**
 * Update zone style based on assignment
 * @param {string} zoneId - Zone ID to update
 */
export function updateZoneStyle(zoneId) {
  const layer = layersByZoneId.get(zoneId);
  if (!layer) return;

  const zone = store.getZones().find(z => z.id === zoneId);
  if (!zone) return;

  if (zone.assignedMembers && zone.assignedMembers.length > 0) {
    // Use first assigned member's color
    const members = store.getTeamMembers();
    const memberIndex = members.findIndex(m => m.id === zone.assignedMembers[0]);

    if (memberIndex !== -1) {
      const color = getTeamMemberColor(memberIndex);
      layer.setStyle({
        color: color,
        fillColor: color,
        fillOpacity: 0.3,
        weight: 2
      });
    }
  } else {
    // Unassigned - red (original style)
    layer.setStyle(ZONE_STYLE);
  }
}

/**
 * Load zones from store and add to map
 */
function loadZonesFromStore() {
  const zones = store.getZones();

  zones.forEach(zone => {
    // Extract coordinates from GeoJSON and convert to Leaflet format
    // GeoJSON uses [lng, lat], Leaflet uses [lat, lng]
    const coords = zone.geojson.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);

    // Create polygon directly (more reliable for click events)
    const layer = L.polygon(coords, {
      ...ZONE_STYLE,
      zoneId: zone.id,
      interactive: true,
      bubblingMouseEvents: false
    });

    // Add to FeatureGroup
    zoneGroup.addLayer(layer);

    // Store reference
    layersByZoneId.set(zone.id, layer);

    // Apply correct style based on assignment
    updateZoneStyle(zone.id);

    // Bind click event to open editor
    layer.on('click', (e) => {
      // Don't open editor if we're in edit mode
      if (map.pm.globalEditModeEnabled() || map.pm.globalRemovalModeEnabled()) {
        return;
      }
      L.DomEvent.stopPropagation(e);
      const currentZone = store.getZones().find(z => z.id === zone.id);
      if (currentZone) {
        openZoneEditor(currentZone);
      }
    });

    // Bind edit event for Geoman
    layer.on('pm:update', () => {
      store.updateZone(zone.id, {
        geojson: layer.toGeoJSON()
      });
    });
  });
}

/**
 * Setup event handlers for zone creation
 */
function setupEventHandlers() {
  // Handle zone creation
  map.on('pm:create', (e) => {
    const geomanLayer = e.layer;

    // Only handle polygons
    if (e.shape !== 'Polygon') return;

    // Default name
    const defaultName = `Zone ${store.getZones().length + 1}`;

    // Prompt for name (browser prompt for MVP)
    const name = prompt('Nom de la zone:', defaultName);
    const finalName = (name && name.trim()) ? name.trim() : defaultName;

    // Get coordinates from Geoman layer
    const coords = geomanLayer.getLatLngs()[0];

    // Remove Geoman layer from map (it was auto-added)
    map.removeLayer(geomanLayer);

    // Create our own polygon with proper options (zoneId will be set after store.addZone)
    const layer = L.polygon(coords, {
      ...ZONE_STYLE,
      interactive: true,
      bubblingMouseEvents: false
    });

    // Add to FeatureGroup
    zoneGroup.addLayer(layer);

    // Save to store - use the returned zone to get the actual ID
    const geojson = layer.toGeoJSON();
    const savedZone = store.addZone({
      name: finalName,
      geojson: geojson
    });
    const zoneId = savedZone.id;

    // Now set the zoneId in layer options
    layer.options.zoneId = zoneId;

    // Bind click event to open editor
    layer.on('click', (e) => {
      // Don't open editor if we're in edit or draw mode
      if (map.pm.globalEditModeEnabled() || map.pm.globalRemovalModeEnabled() || map.pm.globalDrawModeEnabled()) {
        return;
      }
      L.DomEvent.stopPropagation(e);
      const zone = store.getZones().find(z => z.id === zoneId);
      if (zone) {
        openZoneEditor(zone);
      }
    });

    // Bind edit event
    layer.on('pm:update', () => {
      store.updateZone(zoneId, {
        geojson: layer.toGeoJSON()
      });
    });

    // Store layer reference
    layersByZoneId.set(zoneId, layer);

    // Auto-estimate building count via OSM
    estimatingZones.add(zoneId);
    countBuildingsDetailed(geojson).then(count => {
      store.updateZone(zoneId, { mailboxCount: count });
    }).catch(err => {
      console.warn(`Auto-estimate failed for ${finalName}:`, err.message);
    }).finally(() => {
      estimatingZones.delete(zoneId);
    });

    // Bring zones to front after adding new zone
    zoneGroup.bringToFront();
  });

  // Handle zone editing
  // Use pm:update instead of pm:edit to avoid duplicate saves during vertex drag
  // pm:update fires once when editing completes, pm:edit fires continuously
  map.on('pm:update', (e) => {
    const layer = e.layer;
    const zoneId = layer.options.zoneId;

    if (zoneId) {
      // Update zone geometry in store
      const updatedGeojson = layer.toGeoJSON();
      store.updateZone(zoneId, {
        geojson: updatedGeojson
      });

      // Re-estimate building count for new geometry
      estimatingZones.add(zoneId);
      countBuildingsDetailed(updatedGeojson).then(count => {
        store.updateZone(zoneId, { mailboxCount: count });
      }).catch(err => {
        console.warn(`Auto-estimate failed after edit:`, err.message);
      }).finally(() => {
        estimatingZones.delete(zoneId);
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
