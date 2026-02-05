/**
 * Marker layer management using Leaflet FeatureGroup
 */
import L from 'leaflet';
import { createColoredMarker, getTeamMemberColor } from './markerStyles.js';
import { store, subscribe } from '../state/store.js';

let map = null;
let featureGroup = null;
const markersByMemberId = new Map();

/**
 * Initialize marker layer with map instance and subscribe to store events
 * @param {L.Map} mapInstance - Leaflet map instance
 */
export function initMarkerLayer(mapInstance) {
  map = mapInstance;
  featureGroup = L.featureGroup().addTo(map);

  // Load existing members
  const members = store.getTeamMembers();
  members.forEach((member, index) => {
    addMemberMarker(member, index);
  });

  // Subscribe to future changes
  subscribe('teamMemberAdded', (member) => {
    const members = store.getTeamMembers();
    const index = members.findIndex(m => m.id === member.id);
    addMemberMarker(member, index);
  });

  subscribe('teamMemberRemoved', (removed) => {
    removeMemberMarker(removed.id);
  });

  subscribe('teamMembersLoaded', () => {
    clearMarkers();
    const members = store.getTeamMembers();
    members.forEach((member, index) => {
      addMemberMarker(member, index);
    });
  });
}

/**
 * Add a team member marker to the layer
 * @param {Object} member - Team member data
 * @param {number} colorIndex - Index for color selection
 */
export function addMemberMarker(member, colorIndex) {
  // Don't add duplicate markers
  if (markersByMemberId.has(member.id)) {
    return;
  }

  const color = getTeamMemberColor(colorIndex);
  const icon = createColoredMarker(color, member.name);
  const marker = L.marker([member.lat, member.lng], { icon });

  marker.bindPopup(`
    <div class="member-popup">
      <h3>${member.name}</h3>
      <p><strong>Adresse:</strong><br>${member.address}</p>
      ${member.phone ? `<p><strong>Téléphone:</strong><br>${member.phone}</p>` : ''}
    </div>
  `);

  featureGroup.addLayer(marker);
  markersByMemberId.set(member.id, marker);
}

/**
 * Remove a team member marker from the layer
 * @param {string} memberId - Team member ID
 */
export function removeMemberMarker(memberId) {
  const marker = markersByMemberId.get(memberId);
  if (marker) {
    featureGroup.removeLayer(marker);
    markersByMemberId.delete(memberId);
  }
}

/**
 * Remove all markers from the layer
 */
export function clearMarkers() {
  featureGroup.clearLayers();
  markersByMemberId.clear();
}

/**
 * Get the number of markers currently on the layer
 * @returns {number} Number of markers
 */
export function getMarkerCount() {
  return markersByMemberId.size;
}
