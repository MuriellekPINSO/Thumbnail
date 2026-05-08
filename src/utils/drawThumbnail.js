import { hexToRgb, shiftHue, mixHex, darken, lighten, normalizeColors } from './colors';

// ─── LAYOUT HELPERS ─────────────────────────────────────────────────────────

function getImageArea(variant, W, H) {
    if (variant === 'left-image') return { x: 0, y: 0, w: W * 0.5, h: H };
    if (variant === 'split') return { x: W * 0.5, y: 0, w: W * 0.5, h: H };
    return { x: 0, y: 0, w: W, h: H };
}

function getTextX(variant, W) {
    if (variant === 'left-image') return W * 0.52;
    return 80;
}

function getTextWidth(variant, W) {
    if (variant === 'left-image') return W * 0.44;
    if (variant === 'split') return W * 0.44;
    return W * 0.7;
}

function drawImageFit(ctx, img, x, y, w, h) {
    const scale = Math.max(w / img.width, h / img.height);
    const sw = img.width * scale, sh = img.height * scale;
    ctx.drawImage(img, x + (w - sw) / 2, y + (h - sh) / 2, sw, sh);
}

function drawWrappedText(ctx, text, x, y, maxW, lineH, font, color, lineSpacing = 1.15, align = 'left') {
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxW && n > 0) {
            ctx.fillText(line.trim(), x, currentY);
            line = words[n] + ' ';
            currentY += lineH * lineSpacing;
        } else {
            line = testLine;
        }
    }
    ctx.fillText(line.trim(), x, currentY);
    ctx.textAlign = 'left';
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
}

// ─── STYLE: BOLD IMPACT ──────────────────────────────────────────────────────

function drawBold(ctx, W, H, palette, title, subtitle, tag, variant, index, uploadedImages) {
    const [primary, secondary, tertiary] = palette;
    const rgb = hexToRgb(primary);
    const sec = secondary ? hexToRgb(secondary) : { r: 22, g: 18, b: 36 };

    // ─── 1. Multi-stop cinematic background ───
    // Deep dark base, tinted by secondary, with a subtle two-zone gradient.
    const baseDark = secondary ? darken(secondary, 0.86) : '#0a0a12';
    const baseDeep = secondary ? darken(secondary, 0.95) : '#04040a';
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, baseDark);
    bg.addColorStop(0.55, baseDeep);
    bg.addColorStop(1, baseDark);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // ─── 2. Volumetric light ray from upper corner ───
    const rayCenterX = variant === 'left-image' ? W * 0.85 : W * 0.15;
    const rayGrad = ctx.createRadialGradient(rayCenterX, -50, 0, rayCenterX, -50, H * 1.4);
    rayGrad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.22)`);
    rayGrad.addColorStop(0.4, `rgba(${rgb.r},${rgb.g},${rgb.b},0.06)`);
    rayGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rayGrad;
    ctx.fillRect(0, 0, W, H);

    // ─── 3. Rim light along bottom-left & bottom-right (depth cue) ───
    const rimGrad = ctx.createRadialGradient(W * 0.5, H * 1.2, 0, W * 0.5, H * 1.2, W * 0.7);
    rimGrad.addColorStop(0, `rgba(${sec.r},${sec.g},${sec.b},0.28)`);
    rimGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rimGrad;
    ctx.fillRect(0, 0, W, H);

    // ─── 4. Fine perspective grid in lower third ───
    ctx.save();
    ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.06)`;
    ctx.lineWidth = 1;
    const horizonY = H * 0.7;
    // Horizontal receding lines
    for (let i = 0; i <= 6; i++) {
        const t = i / 6;
        const y = horizonY + (H - horizonY) * t * t;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    // Vanishing-point verticals
    for (let i = -4; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(W / 2, horizonY);
        ctx.lineTo(W / 2 + i * (W / 6), H);
        ctx.stroke();
    }
    ctx.restore();

    // ─── 5. Atmospheric haze overlay ───
    const hazeGrad = ctx.createLinearGradient(0, H * 0.3, 0, H);
    hazeGrad.addColorStop(0, 'rgba(0,0,0,0)');
    hazeGrad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0.05)`);
    ctx.fillStyle = hazeGrad;
    ctx.fillRect(0, 0, W, H);

    // ─── 6. Vignette to crush corners ───
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.95);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    // ─── 7. Optional uploaded image (subject area) with cinematic blend ───
    const imgArea = getImageArea(variant, W, H);
    if (uploadedImages.length > 0) {
        const imgSrc = uploadedImages[index % uploadedImages.length];
        drawImageFit(ctx, imgSrc.img, imgArea.x, imgArea.y, imgArea.w, imgArea.h);
        // Soft fade on the inside edge so subject blends into the dark scene
        const grad = ctx.createLinearGradient(imgArea.x, 0, imgArea.x + imgArea.w, 0);
        if (variant === 'left-image') {
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(0.55, 'rgba(0,0,0,0)');
            grad.addColorStop(1, baseDeep);
        } else if (variant === 'split') {
            grad.addColorStop(0, baseDeep);
            grad.addColorStop(0.45, 'rgba(0,0,0,0)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
        } else {
            // centered: subtle global darkening to keep text readable on top
            grad.addColorStop(0, 'rgba(0,0,0,0.45)');
            grad.addColorStop(1, 'rgba(0,0,0,0.45)');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(imgArea.x, imgArea.y, imgArea.w, imgArea.h);

        // Rim light highlighting the subject silhouette (primary color)
        const rimSide = variant === 'left-image' ? imgArea.x + imgArea.w - 6 : imgArea.x;
        const rimW = 6;
        const rimGradient = ctx.createLinearGradient(rimSide, 0, rimSide + rimW, 0);
        rimGradient.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.0)`);
        rimGradient.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},0.55)`);
        rimGradient.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0.0)`);
        ctx.fillStyle = rimGradient;
        ctx.fillRect(rimSide, imgArea.y, rimW, imgArea.h);
    }

    // ─── 8. Text block ───
    const textX = getTextX(variant, W);
    const textW = getTextWidth(variant, W);

    // Accent bar (primary)
    ctx.fillStyle = primary;
    ctx.fillRect(textX, H * 0.35, 60, 5);
    // Tertiary echo bar (if available)
    if (tertiary) {
        ctx.fillStyle = tertiary;
        ctx.fillRect(textX + 70, H * 0.35, 22, 5);
    }

    if (tag) {
        ctx.font = '700 22px Syne, sans-serif';
        ctx.fillStyle = tertiary || primary;
        ctx.fillText(tag.toUpperCase(), textX, H * 0.32);
    }

    // Title with glow + outline for legibility
    ctx.save();
    ctx.shadowColor = `rgba(${rgb.r},${rgb.g},${rgb.b},0.5)`;
    ctx.shadowBlur = 28;
    drawWrappedText(ctx, title, textX, H * 0.48, textW, 80, '900 76px Syne, sans-serif', '#ffffff', 1.1);
    ctx.restore();

    if (subtitle) {
        ctx.font = '500 30px DM Sans, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.62)';
        ctx.fillText(subtitle, textX, H * 0.82);
    }

    // Right-edge primary band
    ctx.fillStyle = primary;
    ctx.fillRect(W - 4, 0, 4, H);

    if (tertiary) {
        ctx.fillStyle = tertiary;
        ctx.fillRect(W - 4, H * 0.65, 4, H * 0.18);
    }
}

// ─── STYLE: CLEAN & PRO ──────────────────────────────────────────────────────

function drawClean(ctx, W, H, palette, title, subtitle, tag, variant, index, uploadedImages) {
    const [primary, secondary, tertiary] = palette;

    // Soft tinted off-white using secondary (or fallback off-white)
    const bg = secondary ? lighten(secondary, 0.92) : '#f5f4f0';
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    if (uploadedImages.length > 0) {
        const imgArea = getImageArea(variant, W, H);
        const imgSrc = uploadedImages[index % uploadedImages.length];
        drawImageFit(ctx, imgSrc.img, imgArea.x, imgArea.y, imgArea.w, imgArea.h);
    }

    // Top bar: gradient if we have multiple colors, otherwise solid primary
    if (secondary) {
        const topGrad = ctx.createLinearGradient(0, 0, W, 0);
        topGrad.addColorStop(0, primary);
        topGrad.addColorStop(0.5, tertiary || mixHex(primary, secondary, 0.5));
        topGrad.addColorStop(1, secondary);
        ctx.fillStyle = topGrad;
    } else {
        ctx.fillStyle = primary;
    }
    ctx.fillRect(0, 0, W, 8);

    const textX = getTextX(variant, W);
    const textW = getTextWidth(variant, W);

    if (tag) {
        const tagW = ctx.measureText(tag.toUpperCase()).width + 32;
        ctx.fillStyle = primary;
        roundRect(ctx, textX, H * 0.28, tagW + 40, 36, 4);
        ctx.fillStyle = '#0a0a0c';
        ctx.font = 'bold 18px Syne, sans-serif';
        ctx.fillText(tag.toUpperCase(), textX + 16, H * 0.28 + 24);
    }

    drawWrappedText(ctx, title, textX, H * 0.42, textW, 76, 'bold 70px Syne, sans-serif', '#111114', 1.1);

    if (subtitle) {
        ctx.font = '400 30px DM Sans, sans-serif';
        ctx.fillStyle = '#555';
        ctx.fillText(subtitle, textX, H * 0.84);
    }

    // Bottom underline uses tertiary if available (else dark neutral)
    ctx.fillStyle = tertiary || '#111114';
    ctx.fillRect(textX, H - 40, 48, 3);
}

// ─── STYLE: DARK CINEMA ──────────────────────────────────────────────────────

function drawDark(ctx, W, H, palette, title, subtitle, tag, variant, index, uploadedImages) {
    const [primary, secondary, tertiary] = palette;
    const primaryRgb = hexToRgb(primary);

    // Deep moody bg tinted with secondary (else near-black)
    const bgBase = secondary ? darken(secondary, 0.92) : '#05050a';
    ctx.fillStyle = bgBase;
    ctx.fillRect(0, 0, W, H);

    if (uploadedImages.length > 0) {
        const imgArea = getImageArea(variant, W, H);
        const imgSrc = uploadedImages[index % uploadedImages.length];
        ctx.globalAlpha = 0.35;
        drawImageFit(ctx, imgSrc.img, imgArea.x, imgArea.y, imgArea.w, imgArea.h);
        ctx.globalAlpha = 1;
    }

    // Vignette using primary tint at edges (subtle)
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.9);
    vig.addColorStop(0, 'rgba(5,5,10,0)');
    vig.addColorStop(1, 'rgba(5,5,10,0.95)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    // Tertiary glow corner (if 3 colors)
    if (tertiary) {
        const tertRgb = hexToRgb(tertiary);
        const corner = ctx.createRadialGradient(W * 0.92, H * 0.08, 0, W * 0.92, H * 0.08, W * 0.35);
        corner.addColorStop(0, `rgba(${tertRgb.r},${tertRgb.g},${tertRgb.b},0.35)`);
        corner.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = corner;
        ctx.fillRect(0, 0, W, H);
    }

    // Scanlines
    for (let y = 0; y < H; y += 4) {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(0, y, W, 2);
    }

    const textX = variant === 'centered' ? W / 2 : 80;
    const textAlign = variant === 'centered' ? 'center' : 'left';
    const textW = variant === 'centered' ? W * 0.8 : W * 0.55;

    ctx.save();
    ctx.textAlign = textAlign;

    if (tag) {
        ctx.font = 'bold 20px Syne, sans-serif';
        ctx.fillStyle = tertiary || primary;
        ctx.fillText('— ' + tag.toUpperCase() + ' —', textX, H * 0.3);
    }

    ctx.shadowColor = primary;
    ctx.shadowBlur = 40;
    drawWrappedText(ctx, title, textX, H * 0.45, textW, 78, 'bold 72px Syne, sans-serif', '#ffffff', 1.1, textAlign);
    ctx.shadowBlur = 0;

    if (subtitle) {
        ctx.font = '300 28px DM Sans, sans-serif';
        ctx.fillStyle = `rgba(${primaryRgb.r},${primaryRgb.g},${primaryRgb.b},0.8)`;
        ctx.fillText(subtitle, textX, H * 0.84);
    }

    ctx.restore();
}

// ─── STYLE: VIBRANT POP ──────────────────────────────────────────────────────

function drawVibrant(ctx, W, H, palette, title, subtitle, tag, variant, index, uploadedImages) {
    const [primary, secondary, tertiary] = palette;

    // Multi-stop gradient using the palette directly
    const bg = ctx.createLinearGradient(0, 0, W, H);
    if (tertiary) {
        bg.addColorStop(0, primary);
        bg.addColorStop(0.5, secondary);
        bg.addColorStop(1, tertiary);
    } else if (secondary) {
        bg.addColorStop(0, primary);
        bg.addColorStop(1, secondary);
    } else {
        bg.addColorStop(0, shiftHue(primary, -30));
        bg.addColorStop(1, shiftHue(primary, 30));
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(W * 0.85, H * 0.15, 200, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(W * 0.1, H * 0.85, 150, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;

    if (uploadedImages.length > 0) {
        const imgSrc = uploadedImages[index % uploadedImages.length];
        const size = H * 0.75;
        const imgX = variant === 'left-image' ? 60 : W - size - 60;
        ctx.save();
        ctx.beginPath();
        ctx.arc(imgX + size / 2, H / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(imgSrc.img, imgX, H / 2 - size / 2, size, size);
        ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(imgX + size / 2, H / 2, size / 2, 0, Math.PI * 2);
        ctx.stroke();
    }

    const textX = getTextX(variant, W);
    const textW = getTextWidth(variant, W);
    ctx.save();

    if (tag) {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        roundRect(ctx, textX, H * 0.26, 200, 36, 18);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Syne, sans-serif';
        ctx.fillText(tag.toUpperCase(), textX + 16, H * 0.26 + 24);
    }

    drawWrappedText(ctx, title, textX, H * 0.4, textW, 78, 'bold 72px Syne, sans-serif', '#ffffff', 1.15);

    if (subtitle) {
        ctx.font = '500 28px DM Sans, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillText(subtitle, textX, H * 0.84);
    }

    ctx.restore();
}

// ─── STYLE: TECH REVIEW ──────────────────────────────────────────────────────

function drawTech(ctx, W, H, palette, title, subtitle, tag, variant, index, uploadedImages) {
    const [primary, secondary, tertiary] = palette;
    const rgb = hexToRgb(primary);

    // Sleek dark studio background, secondary-tinted
    const baseDark = secondary ? darken(secondary, 0.92) : '#0a0a0f';
    const baseMid  = secondary ? darken(secondary, 0.85) : '#14141c';
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, baseMid);
    bg.addColorStop(0.5, baseDark);
    bg.addColorStop(1, baseMid);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Hairline dot grid (very subtle, technical feel)
    ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.08)`;
    for (let x = 60; x < W; x += 60) {
        for (let y = 60; y < H; y += 60) {
            ctx.fillRect(x, y, 1.5, 1.5);
        }
    }

    // Horizontal product turntable hint — wide ellipse glow under center
    const tableY = H * 0.78;
    const tableGrad = ctx.createRadialGradient(W / 2, tableY, 0, W / 2, tableY, W * 0.5);
    tableGrad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.18)`);
    tableGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = tableGrad;
    ctx.fillRect(0, 0, W, H);

    // Top spectral light bar
    const barGrad = ctx.createLinearGradient(0, 0, W, 0);
    barGrad.addColorStop(0, 'rgba(255,255,255,0)');
    barGrad.addColorStop(0.4, `rgba(${rgb.r},${rgb.g},${rgb.b},0.22)`);
    barGrad.addColorStop(0.6, `rgba(${rgb.r},${rgb.g},${rgb.b},0.22)`);
    barGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, 0, W, 4);

    // Uploaded subject (centered for hero product feel)
    if (uploadedImages.length > 0) {
        const imgSrc = uploadedImages[index % uploadedImages.length];
        const imgArea = getImageArea(variant, W, H);
        drawImageFit(ctx, imgSrc.img, imgArea.x, imgArea.y, imgArea.w, imgArea.h);
        // Subtle inner edge fade to background
        const grad = ctx.createLinearGradient(imgArea.x, 0, imgArea.x + imgArea.w, 0);
        if (variant === 'left-image') {
            grad.addColorStop(0.6, 'rgba(0,0,0,0)');
            grad.addColorStop(1, baseDark);
        } else if (variant === 'split') {
            grad.addColorStop(0, baseDark);
            grad.addColorStop(0.4, 'rgba(0,0,0,0)');
        } else {
            grad.addColorStop(0, 'rgba(10,10,15,0.55)');
            grad.addColorStop(1, 'rgba(10,10,15,0.55)');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(imgArea.x, imgArea.y, imgArea.w, imgArea.h);
    }

    const textX = getTextX(variant, W);
    const textW = getTextWidth(variant, W);

    // Tag: monospace label in primary
    if (tag) {
        ctx.font = '700 18px "JetBrains Mono", "DM Sans", monospace';
        ctx.fillStyle = primary;
        ctx.fillText(tag.toUpperCase(), textX, H * 0.28);
        // Underline tick
        ctx.fillRect(textX, H * 0.3, 32, 2);
    }

    // Title — clean modern
    drawWrappedText(ctx, title, textX, H * 0.42, textW, 76, '800 70px "Inter", "DM Sans", sans-serif', '#ffffff', 1.1);

    if (subtitle) {
        ctx.font = '500 28px DM Sans, sans-serif';
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.85)`;
        ctx.fillText(subtitle, textX, H * 0.84);
    }

    // Tertiary corner accent (top-left small chevron) if 3 colors
    if (tertiary) {
        ctx.fillStyle = tertiary;
        ctx.fillRect(0, 0, 6, H * 0.18);
    }
}

// ─── STYLE: GAMING NEON ──────────────────────────────────────────────────────

function drawGaming(ctx, W, H, palette, title, subtitle, tag, variant, index, uploadedImages) {
    const [primary, secondary, tertiary] = palette;
    const rgb1 = hexToRgb(primary);
    const rgb2 = secondary ? hexToRgb(secondary) : { r: 34, g: 211, b: 238 };
    const rgb3 = tertiary ? hexToRgb(tertiary) : rgb2;

    // Pitch-black base
    ctx.fillStyle = '#04020a';
    ctx.fillRect(0, 0, W, H);

    // Top-left radial glow (primary)
    const glow1 = ctx.createRadialGradient(W * 0.1, H * 0.1, 0, W * 0.1, H * 0.1, W * 0.7);
    glow1.addColorStop(0, `rgba(${rgb1.r},${rgb1.g},${rgb1.b},0.55)`);
    glow1.addColorStop(0.5, `rgba(${rgb1.r},${rgb1.g},${rgb1.b},0.12)`);
    glow1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, W, H);

    // Bottom-right radial glow (tertiary or secondary)
    const glow2 = ctx.createRadialGradient(W * 0.92, H * 0.92, 0, W * 0.92, H * 0.92, W * 0.7);
    glow2.addColorStop(0, `rgba(${rgb3.r},${rgb3.g},${rgb3.b},0.55)`);
    glow2.addColorStop(0.5, `rgba(${rgb3.r},${rgb3.g},${rgb3.b},0.12)`);
    glow2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, W, H);

    // Diagonal energy band
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate((-22 * Math.PI) / 180);
    const beamGrad = ctx.createLinearGradient(0, -40, 0, 40);
    beamGrad.addColorStop(0, 'rgba(255,255,255,0)');
    beamGrad.addColorStop(0.5, `rgba(${rgb2.r},${rgb2.g},${rgb2.b},0.45)`);
    beamGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = beamGrad;
    ctx.fillRect(-W, -40, W * 2, 80);
    ctx.restore();

    // Speed lines from the right edge
    ctx.save();
    ctx.strokeStyle = `rgba(${rgb1.r},${rgb1.g},${rgb1.b},0.2)`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
        const y = H * 0.2 + i * 80;
        ctx.beginPath();
        ctx.moveTo(W * 0.7, y);
        ctx.lineTo(W, y + 10);
        ctx.stroke();
    }
    ctx.restore();

    // Particles
    ctx.save();
    for (let i = 0; i < 20; i++) {
        const x = (i * 137.5) % W;
        const y = ((i * 71.7) + 42) % H;
        const c = i % 2 === 0 ? rgb1 : rgb2;
        ctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${0.3 + (i % 3) * 0.2})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.5 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // Subject
    if (uploadedImages.length > 0) {
        const imgArea = getImageArea(variant, W, H);
        const imgSrc = uploadedImages[index % uploadedImages.length];
        drawImageFit(ctx, imgSrc.img, imgArea.x, imgArea.y, imgArea.w, imgArea.h);
        // Heavy color overlay (RGB rim feel)
        const overlay = ctx.createLinearGradient(imgArea.x, 0, imgArea.x + imgArea.w, 0);
        overlay.addColorStop(0, `rgba(${rgb1.r},${rgb1.g},${rgb1.b},0.25)`);
        overlay.addColorStop(0.5, 'rgba(0,0,0,0.1)');
        overlay.addColorStop(1, `rgba(${rgb2.r},${rgb2.g},${rgb2.b},0.25)`);
        ctx.fillStyle = overlay;
        ctx.fillRect(imgArea.x, imgArea.y, imgArea.w, imgArea.h);
    }

    const textX = getTextX(variant, W);
    const textW = getTextWidth(variant, W);

    if (tag) {
        // Pill badge
        ctx.font = '900 18px Syne, sans-serif';
        const tagText = tag.toUpperCase();
        const padding = 14;
        const tagW = ctx.measureText(tagText).width + padding * 2;
        const tagY = H * 0.27;
        ctx.fillStyle = '#ef4444';
        roundRect(ctx, textX, tagY, tagW, 32, 16);
        ctx.fillStyle = '#fff';
        ctx.fillText(tagText, textX + padding, tagY + 22);
    }

    // Title with neon glow + thick outline
    ctx.save();
    ctx.translate(textX, H * 0.45);
    ctx.rotate((-3 * Math.PI) / 180);
    ctx.font = '900 78px Anton, "Bebas Neue", sans-serif';
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    // Outer glow
    ctx.shadowColor = primary;
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#ffffff';
    drawWrappedTextRaw(ctx, title.toUpperCase(), 0, 0, textW, 86, 1.05, 'left');
    // Outline (no shadow)
    ctx.shadowBlur = 0;
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#0a0014';
    drawWrappedTextRaw(ctx, title.toUpperCase(), 0, 0, textW, 86, 1.05, 'left', true);
    ctx.fillStyle = '#ffffff';
    drawWrappedTextRaw(ctx, title.toUpperCase(), 0, 0, textW, 86, 1.05, 'left');
    ctx.restore();

    if (subtitle) {
        ctx.font = '700 26px Syne, sans-serif';
        ctx.fillStyle = `rgba(${rgb2.r},${rgb2.g},${rgb2.b},0.95)`;
        ctx.fillText(subtitle.toUpperCase(), textX, H * 0.86);
    }
}

// ─── STYLE: HYPE SHOW ────────────────────────────────────────────────────────

function drawHype(ctx, W, H, palette, title, subtitle, tag, variant, index, uploadedImages) {
    const [primary, secondary, tertiary] = palette;

    // Bright background — split if 2+ colors
    if (secondary) {
        const bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, primary);
        bg.addColorStop(0.5, primary);
        bg.addColorStop(0.5, secondary);
        bg.addColorStop(1, secondary);
        ctx.fillStyle = bg;
    } else {
        ctx.fillStyle = primary;
    }
    ctx.fillRect(0, 0, W, H);

    // Sunburst rays from subject side
    const sunCx = variant === 'split' ? W * 0.78 : W * 0.22;
    const sunCy = H * 0.5;
    ctx.save();
    ctx.translate(sunCx, sunCy);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 12; i++) {
        ctx.rotate((Math.PI * 2) / 12);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(W * 0.9, -22);
        ctx.lineTo(W * 0.9, 22);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();

    // Halftone dots overlay
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (let x = 0; x < W; x += 22) {
        for (let y = 0; y < H; y += 22) {
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();

    // Subject — large, slightly oversized
    if (uploadedImages.length > 0) {
        const imgSrc = uploadedImages[index % uploadedImages.length];
        const size = H * 1.05;
        const imgX = variant === 'split' ? W - size + 40 : -40;
        ctx.save();
        // White outline ring around subject
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 28;
        drawImageFit(ctx, imgSrc.img, imgX, H / 2 - size / 2, size, size);
        ctx.restore();
    }

    const textX = variant === 'split' ? 60 : W * 0.42;
    const textW = W * 0.5;

    // Massive title with thick yellow/primary outline
    ctx.save();
    ctx.font = '900 110px Anton, Impact, sans-serif';
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;

    // Outline
    ctx.lineWidth = 18;
    ctx.strokeStyle = tertiary || '#fbbf24';
    drawWrappedTextRaw(ctx, title.toUpperCase(), textX, H * 0.18, textW, 118, 1.0, 'left', true);
    // Inner outline (black thin)
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#000';
    drawWrappedTextRaw(ctx, title.toUpperCase(), textX, H * 0.18, textW, 118, 1.0, 'left', true);
    // Fill
    ctx.fillStyle = '#ffffff';
    drawWrappedTextRaw(ctx, title.toUpperCase(), textX, H * 0.18, textW, 118, 1.0, 'left');
    ctx.restore();

    // Tag pill — big & loud
    if (tag) {
        ctx.font = '900 22px Syne, sans-serif';
        const padding = 16;
        const tagW = ctx.measureText(tag.toUpperCase()).width + padding * 2;
        ctx.fillStyle = '#ef4444';
        roundRect(ctx, textX, H * 0.08, tagW, 38, 19);
        ctx.fillStyle = '#fff';
        ctx.fillText(tag.toUpperCase(), textX + padding, H * 0.08 + 27);
    }

    // Subtitle — big yellow under
    if (subtitle) {
        ctx.font = '900 36px Anton, Impact, sans-serif';
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#000';
        ctx.strokeText(subtitle.toUpperCase(), textX, H * 0.78);
        ctx.fillStyle = tertiary || '#fbbf24';
        ctx.fillText(subtitle.toUpperCase(), textX, H * 0.78);
    }

    // Big curved arrow (red) pointing at subject — only if subject is on right
    if (uploadedImages.length > 0 && variant === 'split') {
        ctx.save();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(textX + textW * 0.6, H * 0.55);
        ctx.bezierCurveTo(textX + textW * 0.85, H * 0.5, W * 0.7, H * 0.4, W * 0.74, H * 0.5);
        ctx.stroke();
        // arrowhead
        ctx.beginPath();
        ctx.moveTo(W * 0.74, H * 0.5);
        ctx.lineTo(W * 0.7, H * 0.46);
        ctx.lineTo(W * 0.72, H * 0.55);
        ctx.closePath();
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.restore();
    }
}

// ─── STYLE: EDITORIAL ────────────────────────────────────────────────────────

function drawEditorial(ctx, W, H, palette, title, subtitle, tag, variant, index, uploadedImages) {
    const [primary, secondary, tertiary] = palette;
    const rgb = hexToRgb(primary);

    // Refined cream / dark background driven by secondary
    const bgBase = secondary ? lighten(secondary, 0.78) : '#f5f1e8';
    ctx.fillStyle = bgBase;
    ctx.fillRect(0, 0, W, H);

    // Subtle paper grain dots (very faint)
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.025)';
    for (let i = 0; i < 800; i++) {
        const x = (i * 113.7) % W;
        const y = ((i * 51.3) + 17) % H;
        ctx.fillRect(x, y, 1, 1);
    }
    ctx.restore();

    // Soft vignette
    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.18)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    // Subject — magazine-cover composition
    if (uploadedImages.length > 0) {
        const imgSrc = uploadedImages[index % uploadedImages.length];
        const imgArea = getImageArea(variant, W, H);
        drawImageFit(ctx, imgSrc.img, imgArea.x, imgArea.y, imgArea.w, imgArea.h);
        // Soft inner edge fade to bg
        const grad = ctx.createLinearGradient(imgArea.x, 0, imgArea.x + imgArea.w, 0);
        if (variant === 'left-image') {
            grad.addColorStop(0.65, 'rgba(0,0,0,0)');
            grad.addColorStop(1, bgBase);
        } else if (variant === 'split') {
            grad.addColorStop(0, bgBase);
            grad.addColorStop(0.35, 'rgba(0,0,0,0)');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(imgArea.x, imgArea.y, imgArea.w, imgArea.h);
    }

    const textX = getTextX(variant, W);
    const textW = getTextWidth(variant, W);

    // Tiny kicker tag in monospace
    if (tag) {
        ctx.font = '600 14px "JetBrains Mono", monospace';
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.95)`;
        ctx.fillText('— ' + tag.toUpperCase(), textX, H * 0.28);
    }

    // Hairline rule beneath tag
    ctx.fillStyle = primary;
    ctx.fillRect(textX, H * 0.32, 60, 1);

    // SERIF title — big and confident
    drawWrappedText(ctx, title, textX, H * 0.42, textW, 84, '800 76px "Playfair Display", "Syne", serif', '#1a1414', 1.05);

    // Subtitle in italic serif
    if (subtitle) {
        ctx.font = 'italic 400 26px "DM Sans", serif';
        ctx.fillStyle = '#4a4640';
        ctx.fillText(subtitle, textX, H * 0.86);
    }

    // Tertiary thin band at bottom
    if (tertiary) {
        ctx.fillStyle = tertiary;
        ctx.fillRect(textX, H - 22, 100, 3);
    } else {
        ctx.fillStyle = primary;
        ctx.fillRect(textX, H - 22, 100, 3);
    }
}

// ─── HELPER: text drawing without state-restoration (for stylized text passes) ───

function drawWrappedTextRaw(ctx, text, x, y, maxW, lineH, lineSpacing = 1.15, align = 'left', stroke = false) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxW && n > 0) {
            stroke ? ctx.strokeText(line.trim(), x, currentY) : ctx.fillText(line.trim(), x, currentY);
            line = words[n] + ' ';
            currentY += lineH * lineSpacing;
        } else {
            line = testLine;
        }
    }
    stroke ? ctx.strokeText(line.trim(), x, currentY) : ctx.fillText(line.trim(), x, currentY);
}

// ─── MAIN DRAW FUNCTION ──────────────────────────────────────────────────────

const STYLE_FUNCTIONS = {
    bold: drawBold,
    clean: drawClean,
    dark: drawDark,
    vibrant: drawVibrant,
    tech: drawTech,
    gaming: drawGaming,
    hype: drawHype,
    editorial: drawEditorial,
};

export function drawThumbnail(canvas, { title, subtitle, tag, variant, index, style, color, colors, uploadedImages }) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;

    // Accept either { colors: [...] } (new) or { color: '#xxx' } (legacy)
    const palette = normalizeColors(colors ?? color);

    ctx.clearRect(0, 0, W, H);

    const drawFn = STYLE_FUNCTIONS[style] || drawBold;
    drawFn(ctx, W, H, palette, title, subtitle, tag, variant, index, uploadedImages);
}

// ─── COMPOSITE: AI IMAGE + UPLOADED PHOTOS ──────────────────────────────────

export function compositeWithUploads(canvas, aiImageUrl, uploadedImages, variant, index) {
    return new Promise((resolve, reject) => {
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;

        const aiImg = new Image();
        aiImg.crossOrigin = 'anonymous';
        aiImg.src = aiImageUrl;

        aiImg.onload = () => {
            // 1. Draw AI-generated image as full background
            ctx.clearRect(0, 0, W, H);
            ctx.drawImage(aiImg, 0, 0, W, H);

            if (!uploadedImages || uploadedImages.length === 0) {
                resolve(canvas.toDataURL('image/png'));
                return;
            }

            const userImg = uploadedImages[index % uploadedImages.length].img;

            // 2. Position based on variant
            if (variant === 'left-image') {
                // Left 45% — photo with soft right-edge fade
                const imgW = W * 0.45, imgH = H;
                const imgX = 0, imgY = 0;

                ctx.save();
                drawImageFit(ctx, userImg, imgX, imgY, imgW, imgH);

                // Soft edge on the right side to blend into AI design
                const grad = ctx.createLinearGradient(imgX + imgW * 0.65, 0, imgX + imgW, 0);
                grad.addColorStop(0, 'rgba(0,0,0,0)');
                grad.addColorStop(1, 'rgba(14,14,18,1)');
                ctx.fillStyle = grad;
                ctx.fillRect(imgX, imgY, imgW, imgH);
                ctx.restore();

            } else if (variant === 'split') {
                // Right 45% — photo with soft left-edge fade
                const imgW = W * 0.45, imgH = H;
                const imgX = W * 0.55, imgY = 0;

                ctx.save();
                drawImageFit(ctx, userImg, imgX, imgY, imgW, imgH);

                // Soft edge on the left side
                const grad = ctx.createLinearGradient(imgX + imgW * 0.35, 0, imgX, 0);
                grad.addColorStop(0, 'rgba(0,0,0,0)');
                grad.addColorStop(1, 'rgba(14,14,18,1)');
                ctx.fillStyle = grad;
                ctx.fillRect(imgX, imgY, imgW, imgH);
                ctx.restore();

            } else {
                // Centered — circular portrait cutout
                const size = H * 0.7;
                const cx = W * 0.18;
                const cy = H * 0.45;
                const radius = size / 2;

                ctx.save();

                // Shadow behind the circle
                ctx.shadowColor = 'rgba(0,0,0,0.6)';
                ctx.shadowBlur = 35;
                ctx.shadowOffsetX = 4;
                ctx.shadowOffsetY = 4;
                ctx.fillStyle = 'rgba(0,0,0,0.01)';
                ctx.beginPath();
                ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;

                // Circular clip for image
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.clip();
                drawImageFit(ctx, userImg, cx - radius, cy - radius, size, size);
                ctx.restore();

                // Thin border ring
                ctx.save();
                ctx.strokeStyle = 'rgba(255,255,255,0.2)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }

            try {
                resolve(canvas.toDataURL('image/png'));
            } catch (e) {
                reject(e);
            }
        };

        aiImg.onerror = () => reject(new Error('Impossible de charger l\'image IA'));
    });
}

export function downloadCanvas(canvas, title, label) {
    const link = document.createElement('a');
    link.download = `${title.replace(/\s+/g, '-').toLowerCase()}-${label.replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}
