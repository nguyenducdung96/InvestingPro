import { CompanyPage } from "@/components/company-page";
import {CompanyPortScope} from '@/components/company-port-scope';
import { PhpThroughput } from '@/components/php-throughput';
import {PhpPlans} from '@/components/php-plans';
import {DungquatScope} from '@/components/dungquat-scope';
import {DungquatActivity} from '@/components/dungquat-activity';
import {isIssuerPlanTicker,southScopes,type SouthIssuer} from '@invest/port';
import {QnpPlans} from '@/components/qnp-plans';
import {CmpPlans} from '@/components/cmp-plans';
import {NapActivity} from '@/components/nap-activity';
import {PdnPlans} from '@/components/pdn-plans';
import {SouthPlans} from '@/components/south-plans';
import {notFound} from 'next/navigation';
import {isPublishedCompany} from '@/lib/published-catalog';
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const ticker=(await params).ticker.toUpperCase();
  if(!isPublishedCompany(ticker))notFound();
  const query=await searchParams;
  return (
    <>
    {ticker==='GMD'&&query.central_asset==='gemadept_dung_quat'?<DungquatScope/>:<CompanyPortScope ticker={ticker}/>}
    {ticker==='GMD'&&query.central_asset==='gemadept_dung_quat'&&<DungquatActivity query={query}/>}
    {ticker==='GMD'&&query.central_asset!=='gemadept_dung_quat'&&!['gmd','nam_dinh_vu'].includes(query.plan_asset)&&<SouthPlans ticker="GMD" query={query}/>}
    {Object.hasOwn(southScopes,ticker)&&ticker!=='GMD'&&<SouthPlans ticker={ticker as SouthIssuer} query={query}/>}
    {ticker==='PDN'&&<PdnPlans query={query}/>}
    {!(ticker==='GMD'&&(query.central_asset==='gemadept_dung_quat'||!['gmd','nam_dinh_vu'].includes(query.plan_asset)))&&(ticker==='PHP'||ticker==='DVP'||isIssuerPlanTicker(ticker))&&<PhpPlans query={query} ticker={ticker}/>}
    {ticker==='PHP'&&<PhpThroughput query={query}/>}
    {ticker==='QNP'&&<QnpPlans query={query}/>}
    {ticker==='CMP'&&<CmpPlans query={query}/>}
    {ticker==='NAP'&&<NapActivity query={query}/>}
    <CompanyPage
      keyValue={ticker}
      query={query}
    />
    </>
  );
}
