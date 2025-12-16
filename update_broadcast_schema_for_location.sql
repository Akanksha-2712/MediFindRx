
-- Add location columns to pharmacy_responses to support navigation in broadcast mode
alter table pharmacy_responses 
add column if not exists pharmacy_lat numeric,
add column if not exists pharmacy_lng numeric;

-- Refresh schema cache occasionally helps
notify pgrst, 'reload schema';
