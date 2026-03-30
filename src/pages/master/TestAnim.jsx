import React, { useState } from 'react';
import BattleAnimations from '../../components/animations/BattleAnimations';
import { Circle, Target } from 'lucide-react';

export default function TestAnim() {
    const [clickCount, setClickCount] = useState(0);
    const [animType, setAnimType] = useState('fire_1');

    const triggerAnim = (type, level) => {
        setAnimType(`${type}_${level}`);
        setClickCount(prev => prev + 1);
    };

    const ALL_TYPES = [
        { key: 'normale', label: 'Normale', color: '#A8A77A' },
        { key: 'fuoco', label: 'Fuoco', color: '#EF4444' },
        { key: 'acqua', label: 'Acqua', color: '#3B82F6' },
        { key: 'erba', label: 'Erba', color: '#10B981' },
        { key: 'elettro', label: 'Elettro', color: '#F59E0B' },
        { key: 'ghiaccio', label: 'Ghiaccio', color: '#38BDF8' },
        { key: 'lotta', label: 'Lotta', color: '#DC2626' },
        { key: 'veleno', label: 'Veleno', color: '#9333EA' },
        { key: 'terra', label: 'Terra', color: '#D97706' },
        { key: 'volante', label: 'Volante', color: '#8B5CF6' },
        { key: 'psico', label: 'Psico', color: '#EC4899' },
        { key: 'coleottero', label: 'Coleottero', color: '#84CC16' },
        { key: 'roccia', label: 'Roccia', color: '#B45309' },
        { key: 'spettro', label: 'Spettro', color: '#6D28D9' },
        { key: 'drago', label: 'Drago', color: '#4C1D95' },
        { key: 'buio', label: 'Buio', color: '#1F2937' },
        { key: 'acciaio', label: 'Acciaio', color: '#64748B' },
        { key: 'folletto', label: 'Folletto', color: '#DB2777' },
        { key: 'suono', label: 'Suono', color: '#0D9488' },
        { key: 'sconosciuto', label: 'Sconosciuto', color: '#475569' },
    ];

    const renderLevelButtons = (typeKey, label, color) => (
        <div key={typeKey} style={{ textAlign: 'center', margin: '10px', width: '130px', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px' }}>
            <h4 style={{ color, marginBottom: '8px', fontSize: '0.9rem', textTransform: 'uppercase' }}>{label}</h4>
            <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                {[1, 2, 3].map(lvl => (
                    <button
                        key={lvl}
                        onClick={() => triggerAnim(typeKey, lvl)}
                        style={{
                            width: '30px', height: '30px', borderRadius: '50%',
                            background: color, border: 'none', cursor: 'pointer',
                            boxShadow: `0 0 10px ${color}60`, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            fontWeight: 'bold', color: 'white', fontSize: '0.7rem'
                        }}
                    >
                        L{lvl}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div style={{
            height: '100vh',
            background: '#0f172a',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            color: 'white',
            paddingTop: '20px',
            overflowY: 'auto'
        }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h2>Anteprima di TUTTI I 20 TIPI (Stile Classico)</h2>
                <p style={{ opacity: 0.8 }}>Testa l'impatto e le palette colori sul bersaglio gigante qui in basso.</p>
            </div>

            {/* Bersaglio Mockup (Punto B) posizionato un po' in alto per visibilità */}
            <div 
                style={{
                    width: '120px', height: '120px',
                    borderRadius: '20px',
                    border: '2px dashed rgba(255,255,255,0.4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '30px',
                    position: 'relative'
                }}
            >
                <Target color="rgba(255,255,255,0.5)" size={48} />
                {/* Animazione Overlay Centrata (Coordinate assolute relative alla finestra, per i test usiamo metà vert) */}
                <BattleAnimations
                    trigger={clickCount}
                    type={animType}
                    endPos={{ x: window.innerWidth / 2, y: 150 + 60 }} 
                />
            </div>

            <div style={{ 
                display: 'flex', gap: '10px', flexWrap: 'wrap', 
                justifyContent: 'center', maxWidth: '900px', 
                paddingBottom: '50px' 
            }}>
                {ALL_TYPES.map(t => renderLevelButtons(t.key, t.label, t.color))}
            </div>
        </div>
    );
}
