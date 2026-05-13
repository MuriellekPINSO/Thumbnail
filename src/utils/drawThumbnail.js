import { hexToRgb, shiftHue } from './colors';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const W = 1280;
const H = 720;

// ─── BASIC HELPERS ───────────────────────────────────────────────────────────

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Image load failed: ' + src));
        img.src = src;
    });
}

function drawCover(ctx, img, x, y, w, h) {
    const scale = Math.max(w / img.width, h / img.height);
    const sw = img.width * scale, sh = img.height * scale;
    ctx.drawImage(img, x + (w - sw) / 2, y + (h - sh) / 2, sw, sh);
}

function drawContain(ctx, img, x, y, w, h) {
    const scale = Math.min(w / img.width, h / img.height);
    const sw = img.width * scale, sh = img.height * scale;
    ctx.drawImage(img, x + (w - sw) / 2, y + (h - sh) / 2, sw, sh);
}

function roundRectPath(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + w - rr, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
    ctx.lineTo(x + w, y + h - rr);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
    ctx.lineTo(x + rr, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
}

// ─── BACKGROUND FALLBACKS (when no AI image) ─────────────────────────────────

function drawFallbackBackground(ctx, style, accent) {
    const rgb = hexToRgb(accent);

    if (style === 'clean') {
        ctx.fillStyle = '#f5f4f0';
        ctx.fillRect(0, 0, W, H);
        const grad = ctx.createRadialGradient(W * 0.75, H * 0.3, 0, W * 0.75, H * 0.3, W * 0.7);
        grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.18)`);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
        return;
    }

    if (style === 'vibrant') {
        const bg = ctx.createLinearGradient(0, H, W, 0);
        bg.addColorStop(0, shiftHue(accent, -30));
        bg.addColorStop(1, shiftHue(accent, 30));
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);
        return;
    }

    // bold / dark
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0a0a10');
    bg.addColorStop(1, '#15151e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const glow = ctx.createRadialGradient(W * 0.7, H * 0.45, 0, W * 0.7, H * 0.45, W * 0.6);
    glow.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.35)`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    if (style === 'dark') {
        // vignette
        const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.95);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.85)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
    }
}

// ─── PERSON CUTOUT (already detoured by background-removal) ──────────────────

function drawPersonCutout(ctx, personImg, side /* 'left' | 'right' */) {
    if (!personImg) return;
    const targetW = W * 0.46;
    const targetH = H * 1.0;

    // Cover-scale, anchored to bottom (feet at bottom, face higher up)
    const scale = Math.max(targetW / personImg.width, targetH / personImg.height);
    const sw = personImg.width * scale;
    const sh = personImg.height * scale;
    const dx = side === 'left'
        ? (targetW - sw) / 2                // anchored to left side
        : W - targetW + (targetW - sw) / 2; // anchored to right side
    const dy = H - sh;                       // anchor to bottom

    // Soft drop shadow behind the cutout for separation
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 38;
    ctx.shadowOffsetX = side === 'left' ? 8 : -8;
    ctx.shadowOffsetY = 12;
    ctx.drawImage(personImg, dx, dy, sw, sh);
    ctx.restore();
}

// ─── LOGO LAYOUTS ────────────────────────────────────────────────────────────

/**
 * Render company logos. Layout adapts to count:
 *  - 1 logo  → hero centered with halo
 *  - 2 logos → VS battle (logoA · × · logoB)
 *  - 3-4     → horizontal grid
 *
 * If a person is present, logos are placed in the right zone (smaller).
 * If no person, logos take the central stage.
 */
function drawLogos(ctx, logos, hasPerson, accent) {
    if (!logos || !logos.length) return;
    const rgb = hexToRgb(accent);

    // With a person on the left, logos sit small in the upper-right.
    // Without a person, they take a generous central zone.
    const zoneX = hasPerson ? W * 0.50 : 0;
    const zoneW = hasPerson ? W * 0.46 : W;
    const zoneY = hasPerson ? H * 0.06 : H * 0.18;
    const zoneH = hasPerson ? H * 0.28 : H * 0.55;
    const cx = zoneX + zoneW / 2;
    const cy = zoneY + zoneH / 2;

    // Absolute size cap so the brand cards don't dominate the composition.
    const maxLogoSize = hasPerson ? 160 : 300;

    if (logos.length === 1) {
        const size = Math.min(zoneW * 0.7, zoneH * 0.9, maxLogoSize);
        drawLogoChip(ctx, logos[0].img, cx - size / 2, cy - size / 2, size, size, accent, true);
        return;
    }

    if (logos.length === 2) {
        const size = Math.min(zoneW * 0.40, zoneH * 0.85, maxLogoSize);
        const gap = hasPerson ? Math.max(36, size * 0.28) : zoneW * 0.08;
        const totalW = size * 2 + gap;
        const startX = cx - totalW / 2;

        drawLogoChip(ctx, logos[0].img, startX, cy - size / 2, size, size, accent, true);
        drawLogoChip(ctx, logos[1].img, startX + size + gap, cy - size / 2, size, size, accent, true);

        // VS / × separator — scales with logo size so it doesn't dwarf small logos
        const sepSize = Math.round(size * 0.45);
        ctx.save();
        ctx.font = `900 ${sepSize}px Syne, Impact, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = accent;
        ctx.shadowColor = `rgba(${rgb.r},${rgb.g},${rgb.b},0.9)`;
        ctx.shadowBlur = sepSize * 0.4;
        ctx.lineWidth = Math.max(3, sepSize * 0.1);
        ctx.strokeStyle = 'rgba(0,0,0,0.85)';
        ctx.strokeText('×', cx, cy);
        ctx.fillText('×', cx, cy);
        ctx.restore();
        return;
    }

    // 3 or 4 → horizontal grid
    const n = logos.length;
    const gap = zoneW * 0.04;
    const rawSize = (zoneW - gap * (n - 1)) / n;
    const itemSize = Math.min(rawSize, zoneH * 0.7, maxLogoSize);
    const totalW = itemSize * n + gap * (n - 1);
    const startX = cx - totalW / 2;
    for (let i = 0; i < n; i++) {
        drawLogoChip(ctx, logos[i].img, startX + i * (itemSize + gap), cy - itemSize / 2, itemSize, itemSize, accent, false);
    }
}

function drawLogoChip(ctx, img, x, y, w, h, accent, withHalo) {
    const rgb = hexToRgb(accent);

    if (withHalo) {
        // Radial halo behind the logo
        const cx = x + w / 2, cy = y + h / 2;
        const halo = ctx.createRadialGradient(cx, cy, w * 0.15, cx, cy, w * 0.85);
        halo.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.55)`);
        halo.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = halo;
        ctx.fillRect(x - w * 0.15, y - h * 0.15, w * 1.3, h * 1.3);
    }

    // White rounded card behind the logo for max readability
    const padding = w * 0.12;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#ffffff';
    roundRectPath(ctx, x, y, w, h, w * 0.18);
    ctx.fill();
    ctx.restore();

    // Logo image, contained inside the card
    drawContain(ctx, img, x + padding, y + padding, w - padding * 2, h - padding * 2);
}

// ─── TEXT RENDERING ─────────────────────────────────────────────────────────

const STYLE_TEXT_CONFIG = {
    bold: {
        titleFont: '900 96px Syne, Impact, sans-serif',
        titleColor: '#ffffff',
        stroke: { color: 'rgba(0,0,0,0.9)', width: 10 },
        glow: 0.85,
        subColor: 'rgba(255,255,255,0.85)',
        tagBg: null,
        tagColor: '#000',
    },
    clean: {
        titleFont: '800 86px Syne, sans-serif',
        titleColor: '#0a0a14',
        stroke: { color: 'rgba(255,255,255,0.5)', width: 2 },
        glow: 0,
        subColor: '#444',
        tagBg: null,
        tagColor: '#000',
    },
    dark: {
        titleFont: '900 92px Syne, Impact, sans-serif',
        titleColor: '#ffffff',
        stroke: { color: 'rgba(0,0,0,0.92)', width: 9 },
        glow: 1,
        subColor: null,  // uses accent
        tagBg: null,
        tagColor: '#000',
    },
    vibrant: {
        titleFont: '900 92px Syne, sans-serif',
        titleColor: '#ffffff',
        stroke: { color: 'rgba(0,0,0,0.95)', width: 12 },
        glow: 0,
        subColor: 'rgba(255,255,255,0.95)',
        tagBg: 'rgba(0,0,0,0.35)',
        tagColor: '#fff',
    },
};

function wrapLines(ctx, text, maxWidth) {
    const words = text.split(/\s+/).filter(Boolean);
    const lines = [];
    let current = '';
    for (const word of words) {
        const candidate = current ? current + ' ' + word : word;
        const w = ctx.measureText(candidate).width;
        if (w > maxWidth && current) {
            lines.push(current);
            current = word;
        } else {
            current = candidate;
        }
    }
    if (current) lines.push(current);
    return lines;
}

/**
 * Fit text into a bounding box by shrinking font size until lines fit.
 * Returns the chosen font size.
 */
function fitText(ctx, text, baseFont, maxW, maxH, minSize = 40) {
    const [weight, sizePart, ...rest] = baseFont.split(' ');
    const family = rest.join(' ');
    let size = parseInt(sizePart, 10);

    while (size >= minSize) {
        ctx.font = `${weight} ${size}px ${family}`;
        const lineH = size * 1.05;
        const lines = wrapLines(ctx, text, maxW);
        const totalH = lines.length * lineH;
        if (totalH <= maxH && lines.length <= 3) {
            return { size, lines, lineH };
        }
        size -= 4;
    }
    ctx.font = `${weight} ${size}px ${family}`;
    return { size, lines: wrapLines(ctx, text, maxW), lineH: size * 1.05 };
}

function drawTitle(ctx, text, x, y, maxW, maxH, cfg, accent, align = 'left') {
    if (!text) return 0;

    const fit = fitText(ctx, text, cfg.titleFont, maxW, maxH);
    const [weight, , ...rest] = cfg.titleFont.split(' ');
    const family = rest.join(' ');
    ctx.font = `${weight} ${fit.size}px ${family}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';

    const rgb = hexToRgb(accent);

    fit.lines.forEach((line, i) => {
        const ly = y + i * fit.lineH;

        // Glow behind text (for dark/bold styles)
        if (cfg.glow > 0) {
            ctx.save();
            ctx.shadowColor = `rgba(${rgb.r},${rgb.g},${rgb.b},${cfg.glow})`;
            ctx.shadowBlur = 28;
            ctx.fillStyle = cfg.titleColor;
            ctx.fillText(line, x, ly);
            ctx.restore();
        }

        // Stroke
        if (cfg.stroke) {
            ctx.save();
            ctx.lineJoin = 'round';
            ctx.miterLimit = 2;
            ctx.strokeStyle = cfg.stroke.color;
            ctx.lineWidth = cfg.stroke.width;
            ctx.strokeText(line, x, ly);
            ctx.restore();
        }

        // Fill
        ctx.fillStyle = cfg.titleColor;
        ctx.fillText(line, x, ly);
    });

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    return fit.lines.length * fit.lineH;
}

function drawSubtitle(ctx, text, x, y, maxW, cfg, accent) {
    if (!text) return;
    ctx.font = '600 30px DM Sans, sans-serif';
    ctx.fillStyle = cfg.subColor || accent;
    ctx.textBaseline = 'top';
    const lines = wrapLines(ctx, text, maxW);
    lines.slice(0, 2).forEach((line, i) => {
        ctx.fillText(line, x, y + i * 36);
    });
    ctx.textBaseline = 'alphabetic';
}

function drawTag(ctx, text, x, y, cfg, accent) {
    if (!text) return;
    ctx.font = '800 22px Syne, sans-serif';
    const upper = text.toUpperCase();
    const padX = 16, padY = 9;
    const textW = ctx.measureText(upper).width;
    const w = textW + padX * 2;
    const h = 34;

    ctx.save();
    ctx.fillStyle = cfg.tagBg || accent;
    roundRectPath(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.fillStyle = cfg.tagColor;
    ctx.textBaseline = 'top';
    ctx.fillText(upper, x + padX, y + padY);
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
}

// ─── BACKGROUND DARKENING (helps text readability) ───────────────────────────

function drawTextSafeOverlay(ctx, textZone, hasDarkBg) {
    // Add a soft dark gradient behind the text zone so text always reads well
    // even on a busy AI background.
    if (hasDarkBg) {
        const grad = ctx.createLinearGradient(textZone.x, 0, textZone.x + textZone.w, 0);
        grad.addColorStop(0, 'rgba(0,0,0,0.55)');
        grad.addColorStop(0.7, 'rgba(0,0,0,0.25)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(textZone.x, textZone.y, textZone.w, textZone.h);
    }
}

// ─── MAIN COMPOSITION ────────────────────────────────────────────────────────

/**
 * Compose the final thumbnail from all assets.
 *
 * @param {object} opts
 * @param {string|null} opts.aiBgUrl       - Data URL of AI-generated background (or null → fallback)
 * @param {HTMLImageElement|null} opts.personImg - Already detoured person cutout (transparent bg)
 * @param {Array<{img:HTMLImageElement, name?:string}>|null} opts.logos - Optional logos
 * @param {string} opts.title
 * @param {string} [opts.subtitle]
 * @param {string} [opts.tag]
 * @param {string} opts.style - bold | clean | dark | vibrant
 * @param {string} opts.color - Hex accent color
 * @param {string} opts.variant - 'left-image' | 'centered' | 'split'
 * @returns {Promise<string>} Data URL PNG 1280×720
 */
export async function composeThumbnail({
    aiBgUrl,
    personImg = null,
    logos = null,
    title,
    subtitle = '',
    tag = '',
    style = 'bold',
    color = '#e8ff3c',
    variant = 'left-image',
}) {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // 1) Background
    if (aiBgUrl) {
        try {
            const bgImg = await loadImage(aiBgUrl);
            drawCover(ctx, bgImg, 0, 0, W, H);
        } catch (e) {
            console.warn('AI bg load failed, using fallback:', e);
            drawFallbackBackground(ctx, style, color);
        }
    } else {
        drawFallbackBackground(ctx, style, color);
    }

    const hasPerson = !!personImg;
    const hasLogos  = !!(logos && logos.length);
    const isLight   = style === 'clean';

    // Determine person side and text side
    const personSide = variant === 'split' ? 'right' : 'left';
    const textSide   = personSide === 'left' ? 'right' : 'left';

    // 2) Logos — drawn before person so person overlaps if needed
    if (hasLogos) {
        drawLogos(ctx, logos, hasPerson, color);
    }

    // 3) Person cutout
    if (hasPerson) {
        drawPersonCutout(ctx, personImg, personSide);
    }

    // 4) Text zone — opposite to the person, or center if no person
    const cfg = STYLE_TEXT_CONFIG[style] || STYLE_TEXT_CONFIG.bold;

    let textZone;
    if (hasPerson && hasLogos) {
        // Person bottom-left, logos top-right, title fills the middle-right zone
        textZone = { x: W * 0.48, y: H * 0.38, w: W * 0.50, h: H * 0.56 };
    } else if (hasPerson) {
        textZone = textSide === 'right'
            ? { x: W * 0.48, y: H * 0.18, w: W * 0.46, h: H * 0.64 }
            : { x: 60,       y: H * 0.18, w: W * 0.46, h: H * 0.64 };
    } else if (hasLogos) {
        // Logos centered above; text below
        textZone = { x: 80, y: H * 0.62, w: W - 160, h: H * 0.32 };
    } else {
        // No subject — text dominates left
        textZone = variant === 'centered'
            ? { x: 80, y: H * 0.22, w: W - 160, h: H * 0.56 }
            : { x: 80, y: H * 0.20, w: W * 0.70, h: H * 0.60 };
    }

    // Soft darkening behind text on non-clean styles
    if (!isLight) drawTextSafeOverlay(ctx, textZone, true);

    let cursorY = textZone.y;

    if (tag) {
        drawTag(ctx, tag, textZone.x, cursorY, cfg, color);
        cursorY += 50;
    }

    // Reserve space for subtitle if present
    const subReserve = subtitle ? 80 : 0;
    const titleH = drawTitle(
        ctx, title, textZone.x, cursorY,
        textZone.w, textZone.h - (cursorY - textZone.y) - subReserve,
        cfg, color,
    );

    if (subtitle) {
        drawSubtitle(ctx, subtitle, textZone.x, cursorY + titleH + 18, textZone.w, cfg, color);
    }

    // 5) Accent edge on the right (signature)
    if (!isLight) {
        ctx.fillStyle = color;
        ctx.fillRect(W - 4, 0, 4, H);
    }

    return canvas.toDataURL('image/png');
}

// ─── LEGACY EXPORTS (kept for compatibility while migrating) ─────────────────

export function downloadCanvas(canvas, title, label) {
    const link = document.createElement('a');
    link.download = `${title.replace(/\s+/g, '-').toLowerCase()}-${label.replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

export function downloadDataUrl(dataUrl, title, label) {
    const link = document.createElement('a');
    link.download = `${(title || 'thumbnail').replace(/\s+/g, '-').toLowerCase()}-${label.replace(/\s+/g, '-')}.png`;
    link.href = dataUrl;
    link.click();
}
