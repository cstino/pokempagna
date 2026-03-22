import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, Book, Backpack, Star, Swords } from 'lucide-react';
import './PlayerLayout.css';

const NAV_ITEMS = [
    { path: '/player/profilo', icon: <User size={22} />, label: 'Profilo' },
    { path: '/player/pokedex', icon: <Book size={22} />, label: 'Pokédex' },
    { path: '/player/zaino', icon: <Backpack size={22} />, label: 'Zaino' },
    { path: '/player/squadra', icon: <Star size={22} />, label: 'Squadra' },
    { path: '/player/combat', icon: <Swords size={22} />, label: 'Combat' },
];

export default function PlayerLayout() {
    const { profile, signOut } = useAuth();

    return (
        <div className="player-layout">
            <nav className="player-navbar">
                <div className="player-navbar-inner">
                    {NAV_ITEMS.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `player-nav-item ${isActive ? 'active' : ''}`
                            }
                        >
                            <span className="player-nav-icon">{item.icon}</span>
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </div>
            </nav>

            <main className="player-content">
                <Outlet />
            </main>
        </div>
    );
}
