-- Consolidated Fix for Reservations
-- Run this in Supabase SQL Editor

-- 1. Add missing 'quantity' column
alter table reservations 
add column if not exists quantity integer default 1;

-- 2. Ensure Permissions are Open (for Demo)
alter table reservations enable row level security;

-- Drop existing to avoid conflict errors
drop policy if exists "Reservations insertable by everyone" on reservations;
drop policy if exists "Reservations can be inserted by everyone" on reservations;

-- Create fresh open policy
create policy "Reservations insertable by everyone" 
on reservations for insert 
with check (true);

-- 3. Ensure Select/Update are also open
drop policy if exists "Reservations viewable by everyone" on reservations;
create policy "Reservations viewable by everyone" on reservations for select using (true);

drop policy if exists "Reservations updatable by everyone" on reservations;
create policy "Reservations updatable by everyone" on reservations for update using (true);
