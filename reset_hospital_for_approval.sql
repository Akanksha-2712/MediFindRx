-- Reset Hospital for Approval Testing
-- 1. Deduplicate (Safety first)
DELETE FROM public.hospitals
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY id ORDER BY created_at ASC) as r_num
    FROM public.hospitals
  ) t
  WHERE t.r_num > 1
);

-- 2. Ensure Record Exists & Set to Pending
-- This forces the hospital to be "Unapproved" so it shows up in Admin Dashboard
INSERT INTO public.hospitals (id, name, address, phone, approved)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'name', 'My Hospital'), 
    'Pending Address', 
    'Pending Phone', 
    false -- Set to FALSE to test Approval Flow
FROM auth.users
WHERE raw_user_meta_data->>'role' = 'hospital'
ON CONFLICT (id) DO UPDATE 
SET approved = false; -- Reset existing to false
