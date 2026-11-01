'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{performance}=require('node:perf_hooks'),fs=require('node:fs');
const {simulate}=require('./v3_simulation.js'),Game=global.LifeGame;
test('Diez años reales: guardado inferior a1,5MB y carga media inferior a300ms',()=>{
 const source=new Game(null);source.create({name:'Vera',age:27,path:'work',aspirationIds:['comunidad']},{seed:42});const r=simulate(source,3600,42);assert.equal(r.days,3600);assert.deepEqual(r.errors,[]);
 // A second uninterrupted life retains the actual final state for load timings.
 const g=new Game(null);g.create({name:'Luz',age:30,path:'free'},{seed:81});g.save=()=>true;g._simulationSuppressNarrative=true;
 for(let i=0;i<3600;i++){if(g.state.money>0&&g.state.life.pressure.expenses.length)g.lifeAction('resolveExpense',{choice:'help'});g.performAction('descanso');const end=g.sleep();assert.equal(end.ok,true);}
 const raw=g.exportSave();fs.writeFileSync('/tmp/v4-ten-year-save.json',raw);const bytes=Buffer.byteLength(raw);assert.ok(r.finalSaveBytes<1500000);assert.ok(bytes<1500000);
 const store={getItem:()=>raw,setItem:()=>{}},times=[];
 for(let i=0;i<12;i++){const x=new Game(store),start=performance.now();assert.equal(x.load(),true);times.push(performance.now()-start);}
 const mean=times.reduce((a,b)=>a+b)/times.length;assert.ok(mean<300,`Carga media ${mean}ms`);assert.ok(g.state.life.archive.months.length<=120);assert.ok(g.state.journal.length<=200);assert.ok(g.state.summaries.length<=31);
 const report={daysPerLife:3600,lives:2,bytes:Math.max(bytes,r.finalSaveBytes),loadMeanMs:mean,loadMaxMs:Math.max(...times),samples:12,limits:{bytes:1500000,loadMeanMs:300}};
 fs.writeFileSync('/tmp/vinculos-v4-storage.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
});
test('El autoguardado agrupa cambios y permite vaciar la cola antes de cerrar',async()=>{let writes=0;const g=new Game({getItem:()=>null,setItem:()=>{writes++;}});g.create({name:'Vera',age:24},{seed:42});g.autosaveDeferred=true;const before=writes;g.save();g.save();g.save();assert.equal(writes,before);assert.equal(g.savePending,true);await new Promise(r=>setTimeout(r,160));assert.equal(writes,before+1);assert.equal(g.savePending,false);g.save();g.flushSave();assert.equal(writes,before+2);g.reset();});
