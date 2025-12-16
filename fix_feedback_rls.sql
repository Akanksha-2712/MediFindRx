-- Enable RLS on the table
alter table app_feedback enable row level security;

-- Drop existing policies to avoid conflicts
drop policy if exists "Feedback insertable by everyone" on app_feedback;
drop policy if exists "Feedback viewable by everyone" on app_feedback;
drop policy if exists "Users can insert their own feedback" on app_feedback;
drop policy if exists "Authenticated users can view feedback" on app_feedback;

-- Create a permissive insert policy
create policy "Feedback insertable by everyone" 
on app_feedback for insert 
with check (true);

-- Create a permissive select policy
create policy "Feedback viewable by everyone" 
on app_feedback for select 
using (true);
