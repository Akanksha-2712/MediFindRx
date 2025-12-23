-- 1. Add hospital_id to emergency_requests if it doesn't exist
ALTER TABLE emergency_requests ADD COLUMN IF NOT EXISTS hospital_id uuid REFERENCES hospitals(id);

-- 2. Fix it so ANYONE can request an ambulance (RLS Fix)
DROP POLICY IF EXISTS "Emergencies insertable by everyone" ON emergency_requests;
DROP POLICY IF EXISTS "Emergencies viewable by everyone (demo)" ON emergency_requests;
DROP POLICY IF EXISTS "Emergencies updatable by everyone" ON emergency_requests;

ALTER TABLE emergency_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select" ON emergency_requests FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON emergency_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON emergency_requests FOR UPDATE USING (true);

-- 3. Make sure hospitals can see their own requests (extra safety)
CREATE POLICY "Hospitals can see their requests" ON emergency_requests 
FOR SELECT USING (hospital_id = auth.uid() OR auth.uid() IS NULL);
