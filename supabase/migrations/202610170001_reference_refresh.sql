begin;
create table port.reference_refresh_runs (
 id text primary key check(id ~ '^[a-f0-9]{64}$'), imported_at timestamptz not null default now(),
 imported_by uuid not null, entry_count integer not null check(entry_count between 1 and 41)
);
create table port.company_reference_snapshots (
 id uuid primary key default gen_random_uuid(), company_id uuid not null references catalog.companies,
 ticker text not null, provider text not null check(provider='vnstock-vci'),
 fetched_at timestamptz not null, raw_sha256 text not null check(raw_sha256 ~ '^[a-f0-9]{64}$'),
 raw_text text not null check(octet_length(raw_text)<=262144), reference_data jsonb not null,
 run_id text not null references port.reference_refresh_runs,
 review_status text not null default 'pending' check(review_status in ('pending','accepted','rejected')),
 reviewed_by uuid, reviewed_at timestamptz, review_note text,
 unique(company_id,provider,raw_sha256)
);
alter table port.reference_refresh_runs enable row level security;
alter table port.company_reference_snapshots enable row level security;
grant select on port.reference_refresh_runs,port.company_reference_snapshots to authenticated;
grant all on port.reference_refresh_runs,port.company_reference_snapshots to service_role;
create policy admin_reference_runs on port.reference_refresh_runs for select to authenticated using(core.is_admin());
create policy admin_reference_snapshots on port.company_reference_snapshots for select to authenticated using(core.is_admin());
create function port.guard_reference_snapshot() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' then raise exception 'Reference history is immutable'; end if;
 if old.review_status<>'pending' or
  (to_jsonb(new)-array['review_status','reviewed_by','reviewed_at','review_note']) is distinct from
  (to_jsonb(old)-array['review_status','reviewed_by','reviewed_at','review_note']) then raise exception 'Reference history is immutable'; end if;
 if not core.is_admin() or auth.uid() is null or new.review_status='pending' or length(trim(coalesce(new.review_note,'')))<20 then raise exception 'Admin decision and note required'; end if;
 new.reviewed_by:=auth.uid(); new.reviewed_at:=now(); return new;
end $$;
create trigger preserve_reference before update or delete on port.company_reference_snapshots for each row execute function port.guard_reference_snapshot();
create trigger preserve_reference_run before update or delete on port.reference_refresh_runs for each row execute function core.immutable_record();
create trigger audit_reference after insert or update on port.company_reference_snapshots for each row execute function core.audit_change();
create function port.import_reference_refresh(p_id text,p_entries jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare e jsonb; r jsonb; n integer:=0; added integer;
begin
 if not core.is_admin() or auth.uid() is null then raise exception 'Admin review required'; end if;
 if jsonb_typeof(p_entries)<>'array' or jsonb_array_length(p_entries) not between 1 and 41 then raise exception 'Invalid refresh scope'; end if;
 if (select count(distinct x->>'ticker') from jsonb_array_elements(p_entries) x)<>jsonb_array_length(p_entries) then raise exception 'Duplicate ticker'; end if;
 insert into port.reference_refresh_runs(id,imported_by,entry_count) values(p_id,auth.uid(),jsonb_array_length(p_entries)) on conflict do nothing;
 for e in select * from jsonb_array_elements(p_entries) loop
  if e->>'provider'<>'vnstock-vci' or (e->>'fetched_at')::timestamptz>now()+interval '5 minutes' or (e->>'fetched_at')::timestamptz<'2020-01-01' then raise exception 'Invalid provider/time'; end if;
  if not exists(select 1 from port.catalog_dossiers d where d.company_id=(e->>'company_id')::uuid and d.ticker=e->>'ticker' and d.scope_version='listed-port-candidates-41-report-2025-v1') then raise exception 'Company outside accepted scope'; end if;
  r:=(e->>'raw_text')::jsonb;
  if jsonb_typeof(r)<>'array' or jsonb_array_length(r)<>1 or r->0->>'symbol' is distinct from e->>'ticker' or length(trim(coalesce(r->0->>'name','')))=0 then raise exception 'Response identity mismatch'; end if;
  insert into port.company_reference_snapshots(company_id,ticker,provider,fetched_at,raw_sha256,raw_text,reference_data,run_id)
   values((e->>'company_id')::uuid,e->>'ticker',e->>'provider',(e->>'fetched_at')::timestamptz,e->>'raw_sha256',e->>'raw_text',r->0,p_id) on conflict(company_id,provider,raw_sha256) do nothing;
  get diagnostics added=row_count; n:=n+added;
 end loop;
 return jsonb_build_object('inserted',n,'received',jsonb_array_length(p_entries),'publication_performed',false);
end $$;
create function port.review_reference_snapshot(p_id uuid,p_decision text,p_note text) returns jsonb language plpgsql security definer set search_path='' as $$
declare r port.company_reference_snapshots;
begin
 if not core.is_admin() or auth.uid() is null then raise exception 'Admin review required'; end if;
 if p_decision not in ('accepted','rejected') or length(trim(coalesce(p_note,''))) not between 20 and 4000 then raise exception 'Invalid review'; end if;
 select * into r from port.company_reference_snapshots where id=p_id for update;
 if not found or r.review_status<>'pending' then raise exception 'Pending reference required'; end if;
 update port.company_reference_snapshots set review_status=p_decision,review_note=p_note where id=p_id returning * into r;
 return to_jsonb(r);
end $$;
revoke all on function port.import_reference_refresh(text,jsonb),port.review_reference_snapshot(uuid,text,text) from public,anon;
grant execute on function port.import_reference_refresh(text,jsonb),port.review_reference_snapshot(uuid,text,text) to authenticated;
create index reference_company_time on port.company_reference_snapshots(company_id,fetched_at desc);
commit;
