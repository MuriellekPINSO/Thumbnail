import { useEffect, useRef, useCallback } from 'react';
import { Download, RotateCw, ImagePlus, Sparkles } from 'lucide-react';
import { drawThumbnail, downloadCanvas } from '../utils/drawThumbnail';
import './ThumbnailCard.css';

export default function ThumbnailCard({
    title, subtitle, tag, variant, index, style, color, uploadedImages, label, delay,
    aiImageUrl, isAiGenerating, aiError, onCanvasReady
}) {
    const canvasRef = useRef(null);
    const onCanvasReadyRef = useRef(onCanvasReady);
    onCanvasReadyRef.current = onCanvasReady;

    const hasUploads = uploadedImages && uploadedImages.length > 0;

    // ─── AI image ready → notify parent with the AI URL directly ───
    useEffect(() => {
        if (!aiImageUrl || isAiGenerating) return;
        if (onCanvasReadyRef.current) {
            onCanvasReadyRef.current(aiImageUrl);
        }
    }, [aiImageUrl, isAiGenerating]);

    // ─── No AI → Standard canvas (with or without uploads) ───
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

    const handleDownload = useCallback(() => {
        if (aiImageUrl) {
            // AI mode: download AI image directly
            const link = document.createElement('a');
            link.download = `${(title || 'thumbnail').replace(/\s+/g, '-').toLowerCase()}-${label.replace(/\s+/g, '-')}.png`;
            link.href = aiImageUrl;
            link.target = '_blank';
            link.click();
            return;
        }
        // Canvas mode: download from canvas
        const canvas = canvasRef.current;
        if (canvas) {
            downloadCanvas(canvas, title || 'thumbnail', label);
        }
    }, [aiImageUrl, title, label]);

    // Determine what to render: AI image directly or canvas fallback
    const showAiImage = aiImageUrl && !isAiGenerating;

    return (
        <div className="thumbnail-card" style={{ animationDelay: `${delay}s` }}>
            <div className="thumbnail-canvas-wrapper">
                {isAiGenerating ? (
                    <div className="ai-generating-overlay">
                        <div className="ai-spinner">
                            <RotateCw size={32} className="spinning-icon" />
                        </div>
                        <p>Génération IA en cours...</p>
                    </div>
                ) : showAiImage ? (
                    <img src={aiImageUrl} alt={title} className="ai-generated-image" />
                ) : (
                    <canvas ref={canvasRef} width={1280} height={720} />
                )}
                {/* Badges */}
                {aiError && <div className="ai-error-badge">{aiError}</div>}
                {aiImageUrl && hasUploads && !isAiGenerating && (
                    <div className="composite-badge">
                        <Sparkles size={10} /> IA + Photo
                    </div>
                )}
                {!aiImageUrl && hasUploads && !isAiGenerating && (
                    <div className="upload-used-badge">
                        <ImagePlus size={10} /> Photos intégrées
                    </div>
                )}
            </div>
            <div className="thumbnail-card-footer">
                <div className="thumbnail-label">{label}</div>
                <div className="card-actions">
                    {aiImageUrl && <span className="ai-badge">{hasUploads ? '✦ IA + Photo' : '✦ IA'}</span>}
                    <button className="btn-small" onClick={handleDownload}>
                        <Download size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        Télécharger
                    </button>
                </div>
            </div>
        </div>
    );
}
