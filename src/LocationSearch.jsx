import {useEffect,useRef,useState} from 'react';
import {Search,X,MapPin} from 'lucide-react';
import {searchLocations,supportedLocation} from './locations';

export function LocationSearch({onSelect}){
 const [query,setQuery]=useState(''),[results,setResults]=useState([]),[open,setOpen]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(''),[active,setActive]=useState(-1);
 const root=useRef(),input=useRef(),generation=useRef(0);
 useEffect(()=>{
  const version=++generation.current,controller=new AbortController();let timeout;
  setResults([]);setActive(-1);setError('');
  if(!open||query.trim().length<2){setLoading(false);return;}
  setLoading(true);
  const timer=setTimeout(async()=>{
   timeout=setTimeout(()=>controller.abort(),10000);
   try{const places=await searchLocations(query,controller.signal);if(version===generation.current){setResults(places);setError('');}}
   catch{if(version===generation.current)setError('Search unavailable. Try typing again.');}
   finally{clearTimeout(timeout);if(version===generation.current)setLoading(false);}
  },300);
  return()=>{generation.current++;clearTimeout(timer);clearTimeout(timeout);controller.abort();};
 },[query,open]);
 useEffect(()=>{const dismiss=e=>{if(!root.current?.contains(e.target))setOpen(false);};document.addEventListener('pointerdown',dismiss);return()=>document.removeEventListener('pointerdown',dismiss);},[]);
 const choose=place=>{if(!supportedLocation(place))return;onSelect(place);setQuery('');setOpen(false);input.current?.blur();};
 const keyboard=e=>{
  if(e.key==='Escape'){setOpen(false);input.current?.blur();return;}
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setOpen(true);const step=e.key==='ArrowDown'?1:-1;setActive(value=>results.length?(value<0?(step>0?0:results.length-1):(value+step+results.length)%results.length):-1);}
  if(e.key==='Enter'&&active>=0&&results[active]){e.preventDefault();choose(results[active]);}
 };
 return <div className="location-search" ref={root}>
  <div className="search-input panel"><Search size={17}/><input ref={input} aria-label="Search for a location" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls="location-results" aria-activedescendant={active>=0?`location-option-${active}`:undefined} placeholder="Search city or place…" value={query} onChange={e=>{setQuery(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)} onKeyDown={keyboard}/>{query&&<button className="icon" aria-label="Clear search" onClick={()=>{setQuery('');input.current?.focus();}}><X size={16}/></button>}</div>
  {open&&<div className="search-results panel"><div id="location-results" role="listbox" aria-label="Locations">
   {query.trim().length<2?<p>Search for a city or postal code.</p>:loading?<p role="status">Searching…</p>:error?<p role="status">{error}</p>:!results.length?<p role="status">No places found. Try a nearby city.</p>:results.map((place,i)=><button key={place.id} id={`location-option-${i}`} role="option" aria-selected={active===i} aria-disabled={!supportedLocation(place)} className={active===i?'selected':''} onClick={()=>choose(place)}><MapPin size={16}/><span>{place.name}<small>{[place.admin1,place.country].filter(Boolean).join(', ')}{!supportedLocation(place)&&' · outside map coverage'}</small></span></button>)}
  </div><a href="https://open-meteo.com/en/docs/geocoding-api" target="_blank" rel="noreferrer">Place search · Open-Meteo / GeoNames ↗</a></div>}
 </div>;
}
