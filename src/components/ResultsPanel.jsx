import { LayoutGrid, Sparkles } from 'lucide-react';
import ThumbnailCard from './ThumbnailCard';
import PreviewPanel from './PreviewPanel';
import './ResultsPanel.css';

export default function ResultsPanel({ thumbnails, style, color, uploadedImages, mainTitle }) {
    // Get the first thumbnail's image source for preview (AI or canvas)
    const firstThumb = thumbnails.length > 0 ? thumbnails[0] : null;
    const previewSrc = firstThumb?.aiImageUrl || null;

    return (
        <div className="results-panel">
            <div className="results-header">
                <div className="results-title">
                    <LayoutGrid size={20} style={{ marginRight: 10, verticalAlign: 'middle', color: 'var(--accent)' }} />
                    Résultats{' '}
                    {thumbnails.length > 0 && (
                        <span>— {thumbnails.length} version{thumbnails.length > 1 ? 's' : ''}</span>
                    )}
                </div>
            </div>

            {thumbnails.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">
                        <Sparkles size={56} strokeWidth={1} />
                    </div>
                    <div className="empty-label">
                        Remplis le formulaire, ajoute tes images et génère plusieurs versions de ta thumbnail.
                    </div>
                </div>
            ) : (
                <>
                    <div className="thumbnails-grid">
                        {thumbnails.map((thumb, i) => (
                            <ThumbnailCard
                                key={`${thumb.label}-${i}-${thumb.generationId}`}
                                title={thumb.title}
                                subtitle={thumb.subtitle}
                                tag={thumb.tag}
                                variant={thumb.variant}
                                index={i}
                                style={style}
                                color={color}
                                uploadedImages={uploadedImages}
                                label={thumb.label}
                                delay={i * 0.1}
                                aiImageUrl={thumb.aiImageUrl}
                                isAiGenerating={thumb.isAiGenerating}
                                aiError={thumb.aiError}
                                onCanvasReady={(canvasDataUrl) => {
                                    // Update the thumbnail's canvasDataUrl for preview
                                    thumb.canvasDataUrl = canvasDataUrl;
                                }}
                            />
                        ))}
                    </div>

                    {/* YouTube Preview Mockups */}
                    <PreviewPanel
                        thumbnailSrc={previewSrc || thumbnails[0]?.canvasDataUrl || null}
                        title={mainTitle}
                    />
                </>
            )}
        </div>
    );
}
