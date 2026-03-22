import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Star, Loader2, Trophy, Ruler, Weight, Shield, Zap, Heart, Info, ArrowRightLeft, XCircle, AlertCircle, Box } from 'lucide-react';
import gsap from 'gsap';
import { Draggable } from 'gsap/Draggable';
import './Squadra.css';

gsap.registerPlugin(Draggable);

export default function Squadra() {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [pokemon, setPokemon] = useState([]);
    const [slots, setSlots] = useState(3);
    const [selectedPkmn, setSelectedPkmn] = useState(null);
    const [moves, setMoves] = useState([]);
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
            setPokemon(pkmnData || []);
        } catch (err) {
            console.error("Errore recupero squadra:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMoves = async (pkmnId) => {
        try {
            const { data, error } = await supabase
                .from('mosse_pokemon')
                .select('*')
                .eq('pokemon_giocatore_id', pkmnId);
            if (error) throw error;
            setMoves(data || []);
        } catch (err) {
            console.error("Errore recupero mosse:", err);
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
                                src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${selectedPkmn.pokemon_id}.png`}
                                alt={selectedPkmn.soprannome}
                                className="modal-pkmn-img"
                            />
                        </div>

                        <div className="modal-pkmn-body">
                            <div className="modal-pkmn-header">
                                <h2>{selectedPkmn.soprannome || 'Senza Nome'}</h2>
                                <p style={{ opacity: 0.5, textTransform: 'uppercase', fontSize: '0.8rem' }}>Lv. {selectedPkmn.livello}</p>
                            </div>

                            <div className="pkmn-actions-container">
                                {selectedPkmn.posizione_squadra < slots ? (
                                    <button className="btn-action-pkmn to-bench" onClick={() => handleSwap(selectedPkmn.id, false)}>
                                        <ArrowRightLeft size={18} /> Sposta in Panchina
                                    </button>
                                ) : (
                                    <button className="btn-action-pkmn to-squad" onClick={() => handleSwap(selectedPkmn.id, true)}>
                                        <Zap size={18} /> Rendi Titolare
                                    </button>
                                )}
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
                                <h4 className="stats-title">Mosse Conosciute</h4>
                                <div className="pkmn-moves-grid">
                                    {moves.length > 0 ? moves.map(m => (
                                        <div key={m.id} className="move-item-squadra">
                                            <span className="move-name-squadra">{m.nome}</span>
                                            <div className="move-details-squadra">
                                                <span>{m.tipo}</span>
                                                <span>PP {m.pp_attuale}/{m.pp_max}</span>
                                            </div>
                                        </div>
                                    )) : <p style={{ opacity: 0.3, fontSize: '0.8rem' }}>Nessuna mossa conosciuta</p>}
                                </div>
                            </div>
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
    return (
        <div className={`pkmn-card-squadra ${isBench ? 'bench-card' : ''}`} onClick={onClick}>
            <div className="pkmn-type-badge">{pkmn.tipo1 || '???'}</div>
            <div className="pkmn-lvl-badge">Nv.{pkmn.livello}</div>
            <div className="pkmn-image-container">
                <img
                    className="pkmn-image"
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pkmn.pokemon_id}.png`}
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
