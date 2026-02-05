/**
 * Géoplateforme API geocoding service
 * https://data.geopf.fr/geocodage
 */

const BASE_URL = 'https://data.geopf.fr/geocodage/search';
const RATE_LIMIT_MS = 20; // 50 req/s = 1 request per 20ms

// France coordinate bounds for validation
const FRANCE_BOUNDS = {
  lat: { min: 41, max: 51 },
  lng: { min: -5, max: 10 }
};

/**
 * Validate coordinates are within France bounds
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean} True if within France bounds
 */
function isInFrance(lat, lng) {
  return lat >= FRANCE_BOUNDS.lat.min &&
         lat <= FRANCE_BOUNDS.lat.max &&
         lng >= FRANCE_BOUNDS.lng.min &&
         lng <= FRANCE_BOUNDS.lng.max;
}

/**
 * Geocode a single French address
 * @param {string} address - Full address to geocode
 * @param {string|null} postcode - Optional postal code for better accuracy
 * @returns {Promise<Object>} {lat, lng, label, score}
 * @throws {Error} If geocoding fails or address not found
 */
export async function geocodeAddress(address, postcode = null) {
  const params = new URLSearchParams({
    q: address,
    limit: 1,
    index: 'address'
  });

  if (postcode) {
    params.append('postcode', postcode);
  }

  const response = await fetch(`${BASE_URL}?${params}`);

  if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.features || data.features.length === 0) {
    throw new Error('Address not found');
  }

  const feature = data.features[0];
  const coords = feature.geometry.coordinates;

  // CRITICAL: GeoJSON format is [lng, lat], swap for Leaflet [lat, lng]
  const lat = coords[1];
  const lng = coords[0];

  // Validate coordinates are in France
  if (!isInFrance(lat, lng)) {
    console.warn(`Warning: Coordinates outside France bounds: [${lat}, ${lng}] for "${address}"`);
  }

  return {
    lat,
    lng,
    label: feature.properties.label,
    score: feature.properties.score || 0
  };
}

/**
 * Geocode multiple addresses with rate limiting
 * @param {Array<Object>} addresses - Array of {address, postcode?} objects
 * @returns {Promise<Array>} Array of results with success status
 */
export async function geocodeBatch(addresses) {
  const results = [];

  for (let i = 0; i < addresses.length; i++) {
    try {
      const result = await geocodeAddress(
        addresses[i].address,
        addresses[i].postcode
      );
      results.push({
        success: true,
        ...result
      });
    } catch (error) {
      results.push({
        success: false,
        error: error.message
      });
    }

    // Rate limiting: wait 20ms between requests (except after last)
    if (i < addresses.length - 1) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
    }
  }

  return results;
}
