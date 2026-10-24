begin;
alter table port.company_berth_editions drop constraint company_berth_editions_ticker_check;
alter table port.company_berth_editions add constraint company_berth_editions_ticker_check check(ticker in ('PHP','VGR','VSC'));
create or replace function port.guard_company_berth_edition() returns trigger language plpgsql set search_path='' as $$
declare e jsonb;
begin
 if not coalesce(current_user='postgres' or (core.is_admin() and auth.uid() is not null),false) then raise exception 'Admin factual publication required'; end if;
 if new.ticker in ('VGR','VSC') then
  if jsonb_array_length(new.entries)<>(case new.ticker when 'VGR' then 1 else 4 end)
   or (select count(distinct x->>'asset_code') from jsonb_array_elements(new.entries) x)<>jsonb_array_length(new.entries) then raise exception 'Exact issuer berth scope required'; end if;
  for e in select * from jsonb_array_elements(new.entries) loop
   if exists(select 1 from jsonb_object_keys(e) k where k not in ('asset_code','name','relationship','operator','source_url','source_sha256','source_note','alias','effective_from','effective_to'))
    or coalesce(e->>'asset_code','') not in ('green_port','vip_green_port','nam_hai_dinh_vu','vimc_dinh_vu')
    or (new.ticker='VGR' and e->>'asset_code'<>'vip_green_port')
    or coalesce(e->>'relationship','')<>(case when new.ticker='VGR' then 'operator' when e->>'asset_code'='vimc_dinh_vu' then 'shareholder_related' else 'via_member_company' end)
    or coalesce(e->>'source_url','') not in ('https://greenport.com.vn/','https://vimcdinhvu.com.vn/gioi-thieu-ve-chung-toi-a75.html','https://vipgreenport.com.vn/index.php/sgioi-thieu/gioi-thieu-ve-cong-ty','https://viconship.com/wp-content/uploads/2026/04/CBTT-Bao-cao-thuong-nien-nam-2025.pdf')
    or coalesce(e->>'source_sha256','') !~ '^[a-f0-9]{64}$'
    or length(trim(coalesce(e->>'name',''))) not between 1 and 150
    or length(trim(coalesce(e->>'operator',''))) not between 1 and 300
    or length(trim(coalesce(e->>'source_note',''))) not between 20 and 600
    or coalesce(e->>'alias','')<>(case e->>'asset_code' when 'green_port' then 'GREEN PORT' when 'vip_green_port' then 'VIP GREEN PORT' when 'nam_hai_dinh_vu' then 'NAM HAI DINH VU' when 'vimc_dinh_vu' then 'VIMC' end)
    or e->>'effective_from' is not null or e->>'effective_to' is not null then raise exception 'Invalid issuer berth fact or citation'; end if;
  end loop;
 else
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
 end if;
 new.published_at:=now();new.published_by:=coalesce(auth.uid()::text,current_user);
 return new;
end $$;
notify pgrst,'reload schema';
commit;
