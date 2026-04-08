-- Migration: Add Base Stats persistence to pokemon_giocatore
-- This ensures the system always knows the "Species Identity" for correct theoretical growth calculations.

ALTER TABLE pokemon_giocatore 
ADD COLUMN IF NOT EXISTS hp_base INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS atk_base INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS def_base INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS spatk_base INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS spdef_base INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS speed_base INTEGER DEFAULT 50;

-- Update existing records if possible (Optional, but good for data integrity)
-- If we had a link to pokedex, we could join, but for now we fallback to defaults or existing values if applicable.
