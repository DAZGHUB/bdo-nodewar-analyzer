/**
 * @fileoverview Main entry point for the application. Initializes all modules and sets up event listeners.
 */

import { state } from './state.js';
import { DOMElements } from './uiElements.js';
import { resetUI, showNotification } from './ui.js';
import { loadRostersFromStorage, addGuild, deleteGuild, updateRosterFromFile } from './roster.js';
import { handleAnalysisTrigger, getCropper, closeCropModal, runAnalysis, sortAndDisplay } from './analyzer.js';
import { initializeHistory, saveToHistory, loadFromHistory, deleteFromHistory } from './history.js';
import { exportToXML } from './export.js';

const CROP_STORAGE_KEY = 'guildStatsCropData';

function setupEventListeners() {
    DOMElements.analyzeBtn.addEventListener('click', () => handleAnalysisTrigger(DOMElements.imageUpload.files));
    DOMElements.resetBtn.addEventListener('click', () => {
    state.aggregatedData.clear(); // 1. Clear the data from the state
    resetUI();                    // 2. Update the UI
});
    DOMElements.saveBtn.addEventListener('click', saveToHistory);
    DOMElements.exportXmlBtn.addEventListener('click', exportToXML);

    DOMElements.addGuildBtn.addEventListener('click', () => {
        const guildName = DOMElements.newGuildNameInput.value.trim();
        addGuild(guildName);
        DOMElements.newGuildNameInput.value = '';
    });

    // --- New Listeners for Cropping ---
    DOMElements.resetCropBtn.addEventListener('click', () => {
        localStorage.removeItem(CROP_STORAGE_KEY);
        showNotification('Crop selection has been reset. You will be asked to select it again on the next analysis.');
    });

    DOMElements.cancelCropBtn.addEventListener('click', closeCropModal);

    DOMElements.confirmCropBtn.addEventListener('click', () => {
        const cropper = getCropper();
        if (cropper) {
            const cropData = cropper.getData(true); // Get rounded integer values
            localStorage.setItem(CROP_STORAGE_KEY, JSON.stringify(cropData));
            showNotification('Crop selection saved!');
            closeCropModal();
            runAnalysis();
        }
    });
    // --- End New Listeners ---

    DOMElements.guildListContainer.addEventListener('click', (e) => {
        const guildName = e.target.dataset.guildName;
        if (e.target.classList.contains('delete-btn')) {
            deleteGuild(guildName);
        }
    });

    DOMElements.guildListContainer.addEventListener('change', (e) => {
        if (e.target.classList.contains('update-roster-input')) {
            const file = e.target.files[0];
            const guildName = e.target.dataset.guildName;
            updateRosterFromFile(file, guildName);
            e.target.value = '';
        }
    });

    document.querySelectorAll('th[data-column]').forEach(header => {
        header.addEventListener('click', () => sortAndDisplay(header.dataset.column, false));
    });

    DOMElements.historyList.addEventListener('click', (e) => {
        const id = e.target.closest('li')?.dataset.id;
        if (!id) return;
        if (e.target.classList.contains('load-btn')) loadFromHistory(id);
        if (e.target.classList.contains('delete-btn')) deleteFromHistory(id);
    });

    DOMElements.tableBody.addEventListener('blur', (e) => {
        if (e.target && e.target.isContentEditable) {
            const familyName = e.target.dataset.player;
            const statName = e.target.dataset.stat;
            const playerToUpdate = state.aggregatedData.get(familyName);
            if (!playerToUpdate) return;

            const correctedValue = parseInt(e.target.textContent, 10);
            
            // --- MODIFICATION ---
            // Update the 'value' property of the stat object
            if (!isNaN(correctedValue)) {
                playerToUpdate[statName].value = correctedValue;
                playerToUpdate[statName].confidence = 100; // Manually corrected, so confidence is 100
                e.target.className = ''; // Remove warning/error class
                sortAndDisplay();
            } else {
                e.target.textContent = playerToUpdate[statName].value; // Revert on invalid input
            }
        }
    }, true);

    DOMElements.tableBody.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('delete-row-btn')) {
            const familyName = e.target.dataset.playerName;
            if (confirm(`Are you sure you want to delete the row for ${familyName}?`)) {
                state.aggregatedData.delete(familyName);
                sortAndDisplay();
            }
        }
    });
}


function initialize() {
    loadRostersFromStorage();
    initializeHistory();
    setupEventListeners();
    console.log("Guild Stats Toolkit Initialized.");
}

// Start the application
window.addEventListener('DOMContentLoaded', initialize);