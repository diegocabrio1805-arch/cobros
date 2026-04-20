-- PARCHE DEFINITIVO: Recrear tabla loans con el esquema correcto
DROP TABLE IF EXISTS public.loans CASCADE;

CREATE TABLE public.loans (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  branch_id TEXT,
  principal NUMERIC,
  total_amount NUMERIC,
  status TEXT,
  installments JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  raw_data JSONB,
  collector_id TEXT,
  is_renewal BOOLEAN DEFAULT FALSE,
  custom_holidays JSONB,
  frequency TEXT,
  interest_rate NUMERIC,
  total_installments INTEGER,
  installment_value NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
