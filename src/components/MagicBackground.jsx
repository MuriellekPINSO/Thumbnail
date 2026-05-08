import { useMemo } from 'react';
import './MagicBackground.css';

/**
 * Magical animated background — drifting blurred orbs + twinkling stars.
 * Sits on top of the body::before aurora to add depth and life.
 */
export default function MagicBackground({ starCount = 48 }) {
    // Generate stable random positions/timings for the stars (memoized once).
    const stars = useMemo(() => {
        return Array.from({ length: starCount }).map((_, i) => {
            // Pseudo-random but stable per index using a simple hash
            const r = (n, seed) => {
                const x = Math.sin(i * 9301 + seed * 49297) * 233280;
                return Math.abs(x - Math.floor(x)) * n;
            };
            return {
                top: r(100, 1),
                left: r(100, 2),
                size: 1 + r(2.4, 3),
                delay: r(6, 4),
                duration: 2.4 + r(3.6, 5),
                hue: ['violet', 'cyan', 'pink', 'white'][Math.floor(r(4, 6))],
            };
        });
    }, [starCount]);

    return (
        <div className="magic-bg" aria-hidden="true">
            {/* Drifting colored orbs */}
            <span className="magic-orb magic-orb-violet" />
            <span className="magic-orb magic-orb-cyan" />
            <span className="magic-orb magic-orb-pink" />
            <span className="magic-orb magic-orb-amber" />

            {/* Twinkling stars */}
            <div className="magic-stars">
                {stars.map((s, i) => (
                    <span
                        key={i}
                        className={`magic-star magic-star-${s.hue}`}
                        style={{
                            top: `${s.top}%`,
                            left: `${s.left}%`,
                            width: `${s.size}px`,
                            height: `${s.size}px`,
                            animationDelay: `${s.delay}s`,
                            animationDuration: `${s.duration}s`,
                        }}
                    />
                ))}
            </div>

            {/* Slow shooting star overlay (rare) */}
            <span className="magic-shooter" />
        </div>
    );
}
