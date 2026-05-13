import { LayoutGrid, Sparkles, Check } from 'lucide-react';
import ThumbnailCard from './ThumbnailCard';
import PreviewPanel from './PreviewPanel';
import './ResultsPanel.css';

export default function ResultsPanel({ thumbnails, mainTitle, previewIndex, setPreviewIndex }) {
    const selectedThumb = thumbnails.length > 0 ? thumbnails[previewIndex] || thumbnails[0] : null;
    const previewSrc = selectedThumb?.composedDataUrl || null;

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
                    <div className="empty-hero">
                        <div className="empty-hero-icon">
                            <Sparkles size={28} strokeWidth={1.5} />
                        </div>
                        <h2 className="empty-hero-title">Ton studio de miniatures IA</h2>
                        <p className="empty-hero-sub">Entre un titre à gauche, choisis un style et génère jusqu'à 3 versions simultanément.</p>
                    </div>

                    <div className="empty-styles-preview">
                        <div className="esp-card esp-bold">
                            <div className="esp-lines" />
                            <div className="esp-content">
                                <div className="esp-bar" />
                                <div className="esp-title">BOLD IMPACT</div>
                                <div className="esp-desc">Sombre · Dramatique</div>
                            </div>
                        </div>
                        <div className="esp-card esp-clean">
                            <div className="esp-top" />
                            <div className="esp-content esp-content-clean">
                                <div className="esp-title esp-title-clean">Clean & Pro</div>
                                <div className="esp-underline" />
                                <div className="esp-desc esp-desc-clean">Épuré · Éditorial</div>
                            </div>
                        </div>
                        <div className="esp-card esp-dark">
                            <div className="esp-vignette" />
                            <div className="esp-content">
                                <div className="esp-neon-tag">— DARK —</div>
                                <div className="esp-title esp-title-neon">CINEMA</div>
                                <div className="esp-desc">Neon · Atmosphérique</div>
                            </div>
                        </div>
                        <div className="esp-card esp-vibrant">
                            <div className="esp-circle-big" />
                            <div className="esp-circle-sm" />
                            <div className="esp-content">
                                <div className="esp-title">VIBRANT</div>
                                <div className="esp-desc">Coloré · Énergique</div>
                            </div>
                        </div>
                    </div>

                    <div className="empty-specs">
                        <span>Format YouTube officiel</span>
                        <span className="spec-dot">·</span>
                        <span>1280 × 720 px</span>
                        <span className="spec-dot">·</span>
                        <span>PNG HD</span>
                    </div>
                </div>
            ) : (
                <>
                    <div className="thumbnails-grid">
                        {thumbnails.map((thumb, i) => (
                            <div
                                key={`${thumb.label}-${i}-${thumb.generationId}`}
                                className={`thumbnail-select-wrapper ${previewIndex === i ? 'preview-active' : ''}`}
                                onClick={() => setPreviewIndex(i)}
                            >
                                {previewIndex === i && (
                                    <div className="preview-badge">
                                        <Check size={10} /> Aperçu
                                    </div>
                                )}
                                <ThumbnailCard
                                    title={thumb.title}
                                    label={thumb.label}
                                    delay={i * 0.1}
                                    composedDataUrl={thumb.composedDataUrl}
                                    isGenerating={thumb.isGenerating}
                                    stage={thumb.stage}
                                    error={thumb.error}
                                    hasPerson={thumb.hasPerson}
                                    hasLogos={thumb.hasLogos}
                                />
                            </div>
                        ))}
                    </div>

                    <PreviewPanel
                        thumbnailSrc={previewSrc}
                        title={mainTitle}
                    />
                </>
            )}
        </div>
    );
}
