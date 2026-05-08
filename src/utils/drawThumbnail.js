import { hexToRgb, shiftHue } from './colors';

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

function drawWrappedText(ctx, text, x, y, maxW, lineH, font, color, lineSpacing = 1.15, align = 'left', stroke = null) {
    ctx.font = font;
    ctx.textAlign = align;
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    const drawLine = (str, posY) => {
        if (stroke) {
            ctx.save();
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.width;
            ctx.lineJoin = 'round';
            ctx.strokeText(str, x, posY);
            ctx.restore();
        }
        ctx.fillStyle = color;
        ctx.fillText(str, x, posY);
    };

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxW && n > 0) {
            drawLine(line.trim(), currentY);
            line = words[n] + ' ';
            currentY += lineH * lineSpacing;
        } else {
            line = testLine;
        }
    }
    drawLine(line.trim(), currentY);
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

function drawBold(ctx, W, H, accent, rgb, title, subtitle, tag, variant, index, uploadedImages) {
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0e0e12');
    bg.addColorStop(1, '#1a1a22');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.05)`;
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    const imgArea = getImageArea(variant, W, H);
    if (uploadedImages.length > 0) {
        const imgSrc = uploadedImages[index % uploadedImages.length];
        drawImageFit(ctx, imgSrc.img, imgArea.x, imgArea.y, imgArea.w, imgArea.h);
        const grad = ctx.createLinearGradient(imgArea.x, 0, imgArea.x + imgArea.w, 0);
        if (variant === 'left-image') {
            grad.addColorStop(0.5, 'rgba(14,14,18,0)');
            grad.addColorStop(1, 'rgba(14,14,18,1)');
        } else {
            grad.addColorStop(0, 'rgba(14,14,18,0.7)');
            grad.addColorStop(1, 'rgba(14,14,18,0.7)');
        }
        ctx.fillStyle = grad;
        ctx.fillRect(imgArea.x, imgArea.y, imgArea.w, imgArea.h);
    }

    const textX = getTextX(variant, W);
    const textW = getTextWidth(variant, W);

    const titleY = variant === 'left-image' ? H * 0.42 : H * 0.38;
    const tagY = titleY - H * 0.14;
    const barY = titleY - H * 0.06;
    const subtitleY = H * 0.80;

    if (tag) {
        ctx.font = 'bold 22px Syne, sans-serif';
        ctx.fillStyle = accent;
        ctx.fillText(tag.toUpperCase(), textX, tagY);
    }

    ctx.fillStyle = accent;
    ctx.fillRect(textX, barY, 60, 5);

    drawWrappedText(ctx, title, textX, titleY, textW, 82, 'bold 76px Syne, sans-serif', '#ffffff', 1.1, 'left', { color: 'rgba(0,0,0,0.85)', width: 8 });

    if (subtitle) {
        ctx.font = '500 30px DM Sans, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.65)';
        ctx.fillText(subtitle, textX, subtitleY);
    }

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(W - 4, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H); ctx.lineTo(W - 4, H);
    ctx.fill();
}

// ─── STYLE: CLEAN & PRO ──────────────────────────────────────────────────────

function drawClean(ctx, W, H, accent, rgb, title, subtitle, tag, variant, index, uploadedImages) {
    ctx.fillStyle = '#f5f4f0';
    ctx.fillRect(0, 0, W, H);

    if (uploadedImages.length > 0) {
        const imgArea = getImageArea(variant, W, H);
        const imgSrc = uploadedImages[index % uploadedImages.length];
        drawImageFit(ctx, imgSrc.img, imgArea.x, imgArea.y, imgArea.w, imgArea.h);
    }

    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, W, 8);

    const textX = getTextX(variant, W);
    const textW = getTextWidth(variant, W);

    const titleY = variant === 'left-image' ? H * 0.44 : H * 0.40;
    const tagY = titleY - H * 0.14;

    if (tag) {
        ctx.font = 'bold 18px Syne, sans-serif';
        const tagW = ctx.measureText(tag.toUpperCase()).width + 32;
        ctx.fillStyle = accent;
        roundRect(ctx, textX, tagY - 22, tagW, 34, 4);
        ctx.fillStyle = '#0a0a0c';
        ctx.fillText(tag.toUpperCase(), textX + 16, tagY);
    }

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.12)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 4;
    drawWrappedText(ctx, title, textX, titleY, textW, 78, 'bold 72px Syne, sans-serif', '#111114', 1.1, 'left', { color: 'rgba(255,255,255,0.6)', width: 2 });
    ctx.restore();

    if (subtitle) {
        ctx.font = '400 28px DM Sans, sans-serif';
        ctx.fillStyle = '#444';
        ctx.fillText(subtitle, textX, H * 0.80);
    }

    ctx.fillStyle = accent;
    ctx.fillRect(textX, H * 0.88, 48, 3);
}

// ─── STYLE: DARK CINEMA ──────────────────────────────────────────────────────

function drawDark(ctx, W, H, accent, rgb, title, subtitle, tag, variant, index, uploadedImages) {
    ctx.fillStyle = '#05050a';
    ctx.fillRect(0, 0, W, H);

    if (uploadedImages.length > 0) {
        const imgArea = getImageArea(variant, W, H);
        const imgSrc = uploadedImages[index % uploadedImages.length];
        ctx.globalAlpha = 0.35;
        drawImageFit(ctx, imgSrc.img, imgArea.x, imgArea.y, imgArea.w, imgArea.h);
        ctx.globalAlpha = 1;
    }

    const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.9);
    vig.addColorStop(0, 'rgba(5,5,10,0)');
    vig.addColorStop(1, 'rgba(5,5,10,0.95)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    for (let y = 0; y < H; y += 4) {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(0, y, W, 2);
    }

    const textX = variant === 'centered' ? W / 2 : 80;
    const textAlign = variant === 'centered' ? 'center' : 'left';
    const textW = variant === 'centered' ? W * 0.8 : W * 0.55;

    const titleY = variant === 'centered' ? H * 0.42 : H * 0.40;
    const tagY = titleY - H * 0.13;

    ctx.save();
    ctx.textAlign = textAlign;

    if (tag) {
        ctx.font = 'bold 20px Syne, sans-serif';
        ctx.fillStyle = accent;
        ctx.fillText('— ' + tag.toUpperCase() + ' —', textX, tagY);
    }

    ctx.shadowColor = accent;
    ctx.shadowBlur = 40;
    drawWrappedText(ctx, title, textX, titleY, textW, 80, 'bold 74px Syne, sans-serif', '#ffffff', 1.1, textAlign, { color: 'rgba(0,0,0,0.9)', width: 7 });
    ctx.shadowBlur = 0;

    if (subtitle) {
        ctx.font = '300 28px DM Sans, sans-serif';
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.85)`;
        ctx.fillText(subtitle, textX, H * 0.80);
    }

    ctx.restore();
}

// ─── STYLE: VIBRANT POP ──────────────────────────────────────────────────────

function drawVibrant(ctx, W, H, accent, rgb, title, subtitle, tag, variant, index, uploadedImages) {
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, shiftHue(accent, -30));
    bg.addColorStop(1, shiftHue(accent, 30));
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

    const titleY = variant === 'left-image' ? H * 0.42 : H * 0.38;
    const tagY = titleY - H * 0.13;

    ctx.save();

    if (tag) {
        ctx.font = 'bold 18px Syne, sans-serif';
        const tagMeasure = ctx.measureText(tag.toUpperCase()).width;
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        roundRect(ctx, textX, tagY - 22, tagMeasure + 32, 34, 18);
        ctx.fillStyle = '#fff';
        ctx.fillText(tag.toUpperCase(), textX + 16, tagY);
    }

    drawWrappedText(ctx, title, textX, titleY, textW, 80, 'bold 74px Syne, sans-serif', '#ffffff', 1.15, 'left', { color: 'rgba(0,0,0,0.9)', width: 9 });

    if (subtitle) {
        ctx.font = '500 28px DM Sans, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText(subtitle, textX, H * 0.80);
    }

    ctx.restore();
}

// ─── MAIN DRAW FUNCTION ──────────────────────────────────────────────────────

const STYLE_FUNCTIONS = {
    bold: drawBold,
    clean: drawClean,
    dark: drawDark,
    vibrant: drawVibrant,
};

export function drawThumbnail(canvas, { title, subtitle, tag, variant, index, style, color, uploadedImages }) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const accent = color;
    const accentRGB = hexToRgb(accent);

    ctx.clearRect(0, 0, W, H);

    const drawFn = STYLE_FUNCTIONS[style] || drawBold;
    drawFn(ctx, W, H, accent, accentRGB, title, subtitle, tag, variant, index, uploadedImages);
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

/**
 * Full compositing pipeline: AI background + person photo on left + screenshot on right.
 * @param {HTMLCanvasElement} canvas
 * @param {object} options
 * @param {string} options.aiImageUrl - Base64 data URL of AI-generated background
 * @param {object|null} options.personPhoto - {img: HTMLImageElement, src: string} or null
 * @param {string|null} options.screenshotDataUrl - Base64 data URL of tweet/screenshot or null
 * @param {string} options.variant - 'left-image' | 'right-image' | 'split'
 * @returns {Promise<string>} - Base64 data URL of the composited image
 */
export async function compositeFull(canvas, { aiImageUrl, personPhoto, screenshotDataUrl, variant = 'left-image' }) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width;   // 1280
    const H = canvas.height;  // 720

    // 1. Draw AI background (cover-scale to avoid distortion)
    await new Promise((resolve, reject) => {
        const aiImg = new Image();
        aiImg.crossOrigin = 'anonymous';
        aiImg.onload = () => {
            const scale = Math.max(W / aiImg.width, H / aiImg.height);
            const sw = aiImg.width * scale;
            const sh = aiImg.height * scale;
            ctx.drawImage(aiImg, (W - sw) / 2, (H - sh) / 2, sw, sh);
            resolve();
        };
        aiImg.onerror = reject;
        aiImg.src = aiImageUrl;
    });

    // 2. Draw person photo on left (or right based on variant) with gradient fade
    if (personPhoto) {
        const userImg = personPhoto.img;
        const isLeft = variant !== 'right-image';
        const photoW = W * 0.48;
        const photoX = isLeft ? 0 : W - photoW;

        ctx.save();
        // Scale image to fill the area (crop to fit, prioritize top/face)
        const scale = Math.max(photoW / userImg.width, H / userImg.height);
        const sw = userImg.width * scale;
        const sh = userImg.height * scale;
        const dx = photoX + (photoW - sw) / 2;
        const dy = sh > H ? 0 : (H - sh) / 2; // prioritize top (face)

        ctx.beginPath();
        ctx.rect(photoX, 0, photoW, H);
        ctx.clip();
        ctx.drawImage(userImg, dx, dy, sw, sh);

        // Dark tint overlay — helps light/studio backgrounds blend into dark AI backdrop
        ctx.fillStyle = 'rgba(8, 8, 14, 0.22)';
        ctx.fillRect(photoX, 0, photoW, H);

        // Horizontal gradient fade toward center (starts at 38% of photo width)
        const grad = isLeft
            ? ctx.createLinearGradient(photoX + photoW * 0.38, 0, photoX + photoW, 0)
            : ctx.createLinearGradient(photoX + photoW * 0.62, 0, photoX, 0);
        grad.addColorStop(0, 'rgba(8, 8, 14, 0)');
        grad.addColorStop(1, 'rgba(8, 8, 14, 1)');
        ctx.fillStyle = grad;
        ctx.fillRect(photoX, 0, photoW, H);

        // Bottom fade — hides grey studio floor
        const bottomGrad = ctx.createLinearGradient(0, H * 0.6, 0, H);
        bottomGrad.addColorStop(0, 'rgba(8, 8, 14, 0)');
        bottomGrad.addColorStop(1, 'rgba(8, 8, 14, 0.9)');
        ctx.fillStyle = bottomGrad;
        ctx.fillRect(photoX, 0, photoW, H);

        // Top fade — darkens top corners
        const topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.15);
        topGrad.addColorStop(0, 'rgba(8, 8, 14, 0.5)');
        topGrad.addColorStop(1, 'rgba(8, 8, 14, 0)');
        ctx.fillStyle = topGrad;
        ctx.fillRect(photoX, 0, photoW, H);

        ctx.restore();
    }

    // 3. Draw tweet/screenshot card on the right (or left based on variant)
    if (screenshotDataUrl) {
        await new Promise((resolve) => {
            const shotImg = new Image();
            shotImg.onload = () => {
                const isPersonLeft = variant !== 'right-image';
                // Screenshot occupies the side opposite to person
                const zoneX = isPersonLeft ? W * 0.44 : 0;
                const zoneW = isPersonLeft ? W * 0.53 : W * 0.53;
                const zoneH = H * 0.88;
                const zoneY = (H - zoneH) / 2;

                const scale = Math.min(zoneW / shotImg.width, zoneH / shotImg.height);
                const sw = shotImg.width * scale;
                const sh = shotImg.height * scale;
                const sx = zoneX + (zoneW - sw) / 2;
                const sy = zoneY + (zoneH - sh) / 2;
                const radius = 18;

                ctx.save();

                // Drop shadow
                ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
                ctx.shadowBlur = 40;
                ctx.shadowOffsetX = -6;
                ctx.shadowOffsetY = 10;

                // Slight rotation
                const angle = isPersonLeft ? -0.025 : 0.025;
                ctx.translate(sx + sw / 2, sy + sh / 2);
                ctx.rotate(angle);
                ctx.translate(-(sx + sw / 2), -(sy + sh / 2));

                // Rounded clip
                ctx.beginPath();
                ctx.moveTo(sx + radius, sy);
                ctx.lineTo(sx + sw - radius, sy);
                ctx.quadraticCurveTo(sx + sw, sy, sx + sw, sy + radius);
                ctx.lineTo(sx + sw, sy + sh - radius);
                ctx.quadraticCurveTo(sx + sw, sy + sh, sx + sw - radius, sy + sh);
                ctx.lineTo(sx + radius, sy + sh);
                ctx.quadraticCurveTo(sx, sy + sh, sx, sy + sh - radius);
                ctx.lineTo(sx, sy + radius);
                ctx.quadraticCurveTo(sx, sy, sx + radius, sy);
                ctx.closePath();
                ctx.clip();

                ctx.shadowBlur = 0;
                ctx.drawImage(shotImg, sx, sy, sw, sh);
                ctx.restore();

                // Subtle glow border around the screenshot
                ctx.save();
                ctx.translate(sx + sw / 2, sy + sh / 2);
                ctx.rotate(angle);
                ctx.translate(-(sx + sw / 2), -(sy + sh / 2));
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(sx + radius, sy);
                ctx.lineTo(sx + sw - radius, sy);
                ctx.quadraticCurveTo(sx + sw, sy, sx + sw, sy + radius);
                ctx.lineTo(sx + sw, sy + sh - radius);
                ctx.quadraticCurveTo(sx + sw, sy + sh, sx + sw - radius, sy + sh);
                ctx.lineTo(sx + radius, sy + sh);
                ctx.quadraticCurveTo(sx, sy + sh, sx, sy + sh - radius);
                ctx.lineTo(sx, sy + radius);
                ctx.quadraticCurveTo(sx, sy, sx + radius, sy);
                ctx.closePath();
                ctx.stroke();
                ctx.restore();

                resolve();
            };
            shotImg.onerror = resolve;
            shotImg.src = screenshotDataUrl;
        });
    }

    return canvas.toDataURL('image/png');
}
