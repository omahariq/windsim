import {test} from 'node:test';
import assert from 'node:assert/strict';
import {windVector,cardinal} from './wind.js';
for(const [direction,east,south] of [[0,0,5],[90,-5,0],[180,0,-5],[270,5,0]])test(`Wind FROM ${direction} flows in the correct map direction`,()=>{const v=windVector(5,direction);assert.ok(Math.abs(v.east-east)<1e-9);assert.ok(Math.abs(v.south-south)<1e-9);});
test('Calm wind remains still',()=>{const v=windVector(0,230);assert.equal(Math.hypot(v.east,v.south),0);});
test('Bearing wraps north',()=>assert.equal(cardinal(359),'N'));
