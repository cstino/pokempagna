-- ============================================
-- SQL AGGIUNTIVO PER POKÉMPAGNA (TABELLA CAMPAGNE)
-- Da eseguire nel SQL Editor di Supabase
-- ============================================

-- 1. Tabella campagne
CREATE TABLE IF NOT EXISTS campagne (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL DEFAULT 'Nuova Campagna',
  codice_invito TEXT UNIQUE NOT NULL,
  master_id UUID REFERENCES giocatori(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Diamo ai giocatori un campo per tracciare a quale campagna stanno giocando
ALTER TABLE giocatori ADD COLUMN IF NOT EXISTS campagna_corrente_id UUID REFERENCES campagne(id) ON DELETE SET NULL;

-- 3. Disabilita RLS per le campagne (come abbiamo già fatto per il resto)
ALTER TABLE campagne DISABLE ROW LEVEL SECURITY;
