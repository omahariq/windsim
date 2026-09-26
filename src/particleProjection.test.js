import {test} from 'node:test';
import assert from 'node:assert/strict';
import {localParticleMatrix} from './particleProjection.js';

test('Local projection preserves small steps that collapse in world float32 coordinates',()=>{
 const origin={x:.782375,y:.49188},scale=1/40000000;
 const matrix=[1/scale,0,0,0,0,1/scale,0,0,0,0,1/scale,0,-origin.x/scale,-origin.y/scale,0,1];
 const local=localParticleMatrix(matrix,origin,scale);
 const project=x=>Math.fround(local[0]*Math.fround(x)+local[12]);
 assert.equal(Math.fround(origin.x+100*scale),Math.fround(origin.x+100.01*scale));
 assert.ok(Math.abs((project(100.01)-project(100))-.01)<.00001);
});
test('Local transform matches world projection including perspective',()=>{
 const m=[2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17],o={x:.7,y:.4},scale=.002,p=[120,-80,70];
 const local=localParticleMatrix(m,o,scale);
 for(let r=0;r<4;r++){
  const expected=m[r]*(o.x+p[0]*scale)+m[r+4]*(o.y+p[1]*scale)+m[r+8]*p[2]*scale+m[r+12];
  const actual=local[r]*p[0]+local[r+4]*p[1]+local[r+8]*p[2]+local[r+12];
  assert.ok(Math.abs(expected-actual)<1e-5);
 }
});
