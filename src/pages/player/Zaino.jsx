import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Backpack, Package, Zap, Heart, Search, Loader2, Plus, X, Check, HelpCircle } from 'lucide-react';
import './Zaino.css';

export default function Zaino() {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [allOggetti, setAllOggetti] = useState([]);
    const [activeFilter, setActiveFilter] = useState('Tutti');

    // Stati Modale Aggiunta
    const [showAddModal, setShowAddModal] = useState(false);
    const [addCart, setAddCart] = useState({}); // { oggId: qty }
    const [adding, setAdding] = useState(false);

    // Stati Modale Conferma Uso
    const [confirmAction, setConfirmAction] = useState(null); // { item, onConfirm }
    const [successAction, setSuccessAction] = useState(null); // { title, message }
    
    // Stati Selezione Pokémon
    const [userPkmn, setUserPkmn] = useState([]);
    const [showPkmnSelector, setShowPkmnSelector] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [applyingEffect, setApplyingEffect] = useState(false);

    const filters = ['Tutti', 'Cura', 'Strumento', 'Battle', 'Altro'];

    useEffect(() => {
        if (profile) {
            fetchItems();
        }
    }, [profile]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('zaino_giocatore')
                .select(`
                    quantita,
                    oggetto:oggetti (*)
                `)
                .eq('giocatore_id', profile.id);

            if (error) throw error;
            setItems(data || []);

            // Pokémon caricati on-demand ora, rimosso da qui per evitare ridondanza e bug di timing
            const { data: oggData } = await supabase.from('oggetti').select('*').order('nome');
            setAllOggetti(oggData || []);
        } catch (err) {
            console.error("Errore recupero zaino:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmAdd = async () => {
        const entries = Object.entries(addCart).filter(([_, qty]) => qty > 0);
        if (entries.length === 0) return;

        setAdding(true);
        try {
            for (const [oggId, qty] of entries) {
                const existing = items.find(i => i.oggetto.id === oggId);
                if (existing) {
                    await supabase.from('zaino_giocatore')
                        .update({ quantita: existing.quantita + qty, ultimo_aggiornamento: new Date() })
                        .eq('giocatore_id', profile.id).eq('oggetto_id', oggId);
                } else {
                    await supabase.from('zaino_giocatore')
                        .insert({ giocatore_id: profile.id, oggetto_id: oggId, quantita: qty });
                }
            }
            await fetchItems();
            setShowAddModal(false);
            setAddCart({});
        } catch (err) {
            console.error("Errore aggiunta massiva:", err);
        } finally {
            setAdding(false);
        }
    };

    const handleUseItem = async (item) => {
        // Se l'oggetto ha un effetto definibile, carichiamo i pokemon e mostriamo il selettore
        if (item.oggetto.effetto_js) {
            setLoading(true);
            try {
                const { data: pkmnData, error: pkmnError } = await supabase
                    .from('pokemon_giocatore')
                    .select('*')
                    .eq('giocatore_id', profile.id)
                    .order('posizione_squadra', { ascending: true, nullsFirst: false });

                if (pkmnError) throw pkmnError;
                
                console.log(`Caricati ${pkmnData?.length || 0} Pokémon per l'utente ${profile.id}`);
                setUserPkmn(pkmnData || []);
                setSelectedItem(item);
                setShowPkmnSelector(true);
            } catch (err) {
                console.error("Errore recupero Pokémon per uso oggetto:", err);
                alert("Impossibile caricare i tuoi Pokémon. Riprova tra poco.");
            } finally {
                setLoading(false);
            }
            return;
        }

        setConfirmAction({
            item,
            onConfirm: async () => {
                try {
                    await consumeItem(item);
                    setConfirmAction(null);
                } catch (err) { console.error(err); }
            }
        });
    };

    const consumeItem = async (item) => {
        if (item.quantita > 1) {
            await supabase.from('zaino_giocatore')
                .update({ quantita: item.quantita - 1, ultimo_aggiornamento: new Date() })
                .eq('giocatore_id', profile.id).eq('oggetto_id', item.oggetto.id);
        } else {
            await supabase.from('zaino_giocatore')
                .delete().eq('giocatore_id', profile.id).eq('oggetto_id', item.oggetto.id);
        }
        await fetchItems();
    };

    const applyItemEffect = async (pkmn) => {
        if (!selectedItem || applyingEffect) return;
        
        setApplyingEffect(true);
        try {
            const effect = JSON.parse(selectedItem.oggetto.effetto_js);
            let updates = {};

            // Logica CURA HP
            if (effect.heal) {
                const newHp = Math.min(pkmn.hp_attuale + effect.heal, pkmn.hp_max);
                updates.hp_attuale = newHp;
            }

            // Logica STATUS CLEAR
            if (effect.status_clear) {
                updates.condizione_stato = null;
            }

            // Applica aggiornamento Pokémon
            if (Object.keys(updates).length > 0) {
                const { error: pkmnError } = await supabase
                    .from('pokemon_giocatore')
                    .update(updates)
                    .eq('id', pkmn.id);
                
                if (pkmnError) throw pkmnError;
            }

            // Consuma oggetto
            await consumeItem(selectedItem);
            
            setShowPkmnSelector(false);
            setSelectedItem(null);
            setSuccessAction({
                title: "Oggetto Utilizzato!",
                message: `L'effetto di ${selectedItem.oggetto.nome} è stato applicato con successo a ${pkmn.nome}.`
            });
        } catch (err) {
            console.error("Errore applicazione effetto:", err);
            alert("Errore durante l'uso dell'oggetto.");
        } finally {
            setApplyingEffect(false);
        }
    };

    const updateCart = (id, delta) => {
        setAddCart(prev => ({
            ...prev,
            [id]: Math.max(0, (prev[id] || 0) + delta)
        }));
    };

    const filteredItems = activeFilter === 'Tutti'
        ? items
        : items.filter(item => item.oggetto.categoria === activeFilter);

    if (loading) return (
        <div className="zaino-page flex-center">
            <Loader2 className="spin" size={40} color="var(--accent-primary)" />
            <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Frugan nello zaino...</p>
        </div>
    );

    return (
        <div className="zaino-page animate-fade-in">
            {/* INTESTAZIONE E STATISTICHE */}
            <div className="page-header" style={{ padding: '0 0 var(--space-md) 0' }}>
                <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Backpack size={32} color="#f59e0b" />
                    Zaino
                </h1>
                <p className="page-subtitle">Gestisci i tuoi strumenti e oggetti</p>
            </div>

            <div className="zaino-stats">
                <div className="zaino-stat-card">
                    <div className="zaino-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                        <Package size={20} color="#f59e0b" />
                    </div>
                    <div>
                        <div className="stat-label">Capienza</div>
                        <div className="stat-value">{items.length} Slot</div>
                    </div>
                </div>
                <div className="zaino-stat-card">
                    <div className="zaino-stat-icon" style={{ background: 'rgba(52, 211, 153, 0.1)' }}>
                        <Zap size={20} color="#34d399" />
                    </div>
                    <div>
                        <div className="stat-label">Disponibili</div>
                        <div className="stat-value">{items.reduce((acc, curr) => acc + curr.quantita, 0)}</div>
                    </div>
                </div>
            </div>

            {/* FILTRI CHIP */}
            <div className="zaino-filters">
                {filters.map(filter => (
                    <div
                        key={filter}
                        className={`filter-chip ${activeFilter === filter ? 'active' : ''}`}
                        onClick={() => setActiveFilter(filter)}
                    >
                        {filter}
                    </div>
                ))}
            </div>

            {/* LISTA OGGETTI */}
            <div className="items-list">
                {filteredItems.length > 0 ? (
                    filteredItems.map((item, idx) => (
                        <div key={idx} className="item-card">
                            <span className="item-qty-badge">x{item.quantita}</span>
                            <div className="item-icon-container">
                                {item.oggetto.immagine_url ? (
                                    <img src={item.oggetto.immagine_url} alt={item.oggetto.nome} />
                                ) : (
                                    <Package size={30} color="rgba(255,255,255,0.2)" />
                                )}
                            </div>
                            <div className="item-info">
                                <h4>{item.oggetto.nome}</h4>
                                <p>{item.oggetto.descrizione}</p>
                            </div>
                            <button className="use-btn" onClick={() => handleUseItem(item)}>Usa</button>
                        </div>
                    ))
                ) : (
                    <div className="zaino-empty">
                        <Backpack size={48} color="rgba(255,255,255,0.1)" />
                        <p>Il tuo zaino è vuoto per questa categoria.</p>
                    </div>
                )}
            </div>

            {/* BOTTONE AGGIUNGI (FAB) */}
            <button className="zaino-fab" onClick={() => setShowAddModal(true)}>
                <Plus size={24} />
            </button>

            {/* MODALE SELEZIONE OGGETTI */}
            {showAddModal && (
                <div className="zaino-modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="zaino-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3>Aggiungi allo zaino</h3>
                                <small style={{ color: 'var(--text-muted)' }}>Seleziona gli oggetti e le quantità</small>
                            </div>
                            <button className="confirm-add-btn" onClick={handleConfirmAdd} disabled={adding || Object.values(addCart).every(v => v === 0)}>
                                {adding ? <Loader2 className="spin" size={18} /> : <Check size={18} />}
                                Conferma
                            </button>
                        </div>
                        <div className="modal-body">
                            {allOggetti.map(ogg => (
                                <div key={ogg.id} className="add-item-row-v2">
                                    <div className="add-item-icon">
                                        {ogg.immagine_url ? <img src={ogg.immagine_url} alt={ogg.nome} /> : <Package size={20} />}
                                    </div>
                                    <div className="add-item-text">
                                        <strong>{ogg.nome}</strong>
                                        <small>{ogg.categoria}</small>
                                    </div>
                                    <div className="row-qty-controls">
                                        <button onClick={() => updateCart(ogg.id, -1)} className="minus-btn">-</button>
                                        <span className="cart-qty">{addCart[ogg.id] || 0}</span>
                                        <button onClick={() => updateCart(ogg.id, 1)} className="plus-btn">+</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* MODALE CONFERMA USO PERSONALIZZATO (OGGETTI SENZA SELETTORE) */}
            {confirmAction && (
                <div className="zaino-modal-overlay confirmation" onClick={() => setConfirmAction(null)}>
                    <div className="zaino-modal confirm-small" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-body center">
                            <div className="confirm-icon-circle">
                                <HelpCircle size={32} color="#fcd34d" />
                            </div>
                            <h3>Vuoi usare {confirmAction.item.oggetto.nome}?</h3>
                            <p>L'oggetto verrà consumato e rimosso dallo zaino.</p>
                            <div className="confirm-actions">
                                <button className="btn-cancel" onClick={() => setConfirmAction(null)}>Annulla</button>
                                <button className="btn-confirm-use" onClick={confirmAction.onConfirm}>Si, usa</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODALE SELEZIONE POKÉMON (PER USO OGGETTO CURATIVO) */}
            {showPkmnSelector && (
                <div className="zaino-modal-overlay" onClick={() => setShowPkmnSelector(false)}>
                    <div className="zaino-modal pkmn-selector-modal animate-slide-up" onClick={(e) => e.stopPropagation()}>
                        <div className="zaino-modal-header">
                            <div>
                                <h3>Su chi vuoi usare {selectedItem?.oggetto.nome}?</h3>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Seleziona un Pokémon dalla tua squadra o dal box</p>
                            </div>
                            <button className="btn-close-modal" onClick={() => { setShowPkmnSelector(false); setSelectedItem(null); }}>
                                <X size={24} />
                            </button>
                        </div>
                        <div className="modal-body pkmn-selector-body">
                            <div className="pkmn-selector-grid">
                                {userPkmn.length > 0 ? (
                                    userPkmn.map(pkmn => {
                                        const isFullHp = pkmn.hp_attuale >= pkmn.hp_max;
                                        const effect = JSON.parse(selectedItem?.oggetto.effetto_js || '{}');
                                        const canHeal = effect.heal && !isFullHp;
                                        const canClearStatus = effect.status_clear && pkmn.condizione_stato;
                                        const isSelectable = canHeal || canClearStatus || (!effect.heal && !effect.status_clear);

                                        return (
                                            <div 
                                                key={pkmn.id} 
                                                className={`pkmn-selector-card ${!isSelectable ? 'disabled' : ''} ${pkmn.posizione_squadra !== null ? 'is-active' : ''}`}
                                                onClick={() => isSelectable && applyItemEffect(pkmn)}
                                            >
                                                <div className="pkmn-sel-img">
                                                    <img 
                                                        src={pkmn.immagine_url || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pkmn.pokedex_id || pkmn.pokemon_id}.png`} 
                                                        alt={pkmn.nome} 
                                                        onError={(e) => e.target.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'}
                                                    />
                                                </div>
                                                <div className="pkmn-sel-info">
                                                    <div className="pkmn-sel-name-row">
                                                        <strong>{pkmn.nome}</strong>
                                                        {pkmn.posizione_squadra !== null && <span className="active-badge-mini">Squadra</span>}
                                                    </div>
                                                    <div className="pkmn-sel-hp-bar-container">
                                                        <div className="pkmn-sel-hp-text">{pkmn.hp_attuale} / {pkmn.hp_max} HP</div>
                                                        <div className="pkmn-sel-hp-bar">
                                                            <div 
                                                                className="pkmn-sel-hp-fill" 
                                                                style={{ 
                                                                    width: `${(pkmn.hp_attuale / pkmn.hp_max) * 100}%`,
                                                                    backgroundColor: (pkmn.hp_attuale / pkmn.hp_max) < 0.2 ? '#ef4444' : (pkmn.hp_attuale / pkmn.hp_max) < 0.5 ? '#f59e0b' : '#10b981'
                                                                }} 
                                                            />
                                                        </div>
                                                    </div>
                                                    {pkmn.condizione_stato && <div className="pkmn-sel-status">{pkmn.condizione_stato.toUpperCase()}</div>}
                                                </div>
                                                {applyingEffect && selectedItem && <div className="applying-overlay"><Loader2 className="spin" /></div>}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="no-pkmn-msg" style={{ textAlign: 'center', padding: '40px 20px', opacity: 0.5 }}>
                                        <p>Non hai Pokémon a cui applicare questo oggetto.</p>
                                        <small>(Verifica di aver già catturato dei Pokémon)</small>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* MODALE SUCCESSO */}
            {successAction && (
                <div className="zaino-modal-overlay confirmation" onClick={() => setSuccessAction(null)}>
                    <div className="zaino-modal confirm-small animate-bounce-in" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-body center">
                            <div className="success-icon-circle">
                                <Check size={32} color="#10b981" />
                            </div>
                            <h3>{successAction.title}</h3>
                            <p>{successAction.message}</p>
                            <div className="confirm-actions">
                                <button className="btn-confirm-success" onClick={() => setSuccessAction(null)}>Fantastico!</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
