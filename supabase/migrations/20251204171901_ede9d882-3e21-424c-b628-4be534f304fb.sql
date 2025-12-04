-- Modificar a função get_admin_dashboard_data para retornar consultores não inscritos
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_data(p_email text)
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
  unregistered_consultants jsonb;
BEGIN
  -- Verify user is admin using the provided email parameter
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN admin_users au ON au.id = ur.user_id
    WHERE au.email = p_email
    AND ur.role = 'admin'::app_role
  ) THEN
    RAISE EXCEPTION 'Acesso negado: usuário não é admin';
  END IF;
  
  -- Participants: DIVIDED sales and premio by number of participants
  -- Premio calculated as: solar * 0.2% + (total - solar) * 0.1%
  WITH participantes_por_cliente AS (
    SELECT 
      cliente_id,
      COUNT(DISTINCT participante)::numeric as num_participantes
    FROM wallet
    GROUP BY cliente_id
  ),
  cliente_solar AS (
    SELECT cliente_id, valor_solar FROM solar_sales
  ),
  vendas_e_premios AS (
    SELECT 
      w.participante,
      t.cliente_id,
      SUM(t.total_parcela / ppc.num_participantes) as vendas_totais,
      SUM(
        CASE 
          WHEN cs.valor_solar IS NOT NULL AND cs.valor_solar > 0 THEN
            (LEAST(cs.valor_solar, t.total_parcela) * 0.002 + 
             GREATEST(0, t.total_parcela - cs.valor_solar) * 0.001) / ppc.num_participantes
          ELSE
            (t.total_parcela * 0.001) / ppc.num_participantes
        END
      ) as premio_dividido
    FROM wallet w
    INNER JOIN transactions t ON t.cliente_id = w.cliente_id
    INNER JOIN participantes_por_cliente ppc ON ppc.cliente_id = w.cliente_id
    LEFT JOIN cliente_solar cs ON cs.cliente_id = w.cliente_id
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
  
  -- Distributors: Count participants from participants table, not wallet
  WITH participantes_por_distribuidor AS (
    SELECT 
      COALESCE(p.distribuidor, 'Sem Registro') as representante,
      COUNT(*) as total_participantes
    FROM participants p
    GROUP BY COALESCE(p.distribuidor, 'Sem Registro')
  ),
  cliente_vendas AS (
    SELECT 
      cliente_id, 
      SUM(total_parcela) as vendas
    FROM transactions
    GROUP BY cliente_id
  ),
  distributor_wallet_stats AS (
    SELECT 
      COALESCE(w.distribuidor, 'Sem Registro') as representante,
      COUNT(DISTINCT w.cliente_id) as total_revendas,
      COUNT(DISTINCT CASE 
        WHEN COALESCE(cv.vendas, 0) > 500 THEN w.cliente_id 
      END) as revendas_ativas,
      COUNT(DISTINCT CASE 
        WHEN COALESCE(cv.vendas, 0) <= 500 THEN w.cliente_id 
      END) as revendas_inativas,
      COALESCE(SUM(cv.vendas), 0) as vendas_totais
    FROM wallet w
    LEFT JOIN cliente_vendas cv ON cv.cliente_id = w.cliente_id
    GROUP BY COALESCE(w.distribuidor, 'Sem Registro')
  )
  SELECT jsonb_agg(row_to_json(d)::jsonb ORDER BY d.vendas_totais DESC) INTO distributors_data
  FROM (
    SELECT 
      ppd.representante,
      ppd.total_participantes,
      COALESCE(dws.total_revendas, 0) as total_revendas,
      COALESCE(dws.revendas_ativas, 0) as revendas_ativas,
      COALESCE(dws.revendas_inativas, 0) as revendas_inativas,
      COALESCE(dws.vendas_totais, 0) as vendas_totais
    FROM participantes_por_distribuidor ppd
    LEFT JOIN distributor_wallet_stats dws ON dws.representante = ppd.representante
  ) d;
  
  distributors_data := COALESCE(distributors_data, '[]'::jsonb);
  
  -- Global KPIs: Return transactions with solar info for client-side calculation
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'cliente_id', t.cliente_id,
      'data_transacao', t.data_transacao,
      'tipo_venda', t.tipo_venda,
      'total_parcela', t.total_parcela,
      'premiacao_pct_norm', t.premiacao_pct_norm,
      'premiacao_valor', t.premiacao_valor,
      'created_at', t.created_at,
      'estab_comercial', t.estab_comercial,
      'valor_solar', COALESCE(ss.valor_solar, 0)
    )
  ) INTO all_transactions
  FROM transactions t
  LEFT JOIN solar_sales ss ON ss.cliente_id = t.cliente_id;
  
  SELECT jsonb_agg(row_to_json(ds)::jsonb) INTO all_department_store
  FROM department_store ds;
  
  -- NOVO: Buscar consultores na wallet que não são participantes
  SELECT jsonb_agg(w.participante ORDER BY w.participante) INTO unregistered_consultants
  FROM (
    SELECT DISTINCT w.participante
    FROM wallet w
    LEFT JOIN participants p ON LOWER(p.participante) = LOWER(w.participante)
    WHERE p.id IS NULL
  ) w;
  
  RETURN jsonb_build_object(
    'participants', COALESCE(participants_data, '[]'::jsonb),
    'distributors', COALESCE(distributors_data, '[]'::jsonb),
    'transactions', COALESCE(all_transactions, '[]'::jsonb),
    'department_store', COALESCE(all_department_store, '[]'::jsonb),
    'unregistered_consultants', COALESCE(unregistered_consultants, '[]'::jsonb)
  );
END;
$function$;