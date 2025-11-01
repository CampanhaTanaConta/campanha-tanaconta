-- Create app_role enum if it doesn't exist
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create user_roles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Drop and recreate the has_role function
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
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

-- Create RLS policies
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (user_id::text = current_setting('app.current_user_id'::text, true));

CREATE POLICY "Admins can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (has_role(user_id, 'admin'::app_role));

CREATE POLICY "Admins can update roles"
ON public.user_roles
FOR UPDATE
USING (has_role(user_id, 'admin'::app_role));

CREATE POLICY "Admins can delete roles"
ON public.user_roles
FOR DELETE
USING (has_role(user_id, 'admin'::app_role));

-- Create admin_users table to store admin credentials separately
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Admins can view all admin users
CREATE POLICY "Admins can view admin users"
ON public.admin_users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = id AND role = 'admin'::app_role
  )
);

-- Insert the first admin (Adriano)
INSERT INTO public.admin_users (id, email, password_hash, name)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'adriano@cappta.com.br',
  'd70116a54b20b6af1a5729cb0da7ea3f9f3498e6e2f79fb83dbceaec2bc29d33',
  'Adriano Vieira de Carvalho'
)
ON CONFLICT (email) DO NOTHING;

-- Assign admin role to Adriano
INSERT INTO public.user_roles (user_id, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin'::app_role
)
ON CONFLICT (user_id, role) DO NOTHING;