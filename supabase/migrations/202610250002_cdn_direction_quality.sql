begin;
create table port.cdn_plan_quality (
 asset_code text not null default 'tien_sa' check(asset_code='tien_sa'),
 version_id uuid primary key, arrival_unresolved int not null check(arrival_unresolved between 0 and 500),
 departure_unresolved int not null check(departure_unresolved between 0 and 500),
 foreign key(asset_code,version_id) references port.php_plan_versions(asset_code,id)
);
alter table port.cdn_plan_quality enable row level security;
revoke all on port.cdn_plan_quality from public,anon,authenticated;
create trigger immutable_cdn_plan_quality before update or delete on port.cdn_plan_quality
 for each row execute function core.immutable_record();
alter table port.php_plan_days add column arrival_ambiguous_groups int check(arrival_ambiguous_groups>=0);
alter table port.php_plan_days add column departure_ambiguous_groups int check(departure_ambiguous_groups>=0);
create function port.set_cdn_direction_quality() returns trigger
language plpgsql security definer set search_path='' as $$
declare qa int; qd int;
begin
 if new.asset_code='tien_sa' then
  if new.version_id is null then
   new.arrival_ambiguous_groups:=null;new.departure_ambiguous_groups:=null;
  else
   select count(*) filter(where g.direction='arrival'),count(*) filter(where g.direction='departure')
   into new.arrival_ambiguous_groups,new.departure_ambiguous_groups
   from (select e->>'direction' direction from port.php_plan_versions v cross join lateral jsonb_array_elements(v.events) e
    where v.id=new.version_id and v.asset_code='tien_sa'
    group by e->>'direction',e->>'vessel_name',e->>'from_berth',e->>'to_berth' having count(*)>1) g;
   select arrival_unresolved,departure_unresolved into qa,qd from port.cdn_plan_quality where version_id=new.version_id;
   new.arrival_ambiguous_groups:=new.arrival_ambiguous_groups+coalesce(qa,0);
   new.departure_ambiguous_groups:=new.departure_ambiguous_groups+coalesce(qd,0);
   new.ambiguous_groups:=new.arrival_ambiguous_groups+new.departure_ambiguous_groups;
  end if;
 end if;
 return new;
end $$;
revoke all on function port.set_cdn_direction_quality() from public,anon,authenticated;
create trigger cdn_direction_quality before insert or update on port.php_plan_days
 for each row execute function port.set_cdn_direction_quality();
create function port.import_cdn_plan_days(p_days jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d jsonb; q jsonb; v uuid; a int; z int; old_a int; old_z int; result jsonb; inserted int:=0;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'Schedule importer required';end if;
 if jsonb_typeof(p_days) is distinct from 'array' or jsonb_array_length(p_days) not between 1 and 31 then raise exception 'Invalid schedule batch';end if;
 for d in select * from jsonb_array_elements(p_days) loop
  q:=coalesce(d->'unresolved_schedule_keys','{"arrival":0,"departure":0}'::jsonb);
  if jsonb_typeof(q) is distinct from 'object' then raise exception 'Invalid CDN quality';end if;
  if exists(select 1 from jsonb_object_keys(q) k where k not in ('arrival','departure'))
   or coalesce(q->>'arrival','') !~ '^[0-9]{1,3}$' or coalesce(q->>'departure','') !~ '^[0-9]{1,3}$'
   then raise exception 'Invalid CDN quality';end if;
  a:=(q->>'arrival')::int;z:=(q->>'departure')::int;
  if a>500 or z>500 then raise exception 'Invalid CDN quality';end if;
  -- Reuse all existing source, alias, date, evidence and event validation.
  result:=port.import_php_plan_days('tien_sa',jsonb_build_array(d));
  inserted:=inserted+(result->>'versions_inserted')::int;
  if d->>'status'='parsed' then
   select id into strict v from port.php_plan_versions where asset_code='tien_sa' and report_day=(d->>'date')::date
    and source_sha256=d->>'sha256' and parser_version=d->>'parser_version';
   insert into port.cdn_plan_quality(version_id,arrival_unresolved,departure_unresolved) values(v,a,z) on conflict do nothing;
   select arrival_unresolved,departure_unresolved into old_a,old_z from port.cdn_plan_quality where version_id=v;
   if old_a<>a or old_z<>z then raise exception 'Same CDN evidence/parser has changed quality';end if;
   update port.php_plan_days set arrival_ambiguous_groups=arrival_ambiguous_groups where asset_code='tien_sa' and version_id=v;
  end if;
 end loop;
 return jsonb_build_object('versions_inserted',inserted,'days_received',jsonb_array_length(p_days),'semantics','authority_published_plan');
end $$;
revoke all on function port.import_cdn_plan_days(jsonb) from public,anon,authenticated;
grant execute on function port.import_cdn_plan_days(jsonb) to service_role;
update port.php_plan_days set arrival_ambiguous_groups=null where asset_code='tien_sa';
notify pgrst,'reload schema';
commit;
