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

    const handleUseItem = (item) => {
        setConfirmAction({
            item,
            onConfirm: async () => {
                try {
                    if (item.quantita > 1) {
                        await supabase.from('zaino_giocatore')
                            .update({ quantita: item.quantita - 1, ultimo_aggiornamento: new Date() })
                            .eq('giocatore_id', profile.id).eq('oggetto_id', item.oggetto.id);
                    } else {
                        await supabase.from('zaino_giocatore')
                            .delete().eq('giocatore_id', profile.id).eq('oggetto_id', item.oggetto.id);
                    }
                    await fetchItems();
                    setConfirmAction(null);
                } catch (err) { console.error(err); }
            }
        });
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
                            <div className="item-icon-container">
                                {item.oggetto.immagine_url ? (
                                    <img src={item.oggetto.immagine_url} alt={item.oggetto.nome} />
                                ) : (
                                    <Package size={30} color="rgba(255,255,255,0.2)" />
                                )}
                                <span className="item-qty-badge">x{item.quantita}</span>
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

            {/* MODALE CONFERMA USO PERSONALIZZATO */}
            {confirmAction && (
                <div className="zaino-modal-overlay confirmation">
                    <div className="zaino-modal confirm-small">
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
        </div>
    );
}
