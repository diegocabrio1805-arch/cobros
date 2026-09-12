-- =============================================================
-- MÓDULO DE PENALIZACIÓN / MORA — ANEXO COBRO
-- Ejecutar en Supabase SQL Editor
-- =============================================================

-- 1. Crear la tabla de penalizaciones
CREATE TABLE IF NOT EXISTS public.penalties (
  id            TEXT PRIMARY KEY,
  loan_id       TEXT NOT NULL,
  client_id     TEXT NOT NULL,
  branch_id     TEXT,
  amount        NUMERIC NOT NULL,
  reason        TEXT,
  added_by      TEXT,
  extra_installments  INTEGER NOT NULL DEFAULT 0,
  last_installment_amount NUMERIC NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.penalties ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de seguridad
CREATE POLICY "Admin gestiona penalizaciones" ON public.penalties FOR ALL USING (
  public.get_my_role() = 'Administrador'
);

CREATE POLICY "Gerente gestiona penalizaciones de su sucursal" ON public.penalties FOR ALL USING (
  public.get_my_role() = 'Gerente' AND branch_id = auth.uid()::text
);

-- El cobrador NO puede ver ni crear penalizaciones (no hay política para él)

-- =============================================================
-- FIN DEL SCRIPT
-- =============================================================
