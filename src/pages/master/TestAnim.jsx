import React, { useState } from 'react';
import BattleAnimations from '../../components/animations/BattleAnimations';
import { Zap, Shield, Footprints, Droplet } from 'lucide-react';

export default function TestAnim() {
    const [clickCount, setClickCount] = useState(0);
    const [animType, setAnimType] = useState('flamethrower');

    const triggerAnim = (type) => {
        setAnimType(type);
        setClickCount(prev => prev + 1);
    };

    return (
        <div style={{
            height: '100vh',
            background: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            gap: '30px'
        }}>
            <h2>Test Animazioni Classic Toon</h2>
            <p>Tutto lo stile è ora unificato (Gooey Blob Style):</p>

            <div style={{ display: 'flex', gap: '40px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {/* Lanciafiamme */}
                <div style={{ textAlign: 'center' }}>
                    <button
                        onClick={() => triggerAnim('flamethrower')}
                        style={{
                            width: '75px', height: '75px', borderRadius: '50%',
                            background: '#ef4444', border: 'none', cursor: 'pointer',
                            boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <Zap size={30} color="white" fill="white" />
                    </button>
                    <p style={{ marginTop: '10px', fontSize: '0.8rem' }}>Lanciafiamme</p>
                </div>

                {/* Pistolacqua */}
                <div style={{ textAlign: 'center' }}>
                    <button
                        onClick={() => triggerAnim('watergun')}
                        style={{
                            width: '75px', height: '75px', borderRadius: '50%',
                            background: '#3b82f6', border: 'none', cursor: 'pointer',
                            boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <Droplet size={30} color="white" fill="white" />
                    </button>
                    <p style={{ marginTop: '10px', fontSize: '0.8rem' }}>Pistolacqua</p>
                </div>

                {/* Doppio Calcio */}
                <div style={{ textAlign: 'center' }}>
                    <button
                        onClick={() => triggerAnim('doublekick')}
                        style={{
                            width: '75px', height: '75px', borderRadius: '50%',
                            background: '#eab308', border: 'none', cursor: 'pointer',
                            boxShadow: '0 0 20px rgba(234, 179, 8, 0.4)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <Footprints size={30} color="white" fill="white" />
                    </button>
                    <p style={{ marginTop: '10px', fontSize: '0.8rem' }}>Doppio Calcio</p>
                </div>

                {/* Foglia Lama */}
                <div style={{ textAlign: 'center' }}>
                    <button
                        onClick={() => triggerAnim('leafblade')}
                        style={{
                            width: '75px', height: '75px', borderRadius: '50%',
                            background: '#10b981', border: 'none', cursor: 'pointer',
                            boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <Shield size={30} color="white" fill="white" />
                    </button>
                    <p style={{ marginTop: '10px', fontSize: '0.8rem' }}>Foglia Lama</p>
                </div>
            </div>

            {/* Animazione Overlay */}
            <BattleAnimations
                trigger={clickCount}
                type={animType}
                startPos={{ x: window.innerWidth * 0.2, y: window.innerHeight * 0.5 }}
                endPos={{ x: window.innerWidth * 0.8, y: window.innerHeight * 0.5 }}
            />

            <div style={{
                position: 'absolute',
                bottom: 40,
                opacity: 0.5,
                fontSize: '0.8rem',
                textAlign: 'center'
            }}>
                Stile unificato "Classic Toon": Filtro fusione gommosa (Gooey) e colori vibranti.<br />
                Questo approccio garantisce coerenza e leggerezza su ogni dispositivo.
            </div>
        </div>
    );
}
