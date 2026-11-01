'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const context={window:{}};
vm.runInNewContext(fs.readFileSync(require.resolve('../data.js'),'utf8'),context);
globalThis.VINCULOS_DATA=context.window.VINCULOS_DATA;
const Game=require('../engine.js');
function fixture(){const values=new Map();const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};const g=new Game(storage);g.create({name:'Vera',age:24,path:'work'},{seed:42});return {g,storage};}
test('La ampliación añade familia y círculos sin cambiar las personas anteriores',()=>{
  const {g}=fixture();assert.equal(g.data.npcs.length,37);assert.equal(g.data.npcs.filter(n=>n.family).length,13);
  for(const id of ['madre','padre','hermana','hermano','tia','tio','prima','abuela_materna','abuelo_paterno','primo'])assert.equal(g.getNPC(id).family,true);
  assert.ok(g.data.npcs.every(n=>n.traits.length===3 && n.needs.length && n.age>=18));
  for(const place of ['trabajo','colegio','universidad'])assert.ok(g.data.npcs.filter(n=>!n.family && n.home===place).length>=4);
});
test('Las doce interacciones adicionales consumen recursos y dejan recuerdos reales',()=>{
  for(const a of VINCULOS_DATA.interactions){const {g}=fixture();let id='madre';if(a.id==='collaborate'){id='jefa';g.state.location='trabajo';}if(a.id==='resolveConflict')g.getRelationship(id).conflict=20;const before=JSON.parse(g.exportSave());const out=g.interact(id,a.id);assert.equal(out.ok,true,`${a.id}: ${out.message}`);assert.ok(g.state.hour>before.hour);assert.ok(g.getRelationship(id).sharedHistory.length);assert.equal(g.state.money,before.money-(a.cost||0));assert.equal(g.state.counters.social,1);assert.equal(g.getRelationship(id).romance,0);}
});
test('Un ascenso exige experiencia, habilidades y confianza; cambia salario y se guarda',()=>{
  const {g,storage}=fixture();g.state.location='trabajo';const before=g.exportSave();assert.equal(g.requestPromotion().ok,false);assert.equal(g.exportSave(),before);
  g.state.career.experience=36;g.state.stats.responsibility=50;g.getRelationship('jefa').trust=25;
  assert.equal(g.requestPromotion().ok,true);assert.equal(g.getCareer().level,1);assert.equal(g.getCareer().salary,113);
  const money=g.state.money;assert.equal(g.performAction('trabajar_turno').ok,true);assert.equal(g.state.money-money,113);
  const loaded=new Game(storage);assert.equal(loaded.load(),true);assert.equal(loaded.getCareer().level,1);assert.equal(loaded.state.career.promotions.length,1);
});
test('La infidelidad requiere elección, deja un secreto y produce consecuencias narrativas',()=>{
  const {g}=fixture();const partner=g.getRelationship('valentina');Object.assign(partner,{status:'partner',friendship:80,trust:80,romance:60,dates:3});
  Object.assign(g.getRelationship('mateo'),{friendship:60,trust:60,romance:20});g.state.location='cafeteria';
  const before=g.exportSave();assert.equal(g.interact('mateo','flirt').requiresInfidelityConfirmation,true);assert.equal(g.exportSave(),before);
  assert.equal(g.interact('mateo','flirt',{allowInfidelity:true}).ok,true);assert.equal(g.state.narrative.flags.secret_affair,true);assert.ok(g.state.narrative.queue.some(q=>q.eventId==='secreto_pesa'));
  require('../narrative.js');assert.equal(g.interact('valentina','confess').ok,true);const event=g.getPendingEvent();assert.equal(event.id,'secreto_pesa');
  assert.equal(g.chooseEvent(event.id,'contar').ok,true);assert.ok(partner.trust<80);assert.equal(g.state.narrative.flags.secret_affair,false);assert.equal(g.state.narrative.flags.affair_discovered,true);
  assert.ok(g.state.narrative.queue.some(q=>q.eventId==='reparar_acuerdo'));
});
test('Las partidas previas reciben las nuevas personas y carrera sin perder relaciones',()=>{
  const {g}=fixture();const legacy=JSON.parse(fs.readFileSync(require.resolve('./fixtures/save-v1.json'),'utf8'));
  assert.equal(g.importSave(JSON.stringify(legacy)).ok,true);assert.equal(g.state.profile.name,'Vera');assert.equal(g.getRelationship('madre').trust,legacy.relationships.madre.trust);assert.equal(g.getRelationship('abuela_materna').status,'family');
  const oldV2=JSON.parse(g.exportSave());delete oldV2.career;
  for(const n of g.data.npcs.filter(n=>n.addedIn)){delete oldV2.relationships[n.id];delete oldV2.npcStates[n.id];}
  assert.equal(g.importSave(JSON.stringify(oldV2)).ok,true);assert.equal(g.getCareer().level,0);assert.ok(g.getRelationship('uni_lara'));
});
