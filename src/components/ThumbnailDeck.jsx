import { useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ThumbnailCard from './ThumbnailCard';
import './ThumbnailDeck.css';

function positionForOffset(offset, total) {
    if (offset === 0) return 'active';
    if (total === 2) return 'back-1';
    if (offset === 1) return 'back-1';
    return 'back-2';
}

export default function ThumbnailDeck({
    thumbnails,
    previewIndex,
    setPreviewIndex,
    style,
    colors,
    uploadedImages,
    onCanvasReady,
    onEditClick,
}) {
    const arenaRef = useRef(null);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });

    const n = thumbnails.length;

    const handleMouseMove = useCallback((e) => {
        const arena = arenaRef.current;
        if (!arena) return;
        const rect = arena.getBoundingClientRect();
        const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
        const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
        const clamp = (v) => Math.max(-1, Math.min(1, v));
        setTilt({ x: clamp(dy) * -6, y: clamp(dx) * 10 });
    }, []);

    const handleLeave = useCallback(() => setTilt({ x: 0, y: 0 }), []);

    const goPrev = useCallback(() => {
        setPreviewIndex((previewIndex - 1 + n) % n);
    }, [previewIndex, n, setPreviewIndex]);

    const goNext = useCallback(() => {
        setPreviewIndex((previewIndex + 1) % n);
    }, [previewIndex, n, setPreviewIndex]);

    if (n === 0) return null;

    return (
        <div className="deck-stage">
            <div
                className="deck-arena"
                ref={arenaRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleLeave}
            >
                <div className="deck-floor" aria-hidden="true" />

                <div className="deck">
                    {thumbnails.map((thumb, i) => {
                        const offset = ((i - previewIndex) + n) % n;
                        const position = positionForOffset(offset, n);
                        const isActive = position === 'active';
                        const cardStyle = isActive
                            ? { '--tilt-x': `${tilt.x}deg`, '--tilt-y': `${tilt.y}deg` }
                            : undefined;

                        return (
                            <div
                                key={`${thumb.label}-${i}-${thumb.generationId}`}
                                className="deck-card"
                                data-position={position}
                                style={cardStyle}
                                onClick={() => !isActive && setPreviewIndex(i)}
                                role={isActive ? undefined : 'button'}
                                tabIndex={isActive ? -1 : 0}
                                onKeyDown={(e) => {
                                    if (!isActive && (e.key === 'Enter' || e.key === ' ')) {
                                        e.preventDefault();
                                        setPreviewIndex(i);
                                    }
                                }}
                                aria-label={isActive ? undefined : `Voir ${thumb.label}`}
                            >
                                <ThumbnailCard
                                    title={thumb.title}
                                    subtitle={thumb.subtitle}
                                    tag={thumb.tag}
                                    variant={thumb.variant}
                                    index={i}
                                    style={thumb.style || style}
                                    colors={thumb.colors || (thumb.color ? [thumb.color] : colors)}
                                    uploadedImages={uploadedImages}
                                    label={thumb.label}
                                    delay={i * 0.08}
                                    aiImageUrl={thumb.aiImageUrl}
                                    isAiGenerating={thumb.isAiGenerating}
                                    aiError={thumb.aiError}
                                    onCanvasReady={(dataUrl) => onCanvasReady(i, dataUrl)}
                                    onEdit={() => {
                                        if (!isActive) setPreviewIndex(i);
                                        if (onEditClick) onEditClick(i);
                                    }}
                                    showEditButton={isActive}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {n > 1 && (
                <div className="deck-nav" role="tablist" aria-label="Versions">
                    <button
                        type="button"
                        className="deck-nav-btn"
                        onClick={goPrev}
                        aria-label="Précédent"
                    >
                        <ChevronLeft size={18} strokeWidth={2.4} />
                    </button>

                    <div className="deck-dots">
                        {thumbnails.map((thumb, i) => (
                            <button
                                key={i}
                                type="button"
                                role="tab"
                                aria-selected={i === previewIndex}
                                className={`deck-dot ${i === previewIndex ? 'active' : ''}`}
                                onClick={() => setPreviewIndex(i)}
                            >
                                v{i + 1}
                            </button>
                        ))}
                    </div>

                    <button
                        type="button"
                        className="deck-nav-btn"
                        onClick={goNext}
                        aria-label="Suivant"
                    >
                        <ChevronRight size={18} strokeWidth={2.4} />
                    </button>
                </div>
            )}

        </div>
    );
}
