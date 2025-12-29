-- Remove Duplicate Drugs Script
-- This script identifies duplicate drugs based on Name and Dosage.
-- It keeps the original (lowest ID) and deletes the duplicates.
-- Existing Reservations are re-linked to the original drug so orders aren't lost.
-- Inventory for duplicates is removed (cascade delete) to prevent stock conflicts.

DO $$
DECLARE
BEGIN
    -- 1. Create a temporary mapping of duplicates to their "survivor" (min ID)
    -- We group by Name and Dosage to ensure different dosages of the same drug aren't merged.
    CREATE TEMP TABLE IF NOT EXISTS drug_duplicates AS
    SELECT 
        d.id as victim_id,
        s.survivor_id
    FROM drugs d
    JOIN (
        SELECT MIN(id) as survivor_id, lower(name) as n, coalesce(dosage, '') as dsg
        FROM drugs
        GROUP BY lower(name), coalesce(dosage, '')
        HAVING COUNT(*) > 1
    ) s ON lower(d.name) = s.n AND coalesce(d.dosage, '') = s.dsg
    WHERE d.id != s.survivor_id;

    -- 2. Relink Reservations: Update reservations pointing to victim -> survivor
    UPDATE reservations r
    SET drug_id = map.survivor_id
    FROM drug_duplicates map
    WHERE r.drug_id = map.victim_id;

    -- 3. Delete Victims: Inventory for these IDs will automatically be deleted 
    -- due to the 'ON DELETE CASCADE' constraint on the inventory table.
    DELETE FROM drugs
    WHERE id IN (SELECT victim_id FROM drug_duplicates);

    -- Cleanup
    DROP TABLE IF EXISTS drug_duplicates;
END $$;
