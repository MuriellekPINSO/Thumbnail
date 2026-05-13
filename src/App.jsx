import { useState, useCallback, useRef, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ResultsPanel from './components/ResultsPanel';
import { generateThumbnailImage, buildThumbnailPrompt } from './utils/api';
import { detectCompaniesWithLogos, stripBrandsFromTitle } from './utils/logoFetch';
import { removePhotoBackground } from './utils/removeBackground';
import { composeThumbnail } from './utils/drawThumbnail';
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

    // Auto-detected companies (from the title)
    const [detectedCompanies, setDetectedCompanies] = useState([]);
    const [disabledDomains,   setDisabledDomains]   = useState(new Set());
    const [isDetectingLogos,  setIsDetectingLogos]  = useState(false);

    const [thumbnails,    setThumbnails]    = useState([]);
    const [isGenerating,  setIsGenerating]  = useState(false);
    const [previewIndex,  setPreviewIndex]  = useState(0);

    const generationIdRef = useRef(0);
    const detectionIdRef  = useRef(0);

    // ─── Auto-detect companies from title (debounced) ─────────────────────────
    useEffect(() => {
        const title = mainTitle.trim();
        if (title.length < 4) {
            setDetectedCompanies([]);
            return;
        }

        const myId = ++detectionIdRef.current;
        const timer = setTimeout(async () => {
            setIsDetectingLogos(true);
            try {
                const companies = await detectCompaniesWithLogos(title);
                if (detectionIdRef.current !== myId) return;
                setDetectedCompanies(companies);
            } catch (e) {
                console.warn('Logo detection failed:', e);
            } finally {
                if (detectionIdRef.current === myId) setIsDetectingLogos(false);
            }
        }, 800);

        return () => clearTimeout(timer);
    }, [mainTitle]);

    const toggleCompanyDisabled = useCallback((domain) => {
        setDisabledDomains(prev => {
            const next = new Set(prev);
            if (next.has(domain)) next.delete(domain);
            else next.add(domain);
            return next;
        });
    }, []);

    // ─── Generate ─────────────────────────────────────────────────────────────
    const handleGenerate = useCallback(async () => {
        const title = mainTitle.trim();
        if (!title) {
            document.getElementById('mainTitle')?.focus();
            return;
        }

        setIsGenerating(true);
        setPreviewIndex(0);
        const currentGenId = ++generationIdRef.current;

        const activeLogos = detectedCompanies.filter(c => !disabledDomains.has(c.domain));
        const hasPerson   = uploadedImages.length > 0;
        const hasLogos    = activeLogos.length > 0;
        const hasReference = !!referenceThumb;

        // When logos are rendered, strip the brand names from the title so we
        // don't duplicate "Anthropic × Twitter" as both logos AND text.
        const renderedTitle = hasLogos ? stripBrandsFromTitle(title, activeLogos) : title;

        // Seed thumbnail placeholders
        const initial = [];
        for (let i = 0; i < selectedCount; i++) {
            const v = VARIANTS[i % VARIANTS.length];
            initial.push({
                title,
                subtitle: subtitle.trim(),
                tag: tagText.trim(),
                variant: v.layout,
                label: v.label,
                generationId: currentGenId,
                composedDataUrl: null,
                isGenerating: true,
                stage: 'preparing',  // preparing | detouring | generating-bg | compositing | done | error
                error: null,
                hasPerson,
                hasLogos,
            });
        }
        setThumbnails([...initial]);

        // Helper: update one thumbnail
        const patch = (i, partial) => {
            setThumbnails(prev => prev.map((t, idx) =>
                idx === i && t.generationId === currentGenId ? { ...t, ...partial } : t
            ));
        };

        // 1) Detour the person photo (run once, shared across variants)
        let personImg = null;
        if (hasPerson) {
            initial.forEach((_, i) => patch(i, { stage: 'detouring' }));
            try {
                personImg = await removePhotoBackground(uploadedImages[0].src);
            } catch (err) {
                console.warn('Background removal failed, using raw photo:', err);
                personImg = uploadedImages[0].img;
            }
        }

        // 2) Build the prompt (background-only)
        let bgPrompt = buildThumbnailPrompt({
            style: selectedStyle,
            color: selectedColor,
            hasPerson,
            hasLogos,
            hasReference,
        });
        if (customPrompt.trim()) {
            bgPrompt += `\n\nADDITIONAL USER DIRECTION:\n${customPrompt.trim()}`;
        }

        // 3) Generate each variant in parallel
        const referenceSrc = referenceThumb?.src || null;

        const promises = initial.map(async (thumb, i) => {
            try {
                patch(i, { stage: 'generating-bg' });

                const variantPrompt = bgPrompt + `\n\nVARIANT NOTE: This is variant ${VARIANTS[i % VARIANTS.length].label}. Slightly vary the composition emphasis compared to other variants — e.g., shift the light angle or color balance — while keeping the same style.`;

                const aiBgUrl = await generateThumbnailImage(variantPrompt, referenceSrc);

                patch(i, { stage: 'compositing' });

                const composedDataUrl = await composeThumbnail({
                    aiBgUrl,
                    personImg,
                    logos: hasLogos ? activeLogos.map(c => ({ img: c.logo.img, name: c.name })) : null,
                    title: renderedTitle,
                    subtitle: thumb.subtitle,
                    tag: thumb.tag,
                    style: selectedStyle,
                    color: selectedColor,
                    variant: thumb.variant,
                });

                patch(i, { composedDataUrl, isGenerating: false, stage: 'done', error: null });
            } catch (error) {
                console.error(`Generation failed for ${thumb.label}:`, error);

                // Fallback: compose without AI bg
                try {
                    const composedDataUrl = await composeThumbnail({
                        aiBgUrl: null,
                        personImg,
                        logos: hasLogos ? activeLogos.map(c => ({ img: c.logo.img, name: c.name })) : null,
                        title: renderedTitle,
                        subtitle: thumb.subtitle,
                        tag: thumb.tag,
                        style: selectedStyle,
                        color: selectedColor,
                        variant: thumb.variant,
                    });
                    patch(i, { composedDataUrl, isGenerating: false, stage: 'done', error: 'Fond IA indisponible — rendu de secours' });
                } catch {
                    patch(i, { isGenerating: false, stage: 'error', error: error.message || 'Erreur de génération' });
                }
            }
        });

        await Promise.allSettled(promises);
        setIsGenerating(false);
    }, [mainTitle, subtitle, tagText, customPrompt, selectedCount, selectedStyle, selectedColor, uploadedImages, referenceThumb, detectedCompanies, disabledDomains]);

    // Compose without AI — instant local-only result
    const handleComposeDirectly = useCallback(async () => {
        const title = mainTitle.trim() || 'Mon titre';
        const genId = ++generationIdRef.current;

        // Detour person if available
        let personImg = null;
        if (uploadedImages.length > 0) {
            try {
                personImg = await removePhotoBackground(uploadedImages[0].src);
            } catch {
                personImg = uploadedImages[0].img;
            }
        }

        const activeLogos = detectedCompanies.filter(c => !disabledDomains.has(c.domain));
        const logos = activeLogos.length ? activeLogos.map(c => ({ img: c.logo.img, name: c.name })) : null;
        const renderedTitle = logos ? stripBrandsFromTitle(title, activeLogos) : title;

        const results = [];
        for (let i = 0; i < selectedCount; i++) {
            const v = VARIANTS[i % VARIANTS.length];
            const composedDataUrl = await composeThumbnail({
                aiBgUrl: null,
                personImg,
                logos,
                title: renderedTitle,
                subtitle: subtitle.trim(),
                tag: tagText.trim(),
                style: selectedStyle,
                color: selectedColor,
                variant: v.layout,
            });
            results.push({
                title,
                subtitle: subtitle.trim(),
                tag: tagText.trim(),
                variant: v.layout,
                label: v.label,
                generationId: genId,
                composedDataUrl,
                isGenerating: false,
                stage: 'done',
                error: null,
                hasPerson: !!personImg,
                hasLogos: !!logos,
            });
        }
        setThumbnails(results);
        setPreviewIndex(0);
    }, [uploadedImages, mainTitle, subtitle, tagText, selectedCount, selectedStyle, selectedColor, detectedCompanies, disabledDomains]);

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
                    detectedCompanies={detectedCompanies}
                    disabledDomains={disabledDomains}
                    onToggleCompany={toggleCompanyDisabled}
                    isDetectingLogos={isDetectingLogos}
                    onGenerate={handleGenerate}
                    onComposeDirectly={handleComposeDirectly}
                    isGenerating={isGenerating}
                />
                <ResultsPanel
                    thumbnails={thumbnails}
                    mainTitle={mainTitle}
                    previewIndex={previewIndex}
                    setPreviewIndex={setPreviewIndex}
                />
            </div>
        </>
    );
}
