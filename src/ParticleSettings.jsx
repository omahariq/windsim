import {useEffect,useRef} from 'react';
import {X,RotateCcw,Settings2} from 'lucide-react';
import {DEFAULT_PARTICLE_SETTINGS} from './WindLayer';

export function ParticleSettings({settings,onChange,enabled,playing,onToggleWind,onTogglePlaying,onClose}){
 const closeButton=useRef();
 useEffect(()=>{closeButton.current?.focus();},[]);
 useEffect(()=>{const escape=e=>{if(e.key==='Escape'){e.preventDefault();onClose();}};document.addEventListener('keydown',escape);return()=>document.removeEventListener('keydown',escape);},[onClose]);
 const controls=[
  {key:'count',label:'Particle count',min:1000,max:15000,step:1000,value:settings.count.toLocaleString()},
  {key:'trail',label:'Trail length',min:.25,max:4,step:.25,value:`${settings.trail}×`},
  {key:'brightness',label:'Brightness',min:10,max:100,step:5,value:`${settings.brightness}%`},
  {key:'speed',label:'Animation speed',min:1,max:30,step:1,value:`${settings.speed}×`},
 ];
 return <aside id="particle-settings" className="particle-settings panel" role="dialog" aria-modal="false" aria-labelledby="particle-settings-title">
  <div className="settings-heading"><Settings2 size={18}/><h2 id="particle-settings-title">Wind particles</h2><button ref={closeButton} className="icon" aria-label="Close particle settings" onClick={onClose}><X size={19}/></button></div>
  <div className="settings-toggle"><span id="particles-visible-label">Show particles</span><button className={`switch ${enabled?'on':''}`} role="switch" aria-labelledby="particles-visible-label" aria-checked={enabled} onClick={onToggleWind}><i/></button></div>
  <div className="settings-toggle"><span id="particles-motion-label">Animate particles</span><button className={`switch ${playing?'on':''}`} role="switch" aria-labelledby="particles-motion-label" aria-checked={playing} onClick={onTogglePlaying}><i/></button></div>
  {controls.map(control=><label className="particle-setting" key={control.key} htmlFor={`particle-${control.key}`}><span>{control.label}<output>{control.value}</output></span><input id={`particle-${control.key}`} type="range" min={control.min} max={control.max} step={control.step} value={settings[control.key]} onChange={e=>onChange({...settings,[control.key]:Number(e.target.value)})}/></label>)}
  <p>Appearance controls only. Wind direction and measured speed still come from live data.</p>
  <button className="settings-reset" onClick={()=>onChange({...DEFAULT_PARTICLE_SETTINGS})}><RotateCcw size={14}/> Reset appearance</button>
 </aside>;
}
