/**
 * Overpass API service for OpenStreetMap data
 * Used to estimate mailbox counts by querying buildings/addresses
 */

// Primary and fallback Overpass endpoints
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];

/**
 * Extract bounding box from GeoJSON polygon
 * @param {Object} geojson - GeoJSON polygon
 * @returns {Object} {south, west, north, east}
 */
function getBoundingBox(geojson) {
  const coords = geojson.geometry.coordinates[0];
  let minLat = Infinity, maxLat = -Infinity;
  let minLng = Infinity, maxLng = -Infinity;

  coords.forEach(([lng, lat]) => {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  });

  return { south: minLat, west: minLng, north: maxLat, east: maxLng };
}

/**
 * Count buildings within a zone using bounding box (faster than polygon)
 * @param {Object} geojson - GeoJSON polygon of the zone
 * @returns {Promise<number>} Number of buildings
 */
export async function countBuildingsDetailed(geojson) {
  const bbox = getBoundingBox(geojson);
  const bboxStr = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;

  // Simple query: count buildings in bounding box
  const query = `
[out:json][timeout:25];
(
  way["building"](${bboxStr});
  relation["building"](${bboxStr});
);
out count;
`;

  let lastError = null;

  // Try each endpoint until one works
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `data=${encodeURIComponent(query)}`
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // Extract count from response
      // With "out count", the count is in elements[0].tags.total
      if (data.elements && data.elements.length > 0 && data.elements[0].tags) {
        return parseInt(data.elements[0].tags.total || data.elements[0].tags.ways || 0, 10);
      }

      // Fallback: count elements if returned differently
      return data.elements?.length || 0;

    } catch (error) {
      console.warn(`Overpass endpoint ${endpoint} failed:`, error.message);
      lastError = error;
      // Continue to next endpoint
    }
  }

  // All endpoints failed
  throw lastError || new Error('Tous les serveurs Overpass sont indisponibles');
}
