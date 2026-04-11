import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Edit2, Save, X, Loader2, Check, Info, Trash2, Package, Upload, Zap } from 'lucide-react';
import './Party.css';

const CATEGORIZED_SPRITES = {
    'BALL': [
        'poke-ball', 'great-ball', 'ultra-ball', 'master-ball', 'premier-ball', 'heal-ball', 'net-ball', 'nest-ball', 'dive-ball', 'luxury-ball', 'quick-ball', 'dusk-ball', 'timer-ball', 'repeat-ball', 'cherish-ball', 'love-ball', 'friend-ball', 'moon-ball', 'level-ball', 'lure-ball', 'heavy-ball', 'fast-ball', 'sport-ball', 'safari-ball', 'beast-ball', 'dream-ball'
    ],
    'MEDICINA': [
        'potion', 'super-potion', 'hyper-potion', 'max-potion', 'full-restore', 'revive', 'max-revive', 'antidote', 'paralyze-heal', 'burn-heal', 'ice-heal', 'awakening', 'full-heal', 'ether', 'max-ether', 'elixir', 'max-elixir', 'berry-juice', 'sacred-ash', 'hp-up', 'protein', 'iron', 'calcium', 'zinc', 'carbos', 'rare-candy', 'pp-up', 'pp-max'
    ],
    'PIETRE': [
        'fire-stone', 'water-stone', 'thunder-stone', 'leaf-stone', 'moon-stone', 'sun-stone', 'shiny-stone', 'dusk-stone', 'dawn-stone', 'ice-stone', 'oval-stone', 'everstone'
    ],
    'EVO': [
        'kings-rock', 'metal-coat', 'up-grade', 'protector', 'electirizer', 'magmarizer', 'dubious-disc', 'reaper-cloth', 'prism-scale', 'sachet', 'whipped-dream', 'razor-claw', 'razor-fang', 'sweet-apple', 'tart-apple', 'cracked-pot', 'chipped-pot', 'galarica-cuff', 'galarica-wreath', 'black-augurite', 'peat-block'
    ],
    'VARIE': [
        'leftovers', 'life-orb', 'rocky-helmet', 'eviolite', 'focus-sash', 'expert-belt', 'choice-band', 'choice-specs', 'choice-scarf', 'assault-vest', 'soothe-bell', 'amulet-coin', 'exp-share', 'destiny-knot', 'power-weight', 'power-bracer', 'power-belt', 'power-lens', 'power-band', 'power-anklet'
    ]
};

export default function OggettiMaster() {
    const [oggetti, setOggetti] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [uploading, setUploading] = useState(false);
    const [spriteSearch, setSpriteSearch] = useState('');
    const [selectedSpriteCategory, setSelectedSpriteCategory] = useState('BALL');

    const BUCKET_NAME = 'oggetti_immagini';

    useEffect(() => {
        caricaOggetti();
    }, []);

    async function caricaOggetti() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('oggetti')
                .select('*')
                .order('nome', { ascending: true });

            if (error) {
                console.error("Errore caricamento oggetti:", error);
                setOggetti([]);
            } else {
                setOggetti(data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const openEditModal = (o = null) => {
        if (o) {
            setEditForm({ ...o });
        } else {
            setEditForm({
                nome: '',
                descrizione: '',
                categoria: 'STRUMENTO',
                immagine_url: '',
                utilizzabile_in_battaglia: false,
                attribuibile_pokemon: false,
                durata: 'ISTANTANEO',
                effetti: [],
                vincoli_tipo: []
            });
        }
        setIsEditing(true);
    };

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
                // Se il bucket non esiste, lo segnaliamo amichevolmente
                if (uploadError.message.includes('bucket not found')) {
                    throw new Error("Il bucket 'oggetti_immagini' non esiste su Supabase. Crealo nella sezione Storage.");
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

    async function salvaOggetto(asNew = false) {
        setSaving(true);
        try {
            const payload = { ...editForm };
            if (asNew) delete payload.id;

            let error;
            if (editForm.id && !asNew) {
                const { error: err } = await supabase
                    .from('oggetti')
                    .update(payload)
                    .eq('id', editForm.id);
                error = err;
            } else {
                const { error: err } = await supabase
                    .from('oggetti')
                    .insert([payload]);
                error = err;
            }

            if (error) throw error;
            setIsEditing(false);
            caricaOggetti();
        } catch (err) {
            console.error("Errore salvataggio oggetto:", err);
            alert("Errore nel salvataggio. Assicurati che la tabella 'oggetti' esista in Supabase.");
        } finally {
            setSaving(false);
        }
    }

    async function eliminaOggetto(id) {
        if (!confirm("Sei sicuro di voler eliminare questo oggetto?")) return;
        try {
            const { error } = await supabase.from('oggetti').delete().eq('id', id);
            if (error) throw error;
            caricaOggetti();
        } catch (err) {
            console.error(err);
        }
    }

    const getCategoryStyle = (cat) => {
        const c = cat?.toUpperCase() || 'STRUMENTO';
        const colors = {
            'STRUMENTO': { bg: '#3b82f6', text: '#fff' },
            'POKÉBALL': { bg: '#ef4444', text: '#fff' },
            'CURATIVO': { bg: '#ec4899', text: '#fff' },
            'CURA': { bg: '#ec4899', text: '#fff' },
            'CHIAVE': { bg: '#f59e0b', text: '#fff' },
            'MT/MO': { bg: '#8b5cf6', text: '#fff' },
            'EVOLUTIVO': { bg: '#10b981', text: '#fff' }
        };
        return colors[c] || { bg: '#64748b', text: '#fff' };
    };

    const filteredOggetti = oggetti.filter(o =>
        o.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.categoria.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="party-page animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <Package size={32} color="#f59e0b" />
                        Magazzino Oggetti
                    </h1>
                    <p className="page-subtitle">Gestisci gli strumenti e gli oggetti della tua campagna</p>
                </div>
                <button className="btn-save" onClick={() => openEditModal()}>
                    <Plus size={18} /> Nuovo Oggetto
                </button>
            </div>

            <div className="search-bar-container-master" style={{ margin: '20px 0' }}>
                <Search className="search-icon" size={20} />
                <input
                    type="text"
                    placeholder="Cerca per nome o categoria..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="master-search-input"
                />
            </div>

            {loading ? (
                <div className="flex-center p-xl"><Loader2 className="spin" size={40} /></div>
            ) : (
                <div className="oggetti-master-content">
                    {filteredOggetti.length === 0 ? (
                        <div className="empty-state">
                            <Package size={48} color="rgba(255,255,255,0.2)" />
                            <h3>Nessun oggetto trovato</h3>
                            <p>Aggiungi un nuovo oggetto al magazzino!</p>
                        </div>
                    ) : (
                        <div className="master-list-table-container">
                            <table className="master-list-table">
                                <thead>
                                    <tr>
                                        <th>Immagine</th>
                                        <th>Nome</th>
                                        <th>Descrizione</th>
                                        <th>Categoria</th>
                                        <th>In Battaglia</th>
                                        <th>Assegnabile</th>
                                        <th>Azioni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOggetti.map(o => (
                                        <tr key={o.id}>
                                            <td>
                                                <div className="master-item-icon-box">
                                                    {o.immagine_url ? <img src={o.immagine_url} alt={o.nome} className="master-list-img" /> : <Package size={20} />}
                                                </div>
                                            </td>
                                            <td><strong>{o.nome}</strong></td>
                                            <td className="desc-cell"><em>{o.descrizione || 'Nessuna descrizione'}</em></td>
                                            <td>
                                                <span 
                                                    className="type-badge-mini" 
                                                    style={{ 
                                                        backgroundColor: getCategoryStyle(o.categoria).bg,
                                                        color: getCategoryStyle(o.categoria).text,
                                                        border: 'none',
                                                        fontWeight: 'bold',
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                                    }}
                                                >
                                                    {o.categoria}
                                                </span>
                                            </td>
                                            <td>{o.utilizzabile_in_battaglia ? <Check size={18} color="#10b981" /> : <X size={18} color="#ef4444" />}</td>
                                            <td>{o.attribuibile_pokemon ? <Check size={18} color="#8b5cf6" /> : <X size={18} color="#64748b" />}</td>
                                            <td className="actions-cell-column">
                                                <div className="actions-cell">
                                                    <button className="btn-icon" onClick={() => openEditModal(o)}><Edit2 size={16} /></button>
                                                    <button className="btn-icon del" onClick={() => eliminaOggetto(o.id)}><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {isEditing && editForm && (
                <div className="modal-overlay">
                    <div className="master-edit-modal npc-modal-premium animate-slide-up">
                        <div className="modal-header">
                            <h3>{editForm.id ? 'Modifica Oggetto' : 'Crea Nuovo Oggetto'}</h3>
                            <button className="modal-close" onClick={() => setIsEditing(false)}><X size={24} /></button>
                        </div>

                        <div className="modal-body-scroll">
                            <div className="edit-section">
                                <h4 className="edit-section-title"><Info size={16} /> Dettagli Oggetto</h4>
                                <div className="edit-grid-2">
                                    <div className="input-field">
                                        <label>Nome</label>
                                        <input type="text" value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} />
                                    </div>
                                    <div className="input-field">
                                        <label>Categoria</label>
                                        <select value={editForm.categoria} onChange={(e) => setEditForm({ ...editForm, categoria: e.target.value })}>
                                            <option value="STRUMENTO">STRUMENTO</option>
                                            <option value="POKÉBALL">POKÉBALL</option>
                                            <option value="CURATIVO">CURATIVO</option>
                                            <option value="CHIAVE">CHIAVE</option>
                                            <option value="MT/MO">MT/MO</option>
                                        </select>
                                    </div>

                                    {/* 🎨 LIBRERIA SPRITE UFFICIALE */}
                                    {!editForm.immagine_url && (
                                        <div className="input-field" style={{ gridColumn: 'span 2' }}>
                                            <label>Scegli da Libreria Ufficiale</label>
                                            <div className="sprite-library-container">
                                                <div className="sprite-library-header">
                                                    <div className="sprite-category-tabs">
                                                        {['BALL', 'MEDICINA', 'PIETRE', 'EVO', 'VARIE'].map(cat => (
                                                            <button 
                                                                key={cat}
                                                                className={`sprite-tab ${selectedSpriteCategory === cat ? 'active' : ''}`}
                                                                onClick={() => { setSelectedSpriteCategory(cat); setSpriteSearch(''); }}
                                                            >
                                                                {cat}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <div className="sprite-search-mini">
                                                        <Search size={14} />
                                                        <input 
                                                            type="text" 
                                                            placeholder="Cerca sprite..." 
                                                            value={spriteSearch}
                                                            onChange={(e) => setSpriteSearch(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="sprite-grid-box">
                                                    {(spriteSearch.length > 0 ? 
                                                        [spriteSearch.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')] : 
                                                        CATEGORIZED_SPRITES[selectedSpriteCategory] || []
                                                    ).map(sprite => (
                                                        <div 
                                                            key={sprite} 
                                                            className="sprite-item-card"
                                                            onClick={() => setEditForm({ ...editForm, immagine_url: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${sprite}.png` })}
                                                        >
                                                            <div className="sprite-preview-inner">
                                                                <img 
                                                                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${sprite}.png`} 
                                                                    alt={sprite} 
                                                                    onError={(e) => {
                                                                        e.target.style.display = 'none';
                                                                        e.target.nextSibling.style.display = 'flex';
                                                                    }}
                                                                />
                                                                <div className="sprite-placeholder-fallback" style={{ display: 'none' }}>
                                                                    <Package size={16} />
                                                                </div>
                                                            </div>
                                                            <span className="sprite-name-tooltip">{sprite.replace(/-/g, ' ')}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                                <p className="sprite-hint">Clicca su un'icona per selezionarla. Nome in inglese (es. 'thunder-stone')</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="input-field" style={{ gridColumn: 'span 2' }}>
                                        <label>Immagine Oggetto</label>
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
                                                            <span>Carica Immagine</span>
                                                        </>
                                                    )}
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                    <div className="input-field" style={{ gridColumn: 'span 2' }}>
                                        <label>Descrizione</label>
                                        <textarea value={editForm.descrizione || ''} onChange={(e) => setEditForm({ ...editForm, descrizione: e.target.value })} />
                                    </div>
                                    <div className="checkbox-field">
                                        <input
                                            type="checkbox"
                                            id="battaglia-check"
                                            checked={editForm.utilizzabile_in_battaglia}
                                            onChange={(e) => setEditForm({ ...editForm, utilizzabile_in_battaglia: e.target.checked })}
                                        />
                                        <label htmlFor="battaglia-check">Utilizzabile in Battaglia</label>
                                    </div>
                                    <div className="checkbox-field">
                                        <input
                                            type="checkbox"
                                            id="holdable-check"
                                            checked={editForm.attribuibile_pokemon || false}
                                            onChange={(e) => setEditForm({ ...editForm, attribuibile_pokemon: e.target.checked })}
                                        />
                                        <label htmlFor="holdable-check">Assegnabile ai Pokémon</label>
                                    </div>
                                </div>
                            </div>

                            {/* 🚀 SPECIFICHE AVANZATE */}
                            <div className="edit-section animate-slide-up" style={{ animationDelay: '0.1s' }}>
                                <h4 className="edit-section-title"><Zap size={16} /> Specifiche Avanzate</h4>
                                <div className="edit-grid-1">
                                    <div className="input-field">
                                        <label>Durata dell'Effetto</label>
                                        <select 
                                            value={editForm.durata || 'ISTANTANEO'} 
                                            onChange={(e) => setEditForm({ ...editForm, durata: e.target.value })}
                                        >
                                            <option value="ISTANTANEO">Istantaneo (Cura, Consumabile)</option>
                                            <option value="ROUND">Durata in Round (Es: 5 Turni)</option>
                                            <option value="FINE_BATTAGLIA">Fino a Fine Battaglia</option>
                                            <option value="EQUIPAGGIATO">Fino a quando Equipaggiato</option>
                                        </select>
                                    </div>

                                    <div className="input-field">
                                        <label>Bonus/Malus Statistiche</label>
                                        <div className="effects-manager">
                                            {(editForm.effetti || []).map((eff, idx) => (
                                                <div key={idx} className="effect-row">
                                                    <select 
                                                        value={eff.stat} 
                                                        onChange={(e) => {
                                                            const newEff = [...editForm.effetti];
                                                            newEff[idx].stat = e.target.value;
                                                            setEditForm({ ...editForm, effetti: newEff });
                                                        }}
                                                    >
                                                        <option value="hp">HP</option>
                                                        <option value="attacco">Attacco</option>
                                                        <option value="difesa">Difesa</option>
                                                        <option value="attacco_speciale">Atk Sp.</option>
                                                        <option value="difesa_speciale">Def Sp.</option>
                                                        <option value="velocita">Velocità</option>
                                                        <option value="precisione">Precisione</option>
                                                        <option value="evasione">Evasione</option>
                                                    </select>
                                                    <div className="val-input-group">
                                                        <input 
                                                            type="number" 
                                                            value={eff.val} 
                                                            placeholder="Valore (es: +2 o -1)"
                                                            onChange={(e) => {
                                                                const newEff = [...editForm.effetti];
                                                                newEff[idx].val = parseInt(e.target.value) || 0;
                                                                setEditForm({ ...editForm, effetti: newEff });
                                                            }}
                                                        />
                                                    </div>
                                                    <button 
                                                        className="btn-del-mini" 
                                                        onClick={() => setEditForm({ ...editForm, effetti: editForm.effetti.filter((_, i) => i !== idx) })}
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ))}
                                            <button 
                                                className="btn-add-effect"
                                                onClick={() => setEditForm({ ...editForm, effetti: [...(editForm.effetti || []), { stat: 'attacco', val: 0 }] })}
                                            >
                                                <Plus size={14} /> Aggiungi Boost/Malus
                                            </button>
                                        </div>
                                    </div>

                                    <div className="input-field">
                                        <label>Vincoli di Tipo (Solo per...)</label>
                                        <div className="type-constraint-grid">
                                            {['normale', 'fuoco', 'acqua', 'erba', 'elettro', 'ghiaccio', 'lotta', 'veleno', 'terra', 'volante', 'psico', 'coleottero', 'roccia', 'spettro', 'drago', 'buio', 'acciaio', 'folletto'].map(t => (
                                                <button 
                                                    key={t}
                                                    className={`type-btn-mini ${editForm.vincoli_tipo?.includes(t) ? 'active' : ''}`}
                                                    onClick={() => {
                                                        const current = editForm.vincoli_tipo || [];
                                                        const newTypes = current.includes(t) 
                                                            ? current.filter(x => x !== t) 
                                                            : [...current, t];
                                                        setEditForm({ ...editForm, vincoli_tipo: newTypes });
                                                    }}
                                                >
                                                    {t}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="hint-text">Seleziona i tipi che possono usare questo oggetto. Se vuoto, è per tutti.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer-centered">
                            <button className="btn-cancel-flat" onClick={() => setIsEditing(false)}>Annulla</button>
                            <div className="btn-group-master">
                                <button className="btn-save-hero" onClick={() => salvaOggetto(false)} disabled={saving}>
                                    {saving ? <Loader2 className="spin" /> : <Save size={18} />} {editForm.id ? 'Sovrascrivi' : 'Crea'}
                                </button>
                                {editForm.id && (
                                    <button className="btn-save-hero accent" onClick={() => salvaOggetto(true)} disabled={saving}>
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
                    vertical-align: middle;
                }
                .master-list-table th {
                    background: var(--bg-secondary);
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    color: var(--text-muted);
                    vertical-align: middle;
                }
                .master-list-img {
                    width: 32px;
                    height: 32px;
                    object-fit: contain;
                }
                .master-item-icon-box {
                    width: 40px;
                    height: 40px;
                    background: var(--bg-secondary);
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid var(--border-subtle);
                }
                .type-badge-mini {
                    font-size: 0.65rem;
                    padding: 4px 10px;
                    border-radius: 20px;
                    display: inline-block;
                    line-height: 1;
                    text-align: center;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .actions-cell {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                    justify-content: flex-start;
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
                .desc-cell {
                    font-size: 0.85rem;
                    color: var(--text-muted);
                    max-width: 300px;
                    white-space: normal;
                    line-height: 1.4;
                }
                .btn-group-master {
                    display: flex;
                    gap: 15px;
                }
                .btn-save-hero.accent {
                    background: #ff00d4;
                }
                .checkbox-field {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-top: 10px;
                }
                .checkbox-field input {
                    width: 18px;
                    height: 18px;
                }
                .master-upload-container {
                    margin-top: 8px;
                    width: 100%;
                }
                .master-upload-preview-box {
                    position: relative;
                    width: 100px;
                    height: 100px;
                    background: var(--bg-secondary);
                    border-radius: 12px;
                    border: 2px dashed var(--border-subtle);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                }
                .master-upload-preview {
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }
                .btn-remove-upload {
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    background: rgba(239, 68, 68, 0.8);
                    border: none;
                    color: white;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: 0.2s;
                }
                .btn-remove-upload:hover {
                    background: #ef4444;
                    transform: scale(1.1);
                }
                .master-upload-placeholder {
                    width: 100%;
                    height: 100px;
                    background: var(--bg-secondary);
                    border: 2px dashed var(--border-subtle);
                    border-radius: 12px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    color: var(--text-muted);
                }
                .master-upload-placeholder:hover {
                    border-color: var(--accent-primary);
                    color: var(--accent-primary);
                    background: rgba(255, 255, 255, 0.02);
                }
                .input-field textarea {
                    width: 100%;
                    min-height: 100px;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-subtle);
                    border-radius: 8px;
                    padding: 10px;
                    color: var(--text-primary);
                    font-family: inherit;
                    resize: vertical;
                    transition: all 0.2s;
                    margin-top: 8px;
                }
                .input-field textarea:focus {
                    outline: none;
                    border-color: var(--accent-primary);
                    box-shadow: 0 0 0 2px rgba(167, 139, 250, 0.2);
                }

                /* 🟢 SPRITE LIBRARY STYLES */
                .sprite-library-container {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-subtle);
                    border-radius: 12px;
                    padding: 12px;
                    margin-top: 8px;
                }
                .sprite-library-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                    gap: 10px;
                    flex-wrap: wrap;
                }
                .sprite-category-tabs {
                    display: flex;
                    gap: 4px;
                }
                .sprite-tab {
                    padding: 4px 8px;
                    font-size: 0.65rem;
                    font-weight: bold;
                    border-radius: 6px;
                    border: 1px solid var(--border-subtle);
                    background: transparent;
                    color: var(--text-muted);
                    cursor: pointer;
                    transition: 0.2s;
                    text-transform: uppercase;
                }
                .sprite-tab.active {
                    background: var(--accent-primary);
                    color: white;
                    border-color: var(--accent-primary);
                }
                .sprite-search-mini {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 10px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-subtle);
                    border-radius: 20px;
                    flex-grow: 1;
                    max-width: 200px;
                }
                .sprite-search-mini input {
                    background: transparent;
                    border: none;
                    color: var(--text-primary);
                    font-size: 0.75rem;
                    width: 100%;
                    outline: none;
                }
                .sprite-grid-box {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(45px, 1fr));
                    gap: 8px;
                    max-height: 180px;
                    overflow-y: auto;
                    padding: 5px;
                    background: var(--bg-card);
                    border-radius: 8px;
                    border: 1px solid rgba(0,0,0,0.05);
                }
                .sprite-item-card {
                    width: 45px;
                    height: 45px;
                    background: var(--bg-secondary);
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: 1px solid transparent;
                    position: relative;
                }
                .sprite-item-card:hover {
                    background: var(--bg-card-hover);
                    border-color: var(--accent-primary);
                    transform: scale(1.1);
                    z-index: 2;
                }
                .sprite-item-card img {
                    width: 32px;
                    height: 32px;
                    object-fit: contain;
                }
                .sprite-preview-inner {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .sprite-placeholder-fallback {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-muted);
                    opacity: 0.5;
                }
                .sprite-name-tooltip {
                    position: absolute;
                    bottom: -20px;
                    background: #1e293b;
                    color: white;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-size: 0.6rem;
                    white-space: nowrap;
                    opacity: 0;
                    pointer-events: none;
                    transition: 0.2s;
                }
                .sprite-item-card:hover .sprite-name-tooltip {
                    opacity: 1;
                    bottom: -10px;
                }
                .sprite-hint {
                    margin-top: 8px;
                    font-size: 0.7rem;
                    color: var(--text-muted);
                    font-style: italic;
                }

                /* 🚀 ADVANCED SPECS STYLES */
                .effects-manager {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    margin-top: 8px;
                }
                .effect-row {
                    display: flex;
                    gap: 8px;
                    align-items: center;
                    background: var(--bg-card);
                    padding: 8px;
                    border-radius: 8px;
                    border: 1px solid var(--border-subtle);
                }
                .effect-row select {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-subtle);
                    color: white;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 0.8rem;
                }
                .val-input-group {
                    flex: 1;
                }
                .val-input-group input {
                    width: 100%;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-subtle);
                    color: white;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 0.8rem;
                }
                .btn-del-mini {
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    width: 28px;
                    height: 28px;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                }
                .btn-add-effect {
                    background: rgba(139, 92, 246, 0.1);
                    color: var(--accent-primary);
                    border: 1px dashed var(--accent-primary);
                    padding: 8px;
                    border-radius: 8px;
                    font-size: 0.8rem;
                    font-weight: bold;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: all 0.2s;
                }
                .btn-add-effect:hover {
                    background: rgba(139, 92, 246, 0.2);
                }
                .type-constraint-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
                    gap: 6px;
                    margin-top: 8px;
                }
                .type-btn-mini {
                    padding: 6px;
                    font-size: 0.6rem;
                    text-transform: uppercase;
                    font-weight: bold;
                    border-radius: 6px;
                    border: 1px solid var(--border-subtle);
                    background: var(--bg-card);
                    color: var(--text-muted);
                    cursor: pointer;
                    transition: 0.2s;
                }
                .type-btn-mini.active {
                    background: var(--accent-primary);
                    color: white;
                    border-color: var(--accent-primary);
                    box-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
                }
                .hint-text {
                    font-size: 0.7rem;
                    color: var(--text-muted);
                    margin-top: 6px;
                    font-style: italic;
                }
                .edit-grid-1 {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 20px;
                }
            `}</style>
        </div>
    );
}
