import { CompanyPage } from "@/components/company-page";
import {CompanyPortScope} from '@/components/company-port-scope';
import { PhpThroughput } from '@/components/php-throughput';
import {PhpPlans} from '@/components/php-plans';
import {CentralPendingScope} from '@/components/central-pending-scope';
import {isIssuerPlanTicker} from '@invest/port';
export const dynamic = "force-dynamic";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const ticker=(await params).ticker.toUpperCase();
  const query=await searchParams;
  return (
    <>
    {ticker==='GMD'&&query.central_asset==='gemadept_dung_quat'?<CentralPendingScope/>:<CompanyPortScope ticker={ticker}/>}
    {!(ticker==='GMD'&&query.central_asset==='gemadept_dung_quat')&&(ticker==='PHP'||ticker==='DVP'||isIssuerPlanTicker(ticker))&&<PhpPlans query={query} ticker={ticker}/>}
    {ticker==='PHP'&&<PhpThroughput query={query}/>}
    <CompanyPage
      keyValue={ticker}
      query={query}
    />
    </>
  );
}
