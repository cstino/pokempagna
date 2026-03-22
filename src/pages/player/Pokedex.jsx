import { useState } from 'react';
import { Search, Info, Zap, Shield, Heart, Weight, Ruler, ChevronRight, BookOpen, Loader2 } from 'lucide-react';
import './Pokedex.css';

// 🧪 DATI DI PROVA (In attesa del tuo DB ufficiale)
const MOCK_POKEDEX = [
    {
        id: 1,
        nome: "Bulbasaur",
        tipo: ["Erba", "Veleno"],
        stats: { hp: 45, atk: 49, def: 49, spatk: 65, spdef: 65, speed: 45 },
        descrizione: "Una strana semente è stata piantata sul suo dorso alla nascita. La pianta germoglia e cresce con lui.",
        altezza: "0.7m",
        peso: "6.9kg",
        immagine: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png"
    },
    {
        id: 4,
        nome: "Charmander",
        tipo: ["Fuoco"],
        stats: { hp: 39, atk: 52, def: 43, spatk: 60, spdef: 50, speed: 65 },
        descrizione: "Preferisce le cose calde. Si dice che quando piove gli esca vapore dalla punta della coda.",
        altezza: "0.6m",
        peso: "8.5kg",
        immagine: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png"
    },
    {
        id: 7,
        nome: "Squirtle",
        tipo: ["Acqua"],
        stats: { hp: 44, atk: 48, def: 65, spatk: 50, spdef: 64, speed: 43 },
        descrizione: "Dopo la nascita il suo dorso si gonfia e si indurisce diventando un guscio. Germoglia schiuma dalla bocca.",
        altezza: "0.5m",
        peso: "9.0kg",
        immagine: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png"
    },
    {
        id: 25,
        nome: "Pikachu",
        tipo: ["Elettro"],
        stats: { hp: 35, atk: 55, def: 40, spatk: 50, spdef: 50, speed: 90 },
        descrizione: "Quando diversi di questi POKéMON si radunano, la loro elettricità può causare tempeste di fulmini.",
        altezza: "0.4m",
        peso: "6.0kg",
        immagine: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png"
    }
];

export default function Pokedex() {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedPkmn, setSelectedPkmn] = useState(null);

    const filteredPkmn = MOCK_POKEDEX.filter(p =>
        p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.tipo.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getTypeColor = (tipo) => {
        const colors = {
            'Erba': '#10b981',
            'Fuoco': '#ef4444',
            'Acqua': '#3b82f6',
            'Elettro': '#f59e0b',
            'Veleno': '#a855f7',
            'Normale': '#9ca3af'
        };
        return colors[tipo] || '#9ca3af';
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

            {/* GRIGLIA POKEMON */}
            <div className="pokedex-grid">
                {filteredPkmn.map((pkmn) => (
                    <div
                        key={pkmn.id}
                        className="pkmn-card"
                        onClick={() => setSelectedPkmn(pkmn)}
                    >
                        <div className="pkmn-id">#{String(pkmn.id).padStart(3, '0')}</div>
                        <div className="pkmn-image-container">
                            <img src={pkmn.image || pkmn.immagine} alt={pkmn.nome} className="pkmn-image" />
                        </div>
                        <div className="pkmn-card-details">
                            <h3>{pkmn.nome}</h3>
                            <div className="pkmn-types">
                                {pkmn.tipo.map(t => (
                                    <span key={t} style={{ backgroundColor: getTypeColor(t) }} className="type-badge">{t}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* MODALE DETTAGLI (Premium Look) */}
            {selectedPkmn && (
                <div className="modal-overlay" onClick={() => setSelectedPkmn(null)}>
                    <div className="modal-content pkmn-detail-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-pkmn-bg" style={{ backgroundColor: getTypeColor(selectedPkmn.tipo[0]) + '22' }}>
                            <button className="modal-close-btn" onClick={() => setSelectedPkmn(null)}>✕</button>
                            <img src={selectedPkmn.immagine} alt={selectedPkmn.nome} className="modal-pkmn-img" />
                        </div>

                        <div className="modal-pkmn-body">
                            <div className="modal-pkmn-header">
                                <span className="modal-pkmn-id">#{String(selectedPkmn.id).padStart(3, '0')}</span>
                                <h2>{selectedPkmn.nome}</h2>
                                <div className="pkmn-types-modal">
                                    {selectedPkmn.tipo.map(t => (
                                        <span key={t} style={{ backgroundColor: getTypeColor(t) }} className="type-badge large">{t}</span>
                                    ))}
                                </div>
                            </div>

                            <p className="pkmn-flavor-text">{selectedPkmn.descrizione}</p>

                            <div className="pkmn-info-row">
                                <div className="info-box">
                                    <Ruler size={16} />
                                    <span>{selectedPkmn.altezza}</span>
                                    <label>Altezza</label>
                                </div>
                                <div className="info-box">
                                    <Weight size={16} />
                                    <span>{selectedPkmn.peso}</span>
                                    <label>Peso</label>
                                </div>
                            </div>

                            <div className="stats-container">
                                <h4 className="stats-title">Statistiche Base</h4>
                                {Object.entries(selectedPkmn.stats).map(([key, val]) => (
                                    <div key={key} className="stat-row">
                                        <span className="stat-name">{key.toUpperCase()}</span>
                                        <span className="stat-val">{val}</span>
                                        <div className="stat-bar-bg">
                                            <div
                                                className="stat-bar-fill"
                                                style={{
                                                    width: `${(val / 150) * 100}%`,
                                                    backgroundColor: getTypeColor(selectedPkmn.tipo[0])
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
