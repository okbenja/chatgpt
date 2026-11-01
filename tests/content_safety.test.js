'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.window=global;require('../data.js');require('../systems.js');const Game=require('../engine.js');require('../narrative.js');
function make(){const g=new Game(null);g.create({name:'Vera',age:24},{seed:42});g._simulationSuppressNarrative=true;return g;}
test('Todos los NPC menores y familiares rechazan las rutas románticas, casuales y efectos directos',()=>{
 for(const base of VINCULOS_DATA.npcs){const old=base.age;try{base.age=17;const g=make();g.state.hour=19;g.state.location=base.nightHome||base.home;for(const type of ['flirt','askDate','date','relationship'])assert.equal(g.interact(base.id,type,{allowInfidelity:true}).ok,false,base.id+type);for(const action of g.data.nightInteractions||[])assert.equal(g.interactNight(base.id,action.id,{allowInfidelity:true,confirmEncounter:true}).ok,false);const before=g.exportSave();assert.equal(g.applyEffects({money:99,relationships:{[base.id]:{romance:10}}}).ok,false);assert.equal(g.exportSave(),before);}finally{base.age=old;}}
});
test('Los hijos siguen fuera de rutas íntimas a los0,17,18 y25años y un guardado no puede eludirlo',()=>{
 const g=make(),rel=g.getRelationship('mateo');Object.assign(rel,{status:'partner',trust:90,friendship:90,romance:80,dates:3});g.state.money=400;assert.equal(g.addChild('Luz').ok,true);const child=g.state.family.children[0];
 for(const age of [0,17,18,25]){g.state.day=child.bornOn+age*360;for(const type of ['flirt','askDate','date','relationship'])assert.equal(g.interact(child.id,type).ok,false);assert.equal(g.interactNight(child.id,'oneNight',{confirmEncounter:true}).ok,false);assert.equal(g.getRelationship(child.id).romance,0);}
 const bad=JSON.parse(g.exportSave());bad.relationships[child.id].romance=5;assert.equal(g.importSave(JSON.stringify(bad)).ok,false);
});
test('El catálogo y los eventos pendientes respetan edades y los tres filtros de contenido',()=>{
 const g=make();for(const e of g.data.events)for(const o of e.options)for(const r of o.results)for(const [id,c]of Object.entries(r.effects?.relationships||{})){const n=g.getNPC(id);if(c.romance&&n)assert.ok(!n.family&&n.age>=18,e.id);}
 assert.equal(g.setPreferences({nightlife:false,casual:false,romance:false}).ok,true);
 for(const w of g.getEventWeights()){const e=g.data.events.find(e=>e.id===w.id);if(Object.keys(e.content||{}).length)assert.equal(w.eligible,false,e.id);}
 assert.equal(g.getLocationAvailability('discoteca',20).open,false);assert.equal(g.interact('mateo','flirt').ok,false);
 g.state.narrative.pending={eventId:'expectativas_cita',npcId:'hermano',day:1,variantIndex:0,context:{}};assert.equal(g.getPendingEvent(),null);
});
