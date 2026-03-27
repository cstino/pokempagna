import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Users, User, Shield, Zap, Medal, Edit2, Loader2, X, Check, Save, Heart, TrendingUp, Plus, Minus, Package, Trash2, Search, Info, Layout } from 'lucide-react';
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

    // Stati per i Pokémon
    const [editingPkmn, setEditingPkmn] = useState(null);
    const [searching, setSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState(null);
    const [fullPokeList, setFullPokeList] = useState([]);
    const [filteredPokeList, setFilteredPokeList] = useState([]);
    const [currentTypeFilter, setCurrentTypeFilter] = useState('all');
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

        caricaGiocatori();
        caricaTutteLeMosse();

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

    async function caricaTutteLeMosse() {
        try {
            const { data, error } = await supabase.from('mosse_disponibili').select('*').order('nome');
            if (error) throw error;
            setAllAvailableMoves(data || []);
        } catch (err) { console.error("Errore caricamento mosse:", err); }
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
    // 🏁 Inizializzazione Pokédex Library
    const caricaPokedexLibrary = async () => {
        if (fullPokeList.length > 0) return;
        setSearching(true);
        try {
            const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025');
            const data = await res.json();
            const list = data.results.map((p, idx) => ({
                id: idx + 1,
                name: p.name,
                url: p.url
            }));
            setFullPokeList(list);
            setFilteredPokeList(list);
        } catch (err) {
            console.error("Errore caricamento pokedex:", err);
        } finally {
            setSearching(false);
        }
    };

    // ⚡ Filtro Live & Ordinamento
    useEffect(() => {
        let list = [...fullPokeList];

        // 1. Filtro Nome
        if (searchQuery) {
            list = list.filter(p => p.name.includes(searchQuery.toLowerCase().trim()));
        }

        // 2. Ordinamento
        if (sortOrder === 'name') {
            list.sort((a, b) => a.name.localeCompare(b.name));
        } else {
            list.sort((a, b) => a.id - b.id);
        }

        setFilteredPokeList(list);
    }, [searchQuery, sortOrder, fullPokeList]);

    const selectFromLibrary = async (p) => {
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
    };

    const handlePokeStatChange = (stat, value) => {
        setEditingPkmn(prev => ({
            ...prev,
            [stat]: stat === 'soprannome' ? value : (parseInt(value) || 0)
        }));
    };

    const translateType = (t) => {
        const types = {
            'normal': 'Normale', 'fire': 'Fuoco', 'water': 'Acqua', 'grass': 'Erba',
            'electric': 'Elettro', 'ice': 'Ghiaccio', 'fighting': 'Lotta', 'poison': 'Veleno',
            'ground': 'Terra', 'flying': 'Volante', 'psychic': 'Psico', 'bug': 'Coleottero',
            'rock': 'Roccia', 'ghost': 'Spettro', 'dragon': 'Drago', 'steel': 'Acciaio',
            'fairy': 'Folletto', 'dark': 'Buio'
        };
        return types[t.toLowerCase()] || t;
    };

    // Al click su "Modifica" Pokémon (nella lista della squadra/box)
    const startEditingPkmn = async (pkmn) => {
        setEditingPkmn(pkmn);
        // Carica le mosse assegnate a questo specifico pokemon_giocatore_id
        try {
            const { data, error } = await supabase
                .from('mosse_pokemon')
                .select('mossa_id')
                .eq('pokemon_giocatore_id', pkmn.id);
            if (error) throw error;
            setSelectedPkmnMoveIds(data.map(m => m.mossa_id));
        } catch (err) { console.error("Errore recupero mosse assegnate:", err); }
    };

    const toggleMoveAssignment = async (moveId, isChecked) => {
        if (!editingPkmn) return;
        try {
            if (isChecked) {
                // Trova i dettagli della mossa scelti
                const moveDetails = allAvailableMoves.find(m => m.id === moveId);
                if (!moveDetails) return;

                // Aggiungi mossa
                const { error } = await supabase.from('mosse_pokemon').insert({
                    pokemon_giocatore_id: editingPkmn.id,
                    mossa_id: moveId,
                    nome: moveDetails.nome,
                    tipo: moveDetails.tipo,
                    pp_max: moveDetails.pp_max || 20,
                    pp_attuale: moveDetails.pp_max || 20,
                    attiva: false // Default non attiva, la attiva il giocatore
                });
                if (error) {
                    console.error("Errore Supabase Insert:", error);
                    throw error;
                }
                setSelectedPkmnMoveIds(prev => [...prev, moveId]);
            } else {
                // Rimuovi mossa
                const { error } = await supabase.from('mosse_pokemon')
                    .delete()
                    .eq('pokemon_giocatore_id', editingPkmn.id)
                    .eq('mossa_id', moveId);
                if (error) {
                    console.error("Errore Supabase Delete:", error);
                    throw error;
                }
                setSelectedPkmnMoveIds(prev => prev.filter(id => id !== moveId));
            }
        } catch (err) {
            console.error("Errore toggle mossa (Catch):", err);
        }
    };

    const salvaPokeStats = async () => {
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
            caricaDatiExtra(editForm.id);
            setEditingPkmn(null);
        } catch (err) {
            console.error("Errore salvataggio stats pokemon:", err);
            alert("Errore nel salvataggio.");
        } finally {
            setSaving(false);
        }
    };

    const cercaPokemon = async () => {
        if (!searchQuery) return;
        setSearching(true);
        setSearchResult(null);
        try {
            const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${searchQuery.toLowerCase().trim()}`);
            if (!res.ok) throw new Error("Pokémon non trovato");
            const data = await res.json();
            setSearchResult(data);
        } catch (err) {
            console.error(err);
            alert("Pokémon non trovato. Verifica il nome (in inglese) o l'ID.");
        } finally {
            setSearching(false);
        }
    };

    const aggiungiPokemon = async () => {
        if (!searchResult || !editForm) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('pokemon_giocatore')
                .insert({
                    giocatore_id: editForm.id,
                    pokemon_id: searchResult.id,
                    soprannome: searchResult.name.toUpperCase(),
                    livello: 5,
                    hp_attuale: searchResult.stats[0].base_stat,
                    hp_max: searchResult.stats[0].base_stat,
                    attacco: searchResult.stats[1].base_stat,
                    difesa: searchResult.stats[2].base_stat,
                    attacco_speciale: searchResult.stats[3].base_stat,
                    difesa_speciale: searchResult.stats[4].base_stat,
                    velocita: searchResult.stats[5].base_stat,
                    tipo1: searchResult.types[0]?.type.name.toUpperCase(),
                    tipo2: searchResult.types[1]?.type.name.toUpperCase() || null,
                    posizione_squadra: 99 // Inserisci nel box come default
                });

            if (error) throw error;
            setSearchResult(null);
            setSearchQuery('');
            caricaDatiExtra(editForm.id);
            setShowAddItem(false); // Riutilizziamo lo stato showAddItem per la vista ricerca
        } catch (err) {
            console.error("Errore aggiunta pokemon:", err);
            alert("Errore durante l'aggiunta.");
        } finally {
            setSaving(false);
        }
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
                    slot_squadra: editForm.slot_squadra,
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
                    <h1 className="page-title">
                        <Users size={32} color="#a78bfa" />
                        Gestione Party
                    </h1>
                    <p className="page-subtitle">Monitora e modifica le statistiche dei tuoi allenatori</p>
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
                                            <div className="input-field">
                                                <label>Slot Squadra</label>
                                                <div className="input-with-icon">
                                                    <Layout size={14} color="#fcd34d" />
                                                    <input
                                                        type="number"
                                                        value={editForm.slot_squadra !== undefined && editForm.slot_squadra !== null ? editForm.slot_squadra : 3}
                                                        onChange={(e) => handleStatChange('slot_squadra', e.target.value)}
                                                    />
                                                </div>
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
                                        <h4 className="edit-section-title">
                                            {editingPkmn ? 'Modifica Statistiche' : showAddItem ? 'Cerca Nuovo Pokémon' : 'Squadra e Box'}
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
                                                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${editingPkmn.pokemon_id}.png`}
                                                    alt={editingPkmn.soprannome}
                                                />
                                                <div className="input-field">
                                                    <label>Soprannome</label>
                                                    <input
                                                        type="text"
                                                        value={editingPkmn.soprannome}
                                                        onChange={(e) => handlePokeStatChange('soprannome', e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="edit-grid-3">
                                                <div className="input-field">
                                                    <label>Livello</label>
                                                    <input type="number" value={editingPkmn.livello} onChange={(e) => handlePokeStatChange('livello', e.target.value)} />
                                                </div>
                                                <div className="input-field">
                                                    <label>HP Attuali</label>
                                                    <input type="number" value={editingPkmn.hp_attuale} onChange={(e) => handlePokeStatChange('hp_attuale', e.target.value)} />
                                                </div>
                                                <div className="input-field">
                                                    <label>HP Max</label>
                                                    <input type="number" value={editingPkmn.hp_max} onChange={(e) => handlePokeStatChange('hp_max', e.target.value)} />
                                                </div>
                                                <div className="input-field">
                                                    <label>Attacco</label>
                                                    <input type="number" value={editingPkmn.attacco} onChange={(e) => handlePokeStatChange('attacco', e.target.value)} />
                                                </div>
                                                <div className="input-field">
                                                    <label>Difesa</label>
                                                    <input type="number" value={editingPkmn.difesa} onChange={(e) => handlePokeStatChange('difesa', e.target.value)} />
                                                </div>
                                                <div className="input-field">
                                                    <label>Velocità</label>
                                                    <input type="number" value={editingPkmn.velocita} onChange={(e) => handlePokeStatChange('velocita', e.target.value)} />
                                                </div>
                                                <div className="input-field">
                                                    <label>Att. Spec.</label>
                                                    <input type="number" value={editingPkmn.attacco_speciale} onChange={(e) => handlePokeStatChange('attacco_speciale', e.target.value)} />
                                                </div>
                                                <div className="input-field">
                                                    <label>Dif. Spec.</label>
                                                    <input type="number" value={editingPkmn.difesa_speciale} onChange={(e) => handlePokeStatChange('difesa_speciale', e.target.value)} />
                                                </div>
                                            </div>

                                            <div className="pkmn-moves-master-section">
                                                <h4 className="edit-section-title"><Zap size={16} /> Mosse Conosciute</h4>

                                                <div className="move-filters-row">
                                                    <div className="search-input-wrapper">
                                                        <Search size={14} />
                                                        <input
                                                            type="text"
                                                            placeholder="Cerca mossa..."
                                                            value={moveSearch}
                                                            onChange={(e) => setMoveSearch(e.target.value)}
                                                        />
                                                    </div>
                                                    <select
                                                        className="filter-select-master"
                                                        value={moveTypeFilter}
                                                        onChange={(e) => setMoveTypeFilter(e.target.value)}
                                                    >
                                                        <option value="all">Tutti i Tipi</option>
                                                        {Array.from(new Set(allAvailableMoves.map(m => m.tipo))).sort().map(t => (
                                                            <option key={t} value={t}>{t}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="moves-selection-grid">
                                                    {allAvailableMoves
                                                        .filter(m => {
                                                            const matchesSearch = m.nome.toLowerCase().includes(moveSearch.toLowerCase());
                                                            const matchesType = moveTypeFilter === 'all' || m.tipo === moveTypeFilter;
                                                            return matchesSearch && matchesType;
                                                        })
                                                        .map(move => (
                                                            <label key={move.id} className={`move-checkbox-card ${selectedPkmnMoveIds.includes(move.id) ? 'checked' : ''}`}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedPkmnMoveIds.includes(move.id)}
                                                                    onChange={(e) => toggleMoveAssignment(move.id, e.target.checked)}
                                                                />
                                                                <div className="move-check-content">
                                                                    <div className="move-check-header">
                                                                        <span className="move-check-name">{move.nome}</span>
                                                                        <span className="type-tag-move" style={{ borderLeftColor: `var(--type-${move.tipo.toLowerCase()})` }}>
                                                                            {translateType(move.tipo)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="move-check-details">
                                                                        <span>POT {move.potenza || '-'}</span>
                                                                        <span>PP {move.pp_max}</span>
                                                                    </div>
                                                                </div>
                                                            </label>
                                                        ))
                                                    }
                                                </div>
                                            </div>

                                            <button className="btn-confirm-add" onClick={salvaPokeStats} disabled={saving} style={{ marginTop: '20px' }}>
                                                {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />}
                                                Salva Statistiche
                                            </button>
                                        </div>
                                    ) : showAddItem ? (
                                        <div className="pokemon-search-view animate-slide-up library-mode">
                                            <div className="search-controls-master">
                                                <div className="search-bar-master">
                                                    <input
                                                        type="text"
                                                        placeholder="Filtra Pokémon..."
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                    />
                                                </div>
                                                <div className="sort-controls">
                                                    <button
                                                        className={`btn-sort ${sortOrder === 'id' ? 'active' : ''}`}
                                                        onClick={() => setSortOrder('id')}
                                                    >
                                                        # ID
                                                    </button>
                                                    <button
                                                        className={`btn-sort ${sortOrder === 'name' ? 'active' : ''}`}
                                                        onClick={() => setSortOrder('name')}
                                                    >
                                                        A-Z
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="library-layout-master">
                                                {/* LISTA FILTRATA (LIBRARY) */}
                                                <div className="pokemon-library-scroll">
                                                    {searching && fullPokeList.length === 0 ? (
                                                        <div className="flex-center p-xl"><Loader2 className="spin" /></div>
                                                    ) : (
                                                        filteredPokeList.map(p => (
                                                            <div
                                                                key={p.id}
                                                                className={`library-item-pkmn ${searchResult?.id === p.id ? 'selected' : ''}`}
                                                                onClick={() => selectFromLibrary(p)}
                                                            >
                                                                <img
                                                                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`}
                                                                    alt={p.name}
                                                                />
                                                                <span>{p.name.toUpperCase()}</span>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>

                                                {/* RISULTATO SELEZIONATO (PER CONFERMA) */}
                                                <div className="library-selection-detail">
                                                    {searchResult ? (
                                                        <div className="search-result-card selection-mode animate-fade-in">
                                                            <img
                                                                src={searchResult.sprites.other['official-artwork'].front_default}
                                                                alt={searchResult.name}
                                                            />
                                                            <div className="result-info">
                                                                <h3>#{searchResult.id} {searchResult.name.toUpperCase()}</h3>
                                                                <div className="pkmn-types">
                                                                    {searchResult.types.map(t => (
                                                                        <span key={t.type.name} className="type-tag" style={{ borderLeftColor: `var(--type-${t.type.name})` }}>
                                                                            {t.type.name}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                                <button className="btn-confirm-add" style={{ marginTop: '15px' }} onClick={aggiungiPokemon} disabled={saving}>
                                                                    {saving ? <Loader2 size={18} className="spin" /> : <Plus size={18} />}
                                                                    Assegna all'Allenatore
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="empty-selection-placeholder">
                                                            <Info size={32} />
                                                            <p>Seleziona un Pokémon dalla lista per assegnarlo</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="squadra-box-layout">
                                            {loadingExtra ? (
                                                <div className="flex-center p-xl"><Loader2 className="spin" /></div>
                                            ) : (
                                                <>
                                                    {/* SQUADRA */}
                                                    <div className="squadra-section-master">
                                                        <h5 className="title-premium-master team-title">SQUADRA</h5>
                                                        <div className="pokemon-grid-master grid-4-cols">
                                                            {playerPokemon.filter(p => p.posizione_squadra < (editForm.slot_squadra || 3)).length === 0 ? (
                                                                <p className="empty-text">Nessun Pokémon in squadra.</p>
                                                            ) : (
                                                                playerPokemon.filter(p => p.posizione_squadra < (editForm.slot_squadra || 3)).map(poke => {
                                                                    const hpPct = (poke.hp_attuale / poke.hp_max) * 100;
                                                                    const hpCol = hpPct > 50 ? '#34d399' : hpPct > 20 ? '#fbbf24' : '#ef4444';
                                                                    return (
                                                                        <div key={poke.id} className="pkmn-card-squadra master-card-premium clickable" onClick={() => startEditingPkmn(poke)}>
                                                                            <div className="pkmn-type-badge">{poke.tipo1?.toUpperCase()}</div>
                                                                            <div className="pkmn-lvl-badge">Nv.{poke.livello}</div>
                                                                            <img className="pkmn-image" src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${poke.pokemon_id}.png`} alt={poke.soprannome} />
                                                                            <div className="pkmn-card-details">
                                                                                <h3>{poke.soprannome?.toUpperCase()}</h3>
                                                                                <div className="hp-section">
                                                                                    <div className="hp-info">
                                                                                        <span>HP</span>
                                                                                        <span>{poke.hp_attuale}/{poke.hp_max}</span>
                                                                                    </div>
                                                                                    <div className="hp-bar-bg">
                                                                                        <div className="hp-bar-fill" style={{ width: `${hpPct}%`, backgroundColor: hpCol }}></div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="pkmn-card-actions-overlay-v3">
                                                                                <button className="btn-v3" title="Sposta in Box" onClick={(e) => { e.stopPropagation(); spostaPokemon(poke.id, 99); }}><Package size={18} /></button>
                                                                                <button className="btn-v3 del" onClick={(e) => { e.stopPropagation(); rimuoviPokemon(poke.id, editForm.id); }}><Trash2 size={18} /></button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* BOX */}
                                                    <div className="box-section-master" style={{ marginTop: '50px', borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '30px' }}>
                                                        <h5 className="title-premium-master box-title">BOX</h5>
                                                        <div className="pokemon-grid-master grid-4-cols">
                                                            {playerPokemon.filter(p => p.posizione_squadra >= (editForm.slot_squadra || 3)).length === 0 ? (
                                                                <p className="empty-text">Il box è vuoto.</p>
                                                            ) : (
                                                                playerPokemon.filter(p => p.posizione_squadra >= (editForm.slot_squadra || 3)).map(poke => {
                                                                    const hpPct = (poke.hp_attuale / poke.hp_max) * 100;
                                                                    const hpCol = hpPct > 50 ? '#34d399' : hpPct > 20 ? '#fbbf24' : '#ef4444';
                                                                    return (
                                                                        <div key={poke.id} className="pkmn-card-squadra compact-box-card-v3 clickable" onClick={() => startEditingPkmn(poke)}>
                                                                            <div className="pkmn-lvl-badge" style={{ fontSize: '0.6rem' }}>Nv.{poke.livello}</div>
                                                                            <img className="pkmn-image-mini" src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${poke.pokemon_id}.png`} alt={poke.soprannome} />
                                                                            <div className="pkmn-name-mini">{poke.soprannome?.toUpperCase()}</div>
                                                                            <div className="hp-section mini-hp">
                                                                                <div className="hp-info">
                                                                                    <span>HP</span>
                                                                                    <span>{poke.hp_attuale}/{poke.hp_max}</span>
                                                                                </div>
                                                                                <div className="hp-bar-bg mini-bar">
                                                                                    <div className="hp-bar-fill" style={{ width: `${hpPct}%`, backgroundColor: hpCol }}></div>
                                                                                </div>
                                                                            </div>
                                                                            <div className="pkmn-card-actions-overlay-v3">
                                                                                <button className="btn-v3" title="Sposta in Squadra" onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    const limit = editForm.slot_squadra || 3;
                                                                                    const sCount = playerPokemon.filter(p => p.posizione_squadra < limit).length;
                                                                                    if (sCount >= limit) {
                                                                                        setConfirmModal({
                                                                                            title: "Limite Raggiunto",
                                                                                            message: `La squadra ha già ${limit} Pokémon attivi. Sposta un Pokémon nel box per far posto a questo.`,
                                                                                            type: "error",
                                                                                            onConfirm: () => setConfirmModal(null)
                                                                                        });
                                                                                        return;
                                                                                    }
                                                                                    spostaPokemon(poke.id, sCount);
                                                                                }}><Plus size={18} /></button>
                                                                                <button className="btn-v3 del" onClick={(e) => { e.stopPropagation(); rimuoviPokemon(poke.id, editForm.id); }}><Trash2 size={18} /></button>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })
                                                            )}
                                                        </div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
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
