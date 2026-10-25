import type {SouthEvent} from './south-plans';
export async function loadSouthJournal(month:string):Promise<SouthEvent[]>{switch(month){
case '2025-01':return (await import('./south-journal-data/2025-01')).southEvents;
case '2025-02':return (await import('./south-journal-data/2025-02')).southEvents;
case '2025-03':return (await import('./south-journal-data/2025-03')).southEvents;
case '2025-04':return (await import('./south-journal-data/2025-04')).southEvents;
case '2025-05':return (await import('./south-journal-data/2025-05')).southEvents;
case '2025-06':return (await import('./south-journal-data/2025-06')).southEvents;
case '2025-07':return (await import('./south-journal-data/2025-07')).southEvents;
case '2025-08':return (await import('./south-journal-data/2025-08')).southEvents;
case '2025-09':return (await import('./south-journal-data/2025-09')).southEvents;
case '2025-10':return (await import('./south-journal-data/2025-10')).southEvents;
case '2025-11':return (await import('./south-journal-data/2025-11')).southEvents;
case '2025-12':return (await import('./south-journal-data/2025-12')).southEvents;
case '2026-01':return (await import('./south-journal-data/2026-01')).southEvents;
case '2026-02':return (await import('./south-journal-data/2026-02')).southEvents;
case '2026-03':return (await import('./south-journal-data/2026-03')).southEvents;
case '2026-04':return (await import('./south-journal-data/2026-04')).southEvents;
case '2026-05':return (await import('./south-journal-data/2026-05')).southEvents;
case '2026-06':return (await import('./south-journal-data/2026-06')).southEvents;
case '2026-07':return (await import('./south-journal-data/2026-07')).southEvents;
case '2026-08':return (await import('./south-journal-data/2026-08')).southEvents;
case '2026-09':return (await import('./south-journal-data/2026-09')).southEvents;
case '2026-10':return (await import('./south-journal-data/2026-10')).southEvents;
default:return [];}}
