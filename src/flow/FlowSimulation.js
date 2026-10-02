import {MercatorCoordinate} from 'maplibre-gl';
import {domainGrid} from './domain.js';
import {windVector} from '../wind';

export class FlowSimulation {
 constructor(map,layer,onStatus){this.map=map;this.layer=layer;this.onStatus=onStatus;this.enabled=true;this.pedestrian=true;this.roughness=.1;this.wind=null;this.serial=0;this.worker=null;this.timer=null;this.destroyed=false;}
 setWind(wind){this.wind=wind;if(wind)this.rebuild();else{this.cancel();this.clearBoundary();this.layer.setFlow(null,this.enabled);if(this.enabled)this.onStatus({phase:'loading',message:'Waiting for local wind data…'});}}
 setPedestrian(enabled){this.pedestrian=enabled;this.rebuild();}
 setRoughness(value){this.roughness=value;this.rebuild();}
 setEnabled(enabled){this.enabled=enabled;if(enabled)this.rebuild();else{this.cancel();this.layer.setFlow(null,false);this.onStatus({phase:'off',message:'Uniform wind'});this.clearBoundary();}}
 cancel(){this.serial++;clearTimeout(this.timer);this.worker?.terminate();this.worker=null;}
 rebuild(){
  if(!this.enabled||!this.wind||this.destroyed)return;
  this.cancel();const serial=this.serial;this.layer.setFlow(null,true);this.clearBoundary();this.onStatus({phase:'loading',message:'Loading terrain and buildings…'});
  this.timer=setTimeout(()=>{if(serial===this.serial&&!this.destroyed)this.prepare(serial);},350);
 }
 fail(message){this.layer.setFlow(null,true);this.onStatus({phase:'error',message});}
 prepare(serial){
  const origin=this.layer.origin,scale=this.layer.scale,center=MercatorCoordinate.fromLngLat(this.map.getCenter());
  const pedestrian=this.pedestrian,{nx,ny,dx,dz,nz}=domainGrid(pedestrian);
  const x0=(center.x-origin.x)/scale-nx*dx/2,y0=(center.y-origin.y)/scale-ny*dx/2;
  const corners=[[x0,y0],[x0+nx*dx,y0],[x0+nx*dx,y0+ny*dx],[x0,y0+ny*dx],[x0,y0]].map(([x,y])=>new MercatorCoordinate(origin.x+x*scale,origin.y+y*scale).toLngLat().toArray());
  this.drawBoundary(corners);
  let worker;
  try{worker=this.worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});}catch{this.fail('Background airflow calculation is unavailable in this browser.');return;}
  worker.onerror=()=>{if(serial===this.serial){worker.terminate();this.fail('Airflow calculation failed. Try rebuilding.');}};
  worker.onmessage=({data})=>{
   if(serial!==this.serial||this.destroyed)return;
   if(data.type==='loading')this.onStatus({phase:'loading',message:data.message});
   else if(data.type==='progress')this.onStatus({phase:'solving',message:`Solving airflow · ${data.iterations} iterations`,buildings:data.buildings});
   else if(data.type==='error'){worker.terminate();this.fail(data.message);}
   else if(data.type==='result'){
    worker.terminate();this.worker=null;
    if(!data.field.converged){this.fail(`Flow did not converge (residual ${data.field.relativeResidual.toExponential(1)}). Try a less dense area.`);return;}
    this.layer.setFlow(data.field,true);
    this.onStatus({phase:'ready',message:pedestrian?'Pedestrian airflow estimate':'3D potential flow',buildings:data.field.buildingCount,residual:data.field.relativeResidual,iterations:data.field.iterations,dx:data.field.dx,pedestrian,dz:data.field.dz,height:data.field.nz*data.field.dz});
   }
  };
  worker.postMessage({nx,ny,nz,dx,dz,pedestrian,roughness:this.roughness,maxIterations:pedestrian?2000:500,x0,y0,origin:{x:origin.x,y:origin.y},scale,releaseHeight:this.layer.settings.height,terrain:!!this.map.getTerrain(),buildings:this.map.getLayoutProperty('buildings','visibility')!=='none',wind:windVector(this.wind.speed,this.wind.direction)});
 }
 drawBoundary(coordinates){
  const data={type:'Feature',properties:{},geometry:{type:'LineString',coordinates}};
  if(this.map.getSource('flow-domain'))this.map.getSource('flow-domain').setData(data);
  else{this.map.addSource('flow-domain',{type:'geojson',data});this.map.addLayer({id:'flow-domain',type:'line',source:'flow-domain',paint:{'line-color':'#aaaaaa','line-width':1,'line-opacity':.55,'line-dasharray':[4,4]}});}
 }
 clearBoundary(){if(this.map.getSource('flow-domain'))this.map.getSource('flow-domain').setData({type:'FeatureCollection',features:[]});}
 destroy(){this.destroyed=true;this.cancel();}
}
