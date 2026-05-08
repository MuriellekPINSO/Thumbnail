import { LayoutGrid, Sparkles } from 'lucide-react';
import ThumbnailDeck from './ThumbnailDeck';
import PreviewPanel from './PreviewPanel';
import './ResultsPanel.css';

export default function ResultsPanel({ thumbnails, style, colors, uploadedImages, mainTitle, previewIndex, setPreviewIndex, onCanvasReady, onEditClick }) {
    const selectedThumb = thumbnails.length > 0 ? thumbnails[previewIndex] || thumbnails[0] : null;
    const previewSrc = selectedThumb?.aiImageUrl || selectedThumb?.canvasDataUrl || null;

    return (
        <div className="results-panel">
            <div className="results-header">
                <div className="results-title">
                    <LayoutGrid size={20} />
                    Résultats
                    {thumbnails.length > 0 && (
                        <span>— {thumbnails.length} version{thumbnails.length > 1 ? 's' : ''}</span>
                    )}
                </div>
            </div>

            {thumbnails.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">
                        <Sparkles size={40} strokeWidth={1.5} />
                    </div>
                    <div className="empty-label">
                        Remplis le formulaire, ajoute tes images et génère plusieurs versions de ta thumbnail.
                    </div>
                </div>
            ) : (
                <>
                    <ThumbnailDeck
                        thumbnails={thumbnails}
                        previewIndex={previewIndex}
                        setPreviewIndex={setPreviewIndex}
                        style={style}
                        colors={colors}
                        uploadedImages={uploadedImages}
                        onCanvasReady={onCanvasReady}
                        onEditClick={onEditClick}
                    />

                    <PreviewPanel
                        thumbnailSrc={previewSrc}
                        title={mainTitle}
                    />
                </>
            )}
        </div>
    );
}
