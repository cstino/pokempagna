import { useState, useEffect, useRef } from 'react';
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
    const fileInputRef = useRef(null);
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

    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSaving(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `npcs/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setEditForm(prev => ({ ...prev, immagine_profilo: publicUrl }));
        } catch (err) {
            console.error("Errore upload immagine:", err);
            alert("Errore nel caricamento: " + err.message);
        } finally {
            setSaving(false);
        }
    };

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
                .from('pokemon_giocatore')
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
            await caricaNPC(); // Ricarica la lista per vedere i cambiamenti (es. immagine profilo)
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
            const { error } = await supabase.from('pokemon_giocatore').insert([{
                giocatore_id: editForm.id,
                pokemon_id: searchResult.id,
                soprannome: searchResult.name.toUpperCase(),
                livello: 5,
                hp_max: searchResult.stats[0].base_stat,
                hp_attuale: searchResult.stats[0].base_stat,
                attacco: searchResult.stats[1].base_stat,
                difesa: searchResult.stats[2].base_stat,
                attacco_speciale: searchResult.stats[3].base_stat,
                difesa_speciale: searchResult.stats[4].base_stat,
                velocita: searchResult.stats[5].base_stat,
                tipo1: searchResult.types[0].type.name.toUpperCase(),
                tipo2: searchResult.types[1]?.type.name.toUpperCase() || null,
                posizione_squadra: 99
            }]);
            if (error) throw error;
            setShowAddItem(false);
            setSearchResult(null);
            const { data: pokes } = await supabase.from('pokemon_giocatore').select('*').eq('giocatore_id', editForm.id).order('created_at', { ascending: true });
            setNpcPokemon(pokes || []);
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    }

    async function rimuoviPokemonSquadra(id) {
        const { error } = await supabase.from('pokemon_giocatore').delete().eq('id', id);
        if (!error) setNpcPokemon(prev => prev.filter(p => p.id !== id));
    }

    async function spostaPokemon(pkmnId, targetPos) {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('pokemon_giocatore')
                .update({ posizione_squadra: targetPos })
                .eq('id', pkmnId);

            if (error) throw error;
            const { data: pokes } = await supabase.from('pokemon_giocatore').select('*').eq('giocatore_id', editForm.id).order('posizione_squadra', { ascending: true });
            setNpcPokemon(pokes || []);
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    }

    const handlePokeStatChange = (stat, value) => {
        setEditingPkmn(prev => ({ ...prev, [stat]: stat === 'soprannome' ? value : (parseInt(value) || 0) }));
    };

    async function salvaPokeStats() {
        if (!editingPkmn) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('pokemon_giocatore')
                .update({
                    soprannome: editingPkmn.soprannome,
                    livello: editingPkmn.livello,
                    hp_attuale: editingPkmn.hp_attuale,
                    hp_max: editingPkmn.hp_max,
                    attacco: editingPkmn.attacco,
                    difesa: editingPkmn.difesa,
                    attacco_speciale: editingPkmn.attacco_speciale,
                    difesa_speciale: editingPkmn.difesa_speciale,
                    velocita: editingPkmn.velocita
                })
                .eq('id', editingPkmn.id);

            if (error) throw error;
            const { data: pokes } = await supabase.from('pokemon_giocatore').select('*').eq('giocatore_id', editForm.id).order('created_at', { ascending: true });
            setNpcPokemon(pokes || []);
            setEditingPkmn(null);
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
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
                                <div className="modal-avatar-preview npc-preview-aura right-side" onClick={() => fileInputRef.current?.click()}>
                                    {editForm.immagine_profilo ? (
                                        <img src={editForm.immagine_profilo} alt={editForm.nome} />
                                    ) : (
                                        <div className="avatar-placeholder-master large"><User size={40} /></div>
                                    )}
                                    <div className="avatar-edit-overlay">
                                        {saving ? <Loader2 className="spin" size={26} /> : <Camera size={26} />}
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleAvatarUpload}
                                        style={{ display: 'none' }}
                                        accept="image/*"
                                    />
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
                                                <div key={item.id} className="item-card-master premium-item-card">
                                                    <div className="item-card-main">
                                                        <div className="item-img-box">
                                                            {item.oggetti?.immagine_url ? <img src={item.oggetti.immagine_url} alt={item.oggetti.nome} /> : <Package size={20} />}
                                                        </div>
                                                        <div className="item-details">
                                                            <strong>{item.oggetti?.nome}</strong>
                                                        </div>
                                                    </div>
                                                    <span className="item-qty-badge">x{item.quantita}</span>
                                                    <button className="btn-del-absolute" onClick={() => removeItem(item.id)}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'pokemon' && (
                                <div className="edit-section-container animate-fade-in">
                                    <div className="section-header-row">
                                        <h4 className="edit-section-title">{showAddItem ? 'Nuovo Pkmn dalla Library' : 'Gestione Pokémon'}</h4>
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
                                        <div className="squadra-box-layout">
                                            <div className="squadra-section-master">
                                                <h5 className="title-premium-master team-title">SQUADRA</h5>
                                                <div className="pokemon-grid-master grid-4-cols">
                                                    {npcPokemon.filter(p => p.posizione_squadra < 99).length === 0 ? <p className="empty-msg-master">Nessun Pokémon in squadra</p> : npcPokemon.filter(p => p.posizione_squadra < 99).map((poke, idx) => {
                                                        const hpPerc = (poke.hp_attuale / poke.hp_max) * 100;
                                                        const hpColor = hpPerc > 50 ? '#10b981' : hpPerc > 20 ? '#f59e0b' : '#ef4444';

                                                        return (
                                                            <div key={poke.id} className="pkmn-card-squadra master-card-premium clickable" onClick={() => setEditingPkmn(poke)}>
                                                                <div className="pkmn-type-badge">{poke.tipo1?.toUpperCase()}</div>
                                                                <div className="pkmn-lvl-badge">Nv.{poke.livello}</div>

                                                                <img
                                                                    className="pkmn-image"
                                                                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${poke.pokemon_id}.png`}
                                                                    alt={poke.soprannome}
                                                                />

                                                                <div className="pkmn-card-details">
                                                                    <h3>{poke.soprannome?.toUpperCase()}</h3>
                                                                    <div className="hp-section">
                                                                        <div className="hp-info">
                                                                            <span>HP</span>
                                                                            <span>{poke.hp_attuale}/{poke.hp_max}</span>
                                                                        </div>
                                                                        <div className="hp-bar-bg">
                                                                            <div className="hp-bar-fill" style={{ width: `${hpPerc}%`, background: hpColor }}></div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                <div className="pkmn-card-actions-overlay-v3">
                                                                    <button className="btn-v3" title="Sposta in Box" onClick={(e) => { e.stopPropagation(); spostaPokemon(poke.id, 99); }}><Package size={18} /></button>
                                                                    <button className="btn-v3 del" onClick={(e) => { e.stopPropagation(); rimuoviPokemonSquadra(poke.id); }}><Trash2 size={18} /></button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className="box-section-master" style={{ marginTop: '50px', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '30px' }}>
                                                <h5 className="title-premium-master box-title">BOX</h5>
                                                <div className="pokemon-grid-master grid-4-cols">
                                                    {npcPokemon.filter(p => p.posizione_squadra >= 99).length === 0 ? <p className="empty-msg-master">Box vuoto</p> : npcPokemon.filter(p => p.posizione_squadra >= 99).map(poke => {
                                                        const hpPerc = (poke.hp_attuale / poke.hp_max) * 100;
                                                        const hpColor = hpPerc > 50 ? '#10b981' : hpPerc > 20 ? '#f59e0b' : '#ef4444';

                                                        return (
                                                            <div key={poke.id} className="pkmn-card-squadra compact-box-card-v3 clickable" onClick={() => setEditingPkmn(poke)}>
                                                                <div className="pkmn-lvl-badge" style={{ fontSize: '0.6rem' }}>Nv.{poke.livello}</div>
                                                                <img className="pkmn-image-mini" src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${poke.pokemon_id}.png`} alt={poke.soprannome} />
                                                                <div className="pkmn-name-mini">{poke.soprannome?.toUpperCase()}</div>

                                                                <div className="hp-section mini-hp">
                                                                    <div className="hp-info">
                                                                        <span>HP</span>
                                                                        <span>{poke.hp_attuale}/{poke.hp_max}</span>
                                                                    </div>
                                                                    <div className="hp-bar-bg mini-bar">
                                                                        <div className="hp-bar-fill" style={{ width: `${hpPerc}%`, background: hpColor }}></div>
                                                                    </div>
                                                                </div>

                                                                <div className="pkmn-card-actions-overlay-v3">
                                                                    <button className="btn-v3" title="Sposta in Squadra" onClick={(e) => { e.stopPropagation(); const sCount = npcPokemon.filter(p => p.posizione_squadra < 99).length; spostaPokemon(poke.id, sCount); }}><Plus size={18} /></button>
                                                                    <button className="btn-v3 del" onClick={(e) => { e.stopPropagation(); rimuoviPokemonSquadra(poke.id); }}><Trash2 size={18} /></button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
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

            {editingPkmn && (
                <div className="modal-overlay sub-modal">
                    <div className="master-edit-modal npc-modal-premium animate-slide-up">
                        <div className="modal-header header-reversed">
                            <div className="modal-header-info">
                                <div className="modal-title-npc">
                                    <span className="modal-subtitle-npc">MODIFICA POKÉMON</span>
                                    <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{editingPkmn.soprannome}</h3>
                                </div>
                                <div className="modal-avatar-preview npc-preview-aura right-side">
                                    <img src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${editingPkmn.pokemon_id}.png`} alt={editingPkmn.soprannome} />
                                </div>
                            </div>
                            <button className="modal-close" onClick={() => setEditingPkmn(null)}><X size={20} /></button>
                        </div>

                        <div className="npc-content-master scrollable" style={{ padding: '20px' }}>
                            <div className="edit-grid-2" style={{ marginBottom: '20px' }}>
                                <div className="input-field">
                                    <label>Soprannome</label>
                                    <input type="text" value={editingPkmn.soprannome} onChange={(e) => handlePokeStatChange('soprannome', e.target.value)} />
                                </div>
                                <div className="input-field">
                                    <label>Livello</label>
                                    <input type="number" value={editingPkmn.livello} onChange={(e) => handlePokeStatChange('livello', e.target.value)} />
                                </div>
                            </div>

                            <div className="edit-section-v2">
                                <h4 className="section-title-master">Punti Salute & Velocità</h4>
                                <div className="edit-grid-3">
                                    <div className="input-field">
                                        <label>HP Attuali</label>
                                        <input type="number" value={editingPkmn.hp_attuale} onChange={(e) => handlePokeStatChange('hp_attuale', e.target.value)} />
                                    </div>
                                    <div className="input-field">
                                        <label>HP Max</label>
                                        <input type="number" value={editingPkmn.hp_max} onChange={(e) => handlePokeStatChange('hp_max', e.target.value)} />
                                    </div>
                                    <div className="input-field">
                                        <label>Velocità</label>
                                        <input type="number" value={editingPkmn.velocita} onChange={(e) => handlePokeStatChange('velocita', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div className="edit-section-v2" style={{ marginTop: '20px' }}>
                                <h4 className="section-title-master">Statistiche Combattimento</h4>
                                <div className="edit-grid-2">
                                    <div className="input-field">
                                        <label>Attacco Fisico</label>
                                        <input type="number" value={editingPkmn.attacco} onChange={(e) => handlePokeStatChange('attacco', e.target.value)} />
                                    </div>
                                    <div className="input-field">
                                        <label>Difesa Fisica</label>
                                        <input type="number" value={editingPkmn.difesa} onChange={(e) => handlePokeStatChange('difesa', e.target.value)} />
                                    </div>
                                    <div className="input-field">
                                        <label>Attacco Speciale</label>
                                        <input type="number" value={editingPkmn.attacco_speciale} onChange={(e) => handlePokeStatChange('attacco_speciale', e.target.value)} />
                                    </div>
                                    <div className="input-field">
                                        <label>Difesa Speciale</label>
                                        <input type="number" value={editingPkmn.difesa_speciale} onChange={(e) => handlePokeStatChange('difesa_speciale', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer-centered">
                            <button className="btn-cancel-flat" onClick={() => setEditingPkmn(null)}>Annulla</button>
                            <button className="btn-save-hero" onClick={salvaPokeStats} disabled={saving}>
                                {saving ? <Loader2 className="spin" /> : <Save size={18} />} Salva Pokémon
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
