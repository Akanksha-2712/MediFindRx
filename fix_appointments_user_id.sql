-- Add user_id to hospital_appointments for customer notifications
ALTER TABLE hospital_appointments ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users;

-- Update RLS to allow users to see their own appointments
DROP POLICY IF EXISTS "Everyone can view appointments" ON hospital_appointments;
CREATE POLICY "Users can view their own appointments" ON hospital_appointments FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM hospitals));
CREATE POLICY "Users can insert their own appointments" ON hospital_appointments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable Real-time for hospital_appointments if not already
ALTER PUBLICATION supabase_realtime ADD TABLE hospital_appointments;
