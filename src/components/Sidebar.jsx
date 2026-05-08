import { useCallback, useState } from 'react';
import {
    Flame, Sparkles, Moon, Zap, Image, Palette, Hash, AlignLeft, Tag, Wand2,
    MessageSquare, ChevronLeft, ChevronRight, Check, FileText, Eye,
    Cpu, Gamepad2, Megaphone, Newspaper,
    Youtube, Square, Smartphone
} from 'lucide-react';
import DropZone from './DropZone';
import ImagePreviews from './ImagePreviews';
import './Sidebar.css';

const FORMATS = [
    { id: 'youtube', icon: Youtube,    name: 'YouTube',  ratio: '16:9', dims: '1280×720',  aspect: '16 / 9' },
    { id: 'square',  icon: Square,     name: 'Carré',    ratio: '1:1',  dims: '1080×1080', aspect: '1 / 1'  },
    { id: 'story',   icon: Smartphone, name: 'Story',    ratio: '9:16', dims: '1080×1920', aspect: '9 / 16' },
];

const STYLES = [
    { id: 'bold',      icon: Flame,     name: 'Bold Impact' },
    { id: 'clean',     icon: Sparkles,  name: 'Clean & Pro' },
    { id: 'dark',      icon: Moon,      name: 'Dark Cinema' },
    { id: 'vibrant',   icon: Zap,       name: 'Vibrant Pop' },
    { id: 'tech',      icon: Cpu,       name: 'Tech Review' },
    { id: 'gaming',    icon: Gamepad2,  name: 'Gaming Neon' },
    { id: 'hype',      icon: Megaphone, name: 'Hype Show' },
    { id: 'editorial', icon: Newspaper, name: 'Editorial' },
];

const PALETTE_PRESETS = [
    { id: 'neon',    name: 'Néon',     colors: ['#a855f7', '#22d3ee', '#ec4899'] },
    { id: 'sunset',  name: 'Sunset',   colors: ['#fb923c', '#f43f5e', '#fbbf24'] },
    { id: 'ocean',   name: 'Océan',    colors: ['#3b82f6', '#06b6d4', '#f1f5f9'] },
    { id: 'forest',  name: 'Forêt',    colors: ['#10b981', '#064e3b', '#fde68a'] },
    { id: 'lava',    name: 'Lave',     colors: ['#ef4444', '#f97316', '#fbbf24'] },
    { id: 'mono',    name: 'Mono Pop', colors: ['#0a0a0c', '#a3e635', '#fafafa'] },
    { id: 'pastel',  name: 'Pastel',   colors: ['#fbcfe8', '#c4b5fd', '#a7f3d0'] },
    { id: 'royal',   name: 'Royal',    colors: ['#7c3aed', '#eab308', '#1e3a8a'] },
];

const ROLE_LABELS = ['Primary', 'Secondary', 'Tertiary'];
const COUNTS = [1, 2, 3];
const PALETTE_SIZES = [1, 2, 3];

const STEPS = [
    { id: 1, label: 'Texte',   icon: FileText },
    { id: 2, label: 'Visuel',  icon: Palette },
    { id: 3, label: 'Avancé',  icon: Wand2 },
];

export default function Sidebar({
    mainTitle, setMainTitle,
    subtitle, setSubtitle,
    tagText, setTagText,
    customPrompt, setCustomPrompt,
    selectedStyle, setSelectedStyle,
    selectedColors, setSelectedColors,
    selectedCount, setSelectedCount,
    selectedFormat, setSelectedFormat,
    uploadedImages, setUploadedImages,
    onGenerate,
    isGenerating
}) {
    const [step, setStep] = useState(1);

    // ─── Step navigation ───
    const canAdvanceFromStep1 = mainTitle.trim().length > 0;
    const goNext = useCallback(() => setStep(s => Math.min(3, s + 1)), []);
    const goPrev = useCallback(() => setStep(s => Math.max(1, s - 1)), []);
    const goTo = useCallback((s) => {
        // Allow visiting any step that's accessible (don't allow skipping past step 1 without title)
        if (s > 1 && !canAdvanceFromStep1) {
            setStep(1);
            document.getElementById('mainTitle')?.focus();
            return;
        }
        setStep(s);
    }, [canAdvanceFromStep1]);

    const handleNextClick = () => {
        if (step === 1 && !canAdvanceFromStep1) {
            document.getElementById('mainTitle')?.focus();
            return;
        }
        goNext();
    };

    // ─── Palette helpers (slot count = selectedColors.length) ───
    const setSlot = useCallback((i, color) => {
        setSelectedColors(prev => prev.map((c, idx) => idx === i ? color : c));
    }, [setSelectedColors]);

    const setPaletteSize = useCallback((size) => {
        setSelectedColors(prev => {
            if (size === prev.length) return prev;
            if (size < prev.length) return prev.slice(0, size);
            // Extend by sampling complementary defaults
            const defaults = ['#a855f7', '#22d3ee', '#ec4899'];
            const next = [...prev];
            while (next.length < size) next.push(defaults[next.length] || '#22d3ee');
            return next;
        });
    }, [setSelectedColors]);

    const applyPreset = useCallback((preset) => {
        setSelectedColors(preset.slice(0, Math.max(1, selectedColors.length)));
    }, [setSelectedColors, selectedColors.length]);

    // ─── Image handlers ───
    const handleFileAdded = useCallback((imageData) => {
        setUploadedImages(prev => prev.length >= 6 ? prev : [...prev, imageData]);
    }, [setUploadedImages]);

    const handleRemoveImage = useCallback((index) => {
        setUploadedImages(prev => prev.filter((_, i) => i !== index));
    }, [setUploadedImages]);

    return (
        <aside className="form-panel form-panel-wizard">
            <span className="form-panel-orb" aria-hidden="true" />

            {/* ════ Stepper ════ */}
            <nav className="wizard-stepper" aria-label="Étapes">
                {STEPS.map((s, i) => {
                    const Icon = s.icon;
                    const isActive = step === s.id;
                    const isDone = step > s.id;
                    return (
                        <button
                            key={s.id}
                            type="button"
                            className={`stepper-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                            onClick={() => goTo(s.id)}
                            aria-current={isActive ? 'step' : undefined}
                        >
                            <span className="stepper-dot">
                                {isDone ? <Check size={12} strokeWidth={3} /> : <Icon size={13} strokeWidth={2.4} />}
                            </span>
                            <span className="stepper-label">
                                <span className="stepper-num">{s.id}</span>
                                {s.label}
                            </span>
                            {i < STEPS.length - 1 && <span className="stepper-line" aria-hidden="true" />}
                        </button>
                    );
                })}
            </nav>

            {/* ════ Step content ════ */}
            <div className="wizard-step" key={`step-${step}`}>
                {step === 1 && (
                    <Step1Texte
                        mainTitle={mainTitle} setMainTitle={setMainTitle}
                        subtitle={subtitle} setSubtitle={setSubtitle}
                        tagText={tagText} setTagText={setTagText}
                    />
                )}
                {step === 2 && (
                    <Step2Visuel
                        selectedStyle={selectedStyle} setSelectedStyle={setSelectedStyle}
                        selectedColors={selectedColors} setSelectedColors={setSelectedColors}
                        setSlot={setSlot} setPaletteSize={setPaletteSize} applyPreset={applyPreset}
                    />
                )}
                {step === 3 && (
                    <Step3Avance
                        customPrompt={customPrompt} setCustomPrompt={setCustomPrompt}
                        uploadedImages={uploadedImages}
                        onFileAdded={handleFileAdded} onRemoveImage={handleRemoveImage}
                        selectedCount={selectedCount} setSelectedCount={setSelectedCount}
                        selectedFormat={selectedFormat} setSelectedFormat={setSelectedFormat}
                    />
                )}
            </div>

            {/* ════ Wizard nav ════ */}
            <div className="wizard-nav">
                <button
                    type="button"
                    className="wizard-nav-btn ghost"
                    onClick={goPrev}
                    disabled={step === 1}
                >
                    <ChevronLeft size={15} />
                    <span>Précédent</span>
                </button>

                {step < 3 ? (
                    <button
                        type="button"
                        className="wizard-nav-btn primary"
                        onClick={handleNextClick}
                        disabled={step === 1 && !canAdvanceFromStep1}
                        title={step === 1 && !canAdvanceFromStep1 ? 'Saisis un titre pour continuer' : undefined}
                    >
                        <span>Suivant</span>
                        <ChevronRight size={15} />
                    </button>
                ) : (
                    <button
                        type="button"
                        className="btn-generate"
                        onClick={onGenerate}
                        disabled={isGenerating || !mainTitle.trim()}
                    >
                        <span className="btn-text">
                            {isGenerating ? (
                                <><div className="spinner" /> Génération…</>
                            ) : (
                                <><Wand2 size={18} strokeWidth={2.4} /> Générer</>
                            )}
                        </span>
                    </button>
                )}
            </div>
        </aside>
    );
}

/* ════════════════════════════════════════
   STEP 1 — Texte
   ════════════════════════════════════════ */

function Step1Texte({ mainTitle, setMainTitle, subtitle, setSubtitle, tagText, setTagText }) {
    return (
        <div className="step-content">
            <div className="step-head">
                <h3 className="step-title">Le texte de ta thumbnail</h3>
                <p className="step-sub">Un titre court et impactant convertit toujours mieux qu'une phrase complète.</p>
            </div>

            <div className="ff-stack">
                <div className="ff">
                    <input
                        type="text"
                        id="mainTitle"
                        placeholder=" "
                        maxLength={60}
                        value={mainTitle}
                        onChange={(e) => setMainTitle(e.target.value)}
                        autoFocus
                    />
                    <label htmlFor="mainTitle">
                        <AlignLeft size={12} />
                        Titre principal <span className="ff-required">*</span>
                    </label>
                </div>

                <div className="ff">
                    <input
                        type="text"
                        id="subtitle"
                        placeholder=" "
                        maxLength={50}
                        value={subtitle}
                        onChange={(e) => setSubtitle(e.target.value)}
                    />
                    <label htmlFor="subtitle">
                        <AlignLeft size={12} />
                        Sous-titre / accroche
                    </label>
                </div>

                <div className="ff">
                    <input
                        type="text"
                        id="tagText"
                        placeholder=" "
                        maxLength={20}
                        value={tagText}
                        onChange={(e) => setTagText(e.target.value)}
                    />
                    <label htmlFor="tagText">
                        <Tag size={12} />
                        Tag / Badge
                    </label>
                </div>
            </div>
        </div>
    );
}

/* ════════════════════════════════════════
   STEP 2 — Visuel (Style + Palette)
   ════════════════════════════════════════ */

function Step2Visuel({ selectedStyle, setSelectedStyle, selectedColors, setSlot, setPaletteSize, applyPreset }) {
    const paletteSize = selectedColors.length;

    return (
        <div className="step-content">
            <div className="step-head">
                <h3 className="step-title">L'identité visuelle</h3>
                <p className="step-sub">Choisis un style puis une palette qui définira le fond et les accents.</p>
            </div>

            {/* ─── Style ─── */}
            <div className="step-block">
                <div className="step-block-label">
                    <Palette size={11} /> Style visuel
                </div>
                <div className="style-chip-row">
                    {STYLES.map(s => {
                        const IconComp = s.icon;
                        return (
                            <button
                                type="button"
                                key={s.id}
                                className={`style-option ${selectedStyle === s.id ? 'active' : ''}`}
                                onClick={() => setSelectedStyle(s.id)}
                            >
                                <span className="style-icon"><IconComp size={18} strokeWidth={2.2} /></span>
                                <span className="style-name">{s.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ─── Palette ─── */}
            <div className="step-block">
                <div className="step-block-head">
                    <span className="step-block-label">
                        <Palette size={11} /> Palette
                    </span>
                    <div className="palette-size">
                        {PALETTE_SIZES.map(n => (
                            <button
                                type="button"
                                key={n}
                                className={`palette-size-btn ${paletteSize === n ? 'active' : ''}`}
                                onClick={() => setPaletteSize(n)}
                                aria-pressed={paletteSize === n}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Active palette chips */}
                <div className="palette-chips">
                    {selectedColors.map((c, i) => (
                        <label
                            key={i}
                            className="palette-chip-big"
                            style={{ background: c }}
                            title={`${ROLE_LABELS[i]} — ${c.toUpperCase()}`}
                        >
                            <input
                                type="color"
                                value={c}
                                onChange={(e) => setSlot(i, e.target.value)}
                                aria-label={`${ROLE_LABELS[i]} color`}
                            />
                            <span className="palette-chip-role">{ROLE_LABELS[i]}</span>
                        </label>
                    ))}
                </div>

                {/* Preset row */}
                <div className="preset-row">
                    {PALETTE_PRESETS.map(p => {
                        const truncated = p.colors.slice(0, paletteSize);
                        const isActive = JSON.stringify(truncated) === JSON.stringify(selectedColors);
                        return (
                            <button
                                type="button"
                                key={p.id}
                                className={`preset-pill ${isActive ? 'active' : ''}`}
                                onClick={() => applyPreset(p.colors)}
                            >
                                <span className="preset-pill-stripe">
                                    {truncated.map((c, i) => (
                                        <span key={i} style={{ background: c }} />
                                    ))}
                                </span>
                                <span className="preset-pill-name">{p.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

/* ════════════════════════════════════════
   STEP 3 — Avancé (Prompt IA, Images, Versions)
   ════════════════════════════════════════ */

function Step3Avance({ customPrompt, setCustomPrompt, uploadedImages, onFileAdded, onRemoveImage, selectedCount, setSelectedCount, selectedFormat, setSelectedFormat }) {
    return (
        <div className="step-content">
            <div className="step-head">
                <h3 className="step-title">Détails avancés</h3>
                <p className="step-sub">Tout est optionnel ici — laisse vide pour utiliser nos meilleurs réglages par défaut.</p>
            </div>

            {/* ─── Output format ─── */}
            <div className="step-block">
                <div className="step-block-label">
                    <Eye size={11} /> Format de sortie
                </div>
                <div className="format-row">
                    {FORMATS.map(f => {
                        const Icon = f.icon;
                        const active = selectedFormat === f.id;
                        return (
                            <button
                                type="button"
                                key={f.id}
                                className={`format-option ${active ? 'active' : ''}`}
                                onClick={() => setSelectedFormat(f.id)}
                                aria-pressed={active}
                            >
                                <span
                                    className="format-shape"
                                    style={{ aspectRatio: f.aspect }}
                                    aria-hidden="true"
                                />
                                <span className="format-meta">
                                    <span className="format-name"><Icon size={12} strokeWidth={2.4} /> {f.name}</span>
                                    <span className="format-ratio">{f.ratio} · {f.dims}</span>
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ─── Custom prompt ─── */}
            <div className="step-block">
                <div className="step-block-label">
                    <MessageSquare size={11} />
                    Prompt IA <span className="step-block-hint">— direction créative supplémentaire</span>
                </div>
                <div className="ff ff-textarea ff-prompt">
                    <textarea
                        id="customPrompt"
                        placeholder=" "
                        maxLength={500}
                        rows={3}
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                    />
                    <label htmlFor="customPrompt">
                        Ex: une personne surprise tenant un laptop, fond galaxie…
                    </label>
                    <div className="ff-counter">
                        <span>{customPrompt.length}</span>/500
                    </div>
                </div>
            </div>

            {/* ─── Images ─── */}
            <div className="step-block">
                <div className="step-block-label">
                    <Image size={11} /> Images assets <span className="step-block-hint">— jusqu'à 6</span>
                </div>
                <DropZone onFilesAdded={onFileAdded} maxFiles={6} />
                <ImagePreviews images={uploadedImages} onRemove={onRemoveImage} />
            </div>

            {/* ─── Versions ─── */}
            <div className="step-block step-block-row">
                <div className="step-block-label">
                    <Hash size={11} /> Versions à générer
                </div>
                <div className="count-selector">
                    {COUNTS.map(n => (
                        <button
                            type="button"
                            key={n}
                            className={`count-btn ${selectedCount === n ? 'active' : ''}`}
                            onClick={() => setSelectedCount(n)}
                        >
                            {n}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ════════════════════════════════════════
   LIVE MINI-PREVIEW — updates as user types
   Pure CSS mock that adapts to selected format,
   palette, and style. Gives an instant feel for
   how the final thumbnail will read.
   ════════════════════════════════════════ */

// Each style maps to a small fallback chain of free / system fonts so the
// mini-preview reflects the typographic intent baked into the AI prompt.
// First name in the stack is the "ideal" font (usually free via Google Fonts),
// followed by progressively more universal fallbacks.
const STYLE_FONT_MAP = {
    bold:      { font: "'Anton', 'Bebas Neue', 'Oswald', Impact, 'Syne', sans-serif",                  weight: 800, transform: 'uppercase', letter: '-1px',   tilt: '-1deg' },
    clean:     { font: "'Inter', 'DM Sans', 'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif", weight: 700, transform: 'none',      letter: '-0.5px', tilt: '0deg'  },
    dark:      { font: "'Oswald', 'Bebas Neue', 'Anton', 'Syne', Impact, sans-serif",                  weight: 800, transform: 'uppercase', letter: '-0.5px', tilt: '0deg'  },
    vibrant:   { font: "'Fraunces', 'Recoleta', 'Syne', 'Cooper Black', sans-serif",                   weight: 900, transform: 'uppercase', letter: '-1px',   tilt: '-2deg' },
    tech:      { font: "'Inter', 'Geist', 'DM Sans', 'SF Pro Display', system-ui, sans-serif",         weight: 800, transform: 'none',      letter: '-1px',   tilt: '0deg'  },
    gaming:    { font: "'Bebas Neue', 'Anton', 'Oswald', 'Syne', Impact, sans-serif",                  weight: 900, transform: 'uppercase', letter: '0px',    tilt: '-3deg' },
    hype:      { font: "'Anton', Impact, 'Bebas Neue', 'Oswald', 'Syne', sans-serif",                  weight: 900, transform: 'uppercase', letter: '0px',    tilt: '0deg'  },
    editorial: { font: "'Playfair Display', 'Cormorant Garamond', 'EB Garamond', Georgia, serif",       weight: 700, transform: 'none',      letter: '-1px',   tilt: '0deg'  },
};

export function LiveMiniPreview({ title, subtitle, tag, style, colors, format }) {
    const fmt = FORMATS.find(f => f.id === format) || FORMATS[0];
    const FmtIcon = fmt.icon;
    const [primary, secondary, tertiary] = colors;
    const bgEnd = secondary || primary;
    const accent = primary;
    const sparkle = tertiary || secondary || primary;
    const styleConf = STYLE_FONT_MAP[style] || STYLE_FONT_MAP.bold;

    const displayTitle = (title || 'Ton titre ici').trim();
    const isPlaceholder = !title.trim();

    return (
        <section className="mini-preview" aria-label="Aperçu en temps réel">
            <header className="mini-preview-head">
                <span className="mini-preview-label">
                    <Eye size={12} strokeWidth={2.4} /> Aperçu
                </span>
                <span className="mini-preview-format">
                    <FmtIcon size={11} strokeWidth={2.4} />
                    {fmt.name} · {fmt.ratio}
                </span>
            </header>

            <div
                className={`mini-preview-frame mini-preview-frame--${format} mini-preview-style-${style}`}
                style={{
                    aspectRatio: fmt.aspect,
                    background: `linear-gradient(135deg, ${primary}33 0%, ${bgEnd} 55%, ${bgEnd}cc 100%)`,
                }}
            >
                {/* Glow sparkles */}
                <span className="mini-spark mini-spark-1" style={{ background: accent }} />
                <span className="mini-spark mini-spark-2" style={{ background: sparkle }} />
                <span className="mini-spark mini-spark-3" style={{ background: accent }} />

                {/* Tag */}
                {tag.trim() && (
                    <span className="mini-tag" style={{ background: accent, color: pickContrast(accent) }}>
                        {tag.trim()}
                    </span>
                )}

                {/* Title block */}
                <div className="mini-text-block">
                    <h4
                        className={`mini-title ${isPlaceholder ? 'is-placeholder' : ''}`}
                        style={{
                            fontFamily: styleConf.font,
                            fontWeight: styleConf.weight,
                            textTransform: styleConf.transform,
                            letterSpacing: styleConf.letter,
                            transform: `rotate(${styleConf.tilt})`,
                            color: '#fff',
                            textShadow: `0 0 18px ${accent}aa, 0 2px 0 rgba(0,0,0,0.5), 0 4px 14px rgba(0,0,0,0.6)`,
                            WebkitTextStroke: `1px ${pickContrast(bgEnd) === '#fff' ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.4)'}`,
                        }}
                    >
                        {displayTitle}
                    </h4>
                    {subtitle.trim() && (
                        <p className="mini-subtitle" style={{ color: '#f8fafc' }}>
                            {subtitle.trim()}
                        </p>
                    )}
                </div>

                {/* YouTube duration mock — only for 16:9 */}
                {format === 'youtube' && <span className="mini-duration">12:34</span>}
            </div>

            <p className="mini-preview-hint">
                Aperçu live · le rendu IA final sera bien plus détaillé.
            </p>
        </section>
    );
}

// Quick contrast helper — picks white or black for foreground on a hex bg.
function pickContrast(hex) {
    const c = hex?.replace('#', '');
    if (!c || (c.length !== 3 && c.length !== 6)) return '#fff';
    const full = c.length === 3 ? c.split('').map(x => x + x).join('') : c;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6 ? '#0a0a0c' : '#fff';
}
