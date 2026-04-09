-- Aggiunta colonna per identificare gli oggetti assegnabili ai Pokémon
ALTER TABLE oggetti ADD COLUMN attribuibile_pokemon BOOLEAN DEFAULT FALSE;
