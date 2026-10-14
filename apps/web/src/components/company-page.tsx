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
          <Unavailable message="Mã chứng khoán trùng trên nhiều sàn; vui lòng dùng mã định danh doanh nghiệp" />
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
      <p className="eyebrow">QUAN HỆ DOANH NGHIỆP ĐÃ XÁC MINH</p>
      <h1>{company.entity.name}</h1>
      <SourceBadge citation={company.lineage} />
      <h2>Tài sản cảng biển</h2>
      <AssetList result={assets} />
    </>
  );
}
