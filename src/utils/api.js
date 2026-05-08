// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER SELECTION
// ─────────────────────────────────────────────────────────────────────────────
// Two providers supported:
//   1. OpenAI direct (preferred when VITE_OPENAI_API_KEY is set) — full feature
//      support including /v1/images/edits for reference images and mask-based
//      inpainting.
//   2. Vercel AI Gateway (fallback when only VITE_AI_GATEWAY_API_KEY is set) —
//      only /v1/images/generations is exposed, so reference images and inpaint
//      masks are degraded to verbal acknowledgements in the prompt.
// ─────────────────────────────────────────────────────────────────────────────
const OPENAI_KEY  = import.meta.env.VITE_OPENAI_API_KEY;
const GATEWAY_KEY = import.meta.env.VITE_AI_GATEWAY_API_KEY;

const USE_OPENAI_DIRECT = Boolean(OPENAI_KEY);

const PROVIDER = USE_OPENAI_DIRECT
    ? {
        name: 'openai',
        base: 'https://api.openai.com/v1',
        key: OPENAI_KEY,
        model: 'gpt-image-1',
        supportsEdits: true,
    }
    : {
        name: 'gateway',
        base: 'https://ai-gateway.vercel.sh/v1',
        key: GATEWAY_KEY,
        model: 'openai/gpt-image-1',
        supportsEdits: false,
    };

// Output formats — each maps to a size supported by gpt-image-1
// and a human-readable aspect ratio injected into the prompt.
export const FORMAT_PRESETS = {
    youtube: { size: '1536x1024', ratio: '16:9', label: 'YouTube', dims: '1280×720' },
    square:  { size: '1024x1024', ratio: '1:1',  label: 'Carré',   dims: '1080×1080' },
    story:   { size: '1024x1536', ratio: '9:16', label: 'Story',   dims: '1080×1920' },
};

const DEFAULT_FORMAT = 'youtube';

function missingKeyMessage() {
    return 'Aucune clé API détectée. Configure VITE_OPENAI_API_KEY (recommandé, supporte les images de réf) ou VITE_AI_GATEWAY_API_KEY dans ton .env.';
}

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
export async function generateThumbnailImage(prompt, imageDataUrls = [], format = DEFAULT_FORMAT) {
    if (!PROVIDER.key) {
        throw new Error(missingKeyMessage());
    }

    const preset = FORMAT_PRESETS[format] || FORMAT_PRESETS[DEFAULT_FORMAT];
    const size = preset.size;
    const hasRefs = Array.isArray(imageDataUrls) && imageDataUrls.length > 0;

    let response;
    // ── Path A: OpenAI direct + reference images → /v1/images/edits (multipart) ──
    if (hasRefs && PROVIDER.supportsEdits) {
        const form = new FormData();
        form.append('model', PROVIDER.model);
        form.append('prompt', prompt);
        form.append('size', size);
        form.append('n', '1');
        imageDataUrls.forEach((dataUrl, i) => {
            const blob = dataUrlToBlob(dataUrl);
            form.append('image[]', blob, `ref-${i}.${extOf(blob.type)}`);
        });

        response = await fetch(`${PROVIDER.base}/images/edits`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${PROVIDER.key}` },
            body: form,
        });
    } else {
        // ── Path B: /v1/images/generations (JSON) ──
        // If refs were uploaded but provider doesn't support edits (gateway),
        // mention them verbally so the model still composes a coherent subject.
        const finalPrompt = hasRefs && !PROVIDER.supportsEdits
            ? `${prompt}\n\nNOTE: The user attached ${imageDataUrls.length} reference photo${imageDataUrls.length > 1 ? 's' : ''} of the subject(s). Compose a believable photoreal individual that matches the topic (the actual reference bytes cannot be transmitted via this API endpoint — invent a plausible, expressive, well-lit subject from scratch).`
            : prompt;

        response = await fetch(`${PROVIDER.base}/images/generations`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PROVIDER.key}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: PROVIDER.model,
                prompt: finalPrompt,
                size,
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
    // ── BENCHMARK ──
    'TARGET QUALITY: this thumbnail must look indistinguishable from a top-tier YouTube channel\'s real thumbnail (MrBeast, MKBHD, Veritasium, Mark Rober, Casey Neistat, Linus Tech Tips, Vox, Cold Fusion). Use the chosen visual STYLE as your guiding aesthetic and reference how the best channels in that exact niche compose their thumbnails. Imitate their craftsmanship, not their channel branding.',

    // ── FORMAT & RESOLUTION ── (aspect ratio is appended dynamically per format)
    '__FORMAT_PLACEHOLDER__',

    // ── COMPOSITION ──
    'Apply the rule of thirds: place the main subject on a third-line (vertical thirds for landscape/square, horizontal thirds for portrait), never dead center unless the layout explicitly says "centered".',
    'There must be ONE clear focal point that draws the eye instantly. Avoid clutter — at most 2-3 distinct elements (subject + text + optional prop/icon/badge).',
    '__SAFE_ZONE_PLACEHOLDER__',
    'Leave a small safe margin (~40 px) around all edges so text and faces are not cropped on any device.',

    // ── BACKGROUNDS — IMPECCABLE ──
    'BACKGROUND IS NEVER FLAT OR BORING. The background must support the subject and the chosen style with depth, lighting, and intent. Acceptable backgrounds: cinematic gradient lighting with rim lights, photographic depth-of-field, environmental scene relevant to the topic, abstract geometric energy, premium colored gradient with light leaks. NEVER acceptable: solid mid-grey, blank white, default photoshop gradient, generic blur, cliché stock pattern.',
    'The background must read the SECONDARY palette color clearly while staying tasteful for the chosen style. The PRIMARY color appears as accent on top of the background, not as the background itself (unless the style explicitly uses primary as background, like Vibrant or Hype).',
    'Add subtle background depth cues: light leaks, lens flares, rim lighting, atmospheric haze, ambient particles, or out-of-focus environment elements. The viewer should feel the scene has DEPTH, not flatness.',

    // ── TYPOGRAPHY ──
    'Text is the second most important element after the subject. Use a bold, heavy-weight sans-serif typeface (Montserrat Extra Bold, Impact, Bebas Neue, Anton, SF Pro Display Black, Inter Black). NEVER thin, light, serif, script, or decorative fonts (unless the style is Editorial which permits a confident serif).',
    'Limit text to 3-5 HIGH-IMPACT words. Each word must be instantly readable at mobile size (168×94 px). If a title is long, distill to the most impactful keywords.',
    'Text size for the main title must be VERY LARGE — at least 20-25% of the thumbnail height.',
    'Always add a strong text outline (thick, 6-12 px), a drop shadow, or a solid contrasting background panel behind text to guarantee legibility on any device.',
    'Text color must have extreme contrast with its immediate background. Never place text on a similarly-toned area. If the background is busy, use a colored panel or an outline twice as thick.',

    // ── HUMAN FACES (when applicable) ──
    'When a person is part of the thumbnail, the face must fill 30-50% of the frame area. Use an EXAGGERATED emotional expression: surprise, shock, excitement, curiosity, awe — never neutral or flat affect.',
    'The face must be well-lit, sharp, and high-resolution with strong rim/key light. Position the face on one side (rule of thirds), looking toward the center of the thumbnail or toward the text — never off-frame.',

    // ── VISUAL QUALITY ──
    'Render quality: photoreal 4K, crisp edges, no compression artifacts, professional color grading. Skin must look real (no plastic AI sheen). Materials (metal, fabric, glass) must look physical.',
    'The overall feel must be PREMIUM — every pixel intentional. Imagine this thumbnail next to MrBeast\'s on the homepage: it must hold its own.',

    // ── WHAT TO AVOID ──
    'NEVER: add a device frame, browser chrome, YouTube UI, watermarks, or signatures around the thumbnail.',
    'NEVER: use more than 5 words of text. NEVER: use small or thin fonts. NEVER: create a cluttered, busy composition.',
    '__NEVER_SAFE_ZONE_PLACEHOLDER__',
    'NEVER: use generic stock photo aesthetics, AI plastic skin, or default illustrator gradients. The thumbnail must feel hand-crafted by a senior designer.',
].join('\n');

// ── No-image directive: appended when the user did NOT attach reference images ──
const NO_REFERENCE_DIRECTIVE = [
    'NO REFERENCE IMAGES PROVIDED:',
    '• You must invent a striking, photorealistic subject from scratch that fits the topic and chosen visual style.',
    '• If a person is implied by the topic, render a single believable photoreal individual — sharp focus, real skin texture, expressive face, professional studio or environmental lighting. NO uncanny AI faces, NO dolls, NO generic stock smile.',
    '• If the topic is about an object/product/concept, render it as the hero element with hands, environment, or contextual setup that gives it scale and meaning.',
    '• Imagine the thumbnail of a top-tier YouTuber covering this exact topic — match that level of craft. The lack of attached photos is NOT permission to be generic; it is an invitation to compose the BEST possible scene.',
    '• Background must still be impeccable per the rules above (depth, lighting, palette-driven atmosphere). NO default void backdrop, NO blank pastel surface unless the style is Clean or Editorial.',
].join('\n');

/**
 * Rich style presets with detailed visual direction for each aesthetic.
 * Each preset references real YouTube channels in that niche so the AI
 * can imitate the level of craft seen on those benchmark thumbnails.
 */
const STYLE_PRESETS = {
    bold: {
        base: 'BOLD IMPACT style — inspired by Veritasium, Mark Rober, Cleo Abram, Johnny Harris thumbnails',
        details: [
            'BACKGROUND (impeccable, NEVER flat): a cinematic dark stage. Use a complex multi-stop gradient driven by the SECONDARY color (deep, desaturated by ~20%) blending into near-black at the edges. Add volumetric light rays breaking from the upper-left or upper-right corner, hitting the subject. Add a soft atmospheric haze (5-10% opacity) for cinematic depth.',
            'Add ONE focal rim light hitting the subject from behind in the PRIMARY color — a thin, bright halo separating subject from background.',
            'Subtle environmental texture: a faint hexagonal grid OR perspective lines OR a horizon line in the bottom third. Never plain.',
            'Lens flare or specular highlight in the negative-space corner (upper third) to give the background a sense of physical light source.',
            'Subject (if a person): dramatic three-quarter pose, lit by strong key light from one side, deep shadow on the other, intense rim light. Expression: focused, intrigued, or shocked.',
            'Typography: uppercase, ultra-heavy weight (Anton / Bebas Neue / Impact), slightly tilted (1-3°). Strong glow halo in PRIMARY color around the text + thick black outline (8 px).',
            'Mood: powerful, intense, authoritative. Think a National Geographic cover meets a movie poster.',
        ],
    },
    clean: {
        base: 'CLEAN & PROFESSIONAL style — inspired by Apple keynote graphics, Ali Abdaal, Thomas Frank, Steven Bartlett thumbnails',
        details: [
            'BACKGROUND: soft, premium, never blank. Use a SUBTLE diagonal or radial gradient driven by the SECONDARY color (lightened ~85% toward white). Add an extremely faint paper grain or a soft vignette toward the corners.',
            'Studio-style soft lighting on the subject — diffused key light from above, gentle fill, almost no harsh shadows. Magazine cover quality.',
            'Composition: generous whitespace, every element precisely placed, clear visual hierarchy. Allow the design to breathe.',
            'Subject (if person): confident posture, slight smile or pensive expression, looking at camera or off-frame thoughtfully. Subject is hero but not screaming.',
            'Typography: modern geometric sans-serif (Inter, SF Pro Display, Outfit). Heavy weight but not aggressive — confident, not shouting. Tight, intentional kerning.',
            'PRIMARY accent used sparingly: a single underline beneath the title, a small pill-shaped badge, a thin colored hairline rule, or one keyword highlighted.',
            'Mood: trustworthy, sophisticated, premium. Apple-keynote aesthetic. Think presentation slide, NOT clickbait.',
        ],
    },
    dark: {
        base: 'DARK CINEMA style — inspired by Cold Fusion, Cracked, Lemmino, Wendover thumbnails',
        details: [
            'BACKGROUND: deep moody scene, near-black base tinted with the SECONDARY color (darken ~92%). Add a strong vignette that crushes the corners to absolute black.',
            'Strong colored bokeh in the background — out-of-focus light points in the PRIMARY color, scattered like night-city lights.',
            'Subject in razor-sharp focus, shallow depth of field. Subject lit dramatically — heavy contrast with one side bathed in PRIMARY-color rim light, the other in deep shadow.',
            'Film texture: subtle grain (1-2% opacity) over the whole image. Optional fine scanlines or very mild chromatic aberration on edges.',
            'Color grading: Blade Runner / The Batman — teal-orange split toning, crushed blacks, lifted shadows in the colored direction.',
            'Typography: all-caps, heavy. Apply a NEON glow effect in PRIMARY color OR a metallic sheen. Text should look like it\'s emerging from the darkness, slightly emissive.',
            'Mood: mysterious, premium, cinematic. Perfect for storytelling, true-crime, tech-deep-dive, philosophical content.',
        ],
    },
    vibrant: {
        base: 'VIBRANT POP style — inspired by Stokes Twins, Brent Rivera, Side+, Dude Perfect highlight thumbnails',
        details: [
            'BACKGROUND: energetic multi-stop gradient using the FULL palette (primary → secondary → tertiary). Saturated and eye-catching.',
            'Add dynamic background motifs: bold geometric shapes (circles, triangles, blobs) floating with subtle 3D depth, OR comic-book speed lines radiating from the subject, OR a confetti/sparkle layer scattered across the frame.',
            'Optional 3D rendered elements (chrome shapes, balloons, oversized emoji) for tactile depth.',
            'Subject: high-energy expression — laughter, surprise, jumping mid-air feel. Lit with bright even key light, almost flash-photography style.',
            'Typography: extra-bold, slightly rounded sans-serif. Multi-colored fills OR a thick contrasting outline. Each word can be its own color from the palette.',
            'Sparkles, starbursts, lens flares, or comic-book POW/BOOM bursts for explosive energy.',
            'Mood: youthful, fun, high-octane. Everything is dialed to 11. NO subtlety, NO whitespace, NO restraint.',
        ],
    },
    tech: {
        base: 'TECH REVIEW style — inspired by MKBHD, Linus Tech Tips, Mrwhosetheboss, Austin Evans thumbnails',
        details: [
            'BACKGROUND: very dark sleek studio (#0a0a0f → #14141c gradient) tinted with the SECONDARY color subtly. Add a thin horizontal motion-blur band or a turntable circle hint behind the hero product.',
            'Hero product (or stylized object) in razor-sharp focus, dead-center or on the rule-of-thirds line. Studio lighting: strong key light from above-left, soft fill, accent rim light in the PRIMARY color along the edge of the product.',
            'Subtle reflective floor or surface beneath the product — soft mirror reflection fading into the dark background.',
            'Background tech motifs: a hairline grid of dots, faint spectral light bar, or barely-visible blueprint lines. Always subtle, never busy.',
            'Typography: clean modern sans-serif (Inter ExtraBold, SF Pro Display Black). Tight tracking. White text with ONE keyword in PRIMARY color.',
            'Tag/badge: small monospace label in PRIMARY color — "REVIEW", "TESTED", "RANKED", "vs.", placed top-left or top-right.',
            'Mood: authoritative, premium, DSLR-quality product photography. NO stock-photo vibe.',
        ],
    },
    gaming: {
        base: 'GAMING NEON style — inspired by Ninja, Dream, Markiplier, Jacksepticeye, Shroud thumbnails',
        details: [
            'BACKGROUND: pitch-black base (#0a0014) with intense radial gradients of PRIMARY (one corner) and TERTIARY or SECONDARY (opposite corner) glowing inward. Cyber/RGB feel.',
            'Diagonal energy bands, lightning bolts, or holographic motion-blur streaks cutting across the frame at 15-30°.',
            'Subject (gamer/character) lit by RGB rim lights from BOTH sides — magenta on one cheek, cyan on the other. Exaggerated dramatic expression: shock, focus, victory roar.',
            'Add particle effects: glowing embers, electric sparks, holographic glitch fragments floating in the air around the subject.',
            'Typography: ultra-bold uppercase (Anton, Bebas Neue), slightly tilted 5-8°. Combine an outer NEON glow in PRIMARY with a thick chunky outline in a contrasting color. Optional micro-glitch / chromatic aberration on edges.',
            'Tag/badge: pill or chevron shape with words like "LIVE", "EPIC", "INSANE", "WORLD RECORD", "VICTORY" — saturated red, gold, or PRIMARY color.',
            'Mood: high-octane, bombastic, slightly chaotic. Esports broadcast graphics. NO minimalism.',
        ],
    },
    hype: {
        base: 'HYPE SHOW style — inspired by MrBeast, Beast Reacts, Stokes Twins, Airrack thumbnails',
        details: [
            'BACKGROUND: bright SATURATED single color OR sharp diagonal split between PRIMARY and SECONDARY. The background is a major character — vivid, unmissable, no fading.',
            'Optional: a halftone dot pattern overlay or radial sunburst rays emanating from the subject for added energy.',
            'Subject: a person with VERY exaggerated facial expression — mouth open wide in shock/awe, eyes huge, hands up in surprise. Face fills 35-50% of one side of the frame.',
            'Lighting on subject: bright EVEN key light, almost flash-photography flat lighting. Almost no shadows. Slight glow halo around subject silhouette.',
            'Typography: HUGE black bold uppercase (Anton, Impact) with a thick (10-14 px) yellow OR PRIMARY-color outline. 1-2 words per line maximum, words may stack vertically.',
            'Numbers/money/prizes if relevant: "$1,000,000", "DAY 100", "vs WORLD" — use big chunky numerals with neon outline and slight 3D extrusion.',
            'Optional graphics: a red curved arrow pointing at the subject, a comic-book BOOM/POW burst, falling money/confetti, an oversized 3D emoji floating beside the subject.',
            'Mood: HYPE, FOMO, must-click. Viewer should feel they will MISS something if they don\'t click. Zero subtlety, zero whitespace.',
        ],
    },
    editorial: {
        base: 'EDITORIAL style — inspired by Vox, The Verge, Bloomberg Originals, Wired, Architectural Digest YouTube thumbnails',
        details: [
            'BACKGROUND: refined and intentional. Use a subtle gradient driven by the SECONDARY color — could be deep midnight navy, charcoal, warm cream, or muted sage. Optional fine paper grain or canvas texture.',
            'Subject (person, object, illustration) shot in a controlled magazine-cover way — composed, intentional, never random. Strong directional lighting like a portrait photographer would use.',
            'Composition follows the print-magazine grid: generous whitespace, clear hierarchy, a single dominant element with breathing room.',
            'Typography: a confident SERIF headline (Playfair Display, GT Super, Tiempos Headline) — this is the ONE style that allows serif. 1-2 words. Optional thin sans-serif kicker line ABOVE the headline ("ESSAY", "SPECIAL REPORT", "PROFILE").',
            'Color accents extremely sparing: a single horizontal hairline rule beneath the kicker, a small dot in PRIMARY color, or a thin colored band at the bottom of the frame. Never gaudy, never neon.',
            'Optional small cover-line in monospace ("VOL. 12", "ISSUE 04", a date) tucked in a corner.',
            'Mood: thoughtful, journalistic, premium. The viewer should sense quality and depth, like opening a high-end magazine.',
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
 * 4. Color palette direction (1 to 3 colors with semantic roles)
 * 5. Reference image instructions (if any)
 *
 * @param {object} options
 * @param {string}  options.title     - Main title text
 * @param {string}  options.subtitle  - Secondary text / hook
 * @param {string}  options.tag       - Badge label (e.g. "NEW", "TUTO")
 * @param {string}  options.style     - One of: bold | clean | dark | vibrant
 * @param {string|string[]} [options.colors] - Hex palette (1-3 colors). primary/secondary/tertiary.
 * @param {string}  [options.color]   - Legacy single accent (used if colors not provided).
 * @param {boolean} [options.hasImages] - Whether user attached reference photos
 * @returns {string} Full prompt ready for the AI model
 */
export function buildThumbnailPrompt({ title, subtitle, tag, style, color, colors, hasImages = false, format = DEFAULT_FORMAT }) {
    const preset = STYLE_PRESETS[style] || STYLE_PRESETS.bold;
    const fmt = FORMAT_PRESETS[format] || FORMAT_PRESETS[DEFAULT_FORMAT];

    // Inject the aspect-ratio rule based on chosen output format.
    const formatRule = format === 'youtube'
        ? `Aspect ratio: exactly 16:9 LANDSCAPE (${fmt.dims} px or higher), optimized for YouTube. The image MUST fill the entire frame edge-to-edge — no letterboxing, no borders, no empty margins, no rounded corners.`
        : format === 'square'
            ? `Aspect ratio: exactly 1:1 SQUARE (${fmt.dims} px or higher), optimized for Instagram feed and LinkedIn. The image MUST fill the entire frame edge-to-edge — no letterboxing, no borders, no rounded corners. Composition must work in a square crop: keep the subject and key text within the central 85% of the frame, biased toward the middle two-thirds. Do NOT compose for landscape — the final crop is exactly square.`
            : `Aspect ratio: exactly 9:16 VERTICAL PORTRAIT (${fmt.dims} px or higher), optimized for Instagram Story / TikTok / YouTube Shorts / Reels. The image MUST be a TALL VERTICAL composition — taller than wide — and fill the entire frame edge-to-edge. NO letterboxing, NO horizontal/landscape composition rotated, NO black bars top or bottom. Compose vertically: stack the title in the top third or upper area, place the subject in the middle/lower-third, allow vertical breathing room. Keep critical elements within the central 80% safe zone (avoid the very top 8% and very bottom 18% which get covered by app UI / captions / username).`;

    // YouTube reserves the bottom-right corner for the duration badge.
    // Square / Story have no such overlay, so the safe-zone rule is skipped.
    const safeZoneRule = format === 'youtube'
        ? 'Keep the bottom-right corner (roughly 120×40 px) free of critical content — YouTube overlays the video duration badge there.'
        : 'Reserve clear breathing room around the very edges — never push critical text or faces against any edge.';

    const neverSafeZoneRule = format === 'youtube'
        ? 'NEVER: place important elements in the bottom-right corner (timestamp zone).'
        : format === 'story'
            ? 'NEVER: place critical text or faces in the very top 8% (status bar / username) or the very bottom 18% (caption / interaction buttons).'
            : 'NEVER: push critical text or faces against the frame edges.';

    // Normalize palette: accept colors[] (preferred) or fall back to single color.
    const palette = (() => {
        if (Array.isArray(colors) && colors.length > 0) return colors.slice(0, 3);
        if (typeof colors === 'string' && colors) return [colors];
        if (typeof color === 'string' && color) return [color];
        return ['#a855f7'];
    })();
    const [primary, secondary, tertiary] = palette;

    // ── 1. System rules (with format-specific rules injected) ──
    let prompt = THUMBNAIL_SYSTEM_RULES
        .replace('__FORMAT_PLACEHOLDER__', formatRule)
        .replace('__SAFE_ZONE_PLACEHOLDER__', safeZoneRule)
        .replace('__NEVER_SAFE_ZONE_PLACEHOLDER__', neverSafeZoneRule)
        + '\n\n';

    // Lead the prompt with a hard, unmissable format directive — this is the
    // most common reason image models silently fall back to landscape.
    prompt = `OUTPUT FORMAT — ABSOLUTE PRIORITY: ${fmt.label} ${fmt.ratio} (${fmt.dims} px). ${formatRule}\n\n` + prompt;

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

    // ── 4. Color palette ──
    prompt += `COLOR PALETTE — use these as a cohesive system, not just one accent:\n`;
    prompt += `• PRIMARY (${primary}) — most prominent: title text glow, main highlights, key badges, hero element accents.\n`;
    if (secondary) {
        prompt += `• SECONDARY (${secondary}) — drives the BACKGROUND tone (gradient base, dominant atmosphere, lighting hue). The background must clearly read this color while keeping the chosen visual style.\n`;
    } else {
        prompt += `• No secondary: derive a complementary background tone from the primary that fits the chosen style.\n`;
    }
    if (tertiary) {
        prompt += `• TERTIARY (${tertiary}) — accent #2: subtitle highlight, decorative shapes, particles, secondary glow, badge contrast.\n`;
    }
    prompt += `Distribute these colors with intent: dominant background uses ${secondary || 'derived tone'}, the primary pops on top, the tertiary sprinkles small details. Avoid using all three at equal weight — there must be a clear hierarchy.\n`;
    prompt += `Adapt the palette to the chosen style: a Clean style uses these colors softly (small accents on a light surface), a Vibrant style turns them into a bold multi-stop gradient background, a Dark Cinema style renders them as neon glows on a near-black scene, a Bold Impact style uses them as cinematic light/rim highlights.\n\n`;

    // ── 5. Reference images vs. no references ──
    if (hasImages) {
        prompt += [
            'REFERENCE PHOTO INSTRUCTIONS (CRITICAL — DESIGN ANCHORS ON THESE):',
            'I have attached 1-2 reference photos. The PEOPLE/SUBJECTS in those photos are SACRED and define the entire thumbnail:',
            '• Reproduce each person EXACTLY as in the photo — identical face, eyes, hair, skin tone, clothing, body shape, age. Do NOT replace, alter, beautify, or stylize them. The viewer must recognize them at a glance.',
            '• Build the WHOLE composition around these people. The scene, background, lighting, and props must support and complement them — they are not pasted-in foreground decoration.',
            '• Place the main person on a rule-of-thirds line, occupying 30-50% of frame area, looking toward camera or toward the title text.',
            '• Apply an exaggerated emotional expression matching the topic (surprise, shock, curiosity, excitement). Adjust facial pose if needed but PRESERVE the person\'s identity.',
            '• Match the style\'s lighting on the subject (dramatic rim light for Bold/Tech/Gaming, soft diffused for Clean/Editorial, neon RGB for Gaming, flat bright for Hype, etc.).',
            '• Integrate seamlessly with the background — same color temperature, consistent shadow direction, realistic edge blending. NO obvious cutout halos.',
            '',
        ].join('\n');
    } else {
        prompt += NO_REFERENCE_DIRECTIVE + '\n\n';
    }

    // ── 6. Final quality reminder ──
    prompt += 'FINAL QUALITY CHECK: The thumbnail must look like it was designed by a professional graphic designer for a top-tier YouTube channel. It must be instantly eye-catching at any size, have perfect text readability, and make viewers want to click.';

    return prompt;
}

/**
 * Inpaint a specific region of an existing image.
 *
 * Sends a multipart request to /images/edits with:
 *   - image: the original full image
 *   - mask:  a PNG where the area to inpaint is FULLY TRANSPARENT and the rest is opaque (OpenAI convention)
 *   - prompt: instruction for what should appear in the masked region
 *
 * @param {string} prompt        - Edit instruction (already wrapped via buildRefinePrompt if desired)
 * @param {string} imageDataUrl  - Original image as data URL
 * @param {string} maskDataUrl   - Mask image as data URL (transparent region = area to edit)
 * @returns {Promise<string>}    - Data URL of the inpainted result
 */
export async function inpaintImage(prompt, imageDataUrl, maskDataUrl, format = DEFAULT_FORMAT) {
    if (!PROVIDER.key) {
        throw new Error(missingKeyMessage());
    }
    if (!imageDataUrl) {
        throw new Error('Image source requise pour la retouche.');
    }

    const preset = FORMAT_PRESETS[format] || FORMAT_PRESETS[DEFAULT_FORMAT];

    let response;
    // ── Path A: OpenAI direct → real /v1/images/edits with image + mask ──
    if (PROVIDER.supportsEdits) {
        if (!maskDataUrl) {
            throw new Error('Masque requis pour l\'inpainting.');
        }

        const form = new FormData();
        form.append('model', PROVIDER.model);
        form.append('prompt', prompt);
        form.append('size', preset.size);
        form.append('n', '1');

        const imageBlob = dataUrlToBlob(imageDataUrl);
        form.append('image', imageBlob, `source.${extOf(imageBlob.type)}`);

        const maskBlob = dataUrlToBlob(maskDataUrl);
        form.append('mask', maskBlob, 'mask.png');

        response = await fetch(`${PROVIDER.base}/images/edits`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${PROVIDER.key}` },
            body: form,
        });
    } else {
        // ── Path B: gateway fallback → regenerate via /v1/images/generations ──
        // The mask cannot be transmitted; the model is told verbally to apply
        // the edit as if it targeted the originally selected region.
        const finalPrompt = `${prompt}\n\nNOTE: A specific region of the existing thumbnail was selected for editing. Since this gateway endpoint cannot accept a pixel mask, regenerate the entire thumbnail preserving every detail described above and apply the user's edit request as if it targeted the originally selected region.`;

        response = await fetch(`${PROVIDER.base}/images/generations`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PROVIDER.key}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: PROVIDER.model,
                prompt: finalPrompt,
                size: preset.size,
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

/**
 * Build a focused image-to-image edit prompt.
 * Used when the user wants to refine an already-generated thumbnail.
 *
 * The attached reference image IS the existing thumbnail — the AI must
 * preserve everything except what the user explicitly asked to change.
 *
 * @param {object}  options
 * @param {string}  options.instruction - User's edit description
 * @returns {string} Refinement prompt
 */
export function buildRefinePrompt({ instruction, format = DEFAULT_FORMAT }) {
    const fmt = FORMAT_PRESETS[format] || FORMAT_PRESETS[DEFAULT_FORMAT];
    const safeZoneLine = format === 'youtube'
        ? '• Keep the bottom-right corner (~120×40 px) free of critical content (YouTube duration overlay).'
        : format === 'story'
            ? '• Keep the very top 8% and very bottom 18% free of critical text/faces (story UI overlays).'
            : '• Keep critical elements clear of the very edges.';

    return [
        `You are editing an existing thumbnail in ${fmt.label} ${fmt.ratio} format (${fmt.dims} px). The attached image IS the current thumbnail — your output must be a modified version of it.`,
        '',
        'USER EDIT REQUEST (apply ONLY this change):',
        `"${instruction}"`,
        '',
        'CRITICAL RULES:',
        '• PRESERVE the overall layout, composition, subject placement, and visual style of the attached image — unless the user explicitly asked to change them.',
        '• DO NOT alter elements the user did not mention. If the user only asks to change the background, keep the text and subject identical.',
        `• PRESERVE the exact aspect ratio: ${fmt.ratio} (${fmt.dims} px). The output MUST match the same orientation as the input.`,
        '• Maintain professional thumbnail quality: bold readable text, strong contrast, clear focal point, no clutter.',
        safeZoneLine,
        '• Maintain crisp, high-resolution rendering — no blur, no compression artefacts.',
        '• If the user asks to add text, use bold heavy-weight sans-serif typography with strong outline/shadow for legibility.',
        '• If the user asks to change colors, ensure the new palette retains strong contrast.',
        '',
        `Output: a single high-quality ${fmt.ratio} thumbnail image with ONLY the user's requested modification applied.`,
    ].join('\n');
}

