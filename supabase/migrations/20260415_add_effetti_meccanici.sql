-- Aggiunta della colonna effetti_meccanici per gestire drop statistiche e stati nelle mosse
ALTER TABLE mosse_disponibili 
ADD COLUMN IF NOT EXISTS effetti_meccanici JSONB DEFAULT '{}'::jsonb;

-- Commento esplicativo per memoria futura (se supportato)
COMMENT ON COLUMN mosse_disponibili.effetti_meccanici IS 'Esempio: {"applica_stato": {"tipo": "bruciatura", "probabilita": 10}, "modifica_stat": {"bersaglio": "nemico", "stat": "difesa", "valore": -1, "probabilita": 100}}';
