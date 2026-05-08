import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
    X, Layers, Wand2, Type as TypeIcon, Image as ImageIcon, Plus, Trash2,
    Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown, Send, RotateCcw,
    Bold, Italic, AlignLeft, AlignCenter, AlignRight, Palette, RectangleHorizontal,
    Sparkles, Check,
} from 'lucide-react';
import './ThumbnailEditModal.css';

const CANVAS_W = 1280;
const CANVAS_H = 720;

const FONT_FAMILIES = [
    { id: 'Anton', label: 'Anton (impact)', stack: '"Anton", "Impact", sans-serif' },
    { id: 'Bebas Neue', label: 'Bebas Neue', stack: '"Bebas Neue", "Impact", sans-serif' },
    { id: 'Syne', label: 'Syne (display)', stack: '"Syne", sans-serif' },
    { id: 'DM Sans', label: 'DM Sans', stack: '"DM Sans", sans-serif' },
    { id: 'Inter', label: 'Inter', stack: '"Inter", sans-serif' },
    { id: 'system-ui', label: 'Système', stack: 'system-ui, -apple-system, sans-serif' },
];

function makeBaseLayer(src, name = 'Image de base') {
    return {
        id: uid(),
        type: 'image',
        name,
        src,
        x: 0,
        y: 0,
        w: CANVAS_W,
        h: CANVAS_H,
        opacity: 1,
        visible: true,
        locked: true,
        isBase: true,
    };
}

function uid() {
    return Math.random().toString(36).slice(2, 9);
}

function defaultLayersFromThumb(thumb) {
    // Base image layer: AI image if any, fall back to canvas data url
    const baseSrc = thumb?.aiImageUrl || thumb?.canvasDataUrl || null;
    const layers = [];
    if (baseSrc) {
        layers.push(makeBaseLayer(baseSrc));
    }
    return layers;
}

function makeTextLayer({ content = 'Nouveau texte', x = 80, y = 240, fontSize = 96, fontFamily = 'Anton', fontWeight = 900, italic = false, color = '#ffffff', stroke = '#000000', strokeWidth = 4, align = 'left', rotation = 0, opacity = 1 } = {}) {
    return {
        id: uid(),
        type: 'text',
        name: content.slice(0, 24) || 'Texte',
        content,
        x,
        y,
        w: 800,
        h: fontSize * 1.3,
        fontSize,
        fontFamily,
        fontWeight,
        italic,
        color,
        stroke,
        strokeWidth,
        align,
        rotation,
        opacity,
        visible: true,
        locked: false,
    };
}

export default function ThumbnailEditModal({ thumb, index, onClose, onSave, onInpaint, onUndo }) {
    const [tab, setTab] = useState('manual');
    const [layers, setLayers] = useState(() => {
        // Seed with the base image. Pre-add text layers from thumb meta as a convenience for canvas thumbs without AI.
        const base = defaultLayersFromThumb(thumb);
        // Resolve a primary accent color for text seeding (palette-aware)
        const accent = (Array.isArray(thumb.colors) && thumb.colors[0]) || thumb.color || '#e8ff3c';
        const tertiary = (Array.isArray(thumb.colors) && thumb.colors[2]) || accent;
        if (!thumb.aiImageUrl) {
            const texts = [];
            if (thumb.title) texts.push(makeTextLayer({ content: thumb.title, x: 80, y: 220, fontSize: 120, color: '#ffffff', stroke: '#000', strokeWidth: 6 }));
            if (thumb.subtitle) texts.push(makeTextLayer({ content: thumb.subtitle, x: 80, y: 380, fontSize: 56, color: accent, stroke: '#000', strokeWidth: 4 }));
            if (thumb.tag) texts.push(makeTextLayer({ content: thumb.tag, x: 80, y: 80, fontSize: 36, color: '#000', stroke: tertiary, strokeWidth: 0 }));
            return [...base, ...texts];
        }
        return base;
    });
    const [selectedLayerId, setSelectedLayerId] = useState(null);
    const [refineText, setRefineText] = useState('');
    const [region, setRegion] = useState(null); // {x,y,w,h} in canvas coords
    const [isApplying, setIsApplying] = useState(false);
    const [statusMsg, setStatusMsg] = useState(null);

    const stageRef = useRef(null);
    const stageInnerRef = useRef(null);
    const dragRef = useRef(null);

    // ─── Lock body scroll while modal is open ───
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, []);

    // ─── ESC to close ───
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const baseImageUrl = useMemo(() => {
        const base = layers.find(l => l.isBase);
        return base?.src || null;
    }, [layers]);

    const selectedLayer = layers.find(l => l.id === selectedLayerId) || null;

    // ─── Stage scale (canvas → screen) ───
    // We compute the ratio at runtime from the rendered stage size to preserve crisp positioning.
    const getStageScale = useCallback(() => {
        const inner = stageInnerRef.current;
        if (!inner) return 1;
        return inner.clientWidth / CANVAS_W;
    }, []);

    // ─── Layer ops ───
    const updateLayer = useCallback((id, updates) => {
        setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    }, []);

    const deleteLayer = useCallback((id) => {
        setLayers(prev => prev.filter(l => l.id !== id));
        setSelectedLayerId(prev => prev === id ? null : prev);
    }, []);

    const moveLayer = useCallback((id, direction) => {
        setLayers(prev => {
            const idx = prev.findIndex(l => l.id === id);
            if (idx === -1) return prev;
            const targetIdx = direction === 'up' ? idx + 1 : idx - 1;
            if (targetIdx < 0 || targetIdx >= prev.length) return prev;
            const next = [...prev];
            [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
            return next;
        });
    }, []);

    const addTextLayer = useCallback(() => {
        const layer = makeTextLayer({ content: 'Nouveau texte', x: CANVAS_W / 2 - 200, y: CANVAS_H / 2 - 60 });
        setLayers(prev => [...prev, layer]);
        setSelectedLayerId(layer.id);
    }, []);

    // ─── Drag handler for moving a layer ───
    const onLayerPointerDown = (e, layer) => {
        if (layer.locked) return;
        e.stopPropagation();
        setSelectedLayerId(layer.id);
        const scale = getStageScale();
        const startX = e.clientX;
        const startY = e.clientY;
        const initX = layer.x;
        const initY = layer.y;

        const move = (ev) => {
            const dx = (ev.clientX - startX) / scale;
            const dy = (ev.clientY - startY) / scale;
            updateLayer(layer.id, { x: initX + dx, y: initY + dy });
        };
        const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    };

    // ─── Region selection (AI tab) ───
    const onRegionPointerDown = (e) => {
        const inner = stageInnerRef.current;
        if (!inner) return;
        const rect = inner.getBoundingClientRect();
        const scale = getStageScale();
        const startCx = (e.clientX - rect.left) / scale;
        const startCy = (e.clientY - rect.top) / scale;

        setRegion({ x: startCx, y: startCy, w: 0, h: 0 });

        const move = (ev) => {
            const cx = Math.max(0, Math.min(CANVAS_W, (ev.clientX - rect.left) / scale));
            const cy = Math.max(0, Math.min(CANVAS_H, (ev.clientY - rect.top) / scale));
            const nx = Math.min(startCx, cx);
            const ny = Math.min(startCy, cy);
            const nw = Math.abs(cx - startCx);
            const nh = Math.abs(cy - startCy);
            setRegion({ x: nx, y: ny, w: nw, h: nh });
        };
        const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    };

    // ─── Auto-clear non-error status after a few seconds ───
    useEffect(() => {
        if (!statusMsg || statusMsg.type === 'error' || statusMsg.type === 'info') return;
        const t = setTimeout(() => setStatusMsg(null), 3500);
        return () => clearTimeout(t);
    }, [statusMsg]);

    // ─── Preload fonts that may be used in canvas drawing ───
    const ensureFontsLoaded = useCallback(async (textLayers) => {
        if (!document.fonts) return;
        try {
            // Wait for stylesheet-declared fonts to be ready
            await document.fonts.ready;
            // Explicitly request any specific weight+size+family combos used by text layers
            const requests = textLayers.map(l => {
                const weight = l.fontWeight || 800;
                const italic = l.italic ? 'italic ' : '';
                const fam = l.fontFamily || 'sans-serif';
                return document.fonts.load(`${italic}${weight} ${l.fontSize}px "${fam}"`).catch(() => {});
            });
            await Promise.all(requests);
        } catch { /* ignore */ }
    }, []);

    // ─── Flatten layers to PNG ───
    const flatten = useCallback(async () => {
        const canvas = document.createElement('canvas');
        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;
        const ctx = canvas.getContext('2d');

        // Make sure web fonts are loaded before measuring/drawing text
        const textLayers = layers.filter(l => l.visible && l.type === 'text');
        if (textLayers.length > 0) {
            await ensureFontsLoaded(textLayers);
        }

        for (const layer of layers) {
            if (!layer.visible) continue;
            ctx.save();
            ctx.globalAlpha = layer.opacity ?? 1;

            if (layer.type === 'image' && layer.src) {
                const img = await loadImage(layer.src);
                ctx.drawImage(img, layer.x, layer.y, layer.w, layer.h);
            } else if (layer.type === 'text' && layer.content) {
                ctx.translate(layer.x, layer.y);
                if (layer.rotation) ctx.rotate((layer.rotation * Math.PI) / 180);
                const weight = layer.fontWeight || 800;
                const italic = layer.italic ? 'italic ' : '';
                ctx.font = `${italic}${weight} ${layer.fontSize}px "${layer.fontFamily}", sans-serif`;
                ctx.textBaseline = 'top';
                ctx.textAlign = layer.align || 'left';
                const drawX = layer.align === 'center' ? layer.w / 2 : layer.align === 'right' ? layer.w : 0;
                if (layer.strokeWidth > 0 && layer.stroke) {
                    ctx.lineJoin = 'round';
                    ctx.miterLimit = 2;
                    ctx.strokeStyle = layer.stroke;
                    ctx.lineWidth = layer.strokeWidth;
                    ctx.strokeText(layer.content, drawX, 0);
                }
                ctx.fillStyle = layer.color || '#fff';
                ctx.fillText(layer.content, drawX, 0);
            }
            ctx.restore();
        }

        return canvas.toDataURL('image/png');
    }, [layers, ensureFontsLoaded]);

    // ─── Save: flatten + persist + reseed local layers (so subsequent edits start from the flattened result) ───
    const handleSave = useCallback(async () => {
        if (isApplying) return;
        try {
            setIsApplying(true);
            setStatusMsg({ type: 'info', text: 'Fusion des calques…' });
            const dataUrl = await flatten();
            onSave(index, dataUrl);
            // Reset modal state so the next "Save" starts from this flattened result
            setLayers([makeBaseLayer(dataUrl, 'Image fusionnée')]);
            setSelectedLayerId(null);
            setStatusMsg({ type: 'success', text: 'Calques fusionnés ✓' });
        } catch (e) {
            console.error(e);
            setStatusMsg({ type: 'error', text: e.message || 'Erreur de fusion des calques' });
        } finally {
            setIsApplying(false);
        }
    }, [flatten, index, onSave, isApplying]);

    // ─── AI region apply ───
    const handleApplyRegion = useCallback(async () => {
        if (isApplying || thumb.isAiGenerating) return;
        if (!refineText.trim() || !region || region.w < 8 || region.h < 8 || !baseImageUrl) {
            setStatusMsg({ type: 'error', text: 'Trace une zone et décris ce que tu veux y mettre.' });
            return;
        }
        try {
            setIsApplying(true);
            setStatusMsg({ type: 'info', text: 'Préparation du masque…' });
            const maskUrl = await buildMaskDataUrl(region);
            setStatusMsg({ type: 'info', text: 'Régénération de la zone…' });
            const result = await onInpaint(index, {
                instruction: refineText.trim(),
                imageUrl: baseImageUrl,
                maskUrl,
            });
            if (result?.ok && result.url) {
                // Replace the base layer with the inpainted image, keep other layers (text, etc.) intact
                setLayers(prev => prev.map(l => l.isBase ? { ...l, src: result.url } : l));
                setRegion(null);
                setRefineText('');
                setStatusMsg({ type: 'success', text: 'Zone régénérée ✓' });
            } else {
                setStatusMsg({ type: 'error', text: result?.error || 'Erreur IA' });
            }
        } catch (e) {
            console.error(e);
            setStatusMsg({ type: 'error', text: e.message || 'Erreur IA' });
        } finally {
            setIsApplying(false);
        }
    }, [refineText, region, baseImageUrl, onInpaint, index, isApplying, thumb.isAiGenerating]);

    // ─── Undo: ask the parent to roll back, then sync the modal's layers to the restored image ───
    const handleUndoClick = useCallback(() => {
        if (isApplying || thumb.isAiGenerating) return;
        const result = onUndo(index);
        if (!result?.ok) return;
        const restoredSrc = result.url ?? thumb.canvasDataUrl ?? null;
        if (restoredSrc) {
            setLayers([makeBaseLayer(restoredSrc, 'Image (restaurée)')]);
        } else {
            setLayers([]);
        }
        setSelectedLayerId(null);
        setRegion(null);
        setStatusMsg({ type: 'success', text: 'Modification annulée ✓' });
    }, [onUndo, index, thumb.canvasDataUrl, thumb.isAiGenerating, isApplying]);

    // ─── Render ───
    return (
        <div className="edit-modal-root" role="dialog" aria-modal="true" aria-label="Éditeur de thumbnail">
            <div className="edit-modal-backdrop" onClick={onClose} />
            <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
                {/* ── Topbar ── */}
                <div className="edit-modal-topbar">
                    <div className="topbar-left">
                        <span className="topbar-icon"><Layers size={16} /></span>
                        <span className="topbar-title">Éditeur — {thumb.label}</span>
                    </div>

                    <div className="edit-tabs" role="tablist">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={tab === 'manual'}
                            className={`edit-tab ${tab === 'manual' ? 'active' : ''}`}
                            onClick={() => setTab('manual')}
                        >
                            <Layers size={14} strokeWidth={2.2} />
                            Calques manuels
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={tab === 'ai'}
                            className={`edit-tab ${tab === 'ai' ? 'active' : ''}`}
                            onClick={() => { setTab('ai'); setSelectedLayerId(null); }}
                        >
                            <Wand2 size={14} strokeWidth={2.2} />
                            Affiner par zone IA
                        </button>
                    </div>

                    <div className="topbar-right">
                        {(thumb.history?.length || 0) > 0 && (
                            <button
                                type="button"
                                className="topbar-btn ghost"
                                onClick={handleUndoClick}
                                disabled={isApplying || thumb.isAiGenerating}
                                title="Annuler la dernière modification"
                            >
                                <RotateCcw size={14} />
                                <span>Annuler</span>
                            </button>
                        )}
                        <button
                            type="button"
                            className="topbar-btn primary"
                            onClick={handleSave}
                            disabled={isApplying || thumb.isAiGenerating || tab !== 'manual'}
                            title="Aplatir les calques et enregistrer"
                        >
                            {isApplying ? (
                                <><span className="btn-spinner" /> Enregistrement…</>
                            ) : (
                                <><Check size={14} /> Enregistrer</>
                            )}
                        </button>
                        <button
                            type="button"
                            className="topbar-btn close"
                            onClick={onClose}
                            aria-label="Fermer"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="edit-modal-body">
                    {/* Stage */}
                    <div className="edit-stage-wrapper" ref={stageRef}>
                        <div
                            className={`edit-stage ${tab === 'ai' ? 'is-region-mode' : ''}`}
                            ref={stageInnerRef}
                            onPointerDown={(e) => {
                                if (tab === 'ai' && !thumb.isAiGenerating && !isApplying) {
                                    onRegionPointerDown(e);
                                } else if (tab === 'manual') {
                                    setSelectedLayerId(null);
                                }
                            }}
                        >
                            {/* Render layers */}
                            {layers.map((layer) => {
                                if (!layer.visible) return null;
                                const isSelected = selectedLayerId === layer.id && tab === 'manual';
                                const layerStyle = {
                                    left: `${(layer.x / CANVAS_W) * 100}%`,
                                    top: `${(layer.y / CANVAS_H) * 100}%`,
                                    width: `${(layer.w / CANVAS_W) * 100}%`,
                                    height: layer.type === 'image' ? `${(layer.h / CANVAS_H) * 100}%` : 'auto',
                                    opacity: layer.opacity,
                                    transform: `rotate(${layer.rotation || 0}deg)`,
                                    transformOrigin: 'top left',
                                };

                                if (layer.type === 'image') {
                                    return (
                                        <img
                                            key={layer.id}
                                            src={layer.src}
                                            alt=""
                                            draggable={false}
                                            className={`stage-layer stage-layer-image ${isSelected ? 'is-selected' : ''} ${layer.locked ? 'is-locked' : ''}`}
                                            style={layerStyle}
                                            onPointerDown={(e) => tab === 'manual' && onLayerPointerDown(e, layer)}
                                        />
                                    );
                                }

                                // text layer
                                const fontStack = FONT_FAMILIES.find(f => f.id === layer.fontFamily)?.stack || layer.fontFamily;
                                const fontSizePct = (layer.fontSize / CANVAS_H) * 100;
                                return (
                                    <div
                                        key={layer.id}
                                        className={`stage-layer stage-layer-text ${isSelected ? 'is-selected' : ''}`}
                                        style={{
                                            ...layerStyle,
                                            fontFamily: fontStack,
                                            fontWeight: layer.fontWeight,
                                            fontStyle: layer.italic ? 'italic' : 'normal',
                                            fontSize: `${fontSizePct}cqh`,
                                            color: layer.color,
                                            textAlign: layer.align,
                                            WebkitTextStroke: layer.strokeWidth > 0 ? `${(layer.strokeWidth / CANVAS_W) * 100}cqw ${layer.stroke}` : '0',
                                            lineHeight: 1.05,
                                        }}
                                        onPointerDown={(e) => tab === 'manual' && onLayerPointerDown(e, layer)}
                                        onDoubleClick={(e) => {
                                            e.stopPropagation();
                                            const next = window.prompt('Modifier le texte :', layer.content);
                                            if (next !== null) updateLayer(layer.id, { content: next });
                                        }}
                                    >
                                        {layer.content}
                                    </div>
                                );
                            })}

                            {/* Region overlay (AI tab) */}
                            {tab === 'ai' && region && (
                                <div
                                    className="region-rect"
                                    style={{
                                        left: `${(region.x / CANVAS_W) * 100}%`,
                                        top: `${(region.y / CANVAS_H) * 100}%`,
                                        width: `${(region.w / CANVAS_W) * 100}%`,
                                        height: `${(region.h / CANVAS_H) * 100}%`,
                                    }}
                                />
                            )}

                            {/* AI generating overlay */}
                            {(isApplying || thumb.isAiGenerating) && tab === 'ai' && (
                                <div className="stage-busy">
                                    <span className="stage-busy-spinner" />
                                    <span>{statusMsg?.text || 'Travail en cours…'}</span>
                                </div>
                            )}
                        </div>

                        {/* Stage hint */}
                        {tab === 'manual' && (
                            <div className="stage-hint">
                                <kbd>Drag</kbd> pour déplacer · <kbd>Double-clic</kbd> pour éditer le texte
                            </div>
                        )}
                        {tab === 'ai' && !region && (
                            <div className="stage-hint">
                                <kbd>Drag</kbd> pour sélectionner la zone à régénérer
                            </div>
                        )}
                    </div>

                    {/* Side panel */}
                    <aside className="edit-side">
                        {tab === 'manual' && (
                            <ManualPanel
                                layers={layers}
                                selectedLayer={selectedLayer}
                                onSelect={setSelectedLayerId}
                                onUpdate={updateLayer}
                                onDelete={deleteLayer}
                                onMove={moveLayer}
                                onAddText={addTextLayer}
                            />
                        )}
                        {tab === 'ai' && (
                            <AiPanel
                                refineText={refineText}
                                setRefineText={setRefineText}
                                region={region}
                                setRegion={setRegion}
                                onApply={handleApplyRegion}
                                isBusy={isApplying || thumb.isAiGenerating}
                            />
                        )}

                        {statusMsg && (
                            <div className={`edit-status edit-status-${statusMsg.type}`}>
                                {statusMsg.text}
                            </div>
                        )}
                    </aside>
                </div>
            </div>
        </div>
    );
}

/* ════════════════════════════════════════
   MANUAL PANEL — layers list + properties
   ════════════════════════════════════════ */

function ManualPanel({ layers, selectedLayer, onSelect, onUpdate, onDelete, onMove, onAddText }) {
    return (
        <div className="side-panel">
            <div className="side-section">
                <div className="side-section-header">
                    <span className="side-section-title"><Layers size={12} /> Calques</span>
                    <button type="button" className="side-icon-btn" onClick={onAddText} title="Ajouter un calque texte">
                        <Plus size={14} />
                    </button>
                </div>

                <div className="layer-list">
                    {[...layers].reverse().map(layer => (
                        <div
                            key={layer.id}
                            className={`layer-item ${selectedLayer?.id === layer.id ? 'selected' : ''}`}
                            onClick={() => onSelect(layer.id)}
                        >
                            <span className="layer-icon">
                                {layer.type === 'image' ? <ImageIcon size={12} /> : <TypeIcon size={12} />}
                            </span>
                            <span className="layer-name" title={layer.content || layer.name}>
                                {layer.type === 'text' ? (layer.content || 'Texte') : layer.name}
                            </span>
                            <div className="layer-actions">
                                <button
                                    type="button"
                                    className="layer-action"
                                    onClick={(e) => { e.stopPropagation(); onUpdate(layer.id, { visible: !layer.visible }); }}
                                    title={layer.visible ? 'Masquer' : 'Afficher'}
                                >
                                    {layer.visible ? <Eye size={11} /> : <EyeOff size={11} />}
                                </button>
                                <button
                                    type="button"
                                    className="layer-action"
                                    onClick={(e) => { e.stopPropagation(); onUpdate(layer.id, { locked: !layer.locked }); }}
                                    title={layer.locked ? 'Déverrouiller' : 'Verrouiller'}
                                >
                                    {layer.locked ? <Lock size={11} /> : <Unlock size={11} />}
                                </button>
                                <button
                                    type="button"
                                    className="layer-action"
                                    onClick={(e) => { e.stopPropagation(); onMove(layer.id, 'up'); }}
                                    title="Monter"
                                >
                                    <ChevronUp size={11} />
                                </button>
                                <button
                                    type="button"
                                    className="layer-action"
                                    onClick={(e) => { e.stopPropagation(); onMove(layer.id, 'down'); }}
                                    title="Descendre"
                                >
                                    <ChevronDown size={11} />
                                </button>
                                {!layer.isBase && (
                                    <button
                                        type="button"
                                        className="layer-action danger"
                                        onClick={(e) => { e.stopPropagation(); onDelete(layer.id); }}
                                        title="Supprimer"
                                    >
                                        <Trash2 size={11} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Properties */}
            {selectedLayer && (
                <div className="side-section">
                    <div className="side-section-header">
                        <span className="side-section-title">
                            {selectedLayer.type === 'text' ? <TypeIcon size={12} /> : <ImageIcon size={12} />}
                            Propriétés
                        </span>
                    </div>

                    {selectedLayer.type === 'text' && (
                        <TextProperties layer={selectedLayer} onUpdate={onUpdate} />
                    )}
                    {selectedLayer.type === 'image' && (
                        <ImageProperties layer={selectedLayer} onUpdate={onUpdate} />
                    )}
                </div>
            )}
        </div>
    );
}

function TextProperties({ layer, onUpdate }) {
    return (
        <div className="props">
            <div className="prop">
                <label>Contenu</label>
                <textarea
                    rows={2}
                    value={layer.content}
                    onChange={(e) => onUpdate(layer.id, { content: e.target.value })}
                />
            </div>

            <div className="prop">
                <label>Police</label>
                <select value={layer.fontFamily} onChange={(e) => onUpdate(layer.id, { fontFamily: e.target.value })}>
                    {FONT_FAMILIES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
            </div>

            <div className="prop-row">
                <div className="prop">
                    <label>Taille</label>
                    <input
                        type="number"
                        min={12}
                        max={400}
                        value={layer.fontSize}
                        onChange={(e) => onUpdate(layer.id, { fontSize: Number(e.target.value) || 12 })}
                    />
                </div>
                <div className="prop">
                    <label>Poids</label>
                    <select value={layer.fontWeight} onChange={(e) => onUpdate(layer.id, { fontWeight: Number(e.target.value) })}>
                        {[300, 400, 500, 600, 700, 800, 900].map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                </div>
            </div>

            <div className="prop-toggle-row">
                <button
                    type="button"
                    className={`toggle-btn ${layer.italic ? 'active' : ''}`}
                    onClick={() => onUpdate(layer.id, { italic: !layer.italic })}
                    title="Italique"
                >
                    <Italic size={12} />
                </button>
                <div className="align-group">
                    {['left', 'center', 'right'].map(a => {
                        const Icon = a === 'left' ? AlignLeft : a === 'center' ? AlignCenter : AlignRight;
                        return (
                            <button
                                key={a}
                                type="button"
                                className={`toggle-btn ${layer.align === a ? 'active' : ''}`}
                                onClick={() => onUpdate(layer.id, { align: a })}
                                title={`Align ${a}`}
                            >
                                <Icon size={12} />
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="prop-row">
                <div className="prop">
                    <label>Couleur</label>
                    <div className="color-input">
                        <input type="color" value={layer.color} onChange={(e) => onUpdate(layer.id, { color: e.target.value })} />
                        <input type="text" value={layer.color} onChange={(e) => onUpdate(layer.id, { color: e.target.value })} />
                    </div>
                </div>
                <div className="prop">
                    <label>Contour</label>
                    <div className="color-input">
                        <input type="color" value={layer.stroke} onChange={(e) => onUpdate(layer.id, { stroke: e.target.value })} />
                        <input type="number" min={0} max={20} value={layer.strokeWidth} onChange={(e) => onUpdate(layer.id, { strokeWidth: Number(e.target.value) || 0 })} />
                    </div>
                </div>
            </div>

            <div className="prop-row">
                <div className="prop">
                    <label>Rotation</label>
                    <input
                        type="range"
                        min={-45}
                        max={45}
                        step={1}
                        value={layer.rotation || 0}
                        onChange={(e) => onUpdate(layer.id, { rotation: Number(e.target.value) })}
                    />
                    <div className="prop-meta">{layer.rotation || 0}°</div>
                </div>
                <div className="prop">
                    <label>Opacité</label>
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={layer.opacity}
                        onChange={(e) => onUpdate(layer.id, { opacity: Number(e.target.value) })}
                    />
                    <div className="prop-meta">{Math.round(layer.opacity * 100)}%</div>
                </div>
            </div>
        </div>
    );
}

function ImageProperties({ layer, onUpdate }) {
    return (
        <div className="props">
            <div className="prop">
                <label>Opacité</label>
                <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={layer.opacity}
                    onChange={(e) => onUpdate(layer.id, { opacity: Number(e.target.value) })}
                />
                <div className="prop-meta">{Math.round(layer.opacity * 100)}%</div>
            </div>
            <div className="prop-note">
                <Sparkles size={11} />
                Les images IA sont des rasters plats — pour modifier ce qu'il y a *dedans*, utilise l'onglet <strong>Affiner par zone IA</strong>.
            </div>
        </div>
    );
}

/* ════════════════════════════════════════
   AI PANEL — region select + prompt
   ════════════════════════════════════════ */

function AiPanel({ refineText, setRefineText, region, setRegion, onApply, isBusy }) {
    const hasRegion = region && region.w > 8 && region.h > 8;

    return (
        <div className="side-panel">
            <div className="side-section">
                <div className="side-section-header">
                    <span className="side-section-title"><RectangleHorizontal size={12} /> Zone sélectionnée</span>
                    {hasRegion && (
                        <button type="button" className="side-icon-btn" onClick={() => setRegion(null)} title="Effacer la zone">
                            <Trash2 size={12} />
                        </button>
                    )}
                </div>
                {hasRegion ? (
                    <div className="region-info">
                        <span className="region-info-pill">x: {Math.round(region.x)}px</span>
                        <span className="region-info-pill">y: {Math.round(region.y)}px</span>
                        <span className="region-info-pill">{Math.round(region.w)} × {Math.round(region.h)}</span>
                    </div>
                ) : (
                    <div className="region-empty">
                        <RectangleHorizontal size={20} />
                        <span>Trace un rectangle sur l'image pour sélectionner la zone à modifier</span>
                    </div>
                )}
            </div>

            <div className="side-section">
                <div className="side-section-header">
                    <span className="side-section-title"><Wand2 size={12} /> Que veux-tu y mettre ?</span>
                </div>
                <textarea
                    className="ai-region-textarea"
                    placeholder="Ex: Remplace par un texte 'EXCLUSIF' en jaune néon · ou : un casque audio futuriste · ou : un fond de galaxie violette…"
                    rows={4}
                    maxLength={400}
                    value={refineText}
                    onChange={(e) => setRefineText(e.target.value)}
                    disabled={isBusy}
                />

                <button
                    type="button"
                    className="ai-apply-btn"
                    onClick={onApply}
                    disabled={!hasRegion || !refineText.trim() || isBusy}
                >
                    {isBusy ? (
                        <><span className="btn-spinner" /> Régénération…</>
                    ) : (
                        <><Send size={14} /> Régénérer cette zone</>
                    )}
                </button>
            </div>
        </div>
    );
}

/* ════════════════════════════════════════
   Helpers
   ════════════════════════════════════════ */

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        // Only request CORS for remote URLs — data: and blob: URLs are same-origin and don't need it
        if (src && !src.startsWith('data:') && !src.startsWith('blob:')) {
            img.crossOrigin = 'anonymous';
        }
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Impossible de charger l\'image source.'));
        img.src = src;
    });
}

/**
 * Build a mask PNG (1280×720) where the selected region is FULLY TRANSPARENT
 * and the rest is opaque white — OpenAI's image-edit convention.
 */
function buildMaskDataUrl(region) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;
        const ctx = canvas.getContext('2d');
        // Fill opaque white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        // Clear the region (becomes transparent)
        ctx.clearRect(region.x, region.y, region.w, region.h);
        resolve(canvas.toDataURL('image/png'));
    });
}
