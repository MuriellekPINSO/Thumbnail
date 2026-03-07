import { useCallback } from 'react';
import { Flame, Sparkles, Moon, Zap, Image, Upload, Palette, Hash, Type, AlignLeft, Tag, Wand2 } from 'lucide-react';
import DropZone from './DropZone';
import ImagePreviews from './ImagePreviews';
import './Sidebar.css';

const STYLES = [
    { id: 'bold', icon: Flame, name: 'Bold Impact' },
    { id: 'clean', icon: Sparkles, name: 'Clean & Pro' },
    { id: 'dark', icon: Moon, name: 'Dark Cinema' },
    { id: 'vibrant', icon: Zap, name: 'Vibrant Pop' },
];

const COLORS = [
    '#e8ff3c', '#ff5c3a', '#3af5c8', '#c87aff', '#ff3a7e', '#4d9fff'
];

const COUNTS = [1, 2, 3];

export default function Sidebar({
    mainTitle, setMainTitle,
    subtitle, setSubtitle,
    tagText, setTagText,
    selectedStyle, setSelectedStyle,
    selectedColor, setSelectedColor,
    selectedCount, setSelectedCount,
    uploadedImages, setUploadedImages,
    onGenerate,
    isGenerating
}) {
    const handleFileAdded = useCallback((imageData) => {
        setUploadedImages(prev => {
            if (prev.length >= 6) return prev;
            return [...prev, imageData];
        });
    }, [setUploadedImages]);

    const handleRemoveImage = useCallback((index) => {
        setUploadedImages(prev => prev.filter((_, i) => i !== index));
    }, [setUploadedImages]);

    return (
        <aside className="sidebar">
            {/* Content */}
            <div>
                <div className="section-label">
                    <Type size={12} />
                    Contenu
                </div>
                <div className="field-group" style={{ gap: '12px' }}>
                    <div className="field-group">
                        <label htmlFor="mainTitle">
                            <AlignLeft size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                            Titre principal
                        </label>
                        <input
                            type="text"
                            id="mainTitle"
                            placeholder="Ex: Comment créer un site web..."
                            maxLength={60}
                            value={mainTitle}
                            onChange={(e) => setMainTitle(e.target.value)}
                        />
                    </div>
                    <div className="field-group">
                        <label htmlFor="subtitle">
                            <AlignLeft size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                            Sous-titre / accroche
                        </label>
                        <input
                            type="text"
                            id="subtitle"
                            placeholder="En 10 minutes seulement"
                            maxLength={50}
                            value={subtitle}
                            onChange={(e) => setSubtitle(e.target.value)}
                        />
                    </div>
                    <div className="field-group">
                        <label htmlFor="tagText">
                            <Tag size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                            Tag / Badge
                        </label>
                        <input
                            type="text"
                            id="tagText"
                            placeholder="NOUVEAU · TUTO · LIVE..."
                            maxLength={20}
                            value={tagText}
                            onChange={(e) => setTagText(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Images */}
            <div>
                <div className="section-label">
                    <Image size={12} />
                    Images assets
                </div>
                <DropZone onFilesAdded={handleFileAdded} maxFiles={6} />
                <ImagePreviews images={uploadedImages} onRemove={handleRemoveImage} />
            </div>

            {/* Style */}
            <div>
                <div className="section-label">
                    <Palette size={12} />
                    Style visuel
                </div>
                <div className="style-grid">
                    {STYLES.map(s => {
                        const IconComp = s.icon;
                        return (
                            <div
                                key={s.id}
                                className={`style-option ${selectedStyle === s.id ? 'active' : ''}`}
                                onClick={() => setSelectedStyle(s.id)}
                            >
                                <div className="style-icon">
                                    <IconComp size={22} strokeWidth={2} />
                                </div>
                                <div className="style-name">{s.name}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Color */}
            <div>
                <div className="section-label">
                    <Palette size={12} />
                    Couleur accent
                </div>
                <div className="color-row">
                    {COLORS.map(c => (
                        <div
                            key={c}
                            className={`color-chip ${selectedColor === c ? 'active' : ''}`}
                            style={{ background: c }}
                            onClick={() => setSelectedColor(c)}
                        />
                    ))}
                    <input
                        type="color"
                        id="customColor"
                        value={selectedColor}
                        title="Couleur personnalisée"
                        onChange={(e) => setSelectedColor(e.target.value)}
                    />
                </div>
            </div>

            {/* Count */}
            <div>
                <div className="section-label">
                    <Hash size={12} />
                    Nombre de versions
                </div>
                <div className="count-selector">
                    {COUNTS.map(n => (
                        <div
                            key={n}
                            className={`count-btn ${selectedCount === n ? 'active' : ''}`}
                            onClick={() => setSelectedCount(n)}
                        >
                            {n}
                        </div>
                    ))}
                </div>
            </div>

            {/* Generate */}
            <button
                className="btn-generate"
                onClick={onGenerate}
                disabled={isGenerating}
            >
                <span className="btn-text">
                    {isGenerating ? (
                        <><div className="spinner" /> Génération en cours...</>
                    ) : (
                        <><Wand2 size={18} /> Générer les thumbnails</>
                    )}
                </span>
            </button>
        </aside>
    );
}
