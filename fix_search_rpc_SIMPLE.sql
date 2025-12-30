-- EMERGENCY SIMPLE FIX
-- Removes complex math to prevent 500 errors
drop function if exists search_medicines_nearby;

create or replace function search_medicines_nearby(
  search_text text,
  user_lat float8 default null,
  user_lng float8 default null
)
returns table (
  pharmacy_id bigint,
  pharmacy_name text,
  pharmacy_address text,
  pharmacy_lat float8,
  pharmacy_lng float8,
  drug_id bigint,
  drug_name text,
  drug_price numeric,
  stock int,
  distance_km float8
) 
language plpgsql
as $$
begin
  return query
  select 
    p.id::bigint,
    p.name::text,
    p.address::text,
    p.latitude::float8,
    p.longitude::float8,
    d.id::bigint,
    d.name::text,
    d.price::numeric,
    i.stock::int,
    0.0::float8 as distance_km -- DISABLE DISTANCE CALC temporarily
  from inventory i
  join drugs d on d.id = i.drug_id
  join pharmacies p on p.id = i.pharmacy_id
  where 
    d.name ilike '%' || search_text || '%'
    and i.stock > 0
  limit 50;
end;
$$;
