-- Update get_admin_dashboard_data function to fetch distributor from wallet table
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
  v_user_email := current_setting('app.current_user_email', true);
  
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN admin_users au ON au.id = ur.user_id
    WHERE au.email = v_user_email
    AND ur.role = 'admin'::app_role
  ) THEN
    RAISE EXCEPTION 'Acesso negado: usuário não é admin';
  END IF;
  
  -- Participants: DIVIDED sales and premio by number of participants
  WITH participantes_por_cliente AS (
    SELECT 
      cliente_id,
      COUNT(DISTINCT participante)::numeric as num_participantes
    FROM wallet
    GROUP BY cliente_id
  ),
  vendas_e_premios AS (
    SELECT 
      w.participante,
      t.cliente_id,
      SUM(t.total_parcela / ppc.num_participantes) as vendas_totais,
      SUM(t.premiacao_valor / ppc.num_participantes) as premio_dividido
    FROM wallet w
    INNER JOIN transactions t ON t.cliente_id = w.cliente_id
    INNER JOIN participantes_por_cliente ppc ON ppc.cliente_id = w.cliente_id
    GROUP BY w.participante, t.cliente_id
  )
  SELECT jsonb_agg(row_to_json(p)::jsonb) INTO participants_data
  FROM (
    SELECT 
      p.participante,
      p.email,
      COUNT(DISTINCT w.cliente_id) as total_revendas,
      COUNT(DISTINCT CASE 
        WHEN COALESCE(vep.vendas_totais, 0) > 500 THEN w.cliente_id 
      END) as revendas_ativas,
      COUNT(DISTINCT CASE 
        WHEN COALESCE(vep.vendas_totais, 0) <= 500 THEN w.cliente_id 
      END) as revendas_inativas,
      COALESCE(SUM(vep.vendas_totais), 0) as vendas_totais
    FROM participants p
    LEFT JOIN wallet w ON w.participante = p.participante
    LEFT JOIN vendas_e_premios vep ON vep.participante = p.participante AND vep.cliente_id = w.cliente_id
    GROUP BY p.participante, p.email
    ORDER BY vendas_totais DESC
  ) p;
  
  -- Distributors: Fetch from wallet table (changed from department_store)
  WITH cliente_vendas AS (
    SELECT 
      cliente_id, 
      SUM(total_parcela) as vendas
    FROM transactions
    GROUP BY cliente_id
  ),
  distributor_summary AS (
    SELECT DISTINCT ON (w.cliente_id)
      COALESCE(w.distribuidor, 'Sem Distribuidor') as representante,
      w.cliente_id,
      cv.vendas
    FROM wallet w
    LEFT JOIN cliente_vendas cv ON cv.cliente_id = w.cliente_id
    ORDER BY w.cliente_id, w.distribuidor
  ),
  participantes_por_cliente_dist AS (
    SELECT 
      w.cliente_id,
      COUNT(DISTINCT w.participante) as total_participantes
    FROM wallet w
    GROUP BY w.cliente_id
  )
  SELECT jsonb_agg(row_to_json(d)::jsonb) INTO distributors_data
  FROM (
    SELECT 
      ds.representante,
      COALESCE(SUM(ppc.total_participantes), 0)::bigint as total_participantes,
      COUNT(DISTINCT ds.cliente_id) as total_revendas,
      COUNT(DISTINCT CASE 
        WHEN COALESCE(ds.vendas, 0) > 500 THEN ds.cliente_id 
      END) as revendas_ativas,
      COUNT(DISTINCT CASE 
        WHEN COALESCE(ds.vendas, 0) <= 500 THEN ds.cliente_id 
      END) as revendas_inativas,
      COALESCE(SUM(ds.vendas), 0) as vendas_totais
    FROM distributor_summary ds
    LEFT JOIN participantes_por_cliente_dist ppc ON ppc.cliente_id = ds.cliente_id
    GROUP BY ds.representante
    ORDER BY vendas_totais DESC
  ) d;
  
  distributors_data := COALESCE(distributors_data, '[]'::jsonb);
  
  -- Global KPIs: Original transactions (no division)
  SELECT jsonb_agg(row_to_json(t)::jsonb) INTO all_transactions
  FROM transactions t;
  
  SELECT jsonb_agg(row_to_json(ds)::jsonb) INTO all_department_store
  FROM department_store ds;
  
  RETURN jsonb_build_object(
    'participants', COALESCE(participants_data, '[]'::jsonb),
    'distributors', COALESCE(distributors_data, '[]'::jsonb),
    'transactions', COALESCE(all_transactions, '[]'::jsonb),
    'department_store', COALESCE(all_department_store, '[]'::jsonb)
  );
END;
$function$;