/**
 * Map capture utility for zone screenshots
 * Uses leaflet-simple-map-screenshoter to capture zone maps as PNG blobs
 */

import SimpleMapScreenshoter from 'leaflet-simple-map-screenshoter';
import L from 'leaflet';

/**
 * Capture a zone map as a PNG blob
 * @param {L.Map} map - Leaflet map instance
 * @param {Object} zone - Zone object with geojson property
 * @returns {Promise<Blob>} PNG image blob
 */
export async function captureZoneMap(map, zone) {
  // Store current map view
  const originalCenter = map.getCenter();
  const originalZoom = map.getZoom();

  // Get zone bounds
  const zoneBounds = L.geoJSON(zone.geojson).getBounds();

  // Fit map to zone with padding
  map.fitBounds(zoneBounds, { padding: [30, 30], animate: false });

  // Create screenshoter
  const screenshoter = new SimpleMapScreenshoter({
    hidden: true,
    preventDownload: true,
    mimeType: 'image/png'
  });
  screenshoter.addTo(map);

  // Wait for tiles to load
  await new Promise(resolve => setTimeout(resolve, 1500));

  try {
    // Capture screenshot
    const blob = await screenshoter.takeScreen('blob');
    return blob;
  } finally {
    // Restore original map view
    map.setView(originalCenter, originalZoom, { animate: false });

    // Clean up screenshoter
    screenshoter.remove();
  }
}
