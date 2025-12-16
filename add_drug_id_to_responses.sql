
-- Add drug_id to pharmacy_responses to support reservation keys
alter table pharmacy_responses 
add column if not exists drug_id bigint references drugs(id);

-- Refresh schema cache
notify pgrst, 'reload schema';
