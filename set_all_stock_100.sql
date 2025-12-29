-- Set All Stock to 100 & Backfill Missing Inventory
-- This script ensures EVERY pharmacy has EVERY drug with exactly 100 stock.

-- 1. Update existing inventory records to 100
UPDATE public.inventory 
SET stock = 100;

-- 2. Insert missing inventory records (Backfill)
-- If a pharmacy is missing a drug, insert it with 100 stock.
-- If it exists (ON CONFLICT), we force it to 100 just to be safe (though step 1 handled it).
INSERT INTO public.inventory (pharmacy_id, drug_id, stock)
SELECT p.id, d.id, 100
FROM public.pharmacies p
CROSS JOIN public.drugs d
ON CONFLICT (pharmacy_id, drug_id) 
DO UPDATE SET stock = 100;
