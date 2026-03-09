const API_BASE = 'https://ai-gateway.vercel.sh/v1';
const API_KEY = import.meta.env.VITE_AI_GATEWAY_API_KEY;

// NanoBanana model (Gemini 2.5 Flash Image) via Vercel AI Gateway
const MODEL = 'google/gemini-2.5-flash-image-preview';

/**
 * Generate a thumbnail image via Vercel AI Gateway (NanoBanana model)
 * Uses the OpenAI-compatible chat/completions endpoint with image modality.
 * Supports multimodal input: text prompt + optional reference images.
 * @param {string} prompt - Description of the thumbnail to generate
 * @param {string[]} [imageDataUrls] - Optional array of base64 data URLs for reference images
 * @returns {Promise<string>} - Data URL (base64) of the generated image
 */
export async function generateThumbnailImage(prompt, imageDataUrls = []) {
    if (!API_KEY) {
        throw new Error('Clé API AI Gateway manquante. Vérifiez votre fichier .env (VITE_AI_GATEWAY_API_KEY)');
    }

    // Build multimodal content: images first, then text prompt
    const contentParts = [];

    // Add reference images as image_url parts
    if (imageDataUrls && imageDataUrls.length > 0) {
        for (const dataUrl of imageDataUrls) {
            contentParts.push({
                type: 'image_url',
                image_url: { url: dataUrl },
            });
        }
    }

    // Add text prompt
    contentParts.push({
        type: 'text',
        text: prompt,
    });

    const response = await fetch(`${API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: MODEL,
            messages: [
                {
                    role: 'user',
                    content: contentParts,
                },
            ],
            modalities: ['text', 'image'],
            stream: false,
        }),
    });

    if (!response.ok) {
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

    const data = await response.json();

    // Extract image from the response
    // Per Vercel docs, images are in message.images[] with structure:
    // { type: "image_url", image_url: { url: "data:image/png;base64,..." } }
    const images = data.choices?.[0]?.message?.images;

    if (images && Array.isArray(images) && images.length > 0) {
        const firstImage = images[0];

        // Standard Vercel AI Gateway format
        if (firstImage.type === 'image_url' && firstImage.image_url?.url) {
            return firstImage.image_url.url;
        }

        // Fallback: if the image is a direct string (base64)
        if (typeof firstImage === 'string') {
            if (firstImage.startsWith('data:')) {
                return firstImage;
            }
            return `data:image/png;base64,${firstImage}`;
        }

        // Fallback: if there's a url property directly
        if (firstImage.url) {
            return firstImage.url;
        }
    }

    // Last fallback: check if there's an image URL in the text content
    const content = data.choices?.[0]?.message?.content || '';
    const urlMatch = content.match(/!\[.*?\]\((https?:\/\/[^\s)]+)\)/);
    if (urlMatch) {
        return urlMatch[1];
    }

    console.error('Réponse API complète:', JSON.stringify(data, null, 2));
    throw new Error('Aucune image générée dans la réponse. Essayez avec un prompt plus descriptif.');
}

/**
 * Build a prompt for thumbnail generation based on user inputs
 * @param {object} options
 * @param {boolean} [options.hasImages] - Whether user has uploaded reference images
 */
export function buildThumbnailPrompt({ title, subtitle, tag, style, color, hasImages = false }) {
    const styleDescriptions = {
        bold: 'Bold and impactful YouTube thumbnail with dark background, strong typography, grid lines, and dramatic lighting',
        clean: 'Clean and professional YouTube thumbnail with light background, minimal design, modern typography, and subtle accents',
        dark: 'Cinematic dark YouTube thumbnail with moody atmosphere, vignette effect, scan lines, and glowing text',
        vibrant: 'Vibrant and colorful YouTube thumbnail with gradient background, bold shapes, circular image frames, and energetic feel',
    };

    let prompt = `Generate an image: Create a high-quality YouTube thumbnail (16:9 aspect ratio). Style: ${styleDescriptions[style] || styleDescriptions.bold}. `;
    prompt += `Main title text: "${title}". `;

    if (subtitle) {
        prompt += `Subtitle: "${subtitle}". `;
    }

    if (tag) {
        prompt += `Badge/tag: "${tag}". `;
    }

    prompt += `Accent color: ${color}. `;

    if (hasImages) {
        prompt += 'IMPORTANT: I have attached photo(s) of a person/subject. You MUST use the exact person from the attached photo(s) and integrate them naturally into the thumbnail design. Keep the person\'s face, appearance, and clothing exactly as shown in the photo. Place the person prominently in the thumbnail composition. Do NOT replace the person with a different person or illustration. ';
    }

    prompt += 'The thumbnail should be eye-catching, professional, and suitable for YouTube. Include bold readable text as the main focus. Make it look like a premium content creator\'s thumbnail.';

    return prompt;
}
