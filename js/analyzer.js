/**
 * @fileoverview Handles image processing, OCR, and data analysis, including the interactive crop tool.
 */
import { state } from './state.js';
import { displayResults, showNotification } from './ui.js';
import { DOMElements } from './uiElements.js';
import { OCR_CORRECTIONS, STAT_KEYS } from './constants.js';

// Define storage key and module-level variables for the Cropper instance and pending files.
const CROP_STORAGE_KEY = 'guildStatsCropData';
let cropper = null;
let pendingFiles = null;

export function getCropper() {
    return cropper;
}

export function setPendingFiles(files) {
    pendingFiles = files;
}

export function openCropModal(imageUrl) {
    DOMElements.cropImage.src = imageUrl;
    DOMElements.cropModal.classList.remove('hidden');
    // Initialize Cropper.js
    cropper = new Cropper(DOMElements.cropImage, {
        viewMode: 1,
        autoCropArea: 0.8,
        background: false,
    });
}

export function closeCropModal() {
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }
    DOMElements.cropImage.src = '';
    DOMElements.cropModal.classList.add('hidden');
}

export async function runAnalysis() {
    if (!pendingFiles || pendingFiles.length === 0) return;
    const files = pendingFiles;
    pendingFiles = null;

    const savedCropData = JSON.parse(localStorage.getItem(CROP_STORAGE_KEY));
    if (!savedCropData) {
        return showNotification("Error: Crop data not found. Please reset and select the crop area again.", true);
    }

    for (let i = 0; i < files.length; i++) {
        showNotification(`Processing file ${i + 1} of ${files.length}: ${files[i].name}`);
        try {
            const data = await processImage(files[i], savedCropData);
            aggregateData(data);
        } catch (error) {
            console.error("Failed to process file:", files[i].name, error);
            showNotification(`Error processing ${files[i].name}.`, true);
        }
    }
    sortAndDisplay();
    DOMElements.imageUpload.value = ''; // Clear file input after analysis
    showNotification(`✅ Analysis complete! ${files.length} file(s) processed.`);
}

export function handleAnalysisTrigger(files) {
    if (state.currentRosterMembers.length === 0) {
        return showNotification("Please create and update a guild roster before analyzing.", true);
    }
    if (files.length === 0) return showNotification("Please select one or more image files!", true);

    setPendingFiles(files);
    const savedCropData = localStorage.getItem(CROP_STORAGE_KEY);

    if (savedCropData) {
        runAnalysis();
    } else {
        const firstImageFile = files[0];
        const imageUrl = URL.createObjectURL(firstImageFile);
        openCropModal(imageUrl);
        showNotification("First time setup: Please select the stats area on the image.");
    }
}

async function processImage(file, cropData) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = async function() {
                DOMElements.preprocessingEl.classList.remove('hidden');
                
                const { x, y, width, height } = cropData;
                
                const canvas = DOMElements.previewCanvas;
                const ctx = canvas.getContext('2d');
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

                const scaleFactor = 1;
                const scaledCanvas = document.createElement('canvas');
                scaledCanvas.width = canvas.width * scaleFactor;
                scaledCanvas.height = canvas.height * scaleFactor;
                const scaledCtx = scaledCanvas.getContext('2d');
                scaledCtx.imageSmoothingEnabled = false;
                scaledCtx.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);

                const imageData = scaledCtx.getImageData(0, 0, scaledCanvas.width, scaledCanvas.height);
                const pixelData = imageData.data; // Renamed for clarity, though not required for the fix
                for (let i = 0; i < pixelData.length; i += 4) {
                    const avg = (pixelData[i] + pixelData[i + 1] + pixelData[i + 2]) / 3;
                    const color = avg > 100 ? 255 : 0;
                    pixelData[i] = pixelData[i + 1] = pixelData[i + 2] = color;
                }
                scaledCtx.putImageData(imageData, 0, 0);
                ctx.drawImage(scaledCanvas, 0, 0, canvas.width, canvas.height);

                // --- THE FIX ---
                // Rename the destructured 'data' variable to 'ocrData' to avoid conflict
                const { data: ocrData } = await Tesseract.recognize(scaledCanvas.toDataURL('image/png'), 'eng');
                resolve(parseOcrData(ocrData)); // Pass the correctly named variable
            };
            img.onerror = reject;
            img.src = event.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// --- COMPLETELY REWRITTEN FUNCTION ---
function parseOcrData(ocrData) {
    const data = [];
    const CONFIDENCE_THRESHOLD = 85; // We can adjust this value later

    ocrData.lines.forEach(line => {
        if (line.words.length < 2) return;

        let nameParts = [];
        let numberParts = []; // Will now store the full word object
        let foundNumber = false;

        for (const word of line.words) {
            const cleanedText = word.text.replace(/[^a-zA-Z0-9]/g, '');
            if (!cleanedText) continue;

            // Simple logic to separate name from numbers
            if (!foundNumber && isNaN(parseInt(cleanedText))) {
                nameParts.push(cleanedText);
            } else {
                foundNumber = true;
                numberParts.push(word);
            }
        }

        let name = nameParts.join(' ').trim();
        if (!name || name.toLowerCase().includes('family name')) return;
        if (OCR_CORRECTIONS[name]) {
            name = OCR_CORRECTIONS[name];
        }

        const stats = {};
        let errorCount = 0;
        
        STAT_KEYS.forEach((key, index) => {
            const word = numberParts[index];
            if (!word) {
                stats[key] = { value: '???', confidence: 0 };
                errorCount++;
            } else {
                const num = parseInt(word.text, 10);
                if (isNaN(num)) {
                    stats[key] = { value: word.text, confidence: word.confidence };
                    errorCount++;
                } else {
                    stats[key] = { value: num, confidence: word.confidence };
                }
            }
        });

        if (errorCount < 3) {
            data.push({ familyName: name, ...stats });
        }
    });
    return data;
}
// --- END OF COMPLETELY REWRITTEN FUNCTION ---


function aggregateData(newData) {
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
            valA = (typeof a.deaths !== 'number' || a.deaths === 0) ? (typeof a.kills === 'number' ? a.kills : -1) : a.kills / a.deaths;
            valB = (typeof b.deaths !== 'number' || b.deaths === 0) ? (typeof b.kills === 'number' ? b.kills : -1) : b.kills / b.deaths;
        } else {
            valA = a[state.sortState.column];
            valB = b[state.sortState.column];
        }
        if (typeof valA === 'string' && typeof valB === 'string') return valA.localeCompare(valB) * direction;
        if (typeof valA === 'string') return 1 * direction;
        if (typeof valB === 'string') return -1 * direction;
        return (valA - valB) * direction;
    });

    displayResults(dataArray);
}