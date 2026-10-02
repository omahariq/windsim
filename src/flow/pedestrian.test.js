import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verticalDomain} from './verticalDomain.js';
import {windProfileFactor} from './windProfile.js';
import {solveFlow,sampleVelocity,isFluid} from './solver.js';
test('Pedestrian domain preserves one-metre cells and bounds allocation',()=>{
 const d=verticalDomain([25,90],[25,140],{pedestrian:true});
 assert.equal(d.dz,1);assert.ok(d.z0+(d.nz-2)*d.dz>=140+57.5);assert.ok(d.nz<=384);
 assert.throws(()=>verticalDomain([0,500],[0,520],{pedestrian:true}),/too tall/);
});
test('Neutral profile matches ten-metre reference and slows pedestrian-height wind',()=>{
 assert.equal(windProfileFactor(10),1);assert.equal(windProfileFactor(0),0);
 assert.ok(windProfileFactor(1.5)>0&&windProfileFactor(1.5)<1);
 assert.ok(windProfileFactor(1.5,.3)<windProfileFactor(1.5,.03));
});
function scene(slope=false){
 const nx=24,ny=24,nz=40,dx=3,dz=1,z0=-1,ground=new Float32Array(nx*ny),solid=new Uint8Array(nx*ny*nz);
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
  const i=y*nx+x;ground[i]=slope?2*Math.exp(-((x-12)**2+(y-12)**2)/25):0;
  const roof=ground[i]+(x>=10&&x<14&&y>=10&&y<14?6:0);
  for(let z=0;z<nz;z++)if(z0+z<roof)solid[z*nx*ny+i]=1;
 }
 return {nx,ny,nz,dx,dz,z0,ground,solid,pedestrian:true,wind:{east:2,south:0},maxIterations:1000,tolerance:1e-5};
}
test('A six-metre building diverts pedestrian flow and prevents penetration',()=>{
 const f=solveFlow(scene());assert.ok(f.converged);assert.ok(f.maxDivergence<1e-4);
 assert.equal(isFluid(f,34,34,1.5),false);assert.equal(isFluid(f,25,25,1.5),true);
 assert.ok(sampleVelocity(f,28,28,1.5)[1]<-.01);
 assert.equal(f.fx[(2*24+11)*25+10],0);
});
test('Projection conserves mass for ground-relative shear over a hill',()=>{
 const f=solveFlow(scene(true));assert.ok(f.converged);assert.ok(f.maxDivergence<1e-4,`${f.maxDivergence}`);
});
