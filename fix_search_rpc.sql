-- Drop it first to be sure we can change return types
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
    p.id::bigint as pharmacy_id,
    p.name::text as pharmacy_name,
    p.address::text as pharmacy_address,
    p.latitude::float8 as pharmacy_lat,
    p.longitude::float8 as pharmacy_lng,
    d.id::bigint as drug_id,
    d.name::text as drug_name,
    d.price::numeric as drug_price,
    i.stock::int,
    -- Calculate distance
    case 
      when user_lat is not null and user_lng is not null and p.latitude is not null and p.longitude is not null 
      then (
        6371 * acos(
          cos(radians(user_lat)) * cos(radians(p.latitude::float8)) * cos(radians(p.longitude::float8) - radians(user_lng)) + 
          sin(radians(user_lat)) * sin(radians(p.latitude::float8))
        )
      )::float8
      else null::float8
    end as distance_km
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
    case when user_lat is not null then distance_km else d.price::float8 end asc,
    d.price asc
  limit 50;
end;
$$;
