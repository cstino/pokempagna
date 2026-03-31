// Type color mapping for Pokémon types
// Returns CSS variable name or direct hex

export const TYPE_COLORS = {
    normal: { color: '#6B7280', label: 'Normale', emoji: '⚪' },
    normale: { color: '#6B7280', label: 'Normale', emoji: '⚪' },
    fire: { color: '#EF4444', label: 'Fuoco', emoji: '🔥' },
    fuoco: { color: '#EF4444', label: 'Fuoco', emoji: '🔥' },
    water: { color: '#3B82F6', label: 'Acqua', emoji: '💧' },
    acqua: { color: '#3B82F6', label: 'Acqua', emoji: '💧' },
    electric: { color: '#F59E0B', label: 'Elettro', emoji: '⚡' },
    elettro: { color: '#F59E0B', label: 'Elettro', emoji: '⚡' },
    grass: { color: '#10B981', label: 'Erba', emoji: '🌿' },
    erba: { color: '#10B981', label: 'Erba', emoji: '🌿' },
    ice: { color: '#06B6D4', label: 'Ghiaccio', emoji: '❄️' },
    ghiaccio: { color: '#06B6D4', label: 'Ghiaccio', emoji: '❄️' },
    fighting: { color: '#DC2626', label: 'Lotta', emoji: '🥊' },
    lotta: { color: '#DC2626', label: 'Lotta', emoji: '🥊' },
    poison: { color: '#8B5CF6', label: 'Veleno', emoji: '☠️' },
    veleno: { color: '#8B5CF6', label: 'Veleno', emoji: '☠️' },
    ground: { color: '#92400E', label: 'Terra', emoji: '🌍' },
    terra: { color: '#92400E', label: 'Terra', emoji: '🌍' },
    flying: { color: '#818CF8', label: 'Volante', emoji: '🦅' },
    volante: { color: '#818CF8', label: 'Volante', emoji: '🦅' },
    psychic: { color: '#EC4899', label: 'Psico', emoji: '🔮' },
    psico: { color: '#EC4899', label: 'Psico', emoji: '🔮' },
    bug: { color: '#84CC16', label: 'Coleottero', emoji: '🐛' },
    coleottero: { color: '#84CC16', label: 'Coleottero', emoji: '🐛' },
    rock: { color: '#A16207', label: 'Roccia', emoji: '🪨' },
    roccia: { color: '#A16207', label: 'Roccia', emoji: '🪨' },
    ghost: { color: '#7C3AED', label: 'Spettro', emoji: '👻' },
    spettro: { color: '#7C3AED', label: 'Spettro', emoji: '👻' },
    dragon: { color: '#6366F1', label: 'Drago', emoji: '🐉' },
    drago: { color: '#6366F1', label: 'Drago', emoji: '🐉' },
    dark: { color: '#374151', label: 'Buio', emoji: '🌑' },
    buio: { color: '#374151', label: 'Buio', emoji: '🌑' },
    steel: { color: '#94A3B8', label: 'Acciaio', emoji: '⚙️' },
    acciaio: { color: '#94A3B8', label: 'Acciaio', emoji: '⚙️' },
    fairy: { color: '#F472B6', label: 'Folletto', emoji: '🧚' },
    folletto: { color: '#F472B6', label: 'Folletto', emoji: '🧚' },
    sound: { color: '#00E5FF', label: 'Suono' },
    suono: { color: '#00E5FF', label: 'Suono' },
    unknown: { color: '#333333', label: 'Sconosciuto' },
    sconosciuto: { color: '#333333', label: 'Sconosciuto' },
};

export function getTypeColor(type) {
    return TYPE_COLORS[type?.toLowerCase()]?.color || TYPE_COLORS.normal.color;
}

export function getTypeLabel(type) {
    return TYPE_COLORS[type?.toLowerCase()]?.label || 'Normale';
}

export function getTypeEmoji(type) {
    return TYPE_COLORS[type?.toLowerCase()]?.emoji || '⚪';
}

export function getTypeIcon(type) {
    const normalized = type?.toLowerCase();
    if (!normalized) return '';

    // Custom types with reliable UNPKG links
    if (normalized === 'suono') return 'https://unpkg.com/lucide-static@0.294.0/icons/music.svg';
    if (normalized === 'sconosciuto' || normalized === 'unknown') return 'https://unpkg.com/lucide-static@0.294.0/icons/help-circle.svg';

    // Standard types from the pokemon-type-svg-icons repo
    const map = {
        fuoco: 'fire', acqua: 'water', erba: 'grass',
        elettro: 'electric', ghiaccio: 'ice', lotta: 'fighting', veleno: 'poison',
        terra: 'ground', volante: 'flying', psico: 'psychic', coleottero: 'bug',
        roccia: 'rock', spettro: 'ghost', drago: 'dragon', acciaio: 'steel',
        folletto: 'fairy', buio: 'dark', normale: 'normal'
    };

    const remoteName = map[normalized] || normalized;
    return `https://raw.githubusercontent.com/duiker101/pokemon-type-svg-icons/master/icons/${remoteName}.svg`;
}

// Get HP bar color based on percentage
export function getHpColor(current, max) {
    const pct = (current / max) * 100;
    if (pct > 50) return '#10B981';
    if (pct > 25) return '#F59E0B';
    return '#EF4444';
}

// Type effectiveness chart (simplified)
export const TYPE_CHART = {
    normal: { rock: 0.5, ghost: 0, steel: 0.5 },
    fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
    water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
    electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
    grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
    ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
    fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
    poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
    ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
    flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
    psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
    bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
    rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
    ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
    dragon: { dragon: 2, steel: 0.5, fairy: 0 },
    dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
    steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
    fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};

export function getTypeMultiplier(attackType, defenseTypes) {
    let multiplier = 1;
    const chart = TYPE_CHART[attackType?.toLowerCase()];
    if (!chart) return 1;

    for (const defType of defenseTypes) {
        const mod = chart[defType?.toLowerCase()];
        if (mod !== undefined) {
            multiplier *= mod;
        }
    }
    return multiplier;
}
