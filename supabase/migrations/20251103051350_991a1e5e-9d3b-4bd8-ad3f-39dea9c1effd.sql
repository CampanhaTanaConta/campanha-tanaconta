-- Add distribuidor column to wallet table
ALTER TABLE public.wallet 
ADD COLUMN distribuidor text;

-- Create index for better query performance
CREATE INDEX idx_wallet_distribuidor 
ON public.wallet(distribuidor);

-- Add comment for documentation
COMMENT ON COLUMN public.wallet.distribuidor IS 'Distributor name from Carteira spreadsheet column C';