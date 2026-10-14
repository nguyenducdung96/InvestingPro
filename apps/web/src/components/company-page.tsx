import { notFound } from "next/navigation";
import { publicRepository } from "@/lib/server";
import { AssetList, SourceBadge, Unavailable } from "./catalog";
import { UUID, pageQuery } from "@invest/port";
export async function CompanyPage({
  keyValue,
  query,
}: {
  keyValue: string;
  query: Record<string, string>;
}) {
  let company;
  let assets;
  try {
    const repo = publicRepository();
    const q = pageQuery(new URLSearchParams(query));
    if (UUID.test(keyValue)) {
      company = (await repo.detail("company", keyValue)).data;
    } else {
      const result = await repo.listedCompanies(
        { ...q, limit: 100, cursor: undefined },
        keyValue,
      );
      if (result.data.length > 1)
        return (
          <Unavailable message="Ticker matches multiple exchanges; use the company ID" />
        );
      company = result.data[0];
    }
    if (company) assets = await repo.companyAssets(company.entity.id, q);
  } catch {
    return <Unavailable />;
  }
  if (!company || !assets) notFound();
  return (
    <>
      <p className="eyebrow">VERIFIED COMPANY INTERESTS</p>
      <h1>{company.entity.name}</h1>
      <SourceBadge citation={company.lineage} />
      <h2>Port assets</h2>
      <AssetList result={assets} />
    </>
  );
}
