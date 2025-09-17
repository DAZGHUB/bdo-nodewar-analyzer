/**
 * @fileoverview Centralized state management for the application.
 */

export const state = {
    // Manages all guild rosters, keyed by guild name.
    allRosters: {},
    // A flattened array of unique member names from all rosters.
    currentRosterMembers: [],
    // A Map of the current analysis data, keyed by player familyName.
    aggregatedData: new Map(),
    // The current state of table sorting.
    sortState: {
        column: 'kills',
        direction: 'desc'
    },
    // UI-related state, such as loading indicators or status messages.
    ui: {
        statusMessage: 'Ready to analyze.'
    }
};