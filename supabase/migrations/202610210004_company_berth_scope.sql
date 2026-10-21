begin;
-- Source-reviewed company-to-berth scope; distinct from effective ownership intervals.
create table port.company_berth_editions (
 id uuid primary key default gen_random_uuid(),
 ticker text not null check(ticker='PHP'),
 observed_on date not null,
 entries jsonb not null check(jsonb_typeof(entries)='array'),
 review_note text not null check(length(trim(review_note)) between 40 and 4000),
 published_at timestamptz not null default now(),
 published_by text not null default current_user
);
create function port.guard_company_berth_edition() returns trigger language plpgsql set search_path='' as $$
declare e jsonb;
begin
 if not coalesce(current_user='postgres' or (core.is_admin() and auth.uid() is not null),false) then raise exception 'Admin factual publication required'; end if;
 if jsonb_array_length(new.entries)<>4 or (select count(distinct x->>'asset_code') from jsonb_array_elements(new.entries) x)<>4 then raise exception 'Exact four-berth PHP scope required'; end if;
 for e in select * from jsonb_array_elements(new.entries) loop
  if exists(select 1 from jsonb_object_keys(e) k where k not in ('asset_code','name','relationship','operator','source_url','source_sha256','source_note','alias','effective_from','effective_to'))
   or coalesce(e->>'asset_code','') not in ('tan_vu','chua_ve','hoang_dieu','htit')
   or coalesce(e->>'relationship','') not in ('branch','via_member_company','joint_venture')
   or coalesce(e->>'source_url','') !~ '^https://haiphongport[.]com[.]vn/vi/don-vi-thanh-vien/[a-z0-9-]+[.]html$'
   or coalesce(e->>'source_sha256','') !~ '^[a-f0-9]{64}$'
   or length(trim(coalesce(e->>'name',''))) not between 1 and 150
   or length(trim(coalesce(e->>'operator',''))) not between 1 and 300
   or length(trim(coalesce(e->>'source_note',''))) not between 20 and 600
   or coalesce(e->>'alias','')<>(case e->>'asset_code' when 'tan_vu' then 'TAN VU' when 'chua_ve' then 'CHUA VE' when 'hoang_dieu' then 'HOANG DIEU' when 'htit' then 'HTIT' end)
   -- This edition documents observation dates, not researched legal effective dates.
   or e->>'effective_from' is not null or e->>'effective_to' is not null
   then raise exception 'Invalid PHP berth fact or citation'; end if;
 end loop;
 new.published_at:=now();new.published_by:=coalesce(auth.uid()::text,current_user);
 return new;
end $$;
create trigger guard_company_berth_edition before insert on port.company_berth_editions for each row execute function port.guard_company_berth_edition();
create trigger immutable_company_berth_edition before update or delete on port.company_berth_editions for each row execute function core.immutable_record();
create trigger audit_company_berth_edition after insert on port.company_berth_editions for each row execute function core.audit_change();
alter table port.company_berth_editions enable row level security;
grant select on port.company_berth_editions to anon,authenticated;
grant insert on port.company_berth_editions to authenticated;
create policy public_company_berth_editions on port.company_berth_editions for select to anon,authenticated using(true);
create policy admin_company_berth_editions on port.company_berth_editions for insert to authenticated with check(core.is_admin() and auth.uid() is not null);
commit;
