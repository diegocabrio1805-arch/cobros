
-- =============================================================================
-- SQL DE OPTIMIZACIÓN DE RAÍZ: FILTRO EN LA NUBE PARA COBRADORES
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_collector_clients(p_collector_id uuid, p_last_sync timestamp with time zone DEFAULT NULL)
RETURNS SETOF clients
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_last_sync IS NOT NULL THEN
    RETURN QUERY 
      SELECT DISTINCT c.* 
      FROM clients c
      INNER JOIN loans l ON (l.client_id = c.id OR l.client_id = c.id::text)
      WHERE l.collector_id = p_collector_id
      AND c.updated_at > p_last_sync;
  ELSE
    RETURN QUERY 
      SELECT DISTINCT c.* 
      FROM clients c
      INNER JOIN loans l ON (l.client_id = c.id OR l.client_id = c.id::text)
      WHERE l.collector_id = p_collector_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_collector_loans(p_collector_id uuid, p_last_sync timestamp with time zone DEFAULT NULL)
RETURNS SETOF loans
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_last_sync IS NOT NULL THEN
    RETURN QUERY SELECT * FROM loans WHERE collector_id = p_collector_id AND updated_at > p_last_sync;
  ELSE
    RETURN QUERY SELECT * FROM loans WHERE collector_id = p_collector_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_collector_payments(p_collector_id uuid, p_last_sync timestamp with time zone DEFAULT NULL)
RETURNS SETOF payments
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_last_sync IS NOT NULL THEN
    RETURN QUERY SELECT * FROM payments WHERE recorded_by = p_collector_id AND updated_at > p_last_sync;
  ELSE
    RETURN QUERY SELECT * FROM payments WHERE recorded_by = p_collector_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_collector_logs(p_collector_id uuid, p_last_sync timestamp with time zone DEFAULT NULL)
RETURNS SETOF collection_logs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_last_sync IS NOT NULL THEN
    RETURN QUERY SELECT * FROM collection_logs WHERE collector_id = p_collector_id AND updated_at > p_last_sync;
  ELSE
    RETURN QUERY SELECT * FROM collection_logs WHERE collector_id = p_collector_id;
  END IF;
END;
$$;

