"""Refresh SWC independently, keeping the reviewed history on a cold runner."""
import concurrent.futures as cf,datetime as dt,importlib.util,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('collector',ROOT/'scripts/collect-pdn-plans.py');collector=importlib.util.module_from_spec(spec);spec.loader.exec_module(collector)
def main():
 end=dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).date()-dt.timedelta(days=1)
 ledger=json.loads((ROOT/'docs/catalog-review/swc-longbinh-history-ledger.json').read_text(encoding='utf8'))
 start=min(end-dt.timedelta(days=6),dt.date.fromisoformat(ledger['metadata']['through'])+dt.timedelta(days=1))
 collector.OUT=ROOT/'.local/swc';urls=collector.bootstrap();counts={}
 tasks=[(str(start+dt.timedelta(days=i)),direction) for i in range((end-start).days+1) for direction in ['arrival','departure']]
 with cf.ThreadPoolExecutor(max_workers=3) as pool:
  futures=[pool.submit(collector.collect,day,direction,urls,True) for day,direction in tasks]
  for f in cf.as_completed(futures):
   status=f.result();counts[status]=counts.get(status,0)+1
 receipt={'checked_at':dt.datetime.now(dt.timezone.utc).isoformat(),'from':str(start),'through':str(end),'counts':counts,'source_refresh_success':not counts.get('failed',0)}
 collector.OUT.mkdir(exist_ok=True);(collector.OUT/'collect-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
 print(json.dumps(receipt),flush=True)
 if counts.get('failed'):raise SystemExit('Source error; retaining published SWC edition')
 subprocess.run([sys.executable,str(ROOT/'scripts/export-swc-longbinh-plans.py'),'--through',str(end),'--raw-dir',str(collector.OUT/'raw'),'--recent-only'],check=True,cwd=ROOT)
if __name__=='__main__':main()
