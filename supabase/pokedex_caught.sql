-- ============================================
-- POKÉMPAGNA — Script SQL per Pokédex Catturati
-- ============================================

-- 1. Tabella pokedex_catturati (Storico Indelebile)
CREATE TABLE IF NOT EXISTS public.pokedex_catturati (
  giocatore_id UUID NOT NULL REFERENCES public.giocatori(id) ON DELETE CASCADE,
  pokemon_id INTEGER NOT NULL, -- Rimosso REFERENCES per flessibilità (evita errore 23503)
  catturato_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (giocatore_id, pokemon_id)
);

-- 2. Abilita Row Level Security (RLS)
ALTER TABLE public.pokedex_catturati ENABLE ROW LEVEL SECURITY;

-- 3. Politiche di Lettura (Ognuno legge le sue scoperte o il master legge tutto)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Pokedex: utenti leggono i propri' AND tablename = 'pokedex_catturati') THEN
        CREATE POLICY "Pokedex: utenti leggono i propri" ON public.pokedex_catturati
          FOR SELECT USING (giocatore_id = auth.uid() OR (EXISTS (
            SELECT 1 FROM public.giocatori WHERE id = auth.uid() AND ruolo = 'master'
          )));
    END IF;
END $$;

-- 4. Funzione Trigger per tracciamento cattura automatica
CREATE OR REPLACE FUNCTION public.track_pokemon_capture()
RETURNS TRIGGER AS $$
BEGIN
  -- Quando un giocatore ottiene un pokemon (insert in pokemon_giocatore),
  -- lo segniamo anche nel pokedex storico se non c'è già.
  INSERT INTO public.pokedex_catturati (giocatore_id, pokemon_id)
  VALUES (NEW.giocatore_id, NEW.pokemon_id)
  ON CONFLICT (giocatore_id, pokemon_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Creazione Trigger su pokemon_giocatore
DROP TRIGGER IF EXISTS tr_track_capture ON public.pokemon_giocatore;
CREATE TRIGGER tr_track_capture
AFTER INSERT OR UPDATE ON public.pokemon_giocatore
FOR EACH ROW EXECUTE FUNCTION public.track_pokemon_capture();

-- 6. POPOLAMENTO INIZIALE (Cattura i pokemon attuali nelle squadre)
INSERT INTO public.pokedex_catturati (giocatore_id, pokemon_id)
SELECT DISTINCT giocatore_id, pokemon_id FROM public.pokemon_giocatore
ON CONFLICT (giocatore_id, pokemon_id) DO NOTHING;

COMMENT ON TABLE public.pokedex_catturati IS 'Tabella storica che traccia quali pokemon un allenatore ha catturato almeno una volta.';
