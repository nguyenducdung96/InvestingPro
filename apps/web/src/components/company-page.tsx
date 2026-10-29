import { notFound } from "next/navigation";
import Link from "next/link";
import { publicRepository } from "@/lib/server";
import { AssetList, Metadata, SourceBadge, Unavailable } from "./catalog";
import { UUID, pageQuery } from "@invest/port";
import { ReportedAssets } from "./reported-assets";
import {CompanyResearch} from "./company-research";
import {EditorialCompanyPage} from './editorial-catalog';
import {isPublishedCompany} from '@/lib/published-catalog';
export async function CompanyPage({
  keyValue,
  query,
}: {
  keyValue: string;
  query: Record<string, string>;
}) {
  if(!isPublishedCompany(keyValue))notFound();
  if(query.view==="research") {const research=await CompanyResearch({keyValue});if(research)return research;}
  if(query.view!=="verified"&&query.view!=="research"){
    try{const edition=await publicRepository().editorialEdition();const company=edition?.entries.find(c=>c.ticker===keyValue.toUpperCase()||c.company_id===keyValue);if(edition&&company)return <EditorialCompanyPage company={company} edition={edition}/>;}catch{return <Unavailable/>;}
  }
  let company;
  let assets;
  let reported;
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
    if (company) {
      assets = await repo.companyAssets(company.entity.id, q);
      reported = await repo.reportedAssets(company.entity.id,{...q,cursor:undefined,limit:100});
    }
  } catch {
    return <Unavailable />;
  }
  if (!company || !assets) notFound();
  return (
    <>
      <p className="eyebrow">QUAN HỆ DOANH NGHIỆP ĐÃ XÁC MINH</p>
      <h1>{company.entity.name}</h1>
      <SourceBadge citation={company.lineage} />
      <Metadata meta={assets.meta} />
      <p className="notice">Các quan hệ bên dưới đã được xác minh từng bản ghi. Danh sách này chưa được chứng nhận là toàn bộ tài sản của doanh nghiệp.</p>
      <h2>Cảng biển và cảng sông</h2>
      <AssetList showMetadata={false} result={{ ...assets, data: assets.data.filter(x => x.asset.kind !== "icd"), meta: { ...assets.meta, nextCursor: null } }} />
      {assets.data.some(x => x.asset.kind === "icd") && <section aria-label="ICD và cảng cạn">
        <h2>ICD / cảng cạn</h2>
        <AssetList showMetadata={false} result={{ ...assets, data: assets.data.filter(x => x.asset.kind === "icd"), meta: { ...assets.meta, nextCursor: null } }} />
      </section>}
      {assets.meta.nextCursor && <Link href={`?${new URLSearchParams({ ...query, cursor: assets.meta.nextCursor })}`}>Trang tiếp theo</Link>}
      {!!reported?.data.length&&<section aria-label="Quan hệ theo kỳ báo cáo"><h2>Quan hệ doanh nghiệp báo cáo theo kỳ</h2><ReportedAssets items={reported.data}/></section>}
    </>
  );
}
