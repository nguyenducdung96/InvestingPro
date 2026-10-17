import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {editorialEntries} from '../apps/web/src/lib/editorial';
it('accepts only the bounded factual edition, rejects private provider content and fabricated scope',()=>{
 const input=JSON.parse(readFileSync('docs/catalog-review/public-catalog-facts.json','utf8'));
 expect(editorialEntries(input)).toHaveLength(41);
 const leaked=structuredClone(input);leaked.entries[0].source.raw_storage_key='private/path';expect(()=>editorialEntries(leaked)).toThrow('Invalid source');
 const api=structuredClone(input);api.entries[0].profile='API prose';expect(()=>editorialEntries(api)).toThrow('Invalid identity');
 const incomplete=structuredClone(input);incomplete.entries.pop();expect(()=>editorialEntries(incomplete)).toThrow('Exact scope');
});
