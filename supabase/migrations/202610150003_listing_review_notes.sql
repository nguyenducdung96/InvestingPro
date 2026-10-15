begin;
alter table catalog.company_listings add column evidence_excerpt text;
alter table catalog.company_listings add column review_note text;
-- Listing verification already requires an admin, source rights, identity,
-- effective dates and immutable verified_by/verified_at in guard_listing.
-- Require an explicit note for decisions made through the expanded queue.
create function catalog.require_listing_review_note() returns trigger
language plpgsql set search_path='' as $$
begin
  if tg_op='UPDATE' and old.verification_status='pending'
    and new.verification_status <> 'pending'
    and (new.review_note is null or length(trim(new.review_note))=0)
  then raise exception 'Listing review note required'; end if;
  return new;
end $$;
create trigger listing_review_note before update on catalog.company_listings
  for each row execute function catalog.require_listing_review_note();
revoke all on function catalog.require_listing_review_note() from public;
commit;
