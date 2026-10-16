import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { expect, it } from "vitest";

it("imports the scoped snapshots without invented dates and preserves review, RLS and immutable evidence",async()=>{
  const db=new PGlite();
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
      create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
      create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
      grant usage on schema auth to anon,authenticated,service_role;grant execute on all functions in schema auth to anon,authenticated,service_role;`);
    for(const file of readdirSync("supabase/migrations").sort()) await db.exec(readFileSync(`supabase/migrations/${file}`,"utf8"));
    for(const file of ["haiphong_catalog.reviewed.sql","tan_vu_interest.reviewed.sql","evidence_date_precision.correction.sql","505_commercial_catalog.reviewed.sql","slice1_company_catalog.handoff.sql"])
      await db.exec(readFileSync(`supabase/imports/${file}`,"utf8").replaceAll("__AUTHORITY_FETCHED_AT__","2026-10-14T00:00:00Z").replaceAll("__CATALOG_FETCHED_AT__","2026-10-14T00:00:00Z").replaceAll("__FETCHED_AT__","2026-10-14T00:00:00Z"));
    const effective=await db.query("select * from port.company_asset_interests order by id");
    const sql=readFileSync("supabase/imports/reported_catalog_2025.pending.sql","utf8");
    await db.exec(sql);
    expect((await db.query("select * from port.catalog_dossiers")).rows).toHaveLength(41);
    expect((await db.query("select * from port.reported_asset_observations")).rows).toHaveLength(63);
    expect((await db.query("select * from port.dossier_research_paths")).rows).toHaveLength(22);
    expect((await db.query("select * from port.reported_asset_observations where relationship_started_on is null")).rows).toHaveLength(62);
    expect((await db.query("select * from port.reported_asset_observations where documented_date is not null")).rows).toHaveLength(6);
    expect((await db.query("select * from port.company_asset_interests order by id")).rows).toEqual(effective.rows);
    const audited=await db.query("select count(*) from core.audit_events");
    await db.exec(sql);
    expect((await db.query("select count(*) from core.audit_events")).rows).toEqual(audited.rows);
    await db.exec("set role anon");
    expect((await db.query("select * from port.catalog_dossiers")).rows).toHaveLength(0);
    expect((await db.query("select * from port.published_asset_observations")).rows).toHaveLength(0);
    await db.exec("reset role;select set_config('request.jwt.claims','{\"sub\":\"00000000-0000-0000-0000-000000000098\",\"user_metadata\":{\"role\":\"admin\"}}',false);set role authenticated");
    expect((await db.query("select * from port.catalog_dossiers")).rows).toHaveLength(0);
    await expect(db.query("select port.review_reported_observation('00000000-0000-0000-0000-000000000001','verified','TEST ONLY: checked report facts and scope')")).rejects.toThrow("Admin review required");
    await db.exec("reset role;select set_config('request.jwt.claims','{\"sub\":\"00000000-0000-0000-0000-000000000099\",\"app_metadata\":{\"role\":\"admin\"}}',false);set role authenticated");
    expect((await db.query("select * from port.catalog_dossiers")).rows).toHaveLength(41);
    const observation=(await db.query<{id:string;source_record_id:string}>("select * from port.reported_asset_observations where company_id='10000000-0000-0000-0000-000000000017' and relationship_started_on is null order by id limit 1")).rows[0];
    await expect(db.query("select port.review_reported_observation($1,'verified','TEST ONLY: review cannot bypass source evidence')",[observation.id])).rejects.toThrow("Review original evidence first");
    await db.exec("reset role");
    // TEST ONLY: emulate an independently approved source/evidence decision.
    await db.query("update core.sources set rights_status='approved' where id=(select source_id from core.source_records where id=$1)",[observation.source_record_id]);
    await db.query(`insert into core.source_records select (jsonb_populate_record(null::core.source_records,to_jsonb(r)||jsonb_build_object('id','00000000-0000-0000-0000-000000000091','external_id',r.external_id||':test-reviewed','quality_status','verified'))).* from core.source_records r where id=$1`,[observation.source_record_id]);
    await db.exec("set role authenticated");
    await db.query("select port.review_reported_observation($1,'verified','TEST ONLY: checked report pages and exact limited scope')",[observation.id]);
    await db.exec("reset role;set role anon");
    const published=await db.query<{relationship_started_on:null;reporting_period_end:Date}>("select * from port.published_asset_observations");
    expect(published.rows).toHaveLength(1);
    expect(published.rows[0].relationship_started_on).toBeNull();
    await db.exec("reset role;set role authenticated");
    await expect(db.query("update port.reported_asset_observations set reported_role='ownership' where id=$1",[observation.id])).rejects.toThrow("immutable");
    await db.exec("reset role");
    await expect(db.query("delete from port.reported_asset_observations where id=$1",[observation.id])).rejects.toThrow("immutable");
    await db.query("update core.sources set rights_status='blocked' where id=(select source_id from core.source_records where id=$1)",[observation.source_record_id]);
    await db.exec("set role anon");
    expect((await db.query("select * from port.published_asset_observations")).rows).toHaveLength(0);
    await db.exec("reset role");
    expect((await db.query("select quality_status from core.source_records where id=$1",[observation.source_record_id])).rows).toEqual([{quality_status:"incomplete"}]);
  } finally {await db.close();}
});
