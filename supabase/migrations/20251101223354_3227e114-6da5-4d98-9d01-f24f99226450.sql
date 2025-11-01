-- Create secure login verification function for admin users
CREATE OR REPLACE FUNCTION public.verify_admin_login(
  p_email text,
  p_password_hash text
)
RETURNS TABLE(
  user_id uuid,
  user_name text,
  is_valid boolean,
  is_admin boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    -- Check if user has admin role
    SELECT EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = v_admin_user.id
      AND role = 'admin'::app_role
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
$$;

-- Create secure login verification function for participants
CREATE OR REPLACE FUNCTION public.verify_participant_login(
  p_email text,
  p_birth_hash text
)
RETURNS TABLE(
  user_id uuid,
  user_name text,
  is_valid boolean,
  is_admin boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    -- Check if user has admin role
    SELECT EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = v_participant.id
      AND role = 'admin'::app_role
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
$$;

-- Create a function to check if email exists (for the email check step)
CREATE OR REPLACE FUNCTION public.check_email_exists(p_email text)
RETURNS TABLE(
  email_found boolean,
  user_name text,
  is_admin_user boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_name text;
  v_participant_name text;
BEGIN
  -- Check admin_users first
  SELECT name INTO v_admin_name
  FROM admin_users
  WHERE email = p_email;
  
  IF v_admin_name IS NOT NULL THEN
    RETURN QUERY SELECT true, v_admin_name, true;
    RETURN;
  END IF;
  
  -- Check participants
  SELECT participante INTO v_participant_name
  FROM participants
  WHERE email = p_email;
  
  IF v_participant_name IS NOT NULL THEN
    RETURN QUERY SELECT true, v_participant_name, false;
    RETURN;
  END IF;
  
  -- Email not found
  RETURN QUERY SELECT false, NULL::text, false;
END;
$$;