import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Edit2, Save, X, Loader2, Check, Info, Trash2, Heart, Shield, Zap, TrendingUp, Ruler, Weight, Upload } from 'lucide-react';
import { getTypeColor, getTypeLabel } from '../../lib/typeColors';
import './Party.css'; // Reusing Party.css for consistent Master dashboard styling

export default function PokemonMaster() {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('campaign'); // 'campaign' o 'national'
    const [pokemonNational, setPokemonNational] = useState([]);
    const [pokemonCampaign, setPokemonCampaign] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState(null);
    const [editSource, setEditSource] = useState(null); // 'national' o 'campaign'
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [tipiDisponibili, setTipiDisponibili] = useState([]);

    const BUCKET_NAME = 'pokemon_immagini';

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // 🛡️ Upload su Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from(BUCKET_NAME)
                .upload(filePath, file);

            if (uploadError) {
                if (uploadError.message.includes('bucket not found')) {
                    throw new Error("Il bucket 'pokemon_immagini' non esiste su Supabase. Crealo nella sezione Storage.");
                }
                throw uploadError;
            }

            // Recupero URL pubblico
            const { data: { publicUrl } } = supabase.storage
                .from(BUCKET_NAME)
                .getPublicUrl(filePath);

            setEditForm(prev => ({ ...prev, immagine_url: publicUrl }));
        } catch (err) {
            console.error("Errore upload immagine:", err);
            alert(err.message || "Errore durante il caricamento dell'immagine.");
        } finally {
            setUploading(false);
        }
    };

    useEffect(() => {
        caricaDati();
    }, []);


    async function caricaDati() {
        setLoading(true);
        await Promise.all([caricaPokemonNational(), caricaPokemonCampaign(), caricaTipi()]);
        setLoading(false);
    }

    async function caricaTipi() {
        try {
            const { data, error } = await supabase.from('tipi_pokemon').select('*').order('nome_it');
            if (error) throw error;
            setTipiDisponibili(data || []);
        } catch (err) {
            console.error("Errore caricamento tipi:", err);
        }
    }

    async function caricaPokemonNational() {
        try {
            const { data, error } = await supabase
                .from('pokemon')
                .select('*')
                .order('id', { ascending: true });
            if (error) throw error;
            setPokemonNational(data || []);
        } catch (err) {
            console.error("Errore caricamento national:", err);
        }
    }

    async function caricaPokemonCampaign() {
        try {
            const { data, error } = await supabase
                .from('pokemon_campagna')
                .select('*')
                .order('id', { ascending: true });
            if (error) throw error;
            setPokemonCampaign(data || []);
        } catch (err) {
            console.error("Errore caricamento campaign:", err);
        }
    }

    async function salvaPokemon(asNew = false) {
        setSaving(true);
        try {
            // Decidiamo la tabella di destinazione
            // Se editSource è 'national' AND non stiamo salvando come nuovo => aggiorna Pokédex Nazionale (tabella pokemon)
            // Altrimenti => aggiorna/inserisce in pokemon_campagna
            const isNationalUpdate = editSource === 'national' && !asNew;
            const targetTable = isNationalUpdate ? 'pokemon' : 'pokemon_campagna';

            // 🛡️ Logica di calcolo ID ultra-sicura (solo per pokemon_campagna)
            let idToUse = editForm.id;
            
            if (targetTable === 'pokemon_campagna') {
                // Se stiamo salvando come nuovo o se l'ID manca/non è valido
                if (asNew || !idToUse || isNaN(Number(idToUse))) {
                    const { data: allPkmn, error: fetchError } = await supabase
                        .from('pokemon_campagna')
                        .select('id');
                    
                    if (fetchError) throw fetchError;

                    const ids = (allPkmn || []).map(p => Number(p.id));
                    let next = 1;
                    while (ids.includes(next)) {
                        next++;
                    }
                    idToUse = next;
                }
            }

            const cleanId = Number(idToUse);

            const payload = {
                id: cleanId,
                nome: String(editForm.nome || 'SCONOSCIUTO').toUpperCase().trim(),
                tipo1: String(editForm.tipo1 || 'NORMALE').toUpperCase().trim(),
                tipo2: editForm.tipo2 && editForm.tipo2.toUpperCase() !== 'NESSUNO' ? editForm.tipo2.toUpperCase().trim() : null,
                hp_base: parseInt(editForm.hp_base) || 0,
                atk_base: parseInt(editForm.atk_base) || 0,
                def_base: parseInt(editForm.def_base) || 0,
                spatk_base: parseInt(editForm.spatk_base) || 0,
                spdef_base: parseInt(editForm.spdef_base) || 0,
                speed_base: parseInt(editForm.speed_base) || 0,
                immagine_url: editForm.immagine_url || null,
                sprite_url: editForm.sprite_url || null,
                descrizione: editForm.descrizione || '',
                visibile_pokedex: Boolean(editForm.visibile_pokedex === false ? false : true),
                altezza: editForm.altezza || '',
                peso: editForm.peso || '',
                debolezze: editForm.debolezze || '',
                debolezze_x4: editForm.debolezze_x4 || '',
                resistenze: editForm.resistenze || '',
                resistenze_x4: editForm.resistenze_x4 || '',
                immunita: editForm.immunita || ''
            };

            // 🛡️ Upsert millimetrico: se l'ID esiste aggiorna, altrimenti inserisce
            const { error: upsertError } = await supabase
                .from(targetTable)
                .upsert(payload, { onConflict: 'id' });
                
            if (upsertError) throw upsertError;
            
            setIsEditing(false);
            if (targetTable === 'pokemon') {
                caricaPokemonNational();
            } else {
                caricaPokemonCampaign();
                setActiveTab('campaign');
            }
        } catch (err) {
            console.error("DEBUG - Errore salvataggio pokemon:", err);
            alert("Benjamin segnala un errore: " + (err.message || "Controlla i campi inseriti."));
        } finally {
            setSaving(false);
        }
    }

    async function importaInCampagna(p) {
        // Mappatura inversa per il selettore (EN -> IT Upper)
        const typeMap = {
            'normal': 'NORMALE', 'fire': 'FUOCO', 'water': 'ACQUA', 'grass': 'ERBA',
            'electric': 'ELETTRO', 'ice': 'GHIACCIO', 'fighting': 'LOTTA', 'poison': 'VELENO',
            'ground': 'TERRA', 'flying': 'VOLANTE', 'psychic': 'PSICO', 'bug': 'COLEOTTERO',
            'rock': 'ROCCIA', 'ghost': 'SPETTRO', 'dragon': 'DRAGO', 'steel': 'ACCIAIO',
            'fairy': 'FOLLETTO', 'dark': 'BUIO', 'suono': 'SUONO', 'sconosciuto': 'SCONOSCIUTO'
        };

        setEditForm({
            nome: p.nome.toUpperCase(),
            tipo1: typeMap[p.tipo1.toLowerCase()] || 'NORMALE',
            tipo2: p.tipo2 ? (typeMap[p.tipo2.toLowerCase()] || 'NESSUNO') : 'NESSUNO',
            hp_base: p.hp_base,
            atk_base: p.atk_base,
            def_base: p.def_base,
            spatk_base: p.spatk_base,
            spdef_base: p.spdef_base,
            speed_base: p.speed_base,
            immagine_url: p.immagine_url?.includes('sprites/pokemon/') && !p.immagine_url.includes('other/official-artwork') 
                ? p.immagine_url.replace('sprites/pokemon/', 'sprites/pokemon/other/official-artwork/') 
                : p.immagine_url,
            sprite_url: p.sprite_url,
            descrizione: p.descrizione,
            visibile_pokedex: true,
            altezza: p.altezza || '',
            peso: p.peso || '',
            debolezze: p.debolezze || '',
            debolezze_x4: p.debolezze_x4 || '',
            resistenze: p.resistenze || '',
            resistenze_x4: p.resistenze_x4 || '',
            immunita: p.immunita || ''
        });
        setIsEditing(true);
    }

    const toggleTipoInStringa = (category, typeNameIt) => {
        const currentVal = editForm[category] || '';
        // Helper per normalizzare i tipi (gestisce mix IT/EN e maiuscole/minuscole)
        const normalize = (t) => {
            const label = getTypeLabel(t.trim());
            return label ? label.toUpperCase() : t.trim().toUpperCase();
        };

        let activeTypes = currentVal.split(',')
            .map(t => t.trim())
            .filter(Boolean)
            .map(normalize);

        const target = typeNameIt.toUpperCase();
        const index = activeTypes.indexOf(target);

        if (index > -1) {
            activeTypes.splice(index, 1);
        } else {
            activeTypes.push(target);
        }

        setEditForm({ ...editForm, [category]: activeTypes.join(', ') });
    };

    const isTipoAttivo = (category, typeNameIt) => {
        const currentVal = editForm[category] || '';
        if (!currentVal.trim()) return false;
        return currentVal.split(',')
            .map(t => t.trim())
            .filter(Boolean)
            .some(t => {
                const label = getTypeLabel(t);
                return (label || t).toUpperCase() === typeNameIt.toUpperCase();
            });
    };

    const openEditModal = (p = null, source = 'campaign') => {
        setEditSource(source);
        if (p) {
            setEditForm({ 
                ...p, 
                tipo1: p.tipo1.toUpperCase(), 
                tipo2: p.tipo2 ? p.tipo2.toUpperCase() : null 
            });
        } else {
            setEditForm({
                nome: '',
                tipo1: 'NORMALE',
                tipo2: null,
                hp_base: 50,
                atk_base: 50,
                def_base: 50,
                spatk_base: 50,
                spdef_base: 50,
                speed_base: 50,
                descrizione: '',
                immagine_url: '',
                sprite_url: '',
                visibile_pokedex: true,
                altezza: '',
                peso: '',
                debolezze: '',
                debolezze_x4: '',
                resistenze: '',
                resistenze_x4: '',
                immunita: ''
            });
        }
        setIsEditing(true);
    };


    async function eliminaPokemon(id) {
        if (!confirm("Sei sicuro di voler rimuovere questo Pokemon dalla Campagna?")) return;
        try {
            const { error } = await supabase.from('pokemon_campagna').delete().eq('id', id);
            if (error) throw error;
            
            // 🛡️ Se la tabella è vuota, resetta l'ID a 1
            const { data: remains } = await supabase.from('pokemon_campagna').select('id').limit(1);
            if (!remains || remains.length === 0) {
                await supabase.rpc('reset_id_pokemon_campagna');
            }
            
            caricaPokemonCampaign();
        } catch (err) {
            console.error(err);
        }
    }

    async function togglePokedex(p) {
        try {
            const { error } = await supabase
                .from('pokemon_campagna')
                .update({ visibile_pokedex: !p.visibile_pokedex })
                .eq('id', p.id);
            if (error) throw error;
            setPokemonCampaign(prev => prev.map(item => item.id === p.id ? { ...item, visibile_pokedex: !item.visibile_pokedex } : item));
        } catch (err) {
            console.error(err);
        }
    }

    const currentList = activeTab === 'national' ? pokemonNational : pokemonCampaign;

    const filteredLocal = currentList.filter(p =>
        p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.id && p.id.toString().includes(searchTerm))
    );

    return (
        <div className="pokemon-master-page animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <TrendingUp size={32} color="var(--accent-primary-light)" />
                        Enciclopedia Pokémon
                    </h1>
                    <p className="page-subtitle">Gestisci i Pokémon base della tua campagna</p>
                </div>
                <button className="btn-save" onClick={() => openEditModal()}>
                    <Plus size={18} /> Nuovo Pokémon
                </button>
            </div>

            <div className="tab-control-master">
                <button 
                    className={`tab-btn ${activeTab === 'campaign' ? 'active' : ''}`}
                    onClick={() => setActiveTab('campaign')}
                >
                    <Check size={18} /> Libreria Campagna ({pokemonCampaign.length})
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'national' ? 'active' : ''}`}
                    onClick={() => setActiveTab('national')}
                >
                    <Info size={18} /> Pokédex Nazionale (1025)
                </button>
            </div>

            <div className="search-bar-container">
                <Search className="search-icon" size={20} />
                <input
                    type="text"
                    placeholder={`Cerca in ${activeTab === 'national' ? 'Pokédex Nazionale' : 'Libreria Campagna'}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="flex-center p-xl"><Loader2 className="spin" size={32} /></div>
            ) : filteredLocal.length === 0 ? (
                <div className="empty-state-pokedex">
                    <Info size={48} />
                    <h3>{activeTab === 'national' ? 'Niente nel Pokédex' : 'Libreria della Campagna Vuota'}</h3>
                    <p>{activeTab === 'national' ? 'Controlla il termine di ricerca.' : 'Inizia importando Pokémon dal Pokédex Nazionale o creane uno nuovo!'}</p>
                </div>
            ) : (
                    <div className="master-list-table-container">
                        <table className="master-list-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Immagine</th>
                                    <th>Nome</th>
                                    <th>Tipo</th>
                                    <th>Stats</th>
                                    {activeTab === 'campaign' && <th>Visibilità</th>}
                                    <th>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLocal.map((p) => (
                                    <tr key={p.id}>
                                        <td style={{ opacity: 0.5, fontFamily: 'monospace' }}>#{p.id}</td>
                                        <td>
                                            <img 
                                                src={p.immagine_url?.includes('sprites/pokemon/') && !p.immagine_url.includes('other/official-artwork') 
                                                    ? p.immagine_url.replace('sprites/pokemon/', 'sprites/pokemon/other/official-artwork/') 
                                                    : p.immagine_url} 
                                                alt={p.nome} 
                                                className="master-list-img" 
                                            />
                                        </td>
                                        <td style={{ fontWeight: 800 }}>{p.nome}</td>
                                        <td>
                                            <div className="pkmn-types-mini">
                                                <span className="type-badge-mini" style={{ backgroundColor: `var(--type-${p.tipo1.toLowerCase()})` }}>{getTypeLabel(p.tipo1)}</span>
                                                {p.tipo2 && <span className="type-badge-mini" style={{ backgroundColor: `var(--type-${p.tipo2.toLowerCase()})` }}>{getTypeLabel(p.tipo2)}</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                                {p.hp_base}/{p.atk_base}/{p.def_base}
                                            </span>
                                        </td>
                                        {activeTab === 'campaign' && (
                                            <td>
                                                <div
                                                    className={`pokedex-toggle ${p.visibile_pokedex ? 'active' : ''}`}
                                                    onClick={() => togglePokedex(p)}
                                                >
                                                    <div className="toggle-circle"></div>
                                                </div>
                                            </td>
                                        )}
                                        <td className="actions-cell-column">
                                            <div className="actions-cell">
                                                 {activeTab === 'national' ? (
                                                    <>
                                                        <button className="btn-icon accent" title="Importa in Campagna" onClick={() => importaInCampagna(p)}>
                                                            <Plus size={16} />
                                                        </button>
                                                        <button className="btn-icon" title="Modifica Base" onClick={() => openEditModal(p, 'national')}>
                                                            <Edit2 size={16} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button className="btn-icon" onClick={() => openEditModal(p)}><Edit2 size={16} /></button>
                                                        <button className="btn-icon del" onClick={() => eliminaPokemon(p.id)}><Trash2 size={16} /></button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

{isEditing && editForm && (
                <div className="modal-overlay">
                    <div className="master-edit-modal npc-modal-premium animate-slide-up">
                        <div className="modal-header">
                            <h3>{editForm.id ? 'Modifica Pokémon' : 'Crea Nuovo Pokémon'}</h3>
                            <button className="modal-close" onClick={() => setIsEditing(false)}><X size={24} /></button>
                        </div>

                        <div className="modal-body-scroll">
                            <div className="edit-section">
                                <h4 className="edit-section-title"><Info size={16} /> Informazioni Base</h4>
                                
                                {/* RIGA 1: IMMAGINE */}
                                <div className="edit-image-top-section" style={{ display: 'flex', justifyContent: 'center', marginBottom: '25px', width: '100%' }}>
                                    <div className="input-field" style={{ width: '200px', margin: '0 auto' }}>
                                        <label style={{ textAlign: 'center' }}>Immagine Pokémon</label>
                                        <div className="upload-container" style={{ margin: '0 auto' }}>
                                            {editForm.immagine_url ? (
                                                <div className="preview-container">
                                                    <img src={editForm.immagine_url} alt="Anteprima" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }} />
                                                    <button className="remove-img" onClick={() => setEditForm({ ...editForm, immagine_url: '' })}><X size={14} /></button>
                                                </div>
                                            ) : (
                                                <label className="upload-placeholder">
                                                    <input 
                                                        type="file" 
                                                        accept="image/*" 
                                                        onChange={handleFileUpload} 
                                                        style={{ display: 'none' }} 
                                                        disabled={uploading}
                                                    />
                                                    {uploading ? (
                                                        <Loader2 className="spin" size={24} />
                                                    ) : (
                                                        <>
                                                            <Upload size={24} />
                                                            <span>Upload</span>
                                                        </>
                                                    )}
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* RIGA 2: IDENTITÀ FISICA */}
                                <div className="edit-grid-3" style={{ marginBottom: '15px' }}>
                                    <div className="input-field">
                                        <label>Nome</label>
                                        <input type="text" value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} />
                                    </div>
                                    <div className="input-field">
                                        <label>Altezza (m)</label>
                                        <div style={{ position: 'relative' }}>
                                            <Ruler size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                                            <input style={{ paddingLeft: '30px' }} type="text" placeholder="Es: 1.7" value={editForm.altezza || ''} onChange={(e) => setEditForm({ ...editForm, altezza: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="input-field">
                                        <label>Peso (kg)</label>
                                        <div style={{ position: 'relative' }}>
                                            <Weight size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                                            <input style={{ paddingLeft: '30px' }} type="text" placeholder="Es: 60" value={editForm.peso || ''} onChange={(e) => setEditForm({ ...editForm, peso: e.target.value })} />
                                        </div>
                                    </div>
                                </div>

                                {/* RIGA 3: ELEMENTI (TIPI) */}
                                <div className="edit-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                    <div className="input-field">
                                        <label>Tipo 1</label>
                                        <div style={{ position: 'relative' }}>
                                            <div style={{ 
                                                position: 'absolute', 
                                                left: '8px', 
                                                top: '50%', 
                                                transform: 'translateY(-50%)', 
                                                width: '24px', 
                                                height: '24px', 
                                                borderRadius: '6px', 
                                                background: getTypeColor(editForm.tipo1),
                                                boxShadow: `0 0 10px ${getTypeColor(editForm.tipo1)}60`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                border: '1px solid rgba(255,255,255,0.2)',
                                                overflow: 'hidden'
                                            }}>
                                                {tipiDisponibili.find(t => t.nome_it.toUpperCase() === editForm.tipo1.toUpperCase())?.icona_url ? (
                                                    <img 
                                                        src={tipiDisponibili.find(t => t.nome_it.toUpperCase() === editForm.tipo1.toUpperCase())?.icona_url} 
                                                        alt={editForm.tipo1}
                                                        style={{ width: '16px', height: '16px', objectFit: 'contain' }}
                                                    />
                                                ) : (
                                                    <div style={{ fontSize: '10px', opacity: 0.5 }}>?</div>
                                                )}
                                            </div>
                                            <select 
                                                style={{ paddingLeft: '40px' }} 
                                                value={editForm.tipo1} 
                                                onChange={(e) => setEditForm({ ...editForm, tipo1: e.target.value })}
                                            >
                                                <option value="NORMALE">NORMALE</option>
                                                <option value="FUOCO">FUOCO</option>
                                                <option value="ACQUA">ACQUA</option>
                                                <option value="ERBA">ERBA</option>
                                                <option value="ELETTRO">ELETTRO</option>
                                                <option value="GHIACCIO">GHIACCIO</option>
                                                <option value="LOTTA">LOTTA</option>
                                                <option value="VELENO">VELENO</option>
                                                <option value="TERRA">TERRA</option>
                                                <option value="VOLANTE">VOLANTE</option>
                                                <option value="PSICO">PSICO</option>
                                                <option value="COLEOTTERO">COLEOTTERO</option>
                                                <option value="ROCCIA">ROCCIA</option>
                                                <option value="SPETTRO">SPETTRO</option>
                                                <option value="DRAGO">DRAGO</option>
                                                <option value="BUIO">BUIO</option>
                                                <option value="ACCIAIO">ACCIAIO</option>
                                                <option value="FOLLETTO">FOLLETTO</option>
                                                <option value="SUONO">SUONO</option>
                                                <option value="SCONOSCIUTO">SCONOSCIUTO</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="input-field">
                                        <label>Tipo 2</label>
                                        <div style={{ position: 'relative' }}>
                                            <div style={{ 
                                                position: 'absolute', 
                                                left: '8px', 
                                                top: '50%', 
                                                transform: 'translateY(-50%)', 
                                                width: '24px', 
                                                height: '24px', 
                                                borderRadius: '6px', 
                                                background: editForm.tipo2 ? getTypeColor(editForm.tipo2) : 'rgba(255,255,255,0.05)',
                                                border: editForm.tipo2 ? '1px solid rgba(255,255,255,0.2)' : '1px dashed rgba(255,255,255,0.2)',
                                                boxShadow: editForm.tipo2 ? `0 0 10px ${getTypeColor(editForm.tipo2)}60` : 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                overflow: 'hidden'
                                            }}>
                                                {editForm.tipo2 && tipiDisponibili.find(t => t.nome_it.toUpperCase() === editForm.tipo2.toUpperCase())?.icona_url ? (
                                                    <img 
                                                        src={tipiDisponibili.find(t => t.nome_it.toUpperCase() === editForm.tipo2.toUpperCase())?.icona_url} 
                                                        alt={editForm.tipo2}
                                                        style={{ width: '16px', height: '16px', objectFit: 'contain' }}
                                                    />
                                                ) : null}
                                            </div>
                                            <select 
                                                style={{ paddingLeft: '40px' }} 
                                                value={editForm.tipo2 || ''} 
                                                onChange={(e) => setEditForm({ ...editForm, tipo2: e.target.value || null })}
                                            >
                                                <option value="">Nessuno</option>
                                                <option value="NORMALE">NORMALE</option>
                                                <option value="FUOCO">FUOCO</option>
                                                <option value="ACQUA">ACQUA</option>
                                                <option value="ERBA">ERBA</option>
                                                <option value="ELETTRO">ELETTRO</option>
                                                <option value="GHIACCIO">GHIACCIO</option>
                                                <option value="LOTTA">LOTTA</option>
                                                <option value="VELENO">VELENO</option>
                                                <option value="TERRA">TERRA</option>
                                                <option value="VOLANTE">VOLANTE</option>
                                                <option value="PSICO">PSICO</option>
                                                <option value="COLEOTTERO">COLEOTTERO</option>
                                                <option value="ROCCIA">ROCCIA</option>
                                                <option value="SPETTRO">SPETTRO</option>
                                                <option value="DRAGO">DRAGO</option>
                                                <option value="BUIO">BUIO</option>
                                                <option value="ACCIAIO">ACCIAIO</option>
                                                <option value="FOLLETTO">FOLLETTO</option>
                                                <option value="SUONO">SUONO</option>
                                                <option value="SCONOSCIUTO">SCONOSCIUTO</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="input-field description-narrative-box" style={{ 
                                    gridColumn: 'span 3', 
                                    marginTop: '30px',
                                    background: 'rgba(255,255,255,0.03)',
                                    padding: '15px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    <label style={{ marginBottom: '10px', fontSize: '0.9rem', opacity: 0.8 }}>Descrizione Pokédex</label>
                                    <textarea 
                                        style={{ 
                                            minHeight: '120px', 
                                            fontSize: '0.95rem', 
                                            lineHeight: '1.5',
                                            background: 'transparent',
                                            border: 'none',
                                            padding: '10px'
                                        }} 
                                        placeholder="Racconta la leggenda di questo Pokémon..."
                                        value={editForm.descrizione || ''} 
                                        onChange={(e) => setEditForm({ ...editForm, descrizione: e.target.value })} 
                                    />
                                </div>
                            </div>

                            <div className="edit-section">
                                <h4 className="edit-section-title"><TrendingUp size={16} /> Statistiche Base</h4>
                                <div className="edit-grid-3">
                                    <div className="input-field">
                                        <label>HP</label>
                                        <input type="number" onWheel={(e) => e.currentTarget.blur()} value={editForm.hp_base} onChange={(e) => setEditForm({ ...editForm, hp_base: parseInt(e.target.value) })} />
                                    </div>
                                    <div className="input-field">
                                        <label>Attacco</label>
                                        <input type="number" onWheel={(e) => e.currentTarget.blur()} value={editForm.atk_base} onChange={(e) => setEditForm({ ...editForm, atk_base: parseInt(e.target.value) })} />
                                    </div>
                                    <div className="input-field">
                                        <label>Difesa</label>
                                        <input type="number" onWheel={(e) => e.currentTarget.blur()} value={editForm.def_base} onChange={(e) => setEditForm({ ...editForm, def_base: parseInt(e.target.value) })} />
                                    </div>
                                    <div className="input-field">
                                        <label>Attacco Sp.</label>
                                        <input type="number" onWheel={(e) => e.currentTarget.blur()} value={editForm.spatk_base} onChange={(e) => setEditForm({ ...editForm, spatk_base: parseInt(e.target.value) })} />
                                    </div>
                                    <div className="input-field">
                                        <label>Difesa Sp.</label>
                                        <input type="number" onWheel={(e) => e.currentTarget.blur()} value={editForm.spdef_base} onChange={(e) => setEditForm({ ...editForm, spdef_base: parseInt(e.target.value) })} />
                                    </div>
                                </div>
                            </div>

                            <div className="edit-section">
                                <h4 className="edit-section-title"><Shield size={16} /> Affinità Tipi & Vulnerabilità</h4>
                                
                                {['debolezze', 'debolezze_x4', 'immunita', 'resistenze', 'resistenze_x4'].map((category) => (
                                    <div key={category} className="affinity-category-group" style={{ marginBottom: '20px' }}>
                                        <label style={{ 
                                            display: 'block', 
                                            marginBottom: '10px', 
                                            fontSize: '0.85rem', 
                                            fontWeight: 'bold',
                                            textTransform: 'uppercase',
                                            color: category.includes('debolezze') ? '#ef4444' : category.includes('resistenze') ? '#3b82f6' : '#10b981'
                                        }}>
                                            {category === 'debolezze' ? 'Debolezze (x2)' : 
                                             category === 'debolezze_x4' ? 'Debolezze (x4)' : 
                                             category === 'resistenze' ? 'Resistenze (x2)' : 
                                             category === 'resistenze_x4' ? 'Resistenze (x4)' : 'Immunità'}
                                        </label>
                                        <div className="type-checkbox-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '8px' }}>
                                            {tipiDisponibili.map(tipo => (
                                                <div 
                                                    key={tipo.id} 
                                                    className={`type-checkbox-card ${isTipoAttivo(category, tipo.nome_it) ? 'active' : ''}`}
                                                    onClick={() => toggleTipoInStringa(category, tipo.nome_it)}
                                                    style={{
                                                        padding: '8px',
                                                        borderRadius: '8px',
                                                        border: '1px solid var(--border-subtle)',
                                                        background: isTipoAttivo(category, tipo.nome_it) ? `${tipo.colore}20` : 'var(--bg-secondary)',
                                                        borderColor: isTipoAttivo(category, tipo.nome_it) ? tipo.colore : 'var(--border-subtle)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        transition: 'all 0.2s',
                                                        fontSize: '0.75rem'
                                                    }}
                                                >
                                                    <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: tipo.colore }}></div>
                                                    <span>{tipo.nome_it}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="modal-footer-centered">
                            <button className="btn-cancel-flat" onClick={() => setIsEditing(false)}>Annulla</button>
                            <div className="btn-group-master">
                                <button className="btn-save-hero" onClick={() => salvaPokemon(false)} disabled={saving}>
                                    {saving ? <Loader2 className="spin" /> : <Save size={18} />} 
                                    {editSource === 'national' ? 'Sovrascrivi Pokédex' : (editForm.id ? 'Sovrascrivi' : 'Aggiungi alla Libreria')}
                                </button>
                                {(editForm.id || editSource === 'national') && (
                                    <button className="btn-save-hero accent" onClick={() => salvaPokemon(true)} disabled={saving}>
                                        {editSource === 'national' ? <Plus size={18} /> : <Plus size={18} />}
                                        {editSource === 'national' ? 'Aggiungi alla Campagna' : 'Aggiungi come Nuovo'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .search-bar-container {
                    position: relative;
                    display: flex;
                    align-items: center;
                    background: var(--bg-card);
                    border: 1px solid var(--border-subtle);
                    border-radius: 12px;
                    padding: 0 15px;
                    margin-bottom: 20px;
                    transition: all 0.3s;
                    gap: 24px;
                }
                .search-bar-container:focus-within {
                    border-color: var(--accent-primary);
                    box-shadow: 0 0 10px var(--accent-glow);
                }
                .search-bar-container input {
                    background: transparent;
                    border: none;
                    color: var(--text-master) !important;
                    padding: 12px 0 12px 25px;
                    font-size: 1rem;
                    width: 100%;
                    outline: none;
                }
                .search-icon {
                    color: var(--text-muted);
                }
                .master-list-table-container {
                    background: var(--bg-card);
                    border-radius: 12px;
                    border: 1px solid var(--border-subtle);
                    overflow: hidden;
                    margin-top: 20px;
                }
                .master-list-table {
                    width: 100%;
                    border-collapse: collapse;
                    color: var(--text-primary);
                }
                 .master-list-table th, .master-list-table td {
                     padding: 15px;
                     text-align: left;
                     border-bottom: 1px solid var(--border-subtle);
                     vertical-align: middle;
                 }
                .master-list-table th {
                    background: var(--bg-secondary);
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    color: var(--text-muted);
                }
                .master-list-img {
                    width: 40px;
                    height: 40px;
                    object-fit: contain;
                }
                .pkmn-types-mini {
                    display: flex;
                    gap: 5px;
                }
                .type-badge-mini {
                    font-size: 0.65rem;
                    padding: 2px 6px;
                    border-radius: 4px;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-subtle);
                    color: var(--text-secondary);
                }
                 .actions-cell {
                     display: flex;
                     gap: 10px;
                     align-items: center;
                 }
                 .actions-cell-column {
                     vertical-align: middle;
                 }
                .btn-icon {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-subtle);
                    color: var(--text-primary);
                    width: 32px;
                    height: 32px;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-icon:hover {
                    background: var(--bg-card-hover);
                    transform: translateY(-2px);
                }
                .btn-icon.del:hover {
                    background: rgba(239, 68, 68, 0.2);
                    border-color: #ef4444;
                    color: #ef4444;
                }
                .pokedex-toggle {
                    width: 40px;
                    height: 20px;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-subtle);
                    border-radius: 20px;
                    position: relative;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                .pokedex-toggle.active {
                    background: var(--accent-primary, #3b82f6);
                }
                .toggle-circle {
                    width: 14px;
                    height: 14px;
                    background: white;
                    border-radius: 50%;
                    position: absolute;
                    top: 2px;
                    left: 2px;
                    transition: all 0.3s;
                }
                .pokedex-toggle.active .toggle-circle {
                    left: 22px;
                }
                .btn-group-master {
                    display: flex;
                    gap: 15px;
                }
                .btn-save-hero.accent {
                    background: #ff00d4;
                }
            `}</style>
        </div>
    );
}
