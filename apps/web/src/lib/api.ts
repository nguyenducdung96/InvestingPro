import type { CatalogRepository, EntityKind, PublicationKind, PublicationInput } from "@invest/domain";
import { DatabaseError } from "@invest/db";
import {
  InputError,
  mappingType,
  pageQuery,
  validateProposal,
  UUID,
} from "@invest/port";
import { HttpError } from "./errors";
import { sameOrigin } from "./origin";
const json = (value: unknown, status = 200) =>
  Response.json(value, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
function key(value: string) {
  if (!UUID.test(value) && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(value))
    throw new InputError("Invalid catalog key");
  return value;
}
async function body(request: Request) {
  const raw = await request.text();
  if (raw.length > 16384) throw new HttpError(413, "Request too large");
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new InputError("Invalid JSON");
  }
}
export async function handleCatalog(
  request: Request,
  path: string[],
  publicRepo: () => CatalogRepository,
  adminRepo: () => Promise<CatalogRepository>,
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const q = pageQuery(url.searchParams);
    if (path[0] === "admin") {
      if (!["GET", "POST", "PATCH"].includes(request.method))
        return json({ error: "Method not allowed" }, 405);
      if (request.method !== "GET" && !sameOrigin(request))
        throw new HttpError(403, "Cross-origin writes are forbidden");
      const repo = await adminRepo();
      if (path[1] === "publication" && [3,4].includes(path.length)) {
        const kind = path[2] as PublicationKind;
        if (!["sources","evidence","entities"].includes(kind)) throw new InputError("Invalid publication kind");
        if (request.method === "GET" && path.length === 3) return json(await repo.publicationQueue(kind,q));
        if (request.method === "PATCH" && path.length === 4) {
          if (!UUID.test(path[3])) throw new InputError("Invalid review identifier");
          const v = await body(request);
          if (Object.keys(v).some(k=>!["decision","note","basis","scope","termsUrl","hash","confirm"].includes(k)) ||
            !["approved","rejected"].includes(String(v.decision)) || typeof v.note!=="string" ||
            v.note.trim().length<20 || v.note.length>4000 || typeof v.confirm!=="boolean" ||
            ["basis","scope","termsUrl","hash"].some(k=>v[k]!==undefined && (typeof v[k]!=="string" || String(v[k]).length>4000)))
            throw new InputError("Cần lý do từ 20 đến 4.000 ký tự và quyết định hợp lệ.");
          if (v.decision === "approved" && !v.confirm) throw new InputError("Cần xác nhận đã kiểm tra hồ sơ.");
          if (v.decision === "approved" && kind === "sources" &&
            [v.basis,v.scope].some(x=>typeof x!=="string" || x.trim().length<20))
            throw new InputError("Cần căn cứ quyền sử dụng và phạm vi dữ liệu, mỗi mục ít nhất 20 ký tự.");
          if (v.termsUrl && !/^https:\/\//.test(String(v.termsUrl))) throw new InputError("Liên kết điều khoản phải dùng HTTPS.");
          if (v.decision === "approved" && kind === "evidence" && !/^[a-f0-9]{64}$/.test(String(v.hash)))
            throw new InputError("Cần SHA-256 gồm 64 ký tự để đối chiếu bằng chứng.");
          return json(await repo.reviewPublication(kind,path[3],v as unknown as PublicationInput));
        }
        return json({error:"Method not allowed"},405);
      }
      if (path[1] !== "mappings" || path.length > 3)
        return json({ error: "Not found" }, 404);
      const type = mappingType(
        url.searchParams.get("type") ?? "company_asset_interests",
      );
      if (request.method === "GET" && path.length === 2)
        return json(await repo.reviewQueue(type, q));
      if (request.method === "POST" && path.length === 2)
        return json(
          await repo.propose(type, validateProposal(type, await body(request))),
          201,
        );
      if (request.method === "PATCH" && path.length === 3) {
        if (!UUID.test(path[2]))
          throw new InputError("Invalid mapping identifier");
        const v = await body(request);
        if (
          Object.keys(v).some((k) => !["decision", "note"].includes(k)) ||
          !["verified", "rejected"].includes(String(v.decision)) ||
          typeof v.note !== "string" ||
          !v.note.trim() ||
          v.note.length > 4000
        )
          throw new InputError("Decision and review note required");
        return json(
          await repo.review(
            type,
            path[2],
            v.decision as "verified" | "rejected",
            v.note,
          ),
        );
      }
      return json({ error: "Method not allowed" }, 405);
    }
    if (request.method !== "GET")
      return json({ error: "Method not allowed" }, 405);
    const repo = publicRepo();
    const kinds: Record<string, EntityKind> = {
      "port-authorities": "port_authority",
      ports: "port",
      terminals: "terminal",
      berths: "berth",
      icds: "icd",
    };
    const kind = kinds[path[0]];
    if (kind && path.length === 1) return json(await repo.list(kind, q));
    if (
      kind &&
      (path.length === 2 ||
        (path[0] === "ports" && path.length === 3 && path[2] === "overview"))
    ) {
      const result = await repo.detail(kind, key(path[1]));
      return json(result, result.data ? 200 : 404);
    }
    if (
      path.length === 3 &&
      ((path[0] === "ports" && path[2] === "terminals") ||
        (path[0] === "terminals" && path[2] === "berths") ||
        (path[0] === "port-authorities" && path[2] === "ports"))
    ) {
      const parent = await repo.detail(kind, key(path[1]));
      if (!parent.data) return json(parent, 404);
      return json(
        await repo.list(
          path[2] === "terminals"
            ? "terminal"
            : path[2] === "berths"
              ? "berth"
              : "port",
          q,
          parent.data.entity.id,
        ),
      );
    }
    if (path.join("/") === "industries/ports/overview")
      return json(await repo.list("port_authority", q));
    if (path.join("/") === "industries/ports/listed-companies")
      return json(await repo.listedCompanies(q));
    if (path[0] === "companies" && path.length >= 2 && path.length <= 3) {
      let id = path[1];
      if (!UUID.test(id)) {
        if (!/^[A-Z0-9]{1,12}$/.test(id))
          throw new InputError("Invalid ticker");
        const companies = await repo.listedCompanies(q, id);
        if (!companies.data.length)
          return json({ ...companies, data: null }, 404);
        if (companies.data.length > 1)
          return json({ error: "Ticker is ambiguous across exchanges" }, 409);
        id = companies.data[0].entity.id;
      }
      const company = await repo.detail("company", id);
      if (!company.data) return json(company, 404);
      if (path.length === 2) return json(company);
      if (path[2] === "port-assets")
        return json(await repo.companyAssets(id, q));
    }
    return json({ error: "Not found" }, 404);
  } catch (error) {
    if (error instanceof InputError) return json({ error: error.message }, 400);
    if (error instanceof HttpError)
      return json({ error: error.message }, error.status);
    if (error instanceof DatabaseError) {
      const conflict = [
        "23505",
        "23514",
        "23503",
        "P0001",
        "already_reviewed",
      ].includes(error.code ?? "");
      return json(
        {
          error: conflict
            ? "Mapping conflicts with catalog constraints"
            : error.status === 403
              ? "Forbidden"
              : "Catalog temporarily unavailable",
        },
        conflict ? 409 : error.status === 403 ? 403 : 503,
      );
    }
    return json({ error: "Catalog temporarily unavailable" }, 503);
  }
}
