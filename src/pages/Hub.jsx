import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PokeballLogo from '../components/PokeballLogo';
import './Arena.css';

const POKEMON_SPRITE_BASE = 'https://play.pokemonshowdown.com/sprites/ani/';

const PokemonArenaCard = ({ pokemon, side }) => {
    if (!pokemon) return null;

    const hpPercent = (pokemon.hp / pokemon.hp_max) * 100;
    const hpColorClass = hpPercent > 50 ? '' : hpPercent > 20 ? 'warning' : 'danger';
    
    // Pulizia nome per lo sprite (es: Pikachu -> pikachu)
    const spriteName = (pokemon.nome_originale || pokemon.nome).toLowerCase().replace(' ', '');
    const spriteUrl = `${POKEMON_SPRITE_BASE}${spriteName}.gif`;

    return (
        <div className={`pokemon-arena-card ${pokemon.is_damaged ? 'taking-damage' : ''}`}>
            <div className="arena-sprite-container">
                <div className="arena-platform" />
                <img 
                    src={spriteUrl} 
                    alt={pokemon.nome} 
                    onError={(e) => {
                        // Fallback se lo sprite animato non esiste
                        e.target.src = pokemon.immagine_url;
                    }}
                />
            </div>
            
            <div className="arena-info-box">
                <div className="arena-name">
                    <span>{pokemon.nome}</span>
                    <span>Lv.{pokemon.livello}</span>
                </div>
                <div className="arena-hp-bar-bg">
                    <div 
                        className={`arena-hp-bar-fill ${hpColorClass}`}
                        style={{ width: `${hpPercent}%` }}
                    />
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.7rem', color: 'white', marginTop: '4px', opacity: 0.8 }}>
                    {pokemon.hp} / {pokemon.hp_max} HP
                </div>
            </div>
        </div>
    );
};

export default function Hub() {
    const [battleState, setBattleState] = useState(null);
    const [masterPokemon, setMasterPokemon] = useState([]);
    const [playerPokemon, setPlayerPokemon] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchBattleData = async () => {
        try {
            const { data: battle, error: bError } = await supabase
                .from('battaglia_attiva')
                .select('*')
                .single();

            if (bError) throw bError;
            setBattleState(battle);

            if (battle.attiva) {
                const inCampo = battle.pokemon_in_campo || [];
                setMasterPokemon(inCampo.filter(p => p.side === 'master'));
                setPlayerPokemon(inCampo.filter(p => p.side === 'player'));
            }
        } catch (err) {
            console.error('Errore fetch Arena:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBattleData();

        const channel = supabase
            .channel('arena_sync')
            .on('postgres_changes', { event: '*', table: 'battaglia_attiva' }, () => {
                fetchBattleData();
            })
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    if (loading) return <div className="arena-container flex-center"><div className="spinner" /></div>;

    if (!battleState?.attiva) {
        return (
            <div className="arena-container flex-center">
                <div className="arena-standby animate-fade-in">
                    <div className="arena-pokeball-pulse">
                        <PokeballLogo size={120} />
                    </div>
                    <div className="arena-logo-big">POKÉMPAGNA</div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.6 }}>
                        In attesa che il Master inizi il combattimento...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="arena-container animate-fade-in">
            <div className="arena-divider" />

            {/* LATO MASTER (Ruotato 180°) */}
            <div className="arena-side master">
                {masterPokemon.map(p => (
                    <PokemonArenaCard key={p.id} pokemon={p} side="master" />
                ))}
            </div>

            {/* LATO GIOCATORI (Normale) */}
            <div className="arena-side player">
                {playerPokemon.map(p => (
                    <PokemonArenaCard key={p.id} pokemon={p} side="player" />
                ))}
            </div>
        </div>
    );
}
