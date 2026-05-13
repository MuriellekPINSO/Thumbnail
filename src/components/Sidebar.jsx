import { useState, useCallback } from 'react';
import { Image, Palette, Hash, AlignLeft, Tag, Wand2, MessageSquare, X, ChevronDown, Settings2, Type, Sparkles, Building2, Loader2 } from 'lucide-react';
import DropZone from './DropZone';
import ImagePreviews from './ImagePreviews';
import './Sidebar.css';

// ─── Style definitions ────────────────────────────────────────────────────────

const STYLES = [
    { id: 'bold',    name: 'Bold Impact',  desc: 'Sombre · Dramatique'  },
    { id: 'clean',   name: 'Clean & Pro',  desc: 'Épuré · Éditorial'    },
    { id: 'dark',    name: 'Dark Cinema',  desc: 'Neon · Atmosphérique'  },
    { id: 'vibrant', name: 'Vibrant Pop',  desc: 'Coloré · Énergique'   },
];

const COLORS = ['#e8ff3c', '#ff5c3a', '#3af5c8', '#c87aff', '#ff3a7e', '#4d9fff'];
const COUNTS = [1, 2, 3];

// ─── Mini thumbnail preview (horizontal card, left side) ─────────────────────

function StylePreview({ id, accent }) {
    if (id === 'bold') return (
        <div className="spm spm-bold">
            {/* Dark grid bg */}
            <div className="spm-grid" />
            {/* Diagonal light beam */}
            <div className="spm-beam" style={{ background: `linear-gradient(120deg, transparent 45%, ${accent}28 75%, ${accent}12 100%)` }} />
            {/* Content */}
            <div className="spm-content">
                <div className="spm-bar" style={{ background: accent }} />
                <div className="spm-title-text" style={{ color: '#fff', textShadow: `0 0 18px ${accent}90, 0 0 6px ${accent}50` }}>
                    TITRE
                </div>
                <div className="spm-sub-text" style={{ color: 'rgba(255,255,255,0.38)' }}>sous-titre</div>
            </div>
            {/* Right accent edge */}
            <div className="spm-edge" style={{ background: `linear-gradient(to bottom, ${accent}, ${accent}60)` }} />
        </div>
    );

    if (id === 'clean') return (
        <div className="spm spm-clean">
            {/* Top accent strip */}
            <div className="spm-top-strip" style={{ background: accent }} />
            {/* Content */}
            <div className="spm-content spm-content-light">
                <div className="spm-tag-pill" style={{ background: accent, color: '#000' }}>PRO</div>
                <div className="spm-title-text" style={{ color: '#111114', letterSpacing: '-0.3px' }}>Titre</div>
                <div className="spm-accent-rule" style={{ background: accent }} />
                <div className="spm-sub-text" style={{ color: '#888' }}>sous-titre</div>
            </div>
        </div>
    );

    if (id === 'dark') return (
        <div className="spm spm-dark">
            {/* Vignette corners */}
            <div className="spm-vignette" />
            {/* Right rim glow */}
            <div className="spm-rim-glow" style={{ background: `radial-gradient(ellipse at 100% 50%, ${accent}40 0%, transparent 65%)` }} />
            {/* Content */}
            <div className="spm-content">
                <div className="spm-neon-tag" style={{ color: accent }}>— DARK —</div>
                <div className="spm-title-text" style={{ color: '#fff', textShadow: `0 0 20px ${accent}, 0 0 40px ${accent}60` }}>
                    TITRE
                </div>
                <div className="spm-sub-text" style={{ color: `${accent}80` }}>sous-titre</div>
            </div>
        </div>
    );

    if (id === 'vibrant') return (
        <div className="spm spm-vibrant">
            {/* Decorative orbs */}
            <div className="spm-orb spm-orb-1" />
            <div className="spm-orb spm-orb-2" />
            {/* Content */}
            <div className="spm-content">
                <div className="spm-vibrant-pill">TOP</div>
                <div className="spm-title-text" style={{ color: '#fff', WebkitTextStroke: '0.8px rgba(0,0,0,0.65)' }}>
                    TITRE
                </div>
                <div className="spm-sub-text" style={{ color: 'rgba(255,255,255,0.85)' }}>sous-titre</div>
            </div>
        </div>
    );

    return null;
}

// ─── Collapsible section ──────────────────────────────────────────────────────

function CollapsibleSection({ icon: Icon, title, badge, children, hasContent = false }) {
    const [open, setOpen] = useState(hasContent);
    return (
        <div className={`collapsible ${open ? 'open' : ''}`}>
            <button className="collapsible-trigger" onClick={() => setOpen(o => !o)}>
                <span className="collapsible-label">
                    <Icon size={12} />
                    {title}
                    {badge && <span className="label-badge">{badge}</span>}
                    {hasContent && !open && <span className="content-dot" />}
                </span>
                <ChevronDown size={13} className="chevron" />
            </button>
            {open && <div className="collapsible-content">{children}</div>}
        </div>
    );
}

// ─── Main sidebar ─────────────────────────────────────────────────────────────

export default function Sidebar({
    mainTitle, setMainTitle,
    subtitle, setSubtitle,
    tagText, setTagText,
    customPrompt, setCustomPrompt,
    selectedStyle, setSelectedStyle,
    selectedColor, setSelectedColor,
    selectedCount, setSelectedCount,
    uploadedImages, setUploadedImages,
    referenceThumb, setReferenceThumb,
    detectedCompanies = [],
    disabledDomains = new Set(),
    onToggleCompany,
    isDetectingLogos = false,
    onGenerate,
    onComposeDirectly,
    isGenerating,
}) {
    const handleFileAdded = useCallback((imageData) => {
        setUploadedImages(prev => prev.length >= 6 ? prev : [...prev, imageData]);
    }, [setUploadedImages]);

    const handleRemoveImage = useCallback((index) => {
        setUploadedImages(prev => prev.filter((_, i) => i !== index));
    }, [setUploadedImages]);

    const handleReferenceAdded = useCallback((imageData) => {
        setReferenceThumb(imageData);
    }, [setReferenceThumb]);

    const hasPhotos = uploadedImages.length > 0;
    const hasOptions = !!(subtitle || tagText || customPrompt);
    const hasMedia   = hasPhotos || !!referenceThumb;

    return (
        <aside className="sidebar">

            {/* ── Titre ─────────────────────────────────────────────── */}
            <div className="sidebar-section sidebar-section-primary">
                <div className="section-label"><Type size={12} />Titre principal</div>
                <input
                    type="text"
                    id="mainTitle"
                    placeholder="Ex: Anthropic X Twitter — le partenariat"
                    maxLength={60}
                    value={mainTitle}
                    onChange={(e) => setMainTitle(e.target.value)}
                    className="input-title"
                />
                <div className="char-count">{mainTitle.length}/60</div>

                {/* Auto-detected companies → logos */}
                {(isDetectingLogos || detectedCompanies.length > 0) && (
                    <div className="logo-chips">
                        <div className="logo-chips-label">
                            <Building2 size={11} />
                            <span>Logos détectés</span>
                            {isDetectingLogos && <Loader2 size={11} className="logo-chips-spin" />}
                        </div>
                        <div className="logo-chips-list">
                            {detectedCompanies.map((c) => {
                                const disabled = disabledDomains.has(c.domain);
                                return (
                                    <button
                                        key={c.domain}
                                        className={`logo-chip ${disabled ? 'disabled' : ''}`}
                                        onClick={() => onToggleCompany && onToggleCompany(c.domain)}
                                        title={disabled ? 'Réactiver' : 'Désactiver'}
                                    >
                                        <img src={c.logo.src} alt={c.name} />
                                        <span>{c.name}</span>
                                        {disabled && <X size={10} />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Style visuel ──────────────────────────────────────── */}
            <div className="sidebar-section">
                <div className="section-label"><Palette size={12} />Style visuel</div>
                <div className="style-list">
                    {STYLES.map(s => (
                        <button
                            key={s.id}
                            className={`style-card ${selectedStyle === s.id ? 'active' : ''}`}
                            onClick={() => setSelectedStyle(s.id)}
                        >
                            {/* Mini thumbnail preview */}
                            <div className="style-preview-wrap">
                                <StylePreview id={s.id} accent={selectedColor} />
                            </div>
                            {/* Label */}
                            <div className="style-info">
                                <span className="style-name">{s.name}</span>
                                <span className="style-desc">{s.desc}</span>
                            </div>
                            {/* Active indicator */}
                            {selectedStyle === s.id && (
                                <div className="style-active-dot" style={{ background: selectedColor }} />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Couleur + Versions ────────────────────────────────── */}
            <div className="sidebar-section sidebar-row">
                <div className="sidebar-col">
                    <div className="section-label"><Palette size={12} />Couleur</div>
                    <div className="color-row">
                        {COLORS.map(c => (
                            <button
                                key={c}
                                className={`color-chip ${selectedColor === c ? 'active' : ''}`}
                                style={{ background: c }}
                                onClick={() => setSelectedColor(c)}
                                title={c}
                            />
                        ))}
                        <input
                            type="color"
                            value={selectedColor}
                            title="Couleur personnalisée"
                            onChange={(e) => setSelectedColor(e.target.value)}
                        />
                    </div>
                </div>
                <div className="sidebar-col sidebar-col-count">
                    <div className="section-label"><Hash size={12} />Versions</div>
                    <div className="count-selector">
                        {COUNTS.map(n => (
                            <button
                                key={n}
                                className={`count-btn ${selectedCount === n ? 'active' : ''}`}
                                onClick={() => setSelectedCount(n)}
                            >{n}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Options ───────────────────────────────────────────── */}
            <CollapsibleSection icon={Settings2} title="Options" badge="optionnel" hasContent={hasOptions}>
                <div className="collapsible-fields">
                    <div className="field-group">
                        <label><AlignLeft size={11} />Sous-titre / accroche</label>
                        <input type="text" placeholder="En 10 minutes seulement..." maxLength={50}
                            value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
                    </div>
                    <div className="field-group">
                        <label><Tag size={11} />Tag / Badge</label>
                        <input type="text" placeholder="NOUVEAU · TUTO · LIVE" maxLength={20}
                            value={tagText} onChange={(e) => setTagText(e.target.value)} />
                    </div>
                    <div className="field-group">
                        <label><MessageSquare size={11} />Prompt personnalisé</label>
                        <textarea
                            className="prompt-textarea"
                            placeholder="Instructions créatives... Ex: personne surprise tenant un laptop, fond violet..."
                            maxLength={500} rows={3}
                            value={customPrompt} onChange={(e) => setCustomPrompt(e.target.value)}
                        />
                        <div className="prompt-hint">{customPrompt.length}/500</div>
                    </div>
                </div>
            </CollapsibleSection>

            {/* ── Médias ────────────────────────────────────────────── */}
            <CollapsibleSection icon={Image} title="Médias" badge="photos · inspiration" hasContent={hasMedia}>
                <div className="collapsible-fields">

                    {/* Photos / Assets */}
                    <div className="field-group">
                        <label><Image size={11} />Photos / Assets</label>
                        <DropZone onFilesAdded={handleFileAdded} maxFiles={6} />
                        <ImagePreviews images={uploadedImages} onRemove={handleRemoveImage} />
                    </div>

                    {/* Miniature d'inspiration — replaces screenshot/tweet */}
                    <div className="field-group">
                        <label><Sparkles size={11} />Miniature d'inspiration</label>
                        <p className="media-hint">Glisse une thumbnail YouTube qui te plaît — l'IA s'en inspirera pour la composition et l'énergie.</p>
                        {referenceThumb ? (
                            <div className="reference-preview">
                                <img src={referenceThumb.src} alt="Miniature de référence" />
                                <div className="reference-overlay">
                                    <span className="reference-label">
                                        <Sparkles size={10} /> Inspiration active
                                    </span>
                                </div>
                                <button
                                    className="reference-remove"
                                    onClick={() => setReferenceThumb(null)}
                                    title="Supprimer"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        ) : (
                            <DropZone onFilesAdded={handleReferenceAdded} maxFiles={1} />
                        )}
                    </div>

                </div>
            </CollapsibleSection>

            {/* ── Actions ───────────────────────────────────────────── */}
            <div className="sidebar-actions">
                {hasPhotos && (
                    <button className="btn-compose-direct" onClick={onComposeDirectly} disabled={isGenerating}>
                        ⚡ Composer sans IA
                    </button>
                )}
                <button className="btn-generate" onClick={onGenerate} disabled={isGenerating}>
                    <span className="btn-text">
                        {isGenerating
                            ? <><div className="spinner" />Génération en cours...</>
                            : <><Wand2 size={18} />Générer avec IA</>
                        }
                    </span>
                </button>
            </div>

        </aside>
    );
}
