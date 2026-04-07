/**
 * Calcola le statistiche di un Pokémon in base alla formula ufficiale compressa (Scala 1-20).
 * 
 * Formula HP: floor((((2 * Base + IV + floor(EV/4)) * Livello) / 20) + Livello + 10)
 * Altre Stat: floor((((2 * Base + IV + floor(EV/4)) * Livello) / 20) + 5)
 * 
 * @param {Object} baseStats - { hp_base, atk_base, def_base, spatk_base, spdef_base, speed_base }
 * @param {number} level - Livello attuale (1-20)
 * @param {Object} evs - { hp, attacco, difesa, attacco_speciale, difesa_speciale, velocita } (default 0)
 * @param {Object} ivs - { hp, attacco, difesa, attacco_speciale, difesa_speciale, velocita } (default 15)
 * @returns {Object} Statistiche finali calcolate
 */
export function calculatePokemonStats(baseStats, level, evs = {}, ivs = {}) {
    const calc = (base, ev = 0, iv = 15, isHp = false) => {
        const inner = (2 * base + iv + Math.floor(ev / 4)) * level;
        const result = Math.floor(inner / 20); // Scala compressa Level/20 invece di Level/100
        
        if (isHp) {
            return result + level + 10;
        }
        return result + 5;
    };

    return {
        hp_max: calc(baseStats.hp_base, evs.hp, ivs.hp, true),
        attacco: calc(baseStats.atk_base, evs.attacco, ivs.attacco),
        difesa: calc(baseStats.def_base, evs.difesa, ivs.difesa),
        attacco_speciale: calc(baseStats.spatk_base, evs.attacco_speciale, ivs.attacco_speciale),
        difesa_speciale: calc(baseStats.spdef_base, evs.difesa_speciale, ivs.difesa_speciale),
        velocita: calc(baseStats.speed_base, evs.velocita, ivs.velocita)
    };
}
