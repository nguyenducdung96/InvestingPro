begin;
create table port.company_relationship_snapshots (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references catalog.companies,
 ticker text not null, provider text not null check(provider='vnstock-vci'), fetched_at timestamptz not null,
 raw_sha256 text not null check(raw_sha256 ~ '^[a-f0-9]{64}$'),raw_text text not null check(octet_length(raw_text)<=262144),
 relationship_data jsonb not null check(jsonb_typeof(relationship_data)='array'),
 run_id text not null references port.reference_refresh_runs,
 unique(company_id,provider,raw_sha256)
);
alter table port.company_relationship_snapshots enable row level security;
grant select on port.company_relationship_snapshots to authenticated;
grant all on port.company_relationship_snapshots to service_role;
create policy admin_relationship_feed on port.company_relationship_snapshots for select to authenticated using(core.is_admin());
create trigger preserve_relationship_feed before update or delete on port.company_relationship_snapshots for each row execute function core.immutable_record();
create trigger audit_relationship_feed after insert on port.company_relationship_snapshots for each row execute function core.audit_change();
alter function port.import_reference_refresh(text,jsonb) rename to import_reference_profiles_v1;
revoke execute on function port.import_reference_profiles_v1(text,jsonb) from authenticated;
create function port.import_reference_refresh(p_id text,p_entries jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; e jsonb; r jsonb; added integer; n integer:=0;
begin
 result:=port.import_reference_profiles_v1(p_id,p_entries);
 for e in select * from jsonb_array_elements(p_entries) loop
  if e ? 'relationships' then
   r:=(e->'relationships'->>'raw_text')::jsonb;
   if jsonb_typeof(r)<>'array' or jsonb_array_length(r)>5000 then raise exception 'Invalid relationship response'; end if;
   if (e->'relationships'->>'fetched_at')::timestamptz>now()+interval '5 minutes' or (e->'relationships'->>'fetched_at')::timestamptz<'2020-01-01' then raise exception 'Invalid relationship time'; end if;
   if exists(select 1 from jsonb_array_elements(r) x where x->>'symbol' is distinct from e->>'ticker' or length(trim(coalesce(x->>'name','')))=0 or (x->>'rate' is not null and ((x->>'rate')::numeric<0 or (x->>'rate')::numeric>1))) then raise exception 'Relationship identity/rate mismatch'; end if;
   insert into port.company_relationship_snapshots(company_id,ticker,provider,fetched_at,raw_sha256,raw_text,relationship_data,run_id)
    values((e->>'company_id')::uuid,e->>'ticker','vnstock-vci',(e->'relationships'->>'fetched_at')::timestamptz,e->'relationships'->>'raw_sha256',e->'relationships'->>'raw_text',r,p_id)
    on conflict(company_id,provider,raw_sha256) do nothing;
   get diagnostics added=row_count;n:=n+added;
  end if;
 end loop;
 return result||jsonb_build_object('relationship_inserted',n);
end $$;
revoke all on function port.import_reference_refresh(text,jsonb) from public,anon;
grant execute on function port.import_reference_refresh(text,jsonb) to authenticated;
create index relationship_feed_company on port.company_relationship_snapshots(company_id,fetched_at desc);
commit;
