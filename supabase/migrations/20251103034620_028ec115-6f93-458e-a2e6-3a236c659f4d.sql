-- Fix distributors not showing - Use CTE for clearer aggregation
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_data()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  participants_data jsonb;
  distributors_data jsonb;
  all_transactions jsonb;
  all_department_store jsonb;
  v_user_email text;
BEGIN
  -- Get current user email from session
  v_user_email := current_setting('app.current_user_email', true);
  
  -- Verify if user is admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN admin_users au ON au.id = ur.user_id
    WHERE au.email = v_user_email
    AND ur.role = 'admin'::app_role
  ) THEN
    RAISE EXCEPTION 'Acesso negado: usuário não é admin';
  END IF;
  
  -- Aggregate participants data
  SELECT jsonb_agg(row_to_json(p)::jsonb) INTO participants_data
  FROM (
    SELECT 
      p.participante,
      p.email,
      COUNT(DISTINCT w.cliente_id) as total_revendas,
      COUNT(DISTINCT CASE 
        WHEN COALESCE(total_sales.vendas, 0) > 500 THEN w.cliente_id 
      END) as revendas_ativas,
      COUNT(DISTINCT CASE 
        WHEN COALESCE(total_sales.vendas, 0) <= 500 THEN w.cliente_id 
      END) as revendas_inativas,
      COALESCE(SUM(total_sales.vendas), 0) as vendas_totais
    FROM participants p
    LEFT JOIN wallet w ON w.participante = p.participante
    LEFT JOIN (
      SELECT cliente_id, SUM(total_parcela) as vendas
      FROM transactions
      GROUP BY cliente_id
    ) total_sales ON total_sales.cliente_id = w.cliente_id
    GROUP BY p.participante, p.email
    ORDER BY vendas_totais DESC
  ) p;
  
  -- Aggregate distributors data - FIXED: Use CTE to ensure all distributors show
  WITH distributor_summary AS (
    SELECT 
      COALESCE(ds.representante, 'Sem Distribuidor') as representante,
      ds.cliente_id,
      w.participante,
      total_sales.vendas
    FROM department_store ds
    LEFT JOIN wallet w ON w.cliente_id = ds.cliente_id
    LEFT JOIN (
      SELECT cliente_id, SUM(total_parcela) as vendas
      FROM transactions
      GROUP BY cliente_id
    ) total_sales ON total_sales.cliente_id = ds.cliente_id
  )
  SELECT jsonb_agg(row_to_json(d)::jsonb) INTO distributors_data
  FROM (
    SELECT 
      representante,
      COUNT(DISTINCT participante) as total_participantes,
      COUNT(DISTINCT cliente_id) as total_revendas,
      COUNT(DISTINCT CASE 
        WHEN COALESCE(vendas, 0) > 500 THEN cliente_id 
      END) as revendas_ativas,
      COUNT(DISTINCT CASE 
        WHEN COALESCE(vendas, 0) <= 500 THEN cliente_id 
      END) as revendas_inativas,
      COALESCE(SUM(vendas), 0) as vendas_totais
    FROM distributor_summary
    GROUP BY representante
    ORDER BY vendas_totais DESC
  ) d;
  
  -- Ensure distributors_data is never NULL
  distributors_data := COALESCE(distributors_data, '[]'::jsonb);
  
  -- Get all transactions (for global KPIs)
  SELECT jsonb_agg(row_to_json(t)::jsonb) INTO all_transactions
  FROM transactions t;
  
  -- Get all department stores
  SELECT jsonb_agg(row_to_json(ds)::jsonb) INTO all_department_store
  FROM department_store ds;
  
  -- Return combined data
  RETURN jsonb_build_object(
    'participants', COALESCE(participants_data, '[]'::jsonb),
    'distributors', COALESCE(distributors_data, '[]'::jsonb),
    'transactions', COALESCE(all_transactions, '[]'::jsonb),
    'department_store', COALESCE(all_department_store, '[]'::jsonb)
  );
END;
$function$;