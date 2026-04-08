-- Migration: Add Explicit Bonus columns to pokemon_giocatore
-- These columns store the manual increases given by the Master.

ALTER TABLE pokemon_giocatore 
ADD COLUMN IF NOT EXISTS bonus_hp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus_attacco INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus_difesa INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus_attacco_speciale INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus_difesa_speciale INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus_velocita INTEGER DEFAULT 0;

COMMENT ON COLUMN pokemon_giocatore.bonus_hp IS 'Manual stat bonus given by the Master (HP)';
