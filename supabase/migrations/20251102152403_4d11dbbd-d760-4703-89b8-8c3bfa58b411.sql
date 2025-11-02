-- Add birth_raw and birth_hash columns to admin_users table
ALTER TABLE admin_users 
ADD COLUMN birth_raw date,
ADD COLUMN birth_hash text;

-- Update existing admin with birth date and hash
UPDATE admin_users 
SET birth_raw = '1981-12-22',
    birth_hash = '5d8e52a5c7a65e29a058a5c53e79aa5c5c29a0e1ac3f6b0ea9c4a3c31e8ff7f0',
    password_hash = '5d8e52a5c7a65e29a058a5c53e79aa5c5c29a0e1ac3f6b0ea9c4a3c31e8ff7f0'
WHERE email = 'adriano@cappta.com.br';