-- Deletar a entrada duplicada de PATRÍCIA GOMIERATO MARIANO (email em maiúsculas, distribuidor NULL)
DELETE FROM participants 
WHERE email = 'GOMIERATO20@GMAIL.COM' 
  AND distribuidor IS NULL;

-- Criar índice único case-insensitive para emails para prevenir futuras duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS participants_email_lower_idx 
ON participants (LOWER(email));