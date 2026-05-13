import { removeBackground as imglyRemoveBackground } from '@imgly/background-removal';

// Cache by source URL so we don't re-process the same image twice.
const cache = new Map();
const inflight = new Map();

/**
 * Remove the background of an image and return an HTMLImageElement
 * with the cutout (transparent background), ready to draw on Canvas.
 *
 * Caches per source URL. Concurrent calls for the same source share
 * one in-flight promise.
 *
 * @param {string} src - data URL or remote URL of the source image
 * @returns {Promise<HTMLImageElement>}
 */
export async function removePhotoBackground(src) {
    if (!src) throw new Error('removePhotoBackground: missing src');
    if (cache.has(src)) return cache.get(src);
    if (inflight.has(src)) return inflight.get(src);

    const promise = (async () => {
        // imgly accepts URL strings, blobs, or ImageData
        const blob = await imglyRemoveBackground(src);
        const objectUrl = URL.createObjectURL(blob);
        const img = await loadImage(objectUrl);
        cache.set(src, img);
        return img;
    })().finally(() => {
        inflight.delete(src);
    });

    inflight.set(src, promise);
    return promise;
}

function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = url;
    });
}
