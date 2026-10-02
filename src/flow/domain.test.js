import {test} from 'node:test';
import assert from 'node:assert/strict';
import {domainGrid} from './domain.js';
test('Both detail modes preserve a 1000 m by 1000 m simulation area',()=>{
 for(const mode of [true,false]){
  const g=domainGrid(mode);assert.equal(g.nx*g.dx,1000);assert.equal(g.ny*g.dx,1000);
 }
 assert.equal(domainGrid(true).dz,1);
});
