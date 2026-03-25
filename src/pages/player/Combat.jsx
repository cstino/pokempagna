import { useState, useRef } from 'react';
import { Swords, Zap, Flame, Droplets, Target } from 'lucide-react';
import BattleAnimations from '../../components/animations/BattleAnimations';

export default function Combat() {
    const playerPkmnRef = useRef(null);
    const opponentPkmnRef = useRef(null);
    const [trigger, setTrigger] = useState(0);
    const [animType, setAnimType] = useState('flamethrower');
    const [battleLog, setBattleLog] = useState("Arena Pronta! Scegli una mossa per testare l'animazione.");

    const handleMove = (type) => {
        setAnimType(type);
        setTrigger(prev => prev + 1);
        
        switch(type) {
            case 'doublekick':
                setBattleLog("Pokémon usa Azione (Doppio Calcio)!");
                break;
            case 'flamethrower':
                setBattleLog("Pokémon usa Lanciafiamme!");
                break;
            case 'watergun':
                setBattleLog("Pokémon usa Pistola d'Acqua!");
                break;
            case 'leafblade':
                setBattleLog("Pokémon usa Foglia Lama!");
                break;
            default:
                break;
        }
    };

    return (
        <div className="animate-fade-in" style={{ paddingTop: '70px', paddingLeft: 'var(--space-md)', paddingRight: 'var(--space-md)' }}>
            <div className="page-header" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Swords size={32} color="#ef4444" />
                    Combat Arena (Classic Toon)
                </h1>
                <p className="page-subtitle">Test delle animazioni ufficiali di Pokémpagna</p>
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
                    {/* Player Pokemon */}
                    <div className="pokemon-slot" ref={playerPkmnRef} style={{ position: 'relative', zIndex: 2 }}>
                        <img 
                            src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png" 
                            alt="Charmander" 
                            className="pokemon-sprite animate-float"
                            style={{ width: '150px', height: '150px', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))' }}
                        />
                        <div style={{ position: 'absolute', bottom: '-10px', left: '25px', width: '100px', height: '20px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '50%', filter: 'blur(5px)' }}></div>
                    </div>

                    <div style={{ zIndex: 5, color: 'var(--accent-primary)', opacity: 0.5 }}>
                        <Swords size={40} />
                    </div>

                    {/* Opponent Pokemon */}
                    <div className="pokemon-slot" ref={opponentPkmnRef} style={{ position: 'relative', zIndex: 2 }}>
                        <img 
                            src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png" 
                            alt="Bulbasaur" 
                            className="pokemon-sprite animate-float" 
                            style={{ width: '150px', height: '150px', transform: 'scaleX(-1)', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))' }}
                        />
                        <div style={{ position: 'absolute', bottom: '-10px', left: '25px', width: '100px', height: '20px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '50%', filter: 'blur(5px)' }}></div>
                    </div>

                    {/* Overlay Animazioni Ufficiali */}
                    <BattleAnimations 
                        trigger={trigger}
                        type={animType}
                        startPos={{ x: 200, y: 200 }} // Approssimativamente la posizione del primo slot
                        endPos={{ x: 600, y: 200 }}   // Approssimativamente la posizione del secondo slot
                    />
                </div>

                <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)', minHeight: '1.5em' }}>
                    <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{battleLog}</p>
                </div>

                <div className="flex-center" style={{ gap: 'var(--space-md)', flexWrap: 'wrap' }}>
                    <button 
                        className="btn btn-primary" 
                        onClick={() => handleMove('doublekick')}
                    >
                        <Target size={18} /> Doppio Calcio
                    </button>
                    <button 
                        className="btn btn-secondary" 
                        onClick={() => handleMove('flamethrower')}
                        style={{ borderColor: 'var(--type-fire)', color: 'var(--type-fire)' }}
                    >
                        <Flame size={18} /> Lanciafiamme
                    </button>
                    <button 
                        className="btn btn-secondary" 
                        onClick={() => handleMove('watergun')}
                        style={{ borderColor: 'var(--type-water)', color: 'var(--type-water)' }}
                    >
                        <Droplets size={18} /> Pistolacqua
                    </button>
                    <button 
                        className="btn btn-secondary" 
                        onClick={() => handleMove('leafblade')}
                        style={{ borderColor: 'var(--type-grass)', color: 'var(--type-grass)' }}
                    >
                        <Zap size={18} /> Foglia Lama
                    </button>
                </div>
            </div>

            <div className="card" style={{ marginTop: 'var(--space-xl)', border: '1px dashed var(--border-subtle)' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Sistema di animazioni <strong>Classic Toon</strong> integrato. 
                    Utilizza filtri SVG Gooey e GSAP per traiettorie fluide in stile "Gommosa".
                </p>
            </div>
        </div>
    );
}
