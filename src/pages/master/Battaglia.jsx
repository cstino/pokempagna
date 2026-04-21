import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Swords, Power, Users, Shield, Zap, Heart, Trash2, Plus, Users2, Search, Loader2, ChevronLeft, ChevronRight, Info, Clock, CheckCircle2, ChevronDown, Check } from 'lucide-react';
import { getTypeColor, getTypeIcon, getTypeLabel } from '../../lib/typeColors';
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
    
    // Selection State for Upper Side
    const [upperEntityId, setUpperEntityId] = useState(null);
    const [upperEntityType, setUpperEntityType] = useState('player'); // 'player' | 'npc'
    const [isUpperOpen, setIsUpperOpen] = useState(false);
    
    // Selection State for Lower Side
    const [lowerEntityId, setLowerEntityId] = useState(null);
    const [lowerEntityType, setLowerEntityType] = useState('player'); // 'player' | 'npc'
    const [isLowerOpen, setIsLowerOpen] = useState(false);
    
    // Master Combat Console State
    const [activeMasterIndex, setActiveMasterIndex] = useState(0);
    const [masterMoves, setMasterMoves] = useState([]);
    const [loadingMoves, setLoadingMoves] = useState(false);
    const [pendingMasterMove, setPendingMasterMove] = useState(null);
    const [selectedMasterTargets, setSelectedMasterTargets] = useState([]);
    const [infoMoveMaster, setInfoMoveMaster] = useState(null);

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
    
    const masterInField = (battleState?.pokemon_in_campo || []).filter(p => p.side === 'master' || p.side === 'upper');
    const activeMasterPkmn = masterInField[activeMasterIndex] || null;

    useEffect(() => {
        if (activeMasterPkmn) {
            caricaMosseMaster(activeMasterPkmn);
        } else {
            setMasterMoves([]);
        }
    }, [activeMasterPkmn?.id]);

    const caricaMosseMaster = async (pkmn) => {
        setLoadingMoves(true);
        try {
            const { data, error } = await supabase
                .from('mosse_pokemon')
                .select(`
                    *,
                    info:mosse_disponibili (
                        descrizione,
                        categoria,
                        pp_max,
                        dadi,
                        accuratezza,
                        effetto,
                        priorita
                    )
                `)
                .eq('pokemon_giocatore_id', pkmn.original_id);
            
            if (error) throw error;
            setMasterMoves((data || []).filter(m => m.attiva));
        } catch (err) {
            console.error("Errore caricaMosseMaster:", err);
            setMasterMoves([]);
        } finally {
            setLoadingMoves(false);
        }
    };

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
        const entita = players.find(p => p.id === pokemon.giocatore_id) || npcs.find(n => n.id === pokemon.giocatore_id);
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
                side: side === 'upper' ? 'master' : 'player',
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

    const toggleHaAgito = async (instanceId) => {
        const pkmn = battleState.pokemon_in_campo.find(x => x.id === instanceId);
        if (!pkmn) return;
        await updateBattleStateLive(instanceId, { ha_agito: !pkmn.ha_agito });
    };

    const svuotaTurni = async () => {
        if (!window.confirm("Sei sicuro di voler svuotare la coda dei turni?")) return;
        const resetCampo = (battleState.pokemon_in_campo || []).map(p => ({ ...p, ha_agito: false }));
        await supabase
            .from('battaglia_attiva')
            .update({ 
                mosse_in_coda: [],
                pokemon_in_campo: resetCampo 
            })
            .eq('id', battleState.id);
    };

    const confermaMossaMaster = async () => {
        if (!pendingMasterMove || selectedMasterTargets.length === 0) return;

        const movePriority = pendingMasterMove.info?.priorita || 0;
        const pkmnSpeed = activeMasterPkmn.velocita || 0;
        const totalInit = movePriority + pkmnSpeed;

        const nuovaAzione = {
            id: crypto.randomUUID(),
            pkmn_id: activeMasterPkmn.id,
            pkmn_nome: activeMasterPkmn.nome,
            pkmn_livello: activeMasterPkmn.livello,
            allenatore: "LATO MASTER",
            mossa_id: pendingMasterMove.id,
            mossa_nome: pendingMasterMove.nome,
            mossa_tipo: pendingMasterMove.tipo,
            valore_iniziativa: totalInit,
            bersagli: selectedMasterTargets.map(t => t.nome),
            approvata: true
        };

        const nuovaCoda = [...(battleState.mosse_in_coda || []), nuovaAzione];

        await supabase
            .from('battaglia_attiva')
            .update({ mosse_in_coda: nuovaCoda })
            .eq('id', battleState.id);

        setPendingMasterMove(null);
        setSelectedMasterTargets([]);
        setActiveMasterIndex(prev => (prev < masterInField.length - 1 ? prev + 1 : prev));
    };

    const toggleTargetMaster = (target) => {
        if (selectedMasterTargets.find(t => t.id === target.id)) {
            setSelectedMasterTargets(selectedMasterTargets.filter(t => t.id !== target.id));
        } else {
            setSelectedMasterTargets([...selectedMasterTargets, target]);
        }
    };

    const approvaTurno = async (index) => {
        const nuovaCoda = [...(battleState.mosse_in_coda || [])];
        nuovaCoda[index].approvata = true;
        await supabase
            .from('battaglia_attiva')
            .update({ mosse_in_coda: nuovaCoda })
            .eq('id', battleState.id);
    };

    const rimuoviTurno = async (index) => {
        const nuovaCoda = [...(battleState.mosse_in_coda || [])];
        nuovaCoda.splice(index, 1);
        await supabase
            .from('battaglia_attiva')
            .update({ mosse_in_coda: nuovaCoda })
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
                        <h2>Gestione Combattenti</h2>
                    </div>

                    <div className="selection-split-container">
                        {/* SELETTORE LATO SUPERIORE */}
                        <div className="selection-area upper-area">
                            <div className="area-label upper">LATO SUPERIORE (TOP)</div>
                            
                            <div className="entity-tabs mini">
                                <button 
                                    className={upperEntityType === 'player' ? 'active' : ''} 
                                    onClick={() => { setUpperEntityType('player'); setUpperEntityId(null); }}
                                >
                                    Giocatori
                                </button>
                                <button 
                                    className={upperEntityType === 'npc' ? 'active' : ''} 
                                    onClick={() => { setUpperEntityType('npc'); setUpperEntityId(null); }}
                                >
                                    NPC
                                </button>
                            </div>

                            <div className="custom-dropdown-master">
                                <div 
                                    className={`dropdown-trigger-master ${isUpperOpen ? 'open' : ''}`}
                                    onClick={() => setIsUpperOpen(!isUpperOpen)}
                                >
                                    <span>
                                        {upperEntityId 
                                            ? (players.find(p => p.id === upperEntityId) || npcs.find(n => n.id === upperEntityId))?.nome 
                                            : 'Scegli Allenatore...'}
                                    </span>
                                    <ChevronDown size={16} className="arrow-icon" />
                                </div>
                                
                                {isUpperOpen && (
                                    <div className="dropdown-options-master animate-pop-in">
                                        {(upperEntityType === 'player' ? players : npcs).map(e => (
                                            <div 
                                                key={e.id} 
                                                className={`dropdown-option-master ${upperEntityId === e.id ? 'selected' : ''}`}
                                                onClick={() => {
                                                    setUpperEntityId(e.id);
                                                    setIsUpperOpen(false);
                                                }}
                                            >
                                                <div className="option-avatar">
                                                    {e.immagine_profilo ? <img src={e.immagine_profilo} alt="" /> : <div className="avatar-placeholder">{e.nome[0]}</div>}
                                                </div>
                                                <span>{e.nome}</span>
                                                {upperEntityId === e.id && <div className="selected-dot"></div>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {upperEntityId && (
                                <div className="pokemon-mini-grid animate-slide-up">
                                    {allPokemon
                                        .filter(p => p.giocatore_id === upperEntityId)
                                        .filter(p => p.posizione_squadra < ((players.find(e => e.id === upperEntityId) || npcs.find(e => e.id === upperEntityId))?.slot_squadra || 3))
                                        .map(p => (
                                            <div key={p.id} className="pokemon-select-btn" onClick={() => mandaInCampo(p, 'upper')}>
                                                <img src={getPkmnImage(p)} alt={p.nome} />
                                                <span>{p.nome}</span>
                                                <Plus size={14} />
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                        </div>

                        <div className="selection-divider"></div>

                        {/* SELETTORE LATO INFERIORE */}
                        <div className="selection-area lower-area">
                            <div className="area-label lower">LATO INFERIORE (BOTTOM)</div>
                            
                            <div className="entity-tabs mini">
                                <button 
                                    className={lowerEntityType === 'player' ? 'active' : ''} 
                                    onClick={() => { setLowerEntityType('player'); setLowerEntityId(null); }}
                                >
                                    Giocatori
                                </button>
                                <button 
                                    className={lowerEntityType === 'npc' ? 'active' : ''} 
                                    onClick={() => { setLowerEntityType('npc'); setLowerEntityId(null); }}
                                >
                                    NPC
                                </button>
                            </div>

                            <div className="custom-dropdown-master">
                                <div 
                                    className={`dropdown-trigger-master ${isLowerOpen ? 'open' : ''}`}
                                    onClick={() => setIsLowerOpen(!isLowerOpen)}
                                >
                                    <span>
                                        {lowerEntityId 
                                            ? (players.find(p => p.id === lowerEntityId) || npcs.find(n => n.id === lowerEntityId))?.nome 
                                            : 'Scegli Allenatore...'}
                                    </span>
                                    <ChevronDown size={16} className="arrow-icon" />
                                </div>
                                
                                {isLowerOpen && (
                                    <div className="dropdown-options-master animate-pop-in">
                                        {(lowerEntityType === 'player' ? players : npcs).map(e => (
                                            <div 
                                                key={e.id} 
                                                className={`dropdown-option-master ${lowerEntityId === e.id ? 'selected' : ''}`}
                                                onClick={() => {
                                                    setLowerEntityId(e.id);
                                                    setIsLowerOpen(false);
                                                }}
                                            >
                                                <div className="option-avatar">
                                                    {e.immagine_profilo ? <img src={e.immagine_profilo} alt="" /> : <div className="avatar-placeholder">{e.nome[0]}</div>}
                                                </div>
                                                <span>{e.nome}</span>
                                                {lowerEntityId === e.id && <div className="selected-dot"></div>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {lowerEntityId && (
                                <div className="pokemon-mini-grid animate-slide-up">
                                    {allPokemon
                                        .filter(p => p.giocatore_id === lowerEntityId)
                                        .filter(p => p.posizione_squadra < ((players.find(e => e.id === lowerEntityId) || npcs.find(e => e.id === lowerEntityId))?.slot_squadra || 3))
                                        .map(p => (
                                            <div key={p.id} className="pokemon-select-btn" onClick={() => mandaInCampo(p, 'lower')}>
                                                <img src={getPkmnImage(p)} alt={p.nome} />
                                                <span>{p.nome}</span>
                                                <Plus size={14} />
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                        </div>
                    </div>
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
                            <label>Lato Superiore (Top - Ruotati 180°)</label>
                            {masterInField.length === 0 && (
                                <div className="empty-field-hint">Nessun nemico in campo</div>
                            )}
                            {masterInField.map((p, idx) => (
                                <div 
                                    key={p.id} 
                                    className={`pkmn-field-item master hoverable transition-transform ${activeMasterPkmn?.id === p.id ? 'active-combat' : ''}`}
                                    onClick={() => {
                                        setClickedPkmn(p);
                                        setActiveMasterIndex(idx);
                                    }} 
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="pkmn-field-info">
                                        <img src={p.immagine_url} width={30} />
                                        <span><strong>{p.nome}</strong> | {p.hp}/{p.hp_max} HP</span>
                                    </div>
                                    <div className="pkmn-field-actions">
                                        <button 
                                            className={`btn-status-circle ${p.ha_agito ? 'acted' : 'waiting'}`} 
                                            onClick={(e) => { e.stopPropagation(); toggleHaAgito(p.id); }}
                                            title={p.ha_agito ? 'Ha agito' : 'Deve agire'}
                                        />
                                        <button className="btn-remove" onClick={(e) => { e.stopPropagation(); rimuoviDalCampo(p.id); }}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="field-side-group">
                            <label>Lato Inferiore (Bottom - Normali)</label>
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
                                        <button 
                                            className={`btn-status-circle ${p.ha_agito ? 'acted' : 'waiting'}`} 
                                            onClick={(e) => { e.stopPropagation(); toggleHaAgito(p.id); }}
                                            title={p.ha_agito ? 'Ha agito' : 'Deve agire'}
                                        />
                                        <button className="btn-remove" onClick={(e) => { e.stopPropagation(); rimuoviDalCampo(p.id); }}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. MASTER COMBAT CONSOLE */}
            {masterInField.length > 0 && (
                <div className="battle-panel-card master-combat-panel animate-slide-up">
                    <div className="panel-header master-combat-header">
                        <div className="flex-center gap-12">
                            <Zap size={20} className="text-accent" />
                            <h2>Console Mosse Master</h2>
                        </div>
                        
                        {masterInField.length > 1 && (
                            <div className="combat-nav-arrows">
                                <button 
                                    onClick={() => setActiveMasterIndex(prev => (prev > 0 ? prev - 1 : masterInField.length - 1))}
                                    className="nav-arrow-btn"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <span className="nav-index-indicator">{activeMasterIndex + 1} / {masterInField.length}</span>
                                <button 
                                    onClick={() => setActiveMasterIndex(prev => (prev < masterInField.length - 1 ? prev + 1 : 0))}
                                    className="nav-arrow-btn"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="master-combat-content">
                        {activeMasterPkmn && (
                            <div className="active-master-header">
                                <img src={activeMasterPkmn.immagine_url} alt={activeMasterPkmn.nome} className="active-master-img" />
                                <div className="active-master-details">
                                    <span className="name">{activeMasterPkmn.nome}</span>
                                    <span className="trainer">Lato Master | Liv. {activeMasterPkmn.livello}</span>
                                </div>
                            </div>
                        )}

                        <div className="moves-grid-master">
                            {loadingMoves ? (
                                <div className="loading-full"><Loader2 className="spin" /></div>
                            ) : masterMoves.length > 0 ? (
                                masterMoves.map(move => (
                                    <button 
                                        key={move.id} 
                                        className="move-card-master"
                                        style={{ '--type-color': getTypeColor(move.tipo) }}
                                        onClick={() => setPendingMasterMove(move)}
                                    >
                                        <div className="move-type-icon">
                                            <img src={getTypeIcon(move.tipo)} alt={move.tipo} />
                                        </div>
                                        <div className="move-core">
                                            <span className="m-name">{move.nome}</span>
                                            <span className="m-pp">PP {move.pp_attuale}/{move.info?.pp_max || move.pp_max}</span>
                                        </div>
                                        <div className="m-power">
                                            <span>{move.info?.dadi || '--'}</span>
                                        </div>
                                        <div className="move-info-trigger-master" onClick={(e) => {
                                            e.stopPropagation();
                                            setInfoMoveMaster(move);
                                        }}>
                                            <Info size={14} />
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="empty-moves-msg">Nessuna mossa attiva configurata per questo Pokémon.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 4. SEZIONE TURNI */}
            <div className="battle-panel-card turns-panel animate-slide-up" style={{ marginTop: '24px' }}>
                <div className="panel-header turns-header">
                    <div className="flex-center gap-12">
                        <Clock size={20} color="#fbbf24" />
                        <h2>TURNI BATTAGLIA</h2>
                    </div>
                    {battleState?.mosse_in_coda?.length > 0 && (
                        <button className="btn-clear-turns" onClick={svuotaTurni}>
                            <CheckCircle2 size={16} /> FINE TURNO
                        </button>
                    )}
                </div>

                <div className="turns-content">
                    {(!battleState?.mosse_in_coda || battleState.mosse_in_coda.length === 0) ? (
                        <div className="empty-turns-msg">In attesa che gli allenatori pianifichino le mosse...</div>
                    ) : (
                        <div className="turns-list">
                            {(() => {
                                const codaRaw = battleState.mosse_in_coda || [];
                                const allApproved = codaRaw.length > 0 && codaRaw.every(t => t.approvata);

                                // Ordiniamo per iniziativa SOLO se tutto è approvato
                                const displayCoda = allApproved 
                                    ? [...codaRaw].sort((a,b) => b.valore_iniziativa - a.valore_iniziativa)
                                    : codaRaw;

                                return displayCoda.map((t, idx) => {
                                    // Troviamo l'indice originale nella coda per le funzioni di DB
                                    const originalIndex = codaRaw.findIndex(item => item.id === t.id);

                                    return (
                                        <div key={t.id || idx} className={`turn-notification animate-pop-in ${t.approvata ? 'approved' : 'pending'}`}>
                                            <div className="turn-priority-badge">
                                                {t.valore_iniziativa}
                                            </div>
                                            <div className="turn-main-info">
                                                <span className="turn-text">
                                                    <strong>{t.pkmn_nome}</strong> <small>(Lv.{t.pkmn_livello})</small> di <strong>{t.allenatore}</strong> vuole usare 
                                                    <span className="turn-move-highlight" style={{ backgroundColor: getTypeColor(t.mossa_tipo) }}>
                                                        {t.mossa_nome}
                                                    </span> 
                                                    su <strong>{t.bersagli?.join(', ') || 'qualcuno'}</strong>
                                                </span>
                                            </div>
                                            <div className="turn-actions">
                                                {!t.approvata && (
                                                    <button className="btn-approve-turn" onClick={() => approvaTurno(originalIndex)} title="Accetta mossa">
                                                        <Check size={16} />
                                                    </button>
                                                )}
                                                <button className="btn-remove-turn" onClick={() => rimuoviTurno(originalIndex)} title="Rifiuta / Rimuovi">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    )}
                </div>
            </div>

            {/* MODALE INFO MOSSA MASTER */}
            {infoMoveMaster && (
                <div className="modal-overlay" onClick={() => setInfoMoveMaster(null)}>
                    <div className="modal-content info-modal-master" onClick={e => e.stopPropagation()} style={{ maxWidth: '350px' }}>
                        <div className="flex-between" style={{ marginBottom: '15px' }}>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, textTransform: 'uppercase' }}>{infoMoveMaster.nome}</h3>
                            <button onClick={() => setInfoMoveMaster(null)} className="btn-circle">✕</button>
                        </div>
                        <div className="move-pop-meta" style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                            <span className="type-tag" style={{ background: getTypeColor(infoMoveMaster.tipo), color: 'white', padding: '4px 10px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 900 }}>
                                {getTypeLabel(infoMoveMaster.tipo)}
                            </span>
                            <span className="cat-tag" style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 800 }}>
                                {infoMoveMaster.info?.categoria?.toUpperCase()}
                            </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                            <div className="info-box-mini">
                                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)' }}>DADI</span>
                                <span style={{ fontWeight: 800 }}>{infoMoveMaster.info?.dadi || '--'}</span>
                            </div>
                            <div className="info-box-mini">
                                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)' }}>PRECISIONE</span>
                                <span style={{ fontWeight: 800 }}>{infoMoveMaster.info?.accuratezza ? (infoMoveMaster.info.accuratezza.includes('%') ? infoMoveMaster.info.accuratezza : `${infoMoveMaster.info.accuratezza}%`) : '--%'}</span>
                            </div>
                        </div>
                        {infoMoveMaster.info?.effetto && (
                            <div style={{ marginBottom: '12px', fontSize: '0.95rem', color: '#fff', lineHeight: 1.5 }}>
                                {infoMoveMaster.info.effetto}
                            </div>
                        )}
                        {infoMoveMaster.info?.descrizione && (
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.4, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                                "{infoMoveMaster.info.descrizione}"
                            </div>
                        )}
                        {(!infoMoveMaster.info?.effetto && !infoMoveMaster.info?.descrizione) && (
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                Nessuna informazione aggiuntiva disponibile.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* OVERLAY SELEZIONE BERSAGLIO MASTER */}
            {pendingMasterMove && (
                <div className="modal-overlay master-target-selector">
                    <div className="modal-content animate-pop-in">
                        <div className="flex-between" style={{ marginBottom: '20px' }}>
                            <div className="target-select-title">
                                <span style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'uppercase' }}>Bersagli per {activeMasterPkmn?.nome}</span>
                                <h3 style={{ textTransform: 'uppercase', color: getTypeColor(pendingMasterMove.tipo) }}>{pendingMasterMove.nome}</h3>
                            </div>
                            <button onClick={() => setPendingMasterMove(null)} className="btn-circle">✕</button>
                        </div>

                        <div className="target-selection-columns">
                            {/* COLONNA SUPERIORE */}
                            <div className="target-column">
                                <label className="column-label master">LATO SUPERIORE</label>
                                <div className="target-list-inner">
                                    {(battleState?.pokemon_in_campo || [])
                                        .filter(p => p.side === 'master')
                                        .map(p => (
                                        <div 
                                            key={p.id} 
                                            className={`target-card-master ${selectedMasterTargets.find(t => t.id === p.id) ? 'selected' : ''}`}
                                            onClick={() => toggleTargetMaster(p)}
                                        >
                                            <div className="target-img">
                                                <img src={p.immagine_url} width={36} alt={p.nome} />
                                                {p.id === activeMasterPkmn?.id && (
                                                    <span className="active-attacker-dot" title="Attaccante"></span>
                                                )}
                                            </div>
                                            <div className="target-info">
                                                <span className="target-name">{p.nome}</span>
                                                <span className="target-trainer"><i>{p.allenatore}</i></span>
                                            </div>
                                        </div>
                                    ))}
                                    {(battleState?.pokemon_in_campo || []).filter(p => p.side === 'master').length === 0 && (
                                        <div className="empty-col-hint">Nessuno in campo</div>
                                    )}
                                </div>
                            </div>

                            {/* COLONNA INFERIORE */}
                            <div className="target-column">
                                <label className="column-label player">LATO INFERIORE</label>
                                <div className="target-list-inner">
                                    {(battleState?.pokemon_in_campo || [])
                                        .filter(p => p.side === 'player')
                                        .map(p => (
                                        <div 
                                            key={p.id} 
                                            className={`target-card-master player ${selectedMasterTargets.find(t => t.id === p.id) ? 'selected' : ''}`}
                                            onClick={() => toggleTargetMaster(p)}
                                        >
                                            <div className="target-img">
                                                <img src={p.immagine_url} width={36} alt={p.nome} />
                                                {p.id === activeMasterPkmn?.id && (
                                                    <span className="active-attacker-dot" title="Attaccante"></span>
                                                )}
                                            </div>
                                            <div className="target-info">
                                                <span className="target-name">{p.nome}</span>
                                                <span className="target-trainer"><i>{p.allenatore}</i></span>
                                            </div>
                                        </div>
                                    ))}
                                    {(battleState?.pokemon_in_campo || []).filter(p => p.side === 'player').length === 0 && (
                                        <div className="empty-col-hint">Nessuno in campo</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <button 
                            className="btn-confirm-action" 
                            disabled={selectedMasterTargets.length === 0}
                            onClick={confermaMossaMaster}
                        >
                            PIANIFICA AZIONE
                        </button>
                    </div>
                </div>
            )}

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
