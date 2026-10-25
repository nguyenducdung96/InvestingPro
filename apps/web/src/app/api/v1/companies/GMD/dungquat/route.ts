import {dungquatSnapshot} from '@invest/port';

export async function GET(){
 return Response.json({data:dungquatSnapshot,scope:{asset:'gemadept_dung_quat',movement_scope:'position',history_available:false},metrics:{arrivals:null,departures:null,dwt:null,yoy:null},scheduled_refresh_verified:false});
}
