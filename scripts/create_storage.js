import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Errore: VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY mancanti nel processo');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAvatarsBucket() {
    console.log('⏳ Tentativo di creazione bucket "avatars"...');

    try {
        const { data, error } = await supabase.storage.createBucket('avatars', {
            public: true
        });

        if (error) {
            if (error.message.includes('already exists')) {
                console.log('✅ Il bucket "avatars" esiste già.');
            } else {
                console.error('❌ Errore durante la creazione del bucket:', error.message);
                process.exit(1);
            }
        } else {
            console.log('✅ Bucket "avatars" creato con successo!');
        }
    } catch (err) {
        console.error('❌ Eccezione durante la creazione:', err.message);
        process.exit(1);
    }
}

createAvatarsBucket();
