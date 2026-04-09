/**
 * Calcola le statistiche di un Pokémon in base alla formula ufficiale (Scala 1-20 -> Real Level 12-50).
 * 
 * Formula HP: floor((((2 * Base + IV + floor(EV/4)) * RealLevel) / 100) + RealLevel + 10)
 * Altre Stat: floor((((2 * Base + IV + floor(EV/4)) * RealLevel) / 100) + 5)
 * 
 * Dove RealLevel = (Level * 2) + 10
 * 
 * @param {Object} baseStats - { hp_base, atk_base, def_base, spatk_base, spdef_base, speed_base }
 * @param {number} level - Livello attuale (1-20)
 * @param {Object} evs - { hp, attacco, difesa, attacco_speciale, difesa_speciale, velocita } (default 0)
 * @param {Object} ivs - { hp, attacco, difesa, attacco_speciale, difesa_speciale, velocita } (default 15)
 * @returns {Object} Statistiche finali calcolate
 */
export function calculatePokemonStats(baseStats, level, evs = {}, ivs = {}) {
    const realLevel = (level * 2) + 10;
    const calc = (base, ev = 0, iv = 0, isHp = false) => {
        const inner = (2 * base + iv + Math.floor(ev / 4)) * realLevel;
        const result = Math.floor(inner / 100); 
        
        if (isHp) {
            return result + realLevel + 10;
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
