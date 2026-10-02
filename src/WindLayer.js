import {MercatorCoordinate} from 'maplibre-gl';
import {CENTER,windVector} from './wind';
import {localParticleMatrix} from './particleProjection';
import {advect,isFluid,segmentIsFluid} from './flow/solver';
export const DEFAULT_PARTICLE_SETTINGS = {count:7000, trail:2.5, brightness:78, speed:12, height:1.5, color:'#ffc43b'};
const SEGMENTS=8, EXTENT=4500;
const vertex=`attribute vec3 a_position; attribute float a_alpha;
uniform mat4 u_matrix;
varying float v_alpha;
void main(){gl_Position=u_matrix*vec4(a_position,1.0);v_alpha=a_alpha;}`;
const fragment=`precision mediump float; varying float v_alpha; uniform vec3 u_color; void main(){gl_FragColor=vec4(u_color,v_alpha);}`;
export class WindLayer {
 constructor(){this.id='wind-particles';this.type='custom';this.renderingMode='3d';this.enabled=true;this.playing=true;this.wind=null;this.last=0;this.particles=[];this.flow=null;this.flowEnabled=false;this.localMatrix=new Float32Array(16);this.settings={...DEFAULT_PARTICLE_SETTINGS};this.vertices=new Float32Array(this.settings.count*SEGMENTS*2*4);}
 onAdd(map,gl){
  this.map=map;this.origin=MercatorCoordinate.fromLngLat(CENTER);this.scale=this.origin.meterInMercatorCoordinateUnits();
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
  const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);
  this.program=gl.createProgram();gl.attachShader(this.program,vs);gl.attachShader(this.program,fs);gl.linkProgram(this.program);gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(this.program));
  this.buffer=gl.createBuffer();this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
  for(const [name,size,offset] of [['a_position',3,0],['a_alpha',1,12]]){const loc=gl.getAttribLocation(this.program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,16,offset);}
  gl.bindVertexArray(null);this.uniforms=Object.fromEntries(['u_matrix','u_color'].map(n=>[n,gl.getUniformLocation(this.program,n)]));
  for(let i=0;i<this.settings.count;i++)this.particles.push(this.spawn(true));
 }
 setLocation(center){
  this.origin=MercatorCoordinate.fromLngLat(center);this.scale=this.origin.meterInMercatorCoordinateUnits();
  this.wind=null;this.setFlow(null,this.flowEnabled);
 }
 groundAt(x,y){
  if(!this.map.getTerrain())return 0;
  const ll=new MercatorCoordinate(this.origin.x+x*this.scale,this.origin.y+y*this.scale).toLngLat();
  return this.map.queryTerrainElevation(ll)||0;
 }
 spawn(initial=false){
  const max=70+Math.random()*60;
  if(this.flowEnabled&&this.flow){
   const f=this.flow;
   for(let attempt=0;attempt<80;attempt++){
    const ix=2+Math.floor(Math.random()*(f.nx-4)),iy=2+Math.floor(Math.random()*(f.ny-4));
    const x=f.x0+(ix+.5)*f.dx,y=f.y0+(iy+.5)*f.dx,ground=f.ground[iy*f.nx+ix];
    // Ground voxels round terrain upward; seed above that numerical surface.
    const z=Math.max(ground+this.settings.height,f.z0+Math.ceil((ground-f.z0)/f.dz)*f.dz+.05);
    if(!isFluid(f,x,y,z))continue;
    const history=new Float32Array((SEGMENTS+1)*3);let back=[x,y,z];history.set(back,SEGMENTS*3);
    for(let i=SEGMENTS-1;i>=0;i--){back=advect(f,back,-36*this.settings.trail/SEGMENTS)||back;history.set(back,i*3);}
    return {x,y,z,ground,max,life:initial?Math.random()*max:0,history,trailAge:0};
   }
   return {x:0,y:0,z:0,max,life:0,invalid:true};
  }
  const x=(Math.random()-.5)*EXTENT*2,y=(Math.random()-.5)*EXTENT*2,ground=this.groundAt(x,y);
  return {x,y,ground,targetGround:ground,nextGroundSample:performance.now()+Math.random()*1000,life:initial?Math.random()*max:0,max};
 }
 setFlow(field,enabled){
  this.flow=field;this.flowEnabled=enabled;
  if(this.map){this.particles=Array.from({length:this.settings.count},()=>this.spawn(true));this.map.triggerRepaint();}
 }
 renderFlowParticle(p,dt){
  if(p.invalid)return;
  if(this.playing){
   const next=advect(this.flow,[p.x,p.y,p.z],dt*this.settings.speed);
   if(!next){p.invalid=true;return;}
   [p.x,p.y,p.z]=next;p.life+=dt;
   // Store an actual advected path, not a decorative curve or a straight
   // segment that cuts through an obstacle. Sampling interval controls length.
   p.trailAge+=dt*this.settings.speed;
   const interval=36*this.settings.trail/SEGMENTS;
   if(p.trailAge>=interval){p.history.copyWithin(0,3);p.history.set(next,SEGMENTS*3);p.trailAge=0;}
   else p.history.set(next,SEGMENTS*3);
  }
 }

 setSettings(settings){
  const previous=this.settings.count,heightChanged=this.settings.height!==settings.height;this.settings={...settings};
  if(previous!==settings.count){
   this.vertices=new Float32Array(settings.count*SEGMENTS*2*4);
   while(this.particles.length<settings.count)this.particles.push(this.spawn(true));
   this.particles.length=settings.count;
  }
  if(this.flowEnabled&&this.flow&&heightChanged)this.particles=Array.from({length:settings.count},()=>this.spawn(true));
  this.map?.triggerRepaint();
 }
 setWind(wind){this.wind=wind;this.map?.triggerRepaint();}
 render(gl,args){
  const now=performance.now(),dt=this.last?Math.min((now-this.last)/1000,.05):0;this.last=now;
  if(!this.enabled||!this.wind||(this.flowEnabled&&!this.flow))return;
  const v=windVector(this.wind.speed,this.wind.direction);let k=0;
  for(let i=0;i<this.settings.count;i++){
   let p=this.particles[i];
   if(this.flowEnabled){
    this.renderFlowParticle(p,dt);
    if(p.invalid||p.life>p.max)p=this.particles[i]=this.spawn();
    const fade=p.invalid?0:Math.max(0,Math.min(1,p.life/3,(p.max-p.life)/3));
    for(let s=0;s<SEGMENTS;s++){
     const clear=p.history&&segmentIsFluid(this.flow,Array.from(p.history.subarray(s*3,s*3+3)),Array.from(p.history.subarray((s+1)*3,(s+1)*3+3)));
     for(let e=0;e<2;e++){
     const t=(s+e)/SEGMENTS,index=(s+e)*3;
     this.vertices[k++]=p.history?.[index]??0;this.vertices[k++]=p.history?.[index+1]??0;this.vertices[k++]=p.history?.[index+2]??0;this.vertices[k++]=clear?t*fade*this.settings.brightness/100:0;
    }}
    continue;
   }
   if(this.playing){p.x+=v.east*dt*this.settings.speed;p.y+=v.south*dt*this.settings.speed;p.life+=dt;if(p.life>p.max||Math.abs(p.x)>EXTENT||Math.abs(p.y)>EXTENT)p=this.particles[i]=this.spawn();}
   // Follow the terrain smoothly, staggering elevation queries across frames.
   if(now>=p.nextGroundSample){p.targetGround=this.groundAt(p.x,p.y);p.nextGroundSample=now+1000;}
   if(!this.map.getTerrain())p.ground=p.targetGround=0;
   else p.ground+= (p.targetGround-p.ground)*(this.playing?1-Math.exp(-dt*5):1);
   const z=p.ground+this.settings.height;
   const fade=Math.min(1,p.life/3,(p.max-p.life)/3);
   for(let s=0;s<SEGMENTS;s++)for(let e=0;e<2;e++){
    const t=(s+e)/SEGMENTS,trail=(1-t)*36*this.settings.trail;
    this.vertices[k++]=p.x-v.east*trail;this.vertices[k++]=p.y-v.south*trail;this.vertices[k++]=z;this.vertices[k++]=t*fade*this.settings.brightness/100;
   }
  }
  gl.useProgram(this.program);gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,this.vertices,gl.DYNAMIC_DRAW);
  gl.uniformMatrix4fv(this.uniforms.u_matrix,false,localParticleMatrix(args.defaultProjectionData.mainMatrix,this.origin,this.scale,this.localMatrix));
  const color=this.settings.color;
  gl.uniform3f(this.uniforms.u_color,...[1,3,5].map(offset=>parseInt(color.slice(offset,offset+2),16)/255));
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(false);gl.disable(gl.CULL_FACE);gl.lineWidth(1);
  gl.drawArrays(gl.LINES,0,this.settings.count*SEGMENTS*2);gl.bindVertexArray(null);
  if(this.playing&&!document.hidden)this.map.triggerRepaint();
 }
 onRemove(map,gl){gl.deleteBuffer(this.buffer);gl.deleteVertexArray(this.vao);gl.deleteProgram(this.program);}
}
