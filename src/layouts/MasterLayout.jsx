import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Map, Users, Swords, LogOut, LayoutDashboard, Copy, Sun, Moon, User as UserIcon, Heart, Package, Zap, Play, Medal, ArrowLeftRight } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import PokeballLogo from '../components/PokeballLogo';
import './MasterLayout.css';

const NAV_ITEMS = [
    { path: '/menu', icon: <LayoutDashboard size={22} />, label: 'Dashboard' },
    { path: '/master/campagna', icon: <Map size={22} />, label: 'Campagna' },
    { path: '/master/party', icon: <Users size={22} />, label: 'Party' },
    { path: '/master/npc', icon: <UserIcon size={22} />, label: 'NPC' },
    { path: '/master/pokemon', icon: <Heart size={22} />, label: 'Pokémon' },
    { path: '/master/oggetti', icon: <Package size={22} />, label: 'Oggetti' },
    { path: '/master/mosse', icon: <Zap size={22} />, label: 'Mosse' },
    { path: '/master/medaglie', icon: <Medal size={22} />, label: 'Medaglie' },
    { path: '/master/scambi', icon: <ArrowLeftRight size={22} />, label: 'Scambi' },
    { path: '/master/battaglia', icon: <Swords size={22} />, label: 'Battaglia' },
    { path: '/master/test-anim', icon: <Play size={22} />, label: 'Test Animazioni' },
];

export default function MasterLayout() {
    const { profile, signOut } = useAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const [campagna, setCampagna] = useState(null);

    useEffect(() => {
        async function loadCampagna() {
            if (!profile?.campagna_corrente_id) return;
            const { data } = await supabase
                .from('campagne')
                .select('nome, codice_invito')
                .eq('id', profile.campagna_corrente_id)
                .single();
            if (data) setCampagna(data);
        }
        loadCampagna();
    }, [profile?.campagna_corrente_id]);

    const copiaCodice = () => {
        if (campagna?.codice_invito) {
            navigator.clipboard.writeText(campagna.codice_invito);
            // Si può aggiungere un toast visivo in futuro, per ora clipboard + animazione hover
        }
    };

    return (
        <div className="master-layout">
            <aside className="master-sidebar">
                <div className="master-sidebar-header">
                    <PokeballLogo size={32} animated={false} />
                    <div className="master-sidebar-logo">POKÉMPAGNA</div>
                    <div className="master-sidebar-badge">👑 Master</div>
                </div>

                {campagna && (
                    <div className="sidebar-campaign-info" onClick={copiaCodice} title="Copia Codice Invito">
                        <span className="sci-label">Codice Invito</span>
                        <div className="sci-code-container">
                            <span className="sci-code">{campagna.codice_invito}</span>
                            <Copy size={14} className="sci-copy-icon" />
                        </div>
                    </div>
                )}

                <nav className="master-nav">
                    {NAV_ITEMS.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `master-nav-item ${isActive ? 'active' : ''}`
                            }
                        >
                            <span className="master-nav-icon">{item.icon}</span>
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="master-sidebar-footer">
                    <button className="theme-toggle-btn-master" onClick={toggleTheme}>
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                        <span>Tema {isDarkMode ? 'Chiaro' : 'Scuro'}</span>
                    </button>
                    <button className="master-logout-btn" onClick={signOut}>
                        <LogOut size={20} />
                        <span>Esci</span>
                    </button>
                </div>
            </aside>

            <main className="master-content">
                <Outlet />
            </main>
        </div>
    );
}
