import {it,expect} from 'vitest';
import {mergeGemalinkPlanDays} from '../packages/modules/port/src/gemalink-national';
import {southPlanDays,southSeries,type SouthDay} from '../packages/modules/port/src/south-plans';
const day=(date:string,arrival:[number,number|null,number],departure:[number,number|null,number]):SouthDay=>({day:date,sha256:'a'.repeat(64),checked_at:'2026-10-29T00:00:00Z',last_attempt:'2026-10-29T00:00:00Z',error:null,assets:{gemalink:{arrival,departure}},rejected:0,internal:0});
it('adds separately recorded PDF movements while preserving direction, missing DWT and strict nulls',()=>{
 const board=southPlanDays([day('2025-06-29',[0,null,0],[1,100,0])],'gemalink');
 const pdf=southPlanDays([day('2025-06-29',[1,31285,0],[1,null,1])],'gemalink');
 const merged=mergeGemalinkPlanDays(board,pdf),groups={gemalink:merged};
 const arrival=southSeries(groups,['gemalink'],'arrival',new Date('2026-10-29T08:00:00+07:00')).months.find(p=>p.period==='2025-06')!;
 const departure=southSeries(groups,['gemalink'],'departure',new Date('2026-10-29T08:00:00+07:00')).months.find(p=>p.period==='2025-06')!;
 expect(arrival.current.known_rows).toBe(1);expect(arrival.current.observed_dwt).toBe(31285);expect(arrival.current.dwt).toBeNull();
 expect(departure.current.known_rows).toBe(2);expect(departure.current.observed_dwt).toBe(100);expect(departure.current.missing_dwt).toBe(1);
});
it('retains the last board cutoff and does not invent observations in an absent PDF month',()=>{
 const board=southPlanDays([day('2026-10-28',[1,100,0],[0,null,0])],'gemalink');
 expect(mergeGemalinkPlanDays(board,[])).toEqual(board);
 expect(()=>mergeGemalinkPlanDays(board,[board[0],board[0]])).toThrow('Duplicate');
});
