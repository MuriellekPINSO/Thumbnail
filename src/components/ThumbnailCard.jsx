import { useEffect, useRef } from 'react';
import { Download, RotateCw } from 'lucide-react';
import { drawThumbnail, downloadCanvas } from '../utils/drawThumbnail';
import './ThumbnailCard.css';

export default function ThumbnailCard({
    title, subtitle, tag, variant, index, style, color, uploadedImages, label, delay,
    aiImageUrl, isAiGenerating, aiError, onCanvasReady
}) {
    const canvasRef = useRef(null);

    // Draw canvas-based thumbnail
    useEffect(() => {
        if (aiImageUrl) return; // Skip canvas drawing if we have an AI image
        const canvas = canvasRef.current;
        if (!canvas) return;
        drawThumbnail(canvas, { title, subtitle, tag, variant, index, style, color, uploadedImages });

        // Export canvas data URL for preview
        if (onCanvasReady) {
            try {
                const dataUrl = canvas.toDataURL('image/png');
                onCanvasReady(dataUrl);
            } catch (e) {
                // ignore cross-origin errors
            }
        }
    }, [title, subtitle, tag, variant, index, style, color, uploadedImages, aiImageUrl, onCanvasReady]);

    const handleDownload = () => {
        if (aiImageUrl) {
            const link = document.createElement('a');
            link.download = `${(title || 'thumbnail').replace(/\s+/g, '-').toLowerCase()}-${label.replace(/\s+/g, '-')}.png`;
            link.href = aiImageUrl;
            link.target = '_blank';
            link.click();
            return;
        }
        const canvas = canvasRef.current;
        if (canvas) {
            downloadCanvas(canvas, title || 'thumbnail', label);
        }
    };

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
                ) : aiImageUrl ? (
                    <img src={aiImageUrl} alt={title} className="ai-generated-image" />
                ) : aiError ? (
                    <>
                        <canvas ref={canvasRef} width={1280} height={720} />
                        <div className="ai-error-badge">{aiError}</div>
                    </>
                ) : (
                    <canvas ref={canvasRef} width={1280} height={720} />
                )}
            </div>
            <div className="thumbnail-card-footer">
                <div className="thumbnail-label">{label}</div>
                <div className="card-actions">
                    {aiImageUrl && <span className="ai-badge">✦ IA</span>}
                    <button className="btn-small" onClick={handleDownload}>
                        <Download size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        Télécharger
                    </button>
                </div>
            </div>
        </div>
    );
}
