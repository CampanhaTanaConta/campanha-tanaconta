-- Create department_store table to track all potential clients
CREATE TABLE public.department_store (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id text NOT NULL UNIQUE,
  id_externo text,
  tipo_pessoa text,
  cpf text,
  nome text NOT NULL,
  tipo text,
  marketplace text,
  representante text,
  plano text,
  cidade text,
  uf text,
  cnpj text,
  razao_social text,
  email text,
  telefone text,
  etapa text,
  data_cadastro date,
  status text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.department_store ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view all department store data
CREATE POLICY "Users can view all department store data"
ON public.department_store
FOR SELECT
USING (true);

-- Create index for performance
CREATE INDEX idx_department_store_cliente_id ON public.department_store(cliente_id);
CREATE INDEX idx_department_store_representante ON public.department_store(representante);