/**
 * @fileoverview Handles exporting data to various formats.
 */

import {
    state
} from './state.js';
import {
    showNotification
} from './ui.js';

export function exportToXML() {
    if (state.aggregatedData.size === 0) return showNotification("No data to export!", true);

    let xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n<GuildStats>\n';
    const dataArray = Array.from(state.aggregatedData.values());

    dataArray.forEach(player => {
        xmlString += '  <Player>\n';
        for (const key in player) {
            const value = String(player[key]).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
            xmlString += `    <${key}>${value}</${key}>\n`;
        }
        xmlString += '  </Player>\n';
    });
    xmlString += '</GuildStats>';

    const blob = new Blob([xmlString], {
        type: 'application/xml'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GuildStats_${new Date().toISOString().slice(0, 10)}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}