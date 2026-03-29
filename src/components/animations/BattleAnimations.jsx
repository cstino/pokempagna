import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import './BattleAnimations.css';

/**
 * BattleAnimations Component
 * Gestisce effetti grafici per attacchi (Stile Classic Toon) a 3 Livelli di potenza.
 * Tutte le animazioni avvengono direttamente sul bersaglio (endPos).
 * @param {Object} startPos - { x, y } (Opzionale ora, mantenuto per compatibilità)
 * @param {Object} endPos - { x, y } punto di impatto
 * @param {string} type - 'fire_1' | 'fire_2' | 'fire_3' etc.
 */
export default function BattleAnimations({ startPos, endPos = { x: 600, y: 300 }, trigger, type = 'fire_1' }) {
    const containerRef = useRef(null);

    useEffect(() => {
        if (trigger) {
            const [baseType, levelStr] = type.split('_');
            const level = parseInt(levelStr) || 1;

            if (baseType === 'fire') launchFire(level);
            if (baseType === 'water') launchWater(level);
            if (baseType === 'grass') launchGrass(level);
            if (baseType === 'physical') launchPhysical(level);
        }
    }, [trigger]);

    // --- FUOCO (3 LIVELLI) ---
    const launchFire = (level) => {
        const container = containerRef.current;
        const conf = {
            1: { count: 15, size: [15, 30], radius: 30, duration: 0.6, burst: 1.5, colors: ['#ff4d00', '#ff9500'] },
            2: { count: 35, size: [25, 55], radius: 60, duration: 0.9, burst: 3.0, colors: ['#ff4d00', '#ff9500', '#ffcc00'] },
            3: { count: 80, size: [40, 90], radius: 120, duration: 1.4, burst: 5.5, colors: ['#ff4d00', '#ff9500', '#ffcc00', '#ffffff'] }
        }[level] || { count: 15, size: [15, 30], radius: 30, duration: 0.6, burst: 1.5, colors: ['#ff4d00', '#ff9500'] };

        for (let i = 0; i < conf.count; i++) {
            const dot = document.createElement('div');
            dot.className = 'fire-particle toon-blob';
            container.appendChild(dot);
            
            const size = gsap.utils.random(conf.size[0], conf.size[1]);
            gsap.set(dot, { 
                x: endPos.x + gsap.utils.random(-15, 15), 
                y: endPos.y + gsap.utils.random(-15, 15), 
                width: size, height: size, 
                background: gsap.utils.random(conf.colors),
                opacity: 1, scale: 0 
            });

            const tl = gsap.timeline({ onComplete: () => dot.remove() });
            tl.to(dot, { duration: 0.2, scale: 1, ease: "back.out(2)" })
              .to(dot, { 
                  duration: gsap.utils.random(conf.duration * 0.7, conf.duration), 
                  x: endPos.x + gsap.utils.random(-conf.radius, conf.radius), 
                  y: endPos.y + gsap.utils.random(-conf.radius, conf.radius), 
                  ease: "power2.out",
                  scale: 0.2,
                  opacity: 0
              }, "-=0.1");
        }
        setTimeout(() => { createToonBurst(endPos.x, endPos.y, '#ff9500', conf.burst); }, 200);
    };

    // --- ACQUA (3 LIVELLI) ---
    const launchWater = (level) => {
        const container = containerRef.current;
        const conf = {
            1: { count: 12, size: [15, 25], radius: 40, burst: 1.2 },
            2: { count: 30, size: [25, 45], radius: 70, burst: 2.8 },
            3: { count: 65, size: [40, 80], radius: 130, burst: 5.0 }
        }[level] || { count: 12, size: [15, 25], radius: 40, burst: 1.2 };

        for (let i = 0; i < conf.count; i++) {
            const drop = document.createElement('div');
            drop.className = 'water-particle toon-blob';
            container.appendChild(drop);
            const size = gsap.utils.random(conf.size[0], conf.size[1]);
            
            gsap.set(drop, {
                x: endPos.x + gsap.utils.random(-10, 10),
                y: endPos.y + gsap.utils.random(-10, 10),
                width: size, height: size,
                background: gsap.utils.random(['#3b82f6', '#60a5fa', '#93c5fd']),
                opacity: 0.8, scale: 0
            });

            gsap.timeline({ onComplete: () => drop.remove() })
                .to(drop, { duration: 0.15, scale: 1.2, ease: "expo.out" })
                .to(drop, {
                    duration: gsap.utils.random(0.4, 0.8),
                    x: endPos.x + gsap.utils.random(-conf.radius, conf.radius),
                    y: endPos.y + gsap.utils.random(-conf.radius, conf.radius),
                    ease: "back.out(1)",
                    scale: 0, opacity: 0
                });
        }
        setTimeout(() => { createToonBurst(endPos.x, endPos.y, '#60a5fa', conf.burst); }, 100);
    };

    // --- ERBA (3 LIVELLI) ---
    const launchGrass = (level) => {
        const container = containerRef.current;
        const conf = {
            1: { count: 10, radius: 50, burst: 1.5 },
            2: { count: 25, radius: 90, burst: 3.0 },
            3: { count: 50, radius: 150, burst: 5.2 }
        }[level];

        for (let i = 0; i < conf.count; i++) {
            const leaf = document.createElement('div');
            leaf.className = 'leaf-particle';
            container.appendChild(leaf);
            
            gsap.set(leaf, { 
                x: endPos.x, y: endPos.y, 
                scale: 0, 
                rotate: gsap.utils.random(0, 360),
                opacity: 1 
            });

            gsap.timeline({ onComplete: () => leaf.remove() })
                .to(leaf, { duration: 0.2, scale: gsap.utils.random(1, 1.5), ease: "back.out" })
                .to(leaf, { 
                    duration: gsap.utils.random(0.6, 1.2), 
                    x: endPos.x + gsap.utils.random(-conf.radius, conf.radius), 
                    y: endPos.y + gsap.utils.random(-conf.radius, conf.radius), 
                    rotate: "+=720",
                    opacity: 0, scale: 0
                });
        }
        
        if (level >= 2) {
            setTimeout(() => {
                const slash = document.createElement('div');
                slash.className = 'toon-slash-effect';
                container.appendChild(slash);
                gsap.set(slash, { x: endPos.x, y: endPos.y, scaleX: 0, scaleY: 0.1, rotate: gsap.utils.random(0, 180) });
                gsap.timeline({ onComplete: () => slash.remove() })
                    .to(slash, { duration: 0.1, scaleX: level * 2, scaleY: 1.5, ease: "power4.out" })
                    .to(slash, { duration: 0.2, opacity: 0, scaleY: 0, ease: "power4.in" });
            }, 300);
        }
    };

    // --- FISICO (3 LIVELLI) ---
    const launchPhysical = (level) => {
        const container = containerRef.current;
        const hitCount = level === 1 ? 1 : level === 2 ? 3 : 6;
        
        for(let h=0; h<hitCount; h++) {
            setTimeout(() => {
                const impact = document.createElement('div');
                impact.className = 'kick-impact-effect';
                container.appendChild(impact);
                
                const offsetX = gsap.utils.random(-30, 30) * (level - 1);
                const offsetY = gsap.utils.random(-30, 30) * (level - 1);

                gsap.set(impact, { x: endPos.x + offsetX, y: endPos.y + offsetY, scale: 0, opacity: 1 });
                gsap.to(impact, {
                    duration: 0.2, scale: 1.5 + (level * 0.5), ease: "back.out(2)",
                    onComplete: () => { gsap.to(impact, { duration: 0.1, opacity: 0, scale: impact.scale * 0.8, onComplete: () => impact.remove() }); }
                });

                // Linee di impatto
                const lineCount = 4 + (level * 2);
                for (let i = 0; i < lineCount; i++) {
                    const line = document.createElement('div');
                    line.className = 'kick-line';
                    container.appendChild(line);
                    const angle = (i / lineCount) * Math.PI * 2;
                    gsap.set(line, { x: endPos.x + offsetX, y: endPos.y + offsetY, rotate: (i / lineCount) * 360, scaleX: 0 });
                    gsap.to(line, { 
                        duration: 0.3, 
                        scaleX: 1 + (level * 0.3), 
                        x: endPos.x + offsetX + Math.cos(angle) * (60 * level), 
                        y: endPos.y + offsetY + Math.sin(angle) * (60 * level), 
                        opacity: 0, ease: "power2.out", onComplete: () => line.remove() 
                    });
                }
            }, h * (250 / level));
        }
    };

    // --- UTILITIES ---
    const createToonBurst = (x, y, color, finalScale) => {
        const container = containerRef.current;
        if (!container) return;
        const burst = document.createElement('div');
        burst.className = 'toon-burst-effect';
        burst.style.backgroundColor = color;
        container.appendChild(burst);
        gsap.set(burst, { x, y, scale: 0, opacity: 1 });
        gsap.timeline({ onComplete: () => burst.remove() })
            .to(burst, { duration: 0.15, scale: finalScale, ease: "expo.out" })
            .to(burst, { duration: 0.2, scale: 0, opacity: 0, ease: "power2.in" });
    };

    return (
        <div className="battle-animations-overlay" ref={containerRef}>
            <svg xmlns="http://www.w3.org/2000/svg" version="1.1" style={{ display: 'none' }}>
                <defs>
                    <filter id="toonFlame">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
                        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -11" result="toonFlame" />
                        <feBlend in="SourceGraphic" in2="toonFlame" />
                    </filter>
                </defs>
            </svg>
        </div>
    );
}

