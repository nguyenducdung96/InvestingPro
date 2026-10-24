begin;
-- Preserve certified totals; expose the sum of known CDN row weights separately.
alter table port.php_plan_days add column arrival_known_dwt numeric check(arrival_known_dwt>=0);
alter table port.php_plan_days add column departure_known_dwt numeric check(departure_known_dwt>=0);
create function port.set_cdn_known_dwt() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.asset_code='tien_sa' then
  if new.version_id is null then
   new.arrival_known_dwt:=null;new.departure_known_dwt:=null;
  else
   select coalesce(sum((e->>'dwt')::numeric) filter(where e->>'direction'='arrival'),0),
    coalesce(sum((e->>'dwt')::numeric) filter(where e->>'direction'='departure'),0)
   into new.arrival_known_dwt,new.departure_known_dwt
   from port.php_plan_versions v cross join lateral jsonb_array_elements(v.events) e
   where v.id=new.version_id and v.asset_code=new.asset_code and v.report_day=new.report_day;
  end if;
 else
  new.arrival_known_dwt:=null;new.departure_known_dwt:=null;
 end if;
 return new;
end $$;
revoke all on function port.set_cdn_known_dwt() from public,anon,authenticated;
create trigger cdn_known_dwt before insert or update on port.php_plan_days
 for each row execute function port.set_cdn_known_dwt();
-- Recompute metadata from the active immutable version, without changing evidence,
-- timestamps, strict DWT, error state or any other asset's totals.
update port.php_plan_days set arrival_known_dwt=null where asset_code='tien_sa';
notify pgrst,'reload schema';
commit;
