-- FASE 1: PREPARACIÓN DE LA BÓVEDA (SUPABASE)

-- Habilitar extensión pgcrypto si no está habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Crear Trigger de Sincronización de Usuarios para nuevos registros
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO auth.users (
    id, 
    instance_id,
    aud,
    role,
    email, 
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data
  )
  VALUES (
    new.id::uuid, 
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    new.username || '@anexocobro.com', 
    crypt(new.password, gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Asegurarse de quitar reglas viejas si existen
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;

-- 3. Activar Trigger
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Preparar la migración masiva de los ACTUALES
INSERT INTO auth.users (
    id, 
    instance_id,
    aud,
    role,
    email, 
    encrypted_password, 
    email_confirmed_at, 
    raw_app_meta_data, 
    raw_user_meta_data, 
    created_at, 
    updated_at
)
SELECT 
    id::uuid, 
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    username || '@anexocobro.com', 
    crypt(password, gen_salt('bf')), 
    now(), 
    '{"provider":"email","providers":["email"]}', 
    '{}', 
    now(), 
    now()
FROM public.profiles
ON CONFLICT (id) DO NOTHING;
