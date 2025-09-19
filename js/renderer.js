import { state } from './state.js';
import { DOMElements } from './uiElements.js';
import { resetUI, showNotification } from './ui.js';
import { loadRostersFromStorage, addGuild, deleteGuild, updateRosterFromHtml } from './roster.js';
import { aggregateData, sortAndDisplay } from './analyzer.js';
import { initializeHistory, saveToHistory, loadFromHistory, deleteFromHistory } from './history.js';
import { exportToXML } from './export.js';

async function handleAnalysis(files) {
    if (!files || files.length === 0) {
        return showNotification("Please select one or more image files!", true);
    }
    const ocrSettings = {
        threshold: parseInt(DOMElements.thresholdSlider.value, 10),
        brightness: parseFloat(DOMElements.brightnessSlider.value)
    };
    DOMElements.analyzeBtn.disabled = true;
    showNotification(`Analyzing ${files.length} image(s) with T:${ocrSettings.threshold} B:${ocrSettings.brightness}...`);
    for (const file of files) {
        try {
            const data = await window.electronAPI.analyzeImage({ imagePath: file.path, settings: ocrSettings });
            aggregateData(data);
        } catch (error) {
            showNotification(`Failed to analyze ${file.name}: ${error}`, true);
        }
    }
    sortAndDisplay();
    showNotification(`✅ Analysis complete!`);
    DOMElements.analyzeBtn.disabled = false;
    DOMElements.imageUpload.value = '';
}

function setupEventListeners() {
    DOMElements.analyzeBtn.addEventListener('click', () => handleAnalysis(DOMElements.imageUpload.files));
    
    DOMElements.imageUpload.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const reader = new FileReader();
            reader.onload = (event) => {
                DOMElements.imagePreview.src = event.target.result;
                DOMElements.imagePreviewContainer.classList.remove('hidden');
            };
            reader.readAsDataURL(files[0]);
        }
    });

    DOMElements.thresholdSlider.addEventListener('input', (e) => {
        DOMElements.thresholdValue.textContent = e.target.value;
    });

    DOMElements.brightnessSlider.addEventListener('input', (e) => {
        DOMElements.brightnessValue.textContent = parseFloat(e.target.value).toFixed(1);
    });

    DOMElements.resetBtn.addEventListener('click', () => {
        resetUI();
    });

    DOMElements.saveBtn.addEventListener('click', saveToHistory);
    DOMElements.exportXmlBtn.addEventListener('click', exportToXML);

    DOMElements.addGuildBtn.addEventListener('click', () => {
        const guildName = DOMElements.newGuildNameInput.value.trim();
        addGuild(guildName);
        DOMElements.newGuildNameInput.value = '';
    });
    
    DOMElements.guildListContainer.addEventListener('click', async (e) => {
        const target = e.target;
        const guildName = target.dataset.guildName;
        if (!guildName) return;
        if (target.classList.contains('delete-btn')) {
            deleteGuild(guildName);
        }
        if (target.classList.contains('update-btn')) {
            showNotification(`Fetching roster for ${guildName}...`);
            target.disabled = true;
            try {
                const html = await window.electronAPI.fetchRoster(guildName);
                if (!html) {
                    throw new Error("Received no data from main process.");
                }
                updateRosterFromHtml(html, guildName);
            } catch (error) {
                showNotification(`Failed to fetch roster: ${error}`, true);
                console.error('IPC fetch error:', error);
            } finally {
                target.disabled = false;
            }
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
            if (!isNaN(correctedValue)) {
                playerToUpdate[statName].value = correctedValue;
                playerToUpdate[statName].confidence = 100;
                e.target.className = '';
                sortAndDisplay();
            } else {
                e.target.textContent = playerToUpdate[statName].value;
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

window.addEventListener('DOMContentLoaded', initialize);