import { useEffect, useRef, useCallback, useState } from 'react';
import { Download, RotateCw, ImagePlus, Sparkles } from 'lucide-react';
import { drawThumbnail, downloadCanvas, compositeFull } from '../utils/drawThumbnail';
import './ThumbnailCard.css';

export default function ThumbnailCard({
    title, subtitle, tag, variant, index, style, color,
    uploadedImages, screenshotImage,
    label, delay,
    aiImageUrl, isAiGenerating, aiError, onCanvasReady,
    photoUsedInGeneration,   // true = photo was sent to AI, skip compositing
}) {
    const canvasRef = useRef(null);
    const onCanvasReadyRef = useRef(onCanvasReady);
    onCanvasReadyRef.current = onCanvasReady;
    const [compositedUrl, setCompositedUrl] = useState(null);

    const hasUploads    = uploadedImages && uploadedImages.length > 0;
    const hasScreenshot = !!screenshotImage;

    // Skip compositing when the photo was already integrated by the AI.
    // Without this, the user's photo would be pasted on top of a thumbnail
    // that already contains their face — double face, wrong layout.
    const needsCompositing = (hasUploads || hasScreenshot) && !photoUsedInGeneration;

    // ─── AI image ready ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!aiImageUrl || isAiGenerating) return;

        if (!needsCompositing) {
            if (onCanvasReadyRef.current) onCanvasReadyRef.current(aiImageUrl);
            setCompositedUrl(null);
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;

        const personPhoto = hasUploads ? uploadedImages[index % uploadedImages.length] : null;

        compositeFull(canvas, {
            aiImageUrl,
            personPhoto,
            screenshotDataUrl: screenshotImage?.src || null,
            variant,
        }).then(dataUrl => {
            setCompositedUrl(dataUrl);
            if (onCanvasReadyRef.current) onCanvasReadyRef.current(dataUrl);
        }).catch(err => {
            console.error('Compositing error:', err);
            if (onCanvasReadyRef.current) onCanvasReadyRef.current(aiImageUrl);
        });
    }, [aiImageUrl, isAiGenerating, needsCompositing, variant, index]);

    // ─── No AI → canvas fallback ─────────────────────────────────────────────
    useEffect(() => {
        if (aiImageUrl) return;
        if (isAiGenerating) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        drawThumbnail(canvas, { title, subtitle, tag, variant, index, style, color, uploadedImages });

        if (onCanvasReadyRef.current) {
            try {
                const dataUrl = canvas.toDataURL('image/png');
                onCanvasReadyRef.current(dataUrl);
            } catch (e) { /* ignore */ }
        }
    }, [title, subtitle, tag, variant, index, style, color, uploadedImages, aiImageUrl, isAiGenerating]);

    // ─── Download (always 1280×720) ──────────────────────────────────────────
    const handleDownload = useCallback(() => {
        const url = compositedUrl || aiImageUrl;
        if (url) {
            const exportCanvas = document.createElement('canvas');
            exportCanvas.width  = 1280;
            exportCanvas.height = 720;
            const ctx = exportCanvas.getContext('2d');
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const scale = Math.max(1280 / img.width, 720 / img.height);
                const sw = img.width * scale;
                const sh = img.height * scale;
                ctx.drawImage(img, (1280 - sw) / 2, (720 - sh) / 2, sw, sh);
                const link = document.createElement('a');
                link.download = `${(title || 'thumbnail').replace(/\s+/g, '-').toLowerCase()}-${label.replace(/\s+/g, '-')}.png`;
                link.href = exportCanvas.toDataURL('image/png');
                link.click();
            };
            img.onerror = () => {
                const link = document.createElement('a');
                link.download = `${(title || 'thumbnail').replace(/\s+/g, '-').toLowerCase()}-${label.replace(/\s+/g, '-')}.png`;
                link.href = url;
                link.target = '_blank';
                link.click();
            };
            img.src = url;
            return;
        }
        const canvas = canvasRef.current;
        if (canvas) downloadCanvas(canvas, title || 'thumbnail', label);
    }, [compositedUrl, aiImageUrl, title, label]);

    // ─── Render ──────────────────────────────────────────────────────────────
    const showSpinner   = isAiGenerating;
    const showAiDirect  = aiImageUrl && !needsCompositing && !isAiGenerating;
    const showComposited = compositedUrl && !isAiGenerating;
    const showCanvas    = !showSpinner && !showAiDirect && !showComposited;

    const badgeLabel = photoUsedInGeneration
        ? '✦ IA — Ton visage'
        : hasUploads ? '✦ IA + Photo' : '✦ IA';

    return (
        <div className="thumbnail-card" style={{ animationDelay: `${delay}s` }}>
            <div className="thumbnail-canvas-wrapper">
                {showSpinner ? (
                    <div className="ai-generating-overlay">
                        <div className="ai-spinner">
                            <RotateCw size={32} className="spinning-icon" />
                        </div>
                        <p>Génération IA en cours...</p>
                    </div>
                ) : showComposited ? (
                    <img src={compositedUrl} alt={title} className="ai-generated-image" />
                ) : showAiDirect ? (
                    <img src={aiImageUrl} alt={title} className="ai-generated-image" />
                ) : (
                    <canvas
                        ref={canvasRef}
                        width={1280}
                        height={720}
                        style={{ display: (aiImageUrl && needsCompositing && !compositedUrl) ? 'none' : 'block' }}
                    />
                )}

                {aiError && <div className="ai-error-badge">{aiError}</div>}

                {showComposited && !photoUsedInGeneration && (
                    <div className="composite-badge"><Sparkles size={10} /> IA + Photo</div>
                )}
                {(showAiDirect || showComposited) && photoUsedInGeneration && (
                    <div className="composite-badge ai-face-badge"><Sparkles size={10} /> Ton visage intégré</div>
                )}
                {!aiImageUrl && hasUploads && !isAiGenerating && (
                    <div className="upload-used-badge"><ImagePlus size={10} /> Photos intégrées</div>
                )}
            </div>

            <div className="thumbnail-card-footer">
                <div className="thumbnail-label">{label}</div>
                <div className="card-actions">
                    {(aiImageUrl || compositedUrl) && (
                        <span className="ai-badge">{badgeLabel}</span>
                    )}
                    <button className="btn-small" onClick={handleDownload}>
                        <Download size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        Télécharger
                    </button>
                </div>
            </div>
        </div>
    );
}
