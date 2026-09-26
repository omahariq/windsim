import {test} from 'node:test';
import assert from 'node:assert/strict';
import {coordinatesLabel,supportedLocation,searchLocations} from './locations.js';
import {fetchWind} from './wind.js';

test('Coordinates show correct hemispheres in southern and western locations',()=>{
 assert.equal(coordinatesLabel(-33.9249,18.4241),'33.9249° S · 18.4241° E');
 assert.equal(coordinatesLabel(40.7128,-74.006),'40.7128° N · 74.0060° W');
});
test('Search results outside supported terrain coverage are distinguishable',()=>{
 assert.ok(supportedLocation({latitude:52.52,longitude:13.405}));
 assert.equal(supportedLocation({latitude:86,longitude:0}),false);
 assert.equal(supportedLocation({latitude:NaN,longitude:0}),false);
});
test('Search encodes city qualifiers and returns valid matching locations',async()=>{
 const original=globalThis.fetch;let url;
 globalThis.fetch=async(input)=>{url=new URL(input);return {ok:true,json:async()=>({results:[{id:1,name:'Paris',latitude:48.85,longitude:2.35},{id:2,name:'Invalid'}]})};};
 try{const results=await searchLocations('Paris, France');assert.equal(url.searchParams.get('name'),'Paris, France');assert.equal(results.length,1);}finally{globalThis.fetch=original;}
});
test('Weather uses the selected location and its local timezone',async()=>{
 const original=globalThis.fetch;let url;
 globalThis.fetch=async(input)=>{url=new URL(input);return {ok:true,json:async()=>({current:{wind_speed_10m:2,wind_direction_10m:180,wind_gusts_10m:4,time:'2026-09-26T13:00'},current_units:{wind_speed_10m:'m/s'},timezone_abbreviation:'CEST'})};};
 try{const wind=await fetchWind(undefined,[2.35,48.85]);assert.equal(url.searchParams.get('latitude'),'48.85');assert.equal(url.searchParams.get('longitude'),'2.35');assert.equal(url.searchParams.get('timezone'),'auto');assert.equal(wind.timezone,'CEST');}finally{globalThis.fetch=original;}
});
