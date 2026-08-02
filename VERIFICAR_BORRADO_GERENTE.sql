-- =====================================================================
-- SCRIPT PARA VERIFICAR QUE EL GERENTE SE BORRÓ POR COMPLETO
-- =====================================================================

-- NOTA: Reemplaza 'LETICIAJAVI' por el ID del gerente que acabas de borrar
WITH manager_id AS (SELECT 'LETICIAJAVI'::text AS id)

SELECT 
  '1. Perfil del Gerente' AS dato_verificado, COUNT(*)::text AS cantidad_encontrada 
FROM public.profiles 
WHERE id = (SELECT id FROM manager_id)

UNION ALL

SELECT 
  '2. Perfiles de sus Cobradores', COUNT(*)::text 
FROM public.profiles 
WHERE managed_by = (SELECT id FROM manager_id)

UNION ALL

SELECT 
  '3. Clientes asignados a su sucursal', COUNT(*)::text 
FROM public.clients 
WHERE branch_id = (SELECT id FROM manager_id)

UNION ALL

SELECT 
  '4. Préstamos de sus clientes', COUNT(*)::text 
FROM public.loans l
JOIN public.clients c ON l.client_id::text = c.id::text
WHERE c.branch_id = (SELECT id FROM manager_id)

UNION ALL

SELECT 
  '5. Gastos Aislados', COUNT(*)::text 
FROM public.isolated_expenses 
WHERE branch_id = (SELECT id FROM manager_id);
