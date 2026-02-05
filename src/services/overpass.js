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

// Retry configuration
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

/**
 * Execute an Overpass query with retry logic across multiple endpoints
 * @param {string} query - Overpass QL query
 * @returns {Promise<Object>} JSON response data
 */
async function executeOverpassQuery(query) {
  let lastError = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    // Try each endpoint with retries
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: `data=${encodeURIComponent(query)}`
        });

        if (!response.ok) {
          // Retry on 5xx errors
          if (response.status >= 500 && attempt < MAX_RETRIES) {
            console.warn(`Overpass ${endpoint} returned ${response.status}, retry ${attempt + 1}/${MAX_RETRIES}...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
            continue;
          }
          throw new Error(`HTTP ${response.status}`);
        }

        return await response.json();

      } catch (error) {
        // Retry on network errors
        if (error.name === 'TypeError' && attempt < MAX_RETRIES) {
          console.warn(`Overpass ${endpoint} network error, retry ${attempt + 1}/${MAX_RETRIES}...`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }
        lastError = error;
        console.warn(`Overpass endpoint ${endpoint} failed:`, error.message);
        break; // Move to next endpoint
      }
    }
  }

  throw lastError || new Error('Tous les serveurs Overpass sont indisponibles');
}

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

  const query = `
[out:json][timeout:25];
(
  way["building"](${bboxStr});
  relation["building"](${bboxStr});
);
out count;
`;

  const data = await executeOverpassQuery(query);

  // Extract count from response
  // With "out count", the count is in elements[0].tags.total
  if (data.elements && data.elements.length > 0 && data.elements[0].tags) {
    return parseInt(data.elements[0].tags.total || data.elements[0].tags.ways || 0, 10);
  }

  // Fallback: count elements if returned differently
  return data.elements?.length || 0;
}

/**
 * Get street names within a zone bounding box
 * @param {Object} geojson - GeoJSON polygon of the zone
 * @returns {Promise<string[]>} Sorted unique street names
 */
export async function getStreetsInBbox(geojson) {
  const bbox = getBoundingBox(geojson);
  const bboxStr = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;

  const query = `
[out:json][timeout:30];
(
  way["highway"~"^(residential|primary|secondary|tertiary|unclassified|living_street)$"]
     ["name"]
     (${bboxStr});
);
out tags;
`;

  const data = await executeOverpassQuery(query);

  // Extract unique street names
  const streetNames = new Set();
  if (data.elements) {
    data.elements.forEach(el => {
      if (el.tags?.name) {
        streetNames.add(el.tags.name);
      }
    });
  }

  // Sort alphabetically with French locale
  return Array.from(streetNames).sort((a, b) =>
    a.localeCompare(b, 'fr', { sensitivity: 'base' })
  );
}
