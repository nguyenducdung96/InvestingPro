import type {SouthEvent} from './south-plans';
import {decodeSouthJournal} from './south-journal-codec';
export async function loadSouthJournal(month:string):Promise<SouthEvent[]>{switch(month){
case '2025-01':return decodeSouthJournal((await import('./south-journal-data/2025-01')).southJournalGzip);
case '2025-02':return decodeSouthJournal((await import('./south-journal-data/2025-02')).southJournalGzip);
case '2025-03':return decodeSouthJournal((await import('./south-journal-data/2025-03')).southJournalGzip);
case '2025-04':return decodeSouthJournal((await import('./south-journal-data/2025-04')).southJournalGzip);
case '2025-05':return decodeSouthJournal((await import('./south-journal-data/2025-05')).southJournalGzip);
case '2025-06':return decodeSouthJournal((await import('./south-journal-data/2025-06')).southJournalGzip);
case '2025-07':return decodeSouthJournal((await import('./south-journal-data/2025-07')).southJournalGzip);
case '2025-08':return decodeSouthJournal((await import('./south-journal-data/2025-08')).southJournalGzip);
case '2025-09':return decodeSouthJournal((await import('./south-journal-data/2025-09')).southJournalGzip);
case '2025-10':return decodeSouthJournal((await import('./south-journal-data/2025-10')).southJournalGzip);
case '2025-11':return decodeSouthJournal((await import('./south-journal-data/2025-11')).southJournalGzip);
case '2025-12':return decodeSouthJournal((await import('./south-journal-data/2025-12')).southJournalGzip);
case '2026-01':return decodeSouthJournal((await import('./south-journal-data/2026-01')).southJournalGzip);
case '2026-02':return decodeSouthJournal((await import('./south-journal-data/2026-02')).southJournalGzip);
case '2026-03':return decodeSouthJournal((await import('./south-journal-data/2026-03')).southJournalGzip);
case '2026-04':return decodeSouthJournal((await import('./south-journal-data/2026-04')).southJournalGzip);
case '2026-05':return decodeSouthJournal((await import('./south-journal-data/2026-05')).southJournalGzip);
case '2026-06':return decodeSouthJournal((await import('./south-journal-data/2026-06')).southJournalGzip);
case '2026-07':return decodeSouthJournal((await import('./south-journal-data/2026-07')).southJournalGzip);
case '2026-08':return decodeSouthJournal((await import('./south-journal-data/2026-08')).southJournalGzip);
case '2026-09':return decodeSouthJournal((await import('./south-journal-data/2026-09')).southJournalGzip);
case '2026-10':return decodeSouthJournal((await import('./south-journal-data/2026-10')).southJournalGzip);
default:return [];}}
