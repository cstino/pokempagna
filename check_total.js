
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function check() {
  const { count, error: countErr } = await supabase.from('pokemon').select('*', { count: 'exact', head: true });
  const { data, error } = await supabase.from('pokemon').select('id, nome').order('id').limit(20);
  console.log(`📊 Totale Record: ${count}`);
  console.table(data);
}
check();
