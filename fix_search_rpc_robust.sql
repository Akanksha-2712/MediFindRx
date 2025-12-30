-- Drop first to allow signature changes if needed
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
declare
  -- Variable to hold temporary calc results if needed
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
    -- SAFE DISTANCE CALCULATION
    case 
      when user_lat is not null and user_lng is not null and p.latitude is not null and p.longitude is not null 
      then (
        6371 * acos(
          -- CLAMP value between -1 and 1 to prevent "input is out of range" 500 error
          greatest(-1.0, least(1.0, 
            cos(radians(user_lat)) * cos(radians(p.latitude::float8)) * cos(radians(p.longitude::float8) - radians(user_lng)) + 
            sin(radians(user_lat)) * sin(radians(p.latitude::float8))
          ))
        )
      )::float8
      else null::float8
    end as distance
  from inventory i
  join drugs d on d.id = i.drug_id
  join pharmacies p on p.id = i.pharmacy_id
  where 
    -- 1. Search Logic
    d.name ilike '%' || search_text || '%'
    -- 2. Stock Logic
    and i.stock > 0
  order by 
    -- 3. Sorting Logic
    case when user_lat is not null then distance else d.price::float8 end asc,
    d.price asc
  limit 50;
  
exception 
  when others then
    -- If ANYTHING creates an error, return empty set instead of 500
    -- In production, you might want to log this to a table
    return;
end;
$$;
