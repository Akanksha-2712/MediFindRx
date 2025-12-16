begin;
  -- Reset & Enable Realtime Publication
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;

-- Add relevant tables to the publication
alter publication supabase_realtime add table reservations;
alter publication supabase_realtime add table medicine_requests;
alter publication supabase_realtime add table pharmacy_responses;

-- Ensure Row Level Security (RLS) is Enabled but Permissive (Demo Mode)

-- RESERVATIONS
alter table reservations enable row level security;
drop policy if exists "Reservations viewable by everyone" on reservations;
create policy "Reservations viewable by everyone" on reservations for select using (true);

drop policy if exists "Reservations insertable by everyone" on reservations;
create policy "Reservations insertable by everyone" on reservations for insert with check (true);

drop policy if exists "Reservations updatable by everyone" on reservations;
create policy "Reservations updatable by everyone" on reservations for update using (true);

-- MEDICINE REQUESTS
alter table medicine_requests enable row level security;
drop policy if exists "Requests viewable by everyone" on medicine_requests;
create policy "Requests viewable by everyone" on medicine_requests for select using (true);

drop policy if exists "Requests insertable by everyone" on medicine_requests;
create policy "Requests insertable by everyone" on medicine_requests for insert with check (true);

drop policy if exists "Requests updatable by everyone" on medicine_requests;
create policy "Requests updatable by everyone" on medicine_requests for update using (true);

-- PHARMACY RESPONSES
alter table pharmacy_responses enable row level security;
drop policy if exists "Responses viewable by everyone" on pharmacy_responses;
create policy "Responses viewable by everyone" on pharmacy_responses for select using (true);

drop policy if exists "Responses insertable by everyone" on pharmacy_responses;
create policy "Responses insertable by everyone" on pharmacy_responses for insert with check (true);

drop policy if exists "Responses updatable by everyone" on pharmacy_responses;
create policy "Responses updatable by everyone" on pharmacy_responses for update using (true);

-- Reload Schema Cache
notify pgrst, 'reload schema';
