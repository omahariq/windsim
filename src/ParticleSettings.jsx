import {useEffect,useRef} from 'react';
import {X,RotateCcw,Settings2} from 'lucide-react';
import {DEFAULT_PARTICLE_SETTINGS} from './WindLayer';

export function ParticleSettings({settings,onChange,enabled,playing,onToggleWind,onTogglePlaying,onClose,flowEnabled,flowStatus,onToggleFlow,onRebuild}){
 const closeButton=useRef();
 useEffect(()=>{closeButton.current?.focus();},[]);
 useEffect(()=>{const escape=e=>{if(e.key==='Escape'){e.preventDefault();onClose();}};document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape);},[onClose]);
 const controls=[
  {key:'height',label:flowEnabled?'Release height above ground':'Height above ground',min:2,max:300,step:1,value:`${settings.height} m`},
  {key:'count',label:'Particle count',min:1000,max:15000,step:1000,value:settings.count.toLocaleString()},
  {key:'trail',label:'Trail length',min:.25,max:4,step:.25,value:`${settings.trail}×`},
  {key:'brightness',label:'Brightness',min:10,max:100,step:1,value:`${settings.brightness}%`},
  {key:'speed',label:'Animation speed',min:1,max:30,step:1,value:`${settings.speed}×`},
 ];
 return <aside id="particle-settings" className="particle-settings panel" role="dialog" aria-modal="false" aria-labelledby="particle-settings-title">
  <div className="settings-heading"><Settings2 size={18}/><h2 id="particle-settings-title">Wind particles</h2><button ref={closeButton} className="icon" aria-label="Close particle settings" onClick={onClose}><X size={19}/></button></div>
  <div className="settings-toggle"><span id="particles-visible-label">Show particles</span><button className={`switch ${enabled?'on':''}`} role="switch" aria-labelledby="particles-visible-label" aria-checked={enabled} onClick={onToggleWind}><i/></button></div>
  <div className="settings-toggle"><span id="particles-motion-label">Animate particles</span><button className={`switch ${playing?'on':''}`} role="switch" aria-labelledby="particles-motion-label" aria-checked={playing} onClick={onTogglePlaying}><i/></button></div>
  <div className="settings-toggle"><span id="obstacle-flow-label">Flow around obstacles</span><button className={`switch ${flowEnabled?'on':''}`} role="switch" aria-labelledby="obstacle-flow-label" aria-checked={flowEnabled} onClick={onToggleFlow}><i/></button></div>
  {flowEnabled&&<div className="flow-details"><span>{flowStatus.message}</span>{flowStatus.phase==='ready'&&<small>{flowStatus.buildings} footprint parts · {flowStatus.iterations} iterations<br/>Residual {flowStatus.residual.toExponential(1)} · 20 m × 10 m grid</small>}<button className="settings-reset" onClick={onRebuild}><RotateCcw size={14}/> Rebuild around map center</button></div>}
  <label className="particle-color" htmlFor="particle-color"><span>Particle color</span><span className="color-picker">Choose <code>{settings.color.toUpperCase()}</code><input id="particle-color" type="color" value={settings.color} onChange={e=>onChange({...settings,color:e.target.value})}/></span></label>
  {controls.map(control=><label className="particle-setting" key={control.key} htmlFor={`particle-${control.key}`}><span>{control.label}<output>{control.value}</output></span><input id={`particle-${control.key}`} type="range" min={control.min} max={control.max} step={control.step} value={settings[control.key]} onChange={e=>onChange({...settings,[control.key]:Number(e.target.value)})}/></label>)}
  <p>{flowEnabled?'Release height seeds the tracers; the flow can carry them up or down. Free-slip potential flow omits turbulence and wakes. Buildings and terrain toggles also change the modeled obstacles.':'Height changes the display only. Wind data remains modeled at 10 m.'}</p>
  <button className="settings-reset" onClick={()=>onChange({...DEFAULT_PARTICLE_SETTINGS})}><RotateCcw size={14}/> Reset appearance</button>
 </aside>;
}
