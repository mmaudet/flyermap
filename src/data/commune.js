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
