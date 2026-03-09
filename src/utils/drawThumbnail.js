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

    ctx.fillStyle = accent;
    ctx.fillRect(textX, H * 0.35, 60, 5);

    if (tag) {
        ctx.font = 'bold 22px Syne, sans-serif';
        ctx.fillStyle = accent;
        ctx.fillText(tag.toUpperCase(), textX, H * 0.32);
    }

    drawWrappedText(ctx, title, textX, H * 0.48, textW, 80, 'bold 74px Syne, sans-serif', '#ffffff', 1.1);

    if (subtitle) {
        ctx.font = '500 32px DM Sans, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillText(subtitle, textX, H * 0.82);
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

    if (tag) {
        const tagW = ctx.measureText(tag.toUpperCase()).width + 32;
        ctx.fillStyle = accent;
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

    ctx.fillStyle = '#111114';
    ctx.fillRect(textX, H - 40, 48, 3);
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

    ctx.save();
    ctx.textAlign = textAlign;

    if (tag) {
        ctx.font = 'bold 20px Syne, sans-serif';
        ctx.fillStyle = accent;
        ctx.fillText('— ' + tag.toUpperCase() + ' —', textX, H * 0.3);
    }

    ctx.shadowColor = accent;
    ctx.shadowBlur = 40;
    drawWrappedText(ctx, title, textX, H * 0.45, textW, 78, 'bold 72px Syne, sans-serif', '#ffffff', 1.1, textAlign);
    ctx.shadowBlur = 0;

    if (subtitle) {
        ctx.font = '300 28px DM Sans, sans-serif';
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.8)`;
        ctx.fillText(subtitle, textX, H * 0.84);
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
