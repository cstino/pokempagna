import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Users, User, Shield, Zap, Medal, Edit2, Loader2, X, Check, Save, Heart, TrendingUp } from 'lucide-react';
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

    useEffect(() => {
        if (!profile?.campagna_corrente_id) return;

        caricaGiocatori();

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

    const openEditModal = (player) => {
        setSelectedPlayer(player);
        setEditForm({ ...player });
        setIsEditing(true);
    };

    const handleStatChange = (stat, value) => {
        setEditForm(prev => ({
            ...prev,
            [stat]: parseInt(value) || 0
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
                    forza: editForm.forza,
                    destrezza: editForm.destrezza,
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
                                        <div className="stat-mini-box">
                                            <Zap size={14} color="#ef4444" />
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
            {isEditing && editForm && (
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

                        <div className="modal-body">
                            <div className="edit-section">
                                <h4 className="edit-section-title"><Heart size={16} /> Salute e Crescita</h4>
                                <div className="edit-grid-2">
                                    <div className="input-field">
                                        <label>HP Attuali</label>
                                        <input
                                            type="number"
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
                                </div>
                            </div>

                            <div className="edit-section">
                                <h4 className="edit-section-title"><Shield size={16} /> Statistiche Base</h4>
                                <div className="edit-grid-2">
                                    <div className="input-field">
                                        <label>Forza (ATK FISICO)</label>
                                        <div className="input-with-icon">
                                            <Zap size={14} color="#ef4444" />
                                            <input
                                                type="number"
                                                value={editForm.forza}
                                                onChange={(e) => handleStatChange('forza', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="input-field">
                                        <label>Destrezza (DEF FISICA)</label>
                                        <div className="input-with-icon">
                                            <Shield size={14} color="#3b82f6" />
                                            <input
                                                type="number"
                                                value={editForm.destrezza}
                                                onChange={(e) => handleStatChange('destrezza', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setIsEditing(false)}>Annulla</button>
                            <button className="btn-save" onClick={saveChanges} disabled={saving}>
                                {saving ? <Loader2 size={18} className="spin" /> : <><Save size={18} /> Salva Modifiche</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
