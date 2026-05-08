import { useCallback, useState } from 'react';

const STORAGE_KEY = 'thumblab-history';
const MAX_ITEMS = 60;
const COMPRESS_QUALITY = 0.85;

// ─── localStorage helpers ───

function loadHistory() {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch {
        return [];
    }
}

/**
 * Try to save items to localStorage. If the quota is exceeded,
 * progressively drop the oldest entries until it fits, and return the trimmed list.
 */
function saveSafely(items) {
    let attempt = items;
    for (let i = 0; i < 50; i++) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
            return attempt;
        } catch {
            // Drop the oldest 10% (or at least 1) and retry
            const drop = Math.max(1, Math.floor(attempt.length * 0.1));
            attempt = attempt.slice(0, attempt.length - drop);
            if (attempt.length === 0) {
                try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
                return [];
            }
        }
    }
    return attempt;
}

// ─── Compress a data URL to JPEG to save quota ───

function compressDataUrl(dataUrl, quality = COMPRESS_QUALITY) {
    return new Promise((resolve) => {
        if (!dataUrl) return resolve(dataUrl);
        const img = new Image();
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                const ctx = canvas.getContext('2d');
                // Fill black bg first so transparent PNGs don't become white-on-jpeg
                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                const compressed = canvas.toDataURL('image/jpeg', quality);
                resolve(compressed);
            } catch {
                resolve(dataUrl);
            }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}

// ─── Day grouping helpers ───

function dayKeyOf(timestamp) {
    const d = new Date(timestamp);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export function groupByDay(items) {
    const map = new Map();
    items.forEach(it => {
        const key = it.dayKey || dayKeyOf(it.generatedAt || Date.now());
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(it);
    });
    // Sort keys descending (most recent first)
    const keys = Array.from(map.keys()).sort().reverse();
    return keys.map(k => ({ day: k, items: map.get(k) }));
}

export function formatDayLabel(dayKey) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const [y, m, d] = dayKey.split('-').map(Number);
    const date = new Date(y, m - 1, d);

    if (date.getTime() === today.getTime()) return "Aujourd'hui";
    if (date.getTime() === yesterday.getTime()) return 'Hier';
    return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
}

// ─── Hook ───

export function useHistory() {
    const [items, setItems] = useState(loadHistory);

    /**
     * Add a thumbnail to history. The dataUrl will be compressed to JPEG before storage.
     * Pass `entry` with at least { dataUrl }. Other fields (title, label, style, colors,
     * variant, generatedAt) are stored verbatim. id and dayKey are derived if missing.
     */
    const addItem = useCallback(async (entry) => {
        if (!entry?.dataUrl) return;
        const compressed = await compressDataUrl(entry.dataUrl, COMPRESS_QUALITY);
        const ts = entry.generatedAt || Date.now();
        const item = {
            id: entry.id || `${ts}-${Math.random().toString(36).slice(2, 8)}`,
            dataUrl: compressed,
            title: entry.title || '',
            label: entry.label || '',
            style: entry.style || '',
            colors: entry.colors || [],
            variant: entry.variant || '',
            generatedAt: ts,
            dayKey: dayKeyOf(ts),
        };
        setItems(prev => {
            const next = [item, ...prev].slice(0, MAX_ITEMS);
            return saveSafely(next);
        });
    }, []);

    const removeItem = useCallback((id) => {
        setItems(prev => {
            const next = prev.filter(i => i.id !== id);
            return saveSafely(next);
        });
    }, []);

    const clearAll = useCallback(() => {
        setItems([]);
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    }, []);

    return { items, addItem, removeItem, clearAll };
}
