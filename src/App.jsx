import { useState, useCallback, useRef } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ResultsPanel from './components/ResultsPanel';
import { generateThumbnailImage, buildThumbnailPrompt } from './utils/api';
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
  const [selectedColor, setSelectedColor] = useState('#e8ff3c');
  const [selectedCount, setSelectedCount] = useState(2);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [thumbnails, setThumbnails] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
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

    // Create initial thumbnails with canvas fallback + AI loading state
    const newThumbnails = [];
    for (let i = 0; i < selectedCount; i++) {
      const variant = VARIANTS[i % VARIANTS.length];
      newThumbnails.push({
        title: title,
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

    // Launch AI generation for each thumbnail in parallel
    const promises = newThumbnails.map(async (thumb, i) => {
      try {
        // Extract data URLs from uploaded images to send to AI
        const imageDataUrls = uploadedImages.map(img => img.src);
        const hasImages = imageDataUrls.length > 0;

        // Use custom prompt if provided, otherwise build automatically
        let prompt;
        if (customPrompt.trim()) {
          prompt = customPrompt.trim();
          if (hasImages) {
            prompt += ' IMPORTANT: Use the exact person/subject from the attached photo(s) and integrate them naturally into the thumbnail. Keep their face and appearance exactly as shown.';
          }
          prompt += ` Layout variation ${i + 1}: ${thumb.variant === 'left-image' ? 'person/image on the left, text on the right' : thumb.variant === 'split' ? 'text on the left, person/image on the right' : 'centered text with person visible in the composition'}.`;
        } else {
          prompt = buildThumbnailPrompt({
            title: thumb.title,
            subtitle: thumb.subtitle,
            tag: thumb.tag,
            style: selectedStyle,
            color: selectedColor,
            hasImages,
          }) + ` Layout variation ${i + 1}: ${thumb.variant === 'left-image' ? 'person/image on the left, text on the right' : thumb.variant === 'split' ? 'text on the left, person/image on the right' : 'centered text with person visible in the composition'}.`;
        }

        const imageUrl = await generateThumbnailImage(prompt, hasImages ? imageDataUrls : []);

        // Update this specific thumbnail with the AI result
        setThumbnails(prev => prev.map((t, idx) =>
          idx === i && t.generationId === currentGenId
            ? { ...t, aiImageUrl: imageUrl, isAiGenerating: false }
            : t
        ));
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
  }, [mainTitle, subtitle, tagText, customPrompt, selectedCount, selectedStyle, selectedColor, uploadedImages]);

  return (
    <>
      <Header />
      <div className="main">
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
          selectedColor={selectedColor}
          setSelectedColor={setSelectedColor}
          selectedCount={selectedCount}
          setSelectedCount={setSelectedCount}
          uploadedImages={uploadedImages}
          setUploadedImages={setUploadedImages}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />
        <ResultsPanel
          thumbnails={thumbnails}
          style={selectedStyle}
          color={selectedColor}
          uploadedImages={uploadedImages}
          mainTitle={mainTitle}
          previewIndex={previewIndex}
          setPreviewIndex={setPreviewIndex}
          onCanvasReady={handleCanvasReady}
        />
      </div>
    </>
  );
}
