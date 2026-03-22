import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Map, Users, Swords, LogOut, LayoutDashboard, Copy } from 'lucide-react';
import { supabase } from '../lib/supabase';
import './MasterLayout.css';

const NAV_ITEMS = [
    { path: '/menu', icon: <LayoutDashboard size={22} />, label: 'Dashboard' },
    { path: '/master/campagna', icon: <Map size={22} />, label: 'Campagna' },
    { path: '/master/party', icon: <Users size={22} />, label: 'Party' },
    { path: '/master/battaglia', icon: <Swords size={22} />, label: 'Battaglia' },
];

export default function MasterLayout() {
    const { profile, signOut } = useAuth();
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
