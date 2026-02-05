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

  // Event handlers will be added in Plan 03-02

  return zoneGroup;
}
