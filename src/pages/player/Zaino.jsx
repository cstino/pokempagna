import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Backpack, Package, Zap, Heart, Search, Loader2 } from 'lucide-react';
import './Zaino.css';

export default function Zaino() {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [activeFilter, setActiveFilter] = useState('Tutti');

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
                    oggetto:oggetti (
                        id,
                        nome,
                        descrizione,
                        categoria,
                        rarita,
                        immagine_url
                    )
                `)
                .eq('giocatore_id', profile.id);

            if (error) throw error;
            setItems(data || []);
        } catch (err) {
            console.error("Errore recupero zaino:", err);
        } finally {
            setLoading(false);
        }
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
                            <button className="use-btn">Usa</button>
                        </div>
                    ))
                ) : (
                    <div className="zaino-empty">
                        <Backpack size={48} color="rgba(255,255,255,0.1)" />
                        <p>Il tuo zaino è vuoto per questa categoria.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
