import React,{useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import maplibregl from 'maplibre-gl';
import {Wind,Layers3,Mountain,Plus,Minus,LocateFixed,Compass,Pause,Play,ArrowUpRight,RotateCcw,Info,RefreshCw,Settings2} from 'lucide-react';
import 'maplibre-gl/dist/maplibre-gl.css';
import './style.css';
import {style} from './mapStyle';
import {WindLayer,DEFAULT_PARTICLE_SETTINGS} from './WindLayer';
import {ParticleSettings} from './ParticleSettings';
import {FlowSimulation} from './flow/FlowSimulation';
import {CENTER,fetchWind,cardinal} from './wind';
import {LocationSearch} from './LocationSearch';
import {DEFAULT_LOCATION,coordinatesLabel} from './locations';
function App(){
 const container=useRef(),map=useRef(),layer=useRef(),refresh=useRef(),settingsButton=useRef(),simulation=useRef();
 const [location,setLocation]=useState(DEFAULT_LOCATION);
 const [flowEnabled,setFlowEnabled]=useState(true),[flowStatus,setFlowStatus]=useState({phase:'loading',message:'Loading flow model…'});
 const [settingsOpen,setSettingsOpen]=useState(false),[particleSettings,setParticleSettings]=useState({...DEFAULT_PARTICLE_SETTINGS});
 const [ready,setReady]=useState(false),[wind,setWind]=useState(null),[error,setError]=useState(''),[mapError,setMapError]=useState(''),[fetching,setFetching]=useState(true),[layers,setLayers]=useState({wind:true,buildings:true,terrain:true}),[playing,setPlaying]=useState(true),[pitch,setPitch]=useState(58),[bearing,setBearing]=useState(-24),[info,setInfo]=useState(false),[now,setNow]=useState(Date.now());
 useEffect(()=>{let m;try{m=new maplibregl.Map({container:container.current,style,center:CENTER,zoom:14.1,pitch:58,bearing:-24,maxPitch:75,maxZoom:18,minZoom:11,renderWorldCopies:false,attributionControl:{compact:true}});}catch{setMapError('WebGL is unavailable. Open this page in a browser with hardware acceleration.');return;}
 map.current=m;m.addControl(new maplibregl.ScaleControl({maxWidth:120}),'bottom-left');
 m.on('error',e=>{console.error(e.error);setMapError('Some map data could not load. Check your connection and reload.');});
 m.on('load',()=>{m.setTerrain({source:'dem',exaggeration:1});const l=new WindLayer();m.addLayer(l);layer.current=l;simulation.current=new FlowSimulation(m,l,setFlowStatus);l.setFlow(null,true);setReady(true);});
 m.on('move',()=>{setPitch(Math.round(m.getPitch()));setBearing(Math.round(m.getBearing()));});
 const wake=()=>{if(!document.hidden)m.triggerRepaint();};document.addEventListener('visibilitychange',wake);
 return()=>{document.removeEventListener('visibilitychange',wake);simulation.current?.destroy();m.remove();};},[]);
 useEffect(()=>{
  if(!ready)return;
  simulation.current.setWind(null);layer.current.setLocation([location.longitude,location.latitude]);
  map.current.setMaxBounds(null);
  map.current.jumpTo({center:[location.longitude,location.latitude],zoom:14.1,pitch:58,bearing:-24});
  const span=.09/Math.cos(location.latitude*Math.PI/180);
  map.current.setMaxBounds([[location.longitude-span,location.latitude-.09],[location.longitude+span,location.latitude+.09]]);setMapError('');
 },[location,ready]);
 useEffect(()=>{
  let controller,requestId=0,active=true;setWind(null);setError('');
  const update=async()=>{
   controller?.abort();const ownController=controller=new AbortController(),id=++requestId;
   const timeout=setTimeout(()=>ownController.abort(),15000);setFetching(true);
   try{const w=await fetchWind(ownController.signal,[location.longitude,location.latitude]);if(active&&id===requestId){setWind(w);setError('');}}
   catch{if(active&&id===requestId)setError('Wind update unavailable. Try again.');}
   finally{clearTimeout(timeout);if(active&&id===requestId)setFetching(false);}
  };
  refresh.current=update;update();const interval=setInterval(update,600000),clock=setInterval(()=>setNow(Date.now()),30000);
  return()=>{active=false;controller?.abort();clearInterval(interval);clearInterval(clock);};
 },[location]);
 useEffect(()=>{if(ready){layer.current.setWind(wind);simulation.current.setWind(wind);}},[wind,ready]);
 useEffect(()=>{if(ready){layer.current.enabled=layers.wind;map.current.triggerRepaint();}},[layers.wind,ready]);
 useEffect(()=>{if(!ready)return;map.current.setLayoutProperty('buildings','visibility',layers.buildings?'visible':'none');map.current.setTerrain(layers.terrain?{source:'dem',exaggeration:1}:null);simulation.current?.rebuild();map.current.triggerRepaint();},[layers.buildings,layers.terrain,ready]);
 useEffect(()=>{if(ready){layer.current.playing=playing;map.current.triggerRepaint();}},[playing,ready]);
 useEffect(()=>{if(ready)layer.current.setSettings(particleSettings);},[particleSettings,ready]);
 useEffect(()=>{if(ready)simulation.current.setEnabled(flowEnabled);},[flowEnabled,ready]);
 useEffect(()=>{document.title=`${location.name} · Wind Observatory`;},[location]);
 const toggle=k=>setLayers(v=>({...v,[k]:!v[k]}));
 const reset=()=>map.current?.flyTo({center:[location.longitude,location.latitude],zoom:14.1,pitch:58,bearing:-24});
 const stale=wind&&(now-wind.receivedAt>1200000||error);
 return <main><div ref={container} className="map" aria-label={`Interactive 3D map of ${location.name}`}/><div className="top-shade"/>

 <LocationSearch onSelect={place=>{setWind(null);simulation.current?.setWind(null);layer.current?.setWind(null);setLocation(place);}}/>
 <section className="place"><div className="eyebrow">{location.country||'LOCATION'}{location.admin1&&<><span>/</span>{location.admin1}</>}</div><h1 title={location.name}>{location.name}</h1><p>{coordinatesLabel(location.latitude,location.longitude)}</p></section>
 <section className="weather panel"><div className="panel-label"><Wind size={16}/> CURRENT WIND <button className={fetching?'spin icon':'icon'} aria-label="Refresh wind data" onClick={()=>refresh.current?.()} disabled={fetching}><RefreshCw size={14}/></button></div><div className="speed">{wind?wind.speed.toFixed(1):'—'}<span>m/s</span></div><div className="weather-detail"><span><ArrowUpRight size={18} style={{transform:`rotate(${(wind?.direction||0)+135}deg)`}}/>{wind?`From ${cardinal(wind.direction)} · ${wind.direction}°`:'Awaiting wind data'}</span><span>Gusts <b>{wind?wind.gust.toFixed(1):'—'}</b> m/s</span></div><div className="weather-bottom">{wind?`${stale?'Last reading · ':''}Model time ${wind.time.slice(11,16)} ${wind.timezone}`:'Fetching Open-Meteo'}<span>↗ Open-Meteo</span></div>{error&&<p role="status" className="error">{error} {wind?'Showing last reading.':'Particles paused until data returns.'}</p>}</section>
 <section className="layer-panel panel"><div className="panel-label">MAP LAYERS <span>03</span></div>{[["wind",Wind,"Wind particles",`${particleSettings.count.toLocaleString()} flowing particles`],["buildings",Layers3,"3D buildings","OpenStreetMap geometry"],["terrain",Mountain,"Terrain","Real elevation · 1×"]].map(([id,Icon,title,sub])=><div key={id} className="layer-row"><Icon size={19}/><span id={`layer-${id}`}>{title}<small>{sub}</small></span>{id==='wind'&&<button ref={settingsButton} className={`icon particle-settings-trigger ${settingsOpen?'active':''}`} aria-label="Wind particle settings" aria-expanded={settingsOpen} aria-controls="particle-settings" onClick={()=>setSettingsOpen(!settingsOpen)}><Settings2 size={17}/></button>}<button className={`switch ${layers[id]?'on':''}`} role="switch" aria-labelledby={`layer-${id}`} aria-checked={layers[id]} onClick={()=>toggle(id)}><i/></button></div>)}</section>
 {settingsOpen&&<ParticleSettings flowEnabled={flowEnabled} flowStatus={flowStatus} onToggleFlow={()=>setFlowEnabled(!flowEnabled)} onRebuild={()=>simulation.current?.rebuild()} settings={particleSettings} onChange={setParticleSettings} enabled={layers.wind} playing={playing} onToggleWind={()=>toggle('wind')} onTogglePlaying={()=>setPlaying(!playing)} onClose={()=>{setSettingsOpen(false);settingsButton.current?.focus();}}/>}
 <div className="map-controls panel"><button aria-label="Zoom in" onClick={()=>map.current?.zoomIn()}><Plus/></button><button aria-label="Zoom out" onClick={()=>map.current?.zoomOut()}><Minus/></button><hr/><button aria-label={`Reset view to ${location.name}`} onClick={reset}><LocateFixed size={20}/></button><button aria-label="Reset north" onClick={()=>map.current?.easeTo({bearing:0})}><Compass size={21} style={{transform:`rotate(${-bearing}deg)`}}/></button></div>
 <div className="view-panel panel"><div><span>VIEW ANGLE</span><b>{pitch}°</b></div><input type="range" min="0" max="75" value={pitch} aria-label="Map tilt" onChange={e=>map.current?.setPitch(Number(e.target.value))}/><button onClick={()=>map.current?.easeTo({bearing:map.current.getBearing()+45})}><RotateCcw size={14}/> Rotate 45°</button></div>
 <div className="compass-label" style={{transform:`rotate(${-bearing}deg)`}}><span>N</span><div>↑</div></div>
 <footer className="transport panel"><button className="play" aria-label={playing?'Pause particles':'Play particles'} onClick={()=>setPlaying(!playing)}>{playing?<Pause size={17}/>:<Play size={17}/>}</button><div className="transport-label"><b>{!layers.wind?'Wind hidden':!wind?'Awaiting data':flowEnabled&&flowStatus.phase!=='ready'?'Preparing obstacle flow':playing?'Wind in motion':'Animation paused'}</b><span>{flowEnabled?'Potential flow':'Uniform flow'} · {particleSettings.speed}× speed</span></div><div className="legend"><span className="trail"/>WIND FLOW</div><button className={`icon info ${info?'active':''}`} aria-label="About the visualization" aria-expanded={info} onClick={()=>setInfo(!info)}><Info size={19}/></button></footer>
 {flowEnabled&&<div className="flow-badge panel" role="status"><span>{flowStatus.message}</span>{flowStatus.phase==='ready'&&<small>2.56 km area · 20 m grid · simplified physics</small>}<button className="icon" aria-label="Rebuild airflow around map center" onClick={()=>simulation.current?.rebuild()}><RefreshCw size={15}/></button></div>}
 <div className="interaction-hint">Drag to pan <span>·</span> Scroll to zoom <span>·</span> Right-drag to rotate</div>
 {info&&<aside className="about panel"><b>A first look at the wind</b><p>Open-Meteo’s current modeled wind at 10 m, refreshed every 10 minutes. The reading supplies the model’s uniform incoming wind. Particles move at {particleSettings.speed}× visual speed. Height selects their release height; simulated trajectories can rise and fall.</p><p>OSM building footprints are extruded using available heights; missing heights use the tile provider’s estimate. Terrain uses Mapzen elevation. Obstacle mode solves steady, incompressible, inviscid potential flow in the outlined area. It enforces no flow through solid faces, using 20 m horizontal and 10 m vertical voxels. It omits turbulent wakes, viscosity, atmospheric stability and wind shear. Narrow gaps can disappear at this resolution; only buildings represented in OSM are included. This is an exploratory approximation, not a validated engineering forecast.</p><a href="https://doc.openfoam.com/2306/tools/processing/solvers/rtm/basic/potentialFoam/" target="_blank" rel="noreferrer">About potential-flow physics ↗</a><br/><a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Weather data: Open-Meteo ↗</a></aside>}
 {(!ready||mapError)&&<div className="map-status" role="status">{mapError||`Loading ${location.name}’s terrain and buildings…`}</div>}
 </main>;
}
createRoot(document.getElementById('root')).render(<App/>);
