-- Add quantity column to reservations table to fix insert error
alter table reservations 
add column if not exists quantity integer default 1;

-- Verify
select * from reservations limit 1;
