-- Function to manage inventory automatically based on reservation status
create or replace function public.manage_inventory()
returns trigger
language plpgsql
security definer
as $$
declare
  current_stock int;
  reserved_qty int;
begin
  -- ONLY handle updates where status changes
  if (TG_OP = 'UPDATE' and old.status = new.status) then
    return new;
  end if;

  reserved_qty := coalesce(new.quantity, 1); -- Default to 1 if null

  -- CASE 1: Reservation Confirmed -> Decrement Stock
  if (new.status = 'confirmed' and old.status = 'pending') then
    
    -- Check current stock using row lock to prevent race conditions
    select stock into current_stock
    from inventory
    where pharmacy_id = new.pharmacy_id and drug_id = new.drug_id
    for update;

    if (current_stock is null) then
      raise exception 'Drug not found in inventory';
    end if;

    if (current_stock < reserved_qty) then
      raise exception 'Insufficient stock. Current: %, Requested: %', current_stock, reserved_qty;
    end if;

    -- Update inventory
    update inventory
    set stock = stock - reserved_qty
    where pharmacy_id = new.pharmacy_id and drug_id = new.drug_id;
  
  -- CASE 2: Reservation Cancelled (after being confirmed) -> Increment Stock
  elsif (new.status = 'cancelled' and (old.status = 'confirmed' or old.status = 'completed')) then
    
    update inventory
    set stock = stock + reserved_qty
    where pharmacy_id = new.pharmacy_id and drug_id = new.drug_id;
  
  end if;

  return new;
end;
$$;

-- Drop existing trigger if it exists to avoid duplication errors
drop trigger if exists on_reservation_status_change on reservations;

-- Create the trigger
create trigger on_reservation_status_change
  before update on reservations
  for each row
  execute procedure public.manage_inventory();
