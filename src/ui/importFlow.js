/**
 * CSV import orchestration - parse, validate, geocode, store
 */
import { parseCSV, validateTeamMembers, normalizeTeamMember } from '../services/csvImport.js';
import { geocodeBatch } from '../services/geocoding.js';
import { store } from '../state/store.js';

/**
 * Handle CSV file import - full pipeline
 * @param {File} file - CSV file to import
 * @returns {Promise<Object>} Result {success, added?, failed?, errors?}
 */
export async function handleFileImport(file) {
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

    // Step 4: Geocode
    const addresses = members.map(m => ({
      address: m.address,
      postcode: m.postcode || '78130' // Default to Chapet
    }));

    // Show progress
    const statusEl = document.getElementById('team-list');
    const originalContent = statusEl.innerHTML;
    statusEl.innerHTML = '<p class="empty-message">Géocodage en cours...</p>';

    const geoResults = await geocodeBatch(addresses);

    // Step 5: Merge results and add to store
    let successCount = 0;
    let failCount = 0;

    members.forEach((member, i) => {
      const geo = geoResults[i];
      if (geo.success) {
        store.addTeamMember({
          name: member.name,
          address: member.address,
          phone: member.phone || null,
          lat: geo.lat,
          lng: geo.lng,
          geocodeScore: geo.score
        });
        successCount++;
      } else {
        console.warn(`Geocoding failed for ${member.name}: ${geo.error}`);
        failCount++;
      }
    });

    // Step 6: Report results
    if (failCount > 0) {
      alert(`Import terminé: ${successCount} colistiers ajoutés, ${failCount} adresses non trouvées.`);
    }

    return { success: true, added: successCount, failed: failCount };

  } catch (error) {
    console.error('Import failed:', error);
    alert(`Erreur d'import: ${error.message || 'Erreur inconnue'}`);
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
