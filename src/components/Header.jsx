import { Layers } from 'lucide-react';
import './Header.css';

export default function Header() {
    return (
        <header className="header">
            <div className="logo">
                <Layers size={20} style={{ color: 'var(--accent)', marginRight: 8, verticalAlign: 'middle' }} />
                THUMB<span>LAB</span>
            </div>
            <div className="badge">Générateur de Thumbnails</div>
        </header>
    );
}
