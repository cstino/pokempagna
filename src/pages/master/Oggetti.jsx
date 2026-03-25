import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Edit2, Save, X, Loader2, Check, Info, Trash2, Package } from 'lucide-react';
import './Party.css';

export default function OggettiMaster() {
    const [oggetti, setOggetti] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

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
                                        <input type="text" value={editForm.nome} onChange={(e) => setEditForm({...editForm, nome: e.target.value})} />
                                    </div>
                                    <div className="input-field">
                                        <label>Categoria</label>
                                        <select value={editForm.categoria} onChange={(e) => setEditForm({...editForm, categoria: e.target.value})}>
                                            <option value="STRUMENTO">STRUMENTO</option>
                                            <option value="POKÉBALL">POKÉBALL</option>
                                            <option value="CURATIVO">CURATIVO</option>
                                            <option value="CHIAVE">CHIAVE</option>
                                            <option value="MT/MO">MT/MO</option>
                                        </select>
                                    </div>
                                    <div className="input-field" style={{ gridColumn: 'span 2' }}>
                                        <label>Immagine URL</label>
                                        <input type="text" value={editForm.immagine_url || ''} onChange={(e) => setEditForm({...editForm, immagine_url: e.target.value})} />
                                    </div>
                                    <div className="input-field" style={{ gridColumn: 'span 2' }}>
                                        <label>Descrizione</label>
                                        <textarea value={editForm.descrizione || ''} onChange={(e) => setEditForm({...editForm, descrizione: e.target.value})} />
                                    </div>
                                    <div className="checkbox-field">
                                        <input 
                                            type="checkbox" 
                                            id="battaglia-check"
                                            checked={editForm.utilizzabile_in_battaglia} 
                                            onChange={(e) => setEditForm({...editForm, utilizzabile_in_battaglia: e.target.checked})} 
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
            `}</style>
        </div>
    );
}
