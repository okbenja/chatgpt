'use strict';
// El piloto usa las mismas acciones, costes, eventos y descanso que la interfaz.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process'),os=require('node:os');
global.window=global;require('../data.js');require('../systems.js');const Game=require('../engine.js');require('../narrative.js');
const D=VINCULOS_DATA;
const param=(id,def)=>{const i=process.argv.indexOf(id);return i<0?def:process.argv[i+1];};
const days=Number(param('--days',1080)),seeds=Number(param('--seeds',20)),folder='/tmp/vinculos-v3-sim';fs.mkdirSync(folder,{recursive:true});
function make(asp,seed,age){const g=new Game(null);g.create({name:'Vera',age,aspirationIds:[asp],path:'free'},{seed});g.save=()=>true;return g;}
function simulate(source,days,seed){
 const g=new Game(null);g.state=JSON.parse(source.exportSave());g.state.rngState=seed>>>0;g.save=()=>true;g._trackBaseline();
 const result={seed,aspiration:g.state.aspirations[0],days:0,events:{},repeatedPerWeek:0,maxRepeat:0,stages:{},stats:{},economy:{min:g.state.money,max:g.state.money,zeroDays:0,debtMax:0,ending:0,savings:0},legacyDay:null,errors:[]};
 for(const key of Object.keys(g.state.stats))result.stats[key]={zero:0,hundred:0};
 const weekly={};
 function settle(){for(let i=0;i<4;i++){const p=g.getPendingEvent();if(!p)return;const choices=p.options.filter(o=>o.available);if(!choices.length){if(!p.mandatory)g.deferEvent();return;}let c=choices.find(c=>c.id==='aspiracion')||choices[Math.floor(g.random()*choices.length)];const r=g.chooseEvent(p.id,c.id);if(!r.ok){result.errors.push(r.message);return;}result.events[p.id]=(result.events[p.id]||0)+1;const week=Math.floor((g.state.day-1)/7),key=week+':'+p.id;weekly[key]=(weekly[key]||0)+1;if(weekly[key]>1)result.repeatedPerWeek++;result.maxRepeat=Math.max(result.maxRepeat,weekly[key]);}}
 function act(fn){const r=fn();settle();return r?.ok;}
 function visit(id){if(g.state.location===id)return true;if(!g.getLocationAvailability(id,g.state.hour+.5).open)return false;return act(()=>g.travel(id));}
 function meet(id){const place=D.locations.find(l=>g.getPresentNPCs(l.id,g.state.hour+(g.state.location===l.id?0:.5)).some(n=>n.id===id));return place&&visit(place.id)&&act(()=>g.interact(id,'listen'));}
 const targets=['mateo','valentina','ines','nora','alex'];
 for(let d=0;d<days;d++){
  const before=g.state.day;settle();
  if(!g.getPendingEvent()?.mandatory){
   if(g.state.life.employment.jobId==='none'||g.state.life.employment.status==='unemployed')act(()=>g.lifeAction('changeJob',{id:'autonomo'}));
   if(g.state.money<50||d%4===0){const j=D.jobs.find(x=>x.id===g.state.life.employment.jobId);if(j&&visit(j.location)&&g.state.hour<j.start)act(()=>g.performAction('descanso'));act(()=>g.lifeAction('workShift'));}
   if(g.state.life.wellbeing.nutrition<45||g.state.stats.health<65){if(visit('casa')){if(g.state.money>=6)act(()=>g.performAction('comer_casa'));else act(()=>g.lifeAction('assistedMeal'));}}
   const asp=result.aspiration;
   if(asp==='creatividad')act(()=>g.lifeAction('practiceSkill',{id:'creatividad'}));
   else if(asp==='conocimiento'){if(visit('casa'))act(()=>g.performAction('estudiar_casa'));}
   else if(asp==='familia'){const family=D.npcs.filter(n=>n.family),n=family[d%family.length];meet(n.id);}
   else if(asp==='comunidad')meet(targets[d%targets.length]);
   else if(asp==='aventura'){const dest=D.locations.find(l=>!g.state.direction.visitedLocations.includes(l.id)&&g.getLocationAvailability(l.id,g.state.hour+.5).open);if(dest)visit(dest.id);else if(g.state.direction.visitedLocations.length<12){const later=D.locations.find(l=>!g.state.direction.visitedLocations.includes(l.id)&&l.opensAt>g.state.hour+.5);if(later){act(()=>g.waitUntilOpening(later.id));visit(later.id);}}else if(visit('plaza'))act(()=>g.performAction('pasear_plaza'));}
   else {if(g.state.money>90)act(()=>g.lifeAction('depositSavings',{amount:Math.min(50,g.state.money-80)}));else if(visit('casa'))act(()=>g.performAction('descanso'));}
   if(d%3===0&&g.state.hour<18)meet(targets[d%targets.length]);
   if(d%5===0&&g.state.hour<19)act(()=>g.lifeAction('practiceSkill',{id:['musica','cocina','tecnologia','deporte'][Math.floor(d/5)%4]}));
   if(g.state.stats.energy<25&&g.state.hour<21&&visit('casa'))act(()=>g.performAction('descanso'));
   if(g.state.stats.stress>65&&g.state.hour<21&&visit('plaza'))act(()=>g.performAction('pasear_plaza'));
   const message=g.state.messages.find(m=>!m.answered);if(message&&g.state.hour<21)act(()=>g.replyMessage(message.id,'warm'));
   for(const goal of g.getGoals())if(goal.complete)act(()=>g.claimGoal(goal.id));
   if(g.getLegacy().available&&!g.getLegacy().reached){act(()=>g.reviewLegacy());result.legacyDay=g.state.day;}
  }
  settle();const stage=g.getLifeStage();result.stages[stage]=(result.stages[stage]||0)+1;
  for(const [key,v] of Object.entries(g.state.stats)){if(v===0)result.stats[key].zero++;if(v===100)result.stats[key].hundred++;}
  const end=g.sleep();if(!end.ok||g.state.day!==before+1){result.errors.push(`Día ${before}: ${end.message}`);break;}
  result.days++;result.economy.min=Math.min(result.economy.min,g.state.money);result.economy.max=Math.max(result.economy.max,g.state.money);if(!g.state.money)result.economy.zeroDays++;result.economy.debtMax=Math.max(result.economy.debtMax,g.state.life.economy.debt);
 }
 result.economy.ending=g.state.money;result.economy.savings=g.state.life.economy.savings;result.legacyDay=g.state.direction.legacy.reached?g.state.direction.legacy.day:null;
 result.finalStage=g.getLifeStage();result.finalSaveBytes=g.exportSave().length;result.completedGoals=Object.values(g.state.direction.progress).reduce((n,p)=>n+p.stage,0);
 return result;
}
async function main(){
 const worker=param('--worker','');if(worker){const list=[];for(let i=0;i<seeds;i++){const seed=(Math.imul(i+1,2654435761)+worker.charCodeAt(0))>>>0,age=[23,27,49,63,68][i%5],source=make(worker,seed,age),before=source.exportSave();const r=simulate(source,days,seed);assert.equal(source.exportSave(),before);assert.equal(r.days,days,JSON.stringify(r.errors));assert.deepEqual(r.errors,[]);if(i===0){const a=simulate(source,Math.min(20,days),seed),b=simulate(source,Math.min(20,days),seed);assert.deepEqual(a,b);}list.push(r);console.log(`${worker}: ${i+1}/${seeds}, ${r.days} días, legado ${r.legacyDay}`);}fs.writeFileSync(path.join(folder,worker+'.json'),JSON.stringify(list));return;}
 const aspirations=D.aspirations.map(a=>a.id),pending=[...aspirations],active=new Set();let rejected=null;
 await new Promise(resolve=>{function run(){while(active.size<Math.min(4,os.availableParallelism())&&pending.length){const id=pending.shift(),p=spawn(process.execPath,[__filename,'--worker',id,'--seeds',String(seeds),'--days',String(days)],{stdio:['ignore','pipe','pipe']});active.add(p);p.stdout.on('data',b=>process.stdout.write(b));p.stderr.on('data',b=>process.stderr.write(b));p.on('exit',code=>{active.delete(p);if(code)rejected=Error('Falló '+id);if(!pending.length&&!active.size)resolve();else run();});} }run();});if(rejected)throw rejected;
 const runs=aspirations.flatMap(a=>JSON.parse(fs.readFileSync(path.join(folder,a+'.json')))),counts={};for(const r of runs)for(const [id,n]of Object.entries(r.events))counts[id]=(counts[id]||0)+n;
 const missing=D.events.filter(e=>!counts[e.id]);const aggregate={days:runs.reduce((n,r)=>n+r.days,0),runs:runs.length,events:D.events.length,distinct:Object.keys(counts).length,repetitions:runs.reduce((n,r)=>n+r.repeatedPerWeek,0),legacyReached:runs.filter(r=>r.legacyDay).length,maxDebt:Math.max(...runs.map(r=>r.economy.debtMax)),maxBalance:Math.max(...runs.map(r=>r.economy.max)),maxSaveBytes:Math.max(...runs.map(r=>r.finalSaveBytes)),never:missing.map(e=>({id:e.id,title:e.title,conditions:e.conditions})),byAspiration:{}};
 for(const asp of aspirations){const rows=runs.filter(r=>r.aspiration===asp),stats={},stages={};for(const r of rows){for(const [k,v]of Object.entries(r.stats)){stats[k]||={zero:0,hundred:0};stats[k].zero+=v.zero;stats[k].hundred+=v.hundred;}for(const [k,v]of Object.entries(r.stages))stages[k]=(stages[k]||0)+v;}aggregate.byAspiration[asp]={legacy:rows.filter(r=>r.legacyDay).length,meanEnding:Math.round(rows.reduce((n,r)=>n+r.economy.ending+r.economy.savings,0)/rows.length),zeroMoneyDays:rows.reduce((n,r)=>n+r.economy.zeroDays,0),stages,stats};}
 fs.writeFileSync('/tmp/vinculos-v3-balance.json',JSON.stringify({aggregate,runs},null,2));
 const report=`# Equilibrio V3\n\n${days} días × ${seeds} semillas × 6 aspiraciones = **${aggregate.days} días**, ${runs.length} recorridos completos en dificultad equilibrada. Tres años usan el calendario ficticio de 360 días.\n\nEl piloto toma decisiones con las acciones reales, resuelve eventos con RNG guardado y no cambia su partida de origen. Se compara una repetición por semilla inicial. Perfiles de edades 23, 27, 49, 63 y 68; el envejecimiento mantiene el ritmo real, sin acelerarlo para simular etapas.\n\n## Resultados\n\n- Catálogo: ${aggregate.events} eventos; ${aggregate.distinct} observados.\n- Repeticiones adicionales del mismo evento en una semana: ${aggregate.repetitions}.\n- Legados alcanzados: ${aggregate.legacyReached}/${runs.length}; después se sigue jugando.\n- Deuda máxima: ${aggregate.maxDebt} €. Saldo máximo: ${aggregate.maxBalance} €.\n- Tamaño máximo de guardado: ${aggregate.maxSaveBytes} bytes.\n\n| Aspiración | Legados | Saldo y ahorro final medio | Días sin efectivo | Días por etapa |\n|---|---:|---:|---:|---|\n${Object.entries(aggregate.byAspiration).map(([id,v])=>`| ${id} | ${v.legacy} | ${v.meanEnding} € | ${v.zeroMoneyDays} | ${JSON.stringify(v.stages)} |`).join('\n')}\n\n## Extremos de estadísticas\n\nSe observan antes de descansar, no se confunde la energía recuperada al dormir con saturación.\n\n| Aspiración | Estadística | Días en 0 | Días en 100 |\n|---|---|---:|---:|\n${Object.entries(aggregate.byAspiration).flatMap(([asp,v])=>Object.entries(v.stats).map(([k,n])=>`| ${asp} | ${k} | ${n.zero} | ${n.hundred} |`)).join('\n')}\n\n## Reglas de equilibrio revisadas\n\nEl diagnóstico inicial de V3 detectó desgaste excesivo de vida social y encanto. El mantenimiento actual conserva mejor los niveles medios y mantiene pérdidas por decisiones y eventos. La recuperación de energía por etapa se aplica al descanso nocturno; no añade recargos ocultos por acción. El estrés en cero representa recuperación bajo esta política de descanso. Las pruebas dirigidas complementan el piloto para deuda, apoyo, despido y vuelta al empleo.\n\n## Eventos no observados\n\n${missing.map(e=>`- ${e.title} (${e.id}): ${JSON.stringify(e.conditions||{})}`).join('\n')||'Todos aparecieron.'}\n\n## Límites de interpretación\n\nEsta es una política automática con decisiones concretas, no una demostración de equilibrio para todas las personas. Las ramas de intimidad, adopción y algunas condiciones de hogar o empleo pueden quedar fuera; tienen pruebas dirigidas. La comparación económica incluye ahorro separado y señala dinero en cero y deuda. Ahorrar con ingresos regulares no es un bucle de dinero infinito: todos los trabajos consumen horas y energía. Los perfiles no viven todas las etapas en tres años; la tabla refleja la exposición real.\n\n## Reproducir\n\n\`node tests/v3_simulation.js --days 1080 --seeds 20\`\n\nJSON completo: /tmp/vinculos-v3-balance.json.\n`;
 fs.writeFileSync(path.join(__dirname,'../BALANCE_V3_REPORT.md'),report);console.log(JSON.stringify({...aggregate,never:missing.length},null,2));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={simulate};
