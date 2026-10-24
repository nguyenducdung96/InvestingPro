"""Official report collection for separate PHP and DVP berth scopes."""
import argparse
import concurrent.futures
import datetime as dt
import gzip
import hashlib
import importlib.util
import json
import pathlib
import re
import time

ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('pilot',ROOT/'scripts/collect-tanvu-plan-months.py')
pilot=importlib.util.module_from_spec(spec);spec.loader.exec_module(pilot)
ASSETS={'tan_vu':'TAN VU','chua_ve':'CHUA VE','hoang_dieu':'HOANG DIEU','htit':'HTIT'}
OUT=ROOT/'.local/php-plans';RAW=OUT/'raw'

def fetch_report(url):
    for attempt in range(3):
        try:return pilot.fetch(url)
        except OSError:
            if attempt==2:raise
            time.sleep(1+attempt)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--days-file',type=pathlib.Path);parser.add_argument('--company',choices=['PHP','DVP','VSC'],default='PHP')
    args=parser.parse_args()
    global ASSETS,OUT,RAW
    if args.company=='DVP':
        ASSETS={'dinh_vu':'DINH VU'};OUT=ROOT/'.local/dvp-plans';RAW=OUT/'raw'
    if args.company=='VSC':
        ASSETS={'green_port':'GREEN PORT','vip_green_port':'VIP GREEN PORT','nam_hai_dinh_vu':'NAM HAI DINH VU','vimc_dinh_vu':'VIMC'};OUT=ROOT/'.local/vsc-plans';RAW=OUT/'raw'
    RAW.mkdir(parents=True,exist_ok=True)
    raw=fetch_report(pilot.probe.BASE+'?d=0')
    match=re.search(r'KẾ HOẠCH ĐIỀU ĐỘNG TÀU NGÀY\s+(\d{2}/\d{2}/\d{4})',pilot.probe.plain(raw.decode('utf8')))
    if not match:raise ValueError('Cannot calibrate server day')
    anchor=dt.datetime.strptime(match[1],'%d/%m/%Y').date()
    today=dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).date()
    cutoff,dates=pilot.history_window(dt.date(2025,1,1),anchor,today)
    if args.days_file:
        wanted=json.loads(args.days_file.read_text(encoding='utf8'))
        if not isinstance(wanted,list) or not wanted:raise ValueError('Invalid day selection')
        dates=sorted({dt.date.fromisoformat(x) for x in wanted})
        if any(d<dt.date(2025,1,1) or d>cutoff for d in dates):raise ValueError('Day outside elapsed source range')
    # Validated raw archives can be reparsed for new berths without refetching history.
    cached={}
    for folder,raw_folder in [(pilot.OUT/'day-cache',pilot.RAW),(ROOT/'.local/php-plans/day-cache',ROOT/'.local/php-plans/raw'),(OUT/'day-cache',RAW)]:
        for path in folder.glob('*.json'):
            try:
                d=json.loads(path.read_text(encoding='utf8'))
                if d.get('status')=='parsed':cached[d['date']]=(d,raw_folder)
            except (ValueError,KeyError):continue
    checkpoints=OUT/'day-cache';checkpoints.mkdir(exist_ok=True)
    def get_day(day):
        url=f'{pilot.probe.BASE}?d={(day-anchor).days}';used_cache=False
        try:
            raw=None
            if str(day) in cached and day<cutoff-dt.timedelta(days=3):
                item,folder=cached[str(day)]
                try:
                    raw=gzip.decompress((folder/f'{item["sha256"]}.html.gz').read_bytes())
                    if hashlib.sha256(raw).hexdigest()!=item['sha256']:raise ValueError('Hash mismatch')
                    pilot.probe.measure(raw,day,item['url_at_fetch']);url=item['url_at_fetch'];used_cache=True
                except (OSError,ValueError):raw=None
            if raw is None:raw=fetch_report(url)
            digest=hashlib.sha256(raw).hexdigest();(RAW/f'{digest}.html.gz').write_bytes(gzip.compress(raw,mtime=0))
            data={}
            for asset,alias in ASSETS.items():
                try:
                    data[asset]=pilot.parse_day(raw,day,url,alias)
                    if used_cache and item.get('fetched_at'):data[asset]['fetched_at']=item['fetched_at']
                except ValueError as e:
                    data[asset]={'date':str(day),'status':'failed','url_at_fetch':url,'fetched_at':dt.datetime.now(dt.timezone.utc).isoformat(),'error':str(e)}
            checkpoint={'date':str(day),'status':'parsed','sha256':digest,'url_at_fetch':url,'fetched_at':item.get('fetched_at') if used_cache and item.get('fetched_at') else dt.datetime.now(dt.timezone.utc).isoformat()}
            (checkpoints/f'{day}.json').write_text(json.dumps(checkpoint),encoding='utf8')
            return data
        except Exception as e:
            return {asset:{'date':str(day),'status':'failed','url_at_fetch':url,'fetched_at':dt.datetime.now(dt.timezone.utc).isoformat(),'error':str(e)} for asset in ASSETS}
        finally:
            if not used_cache:time.sleep(0.4)
    days={asset:[] for asset in ASSETS}
    print(json.dumps({'requested_days':len(dates),'assets':list(ASSETS),'through':str(cutoff)}),flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        for n,result in enumerate(pool.map(get_day,dates),1):
            for asset,value in result.items():days[asset].append(value)
            if n%60==0:print(json.dumps({'processed_days':n}),flush=True)
    receipt={'checked_at':dt.datetime.now(dt.timezone.utc).isoformat(),'through':str(cutoff),'parser_version':'haiphong-plan-pilot/1.2.0','semantics':'authority_published_plan','assets':days}
    (OUT/'receipt.json').write_text(json.dumps(receipt,ensure_ascii=False),encoding='utf8')
    failed=False
    for asset,values in days.items():
        errors=[d['date'] for d in values if d['status']!='parsed'];failed|=bool(errors)
        print(json.dumps({'asset':asset,'days':len(values),'failed':errors,'events':sum(len(d.get('events',[])) for d in values)}),flush=True)
    if failed:raise SystemExit(1)

if __name__=='__main__':main()
