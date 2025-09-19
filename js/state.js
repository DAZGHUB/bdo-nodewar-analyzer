export const state = {
    allRosters: {},
    currentRosterMembers: [],
    aggregatedData: new Map(),
    sortState: {
        column: 'kills',
        direction: 'desc'
    },
    
    ui: {
        statusMessage: 'Ready to analyze.'
    }
};