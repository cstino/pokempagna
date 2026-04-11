import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
    ArrowLeftRight, 
    ArrowRight, 
    Users, 
    User as UserIcon, 
    Check, 
    X, 
    Loader2, 
    Search, 
    Info, 
    Shuffle,
    History,
    Zap,
    Repeat,
    Package,
    ChevronDown,
    ShieldCheck
} from 'lucide-react';
import { getTypeColor, getTypeLabel } from '../../lib/typeColors';
import './Party.css';

// --- SUB-COMPONENTE: CUSTOM SELECT PREMIUM ---
const CustomSelect = ({ label, options, value, onChange, placeholder, icon: Icon }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt => 
        opt.nome.toLowerCase().includes(search.toLowerCase())
    );

    const selectedOption = options.find(opt => opt.id === value);

    const groupedOptions = {
        npc: filteredOptions.filter(o => o.ruolo === 'npc'),
        giocatore: filteredOptions.filter(o => o.ruolo === 'giocatore')
    };

    return (
        <div className="custom-select-wrapper" ref={containerRef}>
            <div 
                className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="trigger-left">
                    {Icon && <Icon size={16} className="trigger-icon" />}
                    <span className={selectedOption ? 'val-selected' : 'val-placeholder'}>
                        {selectedOption ? selectedOption.nome : placeholder}
                    </span>
                </div>
                <ChevronDown size={16} className={`chevron-icon ${isOpen ? 'rotate' : ''}`} />
            </div>

            {isOpen && (
                <div className="custom-select-dropdown animate-float">
                    <div className="dropdown-search">
                        <Search size={14} />
                        <input 
                            type="text" 
                            placeholder="Cerca..." 
                            value={search} 
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="dropdown-list">
                        {['npc', 'giocatore'].map(group => (
                            groupedOptions[group].length > 0 && (
                                <div key={group} className="opt-group">
                                    <div className="opt-group-label">{group === 'npc' ? 'NPC / SELVATICI' : 'GIOCATORI'}</div>
                                    {groupedOptions[group].map(opt => (
                                        <div 
                                            key={opt.id} 
                                            className={`opt-item ${value === opt.id ? 'active' : ''}`}
                                            onClick={() => {
                                                onChange(opt.id);
                                                setIsOpen(false);
                                                setSearch('');
                                            }}
                                        >
                                            <div className="opt-avatar">
                                                {opt.immagine_profilo ? (
                                                    <img src={opt.immagine_profilo} alt="" />
                                                ) : (
                                                    <UserIcon size={14} />
                                                )}
                                            </div>
                                            <span>{opt.nome}</span>
                                            {value === opt.id && <Check size={14} className="check-icon" />}
                                        </div>
                                    ))}
                                </div>
                            )
                        ))}
                        {filteredOptions.length === 0 && (
                            <div className="no-results">Nessun risultato</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default function Scambi() {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [giocatori, setGiocatori] = useState([]);
    const [pokedexLibrary, setPokedexLibrary] = useState([]);
    const [sourceEntity, setSourceEntity] = useState(null); 
    const [targetEntity, setTargetEntity] = useState(null); 
    
    const [sourcePokemon, setSourcePokemon] = useState([]);
    const [loadingPokes, setLoadingPokes] = useState(false);
    const [selectedPkmn, setSelectedPkmn] = useState([]); 
    const [transferring, setTransferring] = useState(false);
    
    // --- UI STATES ---
    const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm }
    const [toast, setToast] = useState(null); // { message, type }

    useEffect(() => {
        if (profile?.campagna_corrente_id) {
            caricaEntita();
            caricaPokedexLibrary();
        }
    }, [profile?.campagna_corrente_id]);

    useEffect(() => {
        if (sourceEntity) {
            caricaPokemonSorgente(sourceEntity.id);
        } else {
            setSourcePokemon([]);
        }
    }, [sourceEntity]);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    async function caricaEntita() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('giocatori')
                .select('id, nome, ruolo, immagine_profilo')
                .eq('campagna_corrente_id', profile.campagna_corrente_id)
                .order('nome', { ascending: true });

            if (error) throw error;
            setGiocatori(data || []);
        } catch (err) {
            console.error("Errore entità:", err);
        } finally {
            setLoading(false);
        }
    }

    async function caricaPokedexLibrary() {
        try {
            const { data } = await supabase.from('pokemon_campagna').select('*');
            setPokedexLibrary(data || []);
        } catch (err) {
            console.error("Errore libreria:", err);
        }
    }

    async function caricaPokemonSorgente(id) {
        setLoadingPokes(true);
        setSelectedPkmn([]);
        try {
            const { data, error } = await supabase
                .from('pokemon_giocatore')
                .select('*')
                .eq('giocatore_id', id)
                .order('posizione_squadra', { ascending: true });

            if (error) throw error;
            setSourcePokemon(data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingPokes(false);
        }
    }

    const togglePkmnSelection = (id) => {
        setSelectedPkmn(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const triggerTransfer = () => {
        if (!targetEntity || selectedPkmn.length === 0) return;
        
        const count = selectedPkmn.length;
        setConfirmModal({
            title: count === 1 ? "Conferma Cattura/Spostamento" : "Conferma Trasferimento Multiplo",
            message: `Stai per trasferire ${count} Pokémon a ${targetEntity.nome}. L'allenatore li riceverà nei suoi Box. Sei sicuro?`,
            onConfirm: handleTransferExecution
        });
    };

    async function handleTransferExecution() {
        setTransferring(true);
        setConfirmModal(null);
        try {
            const { error } = await supabase
                .from('pokemon_giocatore')
                .update({ 
                    giocatore_id: targetEntity.id,
                    posizione_squadra: null 
                })
                .in('id', selectedPkmn);

            if (error) throw error;
            
            setSourcePokemon(prev => prev.filter(p => !selectedPkmn.includes(p.id)));
            setSelectedPkmn([]);
            setToast({ message: "Trasferimento completato con successo!", type: "success" });
        } catch (err) {
            console.error(err);
            setToast({ message: "Si è verificato un errore durante il trasferimento.", type: "error" });
        } finally {
            setTransferring(false);
        }
    }

    if (loading) return <div className="flex-center p-xl"><Loader2 className="spin" size={40} /></div>;

    const targets = giocatori.filter(g => g.id !== sourceEntity?.id);

    return (
        <div className="party-page animate-fade-in scambi-page">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <ArrowLeftRight size={32} color="#8b5cf6" />
                        Centro Scambi & Catture
                    </h1>
                    <p className="page-subtitle">Trasferisci Pokémon tra allenatori o gestisci catture selvatiche</p>
                </div>
            </div>

            <div className="scambi-layout-grid">
                {/* PANNELLO SORGENTE */}
                <div className="scambio-panel source-panel animate-slide-left">
                    <div className="panel-header">
                        <div className="panel-title-row">
                            <History size={18} />
                            <h3>Sorgente</h3>
                        </div>
                        <CustomSelect 
                            options={giocatori}
                            value={sourceEntity?.id}
                            onChange={(id) => setSourceEntity(giocatori.find(g => g.id === id))}
                            placeholder="Scegli..."
                            icon={Search}
                        />
                    </div>

                    <div className="panel-content">
                        {loadingPokes ? (
                            <div className="flex-center p-xl"><Loader2 className="spin" /></div>
                        ) : !sourceEntity ? (
                            <div className="empty-panel-state">
                                <Search size={48} opacity={0.2} />
                                <p>Seleziona una sorgente per vedere i Pokémon</p>
                            </div>
                        ) : sourcePokemon.length === 0 ? (
                            <div className="empty-panel-state">
                                <Package size={48} opacity={0.2} />
                                <p>Nessun Pokémon trovato</p>
                            </div>
                        ) : (
                            <div className="pkmn-selector-grid">
                                {sourcePokemon.map(p => (
                                    <div 
                                        key={p.id} 
                                        className={`pkmn-transfer-card ${selectedPkmn.includes(p.id) ? 'selected' : ''}`}
                                        onClick={() => togglePkmnSelection(p.id)}
                                    >
                                        <div className="card-selector-check">
                                            {selectedPkmn.includes(p.id) ? <Check size={16} /> : null}
                                        </div>
                                        <div className="pkmn-image-container">
                                            <img 
                                                src={(() => {
                                                    const libEntry = pokedexLibrary.find(le => String(le.id) === String(p.pokemon_id));
                                                    return p.immagine_url || libEntry?.immagine_url || libEntry?.sprite_url || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';
                                                })()} 
                                                alt={p.nome} 
                                                onError={(e) => {
                                                    const libEntry = pokedexLibrary.find(le => String(le.id) === String(p.pokemon_id));
                                                    const nationalId = libEntry?.national_id || libEntry?.pokemon_id || 1;
                                                    e.target.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${nationalId}.png`;
                                                }}
                                            />
                                        </div>
                                        <div className="pkmn-info-mini">
                                            <span className="pkmn-name">{p.nome}</span>
                                            <span className="pkmn-lvl">Lv.{p.livello}</span>
                                        </div>
                                        <div className="type-dots">
                                            <span className="dot" style={{ background: getTypeColor(p.tipo1?.toLowerCase()) }}></span>
                                            {p.tipo2 && <span className="dot" style={{ background: getTypeColor(p.tipo2?.toLowerCase()) }}></span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* CENTRO */}
                <div className="scambio-actions-divider flex-center">
                    <ArrowRight size={40} className={`transfer-arrow-icon ${selectedPkmn.length > 0 && targetEntity ? 'active' : ''}`} />
                </div>

                {/* PANNELLO DESTINAZIONE */}
                <div className="scambio-panel target-panel animate-slide-right">
                    <div className="panel-header">
                        <div className="panel-title-row">
                            <Users size={18} />
                            <h3>Destinazione</h3>
                        </div>
                        <CustomSelect 
                            options={targets}
                            value={targetEntity?.id}
                            onChange={(id) => setTargetEntity(giocatori.find(g => g.id === id))}
                            placeholder="Scegli..."
                            icon={Users}
                        />
                    </div>

                    <div className="panel-content flex-center">
                        <div className="destination-summary-card">
                            {!targetEntity ? (
                                <p className="hint-text">Scegli il destinatario per i Pokémon selezionati</p>
                            ) : (
                                <div className="target-confirmed-info animate-fade-in">
                                    <div className="target-avatar-big">
                                        {targetEntity.immagine_profilo ? (
                                            <img src={targetEntity.immagine_profilo} alt={targetEntity.nome} />
                                        ) : (
                                            <UserIcon size={40} />
                                        )}
                                    </div>
                                    <h4 className="target-name">{targetEntity.nome}</h4>
                                    <div className="transfer-summary">
                                        <Zap size={14} color="#fbbf24" />
                                        <span>Riceverà {selectedPkmn.length} Pokémon</span>
                                    </div>
                                    
                                    <button 
                                        className="btn-transfer-hero"
                                        disabled={selectedPkmn.length === 0 || transferring}
                                        onClick={triggerTransfer}
                                    >
                                        {transferring ? (
                                            <Loader2 size={18} className="spin" />
                                        ) : (
                                            <>
                                                <Repeat size={18} />
                                                Conferma Trasferimento
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MODALE DI CONFERMA --- */}
            {confirmModal && createPortal(
                <div className="modal-overlay confirm-layout" onClick={() => setConfirmModal(null)}>
                    <div className="modal-content confirm-modal animate-float" onClick={e => e.stopPropagation()}>
                        <div className="confirm-icon-bg info">
                            <ShieldCheck size={32} />
                        </div>
                        <h3>{confirmModal.title}</h3>
                        <p>{confirmModal.message}</p>
                        <div className="confirm-buttons">
                            <button className="btn-cancel" onClick={() => setConfirmModal(null)}>Annulla</button>
                            <button className="btn-confirm-action success" onClick={confirmModal.onConfirm}>
                                Procedi
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* --- TOAST NOTIFICATION --- */}
            {toast && createPortal(
                <div className={`toast-notification ${toast.type} animate-slide-up`}>
                    {toast.type === 'success' ? <Check size={18} /> : <X size={18} />}
                    <span>{toast.message}</span>
                </div>,
                document.body
            )}

            <style>{`
                /* STILI CUSTOM SELECT */
                .custom-select-wrapper {
                    position: relative;
                    width: 100%;
                }

                .custom-select-trigger {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 12px;
                    padding: 12px 16px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    cursor: pointer;
                    transition: all 0.3s;
                }

                .custom-select-trigger:hover, .custom-select-trigger.open {
                    background: rgba(255,255,255,0.1);
                    border-color: var(--accent-primary);
                }

                .trigger-left {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .trigger-icon {
                    color: var(--accent-primary);
                    opacity: 0.8;
                }

                .val-placeholder {
                    color: var(--text-muted);
                    font-size: 0.9rem;
                }

                .val-selected {
                    font-weight: 600;
                    color: white;
                }

                .chevron-icon {
                    transition: transform 0.3s;
                    opacity: 0.5;
                }

                .chevron-icon.rotate {
                    transform: rotate(180deg);
                }

                .custom-select-dropdown {
                    position: absolute;
                    top: calc(100% + 8px);
                    left: 0;
                    right: 0;
                    background: #1e1e2d;
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 16px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                    z-index: 100;
                    overflow: hidden;
                    backdrop-filter: blur(20px);
                }

                .dropdown-search {
                    padding: 12px;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    background: rgba(255,255,255,0.02);
                }

                .dropdown-search input {
                    background: transparent;
                    border: none;
                    color: white;
                    width: 100%;
                    outline: none;
                    font-size: 0.9rem;
                }

                .dropdown-list {
                    max-height: 250px;
                    overflow-y: auto;
                }

                .opt-group-label {
                    padding: 12px 16px 6px;
                    font-size: 0.7rem;
                    font-weight: 800;
                    color: var(--text-muted);
                    letter-spacing: 1px;
                }

                .opt-item {
                    padding: 10px 16px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .opt-item:hover {
                    background: rgba(139, 92, 246, 0.1);
                }

                .opt-item.active {
                    background: rgba(139, 92, 246, 0.2);
                    color: var(--accent-primary);
                }

                .opt-avatar {
                    width: 24px;
                    height: 24px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.05);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                }

                .opt-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }

                .check-icon {
                    margin-left: auto;
                }

                .no-results {
                    padding: 20px;
                    text-align: center;
                    color: var(--text-muted);
                    font-style: italic;
                }

                /* TOAST NOTIFICATION */
                .toast-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 16px 24px;
                    border-radius: 12px;
                    background: #1e1e2d;
                    color: white;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    z-index: 9999;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                    border: 1px solid rgba(255,255,255,0.1);
                }

                .toast-notification.success { border-left: 4px solid #34d399; }
                .toast-notification.error { border-left: 4px solid #ef4444; }

                /* REGOLE GRID E PANEL (OVERRIDE/INTEGRAZIONE) */
                .scambi-layout-grid {
                    display: grid;
                    grid-template-columns: 1fr 100px 1fr;
                    gap: 20px;
                    margin-top: 30px;
                    min-height: 600px;
                }

                .panel-title-row {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 15px;
                    color: var(--text-muted);
                    font-weight: bold;
                }

                .panel-title-row h3 {
                    font-size: 1rem;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }

                .scambio-panel {
                    background: var(--bg-card);
                    border: 1px solid var(--border-subtle);
                    border-radius: 20px;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.2);
                }

                .panel-header { padding: 20px; background: rgba(255,255,255,0.03); border-bottom: 1px solid var(--border-subtle); }
                .panel-content { padding: 20px; flex-grow: 1; overflow-y: auto; max-height: 700px; }

                .pkmn-selector-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 15px; }

                .pkmn-transfer-card {
                    background: var(--bg-secondary);
                    border: 2px solid transparent;
                    border-radius: 16px;
                    padding: 15px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    cursor: pointer;
                    transition: all 0.3s;
                    position: relative;
                }

                .pkmn-transfer-card.selected {
                    border-color: var(--accent-primary);
                    background: rgba(139, 92, 246, 0.1);
                    box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);
                }

                .pkmn-image-container { width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
                .pkmn-image-container img { width: 100%; height: 100%; object-fit: contain; }

                .card-selector-check {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    border: 2px solid var(--border-subtle);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: var(--bg-card);
                }

                .selected .card-selector-check {
                    background: var(--accent-primary);
                    border-color: var(--accent-primary);
                    color: white;
                }

                .pkmn-info-mini { text-align: center; }
                .pkmn-name { font-weight: bold; font-size: 0.85rem; display: block; }
                .pkmn-lvl { font-size: 0.7rem; opacity: 0.6; }

                .type-dots { display: flex; gap: 4px; margin-top: 8px; }
                .type-dots .dot { width: 6px; height: 6px; border-radius: 50%; }

                .transfer-arrow-icon { color: var(--border-subtle); transition: all 0.3s; }
                .transfer-arrow-icon.active { color: var(--accent-primary); transform: scale(1.2); }

                .destination-summary-card { width: 100%; padding: 30px; border-radius: 20px; background: var(--bg-secondary); text-align: center; }
                .target-avatar-big { width: 100px; height: 100px; border-radius: 50%; border: 3px solid var(--accent-primary); overflow: hidden; margin: 0 auto 15px; }
                .target-avatar-big img { width: 100%; height: 100%; object-fit: cover; }

                .transfer-summary { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px; border-radius: 12px; background: rgba(251, 191, 36, 0.1); color: #fbbf24; margin: 15px 0; }
                .btn-transfer-hero { width: 100%; padding: 15px; border-radius: 12px; border: none; background: var(--accent-primary); color: white; font-weight: bold; cursor: pointer; transition: all 0.3s; }
                .btn-transfer-hero:disabled { opacity: 0.5; cursor: not-allowed; }
            `}</style>
        </div>
    );
}
