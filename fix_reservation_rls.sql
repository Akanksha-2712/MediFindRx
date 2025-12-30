-- Enable RLS on reservations
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- 1. Allow pharmacies to UPDATE reservations assigned to them
CREATE POLICY "Pharmacies can update their own reservations"
ON reservations
FOR UPDATE
USING (
  pharmacy_id IN (
    SELECT id FROM pharmacies WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  pharmacy_id IN (
    SELECT id FROM pharmacies WHERE owner_id = auth.uid()
  )
);

-- 2. Allow pharmacies to VIEW their own reservations (if not already enabled)
CREATE POLICY "Pharmacies can view their own reservations"
ON reservations
FOR SELECT
USING (
  pharmacy_id IN (
    SELECT id FROM pharmacies WHERE owner_id = auth.uid()
  )
);

-- 3. Allow customers to VIEW their own reservations
CREATE POLICY "Customers can view their own reservations"
ON reservations
FOR SELECT
USING (
  user_id = auth.uid()
);

-- 4. Allow customers to INSERT reservations (already likely exists but good to ensure)
CREATE POLICY "Customers can create reservations"
ON reservations
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);
