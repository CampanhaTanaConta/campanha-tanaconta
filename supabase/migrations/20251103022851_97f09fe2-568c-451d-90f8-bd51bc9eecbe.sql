-- Create RPC function to fetch all dashboard data in a single request with proper session context
CREATE OR REPLACE FUNCTION public.get_dashboard_slices(
  p_email text,
  p_participante text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wallet_ids text[];
  wallet_data jsonb;
  transactions_data jsonb;
  department_store_data jsonb;
BEGIN
  -- Set session variables for RLS (local to this function call)
  PERFORM set_config('app.current_user_email', p_email, true);
  PERFORM set_config('app.current_user_participante', p_participante, true);
  
  -- Get wallet cliente_ids for filtering
  SELECT array_agg(cliente_id) INTO wallet_ids
  FROM wallet
  WHERE participante = p_participante;
  
  -- If no wallet found, return empty arrays
  IF wallet_ids IS NULL THEN
    RETURN jsonb_build_object(
      'wallet', '[]'::jsonb,
      'transactions', '[]'::jsonb,
      'department_store', '[]'::jsonb
    );
  END IF;
  
  -- Get wallet data
  SELECT jsonb_agg(row_to_json(w)::jsonb) INTO wallet_data
  FROM wallet w
  WHERE w.participante = p_participante;
  
  -- Get transactions data
  SELECT jsonb_agg(row_to_json(t)::jsonb) INTO transactions_data
  FROM transactions t
  WHERE t.cliente_id = ANY(wallet_ids);
  
  -- Get department_store data
  SELECT jsonb_agg(row_to_json(d)::jsonb) INTO department_store_data
  FROM department_store d
  WHERE d.cliente_id = ANY(wallet_ids);
  
  -- Return combined data with COALESCE to handle nulls
  RETURN jsonb_build_object(
    'wallet', COALESCE(wallet_data, '[]'::jsonb),
    'transactions', COALESCE(transactions_data, '[]'::jsonb),
    'department_store', COALESCE(department_store_data, '[]'::jsonb)
  );
END;
$$;