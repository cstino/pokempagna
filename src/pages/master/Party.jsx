import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Users, User, Shield, Zap, Medal, Edit2, Loader2, X, Check, Save, Heart, TrendingUp, Plus, Minus, Package, Trash2, Search, Info, Layout, Leaf, Eye, BookOpen, MessageCircle, Swords } from 'lucide-react';
import { getTypeColor, getTypeLabel, getTypeEmoji, getTypeIcon } from '../../lib/typeColors';
import { calculatePokemonStats } from '../../lib/pokemonLogic';
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
    const [showEvoSearch, setShowEvoSearch] = useState(false);

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

        if (profile?.campagna_corrente_id) {
            caricaGiocatori();
            caricaPokedexLibrary(); // Carica la libreria subito per il mapping delle immagini
        }

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

            // Carica Pokémon (semplice, evitiamo join problematiche)
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
                const previousZaino = [...zaino];
                // Optimistic UI
                setZaino(prev => prev.filter(item => item.oggetto.id !== oggId));
                setConfirmModal(null);

                try {
                    const { error } = await supabase
                        .from('zaino_giocatore')
                        .delete()
                        .eq('giocatore_id', playerId)
                        .eq('oggetto_id', oggId);
                    
                    if (error) throw error;
                    // Consolida il dato dal server
                    caricaDatiExtra(playerId);
                } catch (err) { 
                    console.error(err);
                    setZaino(previousZaino); // Rollback
                    alert("Errore durante la rimozione dell'oggetto. Operazione annullata.");
                }
            }
        });
    };

    const sottraiUno = async (item, playerId) => {
        const previousZaino = [...zaino];
        // Optimistic UI
        setZaino(prev => prev.map(i => 
            i.oggetto.id === item.oggetto.id 
                ? { ...i, quantita: Math.max(0, i.quantita - 1) } 
                : i
        ).filter(i => i.quantita > 0));

        try {
            if (item.quantita > 1) {
                const { error } = await supabase.from('zaino_giocatore')
                    .update({ quantita: item.quantita - 1 })
                    .eq('giocatore_id', playerId)
                    .eq('oggetto_id', item.oggetto.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('zaino_giocatore')
                    .delete()
                    .eq('giocatore_id', playerId)
                    .eq('oggetto_id', item.oggetto.id);
                if (error) throw error;
            }
            caricaDatiExtra(playerId);
        } catch (err) { 
            console.error(err);
            setZaino(previousZaino); // Rollback
        }
    };

    const spostaPokemon = async (pkmnId, nuovaPosizione) => {
        const previousPokemon = [...playerPokemon];
        // Optimistic UI
        setPlayerPokemon(prev => prev.map(p => p.id === pkmnId ? { ...p, posizione_squadra: nuovaPosizione } : p));

        try {
            const { error } = await supabase
                .from('pokemon_giocatore')
                .update({ posizione_squadra: nuovaPosizione })
                .eq('id', pkmnId);

            if (error) throw error;
            caricaDatiExtra(editForm.id);
        } catch (err) {
            console.error("Errore spostamento pokemon:", err);
            setPlayerPokemon(previousPokemon); // Rollback
            alert("Errore durante lo spostamento del Pokémon.");
        }
    };

    const rimuoviPokemon = async (pkmnId, playerId) => {
        setConfirmModal({
            title: "Liberare Pokémon?",
            message: "Questa azione è irreversibile. Il Pokémon lascerà la squadra per sempre.",
            type: 'error',
            onConfirm: async () => {
                const previousPokemon = [...playerPokemon];
                // Optimistic UI
                setPlayerPokemon(prev => prev.filter(p => p.id !== pkmnId));
                setConfirmModal(null);

                try {
                    const { error } = await supabase
                        .from('pokemon_giocatore')
                        .delete()
                        .eq('id', pkmnId);
                    if (error) throw error;
                    caricaDatiExtra(playerId);
                } catch (err) { 
                    console.error(err);
                    setPlayerPokemon(previousPokemon); // Rollback
                    alert("Errore durante la rimozione del Pokémon.");
                }
            }
        });
    };
    // 🏁 Inizializzazione Pokédex Library (Sincronizzata con Libreria Campagna)
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

    // ⚡ Filtro Live & Ordinamento
    useEffect(() => {
        let list = [...fullPokeList];

        // 1. Filtro Nome
        if (searchQuery) {
            list = list.filter(p => p.nome.toLowerCase().includes(searchQuery.toLowerCase().trim()));
        }

        // 2. Ordinamento
        if (sortOrder === 'name') {
            list.sort((a, b) => a.nome.localeCompare(b.nome));
        } else {
            list.sort((a, b) => a.id - b.id);
        }

        setFilteredPokeList(list);
    }, [searchQuery, sortOrder, fullPokeList]);

    const selectFromLibrary = async (p) => {
        // Estrai National ID dallo sprite_url (es. .../pokemon/9.png -> 9)
        const nationalIdFromUrl = p.sprite_url ? p.sprite_url.split('/').pop().split('.')[0] : p.id;

        setSearchResult({
            ...p,
            pokemon_id: nationalIdFromUrl, // Assicuriamo che porti l'ID nazionale corretto
            immagine_url: p.immagine_url || p.sprite_url,
            hp_base: p.hp_base,
            atk_base: p.atk_base,
            def_base: p.def_base,
            spatk_base: p.spatk_base,
            spdef_base: p.spdef_base,
            speed_base: p.speed_base
        });
        setSelectedPkmnMoveIds([]); // Reset mosse per il nuovo Pokémon
    };

    const handleEvolve = (selectedSpecie) => {
        setEditingPkmn(prev => {
            const oldLevel = prev.livello || 1;
            
            // 1. Cerchiamo la specie attuale per ricalcolare la teoria "vecchia"
            // Lookup robusto: prova ID libreria, poi ID nazione, poi fallback
            const speciesId = prev.pokemon_id;
            const currentLibrarySpecie = fullPokeList.find(s => String(s.id) === String(speciesId)) || 
                                       fullPokeList.find(s => String(s.pokemon_id) === String(speciesId)) || 
                                       prev.specie ||
                                       {
                                         hp_base: 50, atk_base: 50, def_base: 50, 
                                         spatk_base: 50, spdef_base: 50, speed_base: 50 
                                       };
            const oldTheoretical = calculatePokemonStats(currentLibrarySpecie, oldLevel);
            
            // 2. Prepariamo la NUOVA teoria (Source of Truth)
            const newBase = selectedSpecie; // Da pokemon_campagna
            const newTheoretical = calculatePokemonStats(newBase, oldLevel);
            
            // 3. Calcoliamo i BONUS ESPLICITI (se mancano, li deduciamo ora per migrare i dati)
            // Se prev.hp_max è nullo (caso NaN precedente), usiamo la vecchia teoria come ancora
            const bonuses = {
                hp: prev.bonus_hp ?? ((prev.hp_max || oldTheoretical.hp_max) - oldTheoretical.hp_max),
                atk: prev.bonus_attacco ?? ((prev.attacco || oldTheoretical.attacco) - oldTheoretical.attacco),
                def: prev.bonus_difesa ?? ((prev.difesa || oldTheoretical.difesa) - oldTheoretical.difesa),
                spatk: prev.bonus_attacco_speciale ?? ((prev.attacco_speciale || oldTheoretical.attacco_speciale) - oldTheoretical.attacco_speciale),
                spdef: prev.bonus_difesa_speciale ?? ((prev.difesa_speciale || oldTheoretical.difesa_speciale) - oldTheoretical.difesa_speciale),
                speed: prev.bonus_velocita ?? ((prev.velocita || oldTheoretical.velocita) - oldTheoretical.velocita)
            };

            const evolvedStats = {
                hp_max: newTheoretical.hp_max + bonuses.hp,
                attacco: newTheoretical.attacco + bonuses.atk,
                difesa: newTheoretical.difesa + bonuses.def,
                attacco_speciale: newTheoretical.attacco_speciale + bonuses.spatk,
                difesa_speciale: newTheoretical.difesa_speciale + bonuses.spdef,
                velocita: newTheoretical.velocita + bonuses.speed,
                hp_attuale: newTheoretical.hp_max + bonuses.hp,
                attacco_attuale: newTheoretical.attacco + bonuses.atk,
                difesa_attuale: newTheoretical.difesa + bonuses.def,
                attacco_speciale_attuale: newTheoretical.attacco_speciale + bonuses.spatk,
                difesa_speciale_attuale: newTheoretical.difesa_speciale + bonuses.spdef,
                velocita_attuale: newTheoretical.velocita + bonuses.speed,
                // Salviamo i bonus nel nuovo stato
                bonus_hp: bonuses.hp,
                bonus_attacco: bonuses.atk,
                bonus_difesa: bonuses.def,
                bonus_attacco_speciale: bonuses.spatk,
                bonus_difesa_speciale: bonuses.spdef,
                bonus_velocita: bonuses.speed
            };

            return {
                ...prev,
                ...evolvedStats,
                pokemon_id: selectedSpecie.id,
                nome: selectedSpecie.nome.toUpperCase(),
                tipo1: selectedSpecie.tipo1.toUpperCase(),
                tipo2: selectedSpecie.tipo2 ? selectedSpecie.tipo2.toUpperCase() : null,
                specie: selectedSpecie
            };
        });
        setShowEvoSearch(false);
    };

    // Utility per ottenere l'immagine corretta (Priorità: Immagine Custom Libreria > ID Nazionale Libreria > Fallback)
    const getPkmnImage = (poke) => {
        if (!poke) return '';
        
        // Cerchiamo la specie nella libreria caricata in memoria
        const spec = fullPokeList.find(s => s.id === poke.pokemon_id) || 
                   fullPokeList.find(s => s.pokemon_id === poke.pokemon_id);
        
        if (spec) {
            // 1. Se c'è un'immagine custom caricata dal Master, usiamo quella
            if (spec.immagine_url) return spec.immagine_url;
            
            // 2. Altrimenti usiamo l'ID nazionale salvato nella riga della libreria
            return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${spec.pokemon_id}.png`;
        }

        // 3. Fallback estremo se la libreria non è ancora carica o la riga manca
        return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${poke.pokemon_id}.png`;
    };

    const handlePokeStatChange = (stat, value) => {
        setEditingPkmn(prev => {
            const newValue = stat === 'soprannome' || stat === 'note' || stat === 'strumento_tenuto' ? value : (parseInt(value) || 0);
            const newState = { ...prev, [stat]: newValue };

            // 🛡️ LOOKUP ROBUSTO: Cerchiamo la specie originale per il ricalcolo
            const speciesId = prev.pokemon_id;
            const librarySpecies = fullPokeList.find(s => String(s.id) === String(speciesId)) || 
                                 fullPokeList.find(s => String(s.pokemon_id) === String(speciesId)) || 
                                 prev.specie || // Fallback all'oggetto salvato se presente
                                 { 
                                   hp_base: 50, atk_base: 50, def_base: 50, 
                                   spatk_base: 50, spdef_base: 50, speed_base: 50 
                                 };
            
            // Usiamo il calcolo "Puro" (IV=0 di default)
            const theory = calculatePokemonStats(librarySpecies, prev.livello || 1);

            if (stat === 'livello') {
                // Ricalcoliamo la teoria al NUOVO livello (IV=0 default)
                const newTheory = calculatePokemonStats(librarySpecies, newValue);
                
                // Applichiamo i bonus esistenti (o calcolati se assenti)
                const bonusHp = prev.bonus_hp ?? (prev.hp_max - theory.hp_max);
                const bonusAtk = prev.bonus_attacco ?? (prev.attacco - theory.attacco);
                const bonusDef = prev.bonus_difesa ?? (prev.difesa - theory.difesa);
                const bonusSpatk = prev.bonus_attacco_speciale ?? (prev.attacco_speciale - theory.attacco_speciale);
                const bonusSpdef = prev.bonus_difesa_speciale ?? (prev.difesa_speciale - theory.difesa_speciale);
                const bonusSpeed = prev.bonus_velocita ?? (prev.velocita - theory.velocita);

                newState.hp_max = newTheory.hp_max + bonusHp;
                newState.attacco = newTheory.attacco + bonusAtk;
                newState.difesa = newTheory.difesa + bonusDef;
                newState.attacco_speciale = newTheory.attacco_speciale + bonusSpatk;
                newState.difesa_speciale = newTheory.difesa_speciale + bonusSpdef;
                newState.velocita = newTheory.velocita + bonusSpeed;
                
                // Migriamo anche i bonus espliciti nello stato per sicurezza
                newState.bonus_hp = bonusHp;
                newState.bonus_attacco = bonusAtk;
                newState.bonus_difesa = bonusDef;
                newState.bonus_attacco_speciale = bonusSpatk;
                newState.bonus_difesa_speciale = bonusSpdef;
                newState.bonus_velocita = bonusSpeed;

                newState.hp_attuale = newState.hp_max;
            } else if (['hp_max', 'attacco', 'difesa', 'attacco_speciale', 'difesa_speciale', 'velocita'].includes(stat)) {
                // Se modifichiamo una stat principale, aggiorniamo il BONUS relativo
                const mapping = {
                    hp_max: 'bonus_hp',
                    attacco: 'bonus_attacco',
                    difesa: 'bonus_difesa',
                    attacco_speciale: 'bonus_attacco_speciale',
                    difesa_speciale: 'bonus_difesa_speciale',
                    velocita: 'bonus_velocita'
                };
                newState[mapping[stat]] = newValue - theory[stat];
            }

            return newState;
        });
    };


    // Al click su "Modifica" Pokémon (nella lista della squadra/box)
    const startEditingPkmn = async (pkmn) => {
        setEditingPkmn(pkmn);
        // Carica le mosse assegnate e i dati della specie per ricalcolo stat
        try {
            // 1. Fetch mosse
            const { data: mData, error: mErr } = await supabase
                .from('mosse_pokemon')
                .select('mossa_id')
                .eq('pokemon_giocatore_id', pkmn.id);
            if (mErr) throw mErr;
            setSelectedPkmnMoveIds(mData.map(m => m.mossa_id));

            // 2. Fetch specie (per Approach A: ricalcolo basato su base_stats)
            const { data: sData, error: sErr } = await supabase
                .from('pokemon_campagna')
                .select('*')
                .eq('id', pkmn.pokemon_id)
                .single();
            
            if (!sErr && sData) {
                setEditingPkmn(prev => ({ ...prev, specie: sData }));
            }
        } catch (err) { console.error("Errore recupero dettagli pkmn:", err); }
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
                nome: editingPkmn.name?.toUpperCase() || editingPkmn.nome?.toUpperCase(),
                soprannome: editingPkmn.soprannome || '',
                livello: editingPkmn.livello,
                hp_attuale: editingPkmn.hp_attuale,
                hp_max: editingPkmn.hp_max,
                attacco: editingPkmn.attacco,
                attacco_attuale: editingPkmn.attacco_attuale || editingPkmn.attacco,
                difesa: editingPkmn.difesa,
                difesa_attuale: editingPkmn.difesa_attuale || editingPkmn.difesa,
                attacco_speciale: editingPkmn.attacco_speciale,
                attacco_speciale_attuale: editingPkmn.attacco_speciale_attuale || editingPkmn.attacco_speciale,
                difesa_speciale: editingPkmn.difesa_speciale,
                difesa_speciale_attuale: editingPkmn.difesa_speciale_attuale || editingPkmn.difesa_speciale,
                velocita: editingPkmn.velocita,
                velocita_attuale: editingPkmn.velocita_attuale || editingPkmn.velocita,
                strumento_tenuto: editingPkmn.strumento_tenuto || '',
                note: editingPkmn.note || '',
                tipo1: editingPkmn.tipo1,
                tipo2: editingPkmn.tipo2,
                // BONUS MASTER ESPLICITI
                bonus_hp: editingPkmn.bonus_hp || 0,
                bonus_attacco: editingPkmn.bonus_attacco || 0,
                bonus_difesa: editingPkmn.bonus_difesa || 0,
                bonus_attacco_speciale: editingPkmn.bonus_attacco_speciale || 0,
                bonus_difesa_speciale: editingPkmn.bonus_difesa_speciale || 0,
                bonus_velocita: editingPkmn.bonus_velocita || 0,
                posizione_squadra: (editingPkmn.posizione_squadra !== undefined && editingPkmn.posizione_squadra !== null) ? editingPkmn.posizione_squadra : 99
            };

            if (editingPkmn.id) {
                // UPDATE
                const { error } = await supabase
                    .from('pokemon_giocatore')
                    .update(pkmnData)
                    .eq('id', editingPkmn.id);
                if (error) throw error;

                // AGGIORNAMENTO MOSSE PER POKEMON ESISTENTE
                await supabase.from('mosse_pokemon').delete().eq('pokemon_giocatore_id', editingPkmn.id);
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
                    nome: searchResult.name.toUpperCase(),
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
                    forza: editForm.forza, // Vigore
                    destrezza: editForm.destrezza,
                    slot_squadra: editForm.slot_squadra,
                    altre_stats: editForm.altre_stats || {},
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
                                        <div className="stat-mini-box" title="Vigore">
                                            <Heart size={14} color="#ef4444" />
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
            {isEditing && editForm && createPortal(
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
                                                    onWheel={(e) => e.currentTarget.blur()}
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
                                                        onWheel={(e) => e.currentTarget.blur()}
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
                                                <label>Vigore (HP/ATK FISICO)</label>
                                                <div className="input-with-icon">
                                                    <Heart size={14} color="#ef4444" />
                                                    <input
                                                        type="number"
                                                        value={editForm.forza}
                                                        onChange={(e) => handleStatChange('forza', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="input-field">
                                                <label>Destrezza (DEF FISICA/VEL)</label>
                                                <div className="input-with-icon">
                                                    <Shield size={14} color="#3b82f6" />
                                                    <input
                                                        type="number"
                                                        value={editForm.destrezza}
                                                        onChange={(e) => handleStatChange('destrezza', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="input-field">
                                                <label>Sopravvivenza (Natura)</label>
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
                                                <label>Percezione (Sensi)</label>
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
                                                <label>Intelligenza (Saggezza/Tecnica)</label>
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
                                                <label>Eloquenza (Carisma/Sociale)</label>
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
                                                <label>Coraggio (Volontà)</label>
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
                                            {/* HEADER: FOTO E NOME + EVOLUZIONE */}
                                            <div className="pkmn-edit-header" style={{ display: 'flex', gap: '20px', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px', width: '100%' }}>
                                                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                                    <div style={{ position: 'relative' }}>
                                                        <img 
                                                            className="pkmn-image-tcg-large" 
                                                            src={getPkmnImage(editingPkmn)} 
                                                            alt={editingPkmn.nome} 
                                                            style={{ 
                                                                width: '120px', height: '120px', filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.4))', zIndex: 2, position: 'relative', objectFit: 'contain'
                                                            }}
                                                        />
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        {showEvoSearch ? (
                                                            <div className="evo-search-box" style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '15px', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.3)', width: '300px' }}>
                                                                <label style={{ fontSize: '0.7rem', color: '#a78bfa', fontWeight: 'bold' }}>CERCA EVOLUZIONE / CAMBIA SPECIE</label>
                                                                <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                                                                    <input 
                                                                        type="text" 
                                                                        placeholder="Es: Wartortle..."
                                                                        value={searchQuery}
                                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                                        style={{ 
                                                                            flex: 1, 
                                                                            height: '35px', 
                                                                            fontSize: '0.9rem',
                                                                            padding: '0 10px',
                                                                            background: 'rgba(0,0,0,0.3)',
                                                                            border: '1px solid rgba(139, 92, 246, 0.3)',
                                                                            borderRadius: '6px',
                                                                            color: 'white'
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="evo-results" style={{ marginTop: '10px', maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                                    {searchQuery.trim().length > 0 ? (
                                                                        filteredPokeList.length > 0 ? (
                                                                            filteredPokeList.slice(0, 10).map(p => (
                                                                                <div 
                                                                                    key={p.id} 
                                                                                    className="evo-res-item clickable"
                                                                                    onClick={() => handleEvolve(p)}
                                                                                    style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                                                >
                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                                        <img 
                                                                                            src={p.immagine_url || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.pokemon_id}.png`} 
                                                                                            alt={p.nome} 
                                                                                            style={{ width: '30px', height: '30px' }} 
                                                                                        />
                                                                                        <span style={{ fontWeight: 'bold' }}>{p.nome.toUpperCase()}</span>
                                                                                    </div>
                                                                                    <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>ID {p.pokemon_id}</span>
                                                                                </div>
                                                                            ))
                                                                        ) : (
                                                                            <div style={{ padding: '10px', fontSize: '0.8rem', opacity: 0.5, textAlign: 'center' }}>Nessun Pokémon...</div>
                                                                        )
                                                                    ) : (
                                                                        <div style={{ padding: '10px', fontSize: '0.8rem', opacity: 0.5, textAlign: 'center' }}>Scrivi per cercare...</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="pkmn-identity-info">
                                                                <h2 className="edit-pkmn-title" style={{ fontSize: '2.5rem', margin: 0, letterSpacing: '2px', lineHeight: 1 }}>{editingPkmn.nome?.toUpperCase()}</h2>
                                                                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                                                                    <div className="type-badge-pill" style={{ 
                                                                        display: 'flex', 
                                                                        alignItems: 'center', 
                                                                        gap: '8px', 
                                                                        background: `linear-gradient(90deg, ${getTypeColor(editingPkmn.tipo1)}88, ${getTypeColor(editingPkmn.tipo1)}44)`,
                                                                        padding: '4px 12px 4px 4px',
                                                                        borderRadius: '20px',
                                                                        border: `1px solid ${getTypeColor(editingPkmn.tipo1)}aa`,
                                                                        backdropFilter: 'blur(5px)'
                                                                    }}>
                                                                        <div className="pkmn-type-circle" style={{ backgroundColor: getTypeColor(editingPkmn.tipo1), width: '24px', height: '24px', margin: 0 }}>
                                                                            <img src={getTypeIcon(editingPkmn.tipo1)} alt={editingPkmn.tipo1} className="type-icon-img" style={{ width: '12px' }} />
                                                                        </div>
                                                                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'white', letterSpacing: '1px' }}>{getTypeLabel(editingPkmn.tipo1).toUpperCase()}</span>
                                                                    </div>

                                                                    {editingPkmn.tipo2 && (
                                                                        <div className="type-badge-pill" style={{ 
                                                                            display: 'flex', 
                                                                            alignItems: 'center', 
                                                                            gap: '8px', 
                                                                            background: `linear-gradient(90deg, ${getTypeColor(editingPkmn.tipo2)}88, ${getTypeColor(editingPkmn.tipo2)}44)`,
                                                                            padding: '4px 12px 4px 4px',
                                                                            borderRadius: '20px',
                                                                            border: `1px solid ${getTypeColor(editingPkmn.tipo2)}aa`,
                                                                            backdropFilter: 'blur(5px)'
                                                                        }}>
                                                                            <div className="pkmn-type-circle" style={{ backgroundColor: getTypeColor(editingPkmn.tipo2), width: '24px', height: '24px', margin: 0 }}>
                                                                                <img src={getTypeIcon(editingPkmn.tipo2)} alt={editingPkmn.tipo2} className="type-icon-img" style={{ width: '12px' }} />
                                                                            </div>
                                                                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'white', letterSpacing: '1px' }}>{getTypeLabel(editingPkmn.tipo2).toUpperCase()}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* ACTION SECTION: EVOLUTION BUTTON */}
                                                <button 
                                                    className={`btn-evo-master ${showEvoSearch ? 'active' : ''}`}
                                                    onClick={() => {
                                                        const nextState = !showEvoSearch;
                                                        setShowEvoSearch(nextState);
                                                        setSearchQuery('');
                                                        if (nextState && fullPokeList.length === 0) {
                                                            caricaPokedexLibrary();
                                                        }
                                                    }}
                                                    style={{
                                                        width: '80px',
                                                        height: '80px',
                                                        borderRadius: '50%',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '5px',
                                                        background: showEvoSearch ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #8b5cf6, #d946ef)',
                                                        border: showEvoSearch ? '1px solid rgba(139, 92, 246, 0.5)' : 'none',
                                                        color: 'white',
                                                        boxShadow: showEvoSearch ? 'none' : '0 10px 20px rgba(139, 92, 246, 0.3)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                        flexShrink: 0
                                                    }}
                                                >
                                                    <Zap size={24} color={showEvoSearch ? '#8b5cf6' : 'white'} />
                                                    <span style={{ fontSize: '0.65rem', fontWeight: '900', letterSpacing: '1px', color: showEvoSearch ? '#8b5cf6' : 'white' }}>
                                                        {showEvoSearch ? 'ANNULLA' : 'EVOLVI'}
                                                    </span>
                                                </button>
                                            </div>

                                            <div className="pkmn-header-edit-row" style={{ display: 'flex', gap: '15px', marginBottom: '25px', alignItems: 'flex-end' }}>
                                                <div className="input-field" style={{ flex: 1 }}>
                                                    <label>SOPRANNOME</label>
                                                    <input 
                                                        type="text" 
                                                        value={editingPkmn.soprannome || ''} 
                                                        onChange={(e) => handlePokeStatChange('soprannome', e.target.value)} 
                                                    />
                                                </div>
                                                <div className="input-field" style={{ width: '120px' }}>
                                                    <label>Lv. (1-20)</label>
                                                    <div style={{ display: 'flex', gap: '5px' }}>
                                                        <input 
                                                            type="number" 
                                                            min="1"
                                                            max="20"
                                                            value={editingPkmn.livello} 
                                                            onChange={(e) => handlePokeStatChange('livello', e.target.value)} 
                                                        />
                                                        <button 
                                                            className="btn-lvl-up" 
                                                            title="Level Up!"
                                                            onClick={() => handlePokeStatChange('livello', Math.min(20, (editingPkmn.livello || 1) + 1))}
                                                        >
                                                            <TrendingUp size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>


                                    <div className="pkmn-stats-grid-master">
                                        {/* RIGA 1: VITALITÀ & RAPIDITÀ */}
                                        <div className="stats-thematic-row vitalita-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', padding: '15px', borderRadius: '16px', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.1)', marginBottom: '15px' }}>
                                            <div className="input-field">
                                                <label style={{ color: '#10b981' }}>HP Attuali</label>
                                                <input type="number" onWheel={(e) => e.currentTarget.blur()} value={editingPkmn.hp_attuale} onChange={(e) => handlePokeStatChange('hp_attuale', e.target.value)} />
                                            </div>
                                            <div className="input-field">
                                                <label style={{ color: '#10b981' }}>HP Max</label>
                                                <input type="number" onWheel={(e) => e.currentTarget.blur()} value={editingPkmn.hp_max} onChange={(e) => handlePokeStatChange('hp_max', e.target.value)} />
                                            </div>
                                            <div className="input-field">
                                                <label style={{ color: '#10b981', opacity: 0.7 }}>Vel. Base</label>
                                                <input type="number" onWheel={(e) => e.currentTarget.blur()} value={editingPkmn.velocita} onChange={(e) => handlePokeStatChange('velocita', e.target.value)} />
                                            </div>
                                            <div className="input-field">
                                                <label style={{ color: '#fbbf24', fontWeight: 'bold' }}>Vel. Attuale</label>
                                                <input type="number" onWheel={(e) => e.currentTarget.blur()} value={editingPkmn.velocita_attuale || editingPkmn.velocita} onChange={(e) => handlePokeStatChange('velocita_attuale', e.target.value)} />
                                            </div>
                                        </div>

                                        {/* RIGA 2: POTENZA OFFENSIVA */}
                                        <div className="stats-thematic-row attacco-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', padding: '15px', borderRadius: '16px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', marginBottom: '15px' }}>
                                            <div className="input-field">
                                                <label style={{ color: '#ef4444', opacity: 0.7 }}>Atk Base</label>
                                                <input type="number" onWheel={(e) => e.currentTarget.blur()} value={editingPkmn.attacco} onChange={(e) => handlePokeStatChange('attacco', e.target.value)} />
                                            </div>
                                            <div className="input-field">
                                                <label style={{ color: '#fbbf24', fontWeight: 'bold' }}>Atk Attuale</label>
                                                <input type="number" onWheel={(e) => e.currentTarget.blur()} value={editingPkmn.attacco_attuale || editingPkmn.attacco} onChange={(e) => handlePokeStatChange('attacco_attuale', e.target.value)} />
                                            </div>
                                            <div className="input-field">
                                                <label style={{ color: '#ef4444', opacity: 0.7 }}>S.Atk Base</label>
                                                <input type="number" onWheel={(e) => e.currentTarget.blur()} value={editingPkmn.attacco_speciale} onChange={(e) => handlePokeStatChange('attacco_speciale', e.target.value)} />
                                            </div>
                                            <div className="input-field">
                                                <label style={{ color: '#fbbf24', fontWeight: 'bold' }}>S.Atk Attuale</label>
                                                <input type="number" onWheel={(e) => e.currentTarget.blur()} value={editingPkmn.attacco_speciale_attuale || editingPkmn.attacco_speciale} onChange={(e) => handlePokeStatChange('attacco_speciale_attuale', e.target.value)} />
                                            </div>
                                        </div>

                                        {/* RIGA 3: RESISTENZA DIFENSIVA */}
                                        <div className="stats-thematic-row difesa-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', padding: '15px', borderRadius: '16px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                                            <div className="input-field">
                                                <label style={{ color: '#3b82f6', opacity: 0.7 }}>Def Base</label>
                                                <input type="number" onWheel={(e) => e.currentTarget.blur()} value={editingPkmn.difesa} onChange={(e) => handlePokeStatChange('difesa', e.target.value)} />
                                            </div>
                                            <div className="input-field">
                                                <label style={{ color: '#fbbf24', fontWeight: 'bold' }}>Def Attuale</label>
                                                <input type="number" onWheel={(e) => e.currentTarget.blur()} value={editingPkmn.difesa_attuale || editingPkmn.difesa} onChange={(e) => handlePokeStatChange('difesa_attuale', e.target.value)} />
                                            </div>
                                            <div className="input-field">
                                                <label style={{ color: '#3b82f6', opacity: 0.7 }}>S.Def Base</label>
                                                <input type="number" onWheel={(e) => e.currentTarget.blur()} value={editingPkmn.difesa_speciale} onChange={(e) => handlePokeStatChange('difesa_speciale', e.target.value)} />
                                            </div>
                                            <div className="input-field">
                                                <label style={{ color: '#fbbf24', fontWeight: 'bold' }}>S.Def Attuale</label>
                                                <input type="number" onWheel={(e) => e.currentTarget.blur()} value={editingPkmn.difesa_speciale_attuale || editingPkmn.difesa_speciale} onChange={(e) => handlePokeStatChange('difesa_speciale_attuale', e.target.value)} />
                                            </div>
                                        </div>
                                    </div>

                                            <div className="strategia-master-row" style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                                <div>
                                                    <h4 className="edit-section-title"><Info size={16} /> Strumento Tenuto</h4>
                                                    <div className="input-field full-width">
                                                        <input 
                                                            type="text" 
                                                            placeholder="Nessuno strumento..." 
                                                            value={editingPkmn.strumento_tenuto || ''} 
                                                            onChange={(e) => handlePokeStatChange('strumento_tenuto', e.target.value)} 
                                                            style={{ borderRadius: '12px' }}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="edit-section-title"><Zap size={16} /> Progressione EXP</h4>
                                                    <div className="input-field full-width">
                                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                            <input 
                                                                type="number" 
                                                                onWheel={(e) => e.currentTarget.blur()}
                                                                value={editingPkmn.danni_totali || 0} 
                                                                onChange={(e) => handlePokeStatChange('danni_totali', e.target.value)} 
                                                                style={{ borderRadius: '12px', fontSize: '1.2rem', fontWeight: 'bold', color: '#fbbf24' }}
                                                            />
                                                            <span style={{ opacity: 0.5, fontSize: '0.8rem' }}>Danni Totali Inflitti</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pkmn-moves-master-section" style={{ marginTop: '20px' }}>
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
                                                    <select value={moveTypeFilter} onChange={(e) => setMoveTypeFilter(e.target.value)}>
                                                        <option value="all">Tutti i Tipi</option>
                                                        {Array.from(new Set(allAvailableMoves.map(m => m.tipo?.toLowerCase()))).map(type => (
                                                            <option key={type} value={type}>{getTypeLabel(type)}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="moves-selection-grid">
                                                    {allAvailableMoves
                                                        .filter(m => {
                                                            const matchesSearch = m.nome.toLowerCase().includes(moveSearch.toLowerCase()) || 
                                                                               getTypeLabel(m.tipo).toLowerCase().includes(moveSearch.toLowerCase());
                                                            const matchesType = moveTypeFilter === 'all' || m.tipo === moveTypeFilter;
                                                            return matchesSearch && matchesType;
                                                        })
                                                        .map(move => {
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
                                                                            <span className="type-tag-move" style={{ borderLeftColor: getTypeColor(move.tipo) }}>
                                                                                {getTypeLabel(move.tipo)}
                                                                            </span>
                                                                        </div>
                                                                        <div className="move-check-details">
                                                                            <span>POT <strong style={{ color: '#fbbf24' }}>{move.danni || move.potenza || '-'}</strong></span>
                                                                            <span>PP <strong style={{ color: '#fbbf24' }}>{move.pp_max}</strong></span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                </div>
                                            </div>
                                            <div className="note-master-section" style={{ marginTop: '20px', width: '100%' }}>
                                                <h4 className="edit-section-title"><Info size={16} /> Note & Cronaca della Campagna</h4>
                                                <textarea 
                                                    placeholder="Note narrative, effetti particolari, segnaposti..." 
                                                    value={editingPkmn.note || ''} 
                                                    onChange={(e) => handlePokeStatChange('note', e.target.value)} 
                                                    style={{ 
                                                        width: '100%', 
                                                        height: '100px', 
                                                        borderRadius: '12px', 
                                                        background: 'rgba(255,255,255,0.03)',
                                                        border: '1px solid rgba(255,255,255,0.1)',
                                                        color: 'white',
                                                        padding: '12px',
                                                        marginTop: '10px'
                                                    }}
                                                />
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
                                                        filteredPokeList.map(p => {
                                                            const nationalId = p.immagine_url?.split('/').pop().split('.')[0] || p.id;
                                                            const highResThumb = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${nationalId}.png`;
                                                            
                                                            return (
                                                                <div
                                                                    key={p.id}
                                                                    className={`library-item-pkmn ${searchResult?.id === p.id ? 'selected' : ''}`}
                                                                    onClick={() => selectFromLibrary(p)}
                                                                >
                                                                    <img 
                                                                        src={highResThumb} 
                                                                        alt={p.nome} 
                                                                        onError={(e) => { e.target.src = p.immagine_url || p.sprite_url; }}
                                                                        style={{ objectFit: 'contain' }}
                                                                    />
                                                                    <span>{p.nome.toUpperCase()}</span>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>

                                                {/* RISULTATO SELEZIONATO (PER CONFERMA) */}
                                                <div className="library-selection-detail">
                                                    {searchResult ? (
                                                        <div className="search-result-card selection-mode animate-fade-in">
                                                            <img
                                                                src={searchResult.immagine_url}
                                                                alt={searchResult.nome}
                                                            />
                                                            <div className="result-info">
                                                                <h3>#{searchResult.id} {searchResult.nome.toUpperCase()}</h3>
                                                                <div className="pkmn-types">
                                                                    <span className="type-tag" style={{ borderLeftColor: `var(--type-${searchResult.tipo1.toLowerCase()})` }}>
                                                                        {getTypeLabel(searchResult.tipo1)}
                                                                    </span>
                                                                    {searchResult.tipo2 && (
                                                                        <span className="type-tag" style={{ borderLeftColor: `var(--type-${searchResult.tipo2.toLowerCase()})` }}>
                                                                            {getTypeLabel(searchResult.tipo2)}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <button 
                                                                    className="btn-confirm-add" 
                                                                    style={{ marginTop: '15px' }} 
                                                                    onClick={() => {
                                                                        // Reset preventivo per evitare ghosting di dati vecchi
                                                                        setEditingPkmn(null);
                                                                        
                                                                        // 🛡️ FIX FINALE: Calcolo "Puro" senza IV/EV (IV=0, EV=0)
                                                                        const initialLevel = 5;
                                                                        const calculated = calculatePokemonStats(searchResult, initialLevel, 
                                                                            { hp: 0, attacco: 0, difesa: 0, attacco_speciale: 0, difesa_speciale: 0, velocita: 0 }, 
                                                                            { hp: 0, attacco: 0, difesa: 0, attacco_speciale: 0, difesa_speciale: 0, velocita: 0 }
                                                                        );

                                                                        setTimeout(() => {
                                                                            setEditingPkmn({
                                                                                pokemon_id: searchResult.id,
                                                                                nome: searchResult.nome.toUpperCase(),
                                                                                soprannome: searchResult.nome.toUpperCase(),
                                                                                livello: initialLevel,
                                                                                hp_attuale: calculated.hp_max,
                                                                                hp_max: calculated.hp_max,
                                                                                attacco: calculated.attacco,
                                                                                difesa: calculated.difesa,
                                                                                attacco_speciale: calculated.attacco_speciale,
                                                                                difesa_speciale: calculated.difesa_speciale,
                                                                                velocita: calculated.velocita,
                                                                                hp_base: searchResult.hp_base,
                                                                                atk_base: searchResult.atk_base,
                                                                                def_base: searchResult.def_base,
                                                                                spatk_base: searchResult.spatk_base,
                                                                                spdef_base: searchResult.spdef_base,
                                                                                speed_base: searchResult.speed_base,
                                                                                tipo1: searchResult.tipo1.toLowerCase(),
                                                                                tipo2: searchResult.tipo2 ? searchResult.tipo2.toLowerCase() : null,
                                                                                posizione_squadra: 99,
                                                                                specie: searchResult,
                                                                                // Bonus Iniziali (Tutto parte da 0)
                                                                                bonus_hp: 0,
                                                                                bonus_attacco: 0,
                                                                                bonus_difesa: 0,
                                                                                bonus_attacco_speciale: 0,
                                                                                bonus_difesa_speciale: 0,
                                                                                bonus_velocita: 0,
                                                                                // Reset parametri invisibili
                                                                                iv_hp: 0, iv_attacco: 0, iv_difesa: 0, iv_attacco_speciale: 0, iv_difesa_speciale: 0, iv_velocita: 0,
                                                                                ev_hp: 0, ev_attacco: 0, ev_difesa: 0, ev_attacco_speciale: 0, ev_difesa_speciale: 0, ev_velocita: 0
                                                                            });
                                                                            setSearchResult(null);
                                                                            setSearchQuery('');
                                                                            setShowAddItem(false);
                                                                        }, 50);
                                                                    }}
                                                                >
                                                                    <Edit2 size={18} />
                                                                    Configura e Assegna
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
                                                                    const hpPct = ((poke.hp_attuale || poke.hp || 0) / (poke.hp_max || 100)) * 100;
                                                                    const hpCol = hpPct > 50 ? '#34d399' : hpPct > 20 ? '#fbbf24' : '#ef4444';
                                                                    return (
                                                                        <div key={poke.id} className="pkmn-card-squadra master-card-premium clickable" onClick={() => startEditingPkmn(poke)}>
                                                                            <div className="pkmn-types-wrapper">
                                                                                <div className="pkmn-type-circle" style={{ backgroundColor: getTypeColor(poke.tipo1) }} title={getTypeLabel(poke.tipo1)}>
                                                                                    <img src={getTypeIcon(poke.tipo1)} alt={poke.tipo1} className="type-icon-img" />
                                                                                </div>
                                                                                {poke.tipo2 && (
                                                                                    <div className="pkmn-type-circle" style={{ backgroundColor: getTypeColor(poke.tipo2) }} title={getTypeLabel(poke.tipo2)}>
                                                                                        <img src={getTypeIcon(poke.tipo2)} alt={poke.tipo2} className="type-icon-img" />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div className="pkmn-lvl-badge">Lv.{poke.livello}</div>
                                                                            <img className="pkmn-image" src={getPkmnImage(poke)} alt={poke.soprannome || poke.nome} />
                                                                            <div className="pkmn-card-details">
                                                                                <div className="pkmn-identity-stack">
                                                                                    <h3 className="pkmn-race-title">{poke.nome?.toUpperCase()}</h3>
                                                                                    {poke.soprannome && poke.soprannome !== poke.nome && (
                                                                                        <span className="pkmn-nickname-subtitle">{poke.soprannome}</span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="hp-section">
                                                                                    <div className="hp-info">
                                                                                        <span>HP</span>
                                                                                        <span>{poke.hp_attuale || poke.hp || 0}/{poke.hp_max || 100}</span>
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
                                                        <div className="box-grid-v3">
                                                            {playerPokemon.filter(p => p.posizione_squadra >= (editForm.slot_squadra || 3)).length === 0 ? (
                                                                <p className="empty-text">Il box è vuoto.</p>
                                                            ) : (
                                                                playerPokemon.filter(p => p.posizione_squadra >= (editForm.slot_squadra || 3)).map(poke => {
                                                                    const hpPct = ((poke.hp_attuale || poke.hp || 0) / (poke.hp_max || 100)) * 100;
                                                                    const hpCol = hpPct > 50 ? '#34d399' : hpPct > 20 ? '#fbbf24' : '#ef4444';
                                                                    
                                                                    return (
                                                                        <div key={poke.id} className="pkmn-card-squadra compact-box-card-v3 clickable" onClick={() => startEditingPkmn(poke)}>
                                                                            <div className="pkmn-types-wrapper-mini">
                                                                                <div className="pkmn-type-circle-mini" style={{ backgroundColor: getTypeColor(poke.tipo1) }} title={getTypeLabel(poke.tipo1)}>
                                                                                    <img src={getTypeIcon(poke.tipo1)} alt={poke.tipo1} className="type-icon-img-mini" />
                                                                                </div>
                                                                                {poke.tipo2 && (
                                                                                    <div className="pkmn-type-circle-mini" style={{ backgroundColor: getTypeColor(poke.tipo2) }} title={getTypeLabel(poke.tipo2)}>
                                                                                        <img src={getTypeIcon(poke.tipo2)} alt={poke.tipo2} className="type-icon-img-mini" />
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div className="pkmn-lvl-badge" style={{ fontSize: '0.6rem' }}>Lv.{poke.livello}</div>
                                                                            <img 
                                                                                className="pkmn-image-mini" 
                                                                                src={getPkmnImage(poke)} 
                                                                                alt={poke.nome} 
                                                                                onError={(e) => { e.target.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png'; }}
                                                                            />
                                                                            <div className="pkmn-identity-stack-mini">
                                                                                <div className="pkmn-name-mini">{poke.nome?.toUpperCase()}</div>
                                                                                {poke.soprannome && poke.soprannome !== poke.nome && (
                                                                                    <div className="pkmn-nickname-mini">{poke.soprannome}</div>
                                                                                )}
                                                                            </div>
                                                                            <div className="hp-section mini-hp">
                                                                                <div className="hp-info">
                                                                                    <span>HP</span>
                                                                                    <span>{poke.hp_attuale || poke.hp || 0}/{poke.hp_max || 100}</span>
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

                        {!editingPkmn && !showAddItem && (
                            <div className="modal-footer">
                                <button className="btn-cancel" onClick={() => setIsEditing(false)}>Annulla</button>
                                <button className="btn-save" onClick={saveChanges} disabled={saving}>
                                    {saving ? <Loader2 size={18} className="spin" /> : <><Save size={18} /> Salva Modifiche</>}
                                </button>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL DI CONFERMA GRAFICO */}
            {confirmModal && createPortal(
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
                </div>,
                document.body
            )}
        </div>
    );
}
