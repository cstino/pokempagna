import { useState, useRef } from 'react';
import { Swords, Flame, Droplets, Target, Leaf } from 'lucide-react';
import BattleAnimations from '../../components/animations/BattleAnimations';

export default function Combat() {
    const playerPkmnRef = useRef(null);
    const opponentPkmnRef = useRef(null);
    const [trigger, setTrigger] = useState(0);
    const [animType, setAnimType] = useState('fire_1');
    const [battleLog, setBattleLog] = useState("Arena Pronta! Scegli un livello di potenza per testare.");

    const handleMove = (type) => {
        setAnimType(type);
        setTrigger(prev => prev + 1);
        
        const [kind, level] = type.split('_');
        const levelNames = { 1: 'Base', 2: 'Avanzato', 3: 'Ultra' };
        const kindNames = { fire: 'Fuoco', water: 'Acqua', grass: 'Erba', physical: 'Fisico' };
        
        setBattleLog(`Pokémon usa mossa ${kindNames[kind]} di livello ${levelNames[level]}!`);
    };

    const MoveButton = ({ type, color, icon: Icon, label }) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{label}</span>
            <div style={{ display: 'flex', gap: '4px' }}>
                {[1, 2, 3].map(lvl => (
                    <button 
                        key={lvl}
                        className="btn btn-secondary" 
                        onClick={() => handleMove(`${type}_${lvl}`)}
                        style={{ 
                            padding: '6px 10px',
                            fontSize: '0.8rem',
                            borderColor: color, 
                            color: color,
                            background: animType === `${type}_${lvl}` ? `${color}22` : 'transparent'
                        }}
                    >
                        lvl {lvl}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="animate-fade-in" style={{ paddingTop: '70px', paddingLeft: 'var(--space-md)', paddingRight: 'var(--space-md)', paddingBottom: 'var(--space-xl)' }}>
            <div className="page-header" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Swords size={32} color="#ef4444" />
                    Combat Arena (v2 - Levels)
                </h1>
                <p className="page-subtitle">Test del nuovo sistema a 3 livelli su Punto B</p>
            </div>

            <div className="card" style={{ padding: 'var(--space-xl)', background: 'var(--bg-card)', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                    perspective: '1000px',
                    width: '100%',
                    height: '400px',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-around',
                    marginBottom: 'var(--space-xl)',
                    background: 'radial-gradient(circle at 50% 50%, rgba(45, 45, 143, 0.1) 0%, transparent 70%)',
                    borderRadius: 'var(--radius-xl)'
                }}>
                    <div className="pokemon-slot" ref={playerPkmnRef} style={{ position: 'relative', zIndex: 2 }}>
                        <img 
                            src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png" 
                            alt="Charmander" 
                            className="pokemon-sprite animate-float"
                            style={{ width: '150px', height: '150px', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))' }}
                        />
                        <div style={{ position: 'absolute', bottom: '-10px', left: '25px', width: '100px', height: '20px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '50%', filter: 'blur(5px)' }}></div>
                    </div>

                    <div style={{ zIndex: 1, position: 'absolute', left: '50%', transform: 'translateX(-50%)', opacity: 0.2 }}>
                        <Swords size={120} color="var(--accent-primary)" />
                    </div>

                    <div className="pokemon-slot" ref={opponentPkmnRef} style={{ position: 'relative', zIndex: 2 }}>
                        <img 
                            src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png" 
                            alt="Bulbasaur" 
                            className="pokemon-sprite animate-float" 
                            style={{ width: '150px', height: '150px', transform: 'scaleX(-1)', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))' }}
                        />
                        <div style={{ position: 'absolute', bottom: '-10px', left: '25px', width: '100px', height: '20px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '50%', filter: 'blur(5px)' }}></div>
                    </div>

                    <BattleAnimations 
                        trigger={trigger}
                        type={animType}
                        endPos={{ x: window.innerWidth > 800 ? 550 : 250, y: 180 }} 
                    />
                </div>

                <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)', minHeight: '1.5em' }}>
                    <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontWeight: '500' }}>{battleLog}</p>
                </div>

                <div className="flex-center" style={{ gap: 'var(--space-xl)', flexWrap: 'wrap', background: 'rgba(0,0,0,0.05)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-lg)' }}>
                    <MoveButton type="fire" color="#ef4444" icon={Flame} label="Fuoco" />
                    <MoveButton type="water" color="#3b82f6" icon={Droplets} label="Acqua" />
                    <MoveButton type="grass" color="#10b981" icon={Leaf} label="Erba" />
                    <MoveButton type="physical" color="#eab308" icon={Target} label="Fisico" />
                </div>
            </div>

            <div className="card" style={{ marginTop: 'var(--space-xl)', border: '1px dashed var(--border-subtle)', background: 'transparent' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>
                    📌 <strong>Logica Aggiornata:</strong> Le mosse ora hanno 3 livelli di intensità. 
                    L'origine è fissata sul bersaglio (Punto B) per massimizzare l'impatto visivo e semplificare la gestione delle traiettorie.
                    Utilizza <code>fire_1</code>, <code>fire_2</code>, <code>fire_3</code> ecc.
                </p>
            </div>
        </div>
    );
}
