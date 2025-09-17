/**
 * @fileoverview Handles all roster management logic.
 */

import {
    state
} from './state.js';
import {
    renderRosterManager,
    displayCombinedRoster,
    showNotification
} from './ui.js';

const ROSTER_STORAGE_KEY = 'guildRosterManager';

export function loadRostersFromStorage() {
    const savedRosters = localStorage.getItem(ROSTER_STORAGE_KEY);
    if (savedRosters) {
        state.allRosters = JSON.parse(savedRosters);
    }
    renderRosterManager();
    rebuildAllyRoster();
}

function saveRostersToStorage() {
    localStorage.setItem(ROSTER_STORAGE_KEY, JSON.stringify(state.allRosters));
}

export function addGuild(guildName) {
    if (!guildName) return showNotification("Please enter a guild name.", true);
    if (state.allRosters[guildName]) return showNotification("A roster for this guild already exists.", true);

    state.allRosters[guildName] = {
        lastUpdated: new Date().toISOString(),
        members: []
    };
    saveRostersToStorage();
    renderRosterManager();
}

export function deleteGuild(guildName) {
    if (confirm(`Are you sure you want to delete the roster for ${guildName}?`)) {
        delete state.allRosters[guildName];
        saveRostersToStorage();
        renderRosterManager();
        rebuildAllyRoster();
    }
}

export function updateRosterFromFile(file, guildName) {
    if (!file || !guildName) return;
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const names = parseRosterFromHtml(e.target.result);
            if (names.length === 0) throw new Error("Could not find any member names in the file.");
            state.allRosters[guildName].members = names;
            state.allRosters[guildName].lastUpdated = new Date().toISOString();
            saveRostersToStorage();
            renderRosterManager();
            rebuildAllyRoster();
            showNotification(`Roster for ${guildName} updated successfully.`);
        } catch (error) {
            showNotification(`Error parsing file: ${error.message}`, true);
        }
    };
    reader.readAsText(file);
}

function parseRosterFromHtml(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    let nameElements = doc.querySelectorAll('ul._guild_member_list li._list_item a span');
    if (nameElements.length === 0) {
        nameElements = doc.querySelectorAll('div.box_list_area .adventure_list_table .guild_name .text a');
    }
    if (nameElements.length === 0) {
        nameElements = doc.querySelectorAll('div.simplebar-content a span.whitespace-nowrap');
    }
    return Array.from(nameElements).map(el => el.textContent.trim()).filter(Boolean);
}

function rebuildAllyRoster() {
    const allMembers = new Set();
    for (const guildName in state.allRosters) {
        state.allRosters[guildName].members.forEach(member => allMembers.add(member));
    }
    state.currentRosterMembers = Array.from(allMembers);
    displayCombinedRoster();
}