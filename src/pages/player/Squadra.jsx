import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Star, Loader2, Trophy, Ruler, Weight, Shield, Zap, Heart, Info, ArrowRightLeft, XCircle, AlertCircle, Box, Plus, Check, Package } from 'lucide-react';
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { getTypeColor, getTypeLabel, getTypeIcon } from '../../lib/typeColors';
import './Squadra.css';

gsap.registerPlugin(Draggable);




export default function Squadra() {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [pokemon, setPokemon] = useState([]);
    const [slots, setSlots] = useState(3);
    const [selectedPkmn, setSelectedPkmn] = useState(null);
    const [moves, setMoves] = useState([]);
    const [showingSwapFor, setShowingSwapFor] = useState(null); // indice 0-3 del slot
    const [longPressedMove, setLongPressedMove] = useState(null);
    const longPressTimerRef = useRef(null);
    const [errorMsg, setErrorMsg] = useState("");

    const scrollContainerRef = useRef(null);

    useEffect(() => {
        if (profile) {
            fetchSquadra();
        }
    }, [profile]);

    const fetchSquadra = async () => {
        setLoading(true);
        try {
            const { data: pkmnData, error: pkmnError } = await supabase
                .from('pokemon_giocatore')
                .select('*')
                .eq('giocatore_id', profile.id)
                .order('posizione_squadra', { ascending: true });

            if (pkmnError) throw pkmnError;

            const { data: giaterData } = await supabase
                .from('giocatori')
                .select('slot_squadra')
                .eq('id', profile.id)
                .single();

            setSlots(giaterData?.slot_squadra || 3);

            // pokemon_giocatore ha già nome, tipo1, tipo2 e pokemon_id (che è il National Dex ID)
            // Non c'è alcun bisogno di incrociare con pokemon_campagna perché la dashboard Master 
            // aggiunge i PKMN ai giocatori scaricandoli direttamente da PokeAPI!
            const cleanData = (pkmnData || []).map(p => ({
                ...p,
                campagna_nome: p.soprannome || p.nome || 'Sconosciuto',
                campagna_tipo1: p.tipo1,
                campagna_tipo2: p.tipo2,
                campagna_img: null // Userà il fallback classico PokeAPI in base a p.pokemon_id
            }));

            setPokemon(cleanData);
        } catch (err) {
            console.error("Errore recupero squadra:", err);
            setErrorMsg("Errore nel recupero della squadra.");
        } finally {
            setLoading(false);
        }
    };

    const fetchMoves = async (pkmnId) => {
        try {
            const { data, error } = await supabase
                .from('mosse_pokemon')
                .select(`
                    *,
                    info:mosse_disponibili (
                        descrizione,
                        categoria
                    )
                `)
                .eq('pokemon_giocatore_id', pkmnId);
            if (error) throw error;
            // Ordiniamo per far sì che le attive siano coerenti, o usiamo un campo posizione se esistesse.
            // Per ora usiamo il flag 'attiva' e la data di creazione o ID per la stabilità.
            setMoves(data || []);
        } catch (err) {
            console.error("Errore recupero mosse:", err);
        }
    };

    const handleMoveSwap = async (newMoveId, slotIdx) => {
        if (!selectedPkmn) return;

        try {
            const activeMoves = moves.filter(m => m.attiva);
            const currentMoveAtSlot = activeMoves[slotIdx];

            // 1. Disattiva la mossa attuale in quello slot (se esiste)
            if (currentMoveAtSlot) {
                await supabase
                    .from('mosse_pokemon')
                    .update({ attiva: false })
                    .eq('id', currentMoveAtSlot.id);
            }

            // 2. Attiva la nuova mossa
            const { error } = await supabase
                .from('mosse_pokemon')
                .update({ attiva: true })
                .eq('id', newMoveId);

            if (error) throw error;

            setShowingSwapFor(null);
            fetchMoves(selectedPkmn.id);
        } catch (err) {
            console.error("Errore swap mosse:", err);
            showError("Errore durante lo scambio mossa");
        }
    };

    const handleSwap = async (pkmnId, isMakingTitolare) => {
        try {
            let newPos;

            if (isMakingTitolare) {
                const occupati = pokemon.filter(p => p.posizione_squadra < slots).map(p => p.posizione_squadra);
                newPos = -1;
                for (let i = 0; i < slots; i++) {
                    if (!occupati.includes(i)) {
                        newPos = i;
                        break;
                    }
                }

                if (newPos === -1) {
                    showError("Spazio tra i titolari non disponibile");
                    return;
                }
            } else {
                newPos = 99;
            }

            const { error } = await supabase
                .from('pokemon_giocatore')
                .update({ posizione_squadra: newPos })
                .eq('id', pkmnId);

            if (error) throw error;
            setSelectedPkmn(null);
            fetchSquadra();
        } catch (err) {
            showError("Errore durante lo scambio");
        }
    };

    const showError = (msg) => {
        setErrorMsg(msg);
        setTimeout(() => setErrorMsg(""), 3000);
    };

    const getHPColor = (current, max) => {
        const pct = (current / max) * 100;
        if (pct > 55) return '#10b981';
        if (pct > 25) return '#fbbf24';
        return '#ef4444';
    };

    const titolariList = [];
    const panchinaList = [];

    for (let i = 0; i < slots; i++) {
        const found = pokemon.find(p => p.posizione_squadra === i);
        if (found) titolariList.push(found);
        else titolariList.push({ isSlotVuoto: true, index: i });
    }

    pokemon.forEach(p => {
        if (p.posizione_squadra >= slots) panchinaList.push(p);
    });

    const translateType = (t) => {
        if (!t) return '???';
        const types = {
            'normal': 'Normale', 'fire': 'Fuoco', 'water': 'Acqua', 'grass': 'Erba',
            'electric': 'Elettro', 'ice': 'Ghiaccio', 'fighting': 'Lotta', 'poison': 'Veleno',
            'ground': 'Terra', 'flying': 'Volante', 'psychic': 'Psico', 'bug': 'Coleottero',
            'rock': 'Roccia', 'ghost': 'Spettro', 'dragon': 'Drago', 'steel': 'Acciaio',
            'fairy': 'Folletto', 'dark': 'Buio'
        };
        return types[t.toLowerCase()] || t;
    };

    if (loading) return (
        <div className="squadra-page flex-center">
            <Loader2 className="spin" size={40} color="var(--accent-primary)" />
            <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Radunando i combattenti...</p>
        </div>
    );

    return (
        <div className="squadra-page animate-fade-in">
            {errorMsg && (
                <div className="error-toast animate-slide-up">
                    <AlertCircle size={20} />
                    {errorMsg}
                </div>
            )}

            <div className="page-header">
                <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Star size={32} color="#fcd34d" fill="#fcd34d" /> Squadra
                </h1>
                <p className="page-subtitle">I tuoi {slots} Pokémon pronti alla battaglia</p>
            </div>

            <div className="titolari-scroll-container" ref={scrollContainerRef}>
                {titolariList.map((pkmn, idx) => (
                    <PkmnCard
                        key={pkmn.isSlotVuoto ? `empty-${idx}` : pkmn.id}
                        pkmn={pkmn}
                        onClick={() => {
                            if (!pkmn.isSlotVuoto) {
                                setSelectedPkmn(pkmn);
                                fetchMoves(pkmn.id);
                            }
                        }}
                        getHPColor={getHPColor}
                    />
                ))}
            </div>

            {panchinaList.length > 0 && (
                <>
                    <div className="page-header bench-header" style={{ marginTop: 'var(--space-2xl)' }}>
                        <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Box size={24} color="var(--text-muted)" /> Box
                        </h2>
                        <p className="page-subtitle">Pokémon in deposito</p>
                    </div>
                    <div className="squadra-grid-panchina">
                        {panchinaList.map(p => (
                            <PkmnCard
                                key={p.id}
                                pkmn={p}
                                isBench
                                onClick={() => {
                                    setSelectedPkmn(p);
                                    fetchMoves(p.id);
                                }}
                                getHPColor={getHPColor}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* MODALE DETTAGLIO */}
            {selectedPkmn && (
                <div className="modal-overlay" onClick={() => setSelectedPkmn(null)}>
                    <div className="modal-content pkmn-detail-modal-custom" onClick={e => e.stopPropagation()}>
                        <div className="modal-pkmn-bg">
                            <button className="modal-close-btn" onClick={() => setSelectedPkmn(null)}>✕</button>
                            <img
                                src={selectedPkmn.campagna_img || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${selectedPkmn.pokemon_id}.png`}
                                alt={selectedPkmn.soprannome}
                                className="modal-pkmn-img"
                            />
                        </div>

                        <div className="modal-pkmn-body">
                            <div className="modal-pkmn-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', paddingBottom: '20px' }}>
                                <h2 style={{
                                    textAlign: 'left',
                                    margin: '0 0 12px 0',
                                    fontFamily: 'var(--font-display), sans-serif',
                                    fontWeight: 900,
                                    fontSize: '2.4rem',
                                    letterSpacing: '-0.02em',
                                    lineHeight: 1,
                                    textTransform: 'uppercase'
                                }}>
                                    {selectedPkmn.soprannome || 'Senza Nome'}
                                </h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                        <span style={{ opacity: 0.9, textTransform: 'uppercase', fontSize: '1rem', fontWeight: 900, color: '#fcd34d' }}>Lv.</span>
                                        <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fcd34d', lineHeight: 1 }}>{selectedPkmn.livello}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {selectedPkmn.campagna_tipo1 && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: getTypeColor(selectedPkmn.campagna_tipo1), padding: '6px 12px', borderRadius: '14px', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: 'white', border: '1px solid rgba(255,255,255,0.4)', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                                <img src={getTypeIcon(selectedPkmn.campagna_tipo1)} alt={selectedPkmn.campagna_tipo1} style={{ width: '14px', height: '14px', filter: 'brightness(0) invert(1)', objectFit: 'contain' }} />
                                                {getTypeLabel(selectedPkmn.campagna_tipo1)}
                                            </div>
                                        )}
                                        {selectedPkmn.campagna_tipo2 && selectedPkmn.campagna_tipo2.toUpperCase() !== 'NESSUNO' && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: getTypeColor(selectedPkmn.campagna_tipo2), padding: '6px 12px', borderRadius: '14px', fontSize: '0.75rem', fontWeight: 900, textTransform: 'uppercase', color: 'white', border: '1px solid rgba(255,255,255,0.4)', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                                                <img src={getTypeIcon(selectedPkmn.campagna_tipo2)} alt={selectedPkmn.campagna_tipo2} style={{ width: '14px', height: '14px', filter: 'brightness(0) invert(1)', objectFit: 'contain' }} />
                                                {getTypeLabel(selectedPkmn.campagna_tipo2)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="pkmn-actions-container">
                                {selectedPkmn.posizione_squadra < slots ? (
                                    <button className="btn-action-pkmn to-bench" onClick={() => handleSwap(selectedPkmn.id, false)}>
                                        <ArrowRightLeft size={18} /> Sposta nel Box
                                    </button>
                                ) : (
                                    <button className="btn-action-pkmn to-squad" onClick={() => handleSwap(selectedPkmn.id, true)}>
                                        <Zap size={18} /> Sposta in Squadra
                                    </button>
                                )}
                            </div>

                            {/* POPUP INFO MOSSA (Long Press) */}
                            {longPressedMove && (
                                <div className="move-info-overlay" onClick={() => setLongPressedMove(null)}>
                                    <div className="move-info-card-pop animate-pop-in" onClick={e => e.stopPropagation()}>
                                        <div className="pop-header-title">
                                            <h3>{longPressedMove.nome}</h3>
                                            <XCircle size={20} className="close-pop" onClick={() => setLongPressedMove(null)} />
                                        </div>

                                        {longPressedMove.info && (
                                            <>
                                                <div className="move-pop-meta">
                                                    <span className="type-tag" style={{ background: `var(--type-${longPressedMove.tipo.toLowerCase()})` }}>
                                                        {translateType(longPressedMove.tipo)}
                                                    </span>
                                                    <span className="cat-tag">
                                                        {longPressedMove.info.categoria.toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="move-pop-desc">
                                                    {longPressedMove.info.descrizione || "Nessuna descrizione disponibile per questa mossa."}
                                                </div>
                                            </>
                                        )}

                                        <div className="move-pop-footer">
                                            Tocca altrove per chiudere
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STRUMENTO E STATO */}
                            <div className="extra-info-container">
                                <div className="info-box">
                                    <span className="info-label"><Package size={14} /> Strumento</span>
                                    <span className="info-value">{selectedPkmn.strumento_tenuto || 'Nessuno'}</span>
                                </div>
                                <div className="info-box">
                                    <span className="info-label"><Zap size={14} /> Stato</span>
                                    <span className={`info-value status-badge ${selectedPkmn.condizione_stato ? selectedPkmn.condizione_stato?.toLowerCase() : 'none'}`}>
                                        {selectedPkmn.condizione_stato ? selectedPkmn.condizione_stato.toUpperCase() : 'NORMALE'}
                                    </span>
                                </div>
                            </div>

                            {/* STATISTICHE (Stile Pokedex - 2 Colonne) */}
                            <div className="stats-container-modal">
                                <h4 className="stats-title">Statistiche Base</h4>
                                <div className="stats-grid-2col">
                                    {/* Colonna 1 */}
                                    <div className="stats-col">
                                        <StatRow label="HP" val={selectedPkmn.hp_max} max={255} />
                                        <StatRow label="ATK" val={selectedPkmn.attacco || 0} max={190} />
                                        <StatRow label="DEF" val={selectedPkmn.difesa || 0} max={230} />
                                    </div>
                                    {/* Colonna 2 */}
                                    <div className="stats-col">
                                        <StatRow label="VEL" val={selectedPkmn.velocita || 0} max={180} />
                                        <StatRow label="ATK SP" val={selectedPkmn.attacco_speciale || 0} max={194} />
                                        <StatRow label="DEF SP" val={selectedPkmn.difesa_speciale || 0} max={230} />
                                    </div>
                                </div>
                            </div>

                            {/* MOSSE */}
                            <div className="pkmn-moves-container">
                                <h4 className="stats-title">Set Mosse (4 Slot Attivi)</h4>
                                <div className="pkmn-moves-grid">
                                    {[0, 1, 2, 3].map(idx => {
                                        const activeMoves = moves.filter(m => m.attiva);
                                        const move = activeMoves[idx];

                                        return (
                                            <div
                                                key={idx}
                                                className={`move-slot-v2 ${!move ? 'empty' : ''}`}
                                                onClick={() => move && setLongPressedMove(move)}
                                            >
                                                {move ? (
                                                    <div className="move-active-content">
                                                        <div className="move-info-main">
                                                            <span className="move-name-v2">{move.nome}</span>
                                                            <div className="move-meta-v2">
                                                                <span className="move-type-mini" style={{ color: `var(--type-${move.tipo?.toLowerCase()})` }}>
                                                                    {translateType(move.tipo)}
                                                                </span>
                                                                <span className="move-pp-mini">{move.pp_attuale}/{move.pp_max}</span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            className="btn-move-swap"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setShowingSwapFor(idx);
                                                            }}
                                                            title="Cambia mossa"
                                                        >
                                                            <ArrowRightLeft size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="move-empty-placeholder" onClick={() => setShowingSwapFor(idx)}>
                                                        <Plus size={14} />
                                                        <span>Slot Vuoto</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* PANEL PER SWAP MOSSE INACTIVE - ORA DENTRO IL BODY */}
                            {showingSwapFor !== null && (
                                <div className="move-swap-overlay-inline animate-fade-in">
                                    <div className="move-swap-panel-inline animate-slide-up">
                                        <div className="swap-panel-header">
                                            <h3>Cambia Mossa</h3>
                                            <button className="btn-close-swap" onClick={() => setShowingSwapFor(null)}><XCircle size={20} /></button>
                                        </div>
                                        <div className="inactive-moves-list">
                                            {moves.filter(m => !m.attiva).length > 0 ? (
                                                moves.filter(m => !m.attiva).map(m => (
                                                    <div key={m.id} className="inactive-move-card" onClick={() => handleMoveSwap(m.id, showingSwapFor)}>
                                                        <div className="move-info-main">
                                                            <span className="move-name-v2">{m.nome}</span>
                                                            <div className="move-meta-v2">
                                                                <span className="move-type-mini" style={{ color: `var(--type-${m.tipo?.toLowerCase()})` }}>{m.tipo}</span>
                                                                <span className="move-pp-mini">PP {m.pp_attuale}/{m.pp_max}</span>
                                                            </div>
                                                        </div>
                                                        <Check size={18} className="swap-check-icon" />
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="empty-swap-state">
                                                    <AlertCircle size={32} opacity={0.3} />
                                                    <p>Il Pokémon non conosce altre mosse.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatRow({ label, val, max }) {
    const pct = Math.min(100, (val / max) * 100);
    return (
        <div className="stat-row-modal">
            <span className="stat-label-modal">{label}</span>
            <span className="stat-val-modal">{val}</span>
            <div className="stat-bar-modal-bg">
                <div className="stat-bar-modal-fill" style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

function PkmnCard({ pkmn, isBench, onClick, getHPColor }) {
    if (pkmn.isSlotVuoto) {
        return (
            <div className="pkmn-card-squadra empty-slot">
                <div className="pkmn-image-container empty"><div className="pokeball-placeholder"></div></div>
                <div className="pkmn-card-details">
                    <h3 style={{ opacity: 0.2 }}>Slot Vuoto</h3>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 800 }}>POSIZIONE #{pkmn.index + 1}</p>
                </div>
            </div>
        );
    }

    const hpPct = (pkmn.hp_attuale / pkmn.hp_max) * 100;

    // Funzione helper per le icone dei tipi (copiata da Party.jsx)
    const renderTypeIcon = (typeStr, isMini = false) => {
        if (!typeStr) return null;
        return (
            <div className={isMini ? "pkmn-type-circle-mini" : "pkmn-type-circle"} style={{ backgroundColor: getTypeColor(typeStr) }} title={getTypeLabel(typeStr)}>
                <img src={getTypeIcon(typeStr)} alt={typeStr} className={isMini ? "type-icon-img-mini" : "type-icon-img"} />
            </div>
        );
    };

    return (
        <div className={`pkmn-card-squadra ${isBench ? 'bench-card' : ''}`} onClick={onClick}>
            <div className="pkmn-types-container-absolute">
                {renderTypeIcon(pkmn.campagna_tipo1)}
                {pkmn.campagna_tipo2 && pkmn.campagna_tipo2.toUpperCase() !== 'NESSUNO' && renderTypeIcon(pkmn.campagna_tipo2)}
            </div>
            <div className="pkmn-lvl-badge">Lv.{pkmn.livello}</div>
            <div className="pkmn-image-container">
                <img
                    className="pkmn-image"
                    src={pkmn.campagna_img || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pkmn.pokemon_id}.png`}
                    alt={pkmn.soprannome}
                />
            </div>
            <div className="pkmn-card-details">
                <h3>{pkmn.soprannome || 'Senza Nome'}</h3>
                <div className="hp-section">
                    <div className="hp-info"><span>HP</span><span>{pkmn.hp_attuale}/{pkmn.hp_max}</span></div>
                    <div className="hp-bar-bg"><div className="hp-bar-fill" style={{ width: `${hpPct}%`, backgroundColor: getHPColor(pkmn.hp_attuale, pkmn.hp_max) }} /></div>
                </div>
            </div>
        </div>
    );
}
