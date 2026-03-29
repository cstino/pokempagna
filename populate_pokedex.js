
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function populate() {
  console.log("🚀 Inizio popolamento Pokédex Nazionale (PERFEZIONE SEQUENZIALE)...");

  try {
    const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025');
    const data = await res.json();
    const allPokemons = data.results;

    console.log(`📦 Trovati ${allPokemons.length} Pokémon. Inizio iniezione uno ad uno...`);

    // Caricamento SINGOLO per garantire ID sequenziale puro
    for (let i = 0; i < allPokemons.length; i++) {
        const p = allPokemons[i];
        try {
            const detailRes = await fetch(p.url);
            const d = await detailRes.json();
            
            const pkmn = {
                nome: d.name.toUpperCase(),
                tipo1: d.types[0]?.type.name.toUpperCase(),
                tipo2: d.types[1]?.type.name.toUpperCase() || null,
                hp_base: d.stats[0].base_stat,
                atk_base: d.stats[1].base_stat,
                def_base: d.stats[2].base_stat,
                spatk_base: d.stats[3].base_stat,
                spdef_base: d.stats[4].base_stat,
                speed_base: d.stats[5].base_stat,
                immagine_url: d.sprites.other['official-artwork'].front_default,
                sprite_url: d.sprites.front_default,
                visibile_pokedex: false
            };

            const { error } = await supabase.from('pokemon').insert(pkmn);
            
            if (error) {
                console.error(`❌ Errore ID ${i+1} (${p.name}):`, error.message);
            } else {
                if ((i + 1) % 50 === 0) console.log(`✅ Progress: ${i + 1}/1025 (Ultimo: ${p.name.toUpperCase()})`);
            }
        } catch (err) {
            console.error(`💥 Fallimento totale su ${p.name}:`, err.message);
        }
    }

    console.log("✅ Pokédex Nazionale popolato con PERFEZIONE SEQUENZIALE!");
  } catch (err) {
    console.error("💥 Errore fatale:", err);
  }
}

populate();
