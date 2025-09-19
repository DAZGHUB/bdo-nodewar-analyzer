import { state } from './state.js';
import { displayResults } from './ui.js';

export function aggregateData(newData) {
    newData.forEach(p => {
        if (!state.aggregatedData.has(p.familyName)) {
            state.aggregatedData.set(p.familyName, p);
        }
    });
}

export function sortAndDisplay(column = state.sortState.column, maintainDirection = true) {
    if (state.aggregatedData.size === 0) return displayResults([]);

    if (column) {
        if (!maintainDirection) {
            if (state.sortState.column === column) {
                state.sortState.direction = state.sortState.direction === 'asc' ? 'desc' : 'asc';
            } else {
                state.sortState.column = column;
                state.sortState.direction = 'desc';
            }
        }
    }

    const direction = state.sortState.direction === 'asc' ? 1 : -1;
    const dataArray = Array.from(state.aggregatedData.values());

    dataArray.sort((a, b) => {
        let valA, valB;
        if (state.sortState.column === 'kdRatio') {
            const killsA = a.kills?.value ?? -1;
            const deathsA = a.deaths?.value ?? -1;
            const killsB = b.kills?.value ?? -1;
            const deathsB = b.deaths?.value ?? -1;
            valA = (deathsA <= 0) ? killsA : killsA / deathsA;
            valB = (deathsB <= 0) ? killsB : killsB / deathsB;
        } else {
            valA = a[state.sortState.column]?.value ?? -1;
            valB = b[state.sortState.column]?.value ?? -1;
        }

        if (typeof valA === 'string' && typeof valB === 'string') return valA.localeCompare(valB) * direction;
        if (typeof valA === 'string') return 1 * direction;
        if (typeof valB === 'string') return -1 * direction;
        return (valA - valB) * direction;
    });

    displayResults(dataArray);
}