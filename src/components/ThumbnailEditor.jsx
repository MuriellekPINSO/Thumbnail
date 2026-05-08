import { useState, useEffect, useRef } from 'react';
import { Pencil, Wand2, Type, Tag as TagIcon, Palette, AlignLeft, Sparkles, RotateCcw, Send, ChevronDown } from 'lucide-react';
import './ThumbnailEditor.css';

const COLORS = ['#e8ff3c', '#ff5c3a', '#3af5c8', '#c87aff', '#ff3a7e', '#4d9fff'];

const REFINE_SUGGESTIONS = [
    'Change le fond en dégradé violet',
    'Agrandis le titre',
    'Ajoute un effet néon sur le texte',
    'Rends l\'expression plus surprise',
    'Enlève le texte en bas',
];

export default function ThumbnailEditor({
    thumb,
    activeIndex,
    onEdit,
    onRefine,
    onUndo,
}) {
    const [tab, setTab] = useState('text');
    const [refineText, setRefineText] = useState('');
    const [open, setOpen] = useState(true);

    // Reset refine prompt when active thumb changes
    const lastIdRef = useRef(activeIndex);
    useEffect(() => {
        if (lastIdRef.current !== activeIndex) {
            setRefineText('');
            lastIdRef.current = activeIndex;
        }
    }, [activeIndex]);

    if (!thumb) return null;

    const hasAi = !!thumb.aiImageUrl;
    const isBusy = thumb.isAiGenerating;
    const canUndo = (thumb.history?.length || 0) > 0;

    const handleApplyRefine = () => {
        const text = refineText.trim();
        if (!text || isBusy) return;
        onRefine(activeIndex, text);
        setRefineText('');
    };

    const handleSuggestion = (text) => {
        setRefineText(text);
    };

    return (
        <div className={`thumb-editor ${open ? 'is-open' : 'is-collapsed'}`}>
            <button
                type="button"
                className="thumb-editor-toggle"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
            >
                <span className="toggle-left">
                    <span className="toggle-icon">
                        <Pencil size={14} strokeWidth={2.4} />
                    </span>
                    <span className="toggle-text">
                        Modifier <span className="toggle-version">{thumb.label}</span>
                    </span>
                </span>
                <ChevronDown size={16} className="toggle-caret" />
            </button>

            {open && (
                <div className="thumb-editor-body">
                    <div className="thumb-editor-tabs" role="tablist">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={tab === 'text'}
                            className={`tab ${tab === 'text' ? 'active' : ''}`}
                            onClick={() => setTab('text')}
                        >
                            <Type size={13} strokeWidth={2.2} />
                            Texte & couleur
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={tab === 'ai'}
                            className={`tab ${tab === 'ai' ? 'active' : ''}`}
                            onClick={() => setTab('ai')}
                        >
                            <Wand2 size={13} strokeWidth={2.2} />
                            Affiner avec IA
                        </button>
                    </div>

                    <div className="thumb-editor-tab-panel">
                        {tab === 'text' && (
                            <div className="tab-text">
                                {hasAi && (
                                    <div className="editor-hint">
                                        <Sparkles size={12} />
                                        Cette thumbnail est une image IA — modifier le texte ici met à jour les métadonnées. Pour changer visuellement le texte sur l'image, utilise <strong>Affiner avec IA</strong>.
                                    </div>
                                )}

                                <div className="editor-grid">
                                    <label className="editor-field">
                                        <span className="editor-field-label">
                                            <AlignLeft size={11} /> Titre
                                        </span>
                                        <input
                                            type="text"
                                            value={thumb.title || ''}
                                            maxLength={60}
                                            onChange={(e) => onEdit(activeIndex, { title: e.target.value })}
                                        />
                                    </label>

                                    <label className="editor-field">
                                        <span className="editor-field-label">
                                            <AlignLeft size={11} /> Sous-titre
                                        </span>
                                        <input
                                            type="text"
                                            value={thumb.subtitle || ''}
                                            maxLength={50}
                                            onChange={(e) => onEdit(activeIndex, { subtitle: e.target.value })}
                                        />
                                    </label>

                                    <label className="editor-field">
                                        <span className="editor-field-label">
                                            <TagIcon size={11} /> Tag
                                        </span>
                                        <input
                                            type="text"
                                            value={thumb.tag || ''}
                                            maxLength={20}
                                            onChange={(e) => onEdit(activeIndex, { tag: e.target.value })}
                                        />
                                    </label>
                                </div>

                                <div className="editor-color-block">
                                    <span className="editor-field-label">
                                        <Palette size={11} /> Couleur accent
                                    </span>
                                    <div className="editor-color-row">
                                        {COLORS.map(c => (
                                            <button
                                                type="button"
                                                key={c}
                                                className={`editor-color-chip ${thumb.color === c ? 'active' : ''}`}
                                                style={{ background: c }}
                                                onClick={() => onEdit(activeIndex, { color: c })}
                                                aria-label={`Couleur ${c}`}
                                            />
                                        ))}
                                        <input
                                            type="color"
                                            value={thumb.color || '#e8ff3c'}
                                            onChange={(e) => onEdit(activeIndex, { color: e.target.value })}
                                            title="Couleur personnalisée"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {tab === 'ai' && (
                            <div className="tab-ai">
                                <div className="editor-field-label editor-field-label-block">
                                    <Wand2 size={11} /> Décris ce que tu veux changer
                                </div>
                                <textarea
                                    className="ai-refine-textarea"
                                    placeholder="Ex: Change le fond en dégradé violet, agrandis le texte, et ajoute des étincelles dorées…"
                                    rows={3}
                                    maxLength={400}
                                    value={refineText}
                                    onChange={(e) => setRefineText(e.target.value)}
                                    disabled={isBusy}
                                />

                                <div className="ai-suggestions">
                                    {REFINE_SUGGESTIONS.map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            className="ai-suggestion-chip"
                                            onClick={() => handleSuggestion(s)}
                                            disabled={isBusy}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>

                                <div className="ai-actions">
                                    {canUndo && (
                                        <button
                                            type="button"
                                            className="btn-undo"
                                            onClick={() => onUndo(activeIndex)}
                                            disabled={isBusy}
                                        >
                                            <RotateCcw size={13} strokeWidth={2.2} />
                                            Annuler la dernière
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="btn-refine"
                                        onClick={handleApplyRefine}
                                        disabled={!refineText.trim() || isBusy}
                                    >
                                        {isBusy ? (
                                            <><span className="btn-refine-spinner" /> Régénération…</>
                                        ) : (
                                            <><Send size={14} strokeWidth={2.2} /> Appliquer</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
