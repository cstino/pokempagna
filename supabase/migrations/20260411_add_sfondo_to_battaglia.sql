-- Aggiunta colonna sfondo alla tabella battaglia_attiva
ALTER TABLE battaglia_attiva ADD COLUMN IF NOT EXISTS sfondo text DEFAULT 'arena';
