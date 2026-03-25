import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Edit2, Save, X, Loader2, Check, Info, Trash2, Package, Upload } from 'lucide-react';
import './Party.css';

export default function OggettiMaster() {
    const [oggetti, setOggetti] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [uploading, setUploading] = useState(false);

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
                utilizzabile_in_battaglia: false
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

    const filteredOggetti = oggetti.filter(o =>
        o.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.categoria.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="party-page animate-fade-in">
            <header className="party-header">
                <div>
                    <h1>Magazzino Oggetti</h1>
                    <p>Gestisci gli strumenti e gli oggetti della tua campagna</p>
                </div>
                <button className="btn-save" onClick={() => openEditModal()}>
                    <Plus size={18} /> Nuovo Oggetto
                </button>
            </header>

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
                                        <th>Categoria</th>
                                        <th>In Battaglia</th>
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
                                            <td><span className="type-badge-mini">{o.categoria}</span></td>
                                            <td>{o.utilizzabile_in_battaglia ? <Check size={18} color="#10b981" /> : <X size={18} color="#ef4444" />}</td>
                                            <td className="actions-cell">
                                                <button className="btn-icon" onClick={() => openEditModal(o)}><Edit2 size={16} /></button>
                                                <button className="btn-icon del" onClick={() => eliminaOggetto(o.id)}><Trash2 size={16} /></button>
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
                }
                .master-list-table th {
                    background: var(--bg-secondary);
                    font-size: 0.8rem;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    color: var(--text-muted);
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
                    padding: 2px 8px;
                    border-radius: 4px;
                    background: var(--bg-secondary);
                    color: var(--text-secondary);
                    border: 1px solid var(--border-subtle);
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
            `}</style>
        </div>
    );
}
