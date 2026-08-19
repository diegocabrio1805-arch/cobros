-- =====================================================================
-- PARCHE MEJORADO: RESTAURAR COBRADORES AL GERENTE ACTIVO
-- =====================================================================

DO $$ 
DECLARE
  v_manager_id UUID;
BEGIN
  -- Buscar al gerente ACTIVO (no eliminado) por nombre
  SELECT id INTO v_manager_id 
  FROM public.profiles 
  WHERE role = 'Gerente' 
    AND name ILIKE '%ALTERFIN PRUEBA%' 
    AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_manager_id IS NULL THEN
    RAISE NOTICE 'No se encontró un gerente ALTERFIN PRUEBA activo.';
    RETURN;
  END IF;

  RAISE NOTICE 'ID del gerente activo encontrado: %', v_manager_id;

  -- Restaurar el vínculo de los 3 cobradores específicos
  UPDATE public.profiles
  SET managed_by = v_manager_id
  WHERE role = 'Cobrador' 
    AND username IN ('cobrador2', 'coacobrador4', 'coacobrador3');

  -- (Opcional) Restaurar cualquier otro cobrador huérfano con nombre similar
  UPDATE public.profiles
  SET managed_by = v_manager_id
  WHERE role = 'Cobrador' 
    AND managed_by IS NULL
    AND name ILIKE '%ALTERFIN%';

  RAISE NOTICE 'Cobradores vinculados correctamente al nuevo perfil del gerente.';
END $$;
