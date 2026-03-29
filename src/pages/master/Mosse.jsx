import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Edit2, Save, X, Loader2, Check, Info, Trash2, Zap, Upload } from 'lucide-react';
import { getTypeColor, getTypeLabel } from '../../lib/typeColors';
import './Party.css';

export default function MosseMaster() {
    const [mosse, setMosse] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState(null);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const fileInputRef = useRef(null);

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
            const cat = m.categoria || m.tipologia || 'fisico';
            setEditForm({ 
                ...m, 
                livello: m.livello || 1,
                categoria: cat,
                tipologia: cat,
                danni: m.danni || '0',
                accuratezza: m.accuratezza || '100',
                priorita: m.priorita || 0,
                bersagli: m.bersagli || 'Singolo',
                effetto: m.effetto || '',
                pp_max: m.pp_max || 20
            });
        } else {
            setEditForm({
                nome: '',
                tipo: 'normale',
                categoria: 'fisico',
                tipologia: 'fisico',
                danni: '0',
                accuratezza: '100',
                priorita: 0,
                effetto: '',
                descrizione: '',
                pp_max: 20,
                livello: 1,
                disponibile: true
            });
        }
        setIsEditing(true);
    };

    async function salvaMossa(asNew = false) {
        setSaving(true);
        try {
            // Prendiamo il valore della categoria
            const catValue = editForm.categoria || editForm.tipologia || 'fisico';
            
            // Creiamo un payload PULITO con solo quello che serve nel DB attuale
            const payload = { 
                nome: editForm.nome,
                tipo: editForm.tipo,
                categoria: catValue, // Usiamo il nome definitivo
                danni: editForm.danni,
                accuratezza: editForm.accuratezza,
                priorita: parseInt(editForm.priorita) || 0,
                bersagli: editForm.bersagli,
                effetto: editForm.effetto,
                descrizione: editForm.descrizione,
                pp_max: parseInt(editForm.pp_max) || 20,
                livello: parseInt(editForm.livello) || 1,
                disponibile: editForm.disponibile ?? true
            };
            
            let saveError;
            if (editForm.id && !asNew) {
                const { error: err } = await supabase
                    .from('mosse_disponibili')
                    .update(payload)
                    .eq('id', editForm.id);
                saveError = err;
            } else {
                const { error: err } = await supabase
                    .from('mosse_disponibili')
                    .insert([payload]);
                saveError = err;
            }

            if (saveError) throw saveError;
            setIsEditing(false);
            caricaMosse();
        } catch (err) {
            console.error("Errore salvataggio mossa:", err);
            alert("Errore nel salvataggio. Assicurati di aver aggiornato il database con le nuove colonne (danni, accuratezza, tipologia, bersagli, effetto, pp_max).");
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
        getTypeLabel(m.tipo).toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="party-page animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <Zap size={32} color="#f59e0b" />
                        Libreria Mosse
                    </h1>
                    <p className="page-subtitle">Personalizza il parco mosse della tua campagna</p>
                </div>
                <div className="btn-group-master" style={{ display: 'flex', gap: '10px' }}>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        style={{ display: 'none' }} 
                        accept=".csv" 
                        onChange={async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            setSaving(true);
                            const reader = new FileReader();
                            reader.onload = async (evt) => {
                                try {
                                    const text = evt.target.result;
                                    const lines = text.split('\n');
                                    const headers = lines[0].toLowerCase().split(/[;,]/).map(h => h.trim());
                                    const importedData = lines.slice(1).filter(l => l.trim()).map(line => {
                                        const values = line.split(/[;,]/).map(v => v.trim());
                                        const m = {};
                                        headers.forEach((h, i) => {
                                            const v = values[i];
                                            if (h === 'nome') m.nome = v;
                                            else if (h === 'tipo') m.tipo = v.toLowerCase();
                                            else if (h === 'categoria') m.categoria = v.toLowerCase();
                                            else if (h === 'potenza') m.danni = v;
                                            else if (h === 'accuratezza') m.accuratezza = v;
                                            else if (h === 'priorità') m.priorita = parseInt(v) || 0;
                                            else if (h === 'area') m.bersagli = v;
                                            else if (h === 'pp') m.pp_max = parseInt(v) || 20;
                                            else if (h === 'animazione') m.livello = parseInt(v) || 1;
                                            else if (h === 'descrizione') m.descrizione = v;
                                        });
                                        m.disponibile = true;
                                        return m;
                                    });
                                    const { error } = await supabase.from('mosse_disponibili').insert(importedData);
                                    if (error) throw error;
                                    alert(`Importate ${importedData.length} mosse!`);
                                    caricaMosse();
                                } catch (err) { alert("Errore importazione CSV"); }
                                finally { setSaving(false); e.target.value = null; }
                            };
                            reader.readAsText(file);
                        }} 
                    />
                    <button className="btn-save" onClick={() => fileInputRef.current.click()} style={{ background: 'rgba(255,255,255,0.05)', color: 'white' }}>
                        <Upload size={18} /> Importa Mosse
                    </button>
                    <button className="btn-save" onClick={() => openEditModal()}>
                        <Plus size={18} /> Nuova Mossa
                </button>
                </div>
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
                            <h3>Libreria Vuota</h3>
                            <p>Inizia ad aggiungere mosse per i tuoi Pokémon!</p>
                        </div>
                    ) : (
                        <div className="master-list-table-container">
                            <table className="master-list-table">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Tipo</th>
                                        <th>Categoria</th>
                                        <th>Pot/Acc</th>
                                        <th>Priorità</th>
                                        <th>Area</th>
                                        <th>Descrizione</th>
                                        <th>PP</th>
                                        <th>Anim.</th>
                                        <th>Dispon.</th>
                                        <th>Azioni</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredMosse.map(m => (
                                        <tr key={m.id}>
                                            <td><strong>{m.nome}</strong></td>
                                            <td><span className="type-badge-mini" style={{ 
                                                textTransform: 'uppercase',
                                                background: getTypeColor(m.tipo),
                                                color: 'white',
                                                fontWeight: 'bold'
                                            }}>{getTypeLabel(m.tipo)}</span></td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className="type-badge-mini" style={{ 
                                                    textTransform: 'capitalize',
                                                    background: (m.categoria || m.tipologia) === 'fisico' ? '#ef4444' : 
                                                                (m.categoria || m.tipologia) === 'speciale' ? '#3b82f6' : 
                                                                (m.categoria || m.tipologia) === 'status' ? '#6b7280' :
                                                                '#6b7280',
                                                    color: 'white',
                                                    fontWeight: 'bold'
                                                }}>{m.categoria || m.tipologia || 'fisico'}</span>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: '0.85rem' }}>
                                                    <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{m.danni || 0}</span>
                                                    <span style={{ opacity: 0.5, margin: '0 4px' }}>/</span>
                                                    <span style={{ color: '#34d399' }}>{m.accuratezza || '100'}</span>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{ 
                                                    background: 'rgba(255,255,255,0.05)', 
                                                    padding: '2px 8px', 
                                                    borderRadius: '4px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '800',
                                                    color: m.priorita > 0 ? '#10b981' : m.priorita < 0 ? '#ef4444' : 'inherit'
                                                }}>
                                                    {m.priorita > 0 ? `+${m.priorita}` : m.priorita}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '0.8rem', opacity: 0.8 }}>{m.bersagli || 'Singolo'}</td>
                                            <td style={{ fontSize: '0.75rem', opacity: 0.5, maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {m.descrizione || '-'}
                                            </td>
                                            <td><span style={{ fontWeight: 'bold' }}>{m.pp_max || 20}</span></td>
                                            <td>
                                                <div className="level-indicator">
                                                    {[1, 2, 3].map(l => (
                                                        <div key={l} className={`level-dot ${m.livello >= l ? 'filled' : ''}`}></div>
                                                    ))}
                                                </div>
                                            </td>
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
                    <div className="master-edit-modal npc-modal-premium animate-slide-up" style={{ width: '800px' }}>
                        <div className="modal-header">
                            <h3>{editForm.id ? 'Aggiorna Mossa' : 'Nuova Mossa Campagna'}</h3>
                            <button className="modal-close" onClick={() => setIsEditing(false)}><X size={24} /></button>
                        </div>

                        <div className="modal-body-scroll">
                            <div className="edit-section">
                                <h4 className="edit-section-title"><Info size={16} /> Parametri Fondamentali</h4>
                                <div className="edit-grid-3">
                                    <div className="input-field">
                                        <label>Nome Mossa</label>
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
                                            <option value="suono">SUONO</option>
                                            <option value="sconosciuto">SCONOSCIUTO</option>
                                        </select>
                                    </div>
                                    <div className="input-field">
                                        <label>Categoria</label>
                                        <select 
                                            value={editForm.categoria || editForm.tipologia || 'fisico'} 
                                            onChange={(e) => setEditForm({ ...editForm, categoria: e.target.value, tipologia: e.target.value })}
                                        >
                                            <option value="fisico">FISICO</option>
                                            <option value="speciale">SPECIALE</option>
                                            <option value="status">STATUS</option>
                                        </select>
                                    </div>
                                    <div className="input-field">
                                        <label>Danni (es. 2d6, 40, ...)</label>
                                        <input type="text" value={editForm.danni} onChange={(e) => setEditForm({ ...editForm, danni: e.target.value })} />
                                    </div>
                                    <div className="input-field">
                                        <label>Accuratezza</label>
                                        <input type="text" value={editForm.accuratezza} onChange={(e) => setEditForm({ ...editForm, accuratezza: e.target.value })} />
                                    </div>
                                    <div className="input-field">
                                        <label>Priorità (+1, -1, ecc.)</label>
                                        <input type="number" value={editForm.priorita} onChange={(e) => setEditForm({ ...editForm, priorita: parseInt(e.target.value) })} />
                                    </div>
                                    <div className="input-field">
                                        <label>PP Massimi</label>
                                        <input type="number" value={editForm.pp_max} onChange={(e) => setEditForm({ ...editForm, pp_max: parseInt(e.target.value) })} />
                                    </div>
                                    <div className="input-field">
                                        <label>Area / Bersagli</label>
                                        <input type="text" placeholder="es. Singolo, Tutti, Area..." value={editForm.bersagli} onChange={(e) => setEditForm({ ...editForm, bersagli: e.target.value })} />
                                    </div>
                                    <div className="input-field" style={{ gridColumn: 'span 2' }}>
                                        <label>Livello Animazione (Combat Arena)</label>
                                        <div className="level-selector-row">
                                            {[1, 2, 3].map(l => (
                                                <button 
                                                    key={l}
                                                    className={`level-btn ${editForm.livello === l ? 'active' : ''}`}
                                                    onClick={() => setEditForm({ ...editForm, livello: l })}
                                                >
                                                    Power Level {l}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="edit-section" style={{ marginTop: '20px' }}>
                                <h4 className="edit-section-title">Contenuti Narrativi</h4>
                                <div className="edit-grid-2">
                                    <div className="input-field">
                                        <label>Effetto (Meccaniche)</label>
                                        <textarea 
                                            placeholder="Cosa succede quando colpisce? (es. Scotta il bersaglio)" 
                                            style={{ height: '80px' }}
                                            value={editForm.effetto || ''} 
                                            onChange={(e) => setEditForm({ ...editForm, effetto: e.target.value })} 
                                        />
                                    </div>
                                    <div className="input-field">
                                        <label>Descrizione Flavored</label>
                                        <textarea 
                                            placeholder="Testo descrittivo per il giocatore..." 
                                            style={{ height: '80px' }}
                                            value={editForm.descrizione || ''} 
                                            onChange={(e) => setEditForm({ ...editForm, descrizione: e.target.value })} 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="checkbox-field" style={{ padding: '10px 0' }}>
                                <input
                                    type="checkbox"
                                    id="disponibile-check"
                                    checked={editForm.disponibile}
                                    onChange={(e) => setEditForm({ ...editForm, disponibile: e.target.checked })}
                                />
                                <label htmlFor="disponibile-check" style={{ fontWeight: 600 }}>Rendi questa mossa disponibile all'assegnazione</label>
                            </div>
                        </div>

                        <div className="modal-footer-centered">
                            <button className="btn-cancel-flat" onClick={() => setIsEditing(false)}>Annulla</button>
                            <div className="btn-group-master">
                                <button className="btn-save-hero" onClick={() => salvaMossa(false)} disabled={saving}>
                                    {saving ? <Loader2 size={18} className="spin" /> : <Save size={18} />} {editForm.id ? 'Salva Cambiamenti' : 'Crea Mossa'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .level-indicator {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .level-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-subtle);
                }
                .level-dot.filled {
                    background: #f59e0b;
                    border-color: #d97706;
                    box-shadow: 0 0 5px rgba(245, 158, 11, 0.4);
                }
                .level-selector-row {
                    display: flex;
                    gap: 8px;
                    margin-top: 4px;
                }
                .level-btn {
                    flex: 1;
                    padding: 8px;
                    border-radius: 8px;
                    border: 1px solid var(--border-subtle);
                    background: var(--bg-secondary);
                    color: var(--text-muted);
                    cursor: pointer;
                    transition: all 0.2s;
                    font-weight: 500;
                    font-size: 0.85rem;
                }
                .level-btn:hover {
                    background: var(--bg-card-hover);
                }
                .level-btn.active {
                    background: #f59e0b;
                    color: white;
                    border-color: #d97706;
                    box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
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
