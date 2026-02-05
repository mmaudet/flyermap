/**
 * Defensive LocalStorage wrapper with error handling and quota monitoring
 */
class Storage {
  constructor() {
    this.QUOTA_LIMIT = 5 * 1024 * 1024; // 5MB typical localStorage limit
    this.WARN_THRESHOLD = 0.8; // Warn at 80% usage
  }

  /**
   * Save data to localStorage with error handling
   * @param {string} key - Storage key
   * @param {any} data - Data to store (will be JSON.stringify'd)
   * @returns {{success: boolean, error?: string}} Result object
   */
  save(key, data) {
    try {
      const serialized = JSON.stringify(data);

      // Check quota before attempting save
      if (this.isNearQuota(serialized)) {
        console.warn('LocalStorage approaching quota limit');
      }

      localStorage.setItem(key, serialized);
      return { success: true };
    } catch (error) {
      // QuotaExceededError has code 22 (most browsers) or 1014 (Firefox)
      if (error.code === 22 || error.code === 1014 || error.name === 'QuotaExceededError') {
        console.error('LocalStorage quota exceeded', error);
        return { success: false, error: 'QUOTA_EXCEEDED' };
      }

      // Private browsing mode or other localStorage failures
      console.error('LocalStorage save failed', error);
      return { success: false, error: 'STORAGE_FAILED' };
    }
  }

  /**
   * Load data from localStorage with error handling
   * @param {string} key - Storage key
   * @returns {any|null} Parsed data or null if not found/failed
   */
  load(key) {
    try {
      const serialized = localStorage.getItem(key);
      if (serialized === null) {
        return null;
      }
      return JSON.parse(serialized);
    } catch (error) {
      console.error('LocalStorage load failed', error);
      return null;
    }
  }

  /**
   * Remove data from localStorage
   * @param {string} key - Storage key
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('LocalStorage remove failed', error);
    }
  }

  /**
   * Check if storage is near quota limit
   * @param {string} newData - New data to be added (optional)
   * @returns {boolean} True if near quota (>80%)
   */
  isNearQuota(newData = '') {
    try {
      let usedSpace = 0;

      // Calculate current usage by iterating all keys
      // UTF-16 encoding: each character is 2 bytes
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          const value = localStorage.getItem(key);
          usedSpace += (key.length + value.length) * 2;
        }
      }

      // Add size of new data
      usedSpace += newData.length * 2;

      const usageRatio = usedSpace / this.QUOTA_LIMIT;
      return usageRatio > this.WARN_THRESHOLD;
    } catch (error) {
      console.error('Failed to calculate storage usage', error);
      return false;
    }
  }
}

// Export singleton instance
export default new Storage();
