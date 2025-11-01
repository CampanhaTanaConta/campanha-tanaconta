-- Fix 1: Correct the admin_users RLS policy bug
-- The policy had a self-join error (user_roles.user_id = user_roles.id)
DROP POLICY IF EXISTS "Admins can view admin users" ON public.admin_users;

CREATE POLICY "Admins can view admin users"
ON public.admin_users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = admin_users.id
    AND user_roles.role = 'admin'::app_role
  )
);

-- Fix 2: Restrict department_store access to only customers in user's wallet
-- This prevents all users from seeing all customer PII data
DROP POLICY IF EXISTS "Users can view all department store data" ON public.department_store;

CREATE POLICY "Users can view own customers only"
ON public.department_store
FOR SELECT
USING (
  cliente_id IN (
    SELECT cliente_id FROM public.wallet
    WHERE participante = current_setting('app.current_user_participante'::text, true)
  )
);

-- Fix 3: Add a secure function to set session variables after authentication
-- This addresses the session variable issue until full Supabase Auth migration
CREATE OR REPLACE FUNCTION public.set_user_session(
  p_email text,
  p_participante text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set session variables for RLS policies
  PERFORM set_config('app.current_user_email', p_email, false);
  PERFORM set_config('app.current_user_participante', p_participante, false);
END;
$$;