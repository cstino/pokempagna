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

    const typeColors = {
        normale: ['#A8A77A', '#C6C6A7'],
        fuoco: ['#EF4444', '#F97316', '#EAB308'],
        acqua: ['#3B82F6', '#60A5FA', '#93C5FD'],
        erba: ['#10B981', '#34D399', '#6EE7B7'],
        elettro: ['#F59E0B', '#FCD34D'],
        ghiaccio: ['#38BDF8', '#BAE6FD'],
        lotta: ['#DC2626', '#F87171'], 
        veleno: ['#9333EA', '#C084FC'],
        terra: ['#D97706', '#FBBF24'],
        volante: ['#8B5CF6', '#C4B5FD'],
        psico: ['#EC4899', '#F9A8D4'],
        coleottero: ['#84CC16', '#D9FA9D'],
        roccia: ['#B45309', '#FCD34D'],
        spettro: ['#6D28D9', '#C4B5FD'],
        drago: ['#4C1D95', '#8B5CF6'],
        buio: ['#1F2937', '#6B7280'],
        acciaio: ['#64748B', '#CBD5E1'],
        folletto: ['#DB2777', '#FBCFE8'],
        suono: ['#0D9488', '#5EEAD4'],
        sconosciuto: ['#475569', '#94A3B8']
    };

    const typeFamilies = {
        normale: 'impact', lotta: 'impact', roccia: 'impact', terra: 'impact', suono: 'impact',
        acqua: 'fluid', veleno: 'fluid', ghiaccio: 'fluid',
        fuoco: 'ascendant', spettro: 'ascendant', psico: 'ascendant',
        erba: 'nature', folletto: 'nature', coleottero: 'nature',
        elettro: 'energy', volante: 'energy', acciaio: 'energy', drago: 'energy', sconosciuto: 'energy', buio: 'impact'
    };

    useEffect(() => {
        if (trigger) {
            const [baseType, levelStr] = type.split('_');
            const level = parseInt(levelStr) || 1;
            launchUnifiedBurst(baseType, level);
        }
    }, [trigger]);

    const launchUnifiedBurst = (baseType, level) => {
        const colors = typeColors[baseType] || typeColors.normal;
        const family = typeFamilies[baseType] || 'impact';
        
        const config = {
            1: { count: 3, scale: 2.5, radius: 45, finalBurst: true, finalScale: 5.0, duration: 0.15 },
            2: { count: 5, scale: 4.0, radius: 75, finalBurst: true, finalScale: 7.5, duration: 0.2 },
            3: { count: 5, scale: 6.0, radius: 110, finalBurst: true, finalScale: 11.5, duration: 0.5 }
        }[level] || { count: 3, scale: 2.5, radius: 45, finalBurst: true, finalScale: 5.0, duration: 0.15 };

        // Sequenza veloce dei cerchi esplosivi
        const timeDelay = family === 'energy' ? 80 : family === 'fluid' ? 180 : 150;

        for (let i = 0; i < config.count; i++) {
            setTimeout(() => {
                const cx = endPos.x + gsap.utils.random(-config.radius, config.radius);
                const cy = endPos.y + gsap.utils.random(-config.radius, config.radius);
                const color = gsap.utils.random(colors);
                createToonBurst(cx, cy, color, config.scale, family, false);
            }, i * timeDelay);
        }

        // Esplosione finale
        if (config.finalBurst) {
            setTimeout(() => {
                // Screen shake per L3
                if (level === 3 && containerRef.current) {
                    gsap.to(containerRef.current, { duration: 0.4, x: "+=10", y: "+=10", repeat: 5, yoyo: true, ease: "rough" });
                    gsap.to(containerRef.current, { delay: 0.4, x: 0, y: 0, duration: 0.1 });
                }

                createToonBurst(endPos.x, endPos.y, colors[0], config.finalScale, 'impact', true, config.duration);
                setTimeout(() => {
                    createToonBurst(endPos.x, endPos.y, '#ffffff', config.finalScale * 0.7, 'impact', true, config.duration);
                }, 50);
            }, (config.count * timeDelay) + 150);
        }
    };

    // --- UTILITIES ---
    const createToonBurst = (x, y, color, finalScale, family, isFinal, duration = 0.15) => {
        const container = containerRef.current;
        if (!container) return;
        const burst = document.createElement('div');
        
        // Stili di base: centriamo perfettamente l'origine visiva e rendiamoli NITIDI
        burst.style.position = 'absolute';
        burst.style.backgroundColor = color;
        burst.style.zIndex = 10001;
        burst.style.transform = 'translate(-50%, -50%)'; 
        
        if (isFinal) {
            // L'esplosione magna (Livello 3 core) è sempre un cerchio solido incandescente
            burst.style.width = '50px';
            burst.style.height = '50px';
            burst.style.borderRadius = '50%';
            burst.style.boxShadow = `0 0 40px ${color}, 0 0 20px white`;
            burst.style.zIndex = 10005;
        } else {
            // Personalizzazione drastica delle forme per renderle ultra-riconoscibili
            if (family === 'nature') {
                // FOGLIE / PETALI
                burst.style.width = '24px';
                burst.style.height = '35px';
                burst.style.clipPath = 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
                burst.style.border = '1px solid rgba(255,255,255,0.4)';
            } else if (family === 'energy') {
                // SCINTILLE PIATTE / SPIGOLOSE
                burst.style.width = '15px';
                burst.style.height = '15px';
                burst.style.borderRadius = gsap.utils.random(0,1) > 0.5 ? '0px' : '4px';
                burst.style.boxShadow = `0 0 15px ${color}`;
            } else if (family === 'fluid') {
                // LIQUIDO GOOEY (morbido e blurrato)
                burst.style.width = '40px';
                burst.style.height = '40px';
                burst.style.borderRadius = '50%';
                burst.style.filter = 'blur(4px)';
                burst.style.opacity = '0.8';
            } else if (family === 'ascendant') {
                // FIAMME A GOCCIA
                burst.style.width = '30px';
                burst.style.height = '30px';
                burst.style.borderRadius = '50% 0 50% 50%';
                burst.style.boxShadow = `0 0 15px ${color}`;
            } else { 
                // IMPACT (Cerchi perfetti con bordo duro)
                burst.style.width = '40px';
                burst.style.height = '40px';
                burst.style.borderRadius = '50%';
                burst.style.border = '3px solid rgba(255,255,255,0.8)';
                burst.style.boxShadow = `0 0 20px ${color}`;
            }
        }
        
        container.appendChild(burst);
        const tl = gsap.timeline({ onComplete: () => burst.remove() });

        if (isFinal || family === 'impact') {
            gsap.set(burst, { x, y, scale: 0, opacity: 1 });
            tl.to(burst, { duration: duration, scale: finalScale, ease: "expo.out" })
              .to(burst, { duration: duration * 1.5, scale: finalScale * 1.1, opacity: 0, ease: "power2.inOut" });
        } else if (family === 'fluid') {
            gsap.set(burst, { x, y, scale: 0, opacity: 1 });
            tl.to(burst, { duration: 0.2, scale: finalScale, ease: "back.out(2)" })
              .to(burst, { duration: 0.4, y: y + 50, scale: 0, opacity: 0, ease: "power1.in" });
        } else if (family === 'ascendant') {
            gsap.set(burst, { x, y: y + 30, scale: 0, opacity: 1, rotation: gsap.utils.random(-15, 15) });
            tl.to(burst, { duration: 0.2, scale: finalScale, ease: "power2.out" })
              .to(burst, { duration: 0.5, y: y - 80, x: x + gsap.utils.random(-30, 30), scale: 0, opacity: 0, ease: "sine.inOut" });
        } else if (family === 'nature') {
             gsap.set(burst, { x, y, scale: 0, opacity: 1, rotation: gsap.utils.random(0, 360) });
             tl.to(burst, { duration: 0.2, scale: finalScale, ease: "back.out(1.5)" })
               .to(burst, { duration: 0.6, rotation: "+=720", x: x + gsap.utils.random(-60, 60), y: y + gsap.utils.random(-60, 60), scale: 0, opacity: 0, ease: "power2.out" });
        } else if (family === 'energy') {
             gsap.set(burst, { x, y, scale: finalScale * 0.5, opacity: 0, rotation: gsap.utils.random(0, 90) }); 
             tl.to(burst, { duration: 0.05, opacity: 1, x: x + gsap.utils.random(-40, 40), y: y + gsap.utils.random(-40, 40), scale: finalScale * 1.2, ease: "none" })
               .to(burst, { duration: 0.05, x: x + gsap.utils.random(-40, 40), y: y + gsap.utils.random(-40, 40), ease: "none" })
               .to(burst, { duration: 0.1, scale: 0, opacity: 0, ease: "power4.in" });
        }
    };

    return (
        <div className="battle-animations-overlay" ref={containerRef}>
            <svg xmlns="http://www.w3.org/2000/svg" version="1.1" style={{ display: 'none' }}>
                <defs>
                    <filter id="toonFlame">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
                        <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="toonFlame" />
                        <feBlend in="SourceGraphic" in2="toonFlame" />
                    </filter>
                </defs>
            </svg>
        </div>
    );
}

