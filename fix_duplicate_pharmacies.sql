-- Fix Duplicate Pharmacies
-- This script keeps only the first pharmacy record for each owner and deletes the rest.
-- It resolves the "Results contain > 1 rows" error in the login flow.

DELETE FROM public.pharmacies
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY owner_id ORDER BY created_at ASC) as r_num
    FROM public.pharmacies
    WHERE owner_id IS NOT NULL
  ) t
  WHERE t.r_num > 1
);
