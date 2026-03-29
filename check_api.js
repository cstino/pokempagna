
import fetch from 'node-fetch';
async function check() {
  const res = await fetch('https://pokeapi.co/api/v2/pokemon?limit=10');
  const data = await res.json();
  console.table(data.results);
}
check();
