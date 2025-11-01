-- Fix ambiguous column reference in verify_admin_login
CREATE OR REPLACE FUNCTION public.verify_admin_login(p_email text, p_password_hash text)
RETURNS TABLE(user_id uuid, user_name text, is_valid boolean, is_admin boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_admin_user admin_users%ROWTYPE;
  v_has_admin_role boolean;
BEGIN
  -- Check if admin user exists and password matches
  SELECT * INTO v_admin_user
  FROM admin_users
  WHERE email = p_email
  AND password_hash = p_password_hash;
  
  IF v_admin_user.id IS NOT NULL THEN
    -- Check if user has admin role (fix ambiguous column reference)
    SELECT EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = v_admin_user.id
      AND ur.role = 'admin'::app_role
    ) INTO v_has_admin_role;
    
    RETURN QUERY SELECT 
      v_admin_user.id,
      v_admin_user.name,
      true,
      v_has_admin_role;
  ELSE
    RETURN QUERY SELECT 
      NULL::uuid,
      NULL::text,
      false,
      false;
  END IF;
END;
$function$;

-- Fix ambiguous column reference in verify_participant_login
CREATE OR REPLACE FUNCTION public.verify_participant_login(p_email text, p_birth_hash text)
RETURNS TABLE(user_id uuid, user_name text, is_valid boolean, is_admin boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_participant participants%ROWTYPE;
  v_has_admin_role boolean;
BEGIN
  -- Check if participant exists and password matches
  SELECT * INTO v_participant
  FROM participants
  WHERE email = p_email
  AND birth_hash = p_birth_hash;
  
  IF v_participant.id IS NOT NULL THEN
    -- Check if user has admin role (fix ambiguous column reference)
    SELECT EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = v_participant.id
      AND ur.role = 'admin'::app_role
    ) INTO v_has_admin_role;
    
    RETURN QUERY SELECT 
      v_participant.id,
      v_participant.participante,
      true,
      v_has_admin_role;
  ELSE
    RETURN QUERY SELECT 
      NULL::uuid,
      NULL::text,
      false,
      false;
  END IF;
END;
$function$;