-- FASE 5: LIMPIEZA FINAL Y SEGURIDAD

-- 1. Eliminar la columna "password" en texto plano de forma TEMPORAL o PERMANENTE
-- NOTA: Por protocolo de rollback, en lugar de eliminarla (DROP), vamos a ofuscarla/vaciarla
-- para no romper código antiguo silenciado, garantizando que ya no se lea en texto plano.

UPDATE public.profiles 
SET password = '****************' 
WHERE password IS NOT NULL AND password != '****************';

-- 2. Asegurarnos que Postgresql libere el espacio de las contraseñas
VACUUM VERBOSE public.profiles;

-- MISION CUMPLIDA. 
-- El inicio de sesión ahora pertenece exclusivamente a Supabase Secure Auth (Postgres pgcrypto).
