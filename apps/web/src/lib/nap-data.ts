import 'server-only';
import {napDaily,napHistoryMetadata,loadNapJournal,napVisitEvents,type NapScope} from '@invest/port';
export {napDaily,napHistoryMetadata};
export async function napJournal(day:string,asset:NapScope='nap'){
 return napVisitEvents(await loadNapJournal(day.slice(0,7)),day,asset);
}
