-- Update location for pharmacy 'katkar'
-- Using a default location (e.g., somewhere in Mumbai/Pune or generic)
-- You can change these values to your testing location

UPDATE pharmacies 
SET 
  latitude = 18.5204,  -- Example Lat
  longitude = 73.8567  -- Example Lng
WHERE name = 'katkar';

-- Verify
select * from pharmacies where name = 'katkar';
