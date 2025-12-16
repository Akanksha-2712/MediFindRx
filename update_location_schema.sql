
-- Add location columns
alter table public.pharmacies 
add column if not exists latitude numeric, 
add column if not exists longitude numeric;

alter table public.hospitals 
add column if not exists latitude numeric, 
add column if not exists longitude numeric;

-- Update the handle_new_user function to extract location from metadata
create or replace function public.handle_new_user()
returns trigger 
language plpgsql 
security definer
set search_path = public, pg_temp, pg_catalog
as $$
declare
  user_lat numeric;
  user_lng numeric;
begin
  -- Extract location from metadata safe casting
  begin
    user_lat := (new.raw_user_meta_data->>'latitude')::numeric;
    user_lng := (new.raw_user_meta_data->>'longitude')::numeric;
  exception when others then
    user_lat := null;
    user_lng := null;
  end;

  insert into public.profiles (id, email, name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'role');
  
  -- Pharmacy
  if (new.raw_user_meta_data->>'role' = 'pharmacy') then
    insert into public.pharmacies (name, owner_id, address, phone, latitude, longitude)
    values (
        new.raw_user_meta_data->>'name', 
        new.id, 
        'Pending Address Update', 
        'Pending Phone',
        user_lat,
        user_lng
    );
  end if;

  -- Hospital
  if (new.raw_user_meta_data->>'role' = 'hospital') then
    insert into public.hospitals (id, name, address, phone, latitude, longitude)
    values (
        new.id, 
        new.raw_user_meta_data->>'name', 
        'Pending Address', 
        'Pending Phone',
        user_lat,
        user_lng
    );
  end if;

  return new;
end;
$$;
