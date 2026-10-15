-- Slice 1: explicit, audited human review. Original evidence remains immutable.
begin;
create table core.publication_reviews (
  id uuid primary key default gen_random_uuid(),
  kind text not null check(kind in ('sources','evidence','entities')),
  target_id uuid not null,
  decision text not null check(decision in ('approved','rejected')),
  note text not null check(length(trim(note)) between 20 and 4000),
  basis text, scope text, confirmed_hash text,
  replacement_record_id uuid references core.source_records,
  actor_id uuid not null, reviewed_at timestamptz not null default now()
);
create unique index publication_review_once on core.publication_reviews(kind,target_id) where kind <> 'sources';
alter table core.publication_reviews enable row level security;
grant select,insert on core.publication_reviews to authenticated;
grant all on core.publication_reviews to service_role;
create policy admin_reviews on core.publication_reviews for all to authenticated
  using(core.is_admin()) with check(core.is_admin() and actor_id=auth.uid());
create trigger immutable_publication_review before update or delete on core.publication_reviews
  for each row execute function core.immutable_record();
create function core.stamp_publication_review() returns trigger language plpgsql set search_path='' as $$
begin
  if not core.is_admin() or auth.uid() is null then raise exception 'Admin review required' using errcode='42501'; end if;
  new.actor_id:=auth.uid(); new.reviewed_at:=now(); return new;
end $$;
create trigger stamp_publication_review before insert on core.publication_reviews
  for each row execute function core.stamp_publication_review();
create trigger audit_change after insert on core.publication_reviews for each row execute function core.audit_change();

create function core.review_publication(
  p_kind text,p_id uuid,p_decision text,p_note text,
  p_basis text default null,p_scope text default null,p_terms_url text default null,
  p_hash text default null,p_confirm boolean default false
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare s core.sources; r core.source_records; e catalog.entities;
  replacement uuid; review_id uuid:=gen_random_uuid();
begin
  if not core.is_admin() or auth.uid() is null then raise exception 'Admin review required' using errcode='42501'; end if;
  if p_kind not in ('sources','evidence','entities') or p_decision not in ('approved','rejected')
    or p_kind is null or p_decision is null or p_note is null or length(trim(p_note)) not between 20 and 4000
  then raise exception 'Review input invalid'; end if;
  if p_decision='approved' and p_confirm is distinct from true then raise exception 'Explicit review confirmation required'; end if;
  if p_kind='sources' then
    select * into s from core.sources where id=p_id for update;
    if not found then raise exception 'Review target missing'; end if;
    if p_decision='approved' then
      if p_basis is null or length(trim(p_basis)) not between 20 and 4000
        or p_scope is null or length(trim(p_scope)) not between 20 and 4000
        or (p_terms_url is not null and p_terms_url !~ '^https://')
      then raise exception 'Source basis and scope required'; end if;
      update core.sources set rights_status='approved',rights_notes='Phạm vi: '||trim(p_scope)||E'\nCăn cứ: '||trim(p_basis)||E'\nQuyết định: '||trim(p_note),
        terms_url=p_terms_url,verified_at=now() where id=p_id;
    else
      update core.sources set rights_status='blocked',rights_notes=trim(p_note),verified_at=now() where id=p_id;
    end if;
  elsif p_kind='evidence' then
    select * into r from core.source_records where id=p_id for update;
    if not found then raise exception 'Review target missing'; end if;
    if r.quality_status='verified' or exists(select 1 from core.publication_reviews where kind=p_kind and target_id=p_id)
      then raise exception 'Review target already decided'; end if;
    if p_decision='approved' then
      -- Same source lock order as a source decision: no approval racing withdrawal.
      select * into s from core.sources where id=r.source_id for update;
      if s.rights_status <> 'approved' then raise exception 'Source rights approval required'; end if;
      if p_hash is distinct from r.content_hash then raise exception 'Evidence hash confirmation required'; end if;
      replacement:=gen_random_uuid();
      insert into core.source_records(id,source_id,source_url,canonical_url,external_id,published_at,updated_at,
        fetched_at,reporting_period_start,reporting_period_end,content_type,content_hash,raw_storage_key,
        parser_name,parser_version,quality_status,supersedes_source_record_id)
      values(replacement,r.source_id,r.source_url,r.canonical_url,r.external_id||':review:'||review_id,
        r.published_at,r.updated_at,r.fetched_at,r.reporting_period_start,r.reporting_period_end,
        r.content_type,r.content_hash,r.raw_storage_key,r.parser_name,r.parser_version,'verified',r.id);
      -- Only proposals and unpublished identities follow the reviewed correction.
      -- Existing verified/rejected decisions and original evidence are untouched.
      update catalog.entities set source_record_id=replacement where source_record_id=r.id and quality_status<>'verified';
      update catalog.company_listings set source_record_id=replacement where source_record_id=r.id and verification_status='pending';
      update port.entity_mappings set source_record_id=replacement where source_record_id=r.id and verification_status='pending';
      update port.company_asset_interests set source_record_id=replacement where source_record_id=r.id and verification_status='pending';
    end if;
  else
    select * into e from catalog.entities where id=p_id for update;
    if not found then raise exception 'Review target missing'; end if;
    if e.quality_status='verified' or exists(select 1 from core.publication_reviews where kind=p_kind and target_id=p_id)
      then raise exception 'Review target already decided'; end if;
    if p_decision='approved' then
      if not exists(select 1 from core.source_records checked_record join core.sources checked_source on checked_source.id=checked_record.source_id
        where checked_record.id=e.source_record_id and checked_record.quality_status='verified' and checked_source.rights_status='approved')
      then raise exception 'Verified evidence and approved rights required'; end if;
      update catalog.entities set quality_status='verified',updated_at=now() where id=p_id;
    end if;
  end if;
  insert into core.publication_reviews(id,kind,target_id,decision,note,basis,scope,confirmed_hash,replacement_record_id,actor_id)
    values(review_id,p_kind,p_id,p_decision,trim(p_note),p_basis,p_scope,p_hash,replacement,auth.uid());
  return jsonb_build_object('id',review_id,'replacementRecordId',replacement,'decision',p_decision);
end $$;
revoke all on function core.review_publication(text,uuid,text,text,text,text,text,text,boolean) from public;
grant execute on function core.review_publication(text,uuid,text,text,text,text,text,text,boolean) to authenticated;
revoke all on function core.stamp_publication_review() from public;
create function core.publication_queue(p_kind text,p_limit integer default 26,p_cursor uuid default null)
returns setof jsonb language plpgsql security invoker set search_path='' as $$
begin
  if not core.is_admin() or auth.uid() is null then raise exception 'Admin review required' using errcode='42501'; end if;
  if p_limit is null or p_limit not between 1 and 101 then raise exception 'Invalid queue limit'; end if;
  if p_kind='sources' then
    return query select jsonb_build_object('id',s.id,'kind',p_kind,'name',s.name,'source',to_jsonb(s),'blockers','[]'::jsonb)
      from core.sources s where s.rights_status<>'approved' and (p_cursor is null or s.id>p_cursor) order by s.id limit p_limit;
  elsif p_kind='evidence' then
    return query select jsonb_build_object('id',r.id,'kind',p_kind,'name',r.external_id,'record',to_jsonb(r),'source',to_jsonb(s),
      'blockers',case when s.rights_status<>'approved' then jsonb_build_array('Cần duyệt quyền sử dụng nguồn trước.') else '[]'::jsonb end)
      from core.source_records r join core.sources s on s.id=r.source_id
      where r.quality_status<>'verified' and (p_cursor is null or r.id>p_cursor)
        and not exists(select 1 from core.publication_reviews v where v.kind='evidence' and v.target_id=r.id)
      order by r.id limit p_limit;
  elsif p_kind='entities' then
    return query select jsonb_build_object('id',e.id,'kind',p_kind,'name',e.name,'entity',to_jsonb(e),'company',(select to_jsonb(c) from catalog.companies c where c.id=e.id),'record',to_jsonb(r),'source',to_jsonb(s),
      'blockers',case when s.rights_status<>'approved' or r.quality_status<>'verified' then jsonb_build_array('Cần duyệt nguồn và xác minh bằng chứng trước.') else '[]'::jsonb end)
      from catalog.entities e join core.source_records r on r.id=e.source_record_id join core.sources s on s.id=r.source_id
      where e.quality_status<>'verified' and (p_cursor is null or e.id>p_cursor)
        and not exists(select 1 from core.publication_reviews v where v.kind='entities' and v.target_id=e.id)
      order by e.id limit p_limit;
  else raise exception 'Invalid publication kind'; end if;
end $$;
revoke all on function core.publication_queue(text,integer,uuid) from public;
grant execute on function core.publication_queue(text,integer,uuid) to authenticated;
commit;
