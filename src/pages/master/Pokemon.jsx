import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Edit2, Save, X, Loader2, Check, Info, Trash2, Heart, Shield, Zap, TrendingUp, Ruler, Weight } from 'lucide-react';
import './Party.css'; // Reusing Party.css for consistent Master dashboard styling

export default function PokemonMaster() {
    const [pokemon, setPokemon] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Globale / PokeAPI
    const [activeTab, setActiveTab] = useState('local'); // 'local' | 'global'
    const [fullGlobalList, setFullGlobalList] = useState([]);
    const [filteredGlobalList, setFilteredGlobalList] = useState([]);
    const [loadingGlobal, setLoadingGlobal] = useState(false);

    useEffect(() => {
        caricaPokemon();
    }, []);

    async function caricaPokemon() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('pokemon')
                .select('*')
                .order('id', { ascending: true });

            if (error) {
                console.error("Errore caricamento pokemon:", error);
                setPokemon([]);
            } else {
                setPokemon(data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function caricaGlobalLibrary() {
        if (fullGlobalList.length > 0) return;
        setLoadingGlobal(true);
        try {
            const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025');
            const data = await res.json();
            const list = data.results.map((p, idx) => ({
                id: idx + 1,
                name: p.name.toUpperCase(),
                url: p.url
            }));
            setFullGlobalList(list);
            setFilteredGlobalList(list);
        } catch (err) {
            console.error("Errore caricamento PokeAPI:", err);
        } finally {
            setLoadingGlobal(false);
        }
    }

    useEffect(() => {
        if (activeTab === 'global') {
            caricaGlobalLibrary();
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'global') {
            const filtered = fullGlobalList.filter(p => 
                p.name.includes(searchTerm.toUpperCase()) || 
                p.id.toString().includes(searchTerm)
            );
            setFilteredGlobalList(filtered);
        }
    }, [searchTerm, fullGlobalList]);

    const importFromGlobal = async (p) => {
        setLoadingGlobal(true);
        try {
            const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${p.id}`);
            const data = await res.json();
            
            setEditForm({
                nome: data.name.toUpperCase(),
                tipo1: data.types[0]?.type.name.toUpperCase(),
                tipo2: data.types[1]?.type.name.toUpperCase() || null,
                hp_base: data.stats[0].base_stat,
                atk_base: data.stats[1].base_stat,
                def_base: data.stats[2].base_stat,
                spatk_base: data.stats[3].base_stat,
                spdef_base: data.stats[4].base_stat,
                speed_base: data.stats[5].base_stat,
                descrizione: '',
                immagine_url: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${data.id}.png`,
                sprite_url: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${data.id}.png`,
                visibile_pokedex: true
            });
            setIsEditing(true);
        } catch (err) {
            console.error("Errore importazione:", err);
            alert("Errore durante l'importazione dei dati.");
        } finally {
            setLoadingGlobal(false);
        }
    };

    const openEditModal = (p = null) => {
        if (p) {
            setEditForm({ ...p });
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

    async function salvaPokemon(asNew = false) {
        setSaving(true);
        try {
            const payload = { ...editForm };
            if (asNew) delete payload.id;

            let error;
            if (editForm.id && !asNew) {
                const { error: err } = await supabase
                    .from('pokemon')
                    .update(payload)
                    .eq('id', editForm.id);
                error = err;
            } else {
                const { error: err } = await supabase
                    .from('pokemon')
                    .insert([payload]);
                error = err;
            }

            if (error) throw error;
            setIsEditing(false);
            caricaPokemon();
        } catch (err) {
            console.error("Errore salvataggio pokemon:", err);
            alert("Errore nel salvataggio. Assicurati che la tabella 'pokemon' esista in Supabase.");
        } finally {
            setSaving(false);
        }
    }

    async function eliminaPokemon(id) {
        if (!confirm("Sei sicuro di voler eliminare questo Pokemon?")) return;
        try {
            const { error } = await supabase.from('pokemon').delete().eq('id', id);
            if (error) throw error;
            caricaPokemon();
        } catch (err) {
            console.error(err);
        }
    }

    async function togglePokedex(p) {
        try {
            const { error } = await supabase
                .from('pokemon')
                .update({ visibile_pokedex: !p.visibile_pokedex })
                .eq('id', p.id);
            if (error) throw error;
            setPokemon(prev => prev.map(item => item.id === p.id ? { ...item, visibile_pokedex: !item.visibile_pokedex } : item));
        } catch (err) {
            console.error(err);
        }
    }

    const filteredLocal = pokemon.filter(p => 
        p.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (p.id && p.id.toString().includes(searchTerm))
    );

    return (
        <div className="pokemon-master-page animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title"><TrendingUp size={32} /> Enciclopedia Pokémon</h1>
                    <p className="page-subtitle">Gestisci i Pokémon base della tua campagna</p>
                </div>
                <button className="btn-primary" onClick={() => openEditModal()}>
                    <Plus size={18} /> Nuovo Pokémon
                </button>
            </div>

            {/* TAB SELECTOR */}
            <div className="master-tabs">
                <button 
                    className={`master-tab ${activeTab === 'local' ? 'active' : ''}`}
                    onClick={() => setActiveTab('local')}
                >
                    <Heart size={18} /> La mia Campagna ({pokemon.length})
                </button>
                <button 
                    className={`master-tab ${activeTab === 'global' ? 'active' : ''}`}
                    onClick={() => setActiveTab('global')}
                >
                    <Search size={18} /> Libreria Globale (PokeAPI)
                </button>
            </div>

            <div className="search-bar-container">
                <Search className="search-icon" size={20} />
                <input 
                    type="text" 
                    placeholder={activeTab === 'local' ? "Cerca nei tuoi Pokémon..." : "Cerca ID o Nome su PokeAPI..."} 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {activeTab === 'local' ? (
                loading ? (
                    <div className="flex-center p-xl"><Loader2 className="spin" size={32} /></div>
                ) : filteredLocal.length === 0 ? (
                    <div className="empty-state-pokedex">
                        <Info size={48} />
                        <h3>Nessun Pokémon trovato</h3>
                        <p>Aggiungi un nuovo Pokémon o cercane uno nella Libreria Globale.</p>
                    </div>
                ) : (
                    <div className="master-list-table-container">
                        <table className="master-list-table">
                            <thead>
                                <tr>
                                    <th>Sprite</th>
                                    <th>Immagine</th>
                                    <th>ID</th>
                                    <th>Nome</th>
                                    <th>Tipo</th>
                                    <th>Stats</th>
                                    <th>Visibilità</th>
                                    <th>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLocal.map((p) => (
                                    <tr key={p.id}>
                                        <td>
                                            <img src={p.sprite_url} alt={p.nome} className="master-list-sprite" />
                                        </td>
                                        <td>
                                            <img src={p.immagine_url} alt={p.nome} className="master-list-img" />
                                        </td>
                                        <td style={{ opacity: 0.5, fontFamily: 'monospace' }}>#{p.id}</td>
                                        <td style={{ fontWeight: 800 }}>{p.nome}</td>
                                        <td>
                                            <div className="pkmn-types-mini">
                                                <span className="type-badge-mini" style={{ backgroundColor: `var(--type-${p.tipo1.toLowerCase()})` }}>{p.tipo1}</span>
                                                {p.tipo2 && <span className="type-badge-mini" style={{ backgroundColor: `var(--type-${p.tipo2.toLowerCase()})` }}>{p.tipo2}</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                                {p.hp_base}/{p.atk_base}/{p.def_base}/...
                                            </span>
                                        </td>
                                        <td>
                                            <div 
                                                className={`pokedex-toggle ${p.visibile_pokedex ? 'active' : ''}`}
                                                onClick={() => {
                                                    const newStatus = !p.visibile_pokedex;
                                                    supabase.from('pokemon').update({ visibile_pokedex: newStatus }).eq('id', p.id).then(() => caricaPokemon());
                                                }}
                                            >
                                                <div className="toggle-circle"></div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="actions-cell">
                                                <button className="btn-icon" onClick={() => openEditModal(p)}><Edit2 size={16} /></button>
                                                <button className="btn-icon del" onClick={() => eliminaPokemon(p.id)}><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            ) : (
                <div className="global-pokedex-grid animate-fade-in">
                    {loadingGlobal ? (
                        <div className="flex-center p-xl" style={{ gridColumn: '1 / -1' }}>
                            <Loader2 className="spin" size={32} />
                        </div>
                    ) : filteredGlobalList.length === 0 ? (
                        <div className="empty-state-pokedex" style={{ gridColumn: '1 / -1' }}>
                            <Search size={48} />
                            <h3>Nessun risultato</h3>
                            <p>Prova a cercare un altro Pokémon o ID.</p>
                        </div>
                    ) : (
                        filteredGlobalList.slice(0, 100).map(p => (
                            <div key={p.id} className="global-pkmn-card">
                                <span className="global-pkmn-id">#{p.id}</span>
                                <img 
                                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`} 
                                    alt={p.name} 
                                    className="global-pkmn-img"
                                />
                                <div className="global-pkmn-info">
                                    <strong>{p.name}</strong>
                                    <button className="btn-import-mini" onClick={() => importFromGlobal(p)}>
                                        <Plus size={14} /> Importa
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                    {filteredGlobalList.length > 100 && !loadingGlobal && (
                        <p className="limit-hint">Vengono mostrati solo i primi 100 risultati. Usa la ricerca per precisare.</p>
                    )}
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
                                        <input type="text" value={editForm.nome} onChange={(e) => setEditForm({...editForm, nome: e.target.value})} />
                                    </div>
                                    <div className="input-field">
                                        <label>Tipo 1</label>
                                        <select value={editForm.tipo1} onChange={(e) => setEditForm({...editForm, tipo1: e.target.value})}>
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
                                        </select>
                                    </div>
                                    <div className="input-field">
                                        <label>Tipo 2</label>
                                        <select value={editForm.tipo2 || ''} onChange={(e) => setEditForm({...editForm, tipo2: e.target.value || null})}>
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
                                        </select>
                                    </div>
                                    <div className="input-field" style={{ gridColumn: 'span 3' }}>
                                        <label>Immagine URL (Vuoto per auto-generata da ID)</label>
                                        <input type="text" value={editForm.immagine_url || ''} onChange={(e) => setEditForm({...editForm, immagine_url: e.target.value})} />
                                    </div>
                                    <div className="input-field" style={{ gridColumn: 'span 3' }}>
                                        <label>Descrizione Pokédex</label>
                                        <textarea value={editForm.descrizione || ''} onChange={(e) => setEditForm({...editForm, descrizione: e.target.value})} />
                                    </div>
                                </div>
                            </div>

                            <div className="edit-section">
                                <h4 className="edit-section-title"><TrendingUp size={16} /> Statistiche Base</h4>
                                <div className="edit-grid-3">
                                    <div className="input-field">
                                        <label>HP</label>
                                        <input type="number" value={editForm.hp_base} onChange={(e) => setEditForm({...editForm, hp_base: parseInt(e.target.value)})} />
                                    </div>
                                    <div className="input-field">
                                        <label>Attacco</label>
                                        <input type="number" value={editForm.atk_base} onChange={(e) => setEditForm({...editForm, atk_base: parseInt(e.target.value)})} />
                                    </div>
                                    <div className="input-field">
                                        <label>Difesa</label>
                                        <input type="number" value={editForm.def_base} onChange={(e) => setEditForm({...editForm, def_base: parseInt(e.target.value)})} />
                                    </div>
                                    <div className="input-field">
                                        <label>Attacco Sp.</label>
                                        <input type="number" value={editForm.spatk_base} onChange={(e) => setEditForm({...editForm, spatk_base: parseInt(e.target.value)})} />
                                    </div>
                                    <div className="input-field">
                                        <label>Difesa Sp.</label>
                                        <input type="number" value={editForm.spdef_base} onChange={(e) => setEditForm({...editForm, spdef_base: parseInt(e.target.value)})} />
                                    </div>
                                    <div className="input-field">
                                        <label>Velocità</label>
                                        <input type="number" value={editForm.speed_base} onChange={(e) => setEditForm({...editForm, speed_base: parseInt(e.target.value)})} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer-centered">
                            <button className="btn-cancel-flat" onClick={() => setIsEditing(false)}>Annulla</button>
                            <div className="btn-group-master">
                                <button className="btn-save-hero" onClick={() => salvaPokemon(false)} disabled={saving}>
                                    {saving ? <Loader2 className="spin" /> : <Save size={18} />} {editForm.id ? 'Sovrascrivi' : 'Crea'}
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
                .master-list-sprite {
                    width: 48px;
                    height: 48px;
                    image-rendering: pixelated;
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
                .master-tabs {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 20px;
                }
                .master-tab {
                    padding: 10px 20px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-subtle);
                    border-radius: 12px;
                    color: var(--text-secondary);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-weight: 600;
                }
                .master-tab.active {
                    background: var(--bg-secondary);
                    border-color: var(--accent-primary);
                    color: var(--text-primary);
                    box-shadow: 0 0 15px var(--accent-glow);
                }
                .global-pokedex-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
                    gap: 15px;
                    margin-top: 20px;
                }
                .global-pkmn-card {
                    background: var(--bg-card);
                    border: 1px solid var(--border-subtle);
                    border-radius: 16px;
                    padding: 15px;
                    text-align: center;
                    position: relative;
                    transition: all 0.2s;
                }
                .global-pkmn-card:hover {
                    transform: translateY(-5px);
                    border-color: var(--accent-primary);
                }
                .global-pkmn-id {
                    position: absolute;
                    top: 8px;
                    right: 10px;
                    font-size: 0.7rem;
                    font-family: monospace;
                    opacity: 0.5;
                }
                .global-pkmn-img {
                    width: 70px;
                    height: 70px;
                    object-fit: contain;
                    margin: 0 auto 10px;
                }
                .global-pkmn-info {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .global-pkmn-info strong {
                    font-size: 0.8rem;
                    text-transform: uppercase;
                }
                .btn-import-mini {
                    background: var(--accent-primary);
                    color: white;
                    border: none;
                    border-radius: 6px;
                    padding: 4px 8px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 4px;
                    cursor: pointer;
                }
                .empty-state-pokedex {
                    text-align: center;
                    padding: 50px;
                    color: var(--text-muted);
                }
                .limit-hint {
                    grid-column: 1 / -1;
                    text-align: center;
                    font-size: 0.8rem;
                    color: var(--text-muted);
                    margin-top: 20px;
                }
            `}</style>
        </div>
    );
}
