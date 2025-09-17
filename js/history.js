/**
 * @fileoverview Manages saving, loading, and deleting analysis history from localStorage.
 */

import {
    state
} from './state.js';
import {
    renderHistoryPanel,
    showNotification
} from './ui.js';
import {
    sortAndDisplay
} from './analyzer.js';

const HISTORY_STORAGE_KEY = 'guildStatsHistory';

function getHistory() {
    return JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || '[]');
}

export function initializeHistory() {
    const history = getHistory();
    renderHistoryPanel(history);
}

export function saveToHistory() {
    if (state.aggregatedData.size === 0) return showNotification("No data to save!", true);

    const history = getHistory();
    const date = new Date();
    const historyEntry = {
        id: date.getTime(),
        name: `Analysis - ${date.toLocaleString()}`,
        data: Array.from(state.aggregatedData.values())
    };
    history.unshift(historyEntry);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    renderHistoryPanel(history);
    showNotification(`Session saved as "${historyEntry.name}"`);
}

export function loadFromHistory(id) {
    const history = getHistory();
    const entry = history.find(item => item.id == id);
    if (!entry) return;

    state.aggregatedData.clear();
    entry.data.forEach(player => state.aggregatedData.set(player.familyName, player));
    sortAndDisplay();
    showNotification(`Loaded session: "${entry.name}"`);
}

export function deleteFromHistory(id) {
    let history = getHistory();
    history = history.filter(item => item.id != id);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    renderHistoryPanel(history);
}