begin;
-- Cargo throughput is independent of vessel DWT and port-call events.
create table port.newsletter_documents (
 source_url text primary key check(source_url ~ '^https://haiphongport[.]com[.]vn/FileUpload/Documents/'),
 latest_sha text not null check(latest_sha ~ '^[a-f0-9]{64}$'),
 last_success timestamptz not null, last_attempt timestamptz not null, error text
);
create table port.monthly_throughput (
 id uuid primary key default gen_random_uuid(), asset_code text not null check(asset_code='tan_vu'),
 period date not null check(extract(day from period)=1),
 publication_month date not null check(extract(day from publication_month)=1 and publication_month>period),
 cargo_tonnes bigint check(cargo_tonnes>=0), container_teu bigint check(container_teu>=0),
 source_record_id uuid not null references core.source_records,
 pdf_page integer not null check(pdf_page>0), extraction_note text not null check(length(trim(extraction_note))>=20),
 verification_status text not null default 'pending' check(verification_status in ('pending','verified','rejected')),
 reviewed_by uuid, reviewed_at timestamptz, review_note text,
 supersedes_id uuid references port.monthly_throughput,
 check(cargo_tonnes is not null or container_teu is not null)
);
create function port.guard_monthly_throughput() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' or (tg_op='UPDATE' and old.verification_status<>'pending') then raise exception 'Reviewed facts are immutable; append a correction'; end if;
 if new.supersedes_id is not null and not exists(select 1 from port.monthly_throughput o where o.id=new.supersedes_id and o.id<>new.id and o.verification_status='verified' and o.asset_code=new.asset_code and o.period=new.period) then raise exception 'Correction scope mismatch'; end if;
 if new.verification_status<>'pending' then
  if not core.is_admin() or auth.uid() is null then raise exception 'Admin review required'; end if;
  if length(trim(coalesce(new.review_note,'')))<20 then raise exception 'Review note required'; end if;
  new.reviewed_by:=auth.uid(); new.reviewed_at:=now();
 else new.reviewed_by:=null; new.reviewed_at:=null; new.review_note:=null;
 end if;
 if new.verification_status='verified' and not exists(select 1 from core.source_records r join core.sources s on s.id=r.source_id where r.id=new.source_record_id and r.quality_status='verified' and s.rights_status='approved') then raise exception 'Verified evidence and approved rights required'; end if;
 return new;
end $$;
create trigger guard_monthly before insert or update or delete on port.monthly_throughput for each row execute function port.guard_monthly_throughput();
create trigger audit_monthly after insert or update on port.monthly_throughput for each row execute function core.audit_change();
alter table port.newsletter_documents enable row level security;
alter table port.monthly_throughput enable row level security;
grant select on port.newsletter_documents,port.monthly_throughput to anon,authenticated;
grant insert,update on port.newsletter_documents,port.monthly_throughput to authenticated;
grant all on port.newsletter_documents,port.monthly_throughput to service_role;
create policy public_newsletter_documents on port.newsletter_documents for select to anon,authenticated using(true);
create policy admin_newsletter_documents on port.newsletter_documents for all to authenticated using(core.is_admin()) with check(core.is_admin());
create policy admin_monthly on port.monthly_throughput for all to authenticated using(core.is_admin()) with check(core.is_admin());
create policy public_monthly on port.monthly_throughput for select to anon,authenticated using(
 verification_status='verified' and exists(select 1 from core.source_records r join core.sources s on s.id=r.source_id where r.id=source_record_id and r.quality_status='verified' and s.rights_status='approved')
);
create view port.published_monthly_throughput with(security_invoker=true) as
 select f.*,r.source_url,r.content_hash as source_sha256,r.fetched_at,d.last_attempt as source_checked_at,d.error as source_error
 from port.monthly_throughput f join core.source_records r on r.id=f.source_record_id
 join port.newsletter_documents d on d.source_url=r.source_url and d.latest_sha=r.content_hash
 where f.verification_status='verified'
 and not exists(select 1 from port.monthly_throughput c where c.supersedes_id=f.id and c.verification_status='verified');
grant select on port.published_monthly_throughput to anon,authenticated,service_role;
create function port.review_monthly_throughput(p_id uuid,p_decision text,p_note text) returns jsonb language plpgsql set search_path='' as $$
declare f port.monthly_throughput; replacement uuid;
begin
 if not core.is_admin() or auth.uid() is null then raise exception 'Admin review required'; end if;
 if p_decision is null or p_decision not in ('verified','rejected') or length(trim(coalesce(p_note,''))) not between 20 and 4000 then raise exception 'Valid decision and review note required'; end if;
 select * into f from port.monthly_throughput where id=p_id for update;
 if not found or f.verification_status<>'pending' then raise exception 'Pending fact required'; end if;
 if p_decision='verified' then
  select r.id into replacement from core.source_records r join core.source_records o on o.id=f.source_record_id
  join core.sources s on s.id=r.source_id join port.newsletter_documents d on d.source_url=r.source_url and d.latest_sha=r.content_hash
  where r.source_id=o.source_id and r.source_url=o.source_url and r.content_hash=o.content_hash and r.quality_status='verified' and s.rights_status='approved' order by r.fetched_at desc,r.id limit 1;
  if replacement is null then raise exception 'Review current original evidence and source rights first'; end if;
 end if;
 update port.monthly_throughput set verification_status=p_decision,review_note=p_note,source_record_id=coalesce(replacement,source_record_id) where id=p_id returning * into f;
 return to_jsonb(f);
end $$;
revoke all on function port.review_monthly_throughput(uuid,text,text) from public,anon;
grant execute on function port.review_monthly_throughput(uuid,text,text) to authenticated;
commit;
