import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Users, User, Shield, Zap, Edit2, Loader2, X, Check, Save, Heart, TrendingUp, Plus, Package, Trash2, Search, Info, Camera } from 'lucide-react';
import './Party.css';

export default function NPC() {
    console.log("NPC Dashboard Mounting (Stable)...");
    const { profile } = useAuth();
    const [npcs, setNpcs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNPC, setSelectedNPC] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);

    // Stato temporaneo per la modifica
    const [editForm, setEditForm] = useState(null);
    const [activeTab, setActiveTab] = useState('stats'); // 'stats' | 'zaino' | 'pokemon'
    const [npcItems, setNpcItems] = useState([]);
    const [npcPokemon, setNpcPokemon] = useState([]);
    const [allOggetti, setAllOggetti] = useState([]);
    const [loadingExtra, setLoadingExtra] = useState(false);

    // Stati per l'aggiunta oggetti
    const [showAddItem, setShowAddItem] = useState(false);
    const [addCart, setAddCart] = useState({});
    const [savingItem, setSavingItem] = useState(false);

    // Stati per i Pokémon
    const [editingPkmn, setEditingPkmn] = useState(null);
    const [searching, setSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [fullPokeList, setFullPokeList] = useState([]);
    const [filteredPokeList, setFilteredPokeList] = useState([]);
    const [sortOrder, setSortOrder] = useState('id');

    // Stato per la conferma
    const [confirmModal, setConfirmModal] = useState(null);

    useEffect(() => {
        if (!profile?.campagna_corrente_id) return;

        caricaNPC();

        const channel = supabase
            .channel(`npcs-${profile.campagna_corrente_id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'giocatori',
                    filter: `campagna_corrente_id=eq.${profile.campagna_corrente_id}`
                },
                (payload) => {
                    if (payload.new?.ruolo === 'npc' || payload.old?.ruolo === 'npc') {
                        caricaNPC();
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.campagna_corrente_id]);

    async function caricaNPC() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('giocatori')
                .select('*')
                .eq('campagna_corrente_id', profile.campagna_corrente_id)
                .eq('ruolo', 'npc');

            if (error) throw error;
            setNpcs(data || []);
        } catch (err) {
            console.error("Errore caricamento NPC:", err);
        } finally {
            setLoading(false);
        }
    }

    async function creaNPC() {
        setSaving(true);
        try {
            const { data, error } = await supabase
                .from('giocatori')
                .insert([{
                    id: crypto.randomUUID(),
                    nome: 'Nuovo NPC',
                    ruolo: 'npc',
                    campagna_corrente_id: profile.campagna_corrente_id,
                    hp_max: 100,
                    hp: 100,
                    livello_allenatore: 1,
                    punti_tlp: 0,
                    forza: 10,
                    destrezza: 10,
                    immagine_profilo: ''
                }])
                .select();

            if (error) throw error;
            if (data?.[0]) {
                openEditModal(data[0]);
            }
        } catch (err) {
            console.error("Errore creazione NPC:", err);
        } finally {
            setSaving(false);
        }
    }

    const openEditModal = async (npc) => {
        setSelectedNPC(npc);
        setEditForm({ ...npc });
        setActiveTab('stats');
        setIsEditing(true);
        setLoadingExtra(true);
        setShowAddItem(false);

        try {
            const { data: items } = await supabase
                .from('zaino_giocatore')
                .select('*, oggetti(*)')
                .eq('giocatore_id', npc.id);
            setNpcItems(items || []);

            const { data: pokes } = await supabase
                .from('pokemon_squadra')
                .select('*')
                .eq('giocatore_id', npc.id)
                .order('created_at', { ascending: true });
            setNpcPokemon(pokes || []);

            if (allOggetti.length === 0) {
                const { data: ogg } = await supabase.from('oggetti').select('*').order('nome');
                setAllOggetti(ogg || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingExtra(false);
        }
    };

    const handleStatChange = (stat, value) => {
        setEditForm(prev => ({ ...prev, [stat]: value }));
    };

    async function salvaModifiche() {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('giocatori')
                .update({
                    nome: editForm.nome,
                    hp: parseInt(editForm.hp),
                    hp_max: parseInt(editForm.hp_max),
                    livello_allenatore: parseInt(editForm.livello_allenatore),
                    punti_tlp: parseInt(editForm.punti_tlp),
                    forza: parseInt(editForm.forza),
                    destrezza: parseInt(editForm.destrezza),
                    immagine_profilo: editForm.immagine_profilo
                })
                .eq('id', editForm.id);

            if (error) throw error;
            setIsEditing(false);
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    }

    async function rimuoviNPC(id) {
        setConfirmModal({
            title: "Eliminare NPC?",
            message: "Tutti i dati, oggetti e Pokémon associati verranno rimossi permanentemente.",
            type: "error",
            onConfirm: async () => {
                const { error } = await supabase.from('giocatori').delete().eq('id', id);
                if (error) console.error(error);
                setConfirmModal(null);
                if (isEditing) setIsEditing(false);
            }
        });
    }

    async function caricaPokedexLibrary() {
        if (fullPokeList.length > 0) return;
        setSearching(true);
        try {
            const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025');
            const data = await res.json();
            const list = data.results.map((p, idx) => ({ id: idx + 1, name: p.name }));
            setFullPokeList(list);
            setFilteredPokeList(list);
        } catch (err) {
            console.error(err);
        } finally {
            setSearching(false);
        }
    }

    useEffect(() => {
        let list = [...fullPokeList];
        if (searchQuery) list = list.filter(p => p.name.includes(searchQuery.toLowerCase().trim()));
        if (sortOrder === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
        else list.sort((a, b) => a.id - b.id);
        setFilteredPokeList(list);
    }, [searchQuery, sortOrder, fullPokeList]);

    async function selectFromLibrary(p) {
        setSearching(true);
        try {
            const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${p.id}`);
            const data = await res.json();
            setSearchResult(data);
        } catch (err) {
            console.error(err);
        } finally {
            setSearching(false);
        }
    }

    async function aggiungiPokemon() {
        if (!searchResult) return;
        setSaving(true);
        try {
            const { error } = await supabase.from('pokemon_squadra').insert([{
                giocatore_id: editForm.id,
                nome: searchResult.name.toUpperCase(),
                soprannome: searchResult.name.toUpperCase(),
                livello: 5,
                tipo1: searchResult.types[0].type.name.toUpperCase(),
                tipo2: searchResult.types[1]?.type.name.toUpperCase() || null,
                immagine_url: searchResult.sprites.other['official-artwork'].front_default,
                hp_max: 20,
                hp_attuale: 20,
                base_id: searchResult.id
            }]);
            if (error) throw error;
            setShowAddItem(false);
            setSearchResult(null);
            const { data: pokes } = await supabase.from('pokemon_squadra').select('*').eq('giocatore_id', editForm.id);
            setNpcPokemon(pokes || []);
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    }

    async function rimuoviPokemonSquadra(id) {
        const { error } = await supabase.from('pokemon_squadra').delete().eq('id', id);
        if (!error) setNpcPokemon(prev => prev.filter(p => p.id !== id));
    }

    const updateCart = (oggId, delta) => {
        setAddCart(prev => {
            const newQty = (prev[oggId] || 0) + delta;
            if (newQty <= 0) {
                const { [oggId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [oggId]: newQty };
        });
    };

    async function handleConfirmAddItems() {
        setSavingItem(true);
        try {
            for (const [oggId, qty] of Object.entries(addCart)) {
                const { data: existing } = await supabase
                    .from('zaino_giocatore')
                    .select('*')
                    .eq('giocatore_id', editForm.id)
                    .eq('oggetto_id', oggId)
                    .single();

                if (existing) {
                    await supabase.from('zaino_giocatore').update({ quantita: existing.quantita + qty }).eq('id', existing.id);
                } else {
                    await supabase.from('zaino_giocatore').insert({ giocatore_id: editForm.id, oggetto_id: oggId, quantita: qty });
                }
            }
            setShowAddItem(false);
            setAddCart({});
            const { data: items } = await supabase.from('zaino_giocatore').select('*, oggetti(*)').eq('giocatore_id', editForm.id);
            setNpcItems(items || []);
        } catch (err) {
            console.error(err);
        } finally {
            setSavingItem(false);
        }
    }

    async function removeItem(id) {
        const { error } = await supabase.from('zaino_giocatore').delete().eq('id', id);
        if (!error) setNpcItems(prev => prev.filter(i => i.id !== id));
    }

    return (
        <div className="party-page animate-fade-in">
            <header className="party-header">
                <div>
                    <h1>Gestione NPC</h1>
                    <p>Crea e gestisci i personaggi non giocanti della tua campagna</p>
                </div>
                <button className="btn-save" onClick={creaNPC} disabled={saving} style={{ marginTop: '20px' }}>
                    {saving ? <Loader2 className="spin" /> : <Plus size={18} />}
                    Nuovo NPC
                </button>
            </header>

            {loading ? (
                <div className="flex-center p-xl"><Loader2 className="spin" size={40} /></div>
            ) : (
                <div className="party-grid" style={{ marginTop: '30px' }}>
                    {npcs.length === 0 ? (
                        <div className="empty-state">
                            <Users size={48} color="rgba(255,255,255,0.2)" />
                            <h3>Nessun NPC creato</h3>
                            <p>Inizia creando il tuo primo boss o alleato!</p>
                        </div>
                    ) : (
                        npcs.map(npc => {
                            const hpPerc = Math.round((npc.hp / (npc.hp_max || 1)) * 100);
                            const hpColor = hpPerc > 50 ? '#10b981' : hpPerc > 20 ? '#f59e0b' : '#ef4444';
                            return (
                                <div key={npc.id} className="player-card" onClick={() => openEditModal(npc)}>
                                    <div className="player-card-header">
                                        <div className="player-card-avatar">
                                            {npc.immagine_profilo ? (
                                                <img src={npc.immagine_profilo} alt={npc.nome} />
                                            ) : (
                                                <div className="avatar-initial">{npc.nome?.[0]?.toUpperCase()}</div>
                                            )}
                                        </div>
                                        <div className="player-card-info">
                                            <h3>{npc.nome}</h3>
                                            <span>Livello {npc.livello_allenatore}</span>
                                        </div>
                                        <Edit2 size={16} className="edit-hint-icon" />
                                    </div>

                                    <div className="player-card-body">
                                        <div className="hp-mini-row">
                                            <div className="hp-mini-stats">
                                                <span>HP</span>
                                                <span style={{ color: hpColor }}>{npc.hp}/{npc.hp_max}</span>
                                            </div>
                                            <div className="hp-mini-bar-bg">
                                                <div
                                                    className="hp-mini-bar-fill"
                                                    style={{ width: `${hpPerc}%`, backgroundColor: hpColor }}
                                                ></div>
                                            </div>
                                        </div>

                                        <div className="stats-mini-grid">
                                            <div className="stat-mini-box">
                                                <Zap size={14} color="#ef4444" />
                                                <span>{npc.forza}</span>
                                            </div>
                                            <div className="stat-mini-box">
                                                <Shield size={14} color="#3b82f6" />
                                                <span>{npc.destrezza}</span>
                                            </div>
                                            <div className="stat-mini-box" onClick={(e) => { e.stopPropagation(); rimuoviNPC(npc.id); }} style={{ background: 'rgba(239, 68, 68, 0.1)', cursor: 'pointer' }}>
                                                <Trash2 size={14} color="#ef4444" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {isEditing && editForm && (
                <div className="modal-overlay">
                    <div className="master-edit-modal npc-modal-premium animate-slide-up">
                        <div className="modal-header header-reversed">
                            <div className="modal-header-info">
                                <div className="modal-title-npc">
                                    <span className="modal-subtitle-npc">CONFIGURAZIONE NPC</span>
                                    <input
                                        className="edit-npc-name-input-hero"
                                        value={editForm.nome}
                                        onChange={(e) => handleStatChange('nome', e.target.value)}
                                        placeholder="Nome NPC..."
                                    />
                                </div>
                                <div className="modal-avatar-preview npc-preview-aura right-side" onClick={() => setActiveTab('stats')}>
                                    {editForm.immagine_profilo ? (
                                        <img src={editForm.immagine_profilo} alt={editForm.nome} />
                                    ) : (
                                        <div className="avatar-placeholder-master large"><User size={40} /></div>
                                    )}
                                    <div className="avatar-edit-overlay">
                                        <Camera size={26} />
                                    </div>
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
                                <Package size={18} /> Zaino
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
                                        <h4 className="edit-section-title"><Heart size={16} /> Salute e Livello</h4>
                                        <div className="edit-grid-3">
                                            <div className="input-field">
                                                <label>HP Attuali</label>
                                                <input type="number" value={editForm.hp} onChange={(e) => handleStatChange('hp', e.target.value)} />
                                            </div>
                                            <div className="input-field">
                                                <label>HP Max</label>
                                                <input type="number" value={editForm.hp_max} onChange={(e) => handleStatChange('hp_max', e.target.value)} />
                                            </div>
                                            <div className="input-field">
                                                <label>Livello</label>
                                                <input type="number" value={editForm.livello_allenatore} onChange={(e) => handleStatChange('livello_allenatore', e.target.value)} />
                                            </div>
                                            <div className="input-field" style={{ gridColumn: 'span 3' }}>
                                                <label>URL Immagine Profilo</label>
                                                <div className="input-with-icon">
                                                    <Camera size={14} color="var(--text-muted)" />
                                                    <input
                                                        value={editForm.immagine_profilo || ''}
                                                        onChange={(e) => handleStatChange('immagine_profilo', e.target.value)}
                                                        placeholder="Inserisci link immagine (PNG/JPG)..."
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="edit-section">
                                        <h4 className="edit-section-title"><Shield size={16} /> Statistiche di Combattimento</h4>
                                        <div className="edit-grid-2">
                                            <div className="input-field">
                                                <label>Forza (Attacco)</label>
                                                <div className="input-with-icon">
                                                    <Zap size={14} color="#ef4444" />
                                                    <input type="number" value={editForm.forza} onChange={(e) => handleStatChange('forza', e.target.value)} />
                                                </div>
                                            </div>
                                            <div className="input-field">
                                                <label>Destrezza (Difesa)</label>
                                                <div className="input-with-icon">
                                                    <Shield size={14} color="#3b82f6" />
                                                    <input type="number" value={editForm.destrezza} onChange={(e) => handleStatChange('destrezza', e.target.value)} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'zaino' && (
                                <div className="edit-section-container animate-fade-in">
                                    <div className="section-header-row">
                                        <h4 className="edit-section-title">{showAddItem ? 'Assegna Oggetti' : 'Zaino NPC'}</h4>
                                        <button className={`btn-add-mini ${showAddItem ? 'active' : ''}`} onClick={() => { setShowAddItem(!showAddItem); setAddCart({}); }}>
                                            {showAddItem ? <X size={14} /> : <Plus size={14} />} {showAddItem ? 'Annulla' : 'Aggiungi'}
                                        </button>
                                    </div>

                                    {showAddItem ? (
                                        <div className="add-items-picker animate-slide-up">
                                            <div className="picker-list">
                                                {allOggetti.map(ogg => (
                                                    <div key={ogg.id} className="picker-row">
                                                        <div className="picker-info">
                                                            <div className="picker-img">{ogg.immagine_url ? <img src={ogg.immagine_url} alt={ogg.nome} /> : <Package size={18} />}</div>
                                                            <div><strong>{ogg.nome}</strong><span>{ogg.categoria}</span></div>
                                                        </div>
                                                        <div className="picker-controls">
                                                            <button onClick={() => updateCart(ogg.id, -1)} className="qty-btn">-</button>
                                                            <span className="qty-val">{addCart[ogg.id] || 0}</span>
                                                            <button onClick={() => updateCart(ogg.id, 1)} className="qty-btn">+</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <button className="btn-confirm-add" onClick={handleConfirmAddItems} disabled={savingItem || Object.values(addCart).every(v => v === 0)}>
                                                {savingItem ? <Loader2 size={18} className="spin" /> : <Check size={18} />} Conferma Aggiunta
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="items-grid-master">
                                            {npcItems.length === 0 ? <p className="empty-msg-master">Nessun oggetto nello zaino</p> : npcItems.map(item => (
                                                <div key={item.id} className="item-card-master">
                                                    <div className="icm-header">
                                                        <div className="icm-img">{item.oggetti?.immagine_url ? <img src={item.oggetti.immagine_url} alt={item.oggetti.nome} /> : <Package size={16} />}</div>
                                                        <div className="icm-info"><strong>{item.oggetti?.nome}</strong><span>x{item.quantita}</span></div>
                                                    </div>
                                                    <button className="btn-del-sm" onClick={() => removeItem(item.id)}><Trash2 size={12} /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'pokemon' && (
                                <div className="edit-section-container animate-fade-in">
                                    <div className="section-header-row">
                                        <h4 className="edit-section-title">{showAddItem ? 'Nuovo Pkmn dalla Library' : 'Squadra NPC'}</h4>
                                        <button className={`btn-add-mini ${showAddItem ? 'active' : ''}`} onClick={() => { setShowAddItem(!showAddItem); if (!showAddItem) caricaPokedexLibrary(); setSearchResult(null); setSearchQuery(''); }}>
                                            {showAddItem ? <X size={14} /> : <Plus size={14} />} {showAddItem ? 'Annulla' : 'Aggiungi'}
                                        </button>
                                    </div>

                                    {showAddItem ? (
                                        <div className="pokemon-search-view animate-slide-up library-mode">
                                            <div className="search-controls-master">
                                                <div className="search-bar-master"><input type="text" placeholder="Filtra Pokémon..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
                                                <div className="sort-controls">
                                                    <button className={`btn-sort ${sortOrder === 'id' ? 'active' : ''}`} onClick={() => setSortOrder('id')}># ID</button>
                                                    <button className={`btn-sort ${sortOrder === 'name' ? 'active' : ''}`} onClick={() => setSortOrder('name')}>A-Z</button>
                                                </div>
                                            </div>
                                            <div className="library-layout-master">
                                                <div className="pokemon-library-scroll">
                                                    {filteredPokeList.map(p => (
                                                        <div key={p.id} className={`library-item-pkmn ${searchResult?.id === p.id ? 'selected' : ''}`} onClick={() => selectFromLibrary(p)}>
                                                            <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`} alt={p.name} />
                                                            <span>{p.name.toUpperCase()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="library-selection-detail">
                                                    {searchResult ? (
                                                        <div className="search-result-card selection-mode animate-fade-in">
                                                            <img src={searchResult.sprites.other['official-artwork'].front_default} alt={searchResult.name} />
                                                            <div className="result-info">
                                                                <h3>#{searchResult.id} {searchResult.name.toUpperCase()}</h3>
                                                                <button className="btn-confirm-add" style={{ marginTop: '15px' }} onClick={aggiungiPokemon} disabled={saving}>Assegna all'NPC</button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="empty-selection-placeholder"><Info size={32} /><p>Seleziona un Pokémon</p></div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="pokemon-grid-master">
                                            {npcPokemon.length === 0 ? <p className="empty-msg-master">Nessun Pokémon in squadra</p> : npcPokemon.map(poke => (
                                                <div key={poke.id} className="pkmn-card-master">
                                                    <div className="pkmn-card-top">
                                                        <div className="pkmn-thumb"><img src={poke.immagine_url} alt={poke.soprannome} /></div>
                                                        <div className="pkmn-info">
                                                            <div className="pkmn-name-row"><strong>{poke.soprannome}</strong><span className="lvl-tag">Lv.{poke.livello}</span></div>
                                                            <div className="pkmn-types"><span className="type-tag" style={{ borderLeftColor: `var(--type-${poke.tipo1?.toLowerCase()})` }}>{poke.tipo1}</span></div>
                                                        </div>
                                                    </div>
                                                    <div className="pkmn-card-bottom">
                                                        <button className="btn-icon-sm btn-del" onClick={() => rimuoviPokemonSquadra(poke.id)}><Trash2 size={12} /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="modal-footer-centered">
                            <button className="btn-cancel-flat" onClick={() => setIsEditing(false)}>Annulla</button>
                            <button className="btn-save-hero" onClick={salvaModifiche} disabled={saving}>
                                {saving ? <Loader2 className="spin" /> : <Save size={18} />} Conferma Modifiche
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {confirmModal && (
                <div className="modal-overlay confirm-layout">
                    <div className="modal-content confirm-modal animate-slide-up">
                        <div className={`confirm-icon-bg ${confirmModal.type}`}>
                            {confirmModal.type === 'error' ? <Trash2 size={32} /> : <Check size={32} />}
                        </div>
                        <h3>{confirmModal.title}</h3>
                        <p>{confirmModal.message}</p>
                        <div className="confirm-buttons">
                            <button className="btn-cancel" onClick={() => setConfirmModal(null)}>Annulla</button>
                            <button className={`btn-confirm-action ${confirmModal.type}`} onClick={confirmModal.onConfirm}>Conferma</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
