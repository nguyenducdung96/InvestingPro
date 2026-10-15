-- A known port category does not prove which authority manages the asset.
-- Preserve missing authority as NULL instead of inventing an assignment.
begin;
alter table port.ports drop constraint marine_authority_required;
commit;
