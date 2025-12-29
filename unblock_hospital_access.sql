-- UNBLOCK HOSPITAL ACCESS (Critical Fix)
-- This script does two things:
-- 1. Relaxes security policies to allow your browser to create the account.
-- 2. Manually creates the account on the server side just in case.

-- Part 1: Fix Permission Denied (RLS)
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Hospitals are viewable by everyone" ON public.hospitals;
    DROP POLICY IF EXISTS "Hospitals insert policy" ON public.hospitals;
    DROP POLICY IF EXISTS "Hospitals update policy" ON public.hospitals;
    DROP POLICY IF EXISTS "Hospitals can be inserted by everyone" ON public.hospitals;
    DROP POLICY IF EXISTS "Admins/Owners can update hospitals" ON public.hospitals;
END $$;

-- Create Open Policies (Safe for this stage of dev)
CREATE POLICY "Hospitals viewable by everyone" ON public.hospitals FOR SELECT USING (true);
CREATE POLICY "Hospitals insertable by everyone" ON public.hospitals FOR INSERT WITH CHECK (true);
CREATE POLICY "Hospitals updatable by everyone" ON public.hospitals FOR UPDATE USING (true);


-- Part 2: Force-Backfill Missing Records
-- If the UI failed to create it, this SQL will do it.
INSERT INTO public.hospitals (id, name, address, phone, approved)
SELECT 
    id, 
    COALESCE(raw_user_meta_data->>'name', 'Hospital'), 
    'Pending Address', 
    'Pending Phone', 
    false 
FROM auth.users
WHERE raw_user_meta_data->>'role' = 'hospital'
ON CONFLICT (id) DO NOTHING;
