begin;
create function catalog.guard_listing() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='UPDATE' and old.verification_status <> 'pending' then raise exception 'Reviewed listing is immutable'; end if;
  if new.verification_status <> 'pending' then
    if not core.is_admin() then raise exception 'Admin review required' using errcode='42501'; end if;
    new.verified_at := now(); new.verified_by := auth.uid();
  else new.verified_at := null; new.verified_by := null;
  end if;
  if new.verification_status='verified' then
    -- Catalog is small: serialize listing publication across companies to avoid
    -- concurrent verification of the same exchange/ticker for different issuers.
    lock table catalog.company_listings in share row exclusive mode;
    if not exists(select 1 from core.source_records r join core.sources s on s.id=r.source_id where r.id=new.source_record_id and r.quality_status='verified' and s.rights_status='approved') then raise exception 'Verified listing evidence required'; end if;
    if exists(select 1 from catalog.company_listings l where l.id<>new.id and l.exchange=new.exchange and l.ticker=new.ticker and l.verification_status='verified' and daterange(l.valid_from,l.valid_to,'[)') && daterange(new.valid_from,new.valid_to,'[)')) then raise exception 'Overlapping verified ticker'; end if;
  end if;
  return new;
end $$;
create trigger guard_listing before insert or update on catalog.company_listings for each row execute function catalog.guard_listing();
revoke all on function catalog.guard_listing() from public;
commit;
