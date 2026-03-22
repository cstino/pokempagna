import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Users, User, Shield, Zap, Medal, Edit2, Loader2, X, Check, Save, Heart, TrendingUp, Plus, Minus, Package } from 'lucide-react';
import './Party.css';

export default function Party() {
    const { profile } = useAuth();
    const [giocatori, setGiocatori] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Stato temporaneo per la modifica (copia del profilo giocatore)
    const [editForm, setEditForm] = useState(null);
    const [activeTab, setActiveTab] = useState('stats'); // 'stats' | 'zaino' | 'pokemon'
    const [playerItems, setPlayerItems] = useState([]);
    const [playerPokemon, setPlayerPokemon] = useState([]);
    const [allOggetti, setAllOggetti] = useState([]);
    const [loadingExtra, setLoadingExtra] = useState(false);

    // Stati per l'aggiunta oggetti
    const [showAddItem, setShowAddItem] = useState(false);
    const [addCart, setAddCart] = useState({}); // { oggId: qty }
    const [savingItem, setSavingItem] = useState(false);

    // Stato per la conferma personalizzata
    const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm, type }

    useEffect(() => {
        if (!profile?.campagna_corrente_id) return;

        caricaGiocatori();

        // 🔔 REALTIME: Ascolta i cambiamenti della tabella giocatori per questa campagna
        const channel = supabase
            .channel(`party-${profile.campagna_corrente_id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'giocatori',
                    filter: `campagna_corrente_id=eq.${profile.campagna_corrente_id}`
                },
                (payload) => {
                    console.log("Cambio rilevato nel party:", payload);
                    // Invece di ricaricare tutto, aggiorniamo solo il giocatore interessato per massima fluidita'
                    if (payload.eventType === 'INSERT') {
                        if (payload.new.ruolo === 'giocatore') {
                            setGiocatori(prev => [...prev, payload.new]);
                        }
                    } else if (payload.eventType === 'UPDATE') {
                        setGiocatori(prev => prev.map(g => g.id === payload.new.id ? payload.new : g));
                    } else if (payload.eventType === 'DELETE') {
                        setGiocatori(prev => prev.filter(g => g.id === payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.campagna_corrente_id]);

    async function caricaGiocatori() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('giocatori')
                .select('*')
                .eq('campagna_corrente_id', profile.campagna_corrente_id)
                .eq('ruolo', 'giocatore');

            if (error) throw error;
            setGiocatori(data || []);
        } catch (err) {
            console.error("Errore caricamento party:", err);
        } finally {
            setLoading(false);
        }
    }

    const openEditModal = (player) => {
        setSelectedPlayer(player);
        setEditForm({ ...player });
        setActiveTab('stats');
        setIsEditing(true);
        caricaDatiExtra(player.id);
    };

    const caricaDatiExtra = async (playerId) => {
        setLoadingExtra(true);
        try {
            // Carica Zaino con Join su oggetti
            const { data: items, error: iErr } = await supabase
                .from('zaino_giocatore')
                .select(`
                    quantita,
                    oggetto:oggetti (*)
                `)
                .eq('giocatore_id', playerId);

            if (iErr) throw iErr;

            // Carica Pokémon
            const { data: pokes, error: pErr } = await supabase
                .from('pokemon_giocatore')
                .select('*')
                .eq('giocatore_id', playerId)
                .order('posizione_squadra', { ascending: true });

            if (pErr) throw pErr;

            setPlayerItems(items || []);
            setPlayerPokemon(pokes || []);

            // Carica tutti gli oggetti disponibili (per il selettore)
            const { data: oggData } = await supabase.from('oggetti').select('*').order('nome');
            setAllOggetti(oggData || []);
        } catch (err) {
            console.error("Errore caricamento dati extra:", err);
        } finally {
            setLoadingExtra(false);
        }
    };

    const updateCart = (oggId, delta) => {
        setAddCart(prev => ({
            ...prev,
            [oggId]: Math.max(0, (prev[oggId] || 0) + delta)
        }));
    };

    const handleConfirmAddItems = async () => {
        const entries = Object.entries(addCart).filter(([_, qty]) => qty > 0);
        if (entries.length === 0) return;

        setSavingItem(true);
        try {
            for (const [oggId, qty] of entries) {
                const existing = playerItems.find(i => i.oggetto.id === oggId);
                if (existing) {
                    await supabase.from('zaino_giocatore')
                        .update({ quantita: existing.quantita + qty })
                        .eq('giocatore_id', editForm.id)
                        .eq('oggetto_id', oggId);
                } else {
                    await supabase.from('zaino_giocatore')
                        .insert({ giocatore_id: editForm.id, oggetto_id: oggId, quantita: qty });
                }
            }
            setShowAddItem(false);
            setAddCart({});
            caricaDatiExtra(editForm.id);
        } catch (err) {
            console.error("Errore aggiunta oggetti:", err);
        } finally {
            setSavingItem(false);
        }
    };

    const rimuoviOggetto = async (oggId, playerId) => {
        setConfirmModal({
            title: "Rimuovere Oggetto?",
            message: "L'oggetto verrà rimosso permanentemente dallo zaino dell'allenatore.",
            type: 'error',
            onConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from('zaino_giocatore')
                        .delete()
                        .eq('giocatore_id', playerId)
                        .eq('oggetto_id', oggId);
                    if (error) throw error;
                    caricaDatiExtra(playerId);
                    setConfirmModal(null);
                } catch (err) { console.error(err); }
            }
        });
    };

    const sottraiUno = async (item, playerId) => {
        try {
            if (item.quantita > 1) {
                await supabase.from('zaino_giocatore')
                    .update({ quantita: item.quantita - 1 })
                    .eq('giocatore_id', playerId)
                    .eq('oggetto_id', item.oggetto.id);
            } else {
                await supabase.from('zaino_giocatore')
                    .delete()
                    .eq('giocatore_id', playerId)
                    .eq('oggetto_id', item.oggetto.id);
            }
            caricaDatiExtra(playerId);
        } catch (err) { console.error(err); }
    };

    const rimuoviPokemon = async (pkmnId, playerId) => {
        setConfirmModal({
            title: "Liberare Pokémon?",
            message: "Questa azione è irreversibile. Il Pokémon lascerà la squadra per sempre.",
            type: 'error',
            onConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from('pokemon_giocatore')
                        .delete()
                        .eq('id', pkmnId);
                    if (error) throw error;
                    caricaDatiExtra(playerId);
                    setConfirmModal(null);
                } catch (err) { console.error(err); }
            }
        });
    };

    const handleStatChange = (stat, value) => {
        setEditForm(prev => ({
            ...prev,
            [stat]: parseInt(value) || 0
        }));
    };

    const saveChanges = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('giocatori')
                .update({
                    nome: editForm.nome,
                    hp: editForm.hp,
                    hp_max: editForm.hp_max,
                    livello_allenatore: editForm.livello_allenatore,
                    punti_tlp: editForm.punti_tlp,
                    forza: editForm.forza,
                    destrezza: editForm.destrezza,
                })
                .eq('id', editForm.id);

            if (error) throw error;

            // Aggiorna lista locale
            setGiocatori(prev => prev.map(g => g.id === editForm.id ? editForm : g));
            setIsEditing(false);
        } catch (err) {
            console.error("Errore salvataggio giocatore:", err);
            alert("Errore durante il salvataggio. Riprova.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading-state"><Loader2 className="spin" size={32} /></div>;

    return (
        <div className="party-page animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title" style={{ color: 'var(--text-master)' }}>
                        <Users size={32} color="#a78bfa" />
                        Gestione Party
                    </h1>
                    <p className="page-subtitle" style={{ color: 'var(--text-master)', opacity: 0.7 }}>Monitora e modifica le statistiche dei tuoi allenatori</p>
                </div>
                <button className="btn-refresh" onClick={caricaGiocatori} title="Aggiorna Lista">
                    <TrendingUp size={16} />
                </button>
            </div>

            {giocatori.length === 0 ? (
                <div className="empty-party flex-center">
                    <div className="empty-icon-bg">
                        <Users size={48} color="rgba(255,255,255,0.1)" />
                    </div>
                    <h3>Ancora nessuno al tavolo?</h3>
                    <p>Condividi il codice invito della campagna per far unire i tuoi amici!</p>
                </div>
            ) : (
                <div className="party-grid">
                    {giocatori.map((player) => {
                        const hpPercent = Math.max(0, Math.min(100, (player.hp / player.hp_max) * 100));
                        const hpColor = hpPercent > 50 ? '#34d399' : hpPercent > 20 ? '#fbbf24' : '#ef4444';

                        return (
                            <div key={player.id} className="player-card" onClick={() => openEditModal(player)}>
                                <div className="player-card-header">
                                    <div className="player-card-avatar">
                                        {player.immagine_profilo ? (
                                            <img src={player.immagine_profilo} alt={player.nome} />
                                        ) : (
                                            <div className="avatar-initial">{player.nome?.[0]?.toUpperCase()}</div>
                                        )}
                                    </div>
                                    <div className="player-card-info">
                                        <h3>{player.nome}</h3>
                                        <span>Livello {player.livello_allenatore}</span>
                                    </div>
                                    <Edit2 size={16} className="edit-hint-icon" />
                                </div>

                                <div className="player-card-body">
                                    <div className="hp-mini-row">
                                        <div className="hp-mini-stats">
                                            <span>HP</span>
                                            <span style={{ color: hpColor }}>{player.hp}/{player.hp_max}</span>
                                        </div>
                                        <div className="hp-mini-bar-bg">
                                            <div
                                                className="hp-mini-bar-fill"
                                                style={{ width: `${hpPercent}%`, backgroundColor: hpColor }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className="stats-mini-grid">
                                        <div className="stat-mini-box">
                                            <Zap size={14} color="#ef4444" />
                                            <span>{player.forza}</span>
                                        </div>
                                        <div className="stat-mini-box">
                                            <Shield size={14} color="#3b82f6" />
                                            <span>{player.destrezza}</span>
                                        </div>
                                        <div className="stat-mini-box">
                                            <TrendingUp size={14} color="#fcd34d" />
                                            <span>{player.punti_tlp}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* MODAL DI MODIFICA MASTER */}
            {isEditing && editForm && (
                <div className="modal-overlay" onClick={() => setIsEditing(false)}>
                    <div className="modal-content master-edit-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-left">
                                <div className="modal-header-avatar">
                                    {editForm.immagine_profilo ? (
                                        <img src={editForm.immagine_profilo} alt={editForm.nome} />
                                    ) : (
                                        <div className="avatar-initial">{editForm.nome?.[0]?.toUpperCase()}</div>
                                    )}
                                </div>
                                <div>
                                    <h2>Modifica Allenatore</h2>
                                    <p>{editForm.nome}</p>
                                </div>
                            </div>
                            <button className="modal-close" onClick={() => setIsEditing(false)}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className="modal-tabs">
                            <button
                                className={`modal-tab ${activeTab === 'stats' ? 'active' : ''}`}
                                onClick={() => setActiveTab('stats')}
                            >
                                <Zap size={18} /> Statistiche
                            </button>
                            <button
                                className={`modal-tab ${activeTab === 'zaino' ? 'active' : ''}`}
                                onClick={() => setActiveTab('zaino')}
                            >
                                <Users size={18} /> Zaino
                            </button>
                            <button
                                className={`modal-tab ${activeTab === 'pokemon' ? 'active' : ''}`}
                                onClick={() => setActiveTab('pokemon')}
                            >
                                <TrendingUp size={18} /> Pokémon
                            </button>
                        </div>

                        <div className="modal-body-scroll">
                            {activeTab === 'stats' && (
                                <div className="edit-section-container animate-fade-in">
                                    <div className="edit-section">
                                        <h4 className="edit-section-title"><Heart size={16} /> Salute e Crescita</h4>
                                        <div className="edit-grid-2">
                                            <div className="input-field">
                                                <label>HP Attuali</label>
                                                <input
                                                    type="number"
                                                    value={editForm.hp}
                                                    onChange={(e) => handleStatChange('hp', e.target.value)}
                                                />
                                            </div>
                                            <div className="input-field">
                                                <label>HP Massimi</label>
                                                <input
                                                    type="number"
                                                    value={editForm.hp_max}
                                                    onChange={(e) => handleStatChange('hp_max', e.target.value)}
                                                />
                                            </div>
                                            <div className="input-field">
                                                <label>Livello</label>
                                                <input
                                                    type="number"
                                                    value={editForm.livello_allenatore}
                                                    onChange={(e) => handleStatChange('livello_allenatore', e.target.value)}
                                                />
                                            </div>
                                            <div className="input-field">
                                                <label>Punti TLP (EXP)</label>
                                                <input
                                                    type="number"
                                                    value={editForm.punti_tlp}
                                                    onChange={(e) => handleStatChange('punti_tlp', e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="edit-section">
                                        <h4 className="edit-section-title"><Shield size={16} /> Statistiche Base</h4>
                                        <div className="edit-grid-2">
                                            <div className="input-field">
                                                <label>Forza (ATK FISICO)</label>
                                                <div className="input-with-icon">
                                                    <Zap size={14} color="#ef4444" />
                                                    <input
                                                        type="number"
                                                        value={editForm.forza}
                                                        onChange={(e) => handleStatChange('forza', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="input-field">
                                                <label>Destrezza (DEF FISICA)</label>
                                                <div className="input-with-icon">
                                                    <Shield size={14} color="#3b82f6" />
                                                    <input
                                                        type="number"
                                                        value={editForm.destrezza}
                                                        onChange={(e) => handleStatChange('destrezza', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'zaino' && (
                                <div className="edit-section-container animate-fade-in">
                                    <div className="section-header-row">
                                        <h4 className="edit-section-title">{showAddItem ? 'Seleziona Oggetti' : 'Zaino dell\'Allenatore'}</h4>
                                        <button
                                            className={`btn-add-mini ${showAddItem ? 'active' : ''}`}
                                            onClick={() => {
                                                setShowAddItem(!showAddItem);
                                                setAddCart({});
                                            }}
                                        >
                                            {showAddItem ? <X size={14} /> : <Plus size={14} />}
                                            {showAddItem ? 'Annulla' : 'Aggiungi'}
                                        </button>
                                    </div>

                                    {showAddItem ? (
                                        <div className="add-items-picker animate-slide-up">
                                            <div className="picker-list">
                                                {allOggetti.map(ogg => (
                                                    <div key={ogg.id} className="picker-row">
                                                        <div className="picker-info">
                                                            <div className="picker-img">
                                                                {ogg.immagine_url ? <img src={ogg.immagine_url} alt={ogg.nome} /> : <Package size={18} />}
                                                            </div>
                                                            <div>
                                                                <strong>{ogg.nome}</strong>
                                                                <span>{ogg.categoria}</span>
                                                            </div>
                                                        </div>
                                                        <div className="picker-controls">
                                                            <button onClick={() => updateCart(ogg.id, -1)} className="qty-btn">-</button>
                                                            <span className="qty-val">{addCart[ogg.id] || 0}</span>
                                                            <button onClick={() => updateCart(ogg.id, 1)} className="qty-btn">+</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <button
                                                className="btn-confirm-add"
                                                onClick={handleConfirmAddItems}
                                                disabled={savingItem || Object.values(addCart).every(v => v === 0)}
                                            >
                                                {savingItem ? <Loader2 size={18} className="spin" /> : <Check size={18} />}
                                                Trasferisci nello Zaino
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="items-grid-master">
                                            {loadingExtra ? (
                                                <div className="flex-center p-xl"><Loader2 className="spin" /></div>
                                            ) : playerItems.length === 0 ? (
                                                <p className="empty-text">Lo zaino è vuoto.</p>
                                            ) : (
                                                playerItems.map((item, idx) => (
                                                    <div key={idx} className="item-card-master">
                                                        <div className="item-card-main">
                                                            <div className="item-img-box">
                                                                {item.oggetto.immagine_url ? (
                                                                    <img src={item.oggetto.immagine_url} alt={item.oggetto.nome} />
                                                                ) : (
                                                                    <Package size={20} />
                                                                )}
                                                                <span className="qty-badge">x{item.quantita}</span>
                                                            </div>
                                                            <div className="item-details">
                                                                <strong>{item.oggetto.nome}</strong>
                                                                <p>{item.oggetto.categoria}</p>
                                                            </div>
                                                        </div>
                                                        <div className="item-card-actions">
                                                            <button
                                                                className="btn-icon-sm"
                                                                title="Sottrai 1"
                                                                onClick={() => sottraiUno(item, editForm.id)}
                                                            >
                                                                <Minus size={12} />
                                                            </button>
                                                            <button
                                                                className="btn-icon-sm btn-del"
                                                                onClick={() => rimuoviOggetto(item.oggetto.id, editForm.id)}
                                                            >
                                                                <X size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                                ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'pokemon' && (
                                <div className="edit-section-container animate-fade-in">
                                    <div className="section-header-row">
                                        <h4 className="edit-section-title">Squadra e Box</h4>
                                        <button className="btn-add-mini"><TrendingUp size={14} /> Nuovo Pkmn</button>
                                    </div>
                                    <div className="pokemon-grid-master">
                                        {loadingExtra ? (
                                            <div className="flex-center p-xl"><Loader2 className="spin" /></div>
                                        ) : playerPokemon.length === 0 ? (
                                            <p className="empty-text">Nessun Pokémon registrato.</p>
                                        ) : (
                                            playerPokemon.map(poke => {
                                                const hpPct = (poke.hp_attuale / poke.hp_max) * 100;
                                                const hpCol = hpPct > 50 ? '#34d399' : hpPct > 20 ? '#fbbf24' : '#ef4444';

                                                return (
                                                    <div key={poke.id} className="pkmn-card-master">
                                                        <div className="pkmn-card-top">
                                                            <div className="pkmn-thumb">
                                                                <img
                                                                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${poke.pokemon_id}.png`}
                                                                    alt={poke.soprannome}
                                                                />
                                                            </div>
                                                            <div className="pkmn-info">
                                                                <div className="pkmn-name-row">
                                                                    <strong>{poke.soprannome}</strong>
                                                                    <span className="lvl-tag">Lv.{poke.livello}</span>
                                                                </div>
                                                                <div className="pkmn-types">
                                                                    <span className="type-tag" style={{ borderLeftColor: `var(--type-${poke.tipo1?.toLowerCase()})` }}>
                                                                        {poke.tipo1}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="pkmn-card-bottom">
                                                            <div className="pkmn-hp-bar">
                                                                <div className="hp-fill" style={{ width: `${hpPct}%`, backgroundColor: hpCol }}></div>
                                                            </div>
                                                            <div className="pkmn-actions">
                                                                <button className="btn-icon-sm" title="Modifica Stats"><Edit2 size={12} /></button>
                                                                <button
                                                                    className="btn-icon-sm btn-del"
                                                                    onClick={() => rimuoviPokemon(poke.id, editForm.id)}
                                                                >
                                                                    <X size={12} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setIsEditing(false)}>Annulla</button>
                            <button className="btn-save" onClick={saveChanges} disabled={saving}>
                                {saving ? <Loader2 size={18} className="spin" /> : <><Save size={18} /> Salva Modifiche</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DI CONFERMA GRAFICO */}
            {confirmModal && (
                <div className="modal-overlay confirm-layout" onClick={() => setConfirmModal(null)}>
                    <div className="modal-content confirm-modal animate-float" onClick={e => e.stopPropagation()}>
                        <div className={`confirm-icon-bg ${confirmModal.type}`}>
                            {confirmModal.type === 'error' ? <X size={32} /> : <Package size={32} />}
                        </div>
                        <h3>{confirmModal.title}</h3>
                        <p>{confirmModal.message}</p>
                        <div className="confirm-buttons">
                            <button className="btn-cancel" onClick={() => setConfirmModal(null)}>Annulla</button>
                            <button className={`btn-confirm-action ${confirmModal.type}`} onClick={confirmModal.onConfirm}>
                                Conferma
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
