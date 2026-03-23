import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import './BattleAnimations.css';

/**
 * BattleAnimations Component
 * Gestisce effetti grafici per attacchi (Stile Classic Toon)
 * @param {Object} startPos - { x, y } punto di partenza
 * @param {Object} endPos - { x, y } punto di arrivo
 * @param {string} type - 'flamethrower' | 'leafblade' | 'doublekick' | 'watergun'
 */
export default function BattleAnimations({ startPos = { x: 100, y: 300 }, endPos = { x: 600, y: 300 }, trigger, type = 'flamethrower' }) {
    const containerRef = useRef(null);

    useEffect(() => {
        if (trigger) {
            if (type === 'flamethrower') launchFlamethrower();
            if (type === 'leafblade') launchLeafBlade();
            if (type === 'doublekick') launchDoubleKick();
            if (type === 'watergun') launchWaterGun();
        }
    }, [trigger]);

    // --- FIAMME (LANCIAFIAMME) ---
    const launchFlamethrower = () => {
        const container = containerRef.current;
        const particleCount = 45;
        for (let i = 0; i < particleCount; i++) {
            const dot = document.createElement('div');
            dot.className = 'fire-particle toon-blob';
            container.appendChild(dot);
            const size = gsap.utils.random(25, 55);
            gsap.set(dot, { x: startPos.x, y: startPos.y, width: size, height: size, background: gsap.utils.random(['#ff4d00', '#ff9500', '#ffcc00']), opacity: 1, scale: 0 });
            const tl = gsap.timeline({ onComplete: () => dot.remove() });
            tl.to(dot, { duration: 0.1, scale: 1, ease: "back.out(2)" })
                .to(dot, { duration: gsap.utils.random(0.6, 1.2), x: endPos.x + gsap.utils.random(-35, 35), y: endPos.y + gsap.utils.random(-35, 35), ease: "power2.out", delay: i * 0.02 }, 0)
                .to(dot, { duration: 0.4, scale: 0, opacity: 0, ease: "power2.in" }, "-=0.4");
        }
        setTimeout(() => { createToonBurst(endPos.x, endPos.y, '#ff9500', 3); }, 600);
    };

    // --- ACQUA (PISTOLACQUA) ---
    const launchWaterGun = () => {
        const container = containerRef.current;
        const particleCount = 40;

        for (let i = 0; i < particleCount; i++) {
            const drop = document.createElement('div');
            drop.className = 'water-particle toon-blob';
            container.appendChild(drop);

            const size = gsap.utils.random(20, 45);
            gsap.set(drop, {
                x: startPos.x,
                y: startPos.y,
                width: size,
                height: size,
                background: gsap.utils.random(['#3b82f6', '#60a5fa', '#93c5fd']),
                opacity: 0.8,
                scale: 0
            });

            const tl = gsap.timeline({ onComplete: () => drop.remove() });

            tl.to(drop, { duration: 0.1, scale: 1.2, ease: "expo.out" })
                .to(drop, {
                    duration: gsap.utils.random(0.5, 0.9),
                    x: endPos.x + gsap.utils.random(-20, 20),
                    y: endPos.y + gsap.utils.random(-20, 20),
                    ease: "power2.inOut",
                    delay: i * 0.015
                }, 0)
                .to(drop, { duration: 0.3, scale: 0, opacity: 0 }, "-=0.3");
        }

        setTimeout(() => {
            // Splash finale
            createToonBurst(endPos.x, endPos.y, '#60a5fa', 2.5);
            // Qualche goccia che schizza via
            for (let j = 0; j < 8; j++) createSplashDrop(endPos.x, endPos.y);
        }, 500);
    };

    // --- UTILITIES ---
    const createToonBurst = (x, y, color, finalScale) => {
        const container = containerRef.current;
        const burst = document.createElement('div');
        burst.className = 'toon-burst-effect';
        burst.style.backgroundColor = color;
        container.appendChild(burst);
        gsap.set(burst, { x, y, scale: 0, opacity: 1 });
        gsap.timeline({ onComplete: () => burst.remove() })
            .to(burst, { duration: 0.15, scale: finalScale, ease: "expo.out" })
            .to(burst, { duration: 0.2, scale: 0, opacity: 0, ease: "power2.in" });
    };

    const createSplashDrop = (x, y) => {
        const container = containerRef.current;
        const drop = document.createElement('div');
        drop.className = 'water-particle';
        container.appendChild(drop);
        const size = gsap.utils.random(5, 15);
        gsap.set(drop, { x, y, width: size, height: size, background: '#93c5fd', opacity: 1 });
        gsap.to(drop, {
            duration: 0.4,
            x: `+=${gsap.utils.random(-100, 100)}`,
            y: `+=${gsap.utils.random(-100, 100)}`,
            scale: 0,
            opacity: 0,
            ease: "power2.out",
            onComplete: () => drop.remove()
        });
    };

    // --- ALTRE MOSSE ---
    const launchDoubleKick = () => {
        const container = containerRef.current;
        const kicks = [0, 250];
        kicks.forEach((delay) => {
            setTimeout(() => {
                const impact = document.createElement('div');
                impact.className = 'kick-impact-effect';
                container.appendChild(impact);
                gsap.set(impact, { x: endPos.x, y: endPos.y, scale: 0, opacity: 1 });
                gsap.to(impact, {
                    duration: 0.2, scale: 2.5, ease: "back.out(1.5)",
                    onComplete: () => { gsap.to(impact, { duration: 0.1, opacity: 0, scale: 1, onComplete: () => impact.remove() }); }
                });
                for (let i = 0; i < 8; i++) {
                    const line = document.createElement('div');
                    line.className = 'kick-line';
                    container.appendChild(line);
                    const angle = (i / 8) * Math.PI * 2;
                    gsap.set(line, { x: endPos.x, y: endPos.y, rotate: (i / 8) * 360, scaleX: 0 });
                    gsap.to(line, { duration: 0.25, scaleX: 1, x: endPos.x + Math.cos(angle) * 80, y: endPos.y + Math.sin(angle) * 80, opacity: 0, ease: "power2.out", onComplete: () => line.remove() });
                }
            }, delay);
        });
    };

    const launchLeafBlade = () => {
        const container = containerRef.current;
        const leafCount = 20;
        for (let i = 0; i < leafCount; i++) {
            const leaf = document.createElement('div');
            leaf.className = 'leaf-particle';
            container.appendChild(leaf);
            gsap.set(leaf, { x: startPos.x, y: startPos.y + gsap.utils.random(-40, 40), scale: 0, rotateX: gsap.utils.random(0, 360), rotateY: gsap.utils.random(0, 360), rotateZ: gsap.utils.random(0, 360), opacity: 1 });
            const tl = gsap.timeline({ onComplete: () => leaf.remove() });
            tl.to(leaf, { duration: 0.15, scale: gsap.utils.random(1.2, 1.8), ease: "back.out" })
                .to(leaf, { duration: 0.5, x: endPos.x, y: endPos.y, rotateZ: "+=1080", rotateX: "+=360", ease: "expo.in", delay: i * 0.025 }, 0)
                .to(leaf, { duration: 0.2, opacity: 0, scale: 0.5 });
        }
        setTimeout(() => {
            const slash = document.createElement('div');
            slash.className = 'toon-slash-effect';
            container.appendChild(slash);
            gsap.set(slash, { x: endPos.x, y: endPos.y, scaleX: 0, scaleY: 0.1, rotate: 45 });
            gsap.timeline({ onComplete: () => slash.remove() })
                .to(slash, { duration: 0.1, scaleX: 4, scaleY: 1.2, ease: "power4.out" })
                .to(slash, { duration: 0.2, opacity: 0, scaleY: 0, ease: "power4.in" });
        }, 500);
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
