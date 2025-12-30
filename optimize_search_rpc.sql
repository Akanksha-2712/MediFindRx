-- 1. Enable extensions for fuzzy search and geo-calc
create extension if not exists pg_trgm;

-- 2. Add Indexes ("Speed Dials")
-- Speed up searching by drug name (case-insensitive)
create index if not exists idx_drugs_name_trgm on drugs using gin (name gin_trgm_ops);

-- Speed up finding items with stock > 0
create index if not exists idx_inventory_pharmacy_drug on inventory (pharmacy_id, drug_id) where stock > 0;

-- 3. The "Unbeatable" Search Function
-- This runs on the server, not the phone!
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
    p.id as pharmacy_id,
    p.name as pharmacy_name,
    p.address as pharmacy_address,
    p.latitude as pharmacy_lat,
    p.longitude as pharmacy_lng,
    d.id as drug_id,
    d.name as drug_name,
    d.price as drug_price,
    i.stock,
    -- Calculate distance only if user location provided
    case 
      when user_lat is not null and user_lng is not null and p.latitude is not null and p.longitude is not null 
      then (
        6371 * acos(
          cos(radians(user_lat)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(user_lng)) + 
          sin(radians(user_lat)) * sin(radians(p.latitude))
        )
      )
      else null
    end as distance_km
  from inventory i
  join drugs d on d.id = i.drug_id
  join pharmacies p on p.id = i.pharmacy_id
  where 
    -- 1. Search Logic (Case Insensitive Partial Match)
    d.name ilike '%' || search_text || '%'
    -- 2. Stock Logic (Must have inventory)
    and i.stock > 0
  order by 
    -- 3. Sorting Logic: Distance first (if available), then Price
    case when user_lat is not null then distance_km else d.price end asc,
    d.price asc
  limit 50; -- Limit results for speed
end;
$$;
