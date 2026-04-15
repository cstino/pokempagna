import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Swords, Power, Users, Shield, Zap, Heart, Trash2, Plus, Users2, Search, Loader2 } from 'lucide-react';
import LivePokemonCard from '../../components/master/LivePokemonCard';
import './Battaglia.css';

export default function Battaglia() {
    const { profile } = useAuth();
    const [battleState, setBattleState] = useState(null);
    const [clickedPkmn, setClickedPkmn] = useState(null);
    const [loading, setLoading] = useState(true);
    const [players, setPlayers] = useState([]);
    const [npcs, setNpcs] = useState([]);
    const [allPokemon, setAllPokemon] = useState([]);
    
    const [library, setLibrary] = useState([]);
    const [selectedEntityId, setSelectedEntityId] = useState(null);
    const [entityType, setEntityType] = useState('player'); // 'player' | 'npc'

    useEffect(() => {
        caricaDatiBattaglia();
        caricaEntita();
        caricaLibreria();
        
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

    const caricaLibreria = async () => {
        const { data } = await supabase.from('pokemon_campagna').select('*');
        setLibrary(data || []);
    };

    const caricaEntita = async () => {
        // Carica Giratori (Player + NPC)
        const { data: enti } = await supabase
            .from('giocatori')
            .select('*')
            .eq('campagna_corrente_id', profile.campagna_corrente_id);
        
        if (enti) {
            setPlayers(enti.filter(e => e.ruolo === 'giocatore'));
            setNpcs(enti.filter(e => e.ruolo === 'npc'));
        }

        // Carica tutti i Pokémon della campagna
        const { data: pokes } = await supabase
            .from('pokemon_giocatore')
            .select('*');
        setAllPokemon(pokes || []);
    };

    const terrains = [
        { id: 'arena', name: 'Arena Tech', icon: '🏟️' },
        { id: 'forest', name: 'Bosco Incantato', icon: '🌲' },
        { id: 'cave', name: 'Caverna Cristalli', icon: '💎' },
        { id: 'city', name: 'Città Cyber', icon: '🏙️' },
        { id: 'water', name: 'Costa Tropicale', icon: '🌊' }
    ];

    const toggleArena = async () => {
        const newState = !battleState.attiva;
        await supabase
            .from('battaglia_attiva')
            .update({ attiva: newState })
            .eq('id', battleState.id);
    };

    const cambiaSfondo = async (key) => {
        await supabase
            .from('battaglia_attiva')
            .update({ sfondo: key })
            .eq('id', battleState.id);
    };

    const getPkmnImage = (p) => {
        // 1. Cerchiamo la specie nella libreria della campagna usando l'ID salvato nel pokemon del giocatore
        const specie = library.find(s => s.id === p.pokemon_id);
        
        if (specie) {
            // 2. Se la specie ha un'immagine personalizzata (es. caricata da te), usiamo quella
            if (specie.immagine_url) return specie.immagine_url;
            
            // 3. Altrimenti cerchiamo di estrarre l'ID nazionale dallo sprite_url (es. .../pokemon/6.png -> 6) 
            //    o usiamo l'ID del record se non abbiamo altro
            const nationalId = specie.sprite_url ? specie.sprite_url.split('/').pop().split('.')[0] : specie.id;
            return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${nationalId}.png`;
        }

        // Fallback estremo se non troviamo la specie nella libreria
        if (p.immagine_url) return p.immagine_url;
        return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.pokemon_id}.png`;
    };

    const mandaInCampo = async (pokemon, side) => {
        // Cerchiamo il nome originale nella libreria per lo sprite animato dell'HUB
        const specie = library.find(s => s.id === pokemon.pokemon_id);
        const nomeOriginale = specie ? specie.nome : pokemon.nome;

        // Recuperiamo il nome dell'allenatore dall'entità selezionata
        const entita = players.find(p => p.id === selectedEntityId) || npcs.find(n => n.id === selectedEntityId);
        const nomeAllenatore = entita ? entita.nome : 'Sconosciuto';

        const nuovoInCampo = [
            ...(battleState.pokemon_in_campo || []),
            {
                id: crypto.randomUUID(), 
                original_id: pokemon.id,
                nome: pokemon.nome,
                nome_originale: nomeOriginale,
                allenatore: nomeAllenatore,
                pokemon_id: pokemon.pokemon_id,
                hp: pokemon.hp_attuale || pokemon.hp,
                hp_max: pokemon.hp_max,
                livello: pokemon.livello,
                immagine_url: getPkmnImage(pokemon),
                condizione_stato: pokemon.condizione_stato || null,
                stati_volatili: [],
                modificatori_stat: {
                    attacco: 0,
                    difesa: 0,
                    attacco_speciale: 0,
                    difesa_speciale: 0,
                    velocita: 0,
                    elusione: 0,
                    precisione: 0
                },
                side: side,
                is_damaged: false
            }
        ];

        await supabase
            .from('battaglia_attiva')
            .update({ pokemon_in_campo: nuovoInCampo })
            .eq('id', battleState.id);
    };

    const rimuoviDalCampo = async (instanceId) => {
        const nuovoInCampo = battleState.pokemon_in_campo.filter(p => p.id !== instanceId);
        await supabase
            .from('battaglia_attiva')
            .update({ pokemon_in_campo: nuovoInCampo })
            .eq('id', battleState.id);
    };

    const updateBattleStateLive = async (instanceId, updates) => {
        if (!battleState) return;
        const nuovoInCampo = battleState.pokemon_in_campo.map(p => 
            p.id === instanceId ? { ...p, ...updates } : p
        );
        await supabase
            .from('battaglia_attiva')
            .update({ pokemon_in_campo: nuovoInCampo })
            .eq('id', battleState.id);
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

            {/* SELETTORE TERRENI */}
            <div className="terrain-selector-bar animate-fade-in">
                <label>Ambiente Arena:</label>
                <div className="terrain-options">
                    {terrains.map(t => (
                        <button 
                            key={t.id}
                            className={`terrain-btn ${battleState?.sfondo === t.id ? 'active' : ''}`}
                            onClick={() => cambiaSfondo(t.id)}
                            title={t.name}
                        >
                            <span className="t-icon">{t.icon}</span>
                            <span className="t-name">{t.name}</span>
                        </button>
                    ))}
                </div>
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
                                <div className="entity-avatar">
                                    {e.immagine_profilo ? (
                                        <img src={e.immagine_profilo} alt={e.nome} />
                                    ) : (
                                        <div className="avatar-placeholder">{e.nome[0]}</div>
                                    )}
                                </div>
                                <span>{e.nome}</span>
                            </div>
                        ))}
                    </div>

                    {selectedEntityId && (
                        <div className="pokemon-selector animate-slide-up">
                            <h3>Squadra di { (players.find(p=>p.id===selectedEntityId) || npcs.find(n=>n.id===selectedEntityId))?.nome }</h3>
                            <div className="pokemon-mini-grid">
                                {allPokemon
                                    .filter(p => {
                                        if (p.giocatore_id !== selectedEntityId) return false;
                                        const entita = players.find(e => e.id === selectedEntityId) || npcs.find(e => e.id === selectedEntityId);
                                        const limit = entita?.slot_squadra || 3;
                                        return p.posizione_squadra < limit;
                                    })
                                    .map(p => (
                                        <div key={p.id} className="pokemon-select-btn" onClick={() => mandaInCampo(p, entityType === 'player' ? 'player' : 'master')}>
                                            <img src={getPkmnImage(p)} alt={p.nome} />
                                            <span>{p.nome}</span>
                                            <Plus size={14} />
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. GESTIONE CAMPO (Sempre visibile per il Master) */}
                <div className="battle-panel-card field-panel">
                    <div className="panel-header">
                        <Shield size={20} />
                        <h2>In Campo (Live Arena)</h2>
                        {!battleState?.attiva && <span className="status-badge-off">OFFLINE</span>}
                        {battleState?.attiva && <span className="status-badge-on">LIVE</span>}
                    </div>

                    <div className="field-management">
                        <div className="field-side-group">
                            <label>Lato Master (Sopra - Ruotati 180°)</label>
                            {(battleState.pokemon_in_campo || []).filter(p => p.side === 'master').length === 0 && (
                                <div className="empty-field-hint">Nessun nemico in campo</div>
                            )}
                            {(battleState.pokemon_in_campo || []).filter(p => p.side === 'master').map(p => (
                                <div key={p.id} className="pkmn-field-item master hoverable transition-transform" onClick={() => setClickedPkmn(p)} style={{ cursor: 'pointer' }}>
                                    <div className="pkmn-field-info">
                                        <img src={p.immagine_url} width={30} />
                                        <span><strong>{p.nome}</strong> | {p.hp}/{p.hp_max} HP</span>
                                    </div>
                                    <div className="pkmn-field-actions">
                                        <button className="btn-remove" onClick={(e) => { e.stopPropagation(); rimuoviDalCampo(p.id); }}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="field-side-group">
                            <label>Lato Giocatori (Sotto - Normali)</label>
                            {(battleState.pokemon_in_campo || []).filter(p => p.side === 'player').length === 0 && (
                                <div className="empty-field-hint">Nessun alleato in campo</div>
                            )}
                            {(battleState.pokemon_in_campo || []).filter(p => p.side === 'player').map(p => (
                                <div key={p.id} className="pkmn-field-item player hoverable transition-transform" onClick={() => setClickedPkmn(p)} style={{ cursor: 'pointer' }}>
                                    <div className="pkmn-field-info">
                                        <img src={p.immagine_url} width={30} />
                                        <span><strong>{p.nome}</strong> | {p.hp}/{p.hp_max} HP</span>
                                    </div>
                                    <div className="pkmn-field-actions">
                                        <button className="btn-remove" onClick={(e) => { e.stopPropagation(); rimuoviDalCampo(p.id); }}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {clickedPkmn && (
                <LivePokemonCard 
                    pokemonId={clickedPkmn.original_id}
                    tableName={clickedPkmn.side === 'master' ? 'pokemon_nemici' : 'pokemon_giocatore'}
                    onClose={() => setClickedPkmn(null)}
                    isBattleMode={true}
                    battleStateId={battleState?.id}
                    battleInstanceId={clickedPkmn.id}
                    pokemonInCampo={battleState?.pokemon_in_campo?.find(x => x.id === clickedPkmn.id)}
                    updateBattleState={updateBattleStateLive}
                />
            )}
        </div>
    );
}
