import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verticalDomain} from './verticalDomain.js';
import {solveFlow} from './solver.js';
test('Flat sites retain 10 m cells and fit the full release-height range',()=>{
 const d=verticalDomain([0,20],[0,40]);assert.equal(d.dz,10);assert.equal(d.nz,48);assert.ok(d.z0+46*d.dz>=420);
});
test('Steep terrain and tall roofs fit with overhead clearance without adding cells',()=>{
 for(const [ground,roof] of [[[0,1100],[0,1300]],[[-430,2400],[-430,3100]],[[2500,2520],[2500,3500]]]){
  const d=verticalDomain(ground,roof);assert.equal(d.nz,48);assert.ok(d.z0<Math.min(...ground));
  assert.ok(d.z0+46*d.dz>=Math.max(Math.max(...ground)+300,Math.max(...roof))+100);
 }
});
test('Adaptive anisotropic grid retains no-penetration and mass conservation',()=>{
 const n=20,dz=30,solid=new Uint8Array(n**3);
 for(let z=0;z<8;z++)for(let y=8;y<12;y++)for(let x=8;x<12;x++)solid[(z*n+y)*n+x]=1;
 const f=solveFlow({nx:n,ny:n,nz:n,dx:20,dz,solid,wind:{east:2,south:1},tolerance:1e-5});
 assert.ok(f.converged);assert.ok(f.maxDivergence<1e-4);assert.equal(f.fx[(4*n+9)*(n+1)+8],0);
});
