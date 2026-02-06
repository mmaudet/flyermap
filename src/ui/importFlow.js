/**
 * CSV import orchestration - parse, validate, geocode, store
 */
import { parseCSV, validateTeamMembers, normalizeTeamMember } from '../services/csvImport.js';
import { geocodeAddress } from '../services/geocoding.js';
import { store } from '../state/store.js';
import { updateTeamList } from './sidePanel.js';

/**
 * Handle CSV file import - full pipeline
 * @param {File} file - CSV file to import
 * @returns {Promise<Object>} Result {success, added?, failed?, errors?}
 */
export async function handleFileImport(file) {
  const statusEl = document.getElementById('team-list');

  try {
    // Step 1: Parse CSV
    const rawMembers = await parseCSV(file);

    // Step 2: Validate
    const errors = validateTeamMembers(rawMembers);
    if (errors.length > 0) {
      const errorMsg = errors.map(e => `Ligne ${e.row}: ${e.message}`).join('\n');
      alert(`Erreurs de validation:\n${errorMsg}`);
      return { success: false, errors };
    }

    // Step 3: Normalize
    const members = rawMembers.map(normalizeTeamMember);

    // Step 4: If members already exist, ask to replace
    const existingMembers = store.getTeamMembers();
    if (existingMembers.length > 0) {
      if (!confirm(`${existingMembers.length} colistier(s) existant(s). Remplacer par les ${members.length} du CSV ?`)) {
        return { success: false };
      }
      // Clear existing members
      for (const m of existingMembers) {
        store.removeTeamMember(m.id);
      }
    }

    // Step 5: Geocode with progress

    statusEl.innerHTML = `<p class="empty-message">Géocodage : 0/${members.length}...</p>`;

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      statusEl.innerHTML = `<p class="empty-message">Géocodage : ${i + 1}/${members.length} — ${member.name}...</p>`;

      try {
        const geo = await geocodeAddress(member.address);
        store.addTeamMember({
          name: member.name,
          address: member.address,
          phone: member.phone || null,
          lat: geo.lat,
          lng: geo.lng,
          geocodeScore: geo.score
        });
        successCount++;
      } catch (error) {
        console.warn(`Geocoding failed for ${member.name}: ${error.message}`);
        failCount++;
      }

      // Rate limiting
      if (i < members.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    }

    // Step 6: Always restore team list
    updateTeamList();

    // Step 7: Report results
    if (failCount > 0) {
      alert(`Import terminé : ${successCount} colistier(s) ajouté(s), ${failCount} adresse(s) non trouvée(s).`);
    }

    return { success: true, added: successCount, failed: failCount };

  } catch (error) {
    console.error('Import failed:', error);
    // Always restore team list on error
    updateTeamList();
    alert(`Erreur d'import : ${error.message || 'Erreur inconnue'}`);
    return { success: false, error };
  }
}

/**
 * Initialize import handler - wire up file input event
 */
export function initImportHandler() {
  const input = document.getElementById('csv-import');
  if (input) {
    input.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (file) {
        await handleFileImport(file);
        // Reset input to allow re-importing same file
        input.value = '';
      }
    });
  }
}
