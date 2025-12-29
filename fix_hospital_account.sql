-- Fix Hospital Account Issues
-- 1. Deduplicate Hospitals (Keep oldest)
DELETE FROM public.hospitals
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY id ORDER BY created_at ASC) as r_num
    FROM public.hospitals
  ) t
  WHERE t.r_num > 1
);

-- 2. Force Create if Missing (for all hospital users)
INSERT INTO public.hospitals (id, name, address, phone, approved)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'name', 'My Hospital'), 
    'Pending Address', 
    'Pending Phone', 
    true -- Auto-approve
FROM auth.users
WHERE raw_user_meta_data->>'role' = 'hospital'
AND NOT EXISTS (SELECT 1 FROM public.hospitals WHERE id = auth.users.id);
