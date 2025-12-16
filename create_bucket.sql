
-- 1. Create the storage bucket 'prescriptions'
insert into storage.buckets (id, name, public)
values ('prescriptions', 'prescriptions', true)
on conflict (id) do nothing;

-- 2. Allow public access to view files (so Pharmacy can see them)
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'prescriptions' );

-- 3. Allow authenticated users (Customers) to upload
create policy "Authenticated Uploads"
  on storage.objects for insert
  with check (
    bucket_id = 'prescriptions' 
    and auth.role() = 'authenticated'
  );
