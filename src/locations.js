export const DEFAULT_LOCATION={id:'cyberjaya',name:'Cyberjaya',country:'Malaysia',admin1:'Selangor',latitude:2.922,longitude:101.655};
export function coordinatesLabel(latitude,longitude){return `${Math.abs(latitude).toFixed(4)}° ${latitude<0?'S':'N'} · ${Math.abs(longitude).toFixed(4)}° ${longitude<0?'W':'E'}`;}
export function supportedLocation(place){return Number.isFinite(place.latitude)&&Number.isFinite(place.longitude)&&Math.abs(place.latitude)<=80&&Math.abs(place.longitude)<=180;}
export async function searchLocations(query,signal){
 const params=new URLSearchParams({name:query.trim(),count:'8',language:'en',format:'json'});
 const response=await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`,{signal});
 if(!response.ok)throw new Error('Place search is unavailable. Please try again.');
 const data=await response.json();
 return (data.results||[]).filter(p=>Number.isFinite(p.latitude)&&Number.isFinite(p.longitude));
}
