/*
  SCRIPT DE ESTABILIZACIÓN Y CORRECCIÓN DE DATOS (CORREGIDO)
  Ejecutar en Supabase SQL Editor.
*/

-- 1. CORRECCIÓN DE MONEDA (Tabla branch_settings)
-- Asegura que el Admin Principal tenga configuración por defecto (Colombia/Pesos)
-- Si la tabla branch_settings no existe, este paso fallará (ignorar si usa otra estrategia)
INSERT INTO public.branch_settings (id, settings, updated_at)
VALUES (
  'b3716a78-fb4f-4918-8c0b-92004e3d63ec', 
  '{"country": "CO", "currencySymbol": "$", "language": "es", "numberFormat": "dot", "companyName": "Mi Empresa"}'::jsonb,
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET settings = jsonb_set(branch_settings.settings, '{currencySymbol}', '"$"')
WHERE branch_settings.settings->>'currencySymbol' IS NULL;

-- 2. CORRECCIÓN DE ROLES EN PERFILES
UPDATE public.profiles
SET role = 'Cobrador'
WHERE role IS NULL OR role = '';

-- 3. VALIDACIÓN DE USUARIOS HUÉRFANOS
DELETE FROM public.profiles
WHERE name IS NULL OR name = '';

-- 4. LIMPIEZA DE RELACIONES ROTAS
DELETE FROM public.payments
WHERE loan_id NOT IN (SELECT id FROM public.loans);

DELETE FROM public.loans
WHERE client_id NOT IN (SELECT id FROM public.clients);

DELETE FROM public.collection_logs
WHERE loan_id NOT IN (SELECT id FROM public.loans);
