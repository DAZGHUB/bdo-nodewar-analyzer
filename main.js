import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchGuildHtml } from './fetcher.js';
import sharp from 'sharp';
import Tesseract from 'tesseract.js';
import { OCR_CORRECTIONS, STAT_KEYS } from './js/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseOcrData(ocrData) {
    const data = [];
    const CONFIDENCE_THRESHOLD = 85;

    ocrData.lines.forEach(line => {
        if (line.words.length < 2) return;

        let nameParts = [];
        let numberParts = [];
        let foundNumber = false;

        for (const word of line.words) {
            const cleanedText = word.text.replace(/[^a-zA-Z0-9]/g, '');
            if (!cleanedText) continue;

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
                    let confidence = word.confidence;
                    if (num === 0 && confidence > 60 && confidence < CONFIDENCE_THRESHOLD) {
                        confidence = 100;
                    }
                    stats[key] = { value: num, confidence: confidence };
                }
            }
        });

        if (errorCount < 3) {
            data.push({ familyName: name, ...stats });
        }
    });
    return data;
}

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1600,
        height: 900,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs')
        }
    });
    mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
    ipcMain.handle('fetch-roster', async (event, guildName) => {
        console.log(`IPC Received: Fetching roster for ${guildName}`);
        try {
            const html = await fetchGuildHtml(guildName);
            return html;
        } catch (error) {
            console.error('Failed to fetch guild HTML in main process:', error);
            return Promise.reject(error.message || 'An unknown error occurred.');
        }
    });

    ipcMain.handle('analyze-image', async (event, { imagePath, settings }) => {
        try {
            console.log(`Processing image: ${imagePath} with threshold: ${settings.threshold}`);
            
            const processedImageBuffer = await sharp(imagePath)
                .grayscale()
                .threshold(settings.threshold)
                .toBuffer();

            const debugPath = path.join(__dirname, 'debug_ocr_input.png');
            await sharp(processedImageBuffer).toFile(debugPath);
            console.log(`Debug image saved to: ${debugPath}`);

            const { data } = await Tesseract.recognize(processedImageBuffer, 'eng');
            const parsedData = parseOcrData(data);
            return parsedData;
        } catch (error) {
            console.error('An error occurred during image analysis:', error);
            return Promise.reject(error.message);
        }
    });

    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});