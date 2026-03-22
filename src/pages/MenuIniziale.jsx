import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Sparkles, Link as LinkIcon, LogOut, Loader2, X } from 'lucide-react';
import './MenuIniziale.css';

export default function MenuIniziale() {
    const { profile, signOut, refreshProfile } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [view, setView] = useState('menu'); // 'menu' | 'join' | 'create'
    const [joinCode, setJoinCode] = useState('');
    const [campagnaNome, setCampagnaNome] = useState('');
    const [createdCode, setCreatedCode] = useState(null);
    const [campagne, setCampagne] = useState([]);
    const [fetchingCampagne, setFetchingCampagne] = useState(true);

    useEffect(() => {
        if (profile) {
            caricaCampagne();
        }
    }, [profile]);

    async function caricaCampagne() {
        setFetchingCampagne(true);
        console.log("Inizio fetching campagne per:", profile.id);
        try {
            // Aggiungiamo un timeout manuale di sicurezza per evitare hangs infiniti della libreria REST di Supabase
            const fetchPromise = supabase
                .from('campagne')
                .select('*')
                .eq('master_id', profile.id);

            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Supabase request timeout after 5s')), 5000);
            });

            const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

            if (error) throw error;
            console.log("Campagne caricate con successo:", data);
            setCampagne(data || []);
        } catch (err) {
            console.error("Errore critico caricamento campagne:", err);
            setError(err.message || "Errore sconosciuto nel database");
            setCampagne([]);
        } finally {
            console.log("Fetching completato, disabilito loader.");
            setFetchingCampagne(false);
        }
    }

    function generaCodice() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    async function handleCreateCampaign(e) {
        e.preventDefault();
        setError('');
        if (!campagnaNome.trim()) return;
        setLoading(true);

        try {
            const codiceInvito = generaCodice();

            const { data: nuovaCampagna, error: campErr } = await supabase
                .from('campagne')
                .insert({
                    nome: campagnaNome,
                    codice_invito: codiceInvito,
                    master_id: profile.id
                })
                .select()
                .single();

            if (campErr) throw campErr;

            const { error: updErr } = await supabase
                .from('giocatori')
                .update({
                    ruolo: 'master',
                    campagna_corrente_id: nuovaCampagna.id
                })
                .eq('id', profile.id);

            if (updErr) throw updErr;

            await refreshProfile();
            setCreatedCode(codiceInvito);
            caricaCampagne();
        } catch (err) {
            console.error("Errore creazione campagna:", err);
            setError(err.message || "Errore sconosciuto. Assicurati di aver clonato lo schema SQL in Supabase.");
        } finally {
            setLoading(false);
        }
    }

    async function handleJoinCampaign(e) {
        e.preventDefault();
        setError('');
        if (!joinCode.trim()) return;
        setLoading(true);

        try {
            const { data: campagna, error: searchErr } = await supabase
                .from('campagne')
                .select('*')
                .eq('codice_invito', joinCode.toUpperCase())
                .maybeSingle();

            if (searchErr) throw searchErr;
            if (!campagna) {
                setError("Codice invito non trovato. Verifica e riprova.");
                setLoading(false);
                return;
            }

            const { error: updErr } = await supabase
                .from('giocatori')
                .update({
                    ruolo: 'giocatore',
                    campagna_corrente_id: campagna.id
                })
                .eq('id', profile.id);

            if (updErr) throw updErr;

            await refreshProfile();
            navigate('/player/profilo');
        } catch (err) {
            console.error(err);
            setError(err.message || "Si è verificato un errore durante l'accesso.");
        } finally {
            setLoading(false);
        }
    }

    async function selezionaCampagna(campagnaId, ruolo) {
        setLoading(true);
        try {
            await supabase
                .from('giocatori')
                .update({
                    ruolo: ruolo,
                    campagna_corrente_id: campagnaId
                })
                .eq('id', profile.id);

            await refreshProfile();
            navigate(ruolo === 'master' ? '/master/party' : '/player/profilo');
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    }

    function closeModal() {
        setView('menu');
        setError('');
        setCreatedCode(null);
        setCampagnaNome('');
        setJoinCode('');
    }

    // -- Modals --
    const renderCreateModal = () => (
        <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={closeModal} title="Chiudi">
                    <X size={24} />
                </button>

                {!createdCode ? (
                    <form className="modal-form" onSubmit={handleCreateCampaign}>
                        <h3>✨ Nuova Campagna</h3>
                        <p>Dai un nome fighissimo al tuo mondo Pokémon.</p>

                        {error && (
                            <div className="error-box">
                                {error}
                            </div>
                        )}

                        <input
                            className="modal-input"
                            type="text"
                            placeholder="Es. La Landa Misteriosa"
                            value={campagnaNome}
                            onChange={(e) => setCampagnaNome(e.target.value)}
                            autoFocus
                        />
                        <button type="submit" className="btn-modal btn-cyan" disabled={loading || campagnaNome.length < 2}>
                            {loading ? <Loader2 className="spin" size={20} /> : 'Crea Campagna'}
                        </button>
                    </form>
                ) : (
                    <div className="modal-form">
                        <h3>Campagna Pronta! 🎉</h3>
                        <p>Condividi questo codice segreto con i tuoi giocatori per farli accedere al party.</p>
                        <div className="code-display">{createdCode}</div>
                        <button className="btn-modal btn-cyan" onClick={() => navigate('/master/party')}>
                            Vai al Pannello Master
                        </button>
                    </div>
                )}
            </div>
        </div>
    );

    const renderJoinModal = () => (
        <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={closeModal} title="Chiudi">
                    <X size={24} />
                </button>
                <form className="modal-form" onSubmit={handleJoinCampaign}>
                    <h3>🔗 Unisciti al Party</h3>
                    <p>Inserisci il codice segreto fornito dal tuo Game Master.</p>

                    {error && (
                        <div className="error-box">
                            {error}
                        </div>
                    )}

                    <input
                        className="modal-input code-input"
                        type="text"
                        placeholder="ES. A4B7CX"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        maxLength={6}
                        autoFocus
                    />
                    <button type="submit" className="btn-modal btn-dark" disabled={loading || joinCode.length < 3}>
                        {loading ? <Loader2 className="spin" size={20} /> : 'Unisciti'}
                    </button>
                </form>
            </div>
        </div>
    );

    return (
        <div className="dashboard-layout">
            <header className="dash-header">
                <div className="dash-user">
                    <div className="dash-avatar">
                        {profile?.immagine_profilo ? (
                            <img src={profile.immagine_profilo} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <img src="/pokeball-icon.svg" alt="Avatar" style={{ opacity: 0.5, width: '24px' }} />
                        )}
                        {!profile?.immagine_profilo && profile?.nome?.[0]?.toUpperCase()}
                    </div>
                    <div>
                        <h2>Ciao, {profile?.nome || 'Allenatore'}</h2>
                        <span>Le tue campagne Pokémon</span>
                    </div>
                </div>
                <button className="btn-logout" onClick={signOut} title="Stacca il Profilo">
                    <LogOut size={16} />
                </button>
            </header>

            <div className="dash-actions">
                <button className="action-btn btn-cyan" onClick={() => setView('create')}>
                    <Sparkles size={18} /> Crea Campagna
                </button>
                <button className="action-btn btn-dark" onClick={() => setView('join')}>
                    <LinkIcon size={18} /> Unisciti
                </button>
            </div>

            <div className="dash-content">
                {error && !view && (
                    <div className="error-box" style={{ marginBottom: '24px' }}>
                        {error}
                    </div>
                )}
                {fetchingCampagne ? (
                    <div className="loading-state"><Loader2 className="spin" size={32} /></div>
                ) : campagne.length > 0 ? (
                    <div className="campaign-grid">
                        {campagne.map((camp) => (
                            <div
                                key={camp.id}
                                className="campaign-card"
                                onClick={() => selezionaCampagna(camp.id, 'master')}
                            >
                                <div className="card-badge bg-gold">DM</div>
                                <div className="card-info">
                                    <h4>{camp.nome}</h4>
                                    <span className="card-code">CODE: {camp.codice_invito}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        <div style={{ fontSize: '3rem', margin: '0 0 16px 0', opacity: 0.3 }}>🏰</div>
                        <h2 style={{ color: '#fff', fontSize: '1.5rem', margin: '0 0 8px 0' }}>Nessuna campagna</h2>
                        <p style={{ color: '#94a3b8', margin: 0 }}>
                            Crea la tua prima campagna o unisciti ad una esistente con un codice invito!
                        </p>
                    </div>
                )}
            </div>

            {view === 'create' && renderCreateModal()}
            {view === 'join' && renderJoinModal()}
        </div>
    );
}
