import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Users, User, Shield, Zap, Medal, Edit2, Loader2, X, Check, Save, Heart, TrendingUp, Plus, Minus, Package, Trash2, Search, Info, Layout, Camera, Upload, Leaf, Eye, BookOpen, MessageCircle, Swords } from 'lucide-react';
import { getTypeColor, getTypeLabel, getTypeEmoji } from '../../lib/typeColors';
import './Party.css';

export default function NPC() {
    const { profile } = useAuth();
    const [npcs, setNpcs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedNPC, setSelectedNPC] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const fileInputRef = useRef(null);

    // Stato temporaneo per la modifica (copia del profilo NPC)
    const [editForm, setEditForm] = useState(null);
    const [activeTab, setActiveTab] = useState('stats'); // 'stats' | 'zaino' | 'pokemon'
    const [npcItems, setNpcItems] = useState([]);
    const [npcPokemon, setNpcPokemon] = useState([]);
    const [allOggetti, setAllOggetti] = useState([]);
    const [loadingExtra, setLoadingExtra] = useState(false);

    // Stati per l'aggiunta oggetti
    const [showAddItem, setShowAddItem] = useState(false);
    const [addCart, setAddCart] = useState({}); // { oggId: qty }
    const [savingItem, setSavingItem] = useState(false);

    // Stati per i Pokémon
    const [editingPkmn, setEditingPkmn] = useState(null);
    const [searching, setSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [fullPokeList, setFullPokeList] = useState([]);
    const [filteredPokeList, setFilteredPokeList] = useState([]);
    const [sortOrder, setSortOrder] = useState('id'); // 'id' | 'name'

    // Stati per le Mosse (Master Edit)
    const [allAvailableMoves, setAllAvailableMoves] = useState([]);
    const [selectedPkmnMoveIds, setSelectedPkmnMoveIds] = useState([]); // Array di ID mosse assegnate
    const [moveSearch, setMoveSearch] = useState('');
    const [moveTypeFilter, setMoveTypeFilter] = useState('all');

    // Stato per la conferma personalizzata
    const [confirmModal, setConfirmModal] = useState(null); // { title, message, onConfirm, type }

    useEffect(() => {
        if (!profile?.campagna_corrente_id) return;

        caricaNPC();
        caricaTutteLeMosse();

        // 🔔 REALTIME: Ascolta i cambiamenti della tabella giocatori per questa campagna
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
                        if (payload.eventType === 'INSERT') {
                            setNpcs(prev => [...prev, payload.new]);
                        } else if (payload.eventType === 'UPDATE') {
                            setNpcs(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
                        } else if (payload.eventType === 'DELETE') {
                            setNpcs(prev => prev.filter(n => n.id === payload.old.id));
                        }
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

    async function caricaTutteLeMosse() {
        try {
            const { data, error } = await supabase.from('mosse_disponibili').select('*').order('nome');
            if (error) throw error;
            setAllAvailableMoves(data || []);
        } catch (err) { console.error("Errore caricamento mosse:", err); }
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
                    slot_squadra: 6, // Default per NPC spesso hanno più slot
                    immagine_profilo: '',
                    altre_stats: {}
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

    const openEditModal = (npc) => {
        setSelectedNPC(npc);
        setEditForm({ ...npc });
        setActiveTab('stats');
        setIsEditing(true);
        caricaDatiExtra(npc.id);
    };

    const caricaDatiExtra = async (npcId) => {
        setLoadingExtra(true);
        try {
            // Carica Zaino con Join su oggetti
            const { data: items, error: iErr } = await supabase
                .from('zaino_giocatore')
                .select(`
                    id,
                    quantita,
                    oggetto:oggetti (*)
                `)
                .eq('giocatore_id', npcId);

            if (iErr) throw iErr;

            // Carica Pokémon
            const { data: pokes, error: pErr } = await supabase
                .from('pokemon_giocatore')
                .select('*')
                .eq('giocatore_id', npcId)
                .order('posizione_squadra', { ascending: true });

            if (pErr) throw pErr;

            setNpcItems(items || []);
            setNpcPokemon(pokes || []);

            // Carica tutti gli oggetti disponibili (per il selettore)
            const { data: oggData } = await supabase.from('oggetti').select('*').order('nome');
            setAllOggetti(oggData || []);
        } catch (err) {
            console.error("Errore caricamento dati extra:", err);
        } finally {
            setLoadingExtra(false);
        }
    };

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
                const existing = npcItems.find(i => i.oggetto.id === oggId);
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

    const rimuoviOggetto = async (oggId, npcId) => {
        setConfirmModal({
            title: "Rimuovere Oggetto?",
            message: "L'oggetto verrà rimosso permanentemente dallo zaino dell'NPC.",
            type: 'error',
            onConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from('zaino_giocatore')
                        .delete()
                        .eq('giocatore_id', npcId)
                        .eq('oggetto_id', oggId);
                    if (error) throw error;
                    caricaDatiExtra(npcId);
                    setConfirmModal(null);
                } catch (err) { console.error(err); }
            }
        });
    };

    const sottraiUno = async (item, npcId) => {
        try {
            if (item.quantita > 1) {
                await supabase.from('zaino_giocatore')
                    .update({ quantita: item.quantita - 1 })
                    .eq('giocatore_id', npcId)
                    .eq('oggetto_id', item.oggetto.id);
            } else {
                await supabase.from('zaino_giocatore')
                    .delete()
                    .eq('giocatore_id', npcId)
                    .eq('oggetto_id', item.oggetto.id);
            }
            caricaDatiExtra(npcId);
        } catch (err) { console.error(err); }
    };

    const spostaPokemon = async (pkmnId, nuovaPosizione) => {
        try {
            const { error } = await supabase
                .from('pokemon_giocatore')
                .update({ posizione_squadra: nuovaPosizione })
                .eq('id', pkmnId);

            if (error) throw error;
            caricaDatiExtra(editForm.id);
        } catch (err) {
            console.error("Errore spostamento pokemon:", err);
        }
    };

    const rimuoviPokemon = async (pkmnId, npcId) => {
        setConfirmModal({
            title: "Liberare Pokémon?",
            message: "Questa azione è irreversibile. Il Pokémon lascerà la squadra dell'NPC per sempre.",
            type: 'error',
            onConfirm: async () => {
                try {
                    const { error } = await supabase
                        .from('pokemon_giocatore')
                        .delete()
                        .eq('id', pkmnId);
                    if (error) throw error;
                    caricaDatiExtra(npcId);
                    setConfirmModal(null);
                } catch (err) { console.error(err); }
            }
        });
    };

    const caricaPokedexLibrary = async () => {
        setSearching(true);
        try {
            const { data: list, error } = await supabase
                .from('pokemon_campagna')
                .select('*')
                .order('id', { ascending: true });

            if (error) throw error;
            setFullPokeList(list || []);
            setFilteredPokeList(list || []);
        } catch (err) {
            console.error("Errore caricamento libreria campagna:", err);
        } finally {
            setSearching(false);
        }
    };

    useEffect(() => {
        let list = [...fullPokeList];
        if (searchQuery) {
            list = list.filter(p => p.nome.toLowerCase().includes(searchQuery.toLowerCase().trim()));
        }
        if (sortOrder === 'name') {
            list.sort((a, b) => a.nome.localeCompare(b.nome));
        } else {
            list.sort((a, b) => a.id - b.id);
        }
        setFilteredPokeList(list);
    }, [searchQuery, sortOrder, fullPokeList]);

    const selectFromLibrary = async (p) => {
        setSearchResult({
            ...p,
            immagine_url: p.sprite_url,
            hp_base: p.hp_base,
            atk_base: p.atk_base,
            def_base: p.def_base,
            spatk_base: p.spatk_base,
            spdef_base: p.spdef_base,
            speed_base: p.speed_base
        });
        setSelectedPkmnMoveIds([]); // Reset mosse per il nuovo Pokémon
    };

    const handlePokeStatChange = (stat, value) => {
        setEditingPkmn(prev => ({
            ...prev,
            [stat]: stat === 'soprannome' ? value : (parseInt(value) || 0)
        }));
    };

    const startEditingPkmn = async (pkmn) => {
        setEditingPkmn(pkmn);
        try {
            const { data, error } = await supabase
                .from('mosse_pokemon')
                .select('mossa_id')
                .eq('pokemon_giocatore_id', pkmn.id);
            if (error) throw error;
            setSelectedPkmnMoveIds(data.map(m => m.mossa_id));
        } catch (err) { console.error("Errore recupero mosse assegnate:", err); }
    };

    const toggleMoveAssignment = (moveId, isChecked) => {
        if (!editingPkmn) return;

        if (isChecked) {
            setSelectedPkmnMoveIds(prev => [...prev, moveId]);
        } else {
            setSelectedPkmnMoveIds(prev => prev.filter(id => id !== moveId));
        }
    };

    const salvaPokeStats = async () => {
        if (!editingPkmn) return;
        setSaving(true);
        try {
            const pkmnData = {
                giocatore_id: editForm.id,
                pokemon_id: editingPkmn.pokemon_id,
                nome: editingPkmn.nome?.toUpperCase(),
                soprannome: (editingPkmn.soprannome || editingPkmn.nome)?.toUpperCase(),
                livello: editingPkmn.livello,
                hp_attuale: editingPkmn.hp_attuale,
                hp_max: editingPkmn.hp_max,
                attacco: editingPkmn.attacco,
                difesa: editingPkmn.difesa,
                attacco_speciale: editingPkmn.attacco_speciale,
                difesa_speciale: editingPkmn.difesa_speciale,
                velocita: editingPkmn.velocita,
                tipo1: editingPkmn.tipo1,
                tipo2: editingPkmn.tipo2,
                posizione_squadra: (editingPkmn.posizione_squadra !== undefined && editingPkmn.posizione_squadra !== null) ? editingPkmn.posizione_squadra : 99
            };

            if (editingPkmn.id) {
                const { error } = await supabase
                    .from('pokemon_giocatore')
                    .update(pkmnData)
                    .eq('id', editingPkmn.id);
                if (error) throw error;

                // AGGIORNAMENTO MOSSE PER POKEMON ESISTENTE
                // 1. Eliminiamo le vecchie assegnazioni
                await supabase.from('mosse_pokemon').delete().eq('pokemon_giocatore_id', editingPkmn.id);
                
                // 2. Inseriamo le nuove selezionate
                if (selectedPkmnMoveIds.length > 0) {
                    const movesToInsert = selectedPkmnMoveIds.map(moveId => {
                        const mDetails = allAvailableMoves.find(m => m.id === moveId);
                        return {
                            pokemon_giocatore_id: editingPkmn.id,
                            mossa_id: moveId,
                            nome: mDetails?.nome || 'Mossa',
                            tipo: mDetails?.tipo || 'normale',
                            pp_attuale: mDetails?.pp_max || 20,
                            attiva: true
                        };
                    });
                    const { error: mError } = await supabase.from('mosse_pokemon').insert(movesToInsert);
                    if (mError) throw mError;
                }
            } else {
                // INSERT (Nuovo Pokémon)
                const { data: newPkmn, error } = await supabase
                    .from('pokemon_giocatore')
                    .insert(pkmnData)
                    .select('id')
                    .single();
                
                if (error) throw error;

                // Se abbiamo mosse selezionate, salviamole ora che abbiamo l'ID
                if (newPkmn && selectedPkmnMoveIds.length > 0) {
                    const movesToInsert = selectedPkmnMoveIds.map(moveId => {
                        const mDetails = allAvailableMoves.find(m => m.id === moveId);
                        return {
                            pokemon_giocatore_id: newPkmn.id,
                            mossa_id: moveId,
                            nome: mDetails?.nome || 'Mossa',
                            tipo: mDetails?.tipo || 'normale',
                            pp_attuale: mDetails?.pp_max || 20,
                            attiva: true
                        };
                    });
                    
                    const { error: movesError } = await supabase
                        .from('mosse_pokemon')
                        .insert(movesToInsert);
                    
                    if (movesError) throw movesError;
                }
            }

            caricaDatiExtra(editForm.id);
            setEditingPkmn(null);
        } catch (err) {
            console.error("Errore salvataggio stats pokemon:", err);
            alert("Errore nel salvataggio.");
        } finally {
            setSaving(false);
        }
    };

    const handleAltreStatsChange = (stat, value) => {
        setEditForm(prev => ({
            ...prev,
            altre_stats: {
                ...(prev.altre_stats || {}),
                [stat]: parseInt(value) || 0
            }
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
                    slot_squadra: editForm.slot_squadra,
                    immagine_profilo: editForm.immagine_profilo
                })
                .eq('id', editForm.id);

            if (error) throw error;
            setIsEditing(false);
            caricaNPC();
        } catch (err) {
            console.error("Errore salvataggio NPC:", err);
            alert("Errore durante il salvataggio.");
        } finally {
            setSaving(false);
        }
    };

    const rimuoviNPC = async (npcId) => {
        setConfirmModal({
            title: "Eliminare NPC?",
            message: "Tutti i dati, oggetti e Pokémon associati verranno rimossi permanentemente.",
            type: "error",
            onConfirm: async () => {
                const { error } = await supabase.from('giocatori').delete().eq('id', npcId);
                if (error) {
                    console.error(error);
                    alert("Errore durante l'eliminazione.");
                } else {
                    setConfirmModal(null);
                    setIsEditing(false);
                    caricaNPC();
                }
            }
        });
    };

    if (loading) return <div className="loading-state"><Loader2 className="spin" size={32} /></div>;

    return (
        <div className="party-page animate-fade-in npc-mode">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <Users size={32} color="#818cf8" />
                        Gestione NPC
                    </h1>
                    <p className="page-subtitle">Crea e gestisci i personaggi non giocanti della tua campagna</p>
                </div>
                <div className="btn-group">
                    <button className="btn-refresh" onClick={caricaNPC} title="Aggiorna Lista">
                        <TrendingUp size={16} />
                    </button>
                    <button className="btn-save" onClick={creaNPC} disabled={saving}>
                        {saving ? <Loader2 className="spin" size={18} /> : <Plus size={18} />} Nuovo NPC
                    </button>
                </div>
            </div>

            {npcs.length === 0 ? (
                <div className="empty-party flex-center">
                    <div className="empty-icon-bg">
                        <Users size={48} color="rgba(255,255,255,0.1)" />
                    </div>
                    <h3>Nessun NPC creato</h3>
                    <p>Inizia creando il tuo primo boss o alleato!</p>
                </div>
            ) : (
                <div className="party-grid">
                    {npcs.map((npc) => {
                        const hpPercent = Math.max(0, Math.min(100, (npc.hp / npc.hp_max) * 100));
                        const hpColor = hpPercent > 50 ? '#34d399' : hpPercent > 20 ? '#fbbf24' : '#ef4444';

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
                                                style={{ width: `${hpPercent}%`, backgroundColor: hpColor }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className="stats-mini-grid">
                                        <div className="stat-mini-box" title="Vigore">
                                            <Heart size={14} color="#ef4444" />
                                            <span>{npc.forza}</span>
                                        </div>
                                        <div className="stat-mini-box" title="Destrezza">
                                            <Shield size={14} color="#3b82f6" />
                                            <span>{npc.destrezza}</span>
                                        </div>
                                        <div className="stat-mini-box del" onClick={(e) => { e.stopPropagation(); rimuoviNPC(npc.id); }}>
                                            <Trash2 size={14} color="#ef4444" />
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
                    <div className="modal-content master-edit-modal npc-modal-premium" onClick={e => e.stopPropagation()}>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            style={{ display: 'none', position: 'absolute', bottom: 0 }} 
                            onChange={handleAvatarUpload} 
                            accept="image/*" 
                        />
                        <div className="modal-header">
                            <div className="modal-header-left">
                                <div 
                                    className="modal-header-avatar header-avatar-trigger clickable" 
                                    onClick={(e) => { 
                                        e.preventDefault();
                                        e.stopPropagation(); 
                                        fileInputRef.current?.click(); 
                                    }}
                                    title="Cambia immagine"
                                >
                                    {editForm.immagine_profilo ? (
                                        <img src={editForm.immagine_profilo} alt={editForm.nome} />
                                    ) : (
                                        <div className="avatar-initial">{editForm.nome?.[0]?.toUpperCase()}</div>
                                    )}
                                    <div className="avatar-header-overlay">
                                        <Camera size={14} />
                                    </div>
                                </div>
                                <div className="modal-header-info-master">
                                    <span className="modal-subtitle-npc">CONFIGURAZIONE NPC</span>
                                    <div className="npc-name-edit-wrapper">
                                        <input 
                                            className="edit-npc-name-input-hero" 
                                            value={editForm.nome} 
                                            onChange={e => setEditForm({...editForm, nome: e.target.value})}
                                            placeholder="Inserisci nome NPC..."
                                            spellCheck="false"
                                            onClick={(e) => e.stopPropagation()}
                                        />
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
                                onClick={(e) => { e.stopPropagation(); setActiveTab('stats'); }}
                            >
                                <Zap size={18} /> Statistiche
                            </button>
                            <button
                                className={`modal-tab ${activeTab === 'zaino' ? 'active' : ''}`}
                                onClick={(e) => { e.stopPropagation(); setActiveTab('zaino'); }}
                            >
                                <Package size={18} /> Zaino
                            </button>
                            <button
                                className={`modal-tab ${activeTab === 'pokemon' ? 'active' : ''}`}
                                onClick={(e) => { e.stopPropagation(); setActiveTab('pokemon'); }}
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
                                                <input
                                                    type="number"
                                                    value={editForm.hp}
                                                    onChange={(e) => setEditForm({...editForm, hp: parseInt(e.target.value) || 0})}
                                                />
                                            </div>
                                            <div className="input-field">
                                                <label>HP Massimi</label>
                                                <input
                                                    type="number"
                                                    value={editForm.hp_max}
                                                    onChange={(e) => setEditForm({...editForm, hp_max: parseInt(e.target.value) || 0})}
                                                />
                                            </div>
                                            <div className="input-field">
                                                <label>Livello</label>
                                                <input
                                                    type="number"
                                                    value={editForm.livello_allenatore}
                                                    onChange={(e) => setEditForm({...editForm, livello_allenatore: parseInt(e.target.value) || 0})}
                                                />
                                            </div>
                                            <div className="input-field">
                                                <label>Punti TLP (EXP)</label>
                                                <input
                                                    type="number"
                                                    value={editForm.punti_tlp}
                                                    onChange={(e) => setEditForm({...editForm, punti_tlp: parseInt(e.target.value) || 0})}
                                                />
                                            </div>
                                            <div className="input-field">
                                                <label>Slot Squadra</label>
                                                <div className="input-with-icon">
                                                    <Layout size={14} color="#fcd34d" />
                                                    <input
                                                        type="number"
                                                        value={editForm.slot_squadra || 6}
                                                        onChange={(e) => setEditForm({...editForm, slot_squadra: parseInt(e.target.value) || 0})}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="edit-section">
                                        <h4 className="edit-section-title"><Camera size={16} /> Immagine Profilo</h4>
                                        <div className="avatar-interaction-v3">
                                            <div 
                                                className="avatar-preview-box-v3 clickable" 
                                                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                                                title="Clicca per cambiare immagine"
                                            >
                                                {editForm.immagine_profilo ? (
                                                    <img src={editForm.immagine_profilo} alt="NPC Avatar" className="preview-image-v3" />
                                                ) : (
                                                    <div className="avatar-placeholder-v3">
                                                        <Camera size={32} />
                                                        <span>Carica Foto</span>
                                                    </div>
                                                )}
                                                <div className="avatar-overlay-v3">
                                                    <Edit2 size={18} />
                                                    <span>Cambia</span>
                                                </div>
                                            </div>
                                            <div className="avatar-help-text-v3">
                                                <p>Il riquadro sopra è cliccabile per caricare una nuova immagine dal tuo dispositivo.</p>
                                                <button className="btn-upload-v3" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                                                    <Upload size={16} /> Sfoglia File...
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="edit-section">
                                        <h4 className="edit-section-title"><Shield size={16} /> Caratteristiche</h4>
                                        <div className="edit-grid-2">
                                            <div className="input-field">
                                                <label>Vigore (HP/ATK)</label>
                                                <div className="input-with-icon">
                                                    <Heart size={14} color="#ef4444" />
                                                    <input
                                                        type="number"
                                                        value={editForm.forza}
                                                        onChange={(e) => setEditForm({...editForm, forza: parseInt(e.target.value) || 0})}
                                                    />
                                                </div>
                                            </div>
                                            <div className="input-field">
                                                <label>Destrezza (DEF/VEL)</label>
                                                <div className="input-with-icon">
                                                    <Shield size={14} color="#3b82f6" />
                                                    <input
                                                        type="number"
                                                        value={editForm.destrezza}
                                                        onChange={(e) => setEditForm({...editForm, destrezza: parseInt(e.target.value) || 0})}
                                                    />
                                                </div>
                                            </div>
                                            <div className="input-field">
                                                <label>Sopravvivenza</label>
                                                <div className="input-with-icon">
                                                    <Leaf size={14} color="#10b981" />
                                                    <input
                                                        type="number"
                                                        value={editForm.altre_stats?.sopravvivenza || 0}
                                                        onChange={(e) => handleAltreStatsChange('sopravvivenza', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="input-field">
                                                <label>Percezione</label>
                                                <div className="input-with-icon">
                                                    <Eye size={14} color="#8b5cf6" />
                                                    <input
                                                        type="number"
                                                        value={editForm.altre_stats?.percezione || 0}
                                                        onChange={(e) => handleAltreStatsChange('percezione', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="input-field">
                                                <label>Intelligenza</label>
                                                <div className="input-with-icon">
                                                    <BookOpen size={14} color="#3b82f6" />
                                                    <input
                                                        type="number"
                                                        value={editForm.altre_stats?.intelligenza || 0}
                                                        onChange={(e) => handleAltreStatsChange('intelligenza', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="input-field">
                                                <label>Eloquenza</label>
                                                <div className="input-with-icon">
                                                    <MessageCircle size={14} color="#f43f5e" />
                                                    <input
                                                        type="number"
                                                        value={editForm.altre_stats?.eloquenza || 0}
                                                        onChange={(e) => handleAltreStatsChange('eloquenza', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="input-field">
                                                <label>Coraggio</label>
                                                <div className="input-with-icon">
                                                    <Swords size={14} color="#fcd34d" />
                                                    <input
                                                        type="number"
                                                        value={editForm.altre_stats?.coraggio || 0}
                                                        onChange={(e) => handleAltreStatsChange('coraggio', e.target.value)}
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
                                        <h4 className="edit-section-title">{showAddItem ? 'Seleziona Oggetti' : 'Zaino NPC'}</h4>
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
                                                Conferma Aggiunta
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="items-grid-master">
                                            {loadingExtra ? (
                                                <div className="flex-center p-xl"><Loader2 className="spin" /></div>
                                            ) : npcItems.length === 0 ? (
                                                <p className="empty-text">Lo zaino è vuoto.</p>
                                            ) : (
                                                npcItems.map((item) => (
                                                    <div key={item.id} className="item-card-master premium-item-card">
                                                        <div className="item-card-main">
                                                            <div className="item-img-box">
                                                                {item.oggetto?.immagine_url ? (
                                                                    <img src={item.oggetto.immagine_url} alt={item.oggetto.nome} />
                                                                ) : (
                                                                    <Package size={20} />
                                                                )}
                                                                <span className="qty-badge">x{item.quantita}</span>
                                                            </div>
                                                            <div className="item-details">
                                                                <strong>{item.oggetto?.nome}</strong>
                                                                <p>{item.oggetto?.categoria}</p>
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
                                        <h4 className="edit-section-title">
                                            {editingPkmn ? 'Modifica Statistiche' : showAddItem ? 'Library Campagna' : 'Gestione Pokémon'}
                                        </h4>
                                        <button
                                            className={`btn-add-mini ${showAddItem || editingPkmn ? 'active' : ''}`}
                                            onClick={() => {
                                                if (editingPkmn) {
                                                    setEditingPkmn(null);
                                                } else {
                                                    setShowAddItem(!showAddItem);
                                                    if (!showAddItem) caricaPokedexLibrary();
                                                    setSearchResult(null);
                                                    setSearchQuery('');
                                                }
                                            }}
                                        >
                                            {showAddItem || editingPkmn ? <X size={14} /> : <Plus size={14} />}
                                            {showAddItem || editingPkmn ? 'Annulla' : 'Nuovo Pkmn'}
                                        </button>
                                    </div>
                                    
                                    {editingPkmn ? (
                                        <div className="pokemon-edit-form animate-slide-up">
                                            <div className="pkmn-edit-header">
                                                <img
                                                    src={(editingPkmn.immagine_url || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${editingPkmn.pokemon_id}.png`).includes('sprites/pokemon/') && !(editingPkmn.immagine_url || '').includes('other/official-artwork') 
                                                        ? (editingPkmn.immagine_url || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${editingPkmn.pokemon_id}.png`).replace('sprites/pokemon/', 'sprites/pokemon/other/official-artwork/')
                                                        : (editingPkmn.immagine_url || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${editingPkmn.pokemon_id}.png`)}
                                                    alt={editingPkmn.soprannome || editingPkmn.nome}
                                                />
                                                <div className="pkmn-edit-identity">
                                                    <span className="species-name-label">SPECIE: {(editingPkmn.nome || 'Sconosciuto').toUpperCase()}</span>
                                                    <div className="input-field-soprannome">
                                                        <label>Soprannome</label>
                                                        <input
                                                            type="text"
                                                            value={editingPkmn.soprannome || ''}
                                                            onChange={(e) => handlePokeStatChange('soprannome', e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="edit-grid-3">
                                                <div className="input-field"><label>Livello</label><input type="number" value={editingPkmn.livello} onChange={(e) => handlePokeStatChange('livello', e.target.value)} /></div>
                                                <div className="input-field"><label>HP Attuali</label><input type="number" value={editingPkmn.hp_attuale} onChange={(e) => handlePokeStatChange('hp_attuale', e.target.value)} /></div>
                                                <div className="input-field"><label>HP Max</label><input type="number" value={editingPkmn.hp_max} onChange={(e) => handlePokeStatChange('hp_max', e.target.value)} /></div>
                                                <div className="input-field"><label>Attacco</label><input type="number" value={editingPkmn.attacco} onChange={(e) => handlePokeStatChange('attacco', e.target.value)} /></div>
                                                <div className="input-field"><label>Difesa</label><input type="number" value={editingPkmn.difesa} onChange={(e) => handlePokeStatChange('difesa', e.target.value)} /></div>
                                                <div className="input-field"><label>Velocità</label><input type="number" value={editingPkmn.velocita} onChange={(e) => handlePokeStatChange('velocita', e.target.value)} /></div>
                                                <div className="input-field"><label>Att. Spec.</label><input type="number" value={editingPkmn.attacco_speciale} onChange={(e) => handlePokeStatChange('attacco_speciale', e.target.value)} /></div>
                                                <div className="input-field"><label>Dif. Spec.</label><input type="number" value={editingPkmn.difesa_speciale} onChange={(e) => handlePokeStatChange('difesa_speciale', e.target.value)} /></div>
                                            </div>

                                            <div className="pkmn-moves-master-section">
                                                <h4 className="edit-section-title"><Zap size={16} /> Mosse Conosciute</h4>
                                                <div className="move-filters-row">
                                                    <div className="search-input-wrapper"><Search size={14} /><input type="text" placeholder="Cerca..." value={moveSearch} onChange={(e) => setMoveSearch(e.target.value)} /></div>
                                                    <select className="filter-select-master" value={moveTypeFilter} onChange={(e) => setMoveTypeFilter(e.target.value)}>
                                                        <option value="all">Tutti</option>
                                                        {Array.from(new Set(allAvailableMoves.map(m => m.tipo?.toLowerCase()))).map(type => (
                                                            <option key={type} value={type}>{getTypeLabel(type)}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="moves-selection-grid">
                                                    {allAvailableMoves.filter(m => (
                                                        (m.nome.toLowerCase().includes(moveSearch.toLowerCase()) || getTypeLabel(m.tipo).toLowerCase().includes(moveSearch.toLowerCase())) && 
                                                        (moveTypeFilter === 'all' || m.tipo === moveTypeFilter)
                                                    )).map(move => {
                                                        const isChecked = selectedPkmnMoveIds.includes(move.id);
                                                        return (
                                                            <div 
                                                                key={move.id} 
                                                                className={`move-checkbox-card ${isChecked ? 'checked' : ''}`}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    toggleMoveAssignment(move.id, !isChecked);
                                                                }}
                                                            >
                                                                <div className={`custom-checkbox-master ${isChecked ? 'active' : ''}`}>
                                                                    {isChecked && <Check size={12} />}
                                                                </div>
                                                                <div className="move-check-content">
                                                                    <div className="move-check-header">
                                                                        <span className="move-check-name">{move.nome}</span>
                                                                        <span className="type-tag-move" style={{ borderLeftColor: getTypeColor(move.tipo) }}>{getTypeLabel(move.tipo)}</span>
                                                                    </div>
                                                                    <div className="move-check-details"><span>POT {move.potenza || '-'}</span><span>PP {move.pp_max}</span></div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            <button className="btn-confirm-add" onClick={salvaPokeStats} disabled={saving} style={{ marginTop: '20px' }}>
                                                {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />} Salva Pokémon
                                            </button>
                                        </div>
                                    ) : showAddItem ? (
                                        <div className="pokemon-search-view animate-slide-up library-mode">
                                            <div className="search-controls-master">
                                                <div className="search-bar-master"><input type="text" placeholder="Filtra..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
                                                <div className="sort-controls">
                                                    <button className={`btn-sort ${sortOrder === 'id' ? 'active' : ''}`} onClick={() => setSortOrder('id')}># ID</button>
                                                    <button className={`btn-sort ${sortOrder === 'name' ? 'active' : ''}`} onClick={() => setSortOrder('name')}>A-Z</button>
                                                </div>
                                            </div>
                                            <div className="library-layout-master">
                                                <div className="pokemon-library-scroll">
                                                    {searching && fullPokeList.length === 0 ? <Loader2 className="spin" /> : filteredPokeList.map(p => (
                                                        <div key={p.id} className={`library-item-pkmn ${searchResult?.id === p.id ? 'selected' : ''}`} onClick={() => selectFromLibrary(p)}>
                                                            <img 
                                                                src={p.immagine_url?.includes('sprites/pokemon/') && !p.immagine_url.includes('other/official-artwork') 
                                                                    ? p.immagine_url.replace('sprites/pokemon/', 'sprites/pokemon/other/official-artwork/') 
                                                                    : p.immagine_url} 
                                                                alt={p.nome} 
                                                                onError={(e) => { e.target.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'; e.target.style.opacity = '0.3'; }}
                                                            />
                                                            <span>{p.nome.toUpperCase()}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="library-selection-detail">
                                                    {searchResult ? (
                                                        <div className="search-result-card selection-mode animate-fade-in">
                                                            <img src={searchResult.immagine_url} alt={searchResult.nome} />
                                                            <div className="result-info">
                                                                <h3>#{searchResult.id} {searchResult.nome.toUpperCase()}</h3>
                                                                <div className="pkmn-types">
                                                                    <span className="type-tag" style={{ borderLeftColor: getTypeColor(searchResult.tipo1) }}>{getTypeLabel(searchResult.tipo1)}</span>
                                                                    {searchResult.tipo2 && <span className="type-tag" style={{ borderLeftColor: getTypeColor(searchResult.tipo2) }}>{getTypeLabel(searchResult.tipo2)}</span>}
                                                                </div>
                                                                <button className="btn-confirm-add" style={{ marginTop: '15px' }} onClick={() => {
                                                                    setEditingPkmn({
                                                                        pokemon_id: searchResult.sprite_url ? searchResult.sprite_url.split('/').pop().split('.')[0] : searchResult.id,
                                                                        nome: searchResult.nome.toUpperCase(),
                                                                        soprannome: searchResult.nome.toUpperCase(),
                                                                        livello: 5,
                                                                        hp_attuale: searchResult.hp_base, hp_max: searchResult.hp_base,
                                                                        attacco: searchResult.atk_base, difesa: searchResult.def_base,
                                                                        attacco_speciale: searchResult.spatk_base, difesa_speciale: searchResult.spdef_base,
                                                                        velocita: searchResult.speed_base, tipo1: searchResult.tipo1.toLowerCase(),
                                                                        tipo2: searchResult.tipo2 ? searchResult.tipo2.toLowerCase() : null, posizione_squadra: 99
                                                                    });
                                                                    setSearchResult(null); setSearchQuery(''); setShowAddItem(false);
                                                                }}><Edit2 size={18} /> Configura e Assegna</button>
                                                            </div>
                                                        </div>
                                                    ) : <div className="empty-selection-placeholder"><Info size={32} /><p>Seleziona un Pokémon</p></div>}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="squadra-box-layout">
                                            {loadingExtra ? <div className="flex-center p-xl"><Loader2 className="spin" /></div> : (
                                                <>
                                                    <div className="squadra-section-master">
                                                        <h5 className="title-premium-master team-title">SQUADRA</h5>
                                                        <div className="pokemon-grid-master grid-4-cols">
                                                            {npcPokemon.filter(p => p.posizione_squadra < (editForm.slot_squadra || 6)).length === 0 ? <p className="empty-text">Squadra vuota.</p> : npcPokemon.filter(p => p.posizione_squadra < (editForm.slot_squadra || 6)).map(poke => {
                                                                const hpPct = (poke.hp_attuale / poke.hp_max) * 100;
                                                                const hpCol = hpPct > 50 ? '#34d399' : hpPct > 20 ? '#fbbf24' : '#ef4444';
                                                                const itToEn = { 'normale': 'normal', 'fuoco': 'fire', 'acqua': 'water', 'erba': 'grass', 'elettro': 'electric', 'ghiaccio': 'ice', 'lotta': 'fighting', 'veleno': 'poison', 'terra': 'ground', 'volante': 'flying', 'psico': 'psychic', 'coleottero': 'bug', 'roccia': 'rock', 'spettro': 'ghost', 'drago': 'dragon', 'acciaio': 'steel', 'folletto': 'fairy', 'buio': 'dark', 'suono': 'sound', 'sconosciuto': 'unknown' };
                                                                const t1En = itToEn[poke.tipo1?.toLowerCase()] || poke.tipo1?.toLowerCase();
                                                                const t2En = itToEn[poke.tipo2?.toLowerCase()] || poke.tipo2?.toLowerCase();
                                                                return (
                                                                    <div key={poke.id} className="pkmn-card-squadra master-card-premium clickable" onClick={() => startEditingPkmn(poke)}>
                                                                        <div className="pkmn-types-wrapper">
                                                                            <div className="pkmn-type-circle" style={{ backgroundColor: getTypeColor(t1En) }} title={getTypeLabel(t1En)}><img src={t1En === 'sound' ? 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/music.svg' : t1En === 'unknown' ? 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/help-circle.svg' : `https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${t1En}.svg`} alt={t1En} className="type-icon-img" /></div>
                                                                            {poke.tipo2 && <div className="pkmn-type-circle" style={{ backgroundColor: getTypeColor(t2En) }} title={getTypeLabel(t2En)}><img src={t2En === 'sound' ? 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/music.svg' : t2En === 'unknown' ? 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/help-circle.svg' : `https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${t2En}.svg`} alt={t2En} className="type-icon-img" /></div>}
                                                                        </div>
                                                                        <div className="pkmn-lvl-badge">Lv.{poke.livello}</div>
                                                                        <img className="pkmn-image" src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${poke.pokemon_id}.png`} alt={poke.soprannome} />
                                                                        <div className="pkmn-card-details">
                                                                            <div className="pkmn-identity-stack"><h3 className="pkmn-race-title">{poke.nome?.toUpperCase()}</h3>{poke.soprannome && poke.soprannome !== poke.nome && <span className="pkmn-nickname-subtitle">{poke.soprannome}</span>}</div>
                                                                            <div className="hp-section"><div className="hp-info"><span>HP</span><span>{poke.hp_attuale}/{poke.hp_max}</span></div><div className="hp-bar-bg"><div className="hp-bar-fill" style={{ width: `${hpPct}%`, backgroundColor: hpCol }}></div></div></div>
                                                                        </div>
                                                                        <div className="pkmn-card-actions-overlay-v3"><button className="btn-v3" title="Sposta in Box" onClick={(e) => { e.stopPropagation(); spostaPokemon(poke.id, 99); }}><Package size={18} /></button><button className="btn-v3 del" onClick={(e) => { e.stopPropagation(); rimuoviPokemon(poke.id, editForm.id); }}><Trash2 size={18} /></button></div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                    <div className="box-section-master" style={{ marginTop: '50px', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '30px' }}>
                                                        <h5 className="title-premium-master box-title">BOX</h5>
                                                        <div className="box-grid-v3">
                                                            {npcPokemon.filter(p => p.posizione_squadra >= (editForm.slot_squadra || 6)).length === 0 ? <p className="empty-text">Box vuoto.</p> : npcPokemon.filter(p => p.posizione_squadra >= (editForm.slot_squadra || 6)).map(poke => {
                                                                const hpPct = (poke.hp_attuale / poke.hp_max) * 100;
                                                                const hpCol = hpPct > 50 ? '#34d399' : hpPct > 20 ? '#fbbf24' : '#ef4444';
                                                                const itToEn = { 'normale': 'normal', 'fuoco': 'fire', 'acqua': 'water', 'erba': 'grass', 'elettro': 'electric', 'ghiaccio': 'ice', 'lotta': 'fighting', 'veleno': 'poison', 'terra': 'ground', 'volante': 'flying', 'psico': 'psychic', 'coleottero': 'bug', 'roccia': 'rock', 'spettro': 'ghost', 'drago': 'dragon', 'acciaio': 'steel', 'folletto': 'fairy', 'buio': 'dark', 'suono': 'sound', 'sconosciuto': 'unknown' };
                                                                const t1En = itToEn[poke.tipo1?.toLowerCase()] || poke.tipo1?.toLowerCase();
                                                                const t2En = itToEn[poke.tipo2?.toLowerCase()] || poke.tipo2?.toLowerCase();
                                                                return (
                                                                    <div key={poke.id} className="pkmn-card-squadra compact-box-card-v3 clickable" onClick={() => startEditingPkmn(poke)}>
                                                                        <div className="pkmn-types-wrapper-mini">
                                                                            <div className="pkmn-type-circle-mini" style={{ backgroundColor: getTypeColor(t1En) }} title={getTypeLabel(t1En)}><img src={t1En === 'sound' ? 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/music.svg' : t1En === 'unknown' ? 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/help-circle.svg' : `https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${t1En}.svg`} alt={t1En} className="type-icon-img-mini" /></div>
                                                                            {poke.tipo2 && <div className="pkmn-type-circle-mini" style={{ backgroundColor: getTypeColor(t2En) }} title={getTypeLabel(t2En)}><img src={t2En === 'sound' ? 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/music.svg' : t2En === 'unknown' ? 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/help-circle.svg' : `https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${t2En}.svg`} alt={t2En} className="type-icon-img-mini" /></div>}
                                                                        </div>
                                                                        <div className="pkmn-lvl-badge" style={{ fontSize: '0.6rem' }}>Lv.{poke.livello}</div>
                                                                        <img 
                                                                            className="pkmn-image-mini" 
                                                                            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${poke.pokemon_id}.png`}
                                                                            alt={poke.nome} 
                                                                            onError={(e) => { e.target.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'; }}
                                                                        />
                                                                        <div className="pkmn-identity-stack-mini"><div className="pkmn-name-mini">{poke.nome?.toUpperCase()}</div>{poke.soprannome && poke.soprannome !== poke.nome && <div className="pkmn-nickname-mini">{poke.soprannome}</div>}</div>
                                                                        <div className="hp-section mini-hp"><div className="hp-info"><span>HP</span><span>{poke.hp_attuale}/{poke.hp_max}</span></div><div className="hp-bar-bg mini-bar"><div className="hp-bar-fill" style={{ width: `${hpPct}%`, backgroundColor: hpCol }}></div></div></div>
                                                                        <div className="pkmn-card-actions-overlay-v3"><button className="btn-v3" title="Squadra" onClick={(e) => { e.stopPropagation(); const sCount = npcPokemon.filter(p => p.posizione_squadra < (editForm.slot_squadra || 6)).length; spostaPokemon(poke.id, sCount); }}><Plus size={18} /></button><button className="btn-v3 del" onClick={(e) => { e.stopPropagation(); rimuoviPokemon(poke.id, editForm.id); }}><Trash2 size={18} /></button></div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {!editingPkmn && !showAddItem && (
                            <div className="modal-footer">
                                <button className="btn-cancel" onClick={() => setIsEditing(false)}>Annulla</button>
                                <button className="btn-save" onClick={saveChanges} disabled={saving}>
                                    {saving ? <Loader2 size={18} className="spin" /> : <><Save size={18} /> Salva Modifiche</>}
                                </button>
                            </div>
                        )}
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
