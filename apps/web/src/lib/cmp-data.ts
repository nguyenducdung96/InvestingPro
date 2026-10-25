import 'server-only';
import {cmpBulletins,cmpHistoryMetadata} from '@invest/port';
// Each deployment exposes one immutable edition array, shared by API and UI.
Object.freeze(cmpBulletins);
export {cmpBulletins,cmpHistoryMetadata};
