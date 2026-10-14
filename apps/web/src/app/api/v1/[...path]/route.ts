import { handleCatalog } from "@/lib/api";
import { publicRepository, adminRepository } from "@/lib/server";
export const dynamic = "force-dynamic";
async function handler(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return handleCatalog(request, path, publicRepository, () =>
    adminRepository(request),
  );
}
export { handler as GET, handler as POST, handler as PATCH };
