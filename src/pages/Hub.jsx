import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PokeballLogo from '../components/PokeballLogo';
import './Arena.css';


const CombatantCard = ({ pokemon }) => {
    const hpPercentage = (pokemon.hp / pokemon.hp_max) * 100;
    
    const getHpColor = () => {
        if (hpPercentage > 50) return '#22c55e'; // Verde
        if (hpPercentage > 20) return '#eab308'; // Giallo/Arancio
        return '#ef4444'; // Rosso
    };

    return (
        <div className="combatant-hud animate-fade-in">
            <div className="hud-header">
                <span className="hud-name">{pokemon.nome}</span>
                <span className="hud-lv">Lv.{pokemon.livello}</span>
            </div>
            
            <div className="hud-hp-container">
                <div className="hud-hp-bg">
                    <div 
                        className="hud-hp-fill" 
                        style={{ 
                            width: `${hpPercentage}%`,
                            backgroundColor: getHpColor(),
                            boxShadow: `0 0 10px ${getHpColor()}`
                        }} 
                    />
                </div>
                <div className="hud-hp-text">
                    {pokemon.hp} / {pokemon.hp_max} HP
                </div>
            </div>
        </div>
    );
};

// --- CONFIGURAZIONE VISIVA ---
const USE_GIFS = true; // Imposta a 'false' per tornare alle immagini HD
// -----------------------------

const PokemonTokenAnimated = ({ pokemon, side }) => {
    // Calcolo dell'immagine: GIF 3D HD (xyani) o Artwork HD con fallback
    let imageUrl = pokemon.immagine_url;
    let isGif = false;

    // Se le GIF sono attive, usiamo il server 'xyani' che contiene i modelli 3D nitidi
    if (USE_GIFS && pokemon.nome) {
        const cleanName = (pokemon.nome_originale || pokemon.nome).toLowerCase().split(' ')[0].replace(/[^a-z0-9]/g, '');
        //xyani è il server per le animazioni 3D moderne
        imageUrl = `https://play.pokemonshowdown.com/sprites/xyani/${cleanName}.gif`;
        isGif = true;
    }
    
    // Refresh forzato v7: Logica XY-ANI 3D
    
    const h = parseFloat(pokemon.altezza) || 1.1;
    let sizeMulti = 1.0;
    
    if (h < 0.6) {
        sizeMulti = 0.75; // PICCOLI (es. Pikachu)
    } else if (h < 1.1) {
        sizeMulti = 0.95; // MEDIO-PICCOLI (es. Wartortle, Bulbasaur)
    } else if (h < 1.6) {
        sizeMulti = 1.15; // MEDIO-GRANDI (es. Lucario, Pidgeot)
    } else {
        sizeMulti = 1.40; // GRANDI/GIGANTI (es. Charizard, M'Adame, Gyarados)
    }

    return (
        <div 
            className={`pokemon-token-wrapper ${pokemon.is_damaged ? 'animate-shake' : ''} ${side}`}
            style={{ '--size-multi': sizeMulti }}
        >
            {/* Se è Master, la Card sta SOPRA lo sprite */}
            {side === 'master' && <CombatantCard pokemon={pokemon} />}

            <div className="pokemon-token-v4">
                <div className="token-inner">
                    <img 
                        src={imageUrl} 
                        alt={pokemon.nome} 
                        className={`pokemon-sprite ${isGif ? 'is-gif' : 'is-hd'} ${pokemon.pokedex_id >= 1000 ? 'is-custom' : ''}`}
                        onError={(e) => {
                            // Fallback se la GIF non esiste
                            if (isGif) {
                                e.target.src = pokemon.immagine_url;
                                e.target.classList.remove('is-gif');
                                e.target.classList.add('is-hd');
                            }
                        }}
                    />
                </div>
            </div>

            {/* Se è Player, la Card sta SOTTO lo sprite */}
            {side === 'player' && <CombatantCard pokemon={pokemon} />}
        </div>
    );
};

export default function Hub() {
    const [battleState, setBattleState] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        caricaDatiBattaglia();
        
        const channel = supabase
            .channel('battle-hub')
            .on('postgres_changes', { event: '*', table: 'battaglia_attiva' }, () => caricaDatiBattaglia())
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    const caricaDatiBattaglia = async () => {
        const { data } = await supabase.from('battaglia_attiva').select('*').single();
        setBattleState(data);
        setLoading(false);
    };

    if (loading) return (
        <div className="arena-fullscreen flex-center bg-dark">
            <PokeballLogo size={80} />
        </div>
    );

    if (!battleState?.attiva) {
        return (
            <div className="arena-fullscreen">
                <div className="arena-standby animate-fade-in">
                    <div className="arena-pokeball-pulse">
                        <PokeballLogo size={120} />
                    </div>
                    <div className="arena-logo-big">POKÉMPAGNA</div>
                    <p className="standby-text">In attesa che il Master inizi il combattimento...</p>
                </div>
            </div>
        );
    }

    const masterPokemon = (battleState.pokemon_in_campo || []).filter(p => p.side === 'master');
    const playerPokemon = (battleState.pokemon_in_campo || []).filter(p => p.side === 'player');

    // Mappa sfondi
    const bgMap = {
        arena: '/assets/arena-bg.png',
        forest: '/assets/terrain-forest.png',
        cave: '/assets/terrain-cave.png',
        city: '/assets/terrain-city.png',
        water: '/assets/terrain-water.png'
    };

    const currentBg = bgMap[battleState.sfondo] || bgMap.arena;

    return (
        <div className="arena-fullscreen arena-battle-view" style={{ backgroundImage: `url(${currentBg})` }}>
            <div className="arena-overlay" />
            
            {/* LATO MASTER (Sopra) */}
            <div className="arena-tier master-tier" style={{ '--count': battleState.pokemon_in_campo.filter(p => p.side === 'master').length }}>
                {battleState.pokemon_in_campo
                    .filter(p => p.side === 'master')
                    .map(p => (
                        <PokemonTokenAnimated key={p.id} pokemon={p} side="master" />
                    ))
                }
            </div>

            {/* Zona Scontro (Centrale) */}
            <div className="arena-clash-zone">
                {/* Eventuali effetti o log di battaglia */}
            </div>

            {/* Fascia Player (Sotto) */}
            <div className="arena-tier player-tier" style={{ '--count': battleState.pokemon_in_campo.filter(p => p.side === 'player').length }}>
                {battleState.pokemon_in_campo
                    .filter(p => p.side === 'player')
                    .map(p => (
                        <PokemonTokenAnimated key={p.id} pokemon={p} side="player" />
                    ))
                }
            </div>
        </div>
    );
}
