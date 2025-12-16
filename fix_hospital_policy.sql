
-- Allow hospitals to insert their own record (Auto-Heal capability)
create policy "Hospitals can be inserted by owners"
on hospitals for insert
with check (auth.uid() = id);

-- Ensure the update policy is correct
drop policy if exists "Hospitals can be updated by owner" on hospitals;
create policy "Hospitals can be updated by owner" 
on hospitals for update 
using (auth.uid() = id);
