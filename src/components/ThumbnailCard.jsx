import { useCallback } from 'react';
import { Download, RotateCw, Sparkles, AlertCircle } from 'lucide-react';
import { downloadDataUrl } from '../utils/drawThumbnail';
import './ThumbnailCard.css';

const STAGE_LABEL = {
    preparing:       'Préparation...',
    detouring:       'Détourage de la photo...',
    'generating-bg': 'Création du fond IA...',
    compositing:     'Assemblage final...',
};

export default function ThumbnailCard({
    title,
    label,
    delay,
    composedDataUrl,
    isGenerating,
    stage,
    error,
    hasPerson,
    hasLogos,
}) {
    const handleDownload = useCallback(() => {
        if (!composedDataUrl) return;
        downloadDataUrl(composedDataUrl, title || 'thumbnail', label);
    }, [composedDataUrl, title, label]);

    const badgeLabel =
        hasPerson && hasLogos ? '✦ Photo + Logos'
        : hasLogos ? '✦ Logos auto'
        : hasPerson ? '✦ Photo détourée'
        : '✦ IA';

    return (
        <div className="thumbnail-card" style={{ animationDelay: `${delay}s` }}>
            <div className="thumbnail-canvas-wrapper">
                {isGenerating ? (
                    <div className="ai-generating-overlay">
                        <div className="ai-spinner">
                            <RotateCw size={32} className="spinning-icon" />
                        </div>
                        <p>{STAGE_LABEL[stage] || 'Génération en cours...'}</p>
                    </div>
                ) : composedDataUrl ? (
                    <img src={composedDataUrl} alt={title} className="ai-generated-image" />
                ) : (
                    <div className="ai-generating-overlay">
                        <AlertCircle size={32} />
                        <p>{error || 'Aucun résultat'}</p>
                    </div>
                )}

                {error && composedDataUrl && (
                    <div className="ai-error-badge">{error}</div>
                )}
            </div>

            <div className="thumbnail-card-footer">
                <div className="thumbnail-label">{label}</div>
                <div className="card-actions">
                    {composedDataUrl && (
                        <span className="ai-badge"><Sparkles size={10} /> {badgeLabel}</span>
                    )}
                    <button className="btn-small" onClick={handleDownload} disabled={!composedDataUrl}>
                        <Download size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                        Télécharger
                    </button>
                </div>
            </div>
        </div>
    );
}
