-- Make user_id optional to allow anonymous feedback
alter table app_feedback alter column user_id drop not null;
