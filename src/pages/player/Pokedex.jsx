import { useState, useEffect } from 'react';
import { Search, Info, Zap, Shield, Heart, Weight, Ruler, ChevronRight, BookOpen, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import PokeballLogo from '../../components/PokeballLogo';
import './Pokedex.css';

export default function Pokedex() {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPkmn, setSelectedPkmn] = useState(null);
    const [pokemon, setPokemon] = useState([]);
    const [loading, setLoading] = useState(true);
    const [caughtIds, setCaughtIds] = useState(new Set());

    useEffect(() => {
        caricaPokedex();
    }, []);

    async function caricaPokedex() {
        setLoading(true);
        try {
            // 1. Carica lista pokemon visibili
            const { data, error } = await supabase
                .from('pokemon_campagna')
                .select('*')
                .eq('visibile_pokedex', true)
                .order('id', { ascending: true });

            if (error) throw error;
            setPokemon(data || []);

            // 2. Carica catture dell'utente
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Proviamo a leggere dallo storico (tabella definitiva)
                const { data: historyData, error: historyError } = await supabase
                    .from('pokedex_catturati')
                    .select('pokemon_id')
                    .eq('giocatore_id', user.id);

                if (!historyError && historyData) {
                    setCaughtIds(new Set(historyData.map(c => c.pokemon_id)));
                } else {
                    // Fallback sulla squadra attuale se la tabella storica non esiste ancora
                    const { data: teamData } = await supabase
                        .from('pokemon_giocatore')
                        .select('pokemon_id')
                        .eq('giocatore_id', user.id);

                    if (teamData) {
                        setCaughtIds(new Set(teamData.map(c => c.pokemon_id)));
                    }
                }
            }
        } catch (err) {
            console.error("Errore caricamento Pokedex:", err);
            setPokemon([]);
        } finally {
            setLoading(false);
        }
    }

    const filteredPkmn = pokemon.filter(p =>
        p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.tipo1 && p.tipo1.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.tipo2 && p.tipo2.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getTypeColor = (tipo) => {
        if (!tipo) return '#9ca3af';
        const t = tipo.toUpperCase();
        const colors = {
            'ERBA': '#10b981',
            'FUOCO': '#ef4444',
            'ACQUA': '#3b82f6',
            'ELETTRO': '#f59e0b',
            'VELENO': '#a855f7',
            'NORMALE': '#9ca3af',
            'GHIACCIO': '#bae6fd',
            'LOTTA': '#b91c1c',
            'TERRA': '#d97706',
            'VOLANTE': '#6366f1',
            'PSICO': '#ec4899',
            'COLEOTTERO': '#84cc16',
            'ROCCIA': '#78350f',
            'SPETTRO': '#4c1d95',
            'DRAGO': '#1e3a8a',
            'BUIO': '#111827',
            'ACCIAIO': '#4b5563',
            'FOLLETTO': '#f472b6'
        };
        return colors[t] || '#9ca3af';
    };

    return (
        <div className="pokedex-page animate-fade-in">
            {/* INTESTAZIONE E RICERCA */}
            <header className="pokedex-header">
                <div className="header-text">
                    <h1 className="page-title">
                        <BookOpen size={32} color="#3b82f6" />
                        Pokédex Nazionale
                    </h1>
                    <p className="page-subtitle">Enciclopedia dei Pokémon della Campagna</p>
                </div>
                <div className="search-bar-container">
                    <Search className="search-icon" size={20} />
                    <input
                        type="text"
                        placeholder="Cerca per nome o tipo..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </header>

            {loading ? (
                <div className="flex-center p-xl"><Loader2 className="spin" size={40} /></div>
            ) : (
                <>
                    {/* GRIGLIA POKEMON */}
                    <div className="pokedex-grid">
                        {filteredPkmn.length === 0 ? (
                            <div className="empty-pokedex-msg">
                                <Info size={40} opacity={0.3} />
                                <p>Nessun Pokémon scoperto in questo habitat...</p>
                            </div>
                        ) : (
                            filteredPkmn.map((pkmn) => (
                                <div
                                    key={pkmn.id}
                                    className={`pkmn-card ${caughtIds.has(pkmn.id) ? 'is-caught' : 'not-caught'}`}
                                    onClick={() => setSelectedPkmn(pkmn)}
                                >
                                    <div className="pkmn-id">#{String(pkmn.id).padStart(3, '0')}</div>
                                    <div className="capture-status">
                                        <PokeballLogo size={24} animated={false} grayscale={!caughtIds.has(pkmn.id)} />
                                    </div>
                                    <div className="pkmn-image-container">
                                        <img 
                                            src={pkmn.immagine_url?.includes('sprites/pokemon/') && !pkmn.immagine_url.includes('other/official-artwork') 
                                                ? pkmn.immagine_url.replace('sprites/pokemon/', 'sprites/pokemon/other/official-artwork/') 
                                                : pkmn.immagine_url} 
                                            alt={pkmn.nome} 
                                            className="pkmn-image" 
                                        />
                                    </div>
                                    <div className="pkmn-card-details">
                                        <h3>{pkmn.nome.toUpperCase()}</h3>
                                        <div className="pkmn-types">
                                            <span style={{ backgroundColor: getTypeColor(pkmn.tipo1) }} className="type-badge">{pkmn.tipo1}</span>
                                            {pkmn.tipo2 && <span style={{ backgroundColor: getTypeColor(pkmn.tipo2) }} className="type-badge">{pkmn.tipo2}</span>}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {/* MODALE DETTAGLI (Premium Look) */}
            {selectedPkmn && (
                <div className="modal-overlay" onClick={() => setSelectedPkmn(null)}>
                    <div className="modal-content pkmn-detail-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-pkmn-bg" style={{ backgroundColor: getTypeColor(selectedPkmn.tipo1) + '22' }}>
                            <button className="modal-close-btn" onClick={() => setSelectedPkmn(null)}>✕</button>
                            <img 
                                src={(selectedPkmn.immagine_url || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${selectedPkmn.id}.png`).includes('sprites/pokemon/') && !(selectedPkmn.immagine_url || '').includes('other/official-artwork') 
                                    ? (selectedPkmn.immagine_url || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${selectedPkmn.id}.png`).replace('sprites/pokemon/', 'sprites/pokemon/other/official-artwork/') 
                                    : (selectedPkmn.immagine_url || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${selectedPkmn.id}.png`)} 
                                alt={selectedPkmn.nome} 
                                className="modal-pkmn-img" 
                            />
                        </div>

                        <div className="modal-pkmn-body">
                            <div className="modal-pkmn-header">
                                <div className="modal-header-top">
                                    <span className="modal-pkmn-id">#{String(selectedPkmn.id).padStart(3, '0')}</span>
                                    <div className="modal-capture-status">
                                        <PokeballLogo size={32} animated={true} grayscale={!caughtIds.has(selectedPkmn.id)} />
                                    </div>
                                </div>
                                <h2>{selectedPkmn.nome.toUpperCase()}</h2>
                                <div className="pkmn-types-modal">
                                    <span style={{ backgroundColor: getTypeColor(selectedPkmn.tipo1) }} className="type-badge large">{selectedPkmn.tipo1}</span>
                                    {selectedPkmn.tipo2 && <span style={{ backgroundColor: getTypeColor(selectedPkmn.tipo2) }} className="type-badge large">{selectedPkmn.tipo2}</span>}
                                </div>
                            </div>

                            <p className="pkmn-flavor-text">{selectedPkmn.descrizione || 'Nessuna descrizione disponibile.'}</p>

                            <div className="stats-container">
                                <h4 className="stats-title">Statistiche Base</h4>
                                {[
                                    { label: 'HP', val: selectedPkmn.hp_base },
                                    { label: 'ATK', val: selectedPkmn.atk_base },
                                    { label: 'DEF', val: selectedPkmn.def_base },
                                    { label: 'SP. ATK', val: selectedPkmn.spatk_base },
                                    { label: 'SP. DEF', val: selectedPkmn.spdef_base },
                                    { label: 'SPEED', val: selectedPkmn.speed_base }
                                ].map((s) => (
                                    <div key={s.label} className="stat-row">
                                        <span className="stat-name">{s.label}</span>
                                        <span className="stat-val">{s.val}</span>
                                        <div className="stat-bar-bg">
                                            <div
                                                className="stat-bar-fill"
                                                style={{
                                                    width: `${Math.min(100, (s.val / 150) * 100)}%`,
                                                    backgroundColor: getTypeColor(selectedPkmn.tipo1)
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
