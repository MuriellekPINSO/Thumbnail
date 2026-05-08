import { useEffect, useState, useMemo } from 'react';
import { X, Clock, Download, Trash2, History as HistoryIcon, ImageOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { groupByDay, formatDayLabel } from '../hooks/useHistory';
import './HistoryModal.css';

function formatTime(ts) {
    return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function downloadDataUrl(dataUrl, filename) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
}

export default function HistoryModal({ items, onClose, onRemove, onClearAll }) {
    const [previewIdx, setPreviewIdx] = useState(null);
    const [confirmClear, setConfirmClear] = useState(false);

    const groups = useMemo(() => groupByDay(items), [items]);
    const flatItems = useMemo(() => groups.flatMap(g => g.items), [groups]);

    // Lock body scroll while open
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, []);

    // ESC + arrow nav
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') {
                if (previewIdx !== null) setPreviewIdx(null);
                else onClose();
                return;
            }
            if (previewIdx !== null) {
                if (e.key === 'ArrowRight') setPreviewIdx(i => Math.min(flatItems.length - 1, (i ?? 0) + 1));
                if (e.key === 'ArrowLeft') setPreviewIdx(i => Math.max(0, (i ?? 0) - 1));
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [previewIdx, flatItems.length, onClose]);

    const handleDownload = (item) => {
        const safeTitle = (item.title || 'thumbnail').replace(/\s+/g, '-').toLowerCase();
        const safeLabel = (item.label || '').replace(/\s+/g, '-');
        const ts = new Date(item.generatedAt).toISOString().slice(0, 10);
        const ext = item.dataUrl.startsWith('data:image/jpeg') ? 'jpg' : 'png';
        downloadDataUrl(item.dataUrl, `${ts}-${safeTitle}-${safeLabel}.${ext}`);
    };

    const previewItem = previewIdx !== null ? flatItems[previewIdx] : null;

    return (
        <div className="history-root" role="dialog" aria-modal="true" aria-label="Historique des thumbnails">
            <div className="history-backdrop" onClick={onClose} />

            <div className="history-modal" onClick={(e) => e.stopPropagation()}>
                {/* ── Topbar ── */}
                <div className="history-topbar">
                    <div className="history-title-block">
                        <span className="history-icon">
                            <HistoryIcon size={16} />
                        </span>
                        <div>
                            <div className="history-title">Historique</div>
                            <div className="history-sub">
                                {items.length > 0
                                    ? `${items.length} thumbnail${items.length > 1 ? 's' : ''} · ${groups.length} jour${groups.length > 1 ? 's' : ''}`
                                    : 'Aucune thumbnail enregistrée pour le moment'}
                            </div>
                        </div>
                    </div>

                    <div className="history-topbar-actions">
                        {items.length > 0 && (
                            <button
                                type="button"
                                className={`history-btn ghost ${confirmClear ? 'danger' : ''}`}
                                onClick={() => {
                                    if (confirmClear) {
                                        onClearAll();
                                        setConfirmClear(false);
                                    } else {
                                        setConfirmClear(true);
                                        setTimeout(() => setConfirmClear(false), 4000);
                                    }
                                }}
                            >
                                <Trash2 size={13} />
                                <span>{confirmClear ? 'Confirmer ?' : 'Tout effacer'}</span>
                            </button>
                        )}
                        <button
                            type="button"
                            className="history-btn close"
                            onClick={onClose}
                            aria-label="Fermer"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="history-body">
                    {items.length === 0 ? (
                        <div className="history-empty">
                            <span className="history-empty-icon">
                                <ImageOff size={36} strokeWidth={1.5} />
                            </span>
                            <p>Génère ta première thumbnail — elle apparaîtra ici, archivée par jour.</p>
                        </div>
                    ) : (
                        groups.map(group => (
                            <section key={group.day} className="history-day">
                                <h3 className="history-day-label">
                                    <span>{formatDayLabel(group.day)}</span>
                                    <span className="history-day-count">{group.items.length}</span>
                                </h3>
                                <div className="history-grid">
                                    {group.items.map((item) => {
                                        const flatIdx = flatItems.findIndex(i => i.id === item.id);
                                        return (
                                            <article key={item.id} className="history-card">
                                                <button
                                                    type="button"
                                                    className="history-thumb"
                                                    onClick={() => setPreviewIdx(flatIdx)}
                                                >
                                                    <img src={item.dataUrl} alt={item.title || 'thumbnail'} loading="lazy" />
                                                    <span className="history-thumb-overlay">
                                                        <span className="history-thumb-time">
                                                            <Clock size={11} /> {formatTime(item.generatedAt)}
                                                        </span>
                                                    </span>
                                                </button>
                                                <div className="history-card-meta">
                                                    <div className="history-card-title" title={item.title}>
                                                        {item.title || 'Sans titre'}
                                                    </div>
                                                    <div className="history-card-tags">
                                                        {item.label && <span className="history-tag">{item.label}</span>}
                                                        {item.style && <span className="history-tag history-tag-style">{item.style}</span>}
                                                        {Array.isArray(item.colors) && item.colors.length > 0 && (
                                                            <span className="history-tag history-tag-colors">
                                                                {item.colors.slice(0, 3).map((c, i) => (
                                                                    <span key={i} className="history-tag-color-dot" style={{ background: c }} />
                                                                ))}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="history-card-actions">
                                                    <button
                                                        type="button"
                                                        className="history-icon-btn"
                                                        onClick={() => handleDownload(item)}
                                                        title="Télécharger"
                                                        aria-label="Télécharger"
                                                    >
                                                        <Download size={13} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="history-icon-btn danger"
                                                        onClick={() => onRemove(item.id)}
                                                        title="Supprimer"
                                                        aria-label="Supprimer"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            </section>
                        ))
                    )}
                </div>
            </div>

            {/* ── Lightbox ── */}
            {previewItem && (
                <div className="history-lightbox" onClick={() => setPreviewIdx(null)}>
                    <div className="lightbox-stage" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            className="lightbox-close"
                            onClick={() => setPreviewIdx(null)}
                            aria-label="Fermer l'aperçu"
                        >
                            <X size={18} />
                        </button>

                        <button
                            type="button"
                            className="lightbox-nav prev"
                            onClick={() => setPreviewIdx(i => Math.max(0, (i ?? 0) - 1))}
                            disabled={previewIdx === 0}
                            aria-label="Précédent"
                        >
                            <ChevronLeft size={22} />
                        </button>

                        <img
                            src={previewItem.dataUrl}
                            alt={previewItem.title || 'thumbnail'}
                            className="lightbox-img"
                        />

                        <button
                            type="button"
                            className="lightbox-nav next"
                            onClick={() => setPreviewIdx(i => Math.min(flatItems.length - 1, (i ?? 0) + 1))}
                            disabled={previewIdx === flatItems.length - 1}
                            aria-label="Suivant"
                        >
                            <ChevronRight size={22} />
                        </button>

                        <div className="lightbox-info">
                            <div className="lightbox-title">{previewItem.title || 'Sans titre'}</div>
                            <div className="lightbox-meta">
                                {previewItem.label && <span>{previewItem.label}</span>}
                                {previewItem.style && <span>· {previewItem.style}</span>}
                                <span>· {formatTime(previewItem.generatedAt)}</span>
                            </div>
                            <div className="lightbox-actions">
                                <button
                                    type="button"
                                    className="history-btn primary"
                                    onClick={() => handleDownload(previewItem)}
                                >
                                    <Download size={14} />
                                    <span>Télécharger</span>
                                </button>
                                <button
                                    type="button"
                                    className="history-btn ghost"
                                    onClick={() => {
                                        onRemove(previewItem.id);
                                        if (flatItems.length === 1) setPreviewIdx(null);
                                        else setPreviewIdx(i => Math.min(flatItems.length - 2, i ?? 0));
                                    }}
                                >
                                    <Trash2 size={14} />
                                    <span>Supprimer</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
