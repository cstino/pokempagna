import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
    Map, 
    Settings, 
    BookOpen, 
    StickyNote, 
    Users, 
    Plus, 
    Save, 
    Edit, 
    Trash2, 
    X, 
    Check, 
    Loader2,
    Calendar,
    Image as ImageIcon,
    Camera
} from 'lucide-react';
import { useRef } from 'react';
import './Campagna.css';

export default function Campagna() {
    const { profile } = useAuth();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('settings');
    const [campagna, setCampagna] = useState(null);
    const [sessioni, setSessioni] = useState([]);
    const [partecipanti, setPartecipanti] = useState([]);
    
    // Stati per l'editing
    const [editingGeneral, setEditingGeneral] = useState(false);
    const [editCampagna, setEditCampagna] = useState({ nome: '', immagine_url: '', note: '' });
    
    const [showSessionModal, setShowSessionModal] = useState(false);
    const [editingSession, setEditingSession] = useState(null);
    const [newSession, setNewSession] = useState({ titolo: '', resoconto: '' });
    
    // Stato per eliminazione partecipante
    const [playerToDelete, setPlayerToDelete] = useState(null);
    const [showDeletePlayerModal, setShowDeletePlayerModal] = useState(false);
    
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (profile) {
            fetchCampagnaCompleta();
        }
    }, [profile]);

    const fetchCampagnaCompleta = async () => {
        setLoading(true);
        try {
            // 1. Recupero Campagna
            let { data: campData, error: campError } = await supabase
                .from('campagne')
                .select('*')
                .eq('master_id', profile.id)
                .maybeSingle();

            if (!campData && !campError) {
                // Se non esiste ancora una campagna per questo master, la creiamo? 
                // In teoria dovrebbe già esserci se il Master è arrivato qui.
                console.warn("Nessuna campagna trovata per questo master.");
                setLoading(false);
                return;
            }

            if (campError) throw campError;
            setCampagna(campData);
            setEditCampagna({ 
                nome: campData.nome, 
                immagine_url: campData.immagine_url || '', 
                note: campData.note || '' 
            });

            // 2. Recupero Sessioni
            const { data: sessData } = await supabase
                .from('sessioni_campagna')
                .select('*')
                .eq('campagna_id', campData.id)
                .order('numero', { ascending: true });
            
            setSessioni(sessData || []);

            // 3. Recupero Partecipanti
            const { data: partData } = await supabase
                .from('giocatori')
                .select('*')
                .eq('campagna_corrente_id', campData.id)
                .neq('ruolo', 'master'); // Escludiamo il master dai partecipanti
            
            setPartecipanti(partData || []);

        } catch (err) {
            console.error("Errore recupero campagna:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);

            img.onload = async () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Dimensione ottimizzata per Locandina (16:9 approx)
                const MAX_WIDTH = 800;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                // Comprime in formato webp a 0.7 per risparmiare spazio nel DB
                const base64String = canvas.toDataURL('image/webp', 0.7);

                setEditCampagna(prev => ({ ...prev, immagine_url: base64String }));
                setUploading(false);
            };
            img.src = objectUrl;
        } catch (err) {
            console.error("Errore elaborazione immagine:", err);
            setUploading(false);
        }
    };

    const handleSaveGeneral = async () => {
        try {
            const { error } = await supabase
                .from('campagne')
                .update({
                    nome: editCampagna.nome,
                    immagine_url: editCampagna.immagine_url,
                    note: editCampagna.note
                })
                .eq('id', campagna.id);

            if (error) throw error;
            setCampagna({ ...campagna, ...editCampagna });
            setEditingGeneral(false);
        } catch (err) {
            alert("Errore salvataggio impostazioni: " + err.message);
        }
    };

    const handleSaveSession = async () => {
        try {
            if (editingSession) {
                // Aggiornamento
                const { error } = await supabase
                    .from('sessioni_campagna')
                    .update({
                        titolo: newSession.titolo,
                        resoconto: newSession.resoconto
                    })
                    .eq('id', editingSession.id);
                if (error) throw error;
            } else {
                // Nuova sessione
                const numero = sessioni.length + 1;
                const { error } = await supabase
                    .from('sessioni_campagna')
                    .insert({
                        campagna_id: campagna.id,
                        numero: numero,
                        titolo: newSession.titolo || `Sessione ${numero}`,
                        resoconto: newSession.resoconto
                    });
                if (error) throw error;
            }
            setShowSessionModal(false);
            setNewSession({ titolo: '', resoconto: '' });
            setEditingSession(null);
            fetchCampagnaCompleta();
        } catch (err) {
            alert("Errore salvataggio sessione: " + err.message);
        }
    };

    const deleteSession = async (id) => {
        if (!confirm("Sei sicuro di voler eliminare questa sessione?")) return;
        try {
            const { error } = await supabase.from('sessioni_campagna').delete().eq('id', id);
            if (error) throw error;
            fetchCampagnaCompleta();
        } catch (err) {
            alert("Errore eliminazione: " + err.message);
        }
    };

    const handleRemovePlayer = async () => {
        if (!playerToDelete) return;
        try {
            const { error } = await supabase
                .from('giocatori')
                .update({ 
                    campagna_corrente_id: null,
                    ruolo: 'giocatore' // Reset ruolo default se necessario
                })
                .eq('id', playerToDelete.id);

            if (error) throw error;
            
            setShowDeletePlayerModal(false);
            setPlayerToDelete(null);
            fetchCampagnaCompleta();
        } catch (err) {
            alert("Errore rimozione giocatore: " + err.message);
        }
    };

    if (loading) return <div className="flex-center" style={{ height: '100vh' }}><Loader2 className="spin" size={48} color="#56e3ff" /></div>;
    if (!campagna) return <div className="flex-center" style={{ height: '100vh' }}><p>Nessuna campagna attiva trovata. Crea prima una campagna.</p></div>;

    return (
        <div className="campagna-container animate-fade-in">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        <Map size={32} color="#56e3ff" />
                        Campagna: <span className="highlight">{campagna.nome}</span>
                    </h1>
                    <p className="page-subtitle">Gestione, cronologia e note del Master</p>
                </div>
                <div className="invite-code-badge">
                    <Users size={16} /> Codice Invito: <strong>{campagna.codice_invito}</strong>
                </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="campagna-tabs">
                <button className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
                    <Settings size={20} /> Impostazioni
                </button>
                <button className={`tab-btn ${activeTab === 'sessions' ? 'active' : ''}`} onClick={() => setActiveTab('sessions')}>
                    <BookOpen size={20} /> Sessioni
                </button>
                <button className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>
                    <StickyNote size={20} /> Note Master
                </button>
            </div>

            <div className="tab-content">
                {/* SETTINGS TAB */}
                {activeTab === 'settings' && (
                    <div className="settings-tab animate-slide-up">
                        <div className="settings-grid">
                            <div className="card settings-main">
                                <div className="card-header-row">
                                    <h3>Informazioni Generali</h3>
                                    {!editingGeneral ? (
                                        <button className="btn-icon" onClick={() => setEditingGeneral(true)}><Edit size={18} /></button>
                                    ) : (
                                        <div className="actions-row">
                                            <button className="btn-icon-cancel" onClick={() => setEditingGeneral(false)}><X size={18} /></button>
                                            <button className="btn-icon-save" onClick={handleSaveGeneral}><Save size={18} /></button>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="settings-form">
                                    <div className="form-group">
                                        <label>Nome Campagna</label>
                                        <input 
                                            type="text" 
                                            value={editCampagna.nome} 
                                            readOnly={!editingGeneral}
                                            onChange={(e) => setEditCampagna({ ...editCampagna, nome: e.target.value })}
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>Locandina Campagna</label>
                                        <div 
                                            className={`locandina-upload-card ${editingGeneral ? 'editable' : ''}`}
                                            onClick={() => editingGeneral && fileInputRef.current.click()}
                                        >
                                            {editCampagna.immagine_url ? (
                                                <img src={editCampagna.immagine_url} alt="Locandina" className="locandina-img" />
                                            ) : (
                                                <div className="locandina-placeholder">
                                                    <ImageIcon size={48} opacity={0.2} />
                                                    <p>Clicca per caricare</p>
                                                </div>
                                            )}
                                            
                                            {editingGeneral && (
                                                <div className="upload-overlay">
                                                    {uploading ? <Loader2 className="spin" size={24} /> : <Camera size={24} />}
                                                    <span>Cambia Immagine</span>
                                                </div>
                                            )}
                                        </div>
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            style={{ display: 'none' }} 
                                            accept="image/*"
                                            onChange={handleFileChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="card players-list-card">
                                <h3>Partecipanti ({partecipanti.length})</h3>
                                <div className="players-list">
                                    {partecipanti.length > 0 ? partecipanti.map(p => (
                                        <div key={p.id} className="player-row">
                                            <div className="player-avatar">
                                                {p.immagine_profilo ? <img src={p.immagine_profilo} alt={p.nome} /> : <Users size={20} />}
                                            </div>
                                            <div className="player-info">
                                                <strong>{p.nome}</strong>
                                                <span>Lv. {p.livello_allenatore}</span>
                                            </div>
                                            <div className="player-actions">
                                                <div className={`role-badge ${p.ruolo}`}>{p.ruolo}</div>
                                                <button 
                                                    className="btn-remove-player" 
                                                    onClick={() => { setPlayerToDelete(p); setShowDeletePlayerModal(true); }}
                                                    title="Rimuovi dalla campagna"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    )) : <p className="empty-msg">Nessun giocatore si è ancora unito.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* SESSIONS TAB */}
                {activeTab === 'sessions' && (
                    <div className="sessions-tab animate-slide-up">
                        <div className="sessions-header">
                            <h2>Diario delle Sessioni</h2>
                            <button className="btn-master" onClick={() => { setEditingSession(null); setNewSession({ titolo: '', resoconto: '' }); setShowSessionModal(true); }}>
                                <Plus size={18} /> Nuova Sessione
                            </button>
                        </div>

                        <div className="sessions-timeline">
                            {sessioni.length > 0 ? sessioni.map(s => (
                                <div key={s.id} className="session-card">
                                    <div className="session-number">#{s.numero}</div>
                                    <div className="session-main">
                                        <div className="session-header-row">
                                            <h3>{s.titolo}</h3>
                                            <div className="session-actions">
                                                <button className="btn-icon-subtle" onClick={() => { setEditingSession(s); setNewSession({ titolo: s.titolo, resoconto: s.resoconto }); setShowSessionModal(true); }}><Edit size={16} /></button>
                                                <button className="btn-icon-danger" onClick={() => deleteSession(s.id)}><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                        <p className="session-date"><Calendar size={12} /> {new Date(s.created_at).toLocaleDateString('it-IT')}</p>
                                        <div className="session-resoconto">
                                            {s.resoconto || "Nessun resoconto scritto."}
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="empty-state">
                                    <BookOpen size={48} opacity={0.1} />
                                    <p>Non hai ancora registrato nessuna sessione.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* NOTES TAB */}
                {activeTab === 'notes' && (
                    <div className="notes-tab animate-slide-up">
                        <div className="card full-width">
                            <div className="card-header-row">
                                <h3>Mappa e Lore (Note libere)</h3>
                                <button className="btn-master-outline" onClick={handleSaveGeneral}>
                                    <Save size={18} /> Salva Note
                                </button>
                            </div>
                            <textarea 
                                className="master-notes-area"
                                placeholder="Scrivi qui i punti chiave della trama, i segreti degli NPC o le locazioni importanti..."
                                value={editCampagna.note}
                                onChange={(e) => setEditCampagna({ ...editCampagna, note: e.target.value })}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* MODALE SESSIONE */}
            {showSessionModal && (
                <div className="zaino-modal-overlay confirmation" onClick={() => setShowSessionModal(false)}>
                    <div className="zaino-modal session-edit-modal" onClick={e => e.stopPropagation()}>
                        <div className="zaino-modal-header">
                            <div>
                                <h2>{editingSession ? `Modifica Sessione ${editingSession.numero}` : 'Nuova Sessione'}</h2>
                                <p>Annota i progressi dei giocatori</p>
                            </div>
                            <button className="btn-close-modal" onClick={() => setShowSessionModal(false)}><X size={24} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Titolo Sessione</label>
                                <input 
                                    type="text" 
                                    placeholder="Es: L'arrivo a Celestopoli"
                                    value={newSession.titolo}
                                    onChange={e => setNewSession({ ...newSession, titolo: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Resoconto / Note della Sessione</label>
                                <textarea 
                                    placeholder="Cosa è successo oggi? Quali segreti hanno scoperto i giocatori?"
                                    value={newSession.resoconto}
                                    onChange={e => setNewSession({ ...newSession, resoconto: e.target.value })}
                                    style={{ height: '200px' }}
                                />
                            </div>
                            <button className="btn-master" onClick={handleSaveSession} style={{ marginTop: 'var(--space-md)', width: '100%', justifyContent: 'center' }}>
                                <Check size={20} /> Salva Sessione
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* MODALE ELIMINAZIONE GIOCATORE */}
            {showDeletePlayerModal && (
                <div className="zaino-modal-overlay confirmation" onClick={() => setShowDeletePlayerModal(false)}>
                    <div className="zaino-modal confirm-small animate-bounce-in" onClick={e => e.stopPropagation()}>
                        <div className="modal-body center">
                            <div className="confirm-icon-circle danger">
                                <Trash2 size={32} color="#ef4444" />
                            </div>
                            <h2 className="modal-title">Rimuovere {playerToDelete?.nome}?</h2>
                            <p className="modal-description">
                                Il giocatore verrà espulso dalla campagna. Potrà rientrare solo tramite un nuovo codice invito. I suoi Pokémon rimarranno comunque associati a lui.
                            </p>
                            <div className="modal-actions-vertical">
                                <button className="btn-confirm-use danger" onClick={handleRemovePlayer}>
                                    <Trash2 size={20} /> Conferma Espulsione
                                </button>
                                <button className="btn-cancel-modal" onClick={() => setShowDeletePlayerModal(false)}>
                                    Annulla
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
