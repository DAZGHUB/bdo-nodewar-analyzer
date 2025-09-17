/**
 * @fileoverview Contains constant values used throughout the application.
 */

// A dictionary for correcting common OCR errors in names.
export const OCR_CORRECTIONS = {
    'IVP': 'JVP',
    'Anchar': 'Anghar'
};

// The keys for player stats, in the order they appear in the screenshot.
export const STAT_KEYS = [
    'commandPostDestroyed',
    'fortsDestroyed',
    'gatesDestroyed',
    'mountsKilled',
    'objectsDestroyed',
    'kills',
    'deaths'
];

// Default cropping dimensions for the screenshot analysis.
// In Phase 2, this will become user-configurable.
export const IMAGE_CROP_CONFIG = {
    x: 1240,
    y: 500,
    width: 1015,
    height: 605
};