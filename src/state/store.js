/**
 * PubSub state manager with debounced persistence
 */
import storage from '../data/storage.js';

const STORAGE_KEY = 'flyermap_data';
const DEBOUNCE_MS = 500;

/**
 * Simple PubSub event system
 */
class PubSub {
  constructor() {
    this.events = {};
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);

    // Return unsubscribe function
    return () => {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    };
  }

  /**
   * Publish an event to all subscribers
   * @param {string} event - Event name
   * @param {any} data - Event data
   */
  publish(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }
}

/**
 * Team member state manager with automatic persistence
 */
class Store {
  constructor() {
    this.pubsub = new PubSub();
    this.state = {
      teamMembers: [],
      zones: []
    };
    this.saveTimer = null;
    this._loadInitialState();
  }

  /**
   * Load initial state from localStorage
   * @private
   */
  _loadInitialState() {
    const savedData = storage.load(STORAGE_KEY);
    if (savedData && Array.isArray(savedData.teamMembers)) {
      this.state.teamMembers = savedData.teamMembers;
      this.pubsub.publish('teamMembersLoaded', this.state.teamMembers);
    }
    if (savedData && Array.isArray(savedData.zones)) {
      this.state.zones = savedData.zones;
      this.pubsub.publish('zonesLoaded', this.state.zones);
    }
  }

  /**
   * Debounced save to localStorage
   * @private
   */
  _debouncedSave() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(() => {
      const result = storage.save(STORAGE_KEY, this.state);
      if (!result.success) {
        console.error('Failed to persist team members:', result.error);
        // Could publish 'persistenceFailed' event here if needed
      }
    }, DEBOUNCE_MS);
  }

  /**
   * Generate unique ID for team member
   * @private
   * @returns {string} Unique ID
   */
  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Subscribe to store events
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(event, callback) {
    return this.pubsub.subscribe(event, callback);
  }

  /**
   * Get all team members
   * @returns {Array} Team members array
   */
  getTeamMembers() {
    return [...this.state.teamMembers]; // Return copy to prevent direct mutation
  }

  /**
   * Add a new team member
   * @param {Object} member - Team member data
   * @returns {Object} Added team member with generated ID
   */
  addTeamMember(member) {
    const newMember = {
      ...member,
      id: this._generateId(),
      createdAt: new Date().toISOString()
    };

    this.state.teamMembers.push(newMember);
    this.pubsub.publish('teamMemberAdded', newMember);
    this._debouncedSave();

    return newMember;
  }

  /**
   * Remove a team member by ID
   * @param {string} id - Team member ID
   * @returns {boolean} True if removed, false if not found
   */
  removeTeamMember(id) {
    const index = this.state.teamMembers.findIndex(m => m.id === id);
    if (index === -1) {
      return false;
    }

    const removed = this.state.teamMembers.splice(index, 1)[0];
    this.pubsub.publish('teamMemberRemoved', removed);
    this._debouncedSave();

    return true;
  }

  /**
   * Update a team member by ID
   * @param {string} id - Team member ID
   * @param {Object} updates - Fields to update
   * @returns {Object|null} Updated team member or null if not found
   */
  updateTeamMember(id, updates) {
    const member = this.state.teamMembers.find(m => m.id === id);
    if (!member) {
      return null;
    }

    Object.assign(member, updates, {
      updatedAt: new Date().toISOString()
    });

    this.pubsub.publish('teamMemberUpdated', member);
    this._debouncedSave();

    return member;
  }

  /**
   * Get all zones
   * @returns {Array} Zones array
   */
  getZones() {
    return [...this.state.zones]; // Return copy to prevent direct mutation
  }

  /**
   * Add a new zone
   * @param {Object} zone - Zone data (name, geojson)
   * @returns {Object} Added zone with generated ID
   */
  addZone(zone) {
    const newZone = {
      ...zone,
      id: this._generateId(),
      createdAt: new Date().toISOString()
    };

    this.state.zones.push(newZone);
    this.pubsub.publish('zoneAdded', newZone);
    this._debouncedSave();

    return newZone;
  }

  /**
   * Update a zone by ID
   * @param {string} id - Zone ID
   * @param {Object} updates - Fields to update
   * @returns {Object|null} Updated zone or null if not found
   */
  updateZone(id, updates) {
    const zone = this.state.zones.find(z => z.id === id);
    if (!zone) {
      return null;
    }

    Object.assign(zone, updates, {
      updatedAt: new Date().toISOString()
    });

    this.pubsub.publish('zoneUpdated', zone);
    this._debouncedSave();

    return zone;
  }

  /**
   * Remove a zone by ID
   * @param {string} id - Zone ID
   * @returns {boolean} True if removed, false if not found
   */
  removeZone(id) {
    const index = this.state.zones.findIndex(z => z.id === id);
    if (index === -1) {
      return false;
    }

    const removed = this.state.zones.splice(index, 1)[0];
    this.pubsub.publish('zoneRemoved', removed);
    this._debouncedSave();

    return true;
  }
}

// Export singleton store instance and subscribe helper
export const store = new Store();
export const subscribe = (event, callback) => store.subscribe(event, callback);
