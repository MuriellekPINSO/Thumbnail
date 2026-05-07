const API_BASE = 'https://ai-gateway.vercel.sh/v1';
const API_KEY = import.meta.env.VITE_AI_GATEWAY_API_KEY;

// GPT-2 Image model via Vercel AI Gateway
const MODEL = 'openai/gpt-2-image';

// Closest landscape size to 16:9 supported by gpt-image-style endpoints.
const IMAGE_SIZE = '1536x1024';

function dataUrlToBlob(dataUrl) {
    const [meta, b64] = dataUrl.split(',');
    const mime = meta.match(/data:([^;]+)/)?.[1] || 'image/png';
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
}

function extOf(mime) {
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
    if (mime.includes('webp')) return 'webp';
    return 'png';
}

async function handleApiError(response) {
    const errorData = await response.json().catch(() => ({}));
    if (response.status === 401) {
        throw new Error('Clé API AI Gateway invalide ou expirée');
    }
    if (response.status === 429) {
        throw new Error('Trop de requêtes. Veuillez réessayer dans quelques instants.');
    }
    throw new Error(
        errorData.error?.message
        || `Erreur API AI Gateway (HTTP ${response.status})`
    );
}

function extractImageFromResponse(data) {
    const first = data?.data?.[0];
    if (first?.b64_json) {
        return `data:image/png;base64,${first.b64_json}`;
    }
    if (first?.url) {
        return first.url;
    }
    console.error('Réponse API complète:', JSON.stringify(data, null, 2));
    throw new Error('Aucune image générée dans la réponse. Essayez avec un prompt plus descriptif.');
}

/**
 * Generate a thumbnail image via Vercel AI Gateway (GPT-2 Image model).
 * - No reference images → POST /images/generations (JSON).
 * - With reference images → POST /images/edits (multipart, refs uploaded as image[]).
 * @param {string} prompt - Description of the thumbnail to generate
 * @param {string[]} [imageDataUrls] - Optional array of base64 data URLs for reference images
 * @returns {Promise<string>} - Data URL (base64) of the generated image
 */
export async function generateThumbnailImage(prompt, imageDataUrls = []) {
    if (!API_KEY) {
        throw new Error('Clé API AI Gateway manquante. Vérifiez votre fichier .env (VITE_AI_GATEWAY_API_KEY)');
    }

    const hasRefs = Array.isArray(imageDataUrls) && imageDataUrls.length > 0;

    let response;
    if (hasRefs) {
        const form = new FormData();
        form.append('model', MODEL);
        form.append('prompt', prompt);
        form.append('size', IMAGE_SIZE);
        form.append('n', '1');
        imageDataUrls.forEach((dataUrl, i) => {
            const blob = dataUrlToBlob(dataUrl);
            form.append('image[]', blob, `ref-${i}.${extOf(blob.type)}`);
        });

        response = await fetch(`${API_BASE}/images/edits`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${API_KEY}` },
            body: form,
        });
    } else {
        response = await fetch(`${API_BASE}/images/generations`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                prompt,
                size: IMAGE_SIZE,
                n: 1,
            }),
        });
    }

    if (!response.ok) {
        await handleApiError(response);
    }

    const data = await response.json();
    return extractImageFromResponse(data);
}

// ─────────────────────────────────────────────────────────────────────────────
// THUMBNAIL DESIGN SYSTEM PROMPT
// Encodes YouTube thumbnail best practices so every generation is high quality.
// Sources: YouTube Creator Academy, VidIQ, TubeBuddy, ThumbnailTest, ThumbsUp.tv
// ─────────────────────────────────────────────────────────────────────────────

const THUMBNAIL_SYSTEM_RULES = [
    // — FORMAT & RESOLUTION —
    'Generate an image that is a YouTube thumbnail. Aspect ratio: exactly 16:9 (1280×720 px). The image MUST fill the entire frame with no letterboxing, no borders, and no empty margins.',

    // — COMPOSITION —
    'Apply the rule of thirds: place the main subject on a vertical third line (left or right), never dead center unless the layout explicitly says "centered".',
    'There must be ONE clear focal point that draws the eye instantly. Avoid clutter — use at most 2-3 distinct elements (subject + text + optional prop/icon).',
    'Keep the bottom-right corner (roughly 120×40 px zone) free of critical content — YouTube overlays the video duration badge there.',
    'Leave a small safe margin (~40 px) around all edges so text and faces are not cropped on any device.',

    // — TYPOGRAPHY —
    'Text is the MOST IMPORTANT element. Use a bold, heavy-weight sans-serif typeface (like Montserrat Extra Bold, Impact, Bebas Neue, or Anton). NEVER use thin, serif, script, or decorative fonts.',
    'Limit text to 3-5 HIGH-IMPACT words maximum. Each word must be instantly readable at mobile size (168×94 px). If a title is long, show only the most impactful keywords.',
    'Text size must be VERY LARGE — at least 20% of the thumbnail height for the main title.',
    'Add a strong text outline, drop shadow, or contrasting background panel behind text to guarantee readability against any background.',
    'Text color must have extreme contrast with its background: light text on dark, or dark text on bright. Never place text on a similarly-toned area.',

    // — COLOR & CONTRAST —
    'Use a maximum of 2-3 bold, complementary colors. Avoid dull or muted palettes — thumbnails must POP against YouTube\'s white/dark interface.',
    'Ensure high overall contrast: bright highlights against deep shadows. The thumbnail must stand out when surrounded by dozens of other thumbnails.',
    'The accent color provided by the user should be prominent — use it for text highlights, glows, badges, or background accents.',

    // — HUMAN FACES (when applicable) —
    'If a person/face is part of the thumbnail, the face must fill 30-50% of the frame area. Use an exaggerated emotional expression (surprise, excitement, curiosity, shock). The face must be well-lit, sharp, and high-resolution.',
    'Position the face on one side (following rule of thirds), looking toward the center of the thumbnail or toward the text. Never position the face looking off-frame.',

    // — VISUAL QUALITY —
    'Photorealistic, 4K quality rendering. Crisp edges, no blur (except intentional bokeh background). Professional color grading.',
    'The overall feel must be PREMIUM — like a top-tier YouTuber\'s thumbnail (MrBeast, MKBHD, Veritasium level quality).',

    // — WHAT TO AVOID —
    'DO NOT: add any device frame, browser chrome, or YouTube UI elements around the thumbnail.',
    'DO NOT: use more than 5 words of text. DO NOT: use small or thin fonts. DO NOT: create a cluttered, busy composition.',
    'DO NOT: place important elements in the bottom-right corner (timestamp zone).',
    'DO NOT: use generic stock photo aesthetics. Make it feel custom, editorial, and hand-crafted.',
].join('\n');

/**
 * Rich style presets with detailed visual direction for each aesthetic
 */
const STYLE_PRESETS = {
    bold: {
        base: 'BOLD IMPACT style',
        details: [
            'Deep dark background (#0a0a0a to #1a1a1a gradient) with dramatic cinematic lighting — strong rim light on the subject, volumetric light rays breaking through from the side.',
            'Subtle geometric grid lines or angular shapes in the background for structure and energy.',
            'Typography: uppercase, ultra-heavy weight, slightly tilted (1-3°) for dynamism. Text should have a strong glow/outline in the accent color.',
            'High contrast: deep blacks, blown-out highlights. The mood is powerful, intense, and authoritative.',
            'Optional: lens flare, particle effects, or subtle smoke/haze for cinematic depth.',
        ],
    },
    clean: {
        base: 'CLEAN & PROFESSIONAL style',
        details: [
            'Light, airy background — soft white, light gray, or very subtle pastel gradient. Clean studio lighting, soft shadows.',
            'Minimalist composition with generous whitespace. Every element is precisely placed with clear visual hierarchy.',
            'Typography: modern geometric sans-serif (like Outfit or Inter), clean and well-kerned. Text is bold but not aggressive — confident, not shouting.',
            'Subtle accent color used sparingly — as an underline, a small badge, or a thin border element. Not overwhelming.',
            'The mood is trustworthy, sophisticated, and professional. Think Apple keynote, not clickbait.',
            'Optional: soft gradient overlays, thin line separators, or a subtle frosted glass panel behind text.',
        ],
    },
    dark: {
        base: 'DARK CINEMA style',
        details: [
            'Deep moody atmosphere — near-black backgrounds with rich, saturated color accents (neon teal, electric blue, amber).',
            'Shallow depth of field (strong bokeh) on the background, subject in sharp focus. Vignette darkening at the edges.',
            'Film grain texture overlay for cinematic authenticity. Optional: subtle scanlines or chromatic aberration.',
            'Typography: all-caps with a neon glow or metallic sheen effect. Text should feel like it\'s glowing out of the darkness.',
            'Color grading inspired by Blade Runner / The Batman — teal-orange split toning, deep crushed blacks.',
            'The mood is mysterious, high-end, and cinematic. Perfect for storytelling, tech, or dramatic content.',
        ],
    },
    vibrant: {
        base: 'VIBRANT POP style',
        details: [
            'Energetic multi-color gradient background (rainbow, sunset, or neon spectrum). Bold, saturated, and eye-catching.',
            'Dynamic composition with bold geometric shapes, floating 3D elements, emoji-like icons, or abstract blobs.',
            'Typography: extra-bold, slightly rounded or playful. Text can be multi-colored or have a thick colored outline with a contrasting fill.',
            'The feel is youthful, fun, and high-energy — like a modern YouTube Kids or gaming channel thumbnail.',
            'Optional: confetti, sparkles, starburst, or comic-book style speed lines for maximum impact.',
            'Color palette: at least 3 bright, contrasting hues. Nothing muted or subtle — everything should be dialed to 11.',
        ],
    },
};

/**
 * Build a comprehensive, best-practice-enriched prompt for thumbnail generation.
 *
 * The resulting prompt includes:
 * 1. System rules (composition, typography, contrast, format)
 * 2. Style-specific visual direction
 * 3. User content (title, subtitle, tag)
 * 4. Color direction
 * 5. Reference image instructions (if any)
 *
 * @param {object} options
 * @param {string}  options.title     - Main title text
 * @param {string}  options.subtitle  - Secondary text / hook
 * @param {string}  options.tag       - Badge label (e.g. "NEW", "TUTO")
 * @param {string}  options.style     - One of: bold | clean | dark | vibrant
 * @param {string}  options.color     - Hex accent color
 * @param {boolean} [options.hasImages] - Whether user attached reference photos
 * @returns {string} Full prompt ready for the AI model
 */
export function buildThumbnailPrompt({ title, subtitle, tag, style, color, hasImages = false }) {
    const preset = STYLE_PRESETS[style] || STYLE_PRESETS.bold;

    // ── 1. System rules ──
    let prompt = THUMBNAIL_SYSTEM_RULES + '\n\n';

    // ── 2. Style direction ──
    prompt += `VISUAL STYLE: ${preset.base}.\n`;
    prompt += preset.details.join('\n') + '\n\n';

    // ── 3. Content ──
    prompt += `CONTENT TO DISPLAY:\n`;
    prompt += `• Main title text (display prominently): "${title}"\n`;

    if (subtitle) {
        prompt += `• Subtitle / hook (smaller, below or beside the title): "${subtitle}"\n`;
    }

    if (tag) {
        prompt += `• Badge/tag (small pill-shaped label in a corner): "${tag}"\n`;
    }

    prompt += '\n';

    // ── 4. Color ──
    prompt += `ACCENT COLOR: ${color} — use this as the primary highlight color for text glow, badges, borders, or background accents. Pair it with colors that create strong contrast.\n\n`;

    // ── 5. Reference images ──
    if (hasImages) {
        prompt += [
            'REFERENCE PHOTO INSTRUCTIONS (CRITICAL):',
            'I have attached photo(s) of a real person/subject. You MUST follow these rules:',
            '• Reproduce the EXACT person from the photo — same face, skin tone, hair, clothing. Do NOT replace, alter, or stylize the person.',
            '• Place the person prominently in the thumbnail (30-50% of frame area), following the rule of thirds.',
            '• The person should have an engaging, slightly exaggerated expression (surprise, excitement, curiosity).',
            '• Light the person with the same lighting style as the chosen thumbnail style (dramatic for Bold, soft for Clean, etc.).',
            '• Integrate the person naturally into the scene — they should look like they belong in the composition, not pasted in.',
            '',
        ].join('\n');
    }

    // ── 6. Final quality reminder ──
    prompt += 'FINAL QUALITY CHECK: The thumbnail must look like it was designed by a professional graphic designer for a top-tier YouTube channel. It must be instantly eye-catching at any size, have perfect text readability, and make viewers want to click.';

    return prompt;
}

