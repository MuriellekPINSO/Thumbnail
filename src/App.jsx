import { useState, useCallback, useRef } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ResultsPanel from './components/ResultsPanel';
import { generateThumbnailImage, buildThumbnailPrompt } from './utils/api';
import './App.css';

const VARIANTS = [
  { layout: 'left-image', label: 'Version A' },
  { layout: 'centered',   label: 'Version B' },
  { layout: 'split',      label: 'Version C' },
];

export default function App() {
  const [mainTitle,      setMainTitle]      = useState('');
  const [subtitle,       setSubtitle]       = useState('');
  const [tagText,        setTagText]        = useState('');
  const [customPrompt,   setCustomPrompt]   = useState('');
  const [selectedStyle,  setSelectedStyle]  = useState('bold');
  const [selectedColor,  setSelectedColor]  = useState('#e8ff3c');
  const [selectedCount,  setSelectedCount]  = useState(2);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [referenceThumb, setReferenceThumb] = useState(null);
  const [thumbnails,     setThumbnails]     = useState([]);
  const [isGenerating,   setIsGenerating]   = useState(false);
  const [previewIndex,   setPreviewIndex]   = useState(0);
  const generationIdRef = useRef(0);

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

    const newThumbnails = [];
    for (let i = 0; i < selectedCount; i++) {
      const variant = VARIANTS[i % VARIANTS.length];
      newThumbnails.push({
        title,
        subtitle: subtitle.trim(),
        tag: tagText.trim(),
        variant: variant.layout,
        label: variant.label,
        generationId: currentGenId,
        aiImageUrl: null,
        isAiGenerating: true,
        aiError: null,
        canvasDataUrl: null,
      });
    }
    setThumbnails([...newThumbnails]);

    const hasImages    = uploadedImages.length > 0;
    const hasReference = !!referenceThumb;

    const promises = newThumbnails.map(async (thumb, i) => {
      try {
        const layoutInstruction = thumb.variant === 'left-image'
          ? 'LAYOUT INSTRUCTION: Person/subject occupies the LEFT third of the frame (rule of thirds). Text block is on the RIGHT side. Person faces RIGHT toward the text. The center third has minimal content — keep it clear for visual breathing room.'
          : thumb.variant === 'split'
          ? 'LAYOUT INSTRUCTION: Text block occupies the LEFT side of the frame. Person/subject is on the RIGHT third (rule of thirds). Person faces LEFT toward the text. Strong contrast between left text zone and right subject zone.'
          : 'LAYOUT INSTRUCTION: CENTERED composition. Subject/face is centered or slightly left of center. Title text is stacked above or below the face, or to the side. Strong vignette or gradient frames the composition from the edges.';

        let prompt = buildThumbnailPrompt({
          title: thumb.title,
          subtitle: thumb.subtitle,
          tag: thumb.tag,
          style: selectedStyle,
          color: selectedColor,
          hasImages,
          hasReference,
        });

        if (customPrompt.trim()) {
          prompt += `\n\nADDITIONAL CREATIVE DIRECTION FROM USER:\n${customPrompt.trim()}`;
        }
        prompt += `\n\n${layoutInstruction}`;

        // Priority: person photo → reference thumb → none
        // When a person photo is uploaded, send it to the AI via /images/edits
        // so the AI actually uses the real face instead of generating a fictional person.
        const personPhoto   = hasImages ? uploadedImages[i % uploadedImages.length]?.src : null;
        const editReference = personPhoto || referenceThumb?.src || null;

        const imageUrl = await generateThumbnailImage(prompt, editReference);

        setThumbnails(prev => prev.map((t, idx) =>
          idx === i && t.generationId === currentGenId
            ? { ...t, aiImageUrl: imageUrl, isAiGenerating: false, photoUsedInGeneration: hasImages }
            : t
        ));
      } catch (error) {
        console.error(`AI generation failed for ${thumb.label}:`, error);
        setThumbnails(prev => prev.map((t, idx) =>
          idx === i && t.generationId === currentGenId
            ? { ...t, isAiGenerating: false, aiError: error.message || 'Erreur IA' }
            : t
        ));
      }
    });

    await Promise.allSettled(promises);
    setIsGenerating(false);
  }, [mainTitle, subtitle, tagText, customPrompt, selectedCount, selectedStyle, selectedColor, uploadedImages, referenceThumb]);

  // Direct composition — instant result from person photo (no AI)
  const handleComposeDirectly = useCallback(() => {
    if (!uploadedImages.length) return;

    const bgCanvas = document.createElement('canvas');
    bgCanvas.width  = 1280;
    bgCanvas.height = 720;
    const ctx = bgCanvas.getContext('2d');

    const bg = ctx.createLinearGradient(0, 0, 1280, 720);
    bg.addColorStop(0, '#0e0e18');
    bg.addColorStop(1, '#050508');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1280, 720);

    const glow = ctx.createRadialGradient(300, 400, 0, 300, 400, 520);
    glow.addColorStop(0, `${selectedColor}22`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 1280, 720);

    ctx.strokeStyle = 'rgba(255,255,255,0.025)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1280; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 720); ctx.stroke(); }
    for (let y = 0; y < 720; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1280, y); ctx.stroke(); }

    ctx.fillStyle = selectedColor;
    ctx.fillRect(1276, 0, 4, 720);

    const bgDataUrl = bgCanvas.toDataURL('image/jpeg', 0.95);
    const genId = ++generationIdRef.current;

    const newThumbnails = [];
    for (let i = 0; i < selectedCount; i++) {
      const variant = VARIANTS[i % VARIANTS.length];
      newThumbnails.push({
        title: mainTitle.trim() || 'Mon titre',
        subtitle: subtitle.trim(),
        tag: tagText.trim(),
        variant: variant.layout,
        label: variant.label,
        generationId: genId,
        aiImageUrl: bgDataUrl,
        isAiGenerating: false,
        aiError: null,
        canvasDataUrl: null,
      });
    }
    setThumbnails([...newThumbnails]);
    setPreviewIndex(0);
  }, [uploadedImages, mainTitle, subtitle, tagText, selectedCount, selectedStyle, selectedColor]);

  return (
    <>
      <Header />
      <div className="main">
        <Sidebar
          mainTitle={mainTitle}       setMainTitle={setMainTitle}
          subtitle={subtitle}         setSubtitle={setSubtitle}
          tagText={tagText}           setTagText={setTagText}
          customPrompt={customPrompt} setCustomPrompt={setCustomPrompt}
          selectedStyle={selectedStyle}   setSelectedStyle={setSelectedStyle}
          selectedColor={selectedColor}   setSelectedColor={setSelectedColor}
          selectedCount={selectedCount}   setSelectedCount={setSelectedCount}
          uploadedImages={uploadedImages} setUploadedImages={setUploadedImages}
          referenceThumb={referenceThumb} setReferenceThumb={setReferenceThumb}
          onGenerate={handleGenerate}
          onComposeDirectly={handleComposeDirectly}
          isGenerating={isGenerating}
        />
        <ResultsPanel
          thumbnails={thumbnails}
          style={selectedStyle}
          color={selectedColor}
          uploadedImages={uploadedImages}
          screenshotImage={null}
          mainTitle={mainTitle}
          previewIndex={previewIndex}
          setPreviewIndex={setPreviewIndex}
          onCanvasReady={handleCanvasReady}
        />
      </div>
    </>
  );
}
