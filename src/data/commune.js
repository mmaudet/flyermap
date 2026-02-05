import { DEFAULT_INSEE } from '../map/config.js';

/**
 * Fetch commune boundary from geo.api.gouv.fr
 * Returns GeoJSON with contour geometry (WGS84/EPSG:4326)
 */
export async function fetchCommuneBoundary() {
  const url = `https://geo.api.gouv.fr/communes/${DEFAULT_INSEE}?format=geojson&geometry=contour`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to load commune boundary:', error);
    throw error;
  }
}

/**
 * Search communes by postal code
 *
 * @param {string} postalCode - 5-digit postal code
 * @returns {Promise<Array>} Array of commune objects with contour GeoJSON
 * @throws {Error} If API request fails or returns invalid data
 */
export async function searchCommunesByPostalCode(postalCode) {
  const url = `https://geo.api.gouv.fr/communes?codePostal=${postalCode}&fields=nom,code,codesPostaux,contour&format=json&geometry=contour`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const communes = await response.json();

    // Validate response is array
    if (!Array.isArray(communes)) {
      throw new Error('API response is not an array');
    }

    // Validate each commune has required fields
    for (const commune of communes) {
      if (!commune.code || !commune.nom) {
        throw new Error('Commune missing required fields (code, nom)');
      }
      if (!commune.contour) {
        console.warn(`Commune ${commune.nom} (${commune.code}) missing contour geometry`);
      }
    }

    return communes;
  } catch (error) {
    console.error('Failed to search communes by postal code:', error);
    throw error;
  }
}
