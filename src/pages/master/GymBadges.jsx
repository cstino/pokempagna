import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Medal, Users, Loader2, Search, CheckCircle2, Trophy } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import './GymBadges.css';

const ALL_TYPES = [
    'normale', 'fuoco', 'acqua', 'erba', 'elettro', 
    'ghiaccio', 'lotta', 'veleno', 'terra', 'volante', 
    'psico', 'coleottero', 'roccia', 'spettro', 'drago', 
    'buio', 'acciaio', 'folletto', 'suono', 'sconosciuto'
];

export default function GymBadges() {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [search, setSearch] = useState('');
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchPlayers();
    }, []);

    const fetchPlayers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('giocatori')
            .select('*')
            .eq('ruolo', 'giocatore')
            .order('nome');
        
        if (!error) setPlayers(data);
        setLoading(false);
    };

    const toggleBadge = async (type) => {
        if (!selectedPlayer || updating) return;
        
        setUpdating(true);
        const currentMedals = selectedPlayer.medaglie || [];
        let newMedals;
        
        if (currentMedals.includes(type)) {
            newMedals = currentMedals.filter(m => m !== type);
        } else {
            newMedals = [...currentMedals, type];
        }

        const { error } = await supabase
            .from('giocatori')
            .update({ medaglie: newMedals })
            .eq('id', selectedPlayer.id);

        if (!error) {
            setSelectedPlayer({ ...selectedPlayer, medaglie: newMedals });
            setPlayers(players.map(p => p.id === selectedPlayer.id ? { ...p, medaglie: newMedals } : p));
        }
        setUpdating(false);
    };

    const filteredPlayers = players.filter(p => 
        p.nome.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return (
        <div className="gym-badges-page flex-center">
            <Loader2 className="spin" size={40} color="var(--accent-primary)" />
            <p style={{ marginTop: '16px' }}>Caricamento Allenatori...</p>
        </div>
    );

    return (
        <div className="gym-badges-page animate-fade-in">
            <div className="gym-header">
                <div className="gym-header-title">
                    <Trophy size={32} color="#f59e0b" />
                    <h1>Gestione Medaglie Lega</h1>
                </div>
                <p>Assegna o revoca le medaglie elementali ai partecipanti della campagna.</p>
            </div>

            <div className="gym-content">
                {/* Sidebar Giocatori */}
                <div className="gym-players-sidebar card">
                    <div className="search-box-badges">
                        <Search size={18} />
                        <input 
                            type="text" 
                            placeholder="Cerca allenatore..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="players-list-badges">
                        {filteredPlayers.map(p => (
                            <div 
                                key={p.id} 
                                className={`player-badge-item ${selectedPlayer?.id === p.id ? 'active' : ''}`}
                                onClick={() => setSelectedPlayer(p)}
                            >
                                <div className="player-badge-info">
                                    <span className="p-name">{p.nome}</span>
                                    <span className="p-count">Medaglie: {p.medaglie?.length || 0}/20</span>
                                </div>
                                {p.medaglie?.length === 20 && <CheckCircle2 size={16} color="#34d399" />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pannello Gestione Medaglie */}
                <div className="gym-main-panel card">
                    {selectedPlayer ? (
                        <div className="selected-player-view">
                            <div className="player-summary-header">
                                <div className="p-avatar-placeholder">
                                    {selectedPlayer.immagine_profilo ? (
                                        <img src={selectedPlayer.immagine_profilo} alt={selectedPlayer.nome} />
                                    ) : (
                                        <Users size={32} />
                                    )}
                                </div>
                                <div className="p-meta">
                                    <h2>{selectedPlayer.nome}</h2>
                                    <div className="p-progress-bar-container">
                                        <div className="p-progress-bar-fill" style={{ width: `${(selectedPlayer.medaglie?.length || 0) / 20 * 100}%` }} />
                                    </div>
                                    <span>{selectedPlayer.medaglie?.length || 0} su 20 medaglie conquistate</span>
                                </div>
                            </div>

                            <div className="master-medals-grid">
                                {ALL_TYPES.map(type => (
                                    <div 
                                        key={type} 
                                        className={`badge-toggle-wrapper ${selectedPlayer.medaglie?.includes(type) ? 'earned' : 'locked'} ${updating ? 'updating' : ''}`}
                                        onClick={() => toggleBadge(type)}
                                    >
                                        <Badge 
                                            type={type} 
                                            isEarned={selectedPlayer.medaglie?.includes(type)} 
                                            size="md" 
                                        />
                                        <div className="toggle-status-indicator">
                                            {selectedPlayer.medaglie?.includes(type) ? 'CONQUISTATA' : 'DA ASSEGNARE'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="no-player-selected">
                            <Medal size={64} opacity={0.1} />
                            <p>Seleziona un allenatore dalla lista <br/> per gestire le sue medaglie.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
