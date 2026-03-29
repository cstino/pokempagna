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
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

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
        await Promise.all([caricaPokemonNational(), caricaPokemonCampaign()]);
        setLoading(false);
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
            // 🛡️ Logica di calcolo ID ultra-sicura
            let idToUse = editForm.id;
            
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
                visibile_pokedex: Boolean(editForm.visibile_pokedex === false ? false : true)
            };

            // 🛡️ Upsert millimetrico: se l'ID esiste aggiorna, altrimenti inserisce
            const { error: upsertError } = await supabase
                .from('pokemon_campagna')
                .upsert(payload, { onConflict: 'id' });
                
            if (upsertError) throw upsertError;
            
            setIsEditing(false);
            caricaPokemonCampaign();
            setActiveTab('campaign');
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
            immagine_url: p.immagine_url,
            sprite_url: p.sprite_url,
            descrizione: p.descrizione,
            visibile_pokedex: true
        });
        setIsEditing(true);
    }

    const openEditModal = (p = null) => {
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
                visibile_pokedex: true
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
                                            <img src={p.immagine_url} alt={p.nome} className="master-list-img" />
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
                                                    <button className="btn-icon accent" title="Importa in Campagna" onClick={() => importaInCampagna(p)}>
                                                        <Plus size={16} />
                                                    </button>
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
                                <div className="edit-grid-3">
                                    <div className="input-field">
                                        <label>Nome</label>
                                        <input type="text" value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} />
                                    </div>
                                    <div className="input-field">
                                        <label>Tipo 1</label>
                                        <select value={editForm.tipo1} onChange={(e) => setEditForm({ ...editForm, tipo1: e.target.value })}>
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
                                    <div className="input-field">
                                        <label>Tipo 2</label>
                                        <select value={editForm.tipo2 || ''} onChange={(e) => setEditForm({ ...editForm, tipo2: e.target.value || null })}>
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
                                    <div className="input-field" style={{ gridColumn: 'span 3' }}>
                                        <label>Immagine Pokémon</label>
                                        <div className="master-upload-container">
                                            {editForm.immagine_url ? (
                                                <div className="master-upload-preview-box">
                                                    <img src={editForm.immagine_url} alt="Anteprima" className="master-upload-preview" />
                                                    <button className="btn-remove-upload" onClick={() => setEditForm({ ...editForm, immagine_url: '' })}>
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="master-upload-placeholder">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        style={{ display: 'none' }}
                                                        onChange={handleFileUpload}
                                                        disabled={uploading}
                                                    />
                                                    {uploading ? (
                                                        <Loader2 className="spin" size={24} />
                                                    ) : (
                                                        <>
                                                            <Upload size={24} />
                                                            <span>Seleziona Immagine dal Tuo PC</span>
                                                        </>
                                                    )}
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                    <div className="input-field" style={{ gridColumn: 'span 3' }}>
                                        <label>Descrizione Pokédex</label>
                                        <textarea value={editForm.descrizione || ''} onChange={(e) => setEditForm({ ...editForm, descrizione: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <div className="edit-section">
                                <h4 className="edit-section-title"><TrendingUp size={16} /> Statistiche Base</h4>
                                <div className="edit-grid-3">
                                    <div className="input-field">
                                        <label>HP</label>
                                        <input type="number" value={editForm.hp_base} onChange={(e) => setEditForm({ ...editForm, hp_base: parseInt(e.target.value) })} />
                                    </div>
                                    <div className="input-field">
                                        <label>Attacco</label>
                                        <input type="number" value={editForm.atk_base} onChange={(e) => setEditForm({ ...editForm, atk_base: parseInt(e.target.value) })} />
                                    </div>
                                    <div className="input-field">
                                        <label>Difesa</label>
                                        <input type="number" value={editForm.def_base} onChange={(e) => setEditForm({ ...editForm, def_base: parseInt(e.target.value) })} />
                                    </div>
                                    <div className="input-field">
                                        <label>Attacco Sp.</label>
                                        <input type="number" value={editForm.spatk_base} onChange={(e) => setEditForm({ ...editForm, spatk_base: parseInt(e.target.value) })} />
                                    </div>
                                    <div className="input-field">
                                        <label>Difesa Sp.</label>
                                        <input type="number" value={editForm.spdef_base} onChange={(e) => setEditForm({ ...editForm, spdef_base: parseInt(e.target.value) })} />
                                    </div>
                                    <div className="input-field">
                                        <label>Velocità</label>
                                        <input type="number" value={editForm.speed_base} onChange={(e) => setEditForm({ ...editForm, speed_base: parseInt(e.target.value) })} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer-centered">
                            <button className="btn-cancel-flat" onClick={() => setIsEditing(false)}>Annulla</button>
                            <div className="btn-group-master">
                                <button className="btn-save-hero" onClick={() => salvaPokemon(false)} disabled={saving}>
                                    {saving ? <Loader2 className="spin" /> : <Save size={18} />} {editForm.id ? 'Sovrascrivi' : 'Aggiungi alla Libreria Campagna'}
                                </button>
                                {editForm.id && (
                                    <button className="btn-save-hero accent" onClick={() => salvaPokemon(true)} disabled={saving}>
                                        <Plus size={18} /> Aggiungi come Nuovo
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
