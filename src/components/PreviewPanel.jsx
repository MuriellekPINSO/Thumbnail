import { useState } from 'react';
import { Monitor, Smartphone, Tv, Search, LayoutGrid, ListVideo, Eye, Home, Plus, Bell, Library } from 'lucide-react';
import './PreviewPanel.css';

const TABS = [
    { id: 'home', label: 'Accueil', icon: LayoutGrid },
    { id: 'search', label: 'Recherche', icon: Search },
    { id: 'sidebar', label: 'Sidebar', icon: ListVideo },
    { id: 'mobile', label: 'Mobile', icon: Smartphone },
    { id: 'tv', label: 'TV', icon: Tv },
];

export default function PreviewPanel({ thumbnailSrc, title, channelName = 'Ma Chaîne' }) {
    const [activeTab, setActiveTab] = useState('home');

    const displayTitle = title || 'Titre de votre vidéo';
    const views = '1,2M de vues';
    const timeAgo = 'il y a 2 jours';
    const duration = '12:34';

    return (
        <div className="preview-panel">
            <div className="preview-header-bar">
                <div className="preview-panel-title">
                    <Eye size={18} />
                    Aperçu YouTube
                </div>
                <div className="preview-tabs">
                    {TABS.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                className={`preview-tab ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <Icon size={14} />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="preview-viewport">
                {/* ─── DESKTOP HOME ─── */}
                {activeTab === 'home' && (
                    <div className="yt-mockup yt-home">
                        <div className="yt-device-label"><Monitor size={12} /> Desktop — Accueil YouTube</div>
                        <div className="yt-home-grid">
                            {/* Main card */}
                            <div className="yt-card yt-card-highlight">
                                <div className="yt-thumb-wrapper">
                                    {thumbnailSrc ? (
                                        <img src={thumbnailSrc} alt="thumbnail" className="yt-thumb-img" />
                                    ) : (
                                        <div className="yt-thumb-placeholder" />
                                    )}
                                    <span className="yt-duration">{duration}</span>
                                </div>
                                <div className="yt-card-info">
                                    <div className="yt-avatar">{channelName.charAt(0).toUpperCase()}</div>
                                    <div className="yt-meta">
                                        <div className="yt-title">{displayTitle}</div>
                                        <div className="yt-channel">{channelName}</div>
                                        <div className="yt-stats">{views} · {timeAgo}</div>
                                    </div>
                                </div>
                            </div>
                            {/* Phantom cards */}
                            {[1, 2, 3, 4, 5].map(i => (
                                <div className="yt-card yt-card-ghost" key={i}>
                                    <div className="yt-thumb-wrapper"><div className="yt-thumb-placeholder" /></div>
                                    <div className="yt-card-info">
                                        <div className="yt-avatar-ghost" />
                                        <div className="yt-meta">
                                            <div className="yt-title-ghost" />
                                            <div className="yt-channel-ghost" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ─── SEARCH RESULTS ─── */}
                {activeTab === 'search' && (
                    <div className="yt-mockup yt-search">
                        <div className="yt-device-label"><Monitor size={12} /> Desktop — Résultats de recherche</div>
                        <div className="yt-search-bar-mock">
                            <Search size={14} />
                            <span>{displayTitle}</span>
                        </div>
                        <div className="yt-search-result yt-card-highlight">
                            <div className="yt-search-thumb">
                                {thumbnailSrc ? (
                                    <img src={thumbnailSrc} alt="thumbnail" className="yt-thumb-img" />
                                ) : (
                                    <div className="yt-thumb-placeholder" />
                                )}
                                <span className="yt-duration">{duration}</span>
                            </div>
                            <div className="yt-search-info">
                                <div className="yt-title yt-title-search">{displayTitle}</div>
                                <div className="yt-stats">{views} · {timeAgo}</div>
                                <div className="yt-search-channel">
                                    <div className="yt-avatar-small">{channelName.charAt(0)}</div>
                                    <span>{channelName}</span>
                                </div>
                                <div className="yt-search-desc">Découvrez tout ce que vous devez savoir dans cette vidéo complète...</div>
                            </div>
                        </div>
                        {[1, 2].map(i => (
                            <div className="yt-search-result yt-card-ghost" key={i}>
                                <div className="yt-search-thumb"><div className="yt-thumb-placeholder" /></div>
                                <div className="yt-search-info">
                                    <div className="yt-title-ghost" style={{ width: '80%' }} />
                                    <div className="yt-channel-ghost" style={{ width: '40%' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ─── SIDEBAR ─── */}
                {activeTab === 'sidebar' && (
                    <div className="yt-mockup yt-sidebar-view">
                        <div className="yt-device-label"><Monitor size={12} /> Desktop — Vidéos suggérées</div>
                        <div className="yt-sidebar-layout">
                            <div className="yt-player-mock">
                                <div className="yt-player-placeholder">
                                    <div className="yt-play-btn">▶</div>
                                </div>
                                <div className="yt-player-title">{displayTitle}</div>
                            </div>
                            <div className="yt-sidebar-list">
                                <div className="yt-sidebar-label">À suivre</div>
                                <div className="yt-sidebar-item yt-card-highlight">
                                    <div className="yt-sidebar-thumb">
                                        {thumbnailSrc ? (
                                            <img src={thumbnailSrc} alt="thumbnail" className="yt-thumb-img" />
                                        ) : (
                                            <div className="yt-thumb-placeholder" />
                                        )}
                                        <span className="yt-duration-small">{duration}</span>
                                    </div>
                                    <div className="yt-sidebar-meta">
                                        <div className="yt-sidebar-title">{displayTitle}</div>
                                        <div className="yt-sidebar-channel">{channelName}</div>
                                        <div className="yt-sidebar-stats">{views}</div>
                                    </div>
                                </div>
                                {[1, 2, 3, 4].map(i => (
                                    <div className="yt-sidebar-item yt-card-ghost" key={i}>
                                        <div className="yt-sidebar-thumb"><div className="yt-thumb-placeholder" /></div>
                                        <div className="yt-sidebar-meta">
                                            <div className="yt-title-ghost" style={{ width: '90%' }} />
                                            <div className="yt-channel-ghost" style={{ width: '50%' }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── MOBILE ─── */}
                {activeTab === 'mobile' && (
                    <div className="yt-mockup yt-mobile">
                        <div className="yt-device-label"><Smartphone size={12} /> Mobile — YouTube App</div>
                        <div className="yt-phone-frame">
                            {/* Dynamic Island */}
                            <div className="yt-phone-dynamic-island" />

                            {/* Status Bar */}
                            <div className="yt-phone-status-bar">
                                <span className="yt-status-time">9:41</span>
                                <div className="yt-status-icons">
                                    {/* Signal bars */}
                                    <svg width="17" height="12" viewBox="0 0 17 12" fill="none">
                                        <rect x="0" y="9" width="3" height="3" rx="0.5" fill="#fff" />
                                        <rect x="4.5" y="6" width="3" height="6" rx="0.5" fill="#fff" />
                                        <rect x="9" y="3" width="3" height="9" rx="0.5" fill="#fff" />
                                        <rect x="13.5" y="0" width="3" height="12" rx="0.5" fill="#fff" opacity="0.3" />
                                    </svg>
                                    {/* WiFi */}
                                    <svg width="16" height="12" viewBox="0 0 16 12" fill="#fff">
                                        <path d="M8 9.6a1.4 1.4 0 110 2.8 1.4 1.4 0 010-2.8zM4.3 7.5a5.2 5.2 0 017.4 0l-.9.9a3.9 3.9 0 00-5.6 0l-.9-.9zM1.8 5a8.7 8.7 0 0112.4 0l-.9.9a7.4 7.4 0 00-10.6 0L1.8 5z" />
                                    </svg>
                                    {/* Battery */}
                                    <svg width="27" height="12" viewBox="0 0 27 12" fill="none">
                                        <rect x="0" y="0.5" width="23" height="11" rx="2.5" stroke="#fff" strokeOpacity="0.35" strokeWidth="1" />
                                        <rect x="24.5" y="3.5" width="2" height="5" rx="1" fill="#fff" fillOpacity="0.4" />
                                        <rect x="2" y="2.5" width="19" height="7" rx="1.5" fill="#34C759" />
                                    </svg>
                                </div>
                            </div>

                            {/* YouTube Header */}
                            <div className="yt-phone-header">
                                <div className="yt-phone-logo">
                                    <svg width="24" height="17" viewBox="0 0 24 17" fill="none">
                                        <rect width="24" height="17" rx="4" fill="#FF0000" />
                                        <path d="M16 8.5L10 12V5L16 8.5Z" fill="white" />
                                    </svg>
                                    <span>YouTube</span>
                                </div>
                                <div className="yt-phone-header-actions">
                                    <Search size={18} color="#fff" />
                                </div>
                            </div>

                            {/* Content */}
                            <div className="yt-phone-content">
                                <div className="yt-phone-card yt-card-highlight">
                                    <div className="yt-phone-thumb">
                                        {thumbnailSrc ? (
                                            <img src={thumbnailSrc} alt="thumbnail" className="yt-thumb-img" />
                                        ) : (
                                            <div className="yt-thumb-placeholder" />
                                        )}
                                        <span className="yt-duration">{duration}</span>
                                    </div>
                                    <div className="yt-phone-info">
                                        <div className="yt-avatar-small">{channelName.charAt(0)}</div>
                                        <div className="yt-phone-meta">
                                            <div className="yt-title yt-phone-title">{displayTitle}</div>
                                            <div className="yt-stats">{channelName} · {views} · {timeAgo}</div>
                                        </div>
                                    </div>
                                </div>
                                {[1, 2].map(i => (
                                    <div className="yt-phone-card yt-card-ghost" key={i}>
                                        <div className="yt-phone-thumb"><div className="yt-thumb-placeholder" /></div>
                                        <div className="yt-phone-info">
                                            <div className="yt-avatar-ghost" style={{ width: 28, height: 28 }} />
                                            <div className="yt-phone-meta">
                                                <div className="yt-title-ghost" />
                                                <div className="yt-channel-ghost" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Bottom Nav Bar with real SVG icons */}
                            <div className="yt-phone-navbar">
                                <div className="yt-phone-nav-item active">
                                    <Home size={20} strokeWidth={2.5} />
                                    <span>Accueil</span>
                                </div>
                                <div className="yt-phone-nav-item">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M2 8l2 2-2 2" />
                                        <path d="M22 12a10 10 0 11-20 0 10 10 0 0120 0z" opacity="0" />
                                        <path d="M9.5 2A12.5 12.5 0 002 9" />
                                        <path d="M14.5 2A12.5 12.5 0 0122 9" />
                                        <path d="M9.5 22A12.5 12.5 0 012 15" />
                                        <path d="M14.5 22A12.5 12.5 0 0022 15" />
                                    </svg>
                                    <span>Shorts</span>
                                </div>
                                <div className="yt-phone-nav-item yt-nav-create">
                                    <Plus size={22} />
                                </div>
                                <div className="yt-phone-nav-item">
                                    <Bell size={20} />
                                    <span>Abonnements</span>
                                </div>
                                <div className="yt-phone-nav-item">
                                    <Library size={20} />
                                    <span>Bibliothèque</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── TV ─── */}
                {activeTab === 'tv' && (
                    <div className="yt-mockup yt-tv">
                        <div className="yt-device-label"><Tv size={12} /> TV — YouTube sur grand écran</div>
                        <div className="yt-tv-frame">
                            <div className="yt-tv-content">
                                <div className="yt-tv-featured">
                                    {thumbnailSrc ? (
                                        <img src={thumbnailSrc} alt="thumbnail" className="yt-thumb-img" />
                                    ) : (
                                        <div className="yt-thumb-placeholder" />
                                    )}
                                    <div className="yt-tv-overlay">
                                        <div className="yt-tv-title">{displayTitle}</div>
                                        <div className="yt-tv-channel">{channelName} · {views}</div>
                                    </div>
                                </div>
                                <div className="yt-tv-row">
                                    <div className="yt-tv-label">Recommandées</div>
                                    <div className="yt-tv-scroll">
                                        <div className="yt-tv-card yt-card-highlight">
                                            <div className="yt-tv-card-thumb">
                                                {thumbnailSrc ? (
                                                    <img src={thumbnailSrc} alt="thumbnail" className="yt-thumb-img" />
                                                ) : (
                                                    <div className="yt-thumb-placeholder" />
                                                )}
                                            </div>
                                            <div className="yt-tv-card-title">{displayTitle}</div>
                                        </div>
                                        {[1, 2, 3].map(i => (
                                            <div className="yt-tv-card yt-card-ghost" key={i}>
                                                <div className="yt-tv-card-thumb"><div className="yt-thumb-placeholder" /></div>
                                                <div className="yt-title-ghost" />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
