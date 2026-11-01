'use strict';
const assert=require('node:assert/strict');
const {simulate}=require('./v3_simulation.js');
const Game=global.LifeGame;
for(const aspiration of VINCULOS_DATA.aspirations){const g=new Game(null);g.create({name:'Vera',age:27,path:'free',aspirationIds:[aspiration.id]},{seed:42});const before=g.exportSave(),r=simulate(g,45,42);assert.equal(r.days,45);assert.deepEqual(r.errors,[]);assert.equal(g.exportSave(),before);}
console.log('6 aspiraciones ×45 días: 270 días completos, sin mutar la partida original.');
