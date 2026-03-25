-- ============================================
-- POKÉMPAGNA — Script SQL per tabelle Master
-- Esegui questo script nel SQL Editor di Supabase
-- ============================================

-- 1. Tabella pokemon (Base Library)
CREATE TABLE IF NOT EXISTS public.pokemon (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    tipo1 TEXT NOT NULL,
    tipo2 TEXT,
    hp_base INTEGER DEFAULT 50,
    atk_base INTEGER DEFAULT 50,
    def_base INTEGER DEFAULT 50,
    spatk_base INTEGER DEFAULT 50,
    spdef_base INTEGER DEFAULT 50,
    speed_base INTEGER DEFAULT 50,
    descrizione TEXT,
    immagine_url TEXT,
    sprite_url TEXT,
    visibile_pokedex BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabella oggetti (Base Library)
CREATE TABLE IF NOT EXISTS public.oggetti (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    categoria TEXT DEFAULT 'STRUMENTO',
    descrizione TEXT,
    immagine_url TEXT,
    utilizzabile_in_battaglia BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Assicuriamoci che mosse_disponibili abbia la colonna disponibile
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mosse_disponibili' AND column_name='disponibile') THEN
        ALTER TABLE public.mosse_disponibili ADD COLUMN disponibile BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 4. Disabilita RLS per queste tabelle gestionali (Semplificazione Master)
ALTER TABLE public.pokemon DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.oggetti DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.mosse_disponibili DISABLE ROW LEVEL SECURITY;

-- 5. Abilita Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.pokemon;
ALTER PUBLICATION supabase_realtime ADD TABLE public.oggetti;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mosse_disponibili;

-- 6. Dati di esempio (Opzionale)
INSERT INTO public.pokemon (id, nome, tipo1, tipo2, hp_base, atk_base, def_base, spatk_base, spdef_base, speed_base, descrizione, immagine_url, sprite_url, visibile_pokedex)
VALUES 
(1, 'Bulbasaur', 'ERBA', 'VELENO', 45, 49, 49, 65, 65, 45, 'Una strana semente è stata piantata sul suo dorso alla nascita.', 
 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png', 
 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png', true),
(4, 'Charmander', 'FUOCO', NULL, 39, 52, 43, 60, 50, 65, 'Preferisce le cose calde. Si dice che quando piove gli esca vapore dalla punta della coda.', 
 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png', 
 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png', true),
(7, 'Squirtle', 'ACQUA', NULL, 44, 48, 65, 50, 64, 43, 'Dopo la nascita il suo dorso si gonfia e si indurisce diventando un guscio.', 
 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png', 
 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png', true),
(25, 'Pikachu', 'ELETTRO', NULL, 35, 55, 40, 50, 50, 90, 'Quando diversi di questi POKéMON si radunano, la loro elettricità può causare tempeste di fulmini.', 
 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png', 
 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png', true)
ON CONFLICT (id) DO NOTHING;
