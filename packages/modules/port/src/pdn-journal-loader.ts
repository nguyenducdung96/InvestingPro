import type {PdnEvent} from './pdn-plans';
export async function loadPdnJournal(month:string):Promise<PdnEvent[]>{switch(month){
case '2025-01':return (await import('./pdn-journal-data/2025-01')).pdnEvents;
case '2025-02':return (await import('./pdn-journal-data/2025-02')).pdnEvents;
case '2025-03':return (await import('./pdn-journal-data/2025-03')).pdnEvents;
case '2025-04':return (await import('./pdn-journal-data/2025-04')).pdnEvents;
case '2025-05':return (await import('./pdn-journal-data/2025-05')).pdnEvents;
case '2025-06':return (await import('./pdn-journal-data/2025-06')).pdnEvents;
case '2025-07':return (await import('./pdn-journal-data/2025-07')).pdnEvents;
case '2025-08':return (await import('./pdn-journal-data/2025-08')).pdnEvents;
case '2025-09':return (await import('./pdn-journal-data/2025-09')).pdnEvents;
case '2025-10':return (await import('./pdn-journal-data/2025-10')).pdnEvents;
case '2025-11':return (await import('./pdn-journal-data/2025-11')).pdnEvents;
case '2025-12':return (await import('./pdn-journal-data/2025-12')).pdnEvents;
case '2026-01':return (await import('./pdn-journal-data/2026-01')).pdnEvents;
case '2026-02':return (await import('./pdn-journal-data/2026-02')).pdnEvents;
case '2026-03':return (await import('./pdn-journal-data/2026-03')).pdnEvents;
case '2026-04':return (await import('./pdn-journal-data/2026-04')).pdnEvents;
case '2026-05':return (await import('./pdn-journal-data/2026-05')).pdnEvents;
case '2026-06':return (await import('./pdn-journal-data/2026-06')).pdnEvents;
case '2026-07':return (await import('./pdn-journal-data/2026-07')).pdnEvents;
case '2026-08':return (await import('./pdn-journal-data/2026-08')).pdnEvents;
case '2026-09':return (await import('./pdn-journal-data/2026-09')).pdnEvents;
case '2026-10':return (await import('./pdn-journal-data/2026-10')).pdnEvents;
default:return [];}}
