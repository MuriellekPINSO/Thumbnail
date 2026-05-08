const API_BASE = 'https://ai-gateway.vercel.sh/v1';
const API_KEY = import.meta.env.VITE_GPT2_API_KEY;

const MODEL = 'gpt-image-2';


/**
 * Generate a thumbnail via Vercel AI Gateway (gpt-image-2).
 * - No reference → POST /images/generations (JSON)
 * - With reference thumbnail → POST /images/edits (multipart, image as inspiration)
 * @param {string} prompt
 * @param {string|null} referenceDataUrl - data URL of a reference thumbnail
 * @returns {Promise<string>} - data URL of the generated image
 */
export async function generateThumbnailImage(prompt, referenceDataUrl = null) {
    if (!API_KEY) {
        throw new Error('Clé API manquante. Vérifiez VITE_GPT2_API_KEY dans votre fichier .env');
    }

    if (referenceDataUrl) {
        // Use /images/edits with the reference thumbnail as compositional inspiration
        const res = await fetch(referenceDataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'reference.png', { type: blob.type || 'image/png' });

        const formData = new FormData();
        formData.append('model', MODEL);
        formData.append('image[]', file);
        formData.append('prompt', prompt);
        formData.append('n', '1');
        formData.append('size', '1536x1024');
        formData.append('quality', 'high');

        const response = await fetch(`${API_BASE}/images/edits`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${API_KEY}` },
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            if (response.status === 401) throw new Error('Clé API invalide ou expirée');
            if (response.status === 429) throw new Error('Trop de requêtes. Réessayez dans quelques instants.');
            // Fallback to standard generation if edits endpoint fails
            console.warn('Edits endpoint failed, falling back to generations:', errorData);
            return generateThumbnailImage(prompt, null);
        }

        const data = await response.json();
        const item = data.data?.[0];
        if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
        if (item?.url) return item.url;
        return generateThumbnailImage(prompt, null);
    }

    // Standard generation
    const response = await fetch(`${API_BASE}/images/generations`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: MODEL,
            prompt,
            n: 1,
            size: '1536x1024',
            quality: 'high',
            output_format: 'png',
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) throw new Error('Clé API invalide ou expirée');
        if (response.status === 429) throw new Error('Trop de requêtes. Veuillez réessayer dans quelques instants.');
        throw new Error(errorData.error?.message || `Erreur API gpt-image-2 (HTTP ${response.status})`);
    }

    const data = await response.json();
    const item = data.data?.[0];
    if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
    if (item?.url) return item.url;

    throw new Error('Aucune image générée dans la réponse.');
}

// ─────────────────────────────────────────────────────────────────────────────
// THUMBNAIL DESIGN SYSTEM PROMPT
// Encodes YouTube thumbnail best practices so every generation is high quality.
// Sources: YouTube Creator Academy, VidIQ, TubeBuddy, ThumbnailTest, ThumbsUp.tv
// ─────────────────────────────────────────────────────────────────────────────

const THUMBNAIL_SYSTEM_RULES = [
    // — FORMAT —
    'Generate a YouTube thumbnail. The canvas is 1536×1024 but the VISIBLE SAFE ZONE is the center 1280×720 (16:9 ratio). Place ALL critical content (faces, text, key elements) within this central zone. Extend the background texture/color to the full 1536×1024. NEVER add letterboxing, black bars, borders, or margins.',

    // — THE 2-SECOND RULE (MOST IMPORTANT) —
    'A viewer scrolling YouTube has exactly 2 seconds to notice and click. The thumbnail must communicate ONE clear emotion or promise INSTANTLY. One dominant subject. One key message. Maximum 3 visual zones total. If it takes more than 2 seconds to understand, it fails.',

    // — COMPOSITION —
    'Rule of thirds: place the dominant subject on a vertical third (left or right), not dead center unless the layout says "centered". ONE clear focal point — either the face OR the text dominates, never both equally.',
    'BOTTOM-RIGHT corner (last 120×40 px): ALWAYS leave empty — YouTube renders the video duration badge there and it will cover any content.',
    'Safe margin: keep ALL text and face content at least 40 px from every edge.',

    // — TYPOGRAPHY: THE #1 FACTOR IN CLICK-THROUGH RATE —
    'TEXT IS THE SINGLE MOST IMPORTANT ELEMENT. Maximum 4 words for the main title. Font: Impact, Bebas Neue, Montserrat ExtraBold 900, or Anton — ultra-heavy, ultra-bold, sans-serif ONLY. NEVER use light, thin, regular, serif, script, or decorative fonts.',
    'Title minimum size: 25% of the frame height (180 px on a 720 px canvas). The text must remain fully legible when the thumbnail is displayed at 120×68 px (mobile small view).',
    'NON-NEGOTIABLE TEXT CONTRAST: Every word must have EITHER (a) a solid black stroke/outline of minimum 5 px thickness around each letterform, OR (b) a solid filled rectangle/panel placed directly behind the text block. Text without a contrast mechanism is invisible on half of all backgrounds — it will kill click-through.',
    'Text color rules: white or pure yellow (#FFE500) on dark backgrounds; pure black (#000000) on bright/light backgrounds. Zero compromise.',

    // — FACES & EMOTIONAL TRIGGER —
    'If a person appears: face must fill 30–50% of the total frame. Expression must be EXAGGERATED and instantly readable — wide-open eyes, raised eyebrows, open mouth (shock/amazement), huge genuine smile (joy), or laser-focused intense stare (curiosity/determination). NEVER neutral, NEVER calm, NEVER subtle.',
    'Lighting on faces: hard dramatic key light creating visible sharp shadows. Eyes must be bright, sharp, and in perfect focus. No motion blur, no overexposure. The face must look toward the camera or toward the text — never off-frame.',

    // — COLOR & CONTRAST —
    'Use exactly 2–3 bold, highly saturated colors. Strong complementary pairs that create visual tension: electric blue + warm orange, blood red + cyan, neon yellow + deep purple, lime green + magenta. The thumbnail must visually pop when surrounded by 20 other thumbnails.',
    'Background must contrast DRAMATICALLY with the subject: dark moody background for a bright subject; bright clean background for a dark subject. No camouflage — subject must instantly separate from background.',
    'The user-provided accent color MUST appear prominently: as text color, text glow, badge fill, border highlight, or strong background accent. It should be the first color the eye notices after the face.',
    'AVOID: pastels, muted/desaturated tones, grey palettes, washed-out colors, gradients with too many steps. Everything at maximum contrast and saturation.',

    // — QUALITY BENCHMARK —
    'Reference tier: MrBeast (giant shocked face + 3-word Impact font + bright color blocks), MKBHD (perfect dark studio lighting + premium product), Veritasium (dramatic visual + bold question text). Your output must match or exceed this quality tier. Photorealistic, 4K-level rendering, professional color grading.',

    // — STRICT PROHIBITIONS —
    'NEVER add: device frames, browser chrome, YouTube player UI, watermarks, mock video players, or any UI element.',
    'NEVER: more than 5 words of text total, thin or decorative fonts, cluttered busy layouts with 4+ elements.',
    'NEVER: place text or key faces in the bottom-right corner (timestamp zone). NEVER: stock photo look — it must feel custom-designed.',
].join('\n');

/**
 * Rich style presets with detailed visual direction for each aesthetic
 */
const STYLE_PRESETS = {
    bold: {
        base: 'BOLD IMPACT — cinematic dark drama with explosive energy',
        details: [
            'BACKGROUND: Near-black base (#050505 to #0f0f14 gradient). A single powerful key light source hits the subject from one side at 45°, creating sharp dramatic shadows across the other half. The unlit side bleeds into pure black.',
            'ATMOSPHERE: One strong volumetric light beam (matching the accent color) cuts diagonally through the dark background — like a spotlight or laser. Optional: very subtle smoke/haze particles and a narrow lens flare at the light source.',
            'TYPOGRAPHY: Impact or Bebas Neue, ALL-CAPS, sized at 28-32% of frame height. Tilted exactly 2° clockwise for dynamism. MANDATORY: 6px solid black stroke on every letterform PLUS a strong accent-color glow (blur 20px, opacity 60%) behind the text. White fill color.',
            'ACCENT COLOR: Appears as (1) the volumetric light beam color, (2) the text glow, and (3) a thin 3px horizontal bar above or below the title block. These three uses only.',
            'COMPOSITION: Subject fills the left or right third of frame (per layout instruction). Text stack occupies the opposite third. The middle third is mostly empty — do NOT clutter it.',
            'MOOD BENCHMARK: Think WWE promo poster, Marvel movie title card, or MrBeast challenge thumbnail. Powerful, intense, high-stakes. The viewer must feel adrenaline.',
        ],
    },
    clean: {
        base: 'CLEAN & PROFESSIONAL — editorial magazine quality with premium restraint',
        details: [
            'BACKGROUND: Pure white (#FFFFFF) or very light warm grey (#F5F4F0). Even, soft diffused studio lighting — zero harsh shadows, perfect fill light. The background must feel like an expensive photo studio, not a home webcam setup.',
            'SUBJECT: If a person — polished, confident, direct camera gaze. Like a TED speaker, Apple keynote presenter, or Forbes cover subject. Professional attire. Sharp focus, perfect exposure.',
            'TYPOGRAPHY: Montserrat ExtraBold (900 weight) or similar geometric sans-serif. Bold and authoritative but not aggressive. MANDATORY: 2px dark (#1a1a1a) stroke on every letterform for crispness on light backgrounds. Text color: pure black (#0a0a0c) for maximum contrast on white.',
            'ACCENT COLOR: Used with surgical precision — ONE of these, not all: a 4px horizontal underline bar under the title, a small pill-shaped badge label, or a single colored icon/arrow. Restraint is the point.',
            'LAYOUT: Generous whitespace — at least 20% of the frame should be breathing room. Three-level visual hierarchy: (1) subject/face, (2) large bold title, (3) small accent detail.',
            'MOOD BENCHMARK: Apple product page, Vox explainer, business magazine cover, MKBHD review thumbnail. Clean, premium, trustworthy. Confidence without aggression.',
        ],
    },
    dark: {
        base: 'DARK CINEMA — neon noir atmosphere with cinematic depth',
        details: [
            'BACKGROUND: Near-black (#020208). Rich atmospheric haze fills the depth. Colored rim/edge lighting on the subject silhouette using the accent color — creating a glowing halo effect around the subject edges. Strong vignette at all four corners.',
            'DEPTH & TEXTURE: Pronounced bokeh blur on any background elements. Fine film grain overlay at 15% opacity. Optional: chromatic aberration (color fringe) on bright edges. Subtle horizontal scanlines at 5% opacity for screen feel.',
            'TYPOGRAPHY: ALL-CAPS with a neon glow effect — text appears to emit its own light. Use the accent color as the glow source (shadowBlur 30px) over white or very light grey letterforms. Add a subtle text reflection (30% opacity, flipped, fading out downward).',
            'COLOR GRADING: Teal-orange complementary split toning (cool shadows, warm highlights). Deep crushed blacks — histogram pushed hard left. Reference palette: Blade Runner 2049, The Batman, Cyberpunk 2077 UI.',
            'ACCENT COLOR: Used as (1) the rim light/halo on subject edges, (2) the text neon glow, and (3) a glowing horizontal separator line between title and subtitle.',
            'MOOD BENCHMARK: High-budget thriller poster, sci-fi movie title screen, Linus Tech Tips dark-mode thumbnail. Mysterious, premium, cinematic. The viewer feels like they are about to discover something forbidden or powerful.',
        ],
    },
    vibrant: {
        base: 'VIBRANT POP — maximum saturation, explosive color energy',
        details: [
            'BACKGROUND: Bold multi-stop gradient — two or three HIGHLY SATURATED colors (e.g., electric blue #0066FF to hot pink #FF0080, or lime #00FF66 to orange #FF6600). Colors must be pure, fully saturated, zero grey added. The gradient direction: diagonal from bottom-left to top-right.',
            'GEOMETRIC ELEMENTS: 4-6 bold floating shapes — mix of: large circle (semi-transparent, 40% opacity), lightning bolt icon, star burst, thick arrow pointing toward the text. These are decorative but add energy and depth. Keep them behind the subject.',
            'TYPOGRAPHY: Rounded extra-bold or playful ultra-bold (like Nunito ExtraBold, Poppins Black, or Fredoka One). Text slightly irregular — main word 20% larger than the rest. MANDATORY: 7px solid dark (#000000 or #1a1a1a) stroke on every letterform. Fill: white (#FFFFFF). Optional: a second color pop on one key word.',
            'ENERGY ELEMENTS: Star bursts / sparkle emojis (★ ✦ ✨) at 3-4 positions around the composition. Speed/motion lines emanating from the subject. A bold "starburst" shape behind one key word for emphasis.',
            'ACCENT COLOR: Used as the fill of 1-2 geometric shapes AND as the color of one key text word.',
            'MOOD BENCHMARK: MrBeast challenge video, gaming channel highlight, entertainment/reaction content. Like a carnival ride poster crossed with a streetwear brand drop. Energy level must be 11/10 — the viewer must feel excited just looking at it.',
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
export function buildThumbnailPrompt({ title, subtitle, tag, style, color, hasImages = false, hasReference = false }) {
    const preset = STYLE_PRESETS[style] || STYLE_PRESETS.bold;

    // ── 1. System rules ──
    let prompt = THUMBNAIL_SYSTEM_RULES + '\n\n';

    // ── 2. Style direction ──
    prompt += `VISUAL STYLE: ${preset.base}.\n`;
    prompt += preset.details.join('\n') + '\n\n';

    // ── 3. Content ──
    prompt += `CONTENT TO DISPLAY:\n`;
    const wordCount = title.split(' ').filter(Boolean).length;
    if (wordCount <= 5) {
        prompt += `• Main title text — render EXACTLY this text, very large (25%+ of frame height): "${title}"\n`;
    } else {
        prompt += `• Main title text — the full title is "${title}". Since it exceeds 5 words, CONDENSE it to the 3-4 most impactful words that convey the core message. Render only the condensed version, very large.\n`;
    }

    if (subtitle) {
        prompt += `• Subtitle / hook — smaller text below the title (about 40% the size of the title): "${subtitle}"\n`;
    }

    if (tag) {
        prompt += `• Badge label — a small pill-shaped or rectangular label with bold text, placed in a corner or near the title: "${tag}"\n`;
    }

    prompt += '\n';

    // ── 4. Color ──
    prompt += `ACCENT COLOR: ${color} — use this as the primary highlight color for text glow, badges, borders, or background accents. Pair it with colors that create strong contrast.\n\n`;

    // ── 5. Person photo (sent via edits endpoint) ──
    if (hasImages) {
        prompt += [
            'PERSON PHOTO — THIS IS THE MOST CRITICAL INSTRUCTION:',
            'A real photo of the actual person has been attached. This person MUST be the main subject of the thumbnail. ABSOLUTE RULES:',
            '• Reproduce EXACTLY this person: same face structure, skin tone, hair color and style, and recognizable features. This is a real human being, not a fictional character.',
            '• DO NOT replace or substitute them with any other person. If you cannot use this face, fail gracefully rather than inventing someone else.',
            '• SIZE: The person must fill 35–55% of the total frame. They are the hero of this thumbnail.',
            '• EXPRESSION: Transform their expression into an EXTREME YouTube reaction — mouth wide open in shock or amazement, eyebrows raised as high as possible, wide eyes conveying excitement or disbelief. This exaggerated expression is what makes people click.',
            '• LIGHTING: Apply dramatic professional lighting that matches the style. Bold/Dark → hard key light creating sharp shadows, neon rim light on the edges. Clean → soft even studio light. Vibrant → bright energetic fill light.',
            '• INTEGRATION: The person must look like they BELONG in the scene — not pasted in. Their lighting, shadows, and color grading must match the background.',
            '• BODY LANGUAGE: Open posture, hands visible if possible, leaning slightly toward camera or text — body language that screams energy and excitement.',
            '',
        ].join('\n');
    }

    // ── 6. Reference thumbnail ──
    if (hasReference) {
        prompt += [
            'REFERENCE THUMBNAIL (CRITICAL — use as primary visual inspiration):',
            'A reference YouTube thumbnail has been provided by the user. You MUST:',
            '• Study its COMPOSITION: where subjects and text are placed, use of negative space, rule of thirds.',
            '• Capture its COLOR ENERGY: the overall palette feel (saturated? dark? bright?), contrast level, dominant hues.',
            '• Match its IMPACT LEVEL: if the reference is bold and intense, be bold and intense. If clean, be clean.',
            '• ADAPT it entirely to the new title, style, and accent color — do not reproduce the reference literally.',
            '• The viewer should feel the same "click impulse" as the reference, but for a completely different video.',
            '',
        ].join('\n');
    }

    // ── 7. Final quality reminder ──
    prompt += 'FINAL QUALITY CHECK: Apply the 2-second test — cover everything except the thumbnail and ask "what is this video about and does it make me want to click?" If the answer is not instant and yes, redesign. The thumbnail must look like it was designed by a senior creative director at a top YouTube channel. Perfect text readability at thumbnail size, maximum visual impact, undeniable click-worthy quality.';

    return prompt;
}
