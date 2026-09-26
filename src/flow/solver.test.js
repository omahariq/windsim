import {test} from 'node:test';
import assert from 'node:assert/strict';
import {solveFlow,sampleVelocity,isFluid,advect,segmentIsFluid} from './solver.js';
import {rasterizeBuildings} from './geometry.js';
const grid=(n=25)=>({nx:n,ny:n,nz:n,dx:1,dz:1,solid:new Uint8Array(n**3),wind:{east:2,south:0}});
test('Unobstructed domain exactly preserves uniform inflow and calm flow',()=>{
 const g=grid();let f=solveFlow(g);assert.deepEqual(sampleVelocity(f,12,12,12),[2,0,0]);assert.equal(f.maxDivergence,0);
 f=solveFlow({...g,wind:{east:0,south:0}});assert.deepEqual(sampleVelocity(f,12,12,12),[0,0,0]);
});
test('A solid building diverts flow sideways and upward while conserving mass',()=>{
 const g=grid(33),n=g.nx;
 for(let z=0;z<14;z++)for(let y=13;y<20;y++)for(let x=13;x<20;x++)g.solid[(z*n+y)*n+x]=1;
 const f=solveFlow({...g,tolerance:1e-5});assert.ok(f.converged);assert.ok(f.maxDivergence<1e-4,`divergence ${f.maxDivergence}`);
 assert.ok(sampleVelocity(f,12,12,8)[1]<-.01,'flow should divert north of the obstruction');
 assert.ok(sampleVelocity(f,12,16,15)[2]>.01,'flow should rise over the roof');
 assert.equal(f.fx[(8*n+16)*(n+1)+13],0,'normal flux into the west wall must be zero');
 assert.equal(isFluid(f,16,16,8),false);
 let p=[5,11,8];for(let i=0;i<200;i++){const next=advect(f,p,.03);if(!next)break;p=next;assert.ok(isFluid(f,...p));}assert.ok(p[1]<11,'tracer follows the deflected field');
});
test('A hill produces upward wind on its windward slope',()=>{
 const g=grid(33),n=g.nx;
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){const h=7*Math.exp(-((x-16)**2+(y-16)**2)/45);for(let z=0;z<n;z++)if(z<h)g.solid[(z*n+y)*n+x]=1;}
 const f=solveFlow(g);assert.ok(f.converged);assert.ok(sampleVelocity(f,10,16,7)[2]>.05);assert.ok(f.maxDivergence<.001);
});
test('Footprints, narrow walls, and courtyard holes rasterize conservatively',()=>{
 const g={nx:10,ny:10,dx:1,x0:0,y0:0};
 const rings=[[[1,1],[9,1],[9,9],[1,9],[1,1]],[[3,3],[7,3],[7,7],[3,7],[3,3]]];
 const {roof}=rasterizeBuildings([{rings,height:20}],new Float32Array(100),g);
 assert.equal(roof[5*10+5],0);assert.equal(roof[2*10+2],20);
 const thin=rasterizeBuildings([{rings:[[[1.1,1],[1.2,1],[1.2,8],[1.1,8],[1.1,1]]],height:10}],new Float32Array(100),g);assert.equal(thin.roof[4*10+1],10);
});

test('Trail chords cannot cut through solid cells and backward integration is reversible',()=>{
 const g=grid();g.solid[(12*25+12)*25+12]=1;const f=solveFlow(g);
 assert.equal(segmentIsFluid(f,[10,12.5,12.5],[14,12.5,12.5]),false);
 const free=solveFlow(grid()),p=[10,10,10],q=advect(free,p,2),back=advect(free,q,-2);
 assert.ok(back.every((v,i)=>Math.abs(v-p[i])<1e-6));
});
