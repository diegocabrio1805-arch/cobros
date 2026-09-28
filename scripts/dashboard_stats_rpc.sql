
-- =============================================================================
-- RPC: get_dashboard_stats
-- Función para calcular los totales del Dashboard en el Servidor (Nube)
-- Esto evita descargar miles de pagos al celular en el primer inicio.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_collector_id uuid DEFAULT NULL, p_branch_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_recaudo_hoy NUMERIC := 0;
  v_saldo_total_cartera NUMERIC := 0;
  v_result JSON;
BEGIN
  -- 1. Calcular Recaudo de Hoy (Suma de pagos de hoy)
  -- Si p_collector_id es proporcionado, filtramos por el cobrador
  -- Si p_branch_id es proporcionado, filtramos por la sucursal
  
  -- TODO: Logica precisa usando las reglas de isOurBranch de TypeScript
  
  -- Para mantenerlo rápido y funcional, empezamos retornando un JSON dummy
  v_result := json_build_object(
    'recaudoHoy', 1500000,
    'saldoTotalCartera', 45000000,
    'efectividad', 85
  );

  RETURN v_result;
END;
$$;

