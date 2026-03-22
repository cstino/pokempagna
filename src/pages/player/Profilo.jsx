import { useState, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { User, Shield, Zap, TrendingUp, Medal, Camera, Loader2, Edit2, Check, Heart } from 'lucide-react';
import './Profilo.css';

export default function Profilo() {
    const { profile, refreshProfile } = useAuth();
    const [uploading, setUploading] = useState(false);
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState(profile?.nome || '');
    const [savingName, setSavingName] = useState(false);
    const fileInputRef = useRef(null);

    // Gestione Foto Profilo (Base64 Compresso)
    const handlePhotoClick = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);

        try {
            // Comprime/Ridimensiona immagine stile "Avanti Veloce"
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);

            img.onload = async () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Limite a 256x256 per non esondare il limite varchar/text database
                const MAX_SIZE = 256;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                // Comprime in formato webp a 0.8
                const base64String = canvas.toDataURL('image/webp', 0.8);

                // Aggiorna Supabase DB
                const { error } = await supabase
                    .from('giocatori')
                    .update({ immagine_profilo: base64String })
                    .eq('id', profile.id);

                if (error) throw error;
                await refreshProfile();
                setUploading(false);
            };
            img.src = objectUrl;
        } catch (err) {
            console.error("Errore upload immagine:", err);
            setUploading(false);
        }
    };

    const handleSaveName = async () => {
        if (!tempName.trim()) {
            setIsEditingName(false);
            return;
        }
        setSavingName(true);
        try {
            const { error } = await supabase
                .from('giocatori')
                .update({ nome: tempName })
                .eq('id', profile.id);
            if (error) throw error;
            await refreshProfile();
        } catch (err) {
            console.error("Errore salvataggio nome:", err);
        } finally {
            setSavingName(false);
            setIsEditingName(false);
        }
    };

    if (!profile) return <div className="loading-state"><Loader2 className="spin" /></div>;

    const hpPercent = Math.max(0, Math.min(100, (profile.hp / profile.hp_max) * 100));
    const hpColor = hpPercent > 50 ? '#34d399' : hpPercent > 20 ? '#fbbf24' : '#ef4444';

    return (
        <div className="profilo-page animate-fade-in">
            {/* INTESTAZIONE ALLENATORE */}
            <div className="trainer-card">
                <div className="trainer-avatar-container" onClick={handlePhotoClick}>
                    {profile.immagine_profilo ? (
                        <img src={profile.immagine_profilo} alt="Avatar Allenatore" className="trainer-avatar-img" />
                    ) : (
                        <div className="trainer-avatar-placeholder">
                            <User size={48} color="rgba(255,255,255,0.3)" />
                        </div>
                    )}
                    <div className="avatar-edit-overlay">
                        {uploading ? <Loader2 size={24} className="spin" color="#fff" /> : <Camera size={24} color="#fff" />}
                    </div>
                </div>
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handleFileChange}
                />

                <div className="trainer-info">
                    <div className="trainer-name-row">
                        {isEditingName ? (
                            <div className="edit-name-mode">
                                <input
                                    className="name-input"
                                    value={tempName}
                                    onChange={e => setTempName(e.target.value)}
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                                />
                                <button className="btn-save-name" onClick={handleSaveName} disabled={savingName}>
                                    {savingName ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
                                </button>
                            </div>
                        ) : (
                            <>
                                <h2>{profile.nome}</h2>
                                <button className="btn-edit-name" onClick={() => setIsEditingName(true)} title="Modifica Nome">
                                    <Edit2 size={14} />
                                </button>
                            </>
                        )}
                    </div>
                    <div className="trainer-level">
                        Livello {profile.livello_allenatore}
                    </div>
                </div>
                <div className="tlp-badge">
                    <TrendingUp size={16} />
                    <span>{profile.punti_tlp} TLP</span>
                </div>
            </div>

            {/* STATISTICHE FISICHE */}
            <div className="card stats-section">
                <h3 className="section-title">Statistiche Base</h3>
                <div className="stats-grid">
                    {/* HP INTEGRATI NELLE STATS */}
                    <div className="stat-box" style={{ gridColumn: '1 / -1', background: 'rgba(52, 211, 153, 0.05)', border: '1px solid rgba(52, 211, 153, 0.1)' }}>
                        <div className="stat-icon-bg" style={{ background: 'rgba(52, 211, 153, 0.2)' }}>
                            <Heart size={20} color="#34d399" fill="#34d399" />
                        </div>
                        <div className="stat-data" style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <span className="stat-name">Salute Allenatore</span>
                                <span className="stat-value" style={{ color: hpColor, fontVariantNumeric: 'tabular-nums' }}>{profile.hp} / {profile.hp_max}</span>
                            </div>
                            <div className="hp-bar-bg" style={{ marginTop: '8px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div className="hp-bar-fill" style={{ width: `${hpPercent}%`, height: '100%', backgroundColor: hpColor, transition: 'width 0.3s' }}></div>
                            </div>
                        </div>
                    </div>

                    <div className="stat-box">
                        <div className="stat-icon-bg bg-red">
                            <Zap size={20} color="#ef4444" />
                        </div>
                        <div className="stat-data">
                            <span className="stat-name">Forza</span>
                            <span className="stat-value">{profile.forza}</span>
                        </div>
                    </div>
                    <div className="stat-box">
                        <div className="stat-icon-bg bg-blue">
                            <Shield size={20} color="#3b82f6" />
                        </div>
                        <div className="stat-data">
                            <span className="stat-name">Destrezza</span>
                            <span className="stat-value">{profile.destrezza}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* LA TECA MEDAGLIE */}
            <div className="card medals-section">
                <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Medal size={20} color="#f59e0b" />
                    Teca Medaglie
                </h3>
                {profile.medaglie && profile.medaglie.length > 0 ? (
                    <div className="medals-grid">
                        {profile.medaglie.map((medaglia, idx) => (
                            <div key={idx} className="medal-slot earned">
                                <img src={medaglia.immagine_url || '/pokeball-icon.svg'} alt={medaglia.nome} />
                                <span>{medaglia.nome}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-medals">
                        <div className="medal-placeholder">
                            <div className="medal-slot shadow"></div>
                            <div className="medal-slot shadow"></div>
                            <div className="medal-slot shadow"></div>
                        </div>
                        <p>Nessuna medaglia conquistata</p>
                        <span>Sconfiggi un capopalestra per ottenere la tua prima medaglia!</span>
                    </div>
                )}
            </div>

        </div>
    );
}
