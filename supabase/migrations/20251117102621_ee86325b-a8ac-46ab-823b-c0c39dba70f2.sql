-- Create function to get last upload date from transactions table
-- This function bypasses RLS to always return the global last upload date
CREATE OR REPLACE FUNCTION public.get_last_upload_date()
RETURNS timestamptz
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT MAX(created_at) FROM public.transactions;
$$;