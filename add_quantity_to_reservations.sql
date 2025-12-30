-- Add quantity column to reservations table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reservations' AND column_name = 'quantity') THEN
        ALTER TABLE reservations ADD COLUMN quantity INTEGER DEFAULT 1;
    END IF;
END $$;
