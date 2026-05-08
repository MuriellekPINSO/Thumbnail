import { useState, useCallback, useRef } from 'react';
import Header from './components/Header';
import Sidebar, { LiveMiniPreview } from './components/Sidebar';
import ResultsPanel from './components/ResultsPanel';
import ThumbnailEditModal from './components/ThumbnailEditModal';
import HistoryModal from './components/HistoryModal';
import MagicBackground from './components/MagicBackground';
import { useHistory } from './hooks/useHistory';
import { generateThumbnailImage, buildThumbnailPrompt, buildRefinePrompt, inpaintImage } from './utils/api';
import './App.css';

const VARIANTS = [
  { layout: 'left-image', label: 'Version A' },
  { layout: 'centered', label: 'Version B' },
  { layout: 'split', label: 'Version C' },
];

export default function App() {
  const [mainTitle, setMainTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [tagText, setTagText] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('bold');
  const [selectedColors, setSelectedColors] = useState(['#a855f7', '#22d3ee']);
  const [selectedCount, setSelectedCount] = useState(2);
  const [selectedFormat, setSelectedFormat] = useState('youtube');
  const [uploadedImages, setUploadedImages] = useState([]);
  const [thumbnails, setThumbnails] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [editingIndex, setEditingIndex] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const generationIdRef = useRef(0);

  // ─── History (per-day archive in localStorage) ───
  const { items: historyItems, addItem: addHistoryItem, removeItem: removeHistoryItem, clearAll: clearHistoryAll } = useHistory();

  const handleCanvasReady = useCallback((index, dataUrl) => {
    setThumbnails(prev => prev.map((t, i) =>
      i === index ? { ...t, canvasDataUrl: dataUrl } : t
    ));
  }, []);

  const handleGenerate = useCallback(async () => {
    const title = mainTitle.trim();
    if (!title) {
      document.getElementById('mainTitle')?.focus();
      return;
    }

    setIsGenerating(true);
    setPreviewIndex(0);
    generationIdRef.current += 1;
    const currentGenId = generationIdRef.current;

    // Create initial thumbnails with canvas fallback + AI loading state
    // Each thumb snapshots the current style/color so per-thumb edits stay local.
    const newThumbnails = [];
    for (let i = 0; i < selectedCount; i++) {
      const variant = VARIANTS[i % VARIANTS.length];
      newThumbnails.push({
        title: title,
        subtitle: subtitle.trim(),
        tag: tagText.trim(),
        style: selectedStyle,
        colors: selectedColors,
        variant: variant.layout,
        label: variant.label,
        generationId: currentGenId,
        aiImageUrl: null,
        isAiGenerating: true,
        aiError: null,
        canvasDataUrl: null,
        history: [],
      });
    }
    setThumbnails([...newThumbnails]);

    // Launch AI generation for each thumbnail in parallel
    const promises = newThumbnails.map(async (thumb, i) => {
      try {
        // Extract data URLs from uploaded images to send to AI
        const imageDataUrls = uploadedImages.map(img => img.src);
        const hasImages = imageDataUrls.length > 0;

        // Build the layout instruction — adapted to the chosen output format.
        // Landscape/square use horizontal compositions; portrait stacks vertically.
        const isPortrait = selectedFormat === 'story';
        const layoutInstruction = (() => {
          if (isPortrait) {
            if (thumb.variant === 'left-image') return 'LAYOUT: Person/image fills the LOWER TWO-THIRDS, large stacked title text occupies the UPPER THIRD. Vertical composition.';
            if (thumb.variant === 'split') return 'LAYOUT: Large stacked title text occupies the LOWER THIRD, person/image fills the UPPER TWO-THIRDS. Vertical composition.';
            return 'LAYOUT: CENTERED vertical stack — title text overlay on the middle of the frame, person/image filling the full vertical canvas behind. Vertical composition.';
          }
          // landscape (youtube) and square share horizontal compositions
          if (thumb.variant === 'left-image') return 'LAYOUT: Person/image on the LEFT side, text on the RIGHT side.';
          if (thumb.variant === 'split') return 'LAYOUT: Text on the LEFT side, person/image on the RIGHT side.';
          return 'LAYOUT: CENTERED text with person visible in the background or beside the text.';
        })();

        // Use custom prompt if provided, otherwise build automatically
        // Both paths benefit from the built-in thumbnail best practices
        let prompt;
        if (customPrompt.trim()) {
          // Custom prompt: wrap with system rules + user's specific instructions
          prompt = buildThumbnailPrompt({
            title: thumb.title,
            subtitle: thumb.subtitle,
            tag: thumb.tag,
            style: selectedStyle,
            colors: selectedColors,
            hasImages,
            format: selectedFormat,
          });
          // Append user's custom instructions as additional creative direction
          prompt += `\n\nADDITIONAL CREATIVE DIRECTION FROM USER:\n${customPrompt.trim()}`;
          prompt += `\n\n${layoutInstruction}`;
        } else {
          prompt = buildThumbnailPrompt({
            title: thumb.title,
            subtitle: thumb.subtitle,
            tag: thumb.tag,
            style: selectedStyle,
            colors: selectedColors,
            hasImages,
            format: selectedFormat,
          });
          prompt += `\n\n${layoutInstruction}`;
        }

        const imageUrl = await generateThumbnailImage(prompt, hasImages ? imageDataUrls : [], selectedFormat);

        // Update this specific thumbnail with the AI result
        setThumbnails(prev => prev.map((t, idx) =>
          idx === i && t.generationId === currentGenId
            ? { ...t, aiImageUrl: imageUrl, isAiGenerating: false }
            : t
        ));

        // ─── Archive in history ───
        addHistoryItem({
          dataUrl: imageUrl,
          title: thumb.title,
          label: thumb.label,
          style: selectedStyle,
          colors: selectedColors,
          variant: thumb.variant,
          format: selectedFormat,
        });
      } catch (error) {
        console.error(`AI generation failed for ${thumb.label}:`, error);
        // Fall back to canvas rendering — remove loading state
        setThumbnails(prev => prev.map((t, idx) =>
          idx === i && t.generationId === currentGenId
            ? { ...t, isAiGenerating: false, aiError: error.message || 'Erreur IA' }
            : t
        ));
      }
    });

    // Wait for all to finish before re-enabling button
    await Promise.allSettled(promises);
    setIsGenerating(false);
  }, [mainTitle, subtitle, tagText, customPrompt, selectedCount, selectedStyle, selectedColors, selectedFormat, uploadedImages, addHistoryItem]);

  // ─── Open the edit modal for a specific thumb ───
  const handleOpenEditor = useCallback((index) => {
    setEditingIndex(index);
  }, []);

  const handleCloseEditor = useCallback(() => {
    setEditingIndex(null);
  }, []);

  // ─── Save flattened image from the manual layer editor ───
  const handleSaveEdited = useCallback((index, dataUrl) => {
    setThumbnails(prev => prev.map((t, i) =>
      i === index
        ? {
            ...t,
            aiImageUrl: dataUrl,
            history: [...(t.history || []), { aiImageUrl: t.aiImageUrl }],
            aiError: null,
            isAiGenerating: false,
          }
        : t
    ));
  }, []);

  // ─── AI region inpaint ───
  const handleInpaintRegion = useCallback(async (index, { instruction, imageUrl, maskUrl }) => {
    if (!instruction?.trim() || !imageUrl || !maskUrl) return { ok: false, error: 'Paramètres manquants' };

    // Capture the previous AI URL synchronously so we can push it to history only on success
    let prevAiUrl = null;
    setThumbnails(prev => prev.map((t, i) => {
      if (i !== index) return t;
      prevAiUrl = t.aiImageUrl ?? null;
      return { ...t, isAiGenerating: true, aiError: null };
    }));

    try {
      const prompt = buildRefinePrompt({ instruction: instruction.trim(), format: selectedFormat });
      const newUrl = await inpaintImage(prompt, imageUrl, maskUrl, selectedFormat);
      setThumbnails(prev => prev.map((t, i) =>
        i === index
          ? {
              ...t,
              aiImageUrl: newUrl,
              history: [...(t.history || []), { aiImageUrl: prevAiUrl }],
              isAiGenerating: false,
              aiError: null,
            }
          : t
      ));
      return { ok: true, url: newUrl };
    } catch (error) {
      console.error('Inpaint failed:', error);
      setThumbnails(prev => prev.map((t, i) =>
        i === index
          ? { ...t, isAiGenerating: false, aiError: error.message || 'Erreur IA' }
          : t
      ));
      return { ok: false, error: error.message || 'Erreur IA' };
    }
  }, [selectedFormat]);

  // ─── Undo last refinement ───
  // Returns the URL that the thumb is restored to (so callers can sync their UI)
  const handleUndoRefine = useCallback((index) => {
    let restoredUrl = null;
    let didChange = false;
    setThumbnails(prev => prev.map((t, i) => {
      if (i !== index) return t;
      const history = t.history || [];
      if (history.length === 0) return t;
      const last = history[history.length - 1];
      restoredUrl = last.aiImageUrl ?? null;
      didChange = true;
      return {
        ...t,
        aiImageUrl: restoredUrl,
        history: history.slice(0, -1),
        aiError: null,
      };
    }));
    return { ok: didChange, url: restoredUrl };
  }, []);

  return (
    <>
      <MagicBackground />
      <Header
        historyCount={historyItems.length}
        onHistoryClick={() => setHistoryOpen(true)}
      />
      <main className="studio">
        <section className="hero">
          <div className="hero-eyebrow">
            <span className="hero-dot" />
            Powered by NanoBanana · Vercel AI Gateway
          </div>
          <h1 className="hero-title">
            Crée des thumbnails<br />
            <span className="hero-title-accent">qui font cliquer.</span>
          </h1>
          <p className="hero-subtitle">
            Décris ta vidéo, choisis un style, et l'IA te livre plusieurs versions prêtes à publier — typo travaillée, contraste calibré, composition pro.
          </p>
        </section>

        <section className="studio-form" id="form">
          <Sidebar
            mainTitle={mainTitle}
            setMainTitle={setMainTitle}
            subtitle={subtitle}
            setSubtitle={setSubtitle}
            tagText={tagText}
            setTagText={setTagText}
            customPrompt={customPrompt}
            setCustomPrompt={setCustomPrompt}
            selectedStyle={selectedStyle}
            setSelectedStyle={setSelectedStyle}
            selectedColors={selectedColors}
            setSelectedColors={setSelectedColors}
            selectedCount={selectedCount}
            setSelectedCount={setSelectedCount}
            selectedFormat={selectedFormat}
            setSelectedFormat={setSelectedFormat}
            uploadedImages={uploadedImages}
            setUploadedImages={setUploadedImages}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
          <aside className="studio-form-side">
            <LiveMiniPreview
              title={mainTitle}
              subtitle={subtitle}
              tag={tagText}
              style={selectedStyle}
              colors={selectedColors}
              format={selectedFormat}
            />
          </aside>
        </section>

        <section className="studio-results">
          <ResultsPanel
            thumbnails={thumbnails}
            style={selectedStyle}
            colors={selectedColors}
            uploadedImages={uploadedImages}
            mainTitle={mainTitle}
            format={selectedFormat}
            previewIndex={previewIndex}
            setPreviewIndex={setPreviewIndex}
            onCanvasReady={handleCanvasReady}
            onEditClick={handleOpenEditor}
          />
        </section>
      </main>

      {editingIndex !== null && thumbnails[editingIndex] && (
        <ThumbnailEditModal
          thumb={thumbnails[editingIndex]}
          index={editingIndex}
          onClose={handleCloseEditor}
          onSave={handleSaveEdited}
          onInpaint={handleInpaintRegion}
          onUndo={handleUndoRefine}
        />
      )}

      {historyOpen && (
        <HistoryModal
          items={historyItems}
          onClose={() => setHistoryOpen(false)}
          onRemove={removeHistoryItem}
          onClearAll={clearHistoryAll}
        />
      )}
    </>
  );
}
