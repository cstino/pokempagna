import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Zap, Info, Loader2, PlayCircle, AlertCircle, ChevronDown } from 'lucide-react';
import { getTypeColor, getTypeLabel, getTypeIcon } from '../../lib/typeColors';
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
    const [dropdownOpen, setDropdownOpen] = useState(false);

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
        
        // 2. Recupera l'intera libreria campagna per il mapping (come fa il Master)
        const { data: fullPokeList } = await supabase
            .from('pokemon_campagna')
            .select('*');

        const { data: giat } = await supabase
            .from('giocatori')
            .select('slot_squadra')
            .eq('id', profile.id)
            .single();

        const limit = giat?.slot_squadra || 3;
        setSlots(limit);
        const titolari = (pkmn || []).filter(p => p.posizione_squadra < limit);
        
        // Mappatura per risolvere l'ID Nazionale corretto
        const mappedTitolari = titolari.map(p => {
            const sp = (fullPokeList || []).find(s => String(s.id) === String(p.pokemon_id)) || 
                       (fullPokeList || []).find(s => String(s.pokemon_id) === String(p.pokemon_id)) || {};
            
            return {
                ...p,
                specie_nome: sp.nome || p.nome || 'Sconosciuto',
                real_pokemon_id: sp.pokemon_id || p.pokemon_id,
                campagna_img: sp.immagine_url || null,
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
        try {
            const { data, error } = await supabase
                .from('mosse_pokemon')
                .select(`
                    *,
                    info:mosse_disponibili (
                        descrizione,
                        categoria,
                        pp_max,
                        danni,
                        accuratezza,
                        effetto
                    )
                `)
                .eq('pokemon_giocatore_id', pkmn.id);
            
            if (error) {
                console.error("Errore fetch mosse Combat:", error);
                throw error;
            }
            
            // Filtro lato JS per uniformità con Squadra.jsx e per non avere problemi di casting
            const activeMoves = (data || []).filter(m => m.attiva);
            setMoves(activeMoves);
        } catch (err) {
            console.error("Errore selectPokemon:", err);
            setMoves([]);
        }
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
                immagine_url: selectedPkmn.campagna_img || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${selectedPkmn.real_pokemon_id}.png`,
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

            {selectedPkmn ? (
                <>
                    {/* POKEMON SELECTOR DROPDOWN */}
                    <div className="pokemon-selector-wrapper">
                        <button className="current-pkmn-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
                            <div className="current-pkmn-info">
                                <div className="pkmn-avatar">
                                    <img src={selectedPkmn.campagna_img || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${selectedPkmn.real_pokemon_id}.png`} alt={selectedPkmn.specie_nome} />
                                </div>
                                <div className="pkmn-name-block">
                                    <span className="pkmn-species">{selectedPkmn.specie_nome}</span>
                                    {selectedPkmn.soprannome && <span className="pkmn-nickname">"{selectedPkmn.soprannome}"</span>}
                                </div>
                            </div>
                            <ChevronDown className={`selector-arrow ${dropdownOpen ? 'open' : ''}`} />
                        </button>

                        {/* MENU TENDINA DROPDOWN */}
                        {dropdownOpen && (
                            <>
                                <div className="pkmn-dropdown-menu animate-slide-up" style={{ zIndex: 100 }}>
                                    {squadra.map(pkmn => (
                                        <button 
                                            key={pkmn.id} 
                                            className={`dropdown-item ${selectedPkmn?.id === pkmn.id ? 'active' : ''}`}
                                            onClick={() => { selectPokemon(pkmn); setDropdownOpen(false); }}
                                        >
                                            <img src={pkmn.campagna_img || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pkmn.real_pokemon_id}.png`} alt={pkmn.specie_nome} />
                                            <span className="dropdown-name">{pkmn.specie_nome}</span>
                                            {isPkmnInField(pkmn.id) && <span className="in-field-badge">IN CAMPO</span>}
                                        </button>
                                    ))}
                                </div>
                                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 99 }} onClick={() => setDropdownOpen(false)} />
                            </>
                        )}
                    </div>

                    {/* ACTION AREA (IN CAMPO / MOSSE) */}
                    {!isCurrentlyActive ? (
                        <div className="empty-combat-state animate-pop-in">
                            <PlayCircle size={48} opacity={0.3} style={{ margin: '0 auto' }} />
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
                                        <div className="move-type-circle-combat">
                                            <img src={getTypeIcon(move.tipo)} alt={move.tipo} />
                                        </div>
                                        <div className="move-details">
                                            <span className="move-name">{move.nome}</span>
                                            <span className="pp-count">PP {move.pp_attuale}/{move.info?.pp_max || move.pp_max || 20}</span>
                                        </div>
                                        <div className="move-info-trigger" onClick={(e) => {
                                            e.stopPropagation();
                                            setInfoMove(move);
                                        }}>
                                            <Info size={16} />
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div className="empty-combat-state" style={{ gridColumn: 'span 2' }}>
                                    <AlertCircle size={32} opacity={0.3} style={{ margin: '0 auto' }} />
                                    <p>Nessuna mossa attiva configurata.</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            ) : (
                <div className="empty-combat-state">
                    <p>La tua squadra è vuota.</p>
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
                                <span style={{ fontWeight: 800 }}>{infoMove.info?.danni || '--'}</span>
                            </div>
                            <div className="info-box-mini">
                                <span style={{ display: 'block', fontSize: '0.65rem', color: 'var(--text-muted)' }}>PRECISIONE</span>
                                <span style={{ fontWeight: 800 }}>{infoMove.info?.accuratezza ? (infoMove.info.accuratezza.includes('%') ? infoMove.info.accuratezza : `${infoMove.info.accuratezza}%`) : '--%'}</span>
                            </div>
                        </div>
                        {infoMove.info?.effetto && (
                            <div style={{ marginBottom: '12px', fontSize: '0.95rem', color: '#fff', lineHeight: 1.5 }}>
                                {infoMove.info.effetto}
                            </div>
                        )}
                        {infoMove.info?.descrizione && (
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.4, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                                "{infoMove.info.descrizione}"
                            </div>
                        )}
                        {(!infoMove.info?.effetto && !infoMove.info?.descrizione) && (
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                Nessuna informazione aggiuntiva disponibile.
                            </p>
                        )}
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
