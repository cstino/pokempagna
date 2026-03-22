-- ============================================
-- POKÉMPAGNA — Schema Database Supabase
-- ============================================
-- Esegui questo SQL nella sezione "SQL Editor" di Supabase

-- 1. Tabella giocatori
CREATE TABLE IF NOT EXISTS giocatori (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  immagine_profilo TEXT,
  livello_allenatore INTEGER DEFAULT 1,
  hp INTEGER DEFAULT 100,
  hp_max INTEGER DEFAULT 100,
  forza INTEGER DEFAULT 10,
  destrezza INTEGER DEFAULT 10,
  altre_stats JSONB DEFAULT '{}',
  medaglie JSONB DEFAULT '[]',
  punti_tlp INTEGER DEFAULT 0,
  ruolo TEXT DEFAULT 'giocatore' CHECK (ruolo IN ('giocatore', 'master')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabella pokemon_giocatore
CREATE TABLE IF NOT EXISTS pokemon_giocatore (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  giocatore_id UUID NOT NULL REFERENCES giocatori(id) ON DELETE CASCADE,
  pokemon_id INTEGER NOT NULL, -- ID PokéAPI (es. 25 = Pikachu)
  nome TEXT NOT NULL,
  livello INTEGER DEFAULT 1,
  hp INTEGER NOT NULL,
  hp_max INTEGER NOT NULL,
  attacco INTEGER NOT NULL,
  difesa INTEGER NOT NULL,
  attacco_speciale INTEGER NOT NULL,
  difesa_speciale INTEGER NOT NULL,
  velocita INTEGER NOT NULL,
  sesso TEXT DEFAULT 'N' CHECK (sesso IN ('M', 'F', 'N')),
  condizione_stato TEXT, -- 'veleno', 'paralisi', 'sonno', 'bruciatura', 'congelamento', null
  mossa_1 UUID REFERENCES mosse_disponibili(id),
  mossa_2 UUID REFERENCES mosse_disponibili(id),
  mossa_3 UUID REFERENCES mosse_disponibili(id),
  mossa_4 UUID REFERENCES mosse_disponibili(id),
  attivo BOOLEAN DEFAULT false, -- è nei titolari?
  immagine_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabella mosse_disponibili
CREATE TABLE IF NOT EXISTS mosse_disponibili (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL, -- 'fuoco', 'acqua', 'elettro', 'normale', etc.
  categoria TEXT NOT NULL CHECK (categoria IN ('fisico', 'speciale')),
  descrizione TEXT,
  disponibile BOOLEAN DEFAULT false, -- il master la checka per renderla visibile
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Tabella oggetti_zaino
CREATE TABLE IF NOT EXISTS oggetti_zaino (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  giocatore_id UUID NOT NULL REFERENCES giocatori(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descrizione TEXT,
  quantita INTEGER DEFAULT 1,
  immagine_url TEXT,
  utilizzabile_in_battaglia BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tabella battaglia_attiva
CREATE TABLE IF NOT EXISTS battaglia_attiva (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attiva BOOLEAN DEFAULT false,
  pokemon_in_campo JSONB DEFAULT '[]',
  mosse_in_coda JSONB DEFAULT '[]',
  modificatori JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Tabella pokemon_nemici (temporanea per battaglia)
CREATE TABLE IF NOT EXISTS pokemon_nemici (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battaglia_id UUID REFERENCES battaglia_attiva(id) ON DELETE CASCADE,
  pokemon_id INTEGER NOT NULL, -- ID PokéAPI
  nome TEXT NOT NULL,
  livello INTEGER DEFAULT 1,
  hp INTEGER NOT NULL,
  hp_max INTEGER NOT NULL,
  attacco INTEGER NOT NULL,
  difesa INTEGER NOT NULL,
  attacco_speciale INTEGER NOT NULL,
  difesa_speciale INTEGER NOT NULL,
  velocita INTEGER NOT NULL,
  condizione_stato TEXT,
  mossa_1 TEXT,
  mossa_2 TEXT,
  mossa_3 TEXT,
  mossa_4 TEXT,
  immagine_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ======================
-- Row Level Security (RLS)
-- ======================

-- Abilita RLS su tutte le tabelle
ALTER TABLE giocatori ENABLE ROW LEVEL SECURITY;
ALTER TABLE pokemon_giocatore ENABLE ROW LEVEL SECURITY;
ALTER TABLE mosse_disponibili ENABLE ROW LEVEL SECURITY;
ALTER TABLE oggetti_zaino ENABLE ROW LEVEL SECURITY;
ALTER TABLE battaglia_attiva ENABLE ROW LEVEL SECURITY;
ALTER TABLE pokemon_nemici ENABLE ROW LEVEL SECURITY;

-- Helper function: is the current user a master?
CREATE OR REPLACE FUNCTION is_master()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM giocatori
    WHERE id = auth.uid() AND ruolo = 'master'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- GIOCATORI policies
CREATE POLICY "Giocatori: leggere il proprio profilo" ON giocatori
  FOR SELECT USING (id = auth.uid() OR is_master());

CREATE POLICY "Giocatori: aggiornare il proprio profilo" ON giocatori
  FOR UPDATE USING (id = auth.uid() OR is_master());

CREATE POLICY "Giocatori: inserire il proprio profilo" ON giocatori
  FOR INSERT WITH CHECK (id = auth.uid());

-- POKEMON_GIOCATORE policies
CREATE POLICY "Pokemon: leggere i propri pokemon" ON pokemon_giocatore
  FOR SELECT USING (giocatore_id = auth.uid() OR is_master());

CREATE POLICY "Pokemon: modificare i propri pokemon" ON pokemon_giocatore
  FOR UPDATE USING (giocatore_id = auth.uid() OR is_master());

CREATE POLICY "Pokemon: inserire i propri pokemon" ON pokemon_giocatore
  FOR INSERT WITH CHECK (giocatore_id = auth.uid() OR is_master());

CREATE POLICY "Pokemon: eliminare i propri pokemon" ON pokemon_giocatore
  FOR DELETE USING (giocatore_id = auth.uid() OR is_master());

-- MOSSE_DISPONIBILI policies
CREATE POLICY "Mosse: tutti possono leggere" ON mosse_disponibili
  FOR SELECT USING (true);

CREATE POLICY "Mosse: solo master gestisce" ON mosse_disponibili
  FOR ALL USING (is_master());

-- OGGETTI_ZAINO policies
CREATE POLICY "Zaino: leggere i propri oggetti" ON oggetti_zaino
  FOR SELECT USING (giocatore_id = auth.uid() OR is_master());

CREATE POLICY "Zaino: solo master gestisce" ON oggetti_zaino
  FOR ALL USING (is_master());

-- BATTAGLIA_ATTIVA policies
CREATE POLICY "Battaglia: tutti leggono" ON battaglia_attiva
  FOR SELECT USING (true);

CREATE POLICY "Battaglia: solo master gestisce" ON battaglia_attiva
  FOR ALL USING (is_master());

-- POKEMON_NEMICI policies
CREATE POLICY "Nemici: tutti leggono" ON pokemon_nemici
  FOR SELECT USING (true);

CREATE POLICY "Nemici: solo master gestisce" ON pokemon_nemici
  FOR ALL USING (is_master());

-- ======================
-- Realtime
-- ======================
-- Abilita realtime sulle tabelle che ne hanno bisogno
ALTER PUBLICATION supabase_realtime ADD TABLE battaglia_attiva;
ALTER PUBLICATION supabase_realtime ADD TABLE pokemon_nemici;
ALTER PUBLICATION supabase_realtime ADD TABLE pokemon_giocatore;

-- ======================
-- Dati di Test
-- ======================
-- Le mosse iniziali da inserire

INSERT INTO mosse_disponibili (nome, tipo, categoria, descrizione, disponibile) VALUES
  ('Azione', 'normal', 'fisico', 'Un attacco fisico base. Il Pokémon carica il bersaglio con tutto il corpo.', true),
  ('Ruggito', 'normal', 'speciale', 'Il Pokémon emette un ruggito carino per distrarre il nemico e ridurne l''Attacco.', true),
  ('Pistolacqua', 'water', 'speciale', 'Il Pokémon spara un getto d''acqua contro il bersaglio.', true),
  ('Braciere', 'fire', 'speciale', 'Il bersaglio viene colpito da piccole fiamme.', true),
  ('Foglielama', 'grass', 'fisico', 'Foglie affilate colpiscono il bersaglio. Brutto colpo facile.', true),
  ('Tuonoshock', 'electric', 'speciale', 'Una scarica elettrica colpisce il bersaglio. Può causare paralisi.', true),
  ('Geloraggio', 'ice', 'speciale', 'Un raggio di energia gelida colpisce il bersaglio. Può congelare.', true),
  ('Doppiocalcio', 'fighting', 'fisico', 'Il Pokémon colpisce con due calci rapidi e potenti.', true),
  ('Fangobomba', 'poison', 'speciale', 'Il Pokémon lancia fango tossico sul bersaglio. Può avvelenare.', true),
  ('Scavo', 'ground', 'fisico', 'Il Pokémon scava sottoterra al primo turno e colpisce al secondo.', true),
  ('Copione', 'normal', 'speciale', 'Il Pokémon copia l''ultima mossa usata dal bersaglio.', false),
  ('Volo', 'flying', 'fisico', 'Il Pokémon vola in alto al primo turno e colpisce al secondo.', true),
  ('Psichico', 'psychic', 'speciale', 'Un potente attacco psichico. Può ridurre la Difesa Speciale.', true),
  ('Coleotteromorso', 'bug', 'fisico', 'Il Pokémon morde con mandibole potenti.', true),
  ('Frana', 'rock', 'fisico', 'Grosse rocce vengono scagliate sul bersaglio.', true),
  ('Ombrapalla', 'ghost', 'speciale', 'Una palla d''ombra viene lanciata contro il bersaglio.', true),
  ('Dragoartigli', 'dragon', 'fisico', 'Artigli affilati colpiscono il bersaglio con forza draconiana.', true),
  ('Morso', 'dark', 'fisico', 'Il Pokémon morde con denti affilati. Può far tentennare.', true),
  ('Codacciaio', 'steel', 'fisico', 'La coda del Pokémon diventa dura come l''acciaio e colpisce.', true),
  ('Forza Lunare', 'fairy', 'speciale', 'Il Pokémon attacca con il potere della luna. Può ridurre l''Attacco Speciale.', true);

-- Inserisci una riga per la battaglia (inizialmente non attiva)
INSERT INTO battaglia_attiva (attiva) VALUES (false);
