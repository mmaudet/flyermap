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

  subscribe('teamMemberAdded', updateTeamList);
  subscribe('teamMemberRemoved', updateTeamList);
  subscribe('teamMembersLoaded', updateTeamList);
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

  container.innerHTML = members.map((member, index) => `
    <div class="team-member-item" data-id="${member.id}">
      <div class="color-dot" style="background-color: ${getTeamMemberColor(index)}"></div>
      <div class="member-info">
        <p class="member-name">${member.name}</p>
        <p class="member-address">${member.address}</p>
      </div>
    </div>
  `).join('');
}
