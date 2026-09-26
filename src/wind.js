export const CENTER = [101.655, 2.922];
// Meteorological direction is where wind comes FROM. Mercator y increases southward.
export function windVector(speed, fromDegrees) {
 const a = fromDegrees * Math.PI / 180;
 return {east: -Math.sin(a) * speed, south: Math.cos(a) * speed};
}
export function cardinal(deg) {return ['N','NE','E','SE','S','SW','W','NW'][Math.round(deg/45)%8];}
export async function fetchWind(signal) {
 const query=new URLSearchParams({latitude:CENTER[1],longitude:CENTER[0],current:'wind_speed_10m,wind_direction_10m,wind_gusts_10m',wind_speed_unit:'ms',timezone:'Asia/Kuala_Lumpur'});
 const res=await fetch(`https://api.open-meteo.com/v1/forecast?${query}`,{signal});
 if(!res.ok) throw new Error(`Weather service returned ${res.status}`);
 const {current, current_units}=await res.json();
 if(!current || ![current.wind_speed_10m,current.wind_direction_10m,current.wind_gusts_10m].every(Number.isFinite) || current.wind_speed_10m<0 || current_units.wind_speed_10m!=='m/s') throw new Error('Incomplete wind data');
 return {speed:current.wind_speed_10m,direction:current.wind_direction_10m,gust:current.wind_gusts_10m,time:current.time,receivedAt:Date.now()};
}
