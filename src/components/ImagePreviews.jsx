import './ImagePreviews.css';

export default function ImagePreviews({ images, onRemove }) {
    if (images.length === 0) return null;

    return (
        <div className="image-previews">
            {images.map((item, i) => (
                <div className="preview-thumb" key={i}>
                    <img src={item.src} alt={item.name} />
                    <button
                        className="remove-btn"
                        onClick={(e) => {
                            e.stopPropagation();
                            onRemove(i);
                        }}
                    >
                        ×
                    </button>
                </div>
            ))}
        </div>
    );
}
