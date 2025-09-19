import { DOMElements } from './uiElements.js';
import { state } from './state.js';

export function showNotification(message, isError = false) {
    console.log(`Notification: ${message}`);
    DOMElements.statusEl.textContent = message;
    DOMElements.statusEl.style.color = isError ? '#f44336' : '#99aab5';
}

export function resetUI() {
    state.aggregatedData.clear();
    DOMElements.tableBody.innerHTML = '';
    DOMElements.resultsEl.classList.add('hidden');
    DOMElements.preprocessingEl.classList.add('hidden');
    DOMElements.imageUpload.value = '';
    DOMElements.summaryStatsEl.innerHTML = '';
    DOMElements.imagePreviewContainer.classList.add('hidden');
    DOMElements.imagePreview.src = '';
    showNotification('Current analysis has been reset.');
}

export function renderHistoryPanel(history) {
    DOMElements.historyList.innerHTML = '';
    if (history.length === 0) {
        DOMElements.historyList.innerHTML = '<li><div class="history-name">No saved history.</div></li>';
        return;
    }
    history.forEach(item => {
        const li = document.createElement('li');
        li.dataset.id = item.id;
        li.innerHTML = `<div class="history-name">${item.name}</div><div class="history-controls"><button class="load-btn">Load</button><button class="delete-btn">Delete</button></div>`;
        DOMElements.historyList.appendChild(li);
    });
}

export function renderRosterManager() {
    DOMElements.guildListContainer.innerHTML = '';
    for (const guildName in state.allRosters) {
        const roster = state.allRosters[guildName];
        const memberCount = roster.members.length;
        const lastUpdated = new Date(roster.lastUpdated).toLocaleString();
        const item = document.createElement('div');
        item.className = 'guild-list-item';
        item.innerHTML = `
            <div class="guild-info">
                <div class="name">${guildName}</div>
                <div class="details">Updated: ${lastUpdated} | ${memberCount} members</div>
            </div>
            <div class="guild-actions">
                <button class="update-btn" data-guild-name="${guildName}">Update Roster</button>
                <button class="delete-btn" data-guild-name="${guildName}">Delete</button>
            </div>
        `;
        DOMElements.guildListContainer.appendChild(item);
    }
}

export function displayCombinedRoster() {
    if (state.currentRosterMembers.length > 0) {
        DOMElements.rosterDisplayContainer.classList.remove('hidden');
        DOMElements.rosterCount.textContent = state.currentRosterMembers.length;
        DOMElements.rosterDisplay.innerHTML = state.currentRosterMembers.sort().map(name => `<span>${name}</span>`).join('');
    } else {
        DOMElements.rosterDisplayContainer.classList.add('hidden');
    }
}

export function displayResults(dataArray) {
    DOMElements.tableBody.innerHTML = '';
    DOMElements.summaryStatsEl.innerHTML = `<p><strong>Players Found:</strong> ${dataArray.length}</p>`;
    if (!dataArray || dataArray.length === 0) {
        DOMElements.tableBody.innerHTML = '<tr><td colspan="10">No data to display.</td></tr>';
        return;
    }
    const CONFIDENCE_THRESHOLD = 85;
    dataArray.forEach(player => {
        const row = document.createElement('tr');
        const isOfficial = state.currentRosterMembers.includes(player.familyName);
        const nameClass = isOfficial ? '' : 'class="name-warning"';
        let rowHTML = `<td ${nameClass}>${player.familyName}</td>`;
        const statKeys = ['commandPostDestroyed', 'fortsDestroyed', 'gatesDestroyed', 'mountsKilled', 'objectsDestroyed', 'kills', 'deaths'];
        statKeys.forEach(key => {
            const stat = player[key];
            const value = stat.value;
            const confidence = stat.confidence;
            if (typeof value === 'number') {
                if (confidence < CONFIDENCE_THRESHOLD) {
                    rowHTML += `<td class="ocr-warning" contenteditable="true" data-player="${player.familyName}" data-stat="${key}">${value}</td>`;
                } else {
                    rowHTML += `<td>${value}</td>`;
                }
            } else {
                rowHTML += `<td class="ocr-error" contenteditable="true" data-player="${player.familyName}" data-stat="${key}">${value || ''}</td>`;
            }
        });
        const kills = player.kills.value;
        const deaths = player.deaths.value;
        const isKdCalculable = typeof kills === 'number' && typeof deaths === 'number';
        const kdRatio = isKdCalculable ? (deaths === 0 ? kills.toFixed(2) : (kills / deaths).toFixed(2)) : 'N/A';
        rowHTML += `<td>${kdRatio}</td>`;
        rowHTML += `<td><button class="delete-row-btn" data-player-name="${player.familyName}">Delete</button></td>`;
        row.innerHTML = rowHTML;
        DOMElements.tableBody.appendChild(row);
    });
    DOMElements.resultsEl.classList.remove('hidden');
}