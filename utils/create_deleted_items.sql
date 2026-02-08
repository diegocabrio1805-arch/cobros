-- TABLA DE RASTREO DE ELIMINACIONES
-- Esta tabla permitirá que los dispositivos "se enteren" de lo que fue borrado en otros.

CREATE TABLE IF NOT EXISTS deleted_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL, -- 'payments', 'loans', 'clients', 'collection_logs'
    record_id TEXT NOT NULL,  -- El ID del registro borrado
    branch_id TEXT,           -- Para filtrar si es necesario (opcional)
    deleted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas rápidas por fecha (sincronización incremental)
CREATE INDEX IF NOT EXISTS idx_deleted_items_date ON deleted_items(deleted_at);

-- Seguraridad (RLS)
ALTER TABLE deleted_items ENABLE ROW LEVEL SECURITY;

-- Permitir lectura/escritura a usuarios autenticados
CREATE POLICY "Enable all access for authenticated users" ON deleted_items
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Permisos
GRANT ALL ON deleted_items TO authenticated;
GRANT ALL ON deleted_items TO service_role;

-- COMENTARIO:
-- Ejecuta este script en el Editor SQL de Supabase.
