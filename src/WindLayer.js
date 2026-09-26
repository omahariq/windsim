import {MercatorCoordinate} from 'maplibre-gl';
import {CENTER,windVector} from './wind';
export const DEFAULT_PARTICLE_SETTINGS = {count:5000, trail:1, brightness:78, speed:12, color:'#ffc43b'};
const SEGMENTS=8, EXTENT=4500;
const vertex=`attribute vec3 a_position; attribute float a_alpha;
uniform mat4 u_matrix; uniform vec3 u_origin; uniform float u_scale;
varying float v_alpha;
void main(){gl_Position=u_matrix*vec4(u_origin+a_position*u_scale,1.0);v_alpha=a_alpha;}`;
const fragment=`precision mediump float; varying float v_alpha; uniform vec3 u_color; void main(){gl_FragColor=vec4(u_color,v_alpha);}`;
export class WindLayer {
 constructor(){this.id='wind-particles';this.type='custom';this.renderingMode='3d';this.enabled=true;this.playing=true;this.wind=null;this.last=0;this.particles=[];this.settings={...DEFAULT_PARTICLE_SETTINGS};this.vertices=new Float32Array(this.settings.count*SEGMENTS*2*4);}
 onAdd(map,gl){
  this.map=map;this.origin=MercatorCoordinate.fromLngLat(CENTER);this.scale=this.origin.meterInMercatorCoordinateUnits();
  const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
  const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);
  this.program=gl.createProgram();gl.attachShader(this.program,vs);gl.attachShader(this.program,fs);gl.linkProgram(this.program);gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(this.program));
  this.buffer=gl.createBuffer();this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
  for(const [name,size,offset] of [['a_position',3,0],['a_alpha',1,12]]){const loc=gl.getAttribLocation(this.program,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,16,offset);}
  gl.bindVertexArray(null);this.uniforms=Object.fromEntries(['u_matrix','u_origin','u_scale','u_color'].map(n=>[n,gl.getUniformLocation(this.program,n)]));
  for(let i=0;i<this.settings.count;i++)this.particles.push(this.spawn(true));
 }
 spawn(initial=false){const x=(Math.random()-.5)*EXTENT*2,y=(Math.random()-.5)*EXTENT*2;const ll=new MercatorCoordinate(this.origin.x+x*this.scale,this.origin.y+y*this.scale).toLngLat();return {x,y,z:(this.map.queryTerrainElevation(ll)||0)+60+Math.random()*100,life:initial?Math.random()*100:0,max:70+Math.random()*60};}
 setSettings(settings){
  const previous=this.settings.count;this.settings={...settings};
  if(previous!==settings.count){
   this.vertices=new Float32Array(settings.count*SEGMENTS*2*4);
   while(this.particles.length<settings.count)this.particles.push(this.spawn(true));
   this.particles.length=settings.count;
  }
  this.map?.triggerRepaint();
 }
 setWind(wind){this.wind=wind;this.map?.triggerRepaint();}
 render(gl,args){
  const now=performance.now(),dt=this.last?Math.min((now-this.last)/1000,.05):0;this.last=now;
  if(!this.enabled||!this.wind)return;
  const v=windVector(this.wind.speed,this.wind.direction);let k=0;
  for(let i=0;i<this.settings.count;i++){
   let p=this.particles[i];if(this.playing){p.x+=v.east*dt*this.settings.speed;p.y+=v.south*dt*this.settings.speed;p.life+=dt;if(p.life>p.max||Math.abs(p.x)>EXTENT||Math.abs(p.y)>EXTENT)p=this.particles[i]=this.spawn();}
   const fade=Math.min(1,p.life/3,(p.max-p.life)/3);
   for(let s=0;s<SEGMENTS;s++)for(let e=0;e<2;e++){
    const t=(s+e)/SEGMENTS,trail=(1-t)*36*this.settings.trail;
    this.vertices[k++]=p.x-v.east*trail;this.vertices[k++]=p.y-v.south*trail;this.vertices[k++]=p.z;this.vertices[k++]=t*fade*this.settings.brightness/100;
   }
  }
  gl.useProgram(this.program);gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,this.vertices,gl.DYNAMIC_DRAW);
  gl.uniformMatrix4fv(this.uniforms.u_matrix,false,args.defaultProjectionData.mainMatrix);gl.uniform3f(this.uniforms.u_origin,this.origin.x,this.origin.y,0);gl.uniform1f(this.uniforms.u_scale,this.scale);
  const color=this.settings.color;
  gl.uniform3f(this.uniforms.u_color,...[1,3,5].map(offset=>parseInt(color.slice(offset,offset+2),16)/255));
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(false);gl.disable(gl.CULL_FACE);gl.lineWidth(1);
  gl.drawArrays(gl.LINES,0,this.settings.count*SEGMENTS*2);gl.bindVertexArray(null);
  if(this.playing&&!document.hidden)this.map.triggerRepaint();
 }
 onRemove(map,gl){gl.deleteBuffer(this.buffer);gl.deleteVertexArray(this.vao);gl.deleteProgram(this.program);}
}
