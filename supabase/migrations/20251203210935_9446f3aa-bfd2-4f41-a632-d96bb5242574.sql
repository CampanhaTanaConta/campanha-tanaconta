-- Create solar_sales table to store solar sales values per CNPJ
CREATE TABLE public.solar_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id text NOT NULL UNIQUE,
  valor_solar numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.solar_sales ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can view solar_sales for clients in their wallet
CREATE POLICY "Users can view own solar_sales"
ON public.solar_sales
FOR SELECT
USING (cliente_id IN (
  SELECT wallet.cliente_id
  FROM wallet
  WHERE wallet.participante = current_setting('app.current_user_participante', true)
));

-- Update get_admin_table_counts to count solar_sales records
CREATE OR REPLACE FUNCTION public.get_admin_table_counts(p_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_counts jsonb;
BEGIN
  -- Verify admin
  IF NOT EXISTS (
    SELECT 1 FROM user_roles ur
    JOIN admin_users au ON au.id = ur.user_id
    WHERE au.email = p_email
    AND ur.role = 'admin'::app_role
  ) THEN
    RAISE EXCEPTION 'Acesso negado: usuário não é admin';
  END IF;
  
  -- Return counts (bypasses RLS due to SECURITY DEFINER)
  SELECT jsonb_build_object(
    'participants', (SELECT COUNT(*) FROM participants),
    'wallet', (SELECT COUNT(*) FROM wallet),
    'transactions', (SELECT COUNT(*) FROM transactions),
    'departmentStore', (SELECT COUNT(*) FROM department_store),
    'solarRecords', (SELECT COUNT(*) FROM solar_sales)
  ) INTO v_counts;
  
  RETURN v_counts;
END;
$function$;

-- Update get_dashboard_slices to include solar premium calculation
CREATE OR REPLACE FUNCTION public.get_dashboard_slices(p_email text, p_participante text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  wallet_ids text[];
  wallet_data jsonb;
  transactions_data jsonb;
  department_store_data jsonb;
BEGIN
  -- Set session variables for RLS
  PERFORM set_config('app.current_user_email', p_email, true);
  PERFORM set_config('app.current_user_participante', p_participante, true);
  
  -- Get wallet cliente_ids for filtering
  SELECT array_agg(cliente_id) INTO wallet_ids
  FROM wallet
  WHERE participante = p_participante;
  
  IF wallet_ids IS NULL THEN
    RETURN jsonb_build_object(
      'wallet', '[]'::jsonb,
      'transactions', '[]'::jsonb,
      'department_store', '[]'::jsonb
    );
  END IF;
  
  -- Get wallet data with participant count
  WITH participantes_por_cliente AS (
    SELECT 
      cliente_id,
      COUNT(DISTINCT participante)::integer as num_participantes,
      array_agg(DISTINCT participante) as lista_participantes
    FROM wallet
    GROUP BY cliente_id
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', w.id,
      'cliente_id', w.cliente_id,
      'cliente_nome', w.cliente_nome,
      'participante', w.participante,
      'created_at', w.created_at,
      'num_participantes', ppc.num_participantes,
      'compartilhado', (ppc.num_participantes > 1),
      'outros_participantes', (
        SELECT array_agg(p) 
        FROM unnest(ppc.lista_participantes) p 
        WHERE p != w.participante
      )
    )
  ) INTO wallet_data
  FROM wallet w
  INNER JOIN participantes_por_cliente ppc ON ppc.cliente_id = w.cliente_id
  WHERE w.participante = p_participante;
  
  -- Get transactions with calculated premiacao based on solar_sales
  -- Formula: solar value * 0.2% + (total - solar) * 0.1%
  WITH participantes_por_cliente AS (
    SELECT 
      cliente_id,
      COUNT(DISTINCT participante)::numeric as num_participantes
    FROM wallet
    GROUP BY cliente_id
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'cliente_id', t.cliente_id,
      'data_transacao', t.data_transacao,
      'tipo_venda', t.tipo_venda,
      'total_parcela', t.total_parcela,
      'premiacao_pct_norm', t.premiacao_pct_norm,
      'premiacao_valor', (
        -- Calculate premio: solar * 0.2% + (total - solar) * 0.1%, divided by participants
        CASE 
          WHEN ss.valor_solar IS NOT NULL AND ss.valor_solar > 0 THEN
            (LEAST(ss.valor_solar, t.total_parcela) * 0.002 + 
             GREATEST(0, t.total_parcela - ss.valor_solar) * 0.001) / ppc.num_participantes
          ELSE
            (t.total_parcela * 0.001) / ppc.num_participantes
        END
      ),
      'created_at', t.created_at,
      'num_participantes', ppc.num_participantes::integer,
      'compartilhado', (ppc.num_participantes > 1),
      'valor_solar', COALESCE(ss.valor_solar, 0)
    )
  ) INTO transactions_data
  FROM transactions t
  INNER JOIN participantes_por_cliente ppc ON ppc.cliente_id = t.cliente_id
  LEFT JOIN solar_sales ss ON ss.cliente_id = t.cliente_id
  WHERE t.cliente_id = ANY(wallet_ids);
  
  -- Get department_store data
  SELECT jsonb_agg(row_to_json(d)::jsonb) INTO department_store_data
  FROM department_store d
  WHERE d.cliente_id = ANY(wallet_ids);
  
  RETURN jsonb_build_object(
    'wallet', COALESCE(wallet_data, '[]'::jsonb),
    'transactions', COALESCE(transactions_data, '[]'::jsonb),
    'department_store', COALESCE(department_store_data, '[]'::jsonb)
  );
END;
$function$;

-- Update get_admin_dashboard_data to include solar premium calculation
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
  
  -- Distributors: Count DISTINCT participants per distributor
  WITH cliente_vendas AS (
    SELECT 
      cliente_id, 
      SUM(total_parcela) as vendas
    FROM transactions
    GROUP BY cliente_id
  )
  SELECT jsonb_agg(row_to_json(d)::jsonb) INTO distributors_data
  FROM (
    SELECT 
      COALESCE(w.distribuidor, 'Sem Distribuidor') as representante,
      COUNT(DISTINCT w.participante) as total_participantes,
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
    GROUP BY w.distribuidor
    ORDER BY vendas_totais DESC
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
  
  RETURN jsonb_build_object(
    'participants', COALESCE(participants_data, '[]'::jsonb),
    'distributors', COALESCE(distributors_data, '[]'::jsonb),
    'transactions', COALESCE(all_transactions, '[]'::jsonb),
    'department_store', COALESCE(all_department_store, '[]'::jsonb)
  );
END;
$function$;