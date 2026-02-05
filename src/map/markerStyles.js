/**
 * Colored marker factory using Leaflet DivIcon
 */
import L from 'leaflet';

// Team member color palette (8 distinct colors)
const COLORS = [
  '#c30b82', // magenta
  '#2563eb', // blue
  '#16a34a', // green
  '#ea580c', // orange
  '#7c3aed', // purple
  '#0891b2', // cyan
  '#dc2626', // red
  '#ca8a04'  // yellow
];

/**
 * Get color for a team member by index
 * @param {number} index - Team member index
 * @returns {string} Hex color code
 */
export function getTeamMemberColor(index) {
  return COLORS[index % COLORS.length];
}

/**
 * Create a colored DivIcon marker for a team member
 * @param {string} color - Hex color code
 * @param {string} label - Team member name (will be truncated)
 * @returns {L.DivIcon} Leaflet DivIcon instance
 */
export function createColoredMarker(color, label) {
  const html = `
    <div class="marker-pin" style="background-color: ${color};"></div>
    <div class="marker-label">${label}</div>
  `;

  return L.divIcon({
    className: 'custom-div-icon',
    html: html,
    iconSize: [30, 42],
    iconAnchor: [15, 42],    // Bottom center of pin
    popupAnchor: [0, -42]    // Above the pin
  });
}
