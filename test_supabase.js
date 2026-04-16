import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function test() {
  const { data: pkmn, error: pErr } = await supabase.from('pokemon_giocatore').select('id, hp_attuale').limit(1);
  if (pErr) return console.log("FETCH ERR", pErr);
  if (!pkmn || pkmn.length === 0) return console.log("NO PKMN");
  
  console.log("TRYING TO UPDATE", pkmn[0].id);
  const { error } = await supabase.from('pokemon_giocatore').update({ hp_attuale: pkmn[0].hp_attuale }).eq('id', pkmn[0].id);
  console.log("UPDATE ERR:", error);
}

test();
