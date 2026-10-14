import { it, expect, vi } from "vitest";
import {
  SupabaseCatalogRepository,
  supabaseTransport,
  DatabaseError,
} from "../packages/db/src/index";
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
