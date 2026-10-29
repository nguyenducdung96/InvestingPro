import {it,expect,vi} from 'vitest';
import type {Transport} from '@invest/db';
import {isPublishedCompany,publishedCatalogTransport} from '../apps/web/src/lib/published-catalog';

it('withdraws TCL before database pagination without overwriting existing filters',async()=>{
 const read=vi.fn().mockResolvedValue([]);
 const transport=publishedCatalogTransport({read} as unknown as Transport);
 const query=new URLSearchParams({ticker:'eq.TCL',limit:'11',or:'(valid_to.is.null,valid_to.gt.2026-10-30)'});
 await transport.read('catalog','company_listings',query);
 expect(read.mock.calls[0][2].get('and')).toBe('(ticker.neq.TCL)');
 expect(read.mock.calls[0][2].get('ticker')).toBe('eq.TCL');
 expect(read.mock.calls[0][2].get('limit')).toBe('11');
 expect(read.mock.calls[0][2].get('or')).toBe(query.get('or'));
 expect(query.has('and')).toBe(false);
 await transport.read('catalog','entities',new URLSearchParams({id:'eq.some-id',and:'(kind.eq.company)'}));
 expect(read.mock.calls[1][2].get('and')).toBe('(id.neq.009b5929-253c-5b10-8d75-22b9828c93ae,kind.eq.company)');
 expect(read.mock.calls[1][2].get('id')).toBe('eq.some-id');
});

it('omits withdrawn entries from published editions while preserving stored evidence and other issuers',async()=>{
 const edition={id:'edition',entries:[{ticker:'TCL',company_id:'tcl-id'},{ticker:'CLL',company_id:'cll-id'}]};
 const read=vi.fn().mockResolvedValue([edition]);
 const result=await publishedCatalogTransport({read} as unknown as Transport).read('port','editorial_catalog_editions',new URLSearchParams());
 expect(result[0].entries.map(c=>c.ticker)).toEqual(['CLL']);
 expect(edition.entries).toHaveLength(2);
 expect(isPublishedCompany('tcl')).toBe(false);
 expect(isPublishedCompany('009b5929-253c-5b10-8d75-22b9828c93ae')).toBe(false);
 expect(isPublishedCompany('CLL')).toBe(true);
});
