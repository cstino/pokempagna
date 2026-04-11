import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Swords, Power, Users, Shield, Zap, Heart, Trash2, Plus, Users2, Search, Loader2 } from 'lucide-react';
import './Battaglia.css';

export default function Battaglia() {
    const { profile } = useAuth();
    const [battleState, setBattleState] = useState(null);
    const [loading, setLoading] = useState(true);
    const [players, setPlayers] = useState([]);
    const [npcs, setNpcs] = useState([]);
    const [allPokemon, setAllPokemon] = useState([]);
    
    // Filtri per la selezione
    const [selectedEntityId, setSelectedEntityId] = useState(null);
    const [entityType, setEntityType] = useState('player'); // 'player' | 'npc'

    useEffect(() => {
        caricaDatiBattaglia();
        caricaEntita();
        
        const channel = supabase
            .channel('battaglia-panel')
            .on('postgres_changes', { event: '*', table: 'battaglia_attiva' }, () => caricaDatiBattaglia())
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, []);

    const caricaDatiBattaglia = async () => {
        const { data } = await supabase.from('battaglia_attiva').select('*').single();
        setBattleState(data);
        setLoading(false);
    };

    const caricaEntita = async () => {
        // Carica Giratori (Player + NPC)
        const { data: enti } = await supabase
            .from('giocatori')
            .select('*')
            .eq('campagna_corrente_id', profile.campagna_corrente_id);
        
        setPlayers(enti.filter(e => e.ruolo === 'giocatore'));
        setNpcs(enti.filter(e => e.ruolo === 'npc'));

        // Carica tutti i Pokémon della campagna
        const { data: pokes } = await supabase
            .from('pokemon_giocatore')
            .select('*');
        setAllPokemon(pokes || []);
    };

    const toggleArena = async () => {
        const newState = !battleState.attiva;
        await supabase
            .from('battaglia_attiva')
                .update({ attiva: newState, pokemon_in_campo: newState ? battleState.pokemon_in_campo : [] })
            .eq('id', battleState.id);
    };

    const mandaInCampo = async (pokemon, side) => {
        const nuovoInCampo = [
            ...(battleState.pokemon_in_campo || []),
            {
                id: pokemon.id,
                nome: pokemon.nome,
                pokemon_id: pokemon.pokemon_id,
                hp: pokemon.hp,
                hp_max: pokemon.hp_max,
                livello: pokemon.livello,
                immagine_url: pokemon.immagine_url,
                side: side,
                is_damaged: false
            }
        ];

        await supabase
            .from('battaglia_attiva')
            .update({ pokemon_in_campo: nuovoInCampo })
            .eq('id', battleState.id);
    };

    const rimuoviDalCampo = async (id) => {
        const nuovoInCampo = battleState.pokemon_in_campo.filter(p => p.id !== id);
        await supabase
            .from('battaglia_attiva')
            .update({ pokemon_in_campo: nuovoInCampo })
            .eq('id', battleState.id);
    };

    const applicaDanno = async (id, ammontare) => {
        const nuovoInCampo = battleState.pokemon_in_campo.map(p => {
            if (p.id === id) {
                const newHp = Math.max(0, p.hp - ammontare);
                return { ...p, hp: newHp, is_damaged: true };
            }
            return p;
        });

        // Prima applichiamo l'animazione di danno
        await supabase
            .from('battaglia_attiva')
            .update({ pokemon_in_campo: nuovoInCampo })
            .eq('id', battleState.id);

        // Dopo un secondo rimuoviamo il flag dell'animazione
        setTimeout(async () => {
            const resetInCampo = nuovoInCampo.map(p => ({ ...p, is_damaged: false }));
            await supabase
                .from('battaglia_attiva')
                .update({ pokemon_in_campo: resetInCampo })
                .eq('id', battleState.id);
        }, 800);
    };

    if (loading) return <div className="flex-center p-3xl"><Loader2 className="spin" /></div>;

    return (
        <div className="battaglia-master-container animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <Swords size={32} color="#ef4444" />
                        Pannello Battaglia
                    </h1>
                    <p className="page-subtitle">Controlla l'Arena proiettata sul tavolo</p>
                </div>
                <button 
                    className={`btn-arena-toggle ${battleState?.attiva ? 'active' : ''}`}
                    onClick={toggleArena}
                >
                    <Power size={18} />
                    {battleState?.attiva ? 'ARENA ATTIVA' : 'ATTIVA ARENA'}
                </button>
            </div>

            <div className="battaglia-grid">
                {/* 1. SELETTORE COMBATTENTI */}
                <div className="battle-panel-card selection-panel">
                    <div className="panel-header">
                        <Users2 size={20} />
                        <h2>Selezione Combattenti</h2>
                    </div>
                    
                    <div className="entity-tabs">
                        <button 
                            className={entityType === 'player' ? 'active' : ''} 
                            onClick={() => { setEntityType('player'); setSelectedEntityId(null); }}
                        >
                            Giocatori
                        </button>
                        <button 
                            className={entityType === 'npc' ? 'active' : ''} 
                            onClick={() => { setEntityType('npc'); setSelectedEntityId(null); }}
                        >
                            NPC / Nemici
                        </button>
                    </div>

                    <div className="entity-list">
                        {(entityType === 'player' ? players : npcs).map(e => (
                            <div 
                                key={e.id} 
                                className={`entity-item ${selectedEntityId === e.id ? 'selected' : ''}`}
                                onClick={() => setSelectedEntityId(e.id)}
                            >
                                <img src={e.immagine_profilo || 'https://via.placeholder.com/40'} alt={e.nome} />
                                <span>{e.nome}</span>
                            </div>
                        ))}
                    </div>

                    {selectedEntityId && (
                        <div className="pokemon-selector animate-slide-up">
                            <h3>Pokémon di { (players.find(p=>p.id===selectedEntityId) || npcs.find(n=>n.id===selectedEntityId))?.nome }</h3>
                            <div className="pokemon-mini-grid">
                                {allPokemon
                                    .filter(p => p.giocatore_id === selectedEntityId)
                                    .map(p => (
                                        <div key={p.id} className="pokemon-select-btn" onClick={() => mandaInCampo(p, entityType === 'player' ? 'player' : 'master')}>
                                            <img src={p.immagine_url} alt={p.nome} />
                                            <span>{p.nome}</span>
                                            <Plus size={14} />
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. GESTIONE CAMPO (Sincronizzato con HUB) */}
                <div className="battle-panel-card field-panel">
                    <div className="panel-header">
                        <Shield size={20} />
                        <h2>In Campo (Live Arena)</h2>
                    </div>

                    {!battleState?.attiva ? (
                        <div className="arena-off-msg">
                            L'arena è spenta. Attivala per gestire il campo.
                        </div>
                    ) : (
                        <div className="field-management">
                            <div className="field-side-group">
                                <label>Lato Master (Sopra - Ruotati 180°)</label>
                                {(battleState.pokemon_in_campo || []).filter(p => p.side === 'master').map(p => (
                                    <div key={p.id} className="pkmn-field-item master">
                                        <div className="pkmn-field-info">
                                            <img src={p.immagine_url} width={30} />
                                            <span><strong>{p.nome}</strong> | {p.hp}/{p.hp_max} HP</span>
                                        </div>
                                        <div className="pkmn-field-actions">
                                            <button className="btn-damage" onClick={() => applicaDanno(p.id, 10)}>-10 HP</button>
                                            <button className="btn-remove" onClick={() => rimuoviDalCampo(p.id)}><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="field-side-group">
                                <label>Lato Giocatori (Sotto - Normali)</label>
                                {(battleState.pokemon_in_campo || []).filter(p => p.side === 'player').map(p => (
                                    <div key={p.id} className="pkmn-field-item player">
                                        <div className="pkmn-field-info">
                                            <img src={p.immagine_url} width={30} />
                                            <span><strong>{p.nome}</strong> | {p.hp}/{p.hp_max} HP</span>
                                        </div>
                                        <div className="pkmn-field-actions">
                                            <button className="btn-damage" onClick={() => applicaDanno(p.id, 10)}>-10 HP</button>
                                            <button className="btn-remove" onClick={() => rimuoviDalCampo(p.id)}><Trash2 size={14} /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
