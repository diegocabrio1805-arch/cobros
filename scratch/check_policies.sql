-- Query to find all policies on profiles
SELECT polname, polcmd, polqual, polwithcheck 
FROM pg_policy 
WHERE polrelid = 'public.profiles'::regclass;
