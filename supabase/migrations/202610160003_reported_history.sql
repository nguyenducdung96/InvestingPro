begin;
create trigger preserve_reported_history before delete on port.reported_asset_observations
for each row execute function core.immutable_record();
commit;
