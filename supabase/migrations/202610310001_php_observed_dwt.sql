begin;
-- The installed trigger already covers php_plan_days, but its legacy function
-- only populated known weights for CDN. Preserve known row contributions for
-- every supported berth without changing strict totals or immutable evidence.
create or replace function port.set_cdn_known_dwt() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.version_id is null then
  new.arrival_known_dwt:=null;new.departure_known_dwt:=null;
 else
  select coalesce(sum((e->>'dwt')::numeric) filter(where e->>'direction'='arrival'),0),
   coalesce(sum((e->>'dwt')::numeric) filter(where e->>'direction'='departure'),0)
  into new.arrival_known_dwt,new.departure_known_dwt
  from port.php_plan_versions v cross join lateral jsonb_array_elements(v.events) e
  where v.id=new.version_id and v.asset_code=new.asset_code and v.report_day=new.report_day;
 end if;
 return new;
end $$;
revoke all on function port.set_cdn_known_dwt() from public,anon,authenticated;
-- Recompute derived columns only; timestamps, raw missing weights, strict DWT,
-- counts, source hashes, error states and selected versions remain unchanged.
update port.php_plan_days set arrival_known_dwt=arrival_known_dwt;
notify pgrst,'reload schema';
commit;
