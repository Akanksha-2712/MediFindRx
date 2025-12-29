-- Fix Hospital RLS Policies
-- Run this if "Hospital Account Not Linked" persists.

-- 1. Enable RLS (Ensure it's on)
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

-- 2. Drop potential blocking policies
DROP POLICY IF EXISTS "Hospitals are viewable by everyone" ON public.hospitals;
DROP POLICY IF EXISTS "Hospitals insert policy" ON public.hospitals;
DROP POLICY IF EXISTS "Hospitals can be inserted by everyone" ON public.hospitals;

-- 3. Re-create Permissive Policies
-- Allow Read for Everyone
CREATE POLICY "Hospitals are viewable by everyone" ON public.hospitals FOR SELECT USING (true);

-- Allow Insert for Authenticated Users (users can create their own hospital)
CREATE POLICY "Hospitals insert policy" ON public.hospitals 
FOR INSERT WITH CHECK ( auth.uid() = id );

-- Allow Update for Owner or Admin
DROP POLICY IF EXISTS "Hospitals update policy" ON public.hospitals;
CREATE POLICY "Hospitals update policy" ON public.hospitals 
FOR UPDATE USING (
  auth.uid() = id 
  OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
