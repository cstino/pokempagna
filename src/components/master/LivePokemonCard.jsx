import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Save, TrendingUp, Zap, Info, Shield, Check, Loader2, Flame, Droplets, Snowflake, Moon, Brain, Timer, Skull } from 'lucide-react';
import { getTypeColor, getTypeLabel, getTypeIcon } from '../../lib/typeColors';
import { calculatePokemonStats } from '../../lib/pokemonLogic';
import { STATUS_CONDITIONS, VOLATILE_STATUS, getStatusIcon, getStatusColor } from '../../lib/statusEffects';
import '../../pages/master/Party.css';
import './LivePokemonCard.css';

export default function LivePokemonCard({
    pokemonId, // ID from pokemon_giocatore or pokemon_nemici
    tableName, // 'pokemon_giocatore' or 'pokemon_nemici'
    onClose,
    onSaveSuccess,
    
    // Battle Mode Props
    isBattleMode = false,
    battleStateId = null, // ID of the battle in battaglia_attiva
    battleInstanceId = null, // ID in pokemon_in_campo
    pokemonInCampo = null, // the actual current state of the pokemon in field
    updateBattleState = null // function(instanceId, updates)
}) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingPkmn, setEditingPkmn] = useState(null);
    
    // Libreria Pokedex & Mosse
    const [fullPokeList, setFullPokeList] = useState([]);
    const [allAvailableMoves, setAllAvailableMoves] = useState([]);
    const [selectedPkmnMoveIds, setSelectedPkmnMoveIds] = useState([]);
    
    // UI states
    const [moveSearch, setMoveSearch] = useState('');
    const [moveTypeFilter, setMoveTypeFilter] = useState('all');
    const [showEvoSearch, setShowEvoSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredPokeList, setFilteredPokeList] = useState([]);

    // Battle specific states (live transient stats)
    const [liveCondizioneStato, setLiveCondizioneStato] = useState(null);
    const [liveStatiVolatili, setLiveStatiVolatili] = useState([]);
    const [liveModificatoriStat, setLiveModificatoriStat] = useState({
        attacco: 0, difesa: 0, attacco_speciale: 0, difesa_speciale: 0, velocita: 0, elusione: 0, precisione: 0
    });
    const [volatileInput, setVolatileInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);

    useEffect(() => {
        caricaDatiBase();
        caricaLibreria();
    }, [pokemonId]);

    useEffect(() => {
        if (showEvoSearch && fullPokeList.length === 0) {
            caricaLibreria();
        }
    }, [showEvoSearch]);

    useEffect(() => {
        if (showEvoSearch && fullPokeList.length > 0) {
            setFilteredPokeList(
                fullPokeList.filter(p => p.nome.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }
    }, [searchQuery, fullPokeList, showEvoSearch]);

    // In Battle Mode, sync live states
    useEffect(() => {
        if (isBattleMode && pokemonInCampo) {
            setLiveCondizioneStato(pokemonInCampo.condizione_stato || null);
            setLiveStatiVolatili(pokemonInCampo.stati_volatili || []);
            setLiveModificatoriStat(pokemonInCampo.modificatori_stat || {
                attacco: 0, difesa: 0, attacco_speciale: 0, difesa_speciale: 0, velocita: 0, elusione: 0, precisione: 0
            });
        }
    }, [pokemonInCampo, isBattleMode]);

    async function caricaDatiBase() {
        setLoading(true);
        try {
            // 1. Carica Pokemon dal DB
            const { data: pkmn, error: pErr } = await supabase
                .from('pokemon_giocatore')
                .select('*')
                .eq('id', pokemonId)
                .single();
            if (pErr) throw pErr;

            // 2. Carica mosse assegnate
            const { data: mosseAss, error: mErr } = await supabase
                .from('mosse_pokemon')
                .select('mossa_id')
                .eq('pokemon_giocatore_id', pokemonId);
            if (mErr) throw mErr;
            
            // 3. Tutte le mosse disponibili
            const { data: allMoves } = await supabase.from('mosse_disponibili').select('*').order('nome');

            setEditingPkmn(pkmn);
            setSelectedPkmnMoveIds(mosseAss?.map(m => m.mossa_id) || []);
            setAllAvailableMoves(allMoves || []);
        } catch (error) {
            console.error("Errore init LivePokemonCard:", error);
        } finally {
            setLoading(false);
        }
    }

    async function caricaLibreria() {
        const { data } = await supabase.from('pokemon_campagna').select('*').order('id');
        setFullPokeList(data || []);
    }

    const handlePokeStatChange = (field, value) => {
        setEditingPkmn(prev => ({ ...prev, [field]: value }));
    };

    const toggleMoveAssignment = (moveId, assign) => {
        setSelectedPkmnMoveIds(prev => 
            assign ? [...prev, moveId] : prev.filter(id => id !== moveId)
        );
    };

    const handleEvolve = (nuovaSpecie) => {
        const cal = calculatePokemonStats(nuovaSpecie, editingPkmn.livello, 
            { hp: editingPkmn.iv_hp||0, attacco: editingPkmn.iv_attacco||0, difesa: editingPkmn.iv_difesa||0, attacco_speciale: editingPkmn.iv_attacco_speciale||0, difesa_speciale: editingPkmn.iv_difesa_speciale||0, velocita: editingPkmn.iv_velocita||0 },
            { hp: editingPkmn.ev_hp||0, attacco: editingPkmn.ev_attacco||0, difesa: editingPkmn.ev_difesa||0, attacco_speciale: editingPkmn.ev_attacco_speciale||0, difesa_speciale: editingPkmn.ev_difesa_speciale||0, velocita: editingPkmn.ev_velocita||0 }
        );

        setEditingPkmn(prev => ({
            ...prev,
            pokemon_id: nuovaSpecie.id,
            nome: nuovaSpecie.nome.toUpperCase(),
            tipo1: nuovaSpecie.tipo1.toLowerCase(),
            tipo2: nuovaSpecie.tipo2 ? nuovaSpecie.tipo2.toLowerCase() : null,
            hp_max: cal.hp_max,
            attacco: cal.attacco,
            difesa: cal.difesa,
            attacco_speciale: cal.attacco_speciale,
            difesa_speciale: cal.difesa_speciale,
            velocita: cal.velocita,
            hp_base: nuovaSpecie.hp_base,
            atk_base: nuovaSpecie.atk_base,
            def_base: nuovaSpecie.def_base,
            spatk_base: nuovaSpecie.spatk_base,
            spdef_base: nuovaSpecie.spdef_base,
            speed_base: nuovaSpecie.speed_base
        }));
        setShowEvoSearch(false);
    };

    const salvaPokeStats = async () => {
        setSaving(true);
        try {
            // 1. Salva statistiche permanenti
            const { error: saveErr } = await supabase
                .from('pokemon_giocatore')
                .update(editingPkmn)
                .eq('id', pokemonId);
            if (saveErr) throw saveErr;

            // 2. Salva mosse
            await supabase.from('mosse_pokemon').delete().eq('pokemon_giocatore_id', pokemonId);
            
            if (selectedPkmnMoveIds.length > 0) {
                const movesToInsert = selectedPkmnMoveIds.map(mid => {
                    const mDetails = allAvailableMoves.find(m => m.id === mid);
                    return {
                        pokemon_giocatore_id: pokemonId,
                        mossa_id: mid,
                        nome: mDetails?.nome || 'Mossa',
                        tipo: mDetails?.tipo || 'normale',
                        pp_attuale: mDetails?.pp_max || 20,
                        attiva: true
                    };
                });
                const { error: movesErr } = await supabase.from('mosse_pokemon').insert(movesToInsert);
                if (movesErr) throw movesErr;
            }

            // 3. Se in battaglia, aggiorna gli HP massimi/attuali in diretta sulla scheda
            if (isBattleMode && updateBattleState) {
                updateBattleState(battleInstanceId, {
                    hp: editingPkmn.hp_attuale,
                    hp_max: editingPkmn.hp_max,
                    nome: editingPkmn.nome,
                    condizione_stato: liveCondizioneStato,
                    modificatori_stat: liveModificatoriStat,
                    stati_volatili: liveStatiVolatili
                });
            }

            if (onSaveSuccess) onSaveSuccess();
            onClose();
        } catch (error) {
            console.error("Errore salvataggio:", error);
            alert("Errore salvataggio pokemon.");
        } finally {
            setSaving(false);
        }
    };

    // Gestione LIVE BATTLE STATE
    const handleLiveStatDrop = (stat, amount) => {
        const newValue = Math.min(Math.max((liveModificatoriStat[stat] || 0) + amount, -6), 6);
        const newMods = { ...liveModificatoriStat, [stat]: newValue };
        setLiveModificatoriStat(newMods);
        if (isBattleMode && updateBattleState) updateBattleState(battleInstanceId, { modificatori_stat: newMods });
    };

    const toggleLiveVolatile = (volatileId) => {
        let newVolatiles;
        if (liveStatiVolatili.includes(volatileId)) {
            newVolatiles = liveStatiVolatili.filter(id => id !== volatileId);
        } else {
            newVolatiles = [...liveStatiVolatili, volatileId];
        }
        setLiveStatiVolatili(newVolatiles);
        if (isBattleMode && updateBattleState) updateBattleState(battleInstanceId, { stati_volatili: newVolatiles });
    };

    const setLiveStatus = (statusId) => {
        const newStatus = liveCondizioneStato === statusId ? null : statusId;
        setLiveCondizioneStato(newStatus);
        handlePokeStatChange('condizione_stato', newStatus); // also save permanent if saved
        if (isBattleMode && updateBattleState) updateBattleState(battleInstanceId, { condizione_stato: newStatus });
    };

    if (loading || !editingPkmn) {
        return (
            <div className="modal-overlay flex-center">
                <Loader2 className="spin" size={48} color="white" />
            </div>
        );
    }

    const getPkmnImage = (poke) => {
        if (!poke) return '';
        const spec = fullPokeList.find(s => s.id === poke.pokemon_id) || 
                   fullPokeList.find(s => s.pokemon_id === poke.pokemon_id);
        
        if (spec) {
            if (spec.immagine_url) return spec.immagine_url;
            return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${spec.pokemon_id}.png`;
        }
        return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${poke.pokemon_id}.png`;
    };

    const imageSrc = getPkmnImage(editingPkmn);

    return (
        <div className="modal-overlay custom-live-modal" onClick={onClose}>
            <div className="modal-content master-edit-modal" style={{ width: '900px', maxWidth: '95vw', background: '#0f172a' }} onClick={e => e.stopPropagation()}>
                
                <button className="modal-close" onClick={onClose} style={{ position: 'absolute', top: 20, right: 20 }}>
                    <X size={24} />
                </button>

                <div className="modal-body-scroll" style={{ padding: '30px' }}>
                    
                    <div className="pokemon-edit-form animate-slide-up">
                        <div className="pkmn-edit-header" style={{ display: 'flex', gap: '20px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px', width: '100%' }}>
                            <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                <img src={imageSrc} alt={editingPkmn.nome} style={{ width: '120px', height: '120px', filter: 'drop-shadow(0 0 20px rgba(0,0,0,0.5))', objectFit: 'contain' }} />
                                
                                <div>
                                    <h2 style={{ fontSize: '2.5rem', margin: 0, fontWeight: '900', color: 'white' }}>{editingPkmn.nome.toUpperCase()}</h2>
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                        <div className="type-badge-pill" style={{ background: getTypeColor(editingPkmn.tipo1), padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                            {getTypeLabel(editingPkmn.tipo1).toUpperCase()}
                                        </div>
                                        {editingPkmn.tipo2 && (
                                            <div className="type-badge-pill" style={{ background: getTypeColor(editingPkmn.tipo2), padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                {getTypeLabel(editingPkmn.tipo2).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <button className="btn-evo-master" onClick={() => setShowEvoSearch(!showEvoSearch)} style={{ padding: '20px', borderRadius: '50%', background: showEvoSearch ? 'rgba(255,255,255,0.1)' : 'black', color: showEvoSearch ? 'gray' : 'white', cursor: 'pointer', border: '1px solid #333' }}>
                                <Zap size={24} />
                            </button>
                        </div>

                        {showEvoSearch && (
                            <div style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
                                <input type="text" placeholder="Cerca nuovo Pokemon..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', background: 'rgba(0,0,0,0.5)', color: 'white', border: '1px solid #333' }} />
                                <div style={{ maxHeight: '150px', overflowY: 'auto', marginTop: '10px' }}>
                                    {filteredPokeList.slice(0, 10).map(p => (
                                        <div key={p.id} onClick={() => handleEvolve(p)} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #333' }}>
                                            {p.nome.toUpperCase()}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* LIVE BATTLE DASHBOARD */}
                        {isBattleMode && (
                            <div className="live-battle-dashboard" style={{ background: 'rgba(0,255,100,0.05)', border: '1px solid rgba(0,255,100,0.2)', padding: '20px', borderRadius: '16px', marginBottom: '30px' }}>
                                <h3 style={{ margin: '0 0 15px 0', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}><Zap size={18}/> LIVE BATTLE CONTROLS</h3>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) 1fr', gap: '20px' }}>
                                    {/* STATUS E VOLATILI */}
                                    <div>
                                        <div style={{ marginBottom: '15px' }}>
                                            <h4 style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '10px' }}>CONDIZIONE DI STATO</h4>
                                            <div style={{ position: 'relative' }}>
                                                <div 
                                                    onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid #333', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                                >
                                                    {liveCondizioneStato && STATUS_CONDITIONS[liveCondizioneStato] ? (
                                                        <>
                                                        {React.createElement(STATUS_CONDITIONS[liveCondizioneStato].icon, { size: 16, color: STATUS_CONDITIONS[liveCondizioneStato].color })}
                                                        <span style={{ color: STATUS_CONDITIONS[liveCondizioneStato].color, fontWeight: 'bold' }}>{STATUS_CONDITIONS[liveCondizioneStato].nome}</span>
                                                        </>
                                                    ) : (
                                                        <span style={{ color: '#888' }}>-- Nessuna --</span>
                                                    )}
                                                </div>
                                                
                                                {showStatusDropdown && (
                                                    <React.Fragment>
                                                        {/* Sfondo invisibile per chiudere cliccando fuori */}
                                                        <div 
                                                            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10 }}
                                                            onClick={() => setShowStatusDropdown(false)}
                                                        />
                                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1e293b', border: '1px solid #333', borderRadius: '8px', maxHeight: '250px', overflowY: 'auto', zIndex: 11, marginTop: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                                                            <div 
                                                                onClick={() => { setLiveStatus(null); setShowStatusDropdown(false); }}
                                                                style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #333', color: '#888' }}
                                                                onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                                                                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                                            >
                                                                -- Nessuna --
                                                            </div>
                                                            {Object.values(STATUS_CONDITIONS).map(sc => (
                                                                <div 
                                                                    key={sc.id} 
                                                                    onClick={() => { setLiveStatus(sc.id); setShowStatusDropdown(false); }}
                                                                    style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', gap: '8px' }}
                                                                    onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                                                                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                                                >
                                                                    <sc.icon size={16} color={sc.color} />
                                                                    <span style={{ color: sc.color, fontWeight: 'bold' }}>{sc.nome}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </React.Fragment>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <h4 style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '10px' }}>AGGIUNGI EFFETTO VOLATILE</h4>
                                            <form onSubmit={(e) => {
                                                e.preventDefault();
                                                const val = volatileInput.trim();
                                                if(val && !liveStatiVolatili.includes(val)) {
                                                    toggleLiveVolatile(val);
                                                    setVolatileInput('');
                                                    setShowSuggestions(false);
                                                }
                                            }}>
                                                <div style={{ position: 'relative' }}>
                                                    <input
                                                        type="text"
                                                        placeholder="Cerca o scrivi effetto a mano (poi Invio)..."
                                                        value={volatileInput}
                                                        onFocus={() => setShowSuggestions(true)}
                                                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                                        onChange={(e) => setVolatileInput(e.target.value)}
                                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.5)', border: '1px solid #333', color: 'white', marginBottom: '10px' }}
                                                    />
                                                    
                                                    {showSuggestions && (
                                                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#1e293b', border: '1px solid #333', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto', zIndex: 10 }}>
                                                            {Object.values(VOLATILE_STATUS)
                                                                .filter(vs => vs.nome.toLowerCase().includes(volatileInput.toLowerCase()))
                                                                .map(vs => (
                                                                    <div 
                                                                        key={vs.id} 
                                                                        onClick={() => {
                                                                            if(!liveStatiVolatili.includes(vs.nome)) {
                                                                                toggleLiveVolatile(vs.nome);
                                                                            }
                                                                            setVolatileInput('');
                                                                            setShowSuggestions(false);
                                                                        }}
                                                                        style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}
                                                                        onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                                                                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                                                    >
                                                                        <vs.icon size={14} color={vs.color} />
                                                                        {vs.nome}
                                                                    </div>
                                                            ))}
                                                            {volatileInput.trim() !== '' && !Object.values(VOLATILE_STATUS).some(vs => vs.nome.toLowerCase() === volatileInput.trim().toLowerCase()) && (
                                                                <div 
                                                                    onClick={() => {
                                                                        const val = volatileInput.trim();
                                                                        if(!liveStatiVolatili.includes(val)) {
                                                                            toggleLiveVolatile(val);
                                                                        }
                                                                        setVolatileInput('');
                                                                        setShowSuggestions(false);
                                                                    }}
                                                                    style={{ padding: '8px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#60a5fa' }}
                                                                    onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                                                                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                                                >
                                                                    <Info size={14} /> Crea custom "{volatileInput}"
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </form>
                                            
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                {liveStatiVolatili.map(vsText => {
                                                    const knownVs = Object.values(VOLATILE_STATUS).find(v => v.nome.toLowerCase() === vsText.toLowerCase());
                                                    const bgColor = knownVs ? knownVs.color : '#3b82f6';
                                                    const RenderIcon = knownVs ? knownVs.icon : Info;
                                                    
                                                    return (
                                                        <div key={vsText} onClick={() => toggleLiveVolatile(vsText)} style={{ cursor: 'pointer', padding: '6px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px', background: bgColor, border: `1px solid ${bgColor}`, color: '#fff', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                            <RenderIcon size={14} /> {vsText} <X size={14} style={{marginLeft: '4px', opacity: 0.7}}/>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    {/* MODIFICATORI STATISTICHE */}
                                    <div>
                                        <h4 style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '10px' }}>MODIFICATORI LIVE (STAGE)</h4>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                                            {['attacco', 'difesa', 'attacco_speciale', 'difesa_speciale', 'velocita'].map(stat => {
                                                const val = liveModificatoriStat[stat] || 0;
                                                return (
                                                    <div key={stat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '8px', border: '1px solid #333' }}>
                                                        <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#ccc' }}>{stat.toUpperCase().replace('_', ' ')}</span>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <button onClick={() => handleLiveStatDrop(stat, -1)} style={{ background: '#333', color: 'white', width: '24px', height: '24px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>-</button>
                                                            <span style={{ width: '20px', textAlign: 'center', fontWeight: 'bold', color: val > 0 ? '#10b981' : val < 0 ? '#ef4444' : 'white' }}>{val > 0 ? `+${val}` : val}</span>
                                                            <button onClick={() => handleLiveStatDrop(stat, 1)} style={{ background: '#333', color: 'white', width: '24px', height: '24px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>+</button>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="pkmn-header-edit-row" style={{ display: 'flex', gap: '15px', marginBottom: '25px', alignItems: 'flex-end' }}>
                            <div className="input-field" style={{ flex: 1 }}>
                                <label>SOPRANNOME</label>
                                <input 
                                    type="text" 
                                    value={editingPkmn.soprannome || ''} 
                                    onChange={(e) => handlePokeStatChange('soprannome', e.target.value)} 
                                />
                            </div>
                            <div className="input-field" style={{ width: '120px' }}>
                                <label>Lv. (1-20)</label>
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <input 
                                        type="number" 
                                        min="1"
                                        max="20"
                                        value={editingPkmn.livello} 
                                        onChange={(e) => handlePokeStatChange('livello', e.target.value)} 
                                    />
                                    <button 
                                        className="btn-lvl-up" 
                                        title="Level Up!"
                                        onClick={() => handlePokeStatChange('livello', Math.min(20, (editingPkmn.livello || 1) + 1))}
                                    >
                                        <TrendingUp size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="pkmn-stats-grid-v2">
                            {/* HP */}
                            <div className="stat-group-card" style={{ boxShadow: '0 4px 15px rgba(16, 185, 129, 0.1)' }}>
                                <div className="stat-group-title" style={{ color: '#10b981' }}>HP</div>
                                <div className="stat-inputs-row">
                                    <div className="stat-input-container">
                                        <input type="number" onWheel={(e) => e.currentTarget.blur()} value={editingPkmn.hp_max} onChange={(e) => handlePokeStatChange('hp_max', e.target.value)} />
                                        <span className="stat-sub-label">BASE</span>
                                    </div>
                                    <div className="stat-input-container">
                                        <input type="number" onWheel={(e) => e.currentTarget.blur()} value={editingPkmn.hp_attuale} onChange={(e) => handlePokeStatChange('hp_attuale', e.target.value)} />
                                        <span className="stat-sub-label">ATTUALE</span>
                                    </div>
                                </div>
                            </div>

                            {/* VELOCITÀ */}
                            <div className="stat-group-card" style={{ boxShadow: '0 4px 15px rgba(251, 191, 36, 0.1)' }}>
                                <div className="stat-group-title" style={{ color: '#fbbf24' }}>Velocità</div>
                                <div className="stat-inputs-row">
                                    <div className="stat-input-container">
                                        <input type="number" onWheel={(e) => e.currentTarget.blur()} value={editingPkmn.velocita} onChange={(e) => handlePokeStatChange('velocita', e.target.value)} />
                                        <span className="stat-sub-label">BASE</span>
                                    </div>
                                    <div className="stat-input-container">
                                        <input type="number" onWheel={(e) => e.currentTarget.blur()} value={editingPkmn.velocita_attuale || editingPkmn.velocita} onChange={(e) => handlePokeStatChange('velocita_attuale', e.target.value)} />
                                        <span className="stat-sub-label">ATTUALE</span>
                                    </div>
                                </div>
                            </div>

                            {/* ATTACCO */}
                            <div className="stat-group-card" style={{ boxShadow: '0 4px 15px rgba(239, 68, 68, 0.1)' }}>
                                <div className="stat-group-title" style={{ color: '#ef4444' }}>Attacco</div>
                                <div className="stat-inputs-row">
                                    <div className="stat-input-container">
                                        <input type="number" onWheel={(e) => e.currentTarget.blur()} value={editingPkmn.attacco} onChange={(e) => handlePokeStatChange('attacco', e.target.value)} />
                                        <span className="stat-sub-label">BASE</span>
                                    </div>
                                    <div className="stat-input-container">
                                        <input type="number" onWheel={(e) => e.currentTarget.blur()} value={editingPkmn.attacco_attuale || editingPkmn.attacco} onChange={(e) => handlePokeStatChange('attacco_attuale', e.target.value)} />
                                        <span className="stat-sub-label">ATTUALE</span>
                                    </div>
                                </div>
                            </div>

                            {/* ATTACCO SPECIALE */}
                            <div className="stat-group-card" style={{ boxShadow: '0 4px 15px rgba(139, 92, 246, 0.1)' }}>
                                <div className="stat-group-title" style={{ color: '#8b5cf6' }}>Attacco Sp.</div>
                                <div className="stat-inputs-row">
                                    <div className="stat-input-container">
                                        <input type="number" onWheel={(e) => e.currentTarget.blur()} value={editingPkmn.attacco_speciale} onChange={(e) => handlePokeStatChange('attacco_speciale', e.target.value)} />
                                        <span className="stat-sub-label">BASE</span>
                                    </div>
                                    <div className="stat-input-container">
                                        <input type="number" onWheel={(e) => e.currentTarget.blur()} value={editingPkmn.attacco_speciale_attuale || editingPkmn.attacco_speciale} onChange={(e) => handlePokeStatChange('attacco_speciale_attuale', e.target.value)} />
                                        <span className="stat-sub-label">ATTUALE</span>
                                    </div>
                                </div>
                            </div>

                            {/* DIFESA */}
                            <div className="stat-group-card" style={{ boxShadow: '0 4px 15px rgba(59, 130, 246, 0.1)' }}>
                                <div className="stat-group-title" style={{ color: '#3b82f6' }}>Difesa</div>
                                <div className="stat-inputs-row">
                                    <div className="stat-input-container">
                                        <input type="number" onWheel={(e) => e.currentTarget.blur()} value={editingPkmn.difesa} onChange={(e) => handlePokeStatChange('difesa', e.target.value)} />
                                        <span className="stat-sub-label">BASE</span>
                                    </div>
                                    <div className="stat-input-container">
                                        <input type="number" onWheel={(e) => e.currentTarget.blur()} value={editingPkmn.difesa_attuale || editingPkmn.difesa} onChange={(e) => handlePokeStatChange('difesa_attuale', e.target.value)} />
                                        <span className="stat-sub-label">ATTUALE</span>
                                    </div>
                                </div>
                            </div>

                            {/* DIFESA SPECIALE */}
                            <div className="stat-group-card" style={{ boxShadow: '0 4px 15px rgba(20, 184, 166, 0.1)' }}>
                                <div className="stat-group-title" style={{ color: '#14b8a6' }}>Difesa Sp.</div>
                                <div className="stat-inputs-row">
                                    <div className="stat-input-container">
                                        <input type="number" onWheel={(e) => e.currentTarget.blur()} value={editingPkmn.difesa_speciale} onChange={(e) => handlePokeStatChange('difesa_speciale', e.target.value)} />
                                        <span className="stat-sub-label">BASE</span>
                                    </div>
                                    <div className="stat-input-container">
                                        <input type="number" onWheel={(e) => e.currentTarget.blur()} value={editingPkmn.difesa_speciale_attuale || editingPkmn.difesa_speciale} onChange={(e) => handlePokeStatChange('difesa_speciale_attuale', e.target.value)} />
                                        <span className="stat-sub-label">ATTUALE</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pkmn-moves-master-section" style={{ marginTop: '20px' }}>
                            <h4 className="edit-section-title"><Zap size={16} /> Mosse Conosciute</h4>

                            <div className="move-filters-row">
                                
                                <input
                                    type="text"
                                    placeholder="Cerca mossa..."
                                    value={moveSearch}
                                    onChange={(e) => setMoveSearch(e.target.value)}
                                    style={{
                                        flex: 1,
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        padding: '10px 15px',
                                        color: 'white',
                                        fontSize: '0.9rem'
                                    }}
                                />
                                <select value={moveTypeFilter} onChange={(e) => setMoveTypeFilter(e.target.value)}>
                                    <option value="all">Tutti i Tipi</option>
                                    {Array.from(new Set(allAvailableMoves.map(m => m.tipo?.toLowerCase()))).map(type => (
                                        <option key={type} value={type}>{getTypeLabel(type)}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="moves-selection-grid">
                                {allAvailableMoves
                                    .filter(m => {
                                        const matchesSearch = m.nome.toLowerCase().includes(moveSearch.toLowerCase()) || 
                                                           getTypeLabel(m.tipo).toLowerCase().includes(moveSearch.toLowerCase());
                                        const matchesType = moveTypeFilter === 'all' || m.tipo === moveTypeFilter;
                                        return matchesSearch && matchesType;
                                    })
                                    .map(move => {
                                        const isChecked = selectedPkmnMoveIds.includes(move.id);
                                        return (
                                            <div 
                                                key={move.id} 
                                                className={`move-checkbox-card ${isChecked ? 'checked' : ''}`}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    toggleMoveAssignment(move.id, !isChecked);
                                                }}
                                            >
                                                <div className={`custom-checkbox-master ${isChecked ? 'active' : ''}`}>
                                                    {isChecked && <Check size={12} />}
                                                </div>
                                                <div className="move-check-content">
                                                    <div className="move-check-header">
                                                        <span className="move-check-name">{move.nome}</span>
                                                        <span className="type-tag-move" style={{ borderLeftColor: getTypeColor(move.tipo) }}>
                                                            {getTypeLabel(move.tipo)}
                                                        </span>
                                                    </div>
                                                    <div className="move-check-details">
                                                        <span>POT <strong style={{ color: '#fbbf24' }}>{move.danni || move.potenza || '-'}</strong></span>
                                                        <span>PP <strong style={{ color: '#fbbf24' }}>{move.pp_max}</strong></span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>

                        <button onClick={salvaPokeStats} disabled={saving} style={{ marginTop: '40px', width: '100%', padding: '15px', borderRadius: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}>
                            {saving ? <Loader2 size={20} className="spin" /> : <Save size={20} />}
                            SALVA TUTTE LE MODIFICHE
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
