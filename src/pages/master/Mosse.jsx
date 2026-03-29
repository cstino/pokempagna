import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Edit2, Save, X, Loader2, Check, Info, Trash2, Zap } from 'lucide-react';
import { getTypeColor } from '../../lib/typeColors';
import './Party.css';

export default function MosseMaster() {
    const [mosse, setMosse] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        caricaMosse();
    }, []);

    async function caricaMosse() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('mosse_disponibili')
                .select('*')
                .order('nome', { ascending: true });

            if (error) {
                console.error("Errore caricamento mosse:", error);
                setMosse([]);
            } else {
                setMosse(data || []);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const openEditModal = (m = null) => {
        if (m) {
            setEditForm({ ...m });
        } else {
            setEditForm({
                nome: '',
                tipo: 'normale',
                categoria: 'fisico',
                descrizione: '',
                disponibile: true
            });
        }
        setIsEditing(true);
    };

    async function salvaMossa(asNew = false) {
        setSaving(true);
        try {
            const payload = { ...editForm };
            if (asNew) delete payload.id;

            let error;
            if (editForm.id && !asNew) {
                const { error: err } = await supabase
                    .from('mosse_disponibili')
                    .update(payload)
                    .eq('id', editForm.id);
                error = err;
            } else {
                const { error: err } = await supabase
                    .from('mosse_disponibili')
                    .insert([payload]);
                error = err;
            }

            if (error) throw error;
            setIsEditing(false);
            caricaMosse();
        } catch (err) {
            console.error("Errore salvataggio mossa:", err);
            alert("Errore nel salvataggio.");
        } finally {
            setSaving(false);
        }
    }

    async function eliminaMossa(id) {
        if (!confirm("Sei sicuro di voler eliminare questa mossa?")) return;
        try {
            const { error } = await supabase.from('mosse_disponibili').delete().eq('id', id);
            if (error) throw error;
            caricaMosse();
        } catch (err) {
            console.error(err);
        }
    }

    async function toggleDisponibile(m) {
        try {
            const { error } = await supabase
                .from('mosse_disponibili')
                .update({ disponibile: !m.disponibile })
                .eq('id', m.id);
            if (error) throw error;
            setMosse(prev => prev.map(item => item.id === m.id ? { ...item, disponibile: !item.disponibile } : item));
        } catch (err) {
            console.error(err);
        }
    }

    const filteredMosse = mosse.filter(m =>
        m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.tipo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="party-page animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <Zap size={32} color="#f59e0b" />
                        Libreria Mosse
                    </h1>
                    <p className="page-subtitle">Gestisci le mosse disponibili nella tua campagna</p>
                </div>
                <button className="btn-save" onClick={() => openEditModal()}>
                    <Plus size={18} /> Nuova Mossa
                </button>
            </div>

            <div className="search-bar-container-master" style={{ margin: '20px 0' }}>
                <Search className="search-icon" size={20} />
                <input
                    type="text"
                    placeholder="Cerca per nome o tipo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="master-search-input"
                />
            </div>

            {loading ? (
                <div className="flex-center p-xl"><Loader2 className="spin" size={40} /></div>
            ) : (
                <div className="mosse-master-content">
                    {filteredMosse.length === 0 ? (
                        <div className="empty-state">
                            <Zap size={48} color="rgba(255,255,255,0.2)" />
                            <h3>Nessuna mossa trovata</h3>
                            <p>Aggiungi la tua prima mossa personalizzata!</p>
                        </div>
                    ) : (
                        <div className="master-list-table-container">
                            <table className="master-list-table">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Descrizione</th>
                                        <th>Tipo</th>
                                        <th>Categoria</th>
                                        <th>Disponibile</th>
                                        <th>Azioni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMosse.map(m => (
                                        <tr key={m.id}>
                                            <td><strong>{m.nome}</strong></td>
                                            <td className="desc-cell"><em>{m.descrizione || 'Nessuna descrizione'}</em></td>
                                            <td><span className="type-badge-mini" style={{ 
                                                textTransform: 'uppercase',
                                                background: getTypeColor(m.tipo),
                                                color: 'white',
                                                border: 'none',
                                                fontWeight: 'bold',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                            }}>{m.tipo}</span></td>
                                            <td><span className="type-badge-mini" style={{ 
                                                textTransform: 'capitalize',
                                                background: m.categoria === 'fisico' ? '#ef4444' : 
                                                            m.categoria === 'speciale' ? '#3b82f6' : 
                                                            '#6b7280',
                                                color: 'white',
                                                border: 'none',
                                                fontWeight: 'bold'
                                            }}>{m.categoria}</span></td>
                                            <td>
                                                <div
                                                    className={`pokedex-toggle ${m.disponibile ? 'active' : ''}`}
                                                    onClick={() => toggleDisponibile(m)}
                                                >
                                                    <div className="toggle-circle"></div>
                                                </div>
                                            </td>
                                            <td className="actions-cell-column">
                                                <div className="actions-cell">
                                                    <button className="btn-icon" onClick={() => openEditModal(m)}><Edit2 size={16} /></button>
                                                    <button className="btn-icon del" onClick={() => eliminaMossa(m.id)}><Trash2 size={16} /></button>
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
                            <h3>{editForm.id ? 'Modifica Mossa' : 'Crea Nuova Mossa'}</h3>
                            <button className="modal-close" onClick={() => setIsEditing(false)}><X size={24} /></button>
                        </div>

                        <div className="modal-body-scroll">
                            <div className="edit-section">
                                <h4 className="edit-section-title"><Info size={16} /> Dettagli Mossa</h4>
                                <div className="edit-grid-2">
                                    <div className="input-field">
                                        <label>Nome</label>
                                        <input type="text" value={editForm.nome} onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })} />
                                    </div>
                                    <div className="input-field">
                                        <label>Tipo</label>
                                        <select value={editForm.tipo} onChange={(e) => setEditForm({ ...editForm, tipo: e.target.value })}>
                                            <option value="normale">NORMALE</option>
                                            <option value="fuoco">FUOCO</option>
                                            <option value="acqua">ACQUA</option>
                                            <option value="erba">ERBA</option>
                                            <option value="elettro">ELETTRO</option>
                                            <option value="ghiaccio">GHIACCIO</option>
                                            <option value="lotta">LOTTA</option>
                                            <option value="veleno">VELENO</option>
                                            <option value="terra">TERRA</option>
                                            <option value="volante">VOLANTE</option>
                                            <option value="psico">PSICO</option>
                                            <option value="coleottero">COLEOTTERO</option>
                                            <option value="roccia">ROCCIA</option>
                                            <option value="spettro">SPETTRO</option>
                                            <option value="drago">DRAGO</option>
                                            <option value="buio">BUIO</option>
                                            <option value="acciaio">ACCIAIO</option>
                                            <option value="folletto">FOLLETTO</option>
                                        </select>
                                    </div>
                                    <div className="input-field">
                                        <label>Categoria</label>
                                        <select value={editForm.categoria} onChange={(e) => setEditForm({ ...editForm, categoria: e.target.value })}>
                                            <option value="fisico">FISICO</option>
                                            <option value="speciale">SPECIALE</option>
                                        </select>
                                    </div>
                                    <div className="input-field" style={{ gridColumn: 'span 2' }}>
                                        <label>Descrizione</label>
                                        <textarea value={editForm.descrizione || ''} onChange={(e) => setEditForm({ ...editForm, descrizione: e.target.value })} />
                                    </div>
                                    <div className="checkbox-field">
                                        <input
                                            type="checkbox"
                                            id="disponibile-check"
                                            checked={editForm.disponibile}
                                            onChange={(e) => setEditForm({ ...editForm, disponibile: e.target.checked })}
                                        />
                                        <label htmlFor="disponibile-check">Disponibile (Visibile al Master)</label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer-centered">
                            <button className="btn-cancel-flat" onClick={() => setIsEditing(false)}>Annulla</button>
                            <div className="btn-group-master">
                                <button className="btn-save-hero" onClick={() => salvaMossa(false)} disabled={saving}>
                                    {saving ? <Loader2 className="spin" /> : <Save size={18} />} {editForm.id ? 'Sovrascrivi' : 'Crea'}
                                </button>
                                {editForm.id && (
                                    <button className="btn-save-hero accent" onClick={() => salvaMossa(true)} disabled={saving}>
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
                }
                .type-badge-mini {
                    font-size: 0.75rem;
                    padding: 4px 12px;
                    border-radius: 20px;
                    display: inline-block;
                    min-width: 80px;
                    text-align: center;
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
