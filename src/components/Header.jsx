import { Layers, MoonStar, Sun, Sparkles, History } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import './Header.css';

export default function Header({ historyCount = 0, onHistoryClick }) {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <header className="header">
            <div className="header-inner">
                <div className="logo">
                    <span className="logo-mark">
                        <Layers size={18} strokeWidth={2.5} />
                    </span>
                    <span className="logo-text">
                        THUMB<span className="logo-text-accent">LAB</span>
                    </span>
                </div>

                <div className="header-actions">
                    <div className="badge">
                        <Sparkles size={11} />
                        <span>Studio IA · Thumbnails YouTube</span>
                    </div>

                    {onHistoryClick && (
                        <button
                            type="button"
                            className="history-trigger"
                            onClick={onHistoryClick}
                            aria-label={`Historique${historyCount > 0 ? ` (${historyCount})` : ''}`}
                            title="Voir l'historique"
                        >
                            <History size={15} strokeWidth={2.2} />
                            <span className="history-trigger-label">Historique</span>
                            {historyCount > 0 && (
                                <span className="history-trigger-count">{historyCount}</span>
                            )}
                        </button>
                    )}

                    <button
                        type="button"
                        className={`theme-toggle ${isDark ? 'is-dark' : 'is-light'}`}
                        onClick={toggleTheme}
                        aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
                        title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
                    >
                        <span className="theme-toggle-track">
                            <span className="theme-toggle-thumb">
                                <span className="theme-icon theme-icon-moon">
                                    <MoonStar size={15} strokeWidth={2.2} fill="currentColor" fillOpacity={0.15} />
                                </span>
                                <span className="theme-icon theme-icon-sun">
                                    <Sun size={16} strokeWidth={2.4} />
                                </span>
                            </span>
                        </span>
                    </button>
                </div>
            </div>
        </header>
    );
}
