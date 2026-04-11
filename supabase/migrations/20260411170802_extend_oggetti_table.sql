ALTER TABLE oggetti 
ADD COLUMN IF NOT EXISTS durata TEXT DEFAULT 'ISTANTANEO',
ADD COLUMN IF NOT EXISTS effetti JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS vincoli_tipo TEXT[] DEFAULT '{}'::text[];

COMMENT ON COLUMN oggetti.durata IS 'Durata dell''effetto: ISTANTANEO, ROUND, EQUIPAGGIATO';
COMMENT ON COLUMN oggetti.effetti IS 'Lista di bonus/malus: [{"stat": "attacco", "val": 2}]';
COMMENT ON COLUMN oggetti.vincoli_tipo IS 'Array di tipi di pokemon compatibili (es: {fuoco, acqua})';
