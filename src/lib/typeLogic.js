export const TYPE_MAP = {
    'NORMAL': 'Normale', 'FIRE': 'Fuoco', 'WATER': 'Acqua', 'GRASS': 'Erba',
    'ELECTRIC': 'Elettro', 'ICE': 'Ghiaccio', 'FIGHTING': 'Lotta', 'POISON': 'Veleno',
    'GROUND': 'Terra', 'FLYING': 'Volante', 'PSYCHIC': 'Psico', 'BUG': 'Coleottero',
    'ROCK': 'Roccia', 'GHOST': 'Spettro', 'DRAGON': 'Drago', 'DARK': 'Buio',
    'STEEL': 'Acciaio', 'FAIRY': 'Folletto', 'SOUND': 'Suono'
};

const STANDARD_CHART = {
    'NORMAL': { 'FIGHTING': 2, 'GHOST': 0 },
    'FIRE': { 'WATER': 2, 'GROUND': 2, 'ROCK': 2, 'FIRE': 0.5, 'GRASS': 0.5, 'ICE': 0.5, 'BUG': 0.5, 'STEEL': 0.5, 'FAIRY': 0.5 },
    'WATER': { 'ELECTRIC': 2, 'GRASS': 2, 'FIRE': 0.5, 'WATER': 0.5, 'ICE': 0.5, 'STEEL': 0.5 },
    'GRASS': { 'FIRE': 2, 'ICE': 2, 'POISON': 2, 'FLYING': 2, 'BUG': 2, 'WATER': 0.5, 'ELECTRIC': 0.5, 'GRASS': 0.5, 'GROUND': 0.5 },
    'ELECTRIC': { 'GROUND': 2, 'ELECTRIC': 0.5, 'FLYING': 0.5, 'STEEL': 0.5 },
    'ICE': { 'FIRE': 2, 'FIGHTING': 2, 'ROCK': 2, 'STEEL': 2, 'ICE': 0.5 },
    'FIGHTING': { 'FLYING': 2, 'PSYCHIC': 2, 'FAIRY': 2, 'BUG': 0.5, 'ROCK': 0.5, 'DARK': 0.5 },
    'POISON': { 'GROUND': 2, 'PSYCHIC': 2, 'GRASS': 0.5, 'FIGHTING': 0.5, 'POISON': 0.5, 'BUG': 0.5, 'FAIRY': 0.5 },
    'GROUND': { 'WATER': 2, 'GRASS': 2, 'ICE': 2, 'POISON': 0.5, 'ROCK': 0.5, 'ELECTRIC': 0.0 },
    'FLYING': { 'ELECTRIC': 2, 'ICE': 2, 'ROCK': 2, 'GRASS': 0.5, 'FIGHTING': 0.5, 'BUG': 0.5, 'GROUND': 0.0 },
    'PSYCHIC': { 'BUG': 2, 'GHOST': 2, 'DARK': 2, 'FIGHTING': 0.5, 'PSYCHIC': 0.5 },
    'BUG': { 'FIRE': 2, 'FLYING': 2, 'ROCK': 2, 'GRASS': 0.5, 'FIGHTING': 0.5, 'GROUND': 0.5 },
    'ROCK': { 'WATER': 2, 'GRASS': 2, 'FIGHTING': 2, 'GROUND': 2, 'STEEL': 2, 'NORMAL': 0.5, 'FIRE': 0.5, 'POISON': 0.5, 'FLYING': 0.5 },
    'GHOST': { 'GHOST': 2, 'DARK': 2, 'POISON': 0.5, 'BUG': 0.5, 'NORMAL': 0.0, 'FIGHTING': 0.0 },
    'DRAGON': { 'ICE': 2, 'DRAGON': 2, 'FAIRY': 2, 'FIRE': 0.5, 'WATER': 0.5, 'ELECTRIC': 0.5, 'GRASS': 0.5 },
    'DARK': { 'FIGHTING': 2, 'BUG': 2, 'FAIRY': 2, 'GHOST': 0.5, 'DARK': 0.5, 'PSYCHIC': 0.0 },
    'STEEL': { 'FIRE': 2, 'FIGHTING': 2, 'GROUND': 2, 'NORMAL': 0.5, 'GRASS': 0.5, 'ICE': 0.5, 'FLYING': 0.5, 'PSYCHIC': 0.5, 'BUG': 0.5, 'ROCK': 0.5, 'DRAGON': 0.5, 'STEEL': 0.5, 'FAIRY': 0.5, 'POISON': 0.0 },
    'FAIRY': { 'POISON': 2, 'STEEL': 2, 'FIGHTING': 0.5, 'BUG': 0.5, 'DARK': 0.5, 'DRAGON': 0.0 }
};

export function calculateMatchups(itType1, itType2) {
    // Mapping inverso da IT a EN per usare la tabella standard
    const itToEn = Object.entries(TYPE_MAP).reduce((acc, [en, it]) => {
        acc[it.toUpperCase()] = en;
        return acc;
    }, {});

    const type1 = itToEn[itType1?.toUpperCase()];
    const type2 = itToEn[itType2?.toUpperCase()];
    
    const matchUps = {};
    const types = [type1, type2].filter(Boolean);

    // Init multipliers
    Object.keys(TYPE_MAP).forEach(t => { if(t !== 'SOUND') matchUps[t] = 1.0; });
    
    // Standard logic
    types.forEach(defType => {
        const chart = STANDARD_CHART[defType] || {};
        Object.entries(chart).forEach(([atkType, mult]) => {
            matchUps[atkType] *= mult;
        });
    });

    // Sound logic (Custom)
    let soundMult = 1.0;
    if (types.includes('WATER')) soundMult *= 2.0;
    if (types.includes('FAIRY')) soundMult *= 2.0;
    if (types.includes('GRASS')) soundMult *= 0.5;
    if (types.includes('ICE')) soundMult *= 0.5;
    if (types.includes('BUG')) soundMult *= 0.5;
    matchUps['SOUND'] = soundMult;

    const buckets = {
        debolezze: [],
        debolezze_x4: [],
        resistenze: [],
        resistenze_x4: [],
        immunita: []
    };

    Object.entries(matchUps).forEach(([type, mult]) => {
        const label = TYPE_MAP[type].toUpperCase();
        if (mult >= 4) buckets.debolezze_x4.push(label);
        else if (mult >= 2) buckets.debolezze.push(label);
        else if (mult === 0) buckets.immunita.push(label);
        else if (mult <= 0.25) buckets.resistenze_x4.push(label);
        else if (mult <= 0.5) buckets.resistenze.push(label);
    });

    // Restituiamo le stringhe separate da virgola come vuole il frontend
    return {
        debolezze: buckets.debolezze.join(', '),
        debolezze_x4: buckets.debolezze_x4.join(', '),
        resistenze: buckets.resistenze.join(', '),
        resistenze_x4: buckets.resistenze_x4.join(', '),
        immunita: buckets.immunita.join(', ')
    };
}
