import {VectorTile} from '@mapbox/vector-tile';
import Pbf from 'pbf';
import {rasterizeBuildings} from './geometry.js';
const mercator=([lng,lat])=>[(lng+180)/360,(1-Math.log(Math.tan(Math.PI/4+lat*Math.PI/360))/Math.PI)/2];
async function checkedFetch(url){const response=await fetch(url,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error(`Map data request failed (${response.status}). Try rebuilding.`);return response;}
function tileRange(g,zoom){const n=2**zoom;return [Math.floor((g.origin.x+g.x0*g.scale)*n),Math.floor((g.origin.y+g.y0*g.scale)*n),Math.floor((g.origin.x+(g.x0+g.nx*g.dx)*g.scale)*n),Math.floor((g.origin.y+(g.y0+g.ny*g.dx)*g.scale)*n)];}
async function tileBatch(g,zoom,load){const [ax,ay,bx,by]=tileRange(g,zoom),jobs=[];for(let y=ay;y<=by;y++)for(let x=ax;x<=bx;x++)jobs.push(load(x,y,zoom));return Promise.all(jobs);}
async function loadGround(g){
 const ground=new Float32Array(g.nx*g.ny);if(!g.terrain)return ground;
 const tiles=new Map();
 await tileBatch(g,13,async(x,y,z)=>{
  const response=await checkedFetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${((x%2**z)+2**z)%2**z}/${y}.png`);
  const bitmap=await createImageBitmap(await response.blob(),{colorSpaceConversion:'none',premultiplyAlpha:'none'});
  const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),context=canvas.getContext('2d',{willReadFrequently:true});
  if(!context)throw new Error('Terrain image decoding is unavailable in this browser.');
  context.drawImage(bitmap,0,0);const image=context.getImageData(0,0,bitmap.width,bitmap.height);bitmap.close();tiles.set(`${x}/${y}`,image);
 });
 for(let y=0;y<g.ny;y++)for(let x=0;x<g.nx;x++){
  const mx=(g.origin.x+(g.x0+(x+.5)*g.dx)*g.scale)*8192,my=(g.origin.y+(g.y0+(y+.5)*g.dx)*g.scale)*8192,tx=Math.floor(mx),ty=Math.floor(my),tile=tiles.get(`${tx}/${ty}`);
  const px=Math.min(tile.width-1,Math.floor((mx-tx)*tile.width)),py=Math.min(tile.height-1,Math.floor((my-ty)*tile.height)),i=(py*tile.width+px)*4;
  ground[y*g.nx+x]=tile.data[i]*256+tile.data[i+1]+tile.data[i+2]/256-32768;
 }
 return ground;
}
async function loadBuildings(g){
 if(!g.buildings)return [];
 const tilejson=await(await checkedFetch('https://tiles.openfreemap.org/planet')).json(),buildings=[];
 if(!tilejson.tiles?.[0])throw new Error('Building tiles are unavailable.');
 await tileBatch(g,14,async(x,y,z)=>{
  const url=tilejson.tiles[0].replace('{x}',((x%2**z)+2**z)%2**z).replace('{y}',y).replace('{z}',z);
  const tile=new VectorTile(new Pbf(new Uint8Array(await(await checkedFetch(url)).arrayBuffer()))),layer=tile.layers.building;
  if(!layer)return;
  for(let i=0;i<layer.length;i++){
   const f=layer.feature(i),feature=f.toGeoJSON(x,y,z),polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.type==='MultiPolygon'?feature.geometry.coordinates:[];
   for(const polygon of polygons)buildings.push({height:Math.max(0,Number(f.properties.render_height)||9),rings:polygon.map(r=>r.map(ll=>{const m=mercator(ll);return [(m[0]-g.origin.x)/g.scale,(m[1]-g.origin.y)/g.scale];}))});
  }
 });
 return buildings;
}
export async function loadScene(g){
 const [ground,buildings]=await Promise.all([loadGround(g),loadBuildings(g)]),{roof,count}=rasterizeBuildings(buildings,ground,g);
 let min=Infinity,max=-Infinity;for(const value of ground){min=Math.min(min,value);max=Math.max(max,value);}
 const z0=Math.floor(min/g.dz)*g.dz-g.dz;
 if(max+g.releaseHeight>z0+(g.nz-2)*g.dz)throw new Error('This terrain exceeds the model height. Choose a lower area.');
 const solid=new Uint8Array(g.nx*g.ny*g.nz);
 for(let z=0;z<g.nz;z++)for(let i=0;i<g.nx*g.ny;i++)solid[z*g.nx*g.ny+i]=z0+z*g.dz<roof[i]?1:0;
 return {ground,solid,z0,buildingCount:count};
}
