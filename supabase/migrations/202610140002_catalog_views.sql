begin;
create view port.current_asset_interests with (security_invoker=true) as
select m.* from port.company_asset_interests m
where m.verification_status='verified' and not exists (
  select 1 from port.company_asset_interests correction where correction.supersedes_interest_id=m.id and correction.verification_status='verified'
);
grant select on port.current_asset_interests to anon,authenticated,service_role;
commit;
