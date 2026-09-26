import {solveFlow} from './solver.js';
import {loadScene} from './sceneData.js';
self.onmessage=async({data})=>{
 try{
  self.postMessage({type:'loading',message:'Fetching terrain and OSM geometry…'});
  const scene=await loadScene(data);
  self.postMessage({type:'progress',iterations:0,relativeResidual:1,buildings:scene.buildingCount});
  const field=solveFlow({...data,...scene},progress=>self.postMessage({type:'progress',...progress,buildings:scene.buildingCount}));
  field.ground=scene.ground;field.buildingCount=scene.buildingCount;
  self.postMessage({type:'result',field},[field.solid.buffer,field.fx.buffer,field.fy.buffer,field.fz.buffer,field.ground.buffer]);
 }catch(error){self.postMessage({type:'error',message:error.name==='TimeoutError'?'Map data request timed out. Try rebuilding.':error.message});}
};
