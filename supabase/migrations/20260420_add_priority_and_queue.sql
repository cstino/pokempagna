-- Aggiunta colonna priorità alle mosse disponibili
ALTER TABLE mosse_disponibili ADD COLUMN IF NOT EXISTS priorita INTEGER DEFAULT 0;

-- La tabella battaglia_attiva ha già mosse_in_coda JSONB, ci assicuriamo che sia inizializzata correttamente
UPDATE battaglia_attiva SET mosse_in_coda = '[]' WHERE mosse_in_coda IS NULL;
