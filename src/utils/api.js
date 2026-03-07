const API_BASE = 'https://ai-gateway.vercel.sh/v1';
const API_KEY = import.meta.env.VITE_AI_GATEWAY_API_KEY;

// NanoBanana model (Gemini 2.5 Flash Image) via Vercel AI Gateway
const MODEL = 'google/gemini-2.5-flash-image-preview';

/**
 * Generate a thumbnail image via Vercel AI Gateway (NanoBanana model)
 * Uses the OpenAI-compatible chat/completions endpoint with image modality.
 * @param {string} prompt - Description of the thumbnail to generate
 * @returns {Promise<string>} - Data URL (base64) of the generated image
 */
export async function generateThumbnailImage(prompt) {
    if (!API_KEY) {
        throw new Error('Clé API AI Gateway manquante. Vérifiez votre fichier .env (VITE_AI_GATEWAY_API_KEY)');
    }

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
                    content: prompt,
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
 */
export function buildThumbnailPrompt({ title, subtitle, tag, style, color }) {
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
    prompt += 'The thumbnail should be eye-catching, professional, and suitable for YouTube. Include bold readable text as the main focus. Make it look like a premium content creator\'s thumbnail.';

    return prompt;
}
