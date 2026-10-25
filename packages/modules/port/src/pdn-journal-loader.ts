import type {PdnEvent} from './pdn-plans';
import {decodePdnJournal} from './pdn-journal-codec';
export async function loadPdnJournal(month:string):Promise<PdnEvent[]>{switch(month){
case '2025-01':return decodePdnJournal((await import('./pdn-journal-data/2025-01')).pdnJournalGzip);
case '2025-02':return decodePdnJournal((await import('./pdn-journal-data/2025-02')).pdnJournalGzip);
case '2025-03':return decodePdnJournal((await import('./pdn-journal-data/2025-03')).pdnJournalGzip);
case '2025-04':return decodePdnJournal((await import('./pdn-journal-data/2025-04')).pdnJournalGzip);
case '2025-05':return decodePdnJournal((await import('./pdn-journal-data/2025-05')).pdnJournalGzip);
case '2025-06':return decodePdnJournal((await import('./pdn-journal-data/2025-06')).pdnJournalGzip);
case '2025-07':return decodePdnJournal((await import('./pdn-journal-data/2025-07')).pdnJournalGzip);
case '2025-08':return decodePdnJournal((await import('./pdn-journal-data/2025-08')).pdnJournalGzip);
case '2025-09':return decodePdnJournal((await import('./pdn-journal-data/2025-09')).pdnJournalGzip);
case '2025-10':return decodePdnJournal((await import('./pdn-journal-data/2025-10')).pdnJournalGzip);
case '2025-11':return decodePdnJournal((await import('./pdn-journal-data/2025-11')).pdnJournalGzip);
case '2025-12':return decodePdnJournal((await import('./pdn-journal-data/2025-12')).pdnJournalGzip);
case '2026-01':return decodePdnJournal((await import('./pdn-journal-data/2026-01')).pdnJournalGzip);
case '2026-02':return decodePdnJournal((await import('./pdn-journal-data/2026-02')).pdnJournalGzip);
case '2026-03':return decodePdnJournal((await import('./pdn-journal-data/2026-03')).pdnJournalGzip);
case '2026-04':return decodePdnJournal((await import('./pdn-journal-data/2026-04')).pdnJournalGzip);
case '2026-05':return decodePdnJournal((await import('./pdn-journal-data/2026-05')).pdnJournalGzip);
case '2026-06':return decodePdnJournal((await import('./pdn-journal-data/2026-06')).pdnJournalGzip);
case '2026-07':return decodePdnJournal((await import('./pdn-journal-data/2026-07')).pdnJournalGzip);
case '2026-08':return decodePdnJournal((await import('./pdn-journal-data/2026-08')).pdnJournalGzip);
case '2026-09':return decodePdnJournal((await import('./pdn-journal-data/2026-09')).pdnJournalGzip);
case '2026-10':return decodePdnJournal((await import('./pdn-journal-data/2026-10')).pdnJournalGzip);
default:return [];}}
