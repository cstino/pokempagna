-- Tabella per gestire gli accessi autorizzati
CREATE TABLE IF NOT EXISTS whitelist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indice per velocizzare la ricerca per email
CREATE INDEX IF NOT EXISTS idx_whitelist_email ON whitelist(email);

-- Commenti per chiarezza
COMMENT ON TABLE whitelist IS 'Elenco di email autorizzate alla registrazione';
