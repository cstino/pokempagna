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
    if (!type) return '';
    return TYPE_COLORS[type.toLowerCase()]?.label || type;
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
    normal: { rock: 0.625, ghost: 0.1, steel: 0.625 },
    fire: { fire: 0.625, water: 0.625, grass: 1.666, ice: 1.666, bug: 1.666, rock: 0.625, dragon: 0.625, steel: 1.666 },
    water: { fire: 1.666, water: 0.625, grass: 0.625, ground: 1.666, rock: 1.666, dragon: 0.625 },
    electric: { water: 1.666, electric: 0.625, grass: 0.625, ground: 0.1, flying: 1.666, dragon: 0.625 },
    grass: { fire: 0.625, water: 1.666, grass: 0.625, poison: 0.625, ground: 1.666, flying: 0.625, bug: 0.625, rock: 1.666, dragon: 0.625, steel: 0.625 },
    ice: { fire: 0.625, water: 0.625, grass: 1.666, ice: 0.625, ground: 1.666, flying: 1.666, dragon: 1.666, steel: 0.625 },
    fighting: { normal: 1.666, ice: 1.666, poison: 0.625, flying: 0.625, psychic: 0.625, bug: 0.625, rock: 1.666, ghost: 0.1, dark: 1.666, steel: 1.666, fairy: 0.625 },
    poison: { grass: 1.666, poison: 0.625, ground: 0.625, rock: 0.625, ghost: 0.625, steel: 0.1, fairy: 1.666 },
    ground: { fire: 1.666, electric: 1.666, grass: 0.625, poison: 1.666, flying: 0.1, bug: 0.625, rock: 1.666, steel: 1.666 },
    flying: { electric: 0.625, grass: 1.666, fighting: 1.666, bug: 1.666, rock: 0.625, steel: 0.625 },
    psychic: { fighting: 1.666, poison: 1.666, psychic: 0.625, dark: 0.1, steel: 0.625 },
    bug: { fire: 0.625, grass: 1.666, fighting: 0.625, poison: 0.625, flying: 0.625, psychic: 1.666, ghost: 0.625, dark: 1.666, steel: 0.625, fairy: 0.625 },
    rock: { fire: 1.666, ice: 1.666, fighting: 0.625, ground: 0.625, flying: 1.666, bug: 1.666, steel: 0.625 },
    ghost: { normal: 0.1, psychic: 1.666, ghost: 1.666, dark: 0.625 },
    dragon: { dragon: 1.666, steel: 0.625, fairy: 0.1 },
    dark: { fighting: 0.625, psychic: 1.666, ghost: 1.666, dark: 0.625, fairy: 0.625 },
    steel: { fire: 0.625, water: 0.625, electric: 0.625, ice: 1.666, rock: 1.666, steel: 0.625, fairy: 1.666 },
    fairy: { fire: 0.625, fighting: 1.666, poison: 0.625, dragon: 1.666, dark: 1.666, steel: 0.625 },
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
