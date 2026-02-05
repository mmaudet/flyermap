import Papa from 'papaparse';

/**
 * Parse CSV file with header row detection
 * @param {File} file - CSV file to parse
 * @returns {Promise<Array>} Array of row objects with header keys
 */
export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject({ type: 'PARSE_ERROR', errors: results.errors });
          return;
        }
        resolve(results.data);
      },
      error: (error) => {
        reject({ type: 'PARSE_ERROR', error });
      }
    });
  });
}

/**
 * Validate team member data has required fields
 * @param {Array} members - Array of raw CSV row objects
 * @returns {Array} Array of validation errors: {row, field, message}
 */
export function validateTeamMembers(members) {
  const errors = [];

  members.forEach((member, index) => {
    const rowNum = index + 1;

    // Normalize keys to lowercase for case-insensitive checking
    const keys = Object.keys(member).map(k => k.toLowerCase());

    // Check for name field (nom or name)
    const hasName = keys.some(k => k === 'nom' || k === 'name');
    if (!hasName) {
      errors.push({
        row: rowNum,
        field: 'name',
        message: 'Missing required field: "nom" or "name"'
      });
    }

    // Check for address field (adresse or address)
    const hasAddress = keys.some(k => k === 'adresse' || k === 'address');
    if (!hasAddress) {
      errors.push({
        row: rowNum,
        field: 'address',
        message: 'Missing required field: "adresse" or "address"'
      });
    }
  });

  return errors;
}

/**
 * Normalize field names to standard format
 * Maps French/English variations to standard keys: name, address, phone
 * @param {Object} raw - Raw CSV row object
 * @returns {Object} Normalized object with standard keys
 */
export function normalizeTeamMember(raw) {
  const normalized = {};

  // Process each field in the raw object
  Object.entries(raw).forEach(([key, value]) => {
    const lowerKey = key.toLowerCase();

    // Map name variations
    if (lowerKey === 'nom' || lowerKey === 'name') {
      normalized.name = value;
    }
    // Map address variations
    else if (lowerKey === 'adresse' || lowerKey === 'address') {
      normalized.address = value;
    }
    // Map phone variations (optional)
    else if (lowerKey === 'telephone' || lowerKey === 'phone' || lowerKey === 'tel') {
      normalized.phone = value;
    }
    // Preserve other fields as-is
    else {
      normalized[key] = value;
    }
  });

  return normalized;
}
