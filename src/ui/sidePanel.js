/**
 * Side panel with team member list
 */
import { store, subscribe } from '../state/store.js';
import { getTeamMemberColor } from '../map/markerStyles.js';

/**
 * Initialize side panel and subscribe to store events
 */
export function initSidePanel() {
  updateTeamList();

  // Subscribe to team member events
  subscribe('teamMemberAdded', updateTeamList);
  subscribe('teamMemberRemoved', updateTeamList);
  subscribe('teamMembersLoaded', updateTeamList);

  // Subscribe to zone events to update badges
  subscribe('zoneAdded', updateTeamList);
  subscribe('zoneUpdated', updateTeamList);
  subscribe('zoneRemoved', updateTeamList);
  subscribe('zonesLoaded', updateTeamList);
}

/**
 * Count how many zones a member is assigned to
 * @param {string} memberId - Member ID
 * @returns {number} Number of zones
 */
function countZonesForMember(memberId) {
  const zones = store.getZones();
  return zones.filter(zone =>
    zone.assignedMembers && zone.assignedMembers.includes(memberId)
  ).length;
}

/**
 * Get zone names for a member
 * @param {string} memberId - Member ID
 * @returns {string[]} Zone names
 */
function getZoneNamesForMember(memberId) {
  const zones = store.getZones();
  return zones
    .filter(zone => zone.assignedMembers && zone.assignedMembers.includes(memberId))
    .map(zone => zone.name);
}

/**
 * Escape HTML special characters for safe attribute insertion
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Update the team list display
 */
export function updateTeamList() {
  const container = document.getElementById('team-list');
  const members = store.getTeamMembers();

  if (members.length === 0) {
    container.innerHTML = '<p class="empty-message">Aucun colistier importé</p>';
    return;
  }

  container.innerHTML = members.map((member, index) => {
    const zoneCount = countZonesForMember(member.id);
    const zoneNames = getZoneNamesForMember(member.id);
    const tooltip = zoneNames.length > 0 ? zoneNames.join(', ') : 'Aucune zone assignée';

    return `
      <div class="team-member-item" data-id="${escapeHtml(member.id)}">
        <div class="color-dot" style="background-color: ${getTeamMemberColor(index)}"></div>
        <div class="member-info">
          <p class="member-name">${escapeHtml(member.name)}</p>
          <p class="member-address">${escapeHtml(member.address)}</p>
        </div>
        ${zoneCount > 0 ? `
          <div class="zone-badge" title="${escapeHtml(tooltip)}">
            ${zoneCount} zone${zoneCount > 1 ? 's' : ''}
          </div>
        ` : `
          <div class="zone-badge empty" title="Aucune zone assignée">
            0 zone
          </div>
        `}
      </div>
    `;
  }).join('');
}
