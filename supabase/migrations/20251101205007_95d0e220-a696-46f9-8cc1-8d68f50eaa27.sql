-- Create participants table for authentication
CREATE TABLE public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  participante TEXT NOT NULL,
  birth_raw DATE NOT NULL,
  birth_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create wallet table (maps participants to clients)
CREATE TABLE public.wallet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participante TEXT NOT NULL,
  cliente_id TEXT NOT NULL,
  cliente_nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(participante, cliente_id)
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id TEXT NOT NULL,
  data_transacao DATE NOT NULL,
  tipo_venda TEXT NOT NULL,
  total_parcela DECIMAL(12, 2) NOT NULL,
  premiacao_pct_norm DECIMAL(5, 4) NOT NULL,
  premiacao_valor DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for participants (users can only see their own data)
CREATE POLICY "Users can view own participant data"
  ON public.participants
  FOR SELECT
  USING (email = current_setting('app.current_user_email', true));

-- RLS Policies for wallet (users can only see their own wallet)
CREATE POLICY "Users can view own wallet"
  ON public.wallet
  FOR SELECT
  USING (participante = current_setting('app.current_user_participante', true));

-- RLS Policies for transactions (users can only see transactions for their clients)
CREATE POLICY "Users can view own transactions"
  ON public.transactions
  FOR SELECT
  USING (cliente_id IN (
    SELECT cliente_id 
    FROM public.wallet 
    WHERE participante = current_setting('app.current_user_participante', true)
  ));

-- Create indexes for better performance
CREATE INDEX idx_wallet_participante ON public.wallet(participante);
CREATE INDEX idx_transactions_cliente_id ON public.transactions(cliente_id);
CREATE INDEX idx_transactions_data ON public.transactions(data_transacao);
CREATE INDEX idx_participants_email ON public.participants(email);