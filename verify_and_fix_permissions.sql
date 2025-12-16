-- "NUCLEAR OPTION" to Fix and Verify Permissions
-- Run this in Supabase SQL Editor

-- 1. Reset RLS on Reservations
alter table reservations enable row level security;

-- 2. Drop ALL possible existing policies (Clean Slate)
drop policy if exists "Reservations insertable by everyone" on reservations;
drop policy if exists "Reservations viewable by everyone" on reservations;
drop policy if exists "Reservations updatable by everyone" on reservations;
drop policy if exists "Reservations can be inserted by everyone" on reservations;
drop policy if exists "Reservations can be updated by everyone" on reservations;
drop policy if exists "Reservations are viewable by everyone (demo)" on reservations;
drop policy if exists "allow_all_reservations" on reservations;

-- 3. Create ONE Master Policy for EVERYTHING (Insert, Update, Select, Delete)
create policy "allow_all_reservations"
on reservations
for all
using (true)
with check (true);

-- 4. Grant access to the ID sequence (Fixes "permission denied for sequence" errors)
grant all on sequence reservations_id_seq to authenticated;
grant all on sequence reservations_id_seq to service_role;
grant all on sequence reservations_id_seq to anon;

-- 5. VERIFICATION:
-- If you see "allow_all_reservations" in the results below, IT WORKED.
select * from pg_policies where tablename = 'reservations';
