import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import maplibregl from 'maplibre-gl';
import {Wind,Layers3,Mountain,Plus,Minus,LocateFixed,Compass,Pause,Play,ArrowUpRight,RotateCcw,Info,RefreshCw} from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import {style} from './mapStyle';
import {WindLayer} from './WindLayer';
import {CENTER,fetchWind,cardinal} from './wind';
function App(){
 const container=useRef(),map=useRef(),layer=useRef(),refresh=useRef();
 const [ready,setReady]=useState(false),[wind,setWind]=useState(null),[error,setError]=useState(''),[mapError,setMapError]=useState(''),[fetching,setFetching]=useState(true),[layers,setLayers]=useState({wind:true,buildings:true,terrain:true}),[playing,setPlaying]=useState(true),[pitch,setPitch]=useState(58),[bearing,setBearing]=useState(-24),[info,setInfo]=useState(false),[now,setNow]=useState(Date.now());
 useEffect(()=>{let m;try{m=new maplibregl.Map({container:container.current,style,center:CENTER,zoom:14.1,pitch:58,bearing:-24,maxPitch:75,maxZoom:18,minZoom:11,maxBounds:[[101.56,2.83],[101.75,3.02]],attributionControl:{compact:true}});}catch{setMapError('WebGL is unavailable. Open this page in a browser with hardware acceleration.');return;}
 map.current=m;m.addControl(new maplibregl.ScaleControl({maxWidth:120}),'bottom-left');
 m.on('error',e=>{console.error(e.error);setMapError('Some map data could not load. Check your connection and reload.');});
 m.on('load',()=>{m.setTerrain({source:'dem',exaggeration:1});const l=new WindLayer();m.addLayer(l);layer.current=l;setReady(true);});
 m.on('move',()=>{setPitch(Math.round(m.getPitch()));setBearing(Math.round(m.getBearing()));});
 const wake=()=>{if(!document.hidden)m.triggerRepaint();};document.addEventListener('visibilitychange',wake);
 return()=>{document.removeEventListener('visibilitychange',wake);m.remove();};},[]);
 useEffect(()=>{let controller;let active=true;const update=async()=>{controller?.abort();controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);setFetching(true);try{const w=await fetchWind(controller.signal);if(active){setWind(w);setError('');}}catch{if(active)setError('Wind update unavailable. Try again.');}finally{clearTimeout(timeout);if(active)setFetching(false);}};refresh.current=update;update();const id=setInterval(update,600000),clock=setInterval(()=>setNow(Date.now()),30000);return()=>{active=false;controller?.abort();clearInterval(id);clearInterval(clock);};},[]);
 useEffect(()=>{if(ready)layer.current.setWind(wind);},[wind,ready]);
 useEffect(()=>{if(!ready)return;layer.current.enabled=layers.wind;map.current.setLayoutProperty('buildings','visibility',layers.buildings?'visible':'none');map.current.setTerrain(layers.terrain?{source:'dem',exaggeration:1}:null);map.current.triggerRepaint();},[layers,ready]);
 useEffect(()=>{if(ready){layer.current.playing=playing;map.current.triggerRepaint();}},[playing,ready]);
 const toggle=k=>setLayers(v=>({...v,[k]:!v[k]}));
 const reset=()=>map.current?.flyTo({center:CENTER,zoom:14.1,pitch:58,bearing:-24});
 const stale=wind&&(now-wind.receivedAt>1200000||error);
 return <main><div ref={container} className="map" aria-label="Interactive 3D map of Cyberjaya"/><div className="top-shade"/>
 <header><div className="brand"><span className="brand-icon"><Wind size={25}/></span><div>WIND ATLAS<span className="brand-sub">CYBERJAYA OBSERVATORY</span></div></div><div className="live"><span className={wind&&!stale?'dot':''}/>{wind?(stale?'LAST AVAILABLE DATA':'LIVE MODEL DATA'):'CONNECTING'}<span className="live-divider"/>10 M ABOVE GROUND</div></header>
 <section className="place"><div className="eyebrow">MALAYSIA <span>/</span> SELANGOR</div><h1>Cyberjaya<span>.</span></h1><p>2.9220° N <span>101.6550° E</span></p></section>
 <section className="weather panel"><div className="panel-label"><Wind size={16}/> CURRENT WIND <button className={fetching?'spin icon':'icon'} aria-label="Refresh wind data" onClick={()=>refresh.current?.()} disabled={fetching}><RefreshCw size={14}/></button></div><div className="speed">{wind?wind.speed.toFixed(1):'—'}<span>m/s</span></div><div className="weather-detail"><span><ArrowUpRight size={18} style={{transform:`rotate(${(wind?.direction||0)+135}deg)`}}/>{wind?`From ${cardinal(wind.direction)} · ${wind.direction}°`:'Awaiting wind data'}</span><span>Gusts <b>{wind?wind.gust.toFixed(1):'—'}</b> m/s</span></div><div className="weather-bottom">{wind?`Model time ${wind.time.slice(11,16)} MYT`:'Fetching Open-Meteo'}<span>↗ Open-Meteo</span></div>{error&&<p role="status" className="error">{error} {wind?'Showing last reading.':'Particles paused until data returns.'}</p>}</section>
 <section className="layer-panel panel"><div className="panel-label">MAP LAYERS <span>03</span></div>{[["wind",Wind,"Wind particles","5,000 flowing particles"],["buildings",Layers3,"3D buildings","OpenStreetMap geometry"],["terrain",Mountain,"Terrain","Real elevation · 1×"]].map(([id,Icon,title,sub])=><button key={id} className="layer-row" role="switch" aria-checked={layers[id]} onClick={()=>toggle(id)}><Icon size={19}/><span>{title}<small>{sub}</small></span><span className={`switch ${layers[id]?'on':''}`}><i/></span></button>)}</section>
 <div className="map-controls panel"><button aria-label="Zoom in" onClick={()=>map.current?.zoomIn()}><Plus/></button><button aria-label="Zoom out" onClick={()=>map.current?.zoomOut()}><Minus/></button><hr/><button aria-label="Reset view to Cyberjaya" onClick={reset}><LocateFixed size={20}/></button><button aria-label="Reset north" onClick={()=>map.current?.easeTo({bearing:0})}><Compass size={21} style={{transform:`rotate(${-bearing}deg)`}}/></button></div>
 <div className="view-panel panel"><div><span>VIEW ANGLE</span><b>{pitch}°</b></div><input type="range" min="0" max="75" value={pitch} aria-label="Map tilt" onChange={e=>map.current?.setPitch(Number(e.target.value))}/><button onClick={()=>map.current?.easeTo({bearing:map.current.getBearing()+45})}><RotateCcw size={14}/> Rotate 45°</button></div>
 <div className="compass-label" style={{transform:`rotate(${-bearing}deg)`}}><span>N</span><div>↑</div></div>
 <footer className="transport panel"><button className="play" aria-label={playing?'Pause particles':'Play particles'} onClick={()=>setPlaying(!playing)}>{playing?<Pause size={17}/>:<Play size={17}/>}</button><div className="transport-label"><b>{!layers.wind?'Wind hidden':!wind?'Awaiting data':playing?'Wind in motion':'Animation paused'}</b><span>Live direction · 12× visual speed</span></div><div className="legend"><span className="trail"/>WIND FLOW</div><button className={`icon info ${info?'active':''}`} aria-label="About the visualization" aria-expanded={info} onClick={()=>setInfo(!info)}><Info size={19}/></button></footer>
 <div className="interaction-hint">Drag to pan <span>·</span> Scroll to zoom <span>·</span> Right-drag to rotate</div>
 {info&&<aside className="about panel"><b>A first look at the wind</b><p>Open-Meteo’s current modeled wind at 10 m, refreshed every 10 minutes. One reading drives the whole view. Particles are drawn above the map for visibility and move at 12× speed.</p><p>OSM building footprints are extruded using available heights; missing heights use the tile provider’s estimate. Terrain uses Mapzen elevation. Buildings do not alter airflow. This is not a CFD simulation.</p><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather data: Open-Meteo ↗</a></aside>}
 {(!ready||mapError)&&<div className="map-status" role="status">{mapError||'Loading Cyberjaya’s terrain and buildings…'}</div>}
 </main>;
}
createRoot(document.getElementById('root')).render(<App/>);
