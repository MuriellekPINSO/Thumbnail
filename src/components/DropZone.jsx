import { useRef, useCallback } from 'react';
import { Upload, ImagePlus } from 'lucide-react';
import './DropZone.css';

export default function DropZone({ onFilesAdded, maxFiles = 6 }) {
    const inputRef = useRef(null);

    const handleFiles = useCallback((files) => {
        const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (validFiles.length === 0) return;

        validFiles.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    onFilesAdded({ src: e.target.result, img, name: file.name });
                };
            };
            reader.readAsDataURL(file);
        });
    }, [onFilesAdded]);

    const handleDrop = (e) => {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    };

    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('dragover');
    };

    return (
        <div
            className="drop-zone"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
        >
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFiles(e.target.files)}
            />
            <div className="drop-icon">
                <ImagePlus size={22} color="var(--accent)" />
            </div>
            <div className="drop-text">
                <strong><Upload size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />Glisser des images</strong> ou cliquer<br />
                JPG, PNG, WEBP — jusqu'à {maxFiles} images
            </div>
        </div>
    );
}
