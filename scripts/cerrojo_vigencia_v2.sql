-- =============================================================================
-- CERROJO DE VIGENCIA v2 — ANEXO COBROS
-- Fecha: 2026-07-31
-- =============================================================================
-- DESCRIPCION:
--   Capa de seguridad RESTRICTIVA que bloquea el acceso a datos de sucursales
--   expiradas o bloqueadas manualmente, directamente en el motor de PostgreSQL.
--
--   CORRECCIÓN vs v1: El Administrador (DDANTE1983) siempre pasa el cerrojo.
--   Sus políticas de aislamiento permisivas (branch_id / OR role=Administrador)
--   siguen siendo la única capa que controla QUÉ datos puede ver el Admin.
--
-- REVERSIÓN DE EMERGENCIA (copiar y guardar aparte):
--   DROP POLICY IF EXISTS "Cerrojo_Vigencia_Clients"  ON public.clients;
--   DROP POLICY IF EXISTS "Cerrojo_Vigencia_Loans"    ON public.loans;
--   DROP POLICY IF EXISTS "Cerrojo_Vigencia_Payments" ON public.payments;
--   DROP POLICY IF EXISTS "Cerrojo_Vigencia_Logs"     ON public.collection_logs;
--   DROP FUNCTION IF EXISTS public.check_branch_active(TEXT);
-- =============================================================================


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 0: DIAGNÓSTICO PREVIO
-- Ejecutar SOLO este bloque primero. Ver los resultados antes de continuar.
-- Si ves usuarios inesperados con estado BLOQUEADO o VENCIDO, corrígelos
-- en tu panel de Gerentes ANTES de aplicar el cerrojo.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  id,
  username,
  role,
  blocked,
  expiry_date,
  CASE
    WHEN blocked = true                                    THEN '🔴 BLOQUEADO MANUALMENTE'
    WHEN NULLIF(expiry_date, '') IS NOT NULL
         AND NULLIF(expiry_date, '')::timestamptz <= now() THEN '🟡 FECHA DE CORTE VENCIDA'
    ELSE                                                        '🟢 ACTIVO'
  END AS estado_cerrojo
FROM public.profiles
WHERE role IN ('Gerente', 'Cobrador')
ORDER BY estado_cerrojo, username;


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 1: LIMPIAR versiones anteriores
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Cerrojo_Vigencia_Clients"  ON public.clients;
DROP POLICY IF EXISTS "Cerrojo_Vigencia_Loans"    ON public.loans;
DROP POLICY IF EXISTS "Cerrojo_Vigencia_Payments" ON public.payments;
DROP POLICY IF EXISTS "Cerrojo_Vigencia_Logs"     ON public.collection_logs;
DROP FUNCTION IF EXISTS public.check_branch_active(TEXT);


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 2: FUNCIÓN EVALUADORA ATÓMICA v2
-- LÓGICA:
--   1. Si quien consulta ES Administrador → PASA SIEMPRE
--   2. Para Gerentes/Cobradores: la sucursal del dato debe estar activa.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.check_branch_active(p_branch_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (
      -- ── BYPASS TOTAL PARA ADMINISTRADOR ──────────────────────────────────
      -- El Admin siempre pasa. Sus políticas permisivas de aislamiento
      -- (branch_id / OR role=Administrador) ya controlan qué puede ver.
      (
        SELECT role = 'Administrador'
        FROM public.profiles
        WHERE id::text = auth.uid()::text
      )

      OR

      -- ── CERROJO PARA GERENTES Y COBRADORES ───────────────────────────────
      -- Acceso PERMITIDO solo si la sucursal dueña del dato cumple ambas:
      --   a) NO bloqueada manualmente (blocked = false o NULL)
      --   b) Fecha de corte vigente, o sin fecha (acceso permanente)
      (
        SELECT
          (NOT COALESCE(blocked, false))
          AND
          (
            NULLIF(expiry_date, '') IS NULL
            OR
            NULLIF(expiry_date, '')::timestamptz > now()
          )
        FROM public.profiles
        WHERE id::text = p_branch_id
      )
    ),
    -- Si el perfil de la sucursal no existe → denegar (Fail-Closed)
    false
  );
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 3: POLÍTICAS RESTRICTIVAS (Capa externa Anti-Bypass)
-- AS RESTRICTIVE = AND obligatorio sobre las políticas actuales existentes.
-- No borra ni altera ninguna política existente.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Cerrojo_Vigencia_Clients"
  ON public.clients AS RESTRICTIVE FOR ALL
  USING (public.check_branch_active(branch_id::text));

CREATE POLICY "Cerrojo_Vigencia_Loans"
  ON public.loans AS RESTRICTIVE FOR ALL
  USING (public.check_branch_active(branch_id::text));

CREATE POLICY "Cerrojo_Vigencia_Payments"
  ON public.payments AS RESTRICTIVE FOR ALL
  USING (public.check_branch_active(branch_id::text));

CREATE POLICY "Cerrojo_Vigencia_Logs"
  ON public.collection_logs AS RESTRICTIVE FOR ALL
  USING (public.check_branch_active(branch_id::text));


-- ─────────────────────────────────────────────────────────────────────────────
-- PASO 4: VERIFICACIÓN POST-INSTALACIÓN
-- Confirma que las 4 políticas quedaron registradas en PostgreSQL.
-- Resultado esperado: 4 filas con tipo = RESTRICTIVE
-- ─────────────────────────────────────────────────────────────────────────────
SELECT
  tablename,
  policyname,
  cmd,
  CASE permissive
    WHEN 'PERMISSIVE'  THEN '✅ PERMISSIVE'
    ELSE                    '🔒 RESTRICTIVE'
  END AS tipo
FROM pg_policies
WHERE policyname LIKE 'Cerrojo_Vigencia_%'
ORDER BY tablename;
