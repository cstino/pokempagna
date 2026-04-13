import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Swords, Zap, Info, Shield, Loader2, PlayCircle, AlertCircle } from 'lucide-react';
import { getTypeColor, getTypeLabel } from '../../lib/typeColors';
import './Combat.css';

export default function Combat() {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [squadra, setSquadra] = useState([]);
    const [activeBattle, setActiveBattle] = useState(null);
    const [selectedPkmn, setSelectedPkmn] = useState(null);
    const [moves, setMoves] = useState([]);
    const [slots, setSlots] = useState(3);
    const [infoMove, setInfoMove] = useState(null);

    useEffect(() => {
        if (profile) {
            fetchInitialData();
            
            // Sottoscrizione real-time alla battaglia
            const channel = supabase
                .channel('combat-controller')
                .on('postgres_changes', { event: '*', table: 'battaglia_attiva' }, () => fetchBattleState())
                .subscribe();

            return () => supabase.removeChannel(channel);
        }
    }, [profile]);

    const fetchInitialData = async () => {
        setLoading(true);
        await Promise.all([fetchSquadra(), fetchBattleState()]);
        setLoading(false);
    };

    const fetchSquadra = async () => {
        const { data: pkmn } = await supabase
            .from('pokemon_giocatore')
            .select('*')
            .eq('giocatore_id', profile.id)
            .order('posizione_squadra', { ascending: true });
        
        // 2. Recupera i dati della specie dalla libreria campagna (manual join)
        const speciesIds = [...new Set((pkmn || []).map(p => p.pokemon_id))];
        let speciesMap = {};
        
        if (speciesIds.length > 0) {
            const { data: specData } = await supabase
                .from('pokemon_campagna')
                .select('*')
                .in('id', speciesIds);
            
            (specData || []).forEach(s => {
                speciesMap[s.id] = s;
            });
        }

        const { data: giat } = await supabase
            .from('giocatori')
            .select('slot_squadra')
            .eq('id', profile.id)
            .single();

        const limit = giat?.slot_squadra || 3;
        setSlots(limit);
        const titolari = (pkmn || []).filter(p => p.posizione_squadra < limit);
        
        // Mappatura per risolvere l'ID Nazionale correto (Manuale)
        const mappedTitolari = titolari.map(p => {
            const sp = speciesMap[p.pokemon_id] || {};
            return {
                ...p,
                specie_nome: sp.nome || p.nome || 'Sconosciuto',
                real_pokemon_id: sp.pokemon_id || p.pokemon_id,
                nome_originale: sp.nome || p.nome
            };
        });

        setSquadra(mappedTitolari);
        
        // Seleziona il primo per default se non c'è selezione
        if (mappedTitolari.length > 0 && !selectedPkmn) {
            selectPokemon(mappedTitolari[0]);
        }
    };

    const fetchBattleState = async () => {
        const { data } = await supabase.from('battaglia_attiva').select('*').single();
        setActiveBattle(data);
    };

    const selectPokemon = async (pkmn) => {
        setSelectedPkmn(pkmn);
        const { data: movesData } = await supabase
            .from('mosse_pokemon')
            .select(`
                *,
                info:mosse_disponibili (descrizione, categoria, potenza, precisione)
            `)
            .eq('pokemon_giocatore_id', pkmn.id)
            .eq('attiva', true);
        setMoves(movesData || []);
    };

    const isPkmnInField = (pkmnId) => {
        if (!activeBattle?.pokemon_in_campo) return false;
        return activeBattle.pokemon_in_campo.some(p => p.original_id === pkmnId);
    };

    const getPkmnInFieldData = (pkmnId) => {
        if (!activeBattle?.pokemon_in_campo) return null;
        return activeBattle.pokemon_in_campo.find(p => p.original_id === pkmnId);
    };

    const mandaInCampo = async () => {
        if (!selectedPkmn || isPkmnInField(selectedPkmn.id)) return;

        const nuovoInCampo = [
            ...(activeBattle.pokemon_in_campo || []),
            {
                id: crypto.randomUUID(),
                original_id: selectedPkmn.id,
                nome: selectedPkmn.soprannome || selectedPkmn.nome,
                nome_originale: selectedPkmn.nome_originale,
                allenatore: profile.nome,
                pokemon_id: selectedPkmn.real_pokemon_id,
                hp: selectedPkmn.hp_attuale,
                hp_max: selectedPkmn.hp_max,
                livello: selectedPkmn.livello,
                immagine_url: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${selectedPkmn.real_pokemon_id}.png`,
                side: 'player',
                is_damaged: false
            }
        ];

        await supabase
            .from('battaglia_attiva')
            .update({ pokemon_in_campo: nuovoInCampo })
            .eq('id', activeBattle.id);
    };

    if (loading) return <div className="combat-controller-container flex-center"><Loader2 className="spin" size={40} /></div>;

    const currentFieldData = selectedPkmn ? getPkmnInFieldData(selectedPkmn.id) : null;
    const isCurrentlyActive = !!currentFieldData;

    return (
        <div className="combat-controller-container animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title"><Swords size={28} color="#ef4444" /> Combat Controller</h1>
                    <p className="page-subtitle">Gestisci i tuoi Pokémon nell'arena</p>
                </div>
            </div>

            {/* TEAM SELECTOR */}
            <div className="team-selector-bar">
                {squadra.map(pkmn => (
                    <button 
                        key={pkmn.id} 
                        className={`team-member-btn ${selectedPkmn?.id === pkmn.id ? 'active' : ''}`}
                        onClick={() => selectPokemon(pkmn)}
                    >
                        <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pkmn.real_pokemon_id}.png`} alt={pkmn.nome} />
                        <span className={`status-dot ${isPkmnInField(pkmn.id) ? 'in-battle' : pkmn.hp_attuale <= 0 ? 'fainted' : ''}`} />
                    </button>
                ))}
            </div>

            {selectedPkmn ? (
                <>
                    {/* ACTIVE PKMN CARD */}
                    <div className="active-pkmn-display shadow-lg">
                        <div className="pkmn-mini-avatar">
                            <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${selectedPkmn.real_pokemon_id}.png`} style={{ width: '60px' }} />
                        </div>
                        <div className="active-info-main">
                            <div className="flex-between">
                                <h2 style={{ textTransform: 'uppercase' }}>{selectedPkmn.specie_nome}</h2>
                                <span style={{ fontWeight: 800, color: 'var(--accent-primary)' }}>LV. {selectedPkmn.livello}</span>
                            </div>
                            {selectedPkmn.soprannome && (
                                <p style={{ fontSize: '0.8rem', opacity: 0.7, fontStyle: 'italic', marginTop: '-4px', marginBottom: '8px' }}>
                                    "{selectedPkmn.soprannome}"
                                </p>
                            )}
                            <div className="hp-bar-controller">
                                <div 
                                    className="hp-bar-fill" 
                                    style={{ 
                                        width: `${((currentFieldData?.hp || selectedPkmn.hp_attuale) / selectedPkmn.hp_max) * 100}%`,
                                        background: getHPColor((currentFieldData?.hp || selectedPkmn.hp_attuale), selectedPkmn.hp_max)
                                    }} 
                                />
                            </div>
                            <div className="flex-between" style={{ marginTop: '4px', fontSize: '0.75rem', fontWeight: 700 }}>
                                <span>HP</span>
                                <span>{currentFieldData?.hp || selectedPkmn.hp_attuale} / {selectedPkmn.hp_max}</span>
                            </div>
                        </div>
                    </div>

                    {/* ACTION AREA */}
                    {!isCurrentlyActive ? (
                        <div className="empty-combat-state animate-pop-in">
                            <PlayCircle size={48} opacity={0.3} />
                            <p style={{ marginTop: '15px', fontWeight: 600 }}>Questo Pokémon è in panchina.</p>
                            <button className="btn-send-to-field" onClick={mandaInCampo}>
                                <Zap size={18} fill="currentColor" /> Manda in Campo
                            </button>
                        </div>
                    ) : (
                        <div className="moves-grid animate-slide-up">
                            {moves.length > 0 ? (
                                moves.map(move => (
                                    <button 
                                        key={move.id} 
                                        className="move-btn"
                                        style={{ '--type-color': getTypeColor(move.tipo) }}
                                        onClick={() => console.log("Mossa usata:", move.nome)}
                                    >
                                        <span className="move-type-tag">{getTypeLabel(move.tipo)}</span>
                                        <span className="move-name">{move.nome}</span>
                                        <div className="move-footer">
                                            <span className="pp-count">PP {move.pp_attuale}/{move.pp_max}</span>
                                            <div className="move-info-trigger" onClick={(e) => {
                                                e.stopPropagation();
                                                setInfoMove(move);
                                            }}>
                                                <Info size={14} />
                                            </div>
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="empty-combat-state" style={{ gridColumn: 'span 2' }}>
                                    <AlertCircle size={32} opacity={0.3} />
                                    <p>Nessuna mossa attiva configurata.</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            ) : (
                <div className="empty-combat-state">
                    <p>Seleziona un Pokémon dalla tua squadra</p>
                </div>
            )}

            {/* MODALE INFO MOSSA */}
            {infoMove && (
                <div className="modal-overlay" onClick={() => setInfoMove(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '350px' }}>
                        <div className="flex-between" style={{ marginBottom: '15px' }}>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, textTransform: 'uppercase' }}>{infoMove.nome}</h3>
                            <button onClick={() => setInfoMove(null)} className="btn-circle">✕</button>
                        </div>
                        <div className="move-pop-meta" style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
                            <span className="type-tag" style={{ background: getTypeColor(infoMove.tipo), color: 'white', padding: '4px 10px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 900 }}>
                                {getTypeLabel(infoMove.tipo)}
                            </span>
                            <span className="cat-tag" style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 800 }}>
                                {infoMove.info?.categoria?.toUpperCase()}
                            </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                            <div className="info-box-mini">
                                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)' }}>POTENZA</span>
                                <span style={{ fontWeight: 800 }}>{infoMove.info?.potenza || '--'}</span>
                            </div>
                            <div className="info-box-mini">
                                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)' }}>PRECISIONE</span>
                                <span style={{ fontWeight: 800 }}>{infoMove.info?.precisione || '--'}%</span>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            {infoMove.info?.descrizione || "Nessuna descrizione disponibile."}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

function getHPColor(current, max) {
    const pct = (current / max) * 100;
    if (pct > 50) return '#10b981';
    if (pct > 20) return '#f59e0b';
    return '#ef4444';
}
