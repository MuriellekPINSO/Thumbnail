const API_BASE = 'https://ai-gateway.vercel.sh/v1';
// Support both names for backward compatibility
const API_KEY = import.meta.env.VITE_AI_GATEWAY_API_KEY || import.meta.env.VITE_GPT2_API_KEY;

const IMAGE_MODEL = 'gpt-image-2';
// Vercel AI Gateway uses provider/model prefix
const TEXT_MODEL = 'openai/gpt-4o-mini';

/**
 * Generate a thumbnail BACKGROUND (no text, no person, no logos) via Vercel AI Gateway.
 * The background is composited locally with text/person/logos on Canvas.
 *
 * - No reference → POST /images/generations (JSON)
 * - With reference thumbnail → POST /images/edits (multipart, used as compositional inspiration)
 *
 * @param {string} prompt
 * @param {string|null} referenceDataUrl - data URL of a reference thumbnail (inspiration only)
 * @returns {Promise<string>} - data URL of the generated background image
 */
export async function generateThumbnailImage(prompt, referenceDataUrl = null) {
    if (!API_KEY) {
        throw new Error('Clé API manquante. Vérifiez VITE_AI_GATEWAY_API_KEY dans votre fichier .env');
    }

    if (referenceDataUrl) {
        const res = await fetch(referenceDataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'reference.png', { type: blob.type || 'image/png' });

        const formData = new FormData();
        formData.append('model', IMAGE_MODEL);
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
            // /edits failed — losing the reference is a meaningful UX regression,
            // so we surface it as an error rather than silently degrading.
            console.error('Edits endpoint failed (reference will be lost):', response.status, errorData);
            throw new Error(errorData.error?.message || `Référence inutilisable (HTTP ${response.status}) — l'IA n'a pas pu lire le visuel d'inspiration.`);
        }

        const data = await response.json();
        const item = data.data?.[0];
        if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
        if (item?.url) return item.url;
        return generateThumbnailImage(prompt, null);
    }

    const response = await fetch(`${API_BASE}/images/generations`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: IMAGE_MODEL,
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

/**
 * Text completion helper — used by logoFetch to parse companies from a title.
 * @param {string} systemPrompt
 * @param {string} userPrompt
 * @returns {Promise<string>}
 */
export async function chatCompletion(systemPrompt, userPrompt) {
    if (!API_KEY) throw new Error('Clé API manquante.');

    const response = await fetch(`${API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: TEXT_MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0,
        }),
    });

    if (!response.ok) {
        throw new Error(`Erreur API texte (HTTP ${response.status})`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? '';
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKGROUND-ONLY PROMPT SYSTEM
// The AI generates ONLY the background scene (atmosphere, lighting, mood).
// Text, person photos, and logos are composited locally on Canvas.
// ─────────────────────────────────────────────────────────────────────────────

const BACKGROUND_SYSTEM_RULES = [
    'Generate a YouTube thumbnail BACKGROUND PLATE. Canvas: 1536×1024. The visible safe zone is the centered 1280×720 (16:9). Extend texture/color to full canvas. NEVER add letterboxing, borders, or margins.',

    'CRITICAL — THIS IS A BACKGROUND ONLY. Do NOT draw any text, words, letters, numbers, captions, watermarks, or signatures anywhere. Zero typography. The image must contain NO readable characters of any kind.',

    'CRITICAL — Do NOT include any people, faces, characters, mascots, logos, brand marks, icons, UI elements, or device frames. No human silhouettes. No photographic portraits. The scene should feel populated by light and atmosphere, not by subjects.',

    'COMPOSITION FOR OVERLAY: The center-left third (approximately x=0..512 of the safe zone) MUST be relatively clean and uncluttered — this area will receive a person photo cutout. The center-right and right thirds should carry the primary visual interest (light, color, geometry, texture). Use the rule of thirds to push focal energy toward the right side.',

    'BOTTOM-RIGHT corner (last 120×40 px of the safe zone): keep DARKER and SIMPLER — YouTube renders the duration badge there.',

    'COLOR: Use exactly 2–3 highly saturated, bold colors with strong contrast. The user-provided accent color MUST appear as a dominant visual element — as a light source, gradient stop, glow, or major color block. Avoid pastels, muted tones, greys, or washed-out palettes.',

    'LIGHTING & DEPTH: Strong directional lighting with visible volumetric beams, atmospheric haze, or radial glow. Create dramatic depth: bright focal area + darker peripheral fall-off. The image must feel three-dimensional and cinematic.',

    'QUALITY: Photorealistic or premium-illustrated, 4K-level rendering, professional color grading. Reference quality tier: MrBeast backgrounds, Marvel poster backgrounds, Cyberpunk 2077 key art (minus the characters and text). The background alone must already feel click-worthy.',

    'STRICTLY FORBIDDEN: any text or letters, any people or faces, any logos or brand marks, any UI / device frames / browser chrome, any watermarks, any borders or frames around the image.',
].join('\n');

/**
 * Background-only style presets — describe atmosphere, lighting, palette feel.
 * Text and subjects are added later on Canvas, so styles only describe the backdrop.
 */
const STYLE_PRESETS = {
    bold: {
        base: 'BOLD IMPACT — cinematic dark drama, explosive atmospheric energy',
        details: [
            'BACKGROUND: Near-black base (#050505 to #0f0f14 deep gradient). One powerful key light source enters from the right at 45°, raking across the scene and creating sharp directional shadows. The left half falls into deep shadow — perfect dark zone for a person cutout overlay.',
            'ATMOSPHERE: One strong volumetric light beam (in the accent color) cuts diagonally through the right portion of the frame — like a stage spotlight or laser. Subtle smoke/haze particles catch the light. A narrow lens flare at the beam origin.',
            'TEXTURE: Faint geometric grid lines at 5% opacity across the dark areas — like blueprint paper or holographic display. Optional concrete or metallic micro-texture.',
            'ACCENT COLOR USAGE: as (1) the volumetric beam, (2) a glow at the beam origin, (3) a thin vertical edge highlight at the far right of the frame.',
            'MOOD BENCHMARK: WWE promo background, Marvel movie title card backdrop, MrBeast challenge thumbnail (minus the people and text). Powerful, intense, high-stakes.',
        ],
    },
    clean: {
        base: 'CLEAN & PROFESSIONAL — editorial magazine quality, premium restraint',
        details: [
            'BACKGROUND: Pure white (#FFFFFF) or very light warm grey (#F5F4F0). Soft, even diffused studio lighting from above. Zero harsh shadows. The surface should feel like a high-end product photography backdrop.',
            'SUBTLE DEPTH: A very soft radial gradient — slightly brighter in the upper-right, gently darker toward the lower edges. Maybe an extremely faint geometric pattern (dots or thin lines) at 3% opacity.',
            'ACCENT COLOR USAGE: as a single dominant geometric shape — a large soft-edged color block, a wide diagonal band, or a horizontal stripe — occupying roughly the right third of the frame. Used with restraint, not splattered.',
            'NEGATIVE SPACE: At least 50% of the frame is clean negative space. The composition should feel calm, premium, and confidence-inspiring.',
            'MOOD BENCHMARK: Apple product page background, Vox explainer backdrop, business magazine cover. Clean, premium, trustworthy.',
        ],
    },
    dark: {
        base: 'DARK CINEMA — neon noir atmosphere with cinematic depth',
        details: [
            'BACKGROUND: Near-black (#020208) with rich atmospheric haze filling the depth. Strong vignette at all four corners — the edges fade to pure black.',
            'NEON LIGHTING: Multiple light sources in the accent color cast colored rim light and atmospheric glow. Volumetric god-rays cut through the haze. Optional: distant neon signs blurred deep in the bokeh, or faint colored reflections on a wet surface in the foreground.',
            'COLOR GRADING: Teal-orange complementary split-toning (cool shadows, warm highlights). Deep crushed blacks. Fine film grain overlay at 12% opacity. Optional subtle chromatic aberration on bright edges.',
            'ACCENT COLOR USAGE: as (1) the dominant neon glow source, (2) atmospheric god-rays through haze, (3) a glowing horizontal accent line cutting across the lower third of the frame.',
            'MOOD BENCHMARK: Blade Runner 2049, The Batman, Cyberpunk 2077 key art backdrops. Mysterious, premium, cinematic. Feels like a forbidden discovery.',
        ],
    },
    vibrant: {
        base: 'VIBRANT POP — maximum saturation, explosive color energy',
        details: [
            'BACKGROUND: Bold multi-stop diagonal gradient using 2–3 fully saturated, pure colors derived from the accent color and its complement (e.g., accent + a sharp contrasting hue). Zero grey, zero washed-out tones. Direction: bottom-left to top-right.',
            'GEOMETRIC ENERGY: 4–6 large soft-edged geometric shapes floating in the background — semi-transparent circles, bold diagonals, abstract sunbursts, motion lines. They add dynamism without competing with future overlays.',
            'TEXTURE: Optional fine halftone dot pattern or comic-book speed lines at 8% opacity in one quadrant. Subtle starburst sparkles (★) at 2–3 positions.',
            'ACCENT COLOR USAGE: as the dominant gradient stop, the fill of 1–2 floating shapes, and the central radial glow source.',
            'MOOD BENCHMARK: MrBeast challenge background, gaming highlight reel, streetwear brand drop poster. Energy 11/10 — pure visual adrenaline.',
        ],
    },
};

/**
 * Build a background-only prompt for the AI image model.
 *
 * The Canvas layer (text, person, logos) is composited locally — so the AI
 * is instructed to leave the appropriate zones clean and not to draw any
 * subject, text, or logo.
 *
 * @param {object} options
 * @param {string}  options.style          - bold | clean | dark | vibrant
 * @param {string}  options.color          - Hex accent color
 * @param {boolean} [options.hasPerson]    - reserve left-third clean zone for person cutout
 * @param {boolean} [options.hasLogos]     - reserve a clean zone for logo placement
 * @param {boolean} [options.hasReference] - hint that a reference image was provided
 * @returns {string} Full background-only prompt
 */
export function buildThumbnailPrompt({ style, color, hasPerson = false, hasLogos = false, hasReference = false }) {
    const preset = STYLE_PRESETS[style] || STYLE_PRESETS.bold;

    let prompt = BACKGROUND_SYSTEM_RULES + '\n\n';

    // When the user provides a reference thumbnail, it BECOMES the primary
    // visual directive. The style preset details are dropped (they would
    // conflict with the reference). The accent color is still enforced, but
    // adapted to the reference's color logic.
    if (hasReference) {
        prompt += [
            'PRIMARY DIRECTIVE — MATCH THE PROVIDED REFERENCE IMAGE:',
            'A reference thumbnail has been attached. It defines the target visual language. Your output MUST replicate the following from the reference, faithfully and aggressively:',
            '  1. COMPOSITION: where the light comes from, where the focal energy sits, the depth structure (foreground/midground/background), the shape of light/dark zones.',
            '  2. COLOR PALETTE: the exact dominant hues, the saturation level, the color grading (warm/cool split-toning, contrast curve). If the reference is dark and moody, your output must be dark and moody. If it is bright and poppy, the same.',
            '  3. TEXTURE & LIGHTING: grain, atmosphere/haze density, lens character, light harshness, glow intensity, any volumetric beams, any motion blur or directional streaks.',
            '  4. GEOMETRY & ENERGY: any abstract shapes, gradient directions, diagonal flow, radial bursts, geometric patterns present in the reference.',
            '',
            'WHAT TO STRIP from the reference: any human faces, person silhouettes, readable text/letters/numbers, brand logos, UI/device frames. Replace each removed subject with abstract light/color/atmosphere in the SAME SCREEN POSITION (so the composition shape is preserved).',
            '',
            `ACCENT COLOR INTEGRATION: ${color} should appear in the output as the dominant accent — but blend it into the reference's color logic, do not override the reference's palette.`,
            `STYLE HINT (secondary, only if compatible with the reference): ${preset.base}.`,
            '',
        ].join('\n');
    } else {
        prompt += `VISUAL STYLE: ${preset.base}.\n`;
        prompt += preset.details.join('\n') + '\n\n';
        prompt += `ACCENT COLOR: ${color} — this exact hex value must be the dominant accent throughout the background.\n\n`;
    }

    if (hasPerson) {
        prompt += [
            'OVERLAY ZONE — PERSON CUTOUT:',
            'A photo of a person will be composited on top of the LEFT THIRD (x=0..425 of the safe zone) by the application. Therefore:',
            '• Keep the left third visually QUIET — darker, less detailed, fewer competing elements.',
            '• Concentrate visual energy (color, light, motion) in the CENTER and RIGHT thirds.',
            '• Cast some directional rim light that would naturally illuminate a person standing on the left side.',
            '',
        ].join('\n');
    }

    if (hasLogos) {
        prompt += [
            'OVERLAY ZONE — LOGOS:',
            'Company logos will be composited on top by the application. Therefore:',
            '• Keep the upper-right or center area clean enough to host floating logo elements.',
            '• Provide a subtle darker area or soft glow zone that would frame logos nicely.',
            '',
        ].join('\n');
    }

    prompt += 'FINAL CHECK: Verify the output contains ZERO text, ZERO people, ZERO logos. It must be a pure atmospheric background, ready to receive overlays. If you are about to draw any character, face, or brand mark, STOP and replace it with abstract light/color instead.';

    return prompt;
}
