-- Migration: Add EV and IV columns to pokemon_giocatore
-- To be run in Supabase SQL Editor

ALTER TABLE pokemon_giocatore 
ADD COLUMN IF NOT EXISTS ev_hp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ev_attacco INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ev_difesa INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ev_attacco_speciale INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ev_difesa_speciale INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ev_velocita INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS iv_hp INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS iv_attacco INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS iv_difesa INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS iv_attacco_speciale INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS iv_difesa_speciale INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS iv_velocita INTEGER DEFAULT 15;

-- Optional: Comments for documentation
COMMENT ON COLUMN pokemon_giocatore.ev_hp IS 'Effort Values for HP';
COMMENT ON COLUMN pokemon_giocatore.iv_hp IS 'Individual Values for HP (0-31)';
