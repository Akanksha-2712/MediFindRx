-- TEMPORARY: Allow anyone to upload to 'prescriptions' for testing
drop policy if exists "Authenticated Uploads" on storage.objects;
drop policy if exists "Public Uploads Test" on storage.objects;

create policy "Public Uploads Test"
on storage.objects for insert
with check ( bucket_id = 'prescriptions' );
