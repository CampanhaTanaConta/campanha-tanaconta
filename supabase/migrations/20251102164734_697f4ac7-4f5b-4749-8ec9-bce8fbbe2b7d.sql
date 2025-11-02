-- Recalcular hashes de admin_users COM BARRAS (DD/MM/YYYY)
UPDATE admin_users
SET 
  birth_hash = encode(
    digest(
      to_char(birth_raw, 'DD/MM/YYYY'),
      'sha256'
    ),
    'hex'
  ),
  password_hash = encode(
    digest(
      to_char(birth_raw, 'DD/MM/YYYY'),
      'sha256'
    ),
    'hex'
  )
WHERE birth_raw IS NOT NULL;

-- Recalcular hashes de participants COM BARRAS (DD/MM/YYYY)
UPDATE participants
SET 
  birth_hash = encode(
    digest(
      to_char(birth_raw, 'DD/MM/YYYY'),
      'sha256'
    ),
    'hex'
  )
WHERE birth_raw IS NOT NULL;