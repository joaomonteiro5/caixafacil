-- Remove admin protection triggers/functions to allow full cleanup
DROP TRIGGER IF EXISTS protect_admin_profile ON public.profiles;
DROP TRIGGER IF EXISTS protect_admin_role_trigger ON public.user_roles;
DROP FUNCTION IF EXISTS public.protect_admin() CASCADE;
DROP FUNCTION IF EXISTS public.protect_admin_role() CASCADE;

-- Delete all data
DELETE FROM public.fiados;
DELETE FROM public.lancamentos;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;
DELETE FROM auth.users;