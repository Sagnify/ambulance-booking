-- Add hospital login fields
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS hospital_id VARCHAR(50) UNIQUE;
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Update existing hospitals with login credentials
UPDATE hospitals SET 
    hospital_id = 'H' || LPAD(id::text, 3, '0'),
    password = 'admin'
WHERE hospital_id IS NULL;