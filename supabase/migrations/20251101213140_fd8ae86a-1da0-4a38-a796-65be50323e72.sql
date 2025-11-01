-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policy: Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (user_id::text = current_setting('app.current_user_id'::text, true));

-- RLS policy: Only admins can insert roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(user_id, 'admin'));

-- RLS policy: Only admins can update roles
CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(user_id, 'admin'));

-- RLS policy: Only admins can delete roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(user_id, 'admin'));

-- Insert first admin: Adriano Vieira de Carvalho
-- Email: adriano@cappta.com.br
-- Birth date: 22/12/1981 (password: 22121981)
-- Hash SHA256 of "22121981": 8b83fe6e49878841e0d4fe372eb5c821af8b98048cc24e1d0f601cbd0d1e8b4a

INSERT INTO public.participants (participante, email, birth_raw, birth_hash)
VALUES (
  'Adriano Vieira de Carvalho',
  'adriano@cappta.com.br',
  '1981-12-22',
  '8b83fe6e49878841e0d4fe372eb5c821af8b98048cc24e1d0f601cbd0d1e8b4a'
)
ON CONFLICT (email) DO NOTHING;

-- Assign admin role to Adriano
-- We use a subquery to get the user_id from participants table
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM public.participants
WHERE email = 'adriano@cappta.com.br'
ON CONFLICT (user_id, role) DO NOTHING;