import type {SouthEvent} from './south-plans';
import {decodeSouthJournal} from './south-journal-codec';
export async function loadGemalinkNationalJournal(month:string):Promise<SouthEvent[]>{switch(month){
case '2025-01':return decodeSouthJournal((await import('./gemalink-national-journal-data/2025-01')).southJournalGzip);
case '2025-02':return decodeSouthJournal((await import('./gemalink-national-journal-data/2025-02')).southJournalGzip);
case '2025-03':return decodeSouthJournal((await import('./gemalink-national-journal-data/2025-03')).southJournalGzip);
case '2025-04':return decodeSouthJournal((await import('./gemalink-national-journal-data/2025-04')).southJournalGzip);
case '2025-05':return decodeSouthJournal((await import('./gemalink-national-journal-data/2025-05')).southJournalGzip);
case '2025-06':return decodeSouthJournal((await import('./gemalink-national-journal-data/2025-06')).southJournalGzip);
case '2025-07':return decodeSouthJournal((await import('./gemalink-national-journal-data/2025-07')).southJournalGzip);
default:return [];}}
