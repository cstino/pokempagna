import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

const supabase = createClient(
  'https://mmukukwtuharxdecthsi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tdWt1a3d0dWhhcnhkZWN0aHNpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNjk4NzksImV4cCI6MjA4OTc0NTg3OX0.UrnFhL_n9HVQgtQ35HnweZnEqQJi8z7rbRTWv6yOn3s'
);

async function getEffectiveness(types) {
    const effectiveness = {};
    for (const typeName of types) {
        try {
            const res = await fetch(`https://pokeapi.co/api/v2/type/${typeName.toLowerCase()}`);
            if (!res.ok) continue;
            const data = await res.json();
            data.damage_relations.double_damage_from.forEach(t => { effectiveness[t.name] = (effectiveness[t.name] || 1) * 2; });
            data.damage_relations.half_damage_from.forEach(t => { effectiveness[t.name] = (effectiveness[t.name] || 1) * 0.5; });
            data.damage_relations.no_damage_from.forEach(t => { effectiveness[t.name] = 0; });
        } catch(e) {}
    }
    return {
        debolezze: Object.keys(effectiveness).filter(k => effectiveness[k] === 2).join(', '),
        debolezze_x4: Object.keys(effectiveness).filter(k => effectiveness[k] === 4).join(', '),
        resistenze: Object.keys(effectiveness).filter(k => effectiveness[k] === 0.5).join(', '),
        resistenze_x4: Object.keys(effectiveness).filter(k => effectiveness[k] === 0.25).join(', '),
        immunita: Object.keys(effectiveness).filter(k => effectiveness[k] === 0).join(', ')
    };
}

async function start() {
    process.stdout.write("�� Migrazione Pokédex Nazionale in corso...");
    const { data: pokemons, error } = await supabase.from('pokemon').select('id, nome, tipo1, tipo2').order('id').order('id'); 
    if (error) { console.error(error); return; }
    for (const pkmn of pokemons) {
        try {
            const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${pkmn.id}`);
            if (!res.ok) continue;
            const data = await res.json();
            const altezza = (data.height / 10).toFixed(1) + " m";
            const peso = (data.weight / 10).toFixed(1) + " kg";
            const types = [pkmn.tipo1];
            if (pkmn.tipo2) types.push(pkmn.tipo2);
            const affinities = await getEffectiveness(types);
            await supabase.from('pokemon').update({ altezza, peso, ...affinities }).eq('id', pkmn.id);
            process.stdout.write(`✅ ${pkmn.nome} `);
        } catch (e) {}
    }
    console.log("\n✨ FINE BATCH!");
}
start();
