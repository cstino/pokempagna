-- ============================================
-- POKÉMPAGNA — Script SQL per Mosse Pokémon (Molti-a-Molti)
-- RESET TOTALE: Esegui questo script nel SQL Editor di Supabase
-- ============================================

-- 1. Tabula rasa per eliminare discrepanze di tipo (UUID vs INTEGER)
DROP TABLE IF EXISTS public.mosse_pokemon CASCADE;

-- 2. Crea la tabella mosse_pokemon con UUID corretti
CREATE TABLE public.mosse_pokemon (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pokemon_giocatore_id UUID NOT NULL REFERENCES public.pokemon_giocatore(id) ON DELETE CASCADE,
  mossa_id UUID NOT NULL REFERENCES public.mosse_disponibili(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL,
  pp_max INTEGER DEFAULT 20,
  pp_attuale INTEGER DEFAULT 20,
  attiva BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Abilita Row Level Security (RLS)
ALTER TABLE public.mosse_pokemon ENABLE ROW LEVEL SECURITY;

-- 4. Politiche RLS (Master gestisce tutto, utenti leggono le proprie mosse)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'MossePokemon: Master gestisce tutto' AND tablename = 'mosse_pokemon') THEN
        CREATE POLICY "MossePokemon: Master gestisce tutto" ON public.mosse_pokemon
          FOR ALL USING (is_master());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'MossePokemon: Giocatori leggono le proprie' AND tablename = 'mosse_pokemon') THEN
        CREATE POLICY "MossePokemon: Giocatori leggono le proprie" ON public.mosse_pokemon
          FOR SELECT USING (EXISTS (
            SELECT 1 FROM public.pokemon_giocatore pg 
            WHERE pg.id = mosse_pokemon.pokemon_giocatore_id 
            AND pg.giocatore_id = auth.uid()
          ));
    END IF;

    -- Permetti ai giocatori di attivare/disattivare le proprie mosse
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'MossePokemon: Giocatori aggiornano attivazione' AND tablename = 'mosse_pokemon') THEN
        CREATE POLICY "MossePokemon: Giocatori aggiornano attivazione" ON public.mosse_pokemon
          FOR UPDATE USING (EXISTS (
            SELECT 1 FROM public.pokemon_giocatore pg 
            WHERE pg.id = mosse_pokemon.pokemon_giocatore_id 
            AND pg.giocatore_id = auth.uid()
          ));
    END IF;
END $$;

-- 5. Abilita Realtime per la sincronizzazione istantanea Dashboard -> Player
ALTER PUBLICATION supabase_realtime ADD TABLE public.mosse_pokemon;

COMMENT ON TABLE public.mosse_pokemon IS 'Tabella che associa le mosse ai singoli pokemon degli allenatori.';
