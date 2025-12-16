-- OPTIMIZATION SCRIPT: Fix RLS Warnings & Performance
-- Run this in Supabase SQL Editor to resolve "Auth RLS Initialization Plan" and "Multiple Permissive Policies" warnings.

BEGIN;

--------------------------------------------------------------------------------
-- 1. PROFILES (Fix Performance: Wrap auth calls)
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles 
FOR INSERT WITH CHECK ( (select auth.uid()) = id );

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles 
FOR UPDATE USING ( (select auth.uid()) = id );


--------------------------------------------------------------------------------
-- 2. HOSPITALS (Fix Duplicates + Performance)
--------------------------------------------------------------------------------
-- Drop Duplicate VIEW policies
DROP POLICY IF EXISTS "Hospitals are viewable by everyone" ON hospitals;
DROP POLICY IF EXISTS "Hospitals public view" ON hospitals;
-- Re-create Single VIEW Policy
CREATE POLICY "Hospitals viewable by everyone" ON hospitals 
FOR SELECT USING (true);

-- Drop Duplicate/Inefficient UPDATE/INSERT policies
DROP POLICY IF EXISTS "Admins/Owners can update hospitals" ON hospitals;
DROP POLICY IF EXISTS "Hospitals can be updated by admin" ON hospitals;
DROP POLICY IF EXISTS "Hospitals owner update" ON hospitals;
DROP POLICY IF EXISTS "Hospitals can be inserted by owners" ON hospitals;

-- Single Update Policy (Owner OR Admin)
CREATE POLICY "Hospitals update policy" ON hospitals 
FOR UPDATE USING (
  (select auth.uid()) = id 
  OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'admin')
);

-- Single Insert Policy (Authenticated only - minimal check, profiles usually handles role)
CREATE POLICY "Hospitals insert policy" ON hospitals 
FOR INSERT WITH CHECK ( (select auth.role()) = 'authenticated' );


--------------------------------------------------------------------------------
-- 3. PHARMACIES (Fix Duplicates + Performance)
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Pharmacies are viewable by everyone" ON pharmacies;
DROP POLICY IF EXISTS "Pharmacies viewable by everyone" ON pharmacies;

CREATE POLICY "Pharmacies viewable by everyone" ON pharmacies 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins/Owners can update pharmacies" ON pharmacies;
DROP POLICY IF EXISTS "Pharmacies can be updated by admin" ON pharmacies;
DROP POLICY IF EXISTS "Pharmacies updatable by authenticated" ON pharmacies;

CREATE POLICY "Pharmacies update policy" ON pharmacies 
FOR UPDATE USING (
  (select auth.uid()) = owner_id 
  OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'admin')
);


--------------------------------------------------------------------------------
-- 4. MEDICINE REQUESTS (Fix Duplicates + Performance)
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Requests viewable by everyone" ON medicine_requests;
CREATE POLICY "Requests viewable by everyone" ON medicine_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Requests insertable by authenticated users" ON medicine_requests;
DROP POLICY IF EXISTS "Requests insertable by everyone" ON medicine_requests;
-- Single Insert Policy
CREATE POLICY "Requests insert policy" ON medicine_requests 
FOR INSERT WITH CHECK ( (select auth.role()) = 'authenticated' );

DROP POLICY IF EXISTS "Requests updatable by everyone" ON medicine_requests;
DROP POLICY IF EXISTS "Requests updatable by owner" ON medicine_requests;
-- Single Update Policy (Owner only)
CREATE POLICY "Requests update policy" ON medicine_requests 
FOR UPDATE USING ( (select auth.uid()) = user_id );


--------------------------------------------------------------------------------
-- 5. PHARMACY RESPONSES (Fix Duplicates + Performance)
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Responses viewable by everyone" ON pharmacy_responses;
CREATE POLICY "Responses viewable by everyone" ON pharmacy_responses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Responses insertable by authenticated users" ON pharmacy_responses;
DROP POLICY IF EXISTS "Responses insertable by everyone" ON pharmacy_responses;

CREATE POLICY "Responses insert policy" ON pharmacy_responses 
FOR INSERT WITH CHECK ( (select auth.role()) = 'authenticated' );


--------------------------------------------------------------------------------
-- 6. RESERVATIONS (Fix Duplicates + Performance)
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Reservations insertable by everyone" ON reservations;
DROP POLICY IF EXISTS "allow_all_reservations" ON reservations;
DROP POLICY IF EXISTS "Reservations can be inserted by everyone" ON reservations;

CREATE POLICY "Reservations insert policy" ON reservations 
FOR INSERT WITH CHECK (true); -- Keeping permissive for demo smooth flow, but verified single policy

DROP POLICY IF EXISTS "Reservations viewable by everyone" ON reservations;
CREATE POLICY "Reservations viewable by everyone" ON reservations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Reservations updatable by everyone" ON reservations;
CREATE POLICY "Reservations updatable by everyone" ON reservations FOR UPDATE USING (true);


--------------------------------------------------------------------------------
-- 7. HOSPITAL APPOINTMENTS (Fix Performance)
--------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Appointments owner all" ON hospital_appointments;
CREATE POLICY "Appointments owner all" ON hospital_appointments
FOR ALL USING ( (select auth.uid()) = hospital_id );


COMMIT;
