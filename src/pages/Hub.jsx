import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PokeballLogo from '../components/PokeballLogo';
import './Arena.css';

const POKEMON_SPRITE_BASE = 'https://play.pokemonshowdown.com/sprites/ani/';

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

const PokemonToken = ({ pokemon, side }) => {
    const spriteName = (pokemon.nome_originale || pokemon.nome).toLowerCase().replace(' ', '');
    const spriteUrl = `${POKEMON_SPRITE_BASE}${spriteName}.gif`;

    return (
        <div className={`pokemon-token-wrapper ${pokemon.is_damaged ? 'animate-shake' : ''} ${side}`}>
            {/* Se è Master, la Card sta SOPRA lo sprite */}
            {side === 'master' && <CombatantCard pokemon={pokemon} />}

            <div className="pokemon-token-main">
                <div className="token-inner">
                    <img 
                        src={spriteUrl} 
                        alt={pokemon.nome} 
                        className={!pokemon.immagine_url?.includes('githubusercontent') ? 'is-custom' : ''}
                        onError={(e) => {
                            e.target.src = pokemon.immagine_url;
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
            <div className="arena-tier master-tier" style={{ '--count': masterPokemon.length }}>
                {masterPokemon.map(p => (
                    <PokemonToken key={p.id} pokemon={p} side="master" />
                ))}
            </div>

            {/* AREA CENTRALE DI DISTANZA */}
            <div className="arena-clash-zone" />

            {/* LATO PLAYER (Sotto) */}
            <div className="arena-tier player-tier" style={{ '--count': playerPokemon.length }}>
                {playerPokemon.map(p => (
                    <PokemonToken key={p.id} pokemon={p} side="player" />
                ))}
            </div>
        </div>
    );
}
