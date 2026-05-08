export function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}

export function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h, s, l];
}

export function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function hue2rgb(p, q, t) {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
}

export function shiftHue(hex, amount) {
    const { r, g, b } = hexToRgb(hex);
    const [h, s, l] = rgbToHsl(r, g, b);
    const [r2, g2, b2] = hslToRgb((h + amount / 360 + 1) % 1, s, l);
    return `rgb(${r2},${g2},${b2})`;
}

// ─── Mix / Darken / Lighten helpers ─────────────────────────────────────────

function clamp255(v) { return Math.max(0, Math.min(255, Math.round(v))); }

/**
 * Linear-interpolate two hex colors.
 * @param {string} a   - hex like '#a855f7'
 * @param {string} b   - hex like '#22d3ee'
 * @param {number} t   - 0..1 (0 = a, 1 = b)
 * @returns {string}   - rgb(...) string
 */
export function mixHex(a, b, t) {
    const ca = hexToRgb(a);
    const cb = hexToRgb(b);
    const k = Math.max(0, Math.min(1, t));
    return `rgb(${clamp255(ca.r + (cb.r - ca.r) * k)},${clamp255(ca.g + (cb.g - ca.g) * k)},${clamp255(ca.b + (cb.b - ca.b) * k)})`;
}

/**
 * Darken a hex toward black. factor 0 = unchanged, 1 = black.
 */
export function darken(hex, factor) {
    const { r, g, b } = hexToRgb(hex);
    const k = 1 - Math.max(0, Math.min(1, factor));
    return `rgb(${clamp255(r * k)},${clamp255(g * k)},${clamp255(b * k)})`;
}

/**
 * Lighten a hex toward white. factor 0 = unchanged, 1 = white.
 */
export function lighten(hex, factor) {
    const { r, g, b } = hexToRgb(hex);
    const k = Math.max(0, Math.min(1, factor));
    return `rgb(${clamp255(r + (255 - r) * k)},${clamp255(g + (255 - g) * k)},${clamp255(b + (255 - b) * k)})`;
}

/**
 * Normalize a colors prop to an array (1..3). Accepts:
 *   - undefined / null → fallback
 *   - string → [string]
 *   - array → array (clamped to length 3)
 */
export function normalizeColors(input, fallback = ['#a855f7']) {
    if (!input) return fallback.slice(0, 3);
    if (typeof input === 'string') return [input];
    if (Array.isArray(input)) {
        const filtered = input.filter(c => typeof c === 'string' && c.length > 0);
        return (filtered.length > 0 ? filtered : fallback).slice(0, 3);
    }
    return fallback.slice(0, 3);
}
