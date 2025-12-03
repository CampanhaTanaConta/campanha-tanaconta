CREATE OR REPLACE FUNCTION public.get_admin_table_counts(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_counts jsonb;
BEGIN
  -- Verificar se é admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN admin_users au ON au.id = ur.user_id
    WHERE au.email = p_email
    AND ur.role = 'admin'::app_role
  ) THEN
    RAISE EXCEPTION 'Acesso negado: usuário não é admin';
  END IF;
  
  -- Retornar contagens (bypassa RLS devido a SECURITY DEFINER)
  SELECT jsonb_build_object(
    'participants', (SELECT COUNT(*) FROM participants),
    'wallet', (SELECT COUNT(*) FROM wallet),
    'transactions', (SELECT COUNT(*) FROM transactions),
    'departmentStore', (SELECT COUNT(*) FROM department_store)
  ) INTO v_counts;
  
  RETURN v_counts;
END;
$$;