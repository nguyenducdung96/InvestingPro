import { it, expect, vi } from "vitest";
import {
  SupabaseCatalogRepository,
  supabaseTransport,
  DatabaseError,
} from "../packages/db/src/index";
it("sends publication RPCs through the existing admin session without a service-role credential",async()=>{
  const mock=vi.spyOn(globalThis,"fetch").mockResolvedValue(Response.json({id:"review",replacementRecordId:null,decision:"approved"}));
  try {
    const repo=new SupabaseCatalogRepository(supabaseTransport("https://database.example","anon","admin-token"),true);
    const result=await repo.reviewPublication("sources","source-id",{decision:"approved",note:"Reviewed exact scope and permission.",confirm:true,basis:"Written permission for specified facts.",scope:"Specific documented catalog facts only."});
    expect(result.id).toBe("review");
    expect(String(mock.mock.calls[0][0])).toContain("/rest/v1/rpc/review_publication");
    expect(mock.mock.calls[0][1]?.headers).toMatchObject({"Content-Profile":"core",Authorization:"Bearer admin-token"});
    expect(JSON.parse(String(mock.mock.calls[0][1]?.body))).toMatchObject({p_kind:"sources",p_confirm:true,p_terms_url:null});
  } finally {mock.mockRestore();}
});
it("keeps empty catalog evidence and coverage null", async () => {
  const read = vi.fn(async () => []);
  const repo = new SupabaseCatalogRepository({
    read,
    activeInterests: async () => [],
    write: async () => [],
  });
  const result = await repo.list("port", { limit: 25, at: "2026-01-01" });
  expect(result.data).toEqual([]);
  expect(result.meta.asOf).toBeNull();
  expect(result.meta.quality).toBe("incomplete");
  expect(result.meta.coverage.ratio).toBeNull();
  expect(read.mock.calls).toHaveLength(1);
});
it('reads snapshot pages beyond the Supabase 1000 row limit with the same area filter',async()=>{
  const read=vi.fn().mockResolvedValueOnce(Array.from({length:1000},(_,id)=>({id}))).mockResolvedValueOnce([{id:1000}]);
  const repo=new SupabaseCatalogRepository({read,activeInterests:async()=>[],write:async()=>[]});
  expect(await repo.callSnapshots('hcm-in-port')).toHaveLength(1001);
  expect(read).toHaveBeenCalledTimes(2);
  expect(read.mock.calls[1][2].get('offset')).toBe('1000');
  expect(read.mock.calls.every(c=>c[2].get('source_area')==='eq.hcm-in-port')).toBe(true);
});
it("public repositories cannot mutate or read proposals", async () => {
  const repo = new SupabaseCatalogRepository({
    read: async () => [],
    activeInterests: async () => [],
    write: async () => [],
  });
  await expect(
    repo.reviewQueue("entity_mappings", { limit: 25, at: "2026-01-01" }),
  ).rejects.toBeInstanceOf(DatabaseError);
  await expect(
    repo.review("entity_mappings", "id", "verified", "note"),
  ).rejects.toBeInstanceOf(DatabaseError);
});
it("uses schema profiles, the user token and no-store for database access", async () => {
  const fetchMock = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(Response.json([]));
  try {
    await supabaseTransport(
      "https://database.example",
      "anon",
      "user-token",
    ).read("port", "ports", new URLSearchParams({ authority_id: "eq.id" }));
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.cache).toBe("no-store");
    expect(init?.headers).toMatchObject({
      "Accept-Profile": "port",
      Authorization: "Bearer user-token",
    });
  } finally {
    fetchMock.mockRestore();
  }
});
it("sends listing decisions to the catalog schema with the admin token and note", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([]));
  try {
    await supabaseTransport("https://database.example", "anon", "admin-token").write("company_listings", new URLSearchParams({ id: "eq.listing-id", verification_status: "eq.pending" }), { verification_status: "verified", review_note: "Checked filing" }, "PATCH");
    expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({ "Content-Profile": "catalog", Authorization: "Bearer admin-token" });
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({ review_note: "Checked filing" });
  } finally { fetchMock.mockRestore(); }
});
