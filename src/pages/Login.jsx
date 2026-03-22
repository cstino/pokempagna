import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Lock } from 'lucide-react';
import './Login.css';

export default function Login() {
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nome, setNome] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { signIn, signUp } = useAuth();

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isSignUp) {
                await signUp(email, password, nome);
            } else {
                await signIn(email, password);
            }
            // Navigation will be handled by auth state change in App.jsx
        } catch (err) {
            setError(err.message || 'Errore durante l\'accesso');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-page">
            {/* Animated Background */}
            <div className="login-bg" />

            <div className="login-container">
                <div className="login-card">
                    {/* Header */}
                    <div className="login-header">
                        <div className="login-pokeball">
                            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <linearGradient id="pokeball-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#EF4444" />
                                        <stop offset="100%" stopColor="#DC2626" />
                                    </linearGradient>
                                </defs>
                                <circle cx="50" cy="50" r="48" fill="none" stroke="#333" strokeWidth="3" />
                                <path d="M 2 50 A 48 48 0 0 1 98 50" fill="url(#pokeball-grad)" />
                                <path d="M 2 50 A 48 48 0 0 0 98 50" fill="#f5f5f5" />
                                <line x1="2" y1="50" x2="98" y2="50" stroke="#333" strokeWidth="3" />
                                <circle cx="50" cy="50" r="14" fill="#f5f5f5" stroke="#333" strokeWidth="3" />
                                <circle cx="50" cy="50" r="8" fill="#333" />
                                <circle cx="50" cy="50" r="5" fill="#666">
                                    <animate attributeName="fill" values="#666;#818CF8;#666" dur="3s" repeatCount="indefinite" />
                                </circle>
                            </svg>
                        </div>
                        <h1 className="login-logo">POKÉMPAGNA</h1>
                        <p className="login-subtitle">Companion App — Sessione RPG</p>
                    </div>

                    {/* Form */}
                    <form className="login-form" onSubmit={handleSubmit}>
                        {isSignUp && (
                            <div className="form-group">
                                <label className="form-label" htmlFor="nome">
                                    <User size={16} style={{ display: 'inline', marginRight: '6px' }} />
                                    Nome Allenatore
                                </label>
                                <input
                                    id="nome"
                                    className="form-input"
                                    type="text"
                                    placeholder="Il tuo nome..."
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label" htmlFor="email">
                                <Mail size={16} style={{ display: 'inline', marginRight: '6px' }} />
                                Email
                            </label>
                            <input
                                id="email"
                                className="form-input"
                                type="email"
                                placeholder="email@esempio.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="password">
                                <Lock size={16} style={{ display: 'inline', marginRight: '6px' }} />
                                Password
                            </label>
                            <input
                                id="password"
                                className="form-input"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>

                        {error && <div className="login-error">{error}</div>}

                        <button
                            type="submit"
                            className="login-btn"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="spinner" />
                            ) : isSignUp ? (
                                'Crea Account'
                            ) : (
                                'Accedi'
                            )}
                        </button>
                    </form>

                    {/* Toggle */}
                    <div className="login-toggle">
                        <span>{isSignUp ? 'Hai già un account?' : 'Nuovo allenatore?'}</span>
                        <button onClick={() => { setIsSignUp(!isSignUp); setError(''); }}>
                            {isSignUp ? 'Accedi' : 'Registrati'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
