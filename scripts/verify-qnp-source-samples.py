"""Regression checks against rows visually read from three official source images."""
import json
import pathlib

ROOT=pathlib.Path(__file__).resolve().parents[1]
CASES={
    7924:{'2026-10-23T18:00:00+07:00':28378,'2026-10-23T18:30:00+07:00':4559,'2026-10-24T11:00:00+07:00':24500,'2026-10-24T12:00:00+07:00':1931},
    7554:{'2026-04-26T17:30:00+07:00':28710,'2026-04-26T18:00:00+07:00':32926,'2026-04-26T19:00:00+07:00':18581,'2026-04-26T19:30:00+07:00':19542},
    6158:{'2025-06-10T18:00:00+07:00':8040,'2025-06-10T18:15:00+07:00':13530,'2025-06-11T06:00:00+07:00':28663,'2025-06-11T15:00:00+07:00':28663},
}


def main():
    checked=[]
    for ident,expected in CASES.items():
        source=json.loads((ROOT/f'.local/qnp-authority/parsed/{ident}.json').read_text(encoding='utf-8'))
        if source['ocr_config']!='grid-cells-upright':raise ValueError('Source sample still uses the prototype parser')
        matched=0;known=0
        for row in source['rows']:
            if row['time'] not in expected:continue
            matched+=1
            if row['dwt'] is not None:
                if row['dwt']!=expected[row['time']]:raise ValueError(f'Official sample DWT mismatch: {ident} {row["time"]}')
                known+=1
        if matched<3 or known<2:raise ValueError(f'Official sample is not sufficiently readable: {ident}')
        checked.append({'id':ident,'url':source['url'],'image_sha256':source['images'][0]['sha256'],'matched_rows':matched,'known_weights':known})
    (ROOT/'.local/qnp-authority/sample-verification.json').write_text(json.dumps(checked,indent=2),encoding='utf-8')
    print(json.dumps({'official_samples':len(checked),'visually_checked_reference_rows':sum(r['matched_rows'] for r in checked),'matching_known_weights':sum(r['known_weights'] for r in checked)}))


if __name__=='__main__':main()
