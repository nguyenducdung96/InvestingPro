import { describe, it, expect, vi } from "vitest";
import type { CatalogRepository } from "@invest/domain";
import { handleCatalog } from "../apps/web/src/lib/api";
import { HttpError } from "../apps/web/src/lib/errors";
import { sameOrigin } from "../apps/web/src/lib/origin";
const meta = {
  asOf: null,
  reportingPeriod: null,
  sources: [],
  quality: "incomplete",
  coverage: {
    expectedDays: null,
    observedDays: null,
    ratio: null,
    scope: "catalog",
  },
  methodologyVersion: "catalog-v1",
  unit: null,
  entitlement: "public_catalog",
  warnings: [],
} as const;
const list = vi.fn(async () => ({ data: [], meta }));
const detail = vi.fn(async () => ({ data: null, meta }));
const repo = { list, detail } as unknown as CatalogRepository;
const run = (
  url: string,
  method = "GET",
  body?: object,
  admin?: () => Promise<CatalogRepository>,
) =>
  handleCatalog(
    new Request(`http://localhost/api/v1/${url}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }),
    url.split("?")[0].split("/"),
    () => repo,
    admin ??
      (async () => {
        throw new HttpError(401, "Sign in");
      }),
  );
describe("API contract and access control", () => {
  it("returns metadata and does not fabricate missing coverage", async () => {
    const r = await run("ports");
    expect(r.status).toBe(200);
    expect((await r.json()).meta.coverage.ratio).toBeNull();
  });
  it("rejects malformed keys and query values", async () => {
    expect((await run("ports/a,b")).status).toBe(400);
    expect((await run("ports?limit=10000")).status).toBe(400);
  });
  it("returns 404 for missing entities and later slices", async () => {
    expect((await run("ports/unknown")).status).toBe(404);
    expect((await run("ports/unknown/calls")).status).toBe(404);
  });
  it("requires verified admin authorization", async () => {
    expect((await run("admin/mappings")).status).toBe(401);
    expect(
      (
        await run("admin/mappings", "GET", undefined, async () => {
          throw new HttpError(403, "Forbidden");
        })
      ).status,
    ).toBe(403);
  });
  it("does not accept review fields in proposals", async () => {
    expect(
      (
        await run(
          "admin/mappings",
          "POST",
          { verification_status: "verified" },
          async () => repo,
        )
      ).status,
    ).toBe(400);
  });
  it("rejects cross-origin admin mutation", async () => {
    const request = new Request("http://localhost/api/v1/admin/mappings", {
      method: "POST",
      headers: { Origin: "https://attacker.invalid" },
    });
    expect(
      (
        await handleCatalog(
          request,
          ["admin", "mappings"],
          () => repo,
          async () => repo,
        )
      ).status,
    ).toBe(403);
  });
  it("checks the request host when Next uses an internal URL", () => {
    expect(
      sameOrigin(
        new Request("http://localhost/api/admin-session", {
          headers: { Host: "127.0.0.1:3000", Origin: "http://127.0.0.1:3000" },
        }),
        true,
      ),
    ).toBe(true);
    expect(
      sameOrigin(new Request("http://localhost/api/admin-session"), true),
    ).toBe(false);
  });
});
