import { chatCompletion } from './api';

// ─── In-memory caches ────────────────────────────────────────────────────────

const parseCache = new Map();   // title → parsed result
const logoCache  = new Map();   // domain → {img, src}

// ─── Title parser ────────────────────────────────────────────────────────────

const PARSE_SYSTEM_PROMPT = `Tu es un extracteur de noms d'entreprises pour des titres de vidéos YouTube.
Reçois un titre, retourne les entreprises/marques/produits mentionnés au format JSON STRICT :
{"companies":[{"name":"Nom","domain":"domaine.com"}]}

Règles :
- Identifie chaque entreprise, marque, produit, ou service nommé dans le titre.
- Donne le domaine principal officiel (ex: "Anthropic" → "anthropic.com", "Twitter" → "x.com", "ChatGPT" → "openai.com", "Claude" → "anthropic.com", "iPhone" → "apple.com").
- Ignore les mots génériques (ex: "IA", "tutoriel", "secret").
- Si aucune entreprise n'est mentionnée, retourne {"companies":[]}.
- Maximum 4 entreprises.
- Réponds UNIQUEMENT avec le JSON, rien d'autre.`;

// Hand-maintained dictionary. Each entry maps a recognised brand-name token
// (lowercase) to its official domain + the simple-icons slug used to fetch
// the brand's vector logo via jsDelivr (CORS-enabled CDN).
// Slug reference: https://simpleicons.org
const KNOWN_BRANDS = {
    'anthropic':   { domain: 'anthropic.com',  slug: 'anthropic' },
    'claude':      { domain: 'anthropic.com',  slug: 'anthropic' },
    'openai':      { domain: 'openai.com',     slug: 'openai' },
    'chatgpt':     { domain: 'openai.com',     slug: 'openai' },
    'gpt':         { domain: 'openai.com',     slug: 'openai' },
    'dalle':       { domain: 'openai.com',     slug: 'openai' },
    'twitter':     { domain: 'x.com',          slug: 'x' },
    'x':           { domain: 'x.com',          slug: 'x' },
    'google':      { domain: 'google.com',     slug: 'google' },
    'gemini':      { domain: 'google.com',     slug: 'googlegemini' },
    'bard':        { domain: 'google.com',     slug: 'google' },
    'youtube':     { domain: 'youtube.com',    slug: 'youtube' },
    'meta':        { domain: 'meta.com',       slug: 'meta' },
    'facebook':    { domain: 'facebook.com',   slug: 'facebook' },
    'instagram':   { domain: 'instagram.com',  slug: 'instagram' },
    'whatsapp':    { domain: 'whatsapp.com',   slug: 'whatsapp' },
    'apple':       { domain: 'apple.com',      slug: 'apple' },
    'iphone':      { domain: 'apple.com',      slug: 'apple' },
    'ipad':        { domain: 'apple.com',      slug: 'apple' },
    'mac':         { domain: 'apple.com',      slug: 'apple' },
    'macbook':     { domain: 'apple.com',      slug: 'apple' },
    'microsoft':   { domain: 'microsoft.com',  slug: 'microsoft' },
    'windows':     { domain: 'microsoft.com',  slug: 'microsoft' },
    'xbox':        { domain: 'xbox.com',       slug: 'xbox' },
    'copilot':     { domain: 'github.com',     slug: 'githubcopilot' },
    'amazon':      { domain: 'amazon.com',     slug: 'amazon' },
    'aws':         { domain: 'aws.amazon.com', slug: 'amazonwebservices' },
    'alexa':       { domain: 'amazon.com',     slug: 'amazonalexa' },
    'tesla':       { domain: 'tesla.com',      slug: 'tesla' },
    'spacex':      { domain: 'spacex.com',     slug: 'spacex' },
    'netflix':     { domain: 'netflix.com',    slug: 'netflix' },
    'spotify':     { domain: 'spotify.com',    slug: 'spotify' },
    'tiktok':      { domain: 'tiktok.com',     slug: 'tiktok' },
    'discord':     { domain: 'discord.com',    slug: 'discord' },
    'slack':       { domain: 'slack.com',      slug: 'slack' },
    'notion':      { domain: 'notion.so',      slug: 'notion' },
    'figma':       { domain: 'figma.com',      slug: 'figma' },
    'github':      { domain: 'github.com',     slug: 'github' },
    'gitlab':      { domain: 'gitlab.com',     slug: 'gitlab' },
    'vercel':      { domain: 'vercel.com',     slug: 'vercel' },
    'nvidia':      { domain: 'nvidia.com',     slug: 'nvidia' },
    'samsung':     { domain: 'samsung.com',    slug: 'samsung' },
    'sony':        { domain: 'sony.com',       slug: 'sony' },
    'nintendo':    { domain: 'nintendo.com',   slug: 'nintendo' },
    'playstation': { domain: 'playstation.com', slug: 'playstation' },
    'mistral':     { domain: 'mistral.ai',     slug: 'mistralai' },
    'perplexity':  { domain: 'perplexity.ai',  slug: 'perplexity' },
    'huggingface': { domain: 'huggingface.co', slug: 'huggingface' },
    'midjourney':  { domain: 'midjourney.com', slug: 'midjourney' },
    'stability':   { domain: 'stability.ai',   slug: 'stabilityai' },
    'cursor':      { domain: 'cursor.com',     slug: 'cursor' },
    'linear':      { domain: 'linear.app',     slug: 'linear' },
    'stripe':      { domain: 'stripe.com',     slug: 'stripe' },
    'shopify':     { domain: 'shopify.com',    slug: 'shopify' },
    'paypal':      { domain: 'paypal.com',     slug: 'paypal' },
    'uber':        { domain: 'uber.com',       slug: 'uber' },
    'airbnb':      { domain: 'airbnb.com',     slug: 'airbnb' },
    'linkedin':    { domain: 'linkedin.com',   slug: 'linkedin' },
    'reddit':      { domain: 'reddit.com',     slug: 'reddit' },
    'twitch':      { domain: 'twitch.tv',      slug: 'twitch' },
};

/**
 * Quick dictionary-based extractor — no API call needed.
 * Catches the most common brands instantly.
 */
function extractKnownBrands(title) {
    const words = title.toLowerCase().match(/[a-zàâäéèêëîïôöùûüç0-9]+/gi) || [];
    const byDomain = new Map();   // domain → entry
    const order = [];             // preserve first-seen order
    for (const w of words) {
        const brand = KNOWN_BRANDS[w];
        if (!brand) continue;
        if (!byDomain.has(brand.domain)) {
            const name = w.charAt(0).toUpperCase() + w.slice(1);
            byDomain.set(brand.domain, {
                name,
                domain: brand.domain,
                slug: brand.slug,
                matchedTokens: new Set([w]),
            });
            order.push(brand.domain);
        } else {
            byDomain.get(brand.domain).matchedTokens.add(w);
        }
    }
    return order.slice(0, 4).map(d => {
        const e = byDomain.get(d);
        return { name: e.name, domain: e.domain, slug: e.slug, matchedTokens: [...e.matchedTokens] };
    });
}

// Words that connect brand names ("anthropic x twitter", "claude vs gpt").
// Stripped alongside brand tokens so they don't show up orphaned in the title.
const CONNECTOR_WORDS = ['x', 'vs', 'et', 'and'];

/**
 * Remove detected brand tokens (and connector words between them) from a title,
 * so logos visually replace the brand names instead of duplicating them as text.
 *
 * Examples:
 *   ("anthropic x twitter",                [Anthropic, Twitter]) → ""
 *   ("anthropic x twitter — le partenariat", [Anthropic, Twitter]) → "le partenariat"
 *   ("Comment OpenAI a battu Google",      [OpenAI, Google])    → "Comment a battu"
 */
export function stripBrandsFromTitle(title, companies) {
    if (!title || !companies?.length) return title || '';

    const tokens = companies
        .flatMap(c => c.matchedTokens?.length
            ? c.matchedTokens
            : [c.matchedToken || c.name || ''])
        .map(t => (t || '').toLowerCase())
        .filter(Boolean);
    if (!tokens.length) return title;

    const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const all = [...new Set([...tokens, ...CONNECTOR_WORDS])];
    const pattern = new RegExp(`\\b(${all.map(escape).join('|')})\\b`, 'gi');

    return title
        .replace(/×/g, '')               // unicode times sign isn't matched by \b
        .replace(pattern, '')
        .replace(/&/g, '')
        .replace(/\s+/g, ' ')
        .replace(/^[\s\-–—·•:,.;!?]+|[\s\-–—·•:,.;!?]+$/g, '')
        .trim();
}

// Set to true to also try AI parsing for unknown brands (requires chat API credits).
// Default false — dictionary-only is fast, free, and covers 95% of common cases.
const USE_AI_PARSER = false;

let aiParserDisabled = false; // becomes true after first AI failure (e.g. 402)

/**
 * Parse a thumbnail title to extract company names with domains.
 * Strategy:
 *   1. Instant dictionary lookup (no API call)
 *   2. Optional AI fallback for unknown brands (auto-disabled on first failure)
 * Cached per title.
 *
 * @param {string} title
 * @returns {Promise<Array<{name:string, domain:string}>>}
 */
export async function parseCompaniesFromTitle(title) {
    const key = title.trim().toLowerCase();
    if (!key) return [];
    if (parseCache.has(key)) return parseCache.get(key);

    // 1) Instant dictionary lookup
    const known = extractKnownBrands(title);
    if (known.length > 0) {
        console.log('[logoFetch] dictionary match:', known);
        parseCache.set(key, known);
        return known;
    }

    // 2) Optional AI fallback — skip if disabled or previously failed
    if (!USE_AI_PARSER || aiParserDisabled) {
        parseCache.set(key, []);
        return [];
    }

    try {
        console.log('[logoFetch] asking AI to parse:', title);
        const raw = await chatCompletion(PARSE_SYSTEM_PROMPT, title);
        const cleaned = raw.trim().replace(/^```json\s*|\s*```$/g, '');
        const parsed = JSON.parse(cleaned);
        const companies = Array.isArray(parsed.companies)
            ? parsed.companies
                .filter(c => c && typeof c.name === 'string' && typeof c.domain === 'string')
                .slice(0, 4)
            : [];
        parseCache.set(key, companies);
        return companies;
    } catch (err) {
        console.warn('[logoFetch] AI parsing disabled after failure:', err.message);
        aiParserDisabled = true;
        parseCache.set(key, []);
        return [];
    }
}

// ─── Logo fetcher ────────────────────────────────────────────────────────────

function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('read-failed'));
        reader.readAsDataURL(blob);
    });
}

function loadImageFromDataURL(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            if (img.naturalWidth < 16) {
                reject(new Error('too-small'));
                return;
            }
            resolve(img);
        };
        img.onerror = () => reject(new Error('img-load-failed'));
        img.src = dataUrl;
    });
}

/**
 * Fetch a SVG icon from simple-icons via jsDelivr (CORS-enabled CDN),
 * inject a fill color, and return an Image + data URL ready for Canvas.
 *
 * @param {string} slug - simple-icons slug (e.g. 'anthropic', 'x', 'openai')
 * @param {string} fillColor - hex color for the icon
 * @returns {Promise<{img: HTMLImageElement, src: string}>}
 */
async function fetchSimpleIcon(slug, fillColor = '#0a0a14') {
    const url = `https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${slug}.svg`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('http-' + res.status);
    let svgText = await res.text();

    // Inject explicit fill on the <svg> root so the icon picks up our color.
    svgText = svgText.replace('<svg ', `<svg fill="${fillColor}" `);

    const blob = new Blob([svgText], { type: 'image/svg+xml' });
    const dataUrl = await blobToDataURL(blob);
    const img = await loadImageFromDataURL(dataUrl);
    return { img, src: dataUrl };
}

/**
 * Fetch a brand logo by simple-icons slug (preferred) or fall back to
 * a dark-on-white letter placeholder.
 *
 * @param {string} domain - cache key
 * @param {string} [slug] - simple-icons slug from the brand dictionary
 * @param {string} [name] - brand name (used for letter fallback)
 * @returns {Promise<{img: HTMLImageElement, src: string, isFallback?: boolean} | null>}
 */
export async function fetchLogo(domain, slug = null, name = '') {
    if (!domain) return null;
    const d = domain.trim().toLowerCase();
    if (logoCache.has(d)) return logoCache.get(d);

    if (slug) {
        try {
            const result = await fetchSimpleIcon(slug, '#0a0a14');
            console.log('[logoFetch] simple-icons hit for', d, '→', slug);
            logoCache.set(d, result);
            return result;
        } catch (err) {
            console.log('[logoFetch] simple-icons failed for', slug, '→', err.message);
        }
    }

    console.warn('[logoFetch] no slug or fetch failed for', d, '— using letter fallback');
    const fallback = await buildLetterLogo(name || d);
    logoCache.set(d, fallback);
    return fallback;
}

/**
 * Build a fallback "logo" image from the brand name initial — used when no
 * real logo can be fetched. Returns the same shape as fetchLogo result.
 */
async function buildLetterLogo(name) {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Background: dark circle
    ctx.fillStyle = '#1a1a22';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Letter
    const letter = (name?.trim()?.[0] || '?').toUpperCase();
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 140px Syne, Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, size / 2, size / 2 + 8);

    const dataUrl = canvas.toDataURL('image/png');
    const img = await loadImageFromDataURL(dataUrl);
    return { img, src: dataUrl, isFallback: true };
}

/**
 * Convenience: parse + fetch in one call. Returns enriched company list with logo data.
 * Companies without a fetched logo still appear, using a letter placeholder.
 *
 * @param {string} title
 * @returns {Promise<Array<{name:string, domain:string, logo: {img,src,isFallback?:boolean}}>>}
 */
export async function detectCompaniesWithLogos(title) {
    const companies = await parseCompaniesFromTitle(title);
    if (!companies.length) return [];

    const enriched = await Promise.all(
        companies.map(async (c) => {
            const logo = await fetchLogo(c.domain, c.slug, c.name);
            return { ...c, logo };
        })
    );
    return enriched;
}
