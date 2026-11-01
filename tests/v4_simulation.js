'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),os=require('node:os'),{spawn}=require('node:child_process');
global.window=global;require('../data.js');require('../systems.js');const Game=require('../engine.js');require('../narrative.js');
const profiles=require('./bot_profiles.js'),D=VINCULOS_DATA;
const argument=(id,fallback)=>{const i=process.argv.indexOf(id);return i<0?fallback:process.argv[i+1];};
function runLife(profile,seed,days,index=0){
 const ages=[19,23,49,63,70],g=new Game(null);g.create({name:'Vera',age:ages[index%ages.length],path:profile.id==='estudiante'?(index%2?'school':'university'):'free',aspirationIds:[profile.aspiration],scenario:D.startScenarios?.[index%4]?.id},{seed});g.save=()=>true;
 const result={profile:profile.id,seed,days:0,events:{},weeklyRepeats:0,stress:{sum:0,zero:0,high:0},economy:{zeroDays:0,troubleDays:0,maxDebt:0,min:120,max:120,final:0,savings:0},relationships:{sum:0,final:0},stages:{},legacy:null,crises:0,maxBytes:0,actions:0,rejections:{}};
 const seen=new Map();let policySeed=seed>>>0;const random=()=>{policySeed=(Math.imul(policySeed,1664525)+1013904223)>>>0;return policySeed/4294967296;};
 function settle(){for(let i=0;i<5;i++){const e=g.getPendingEvent();if(!e)return;const options=e.options.filter(o=>o.available);if(!options.length){if(!e.mandatory)g.deferEvent();return;}let chosen;
 if(profile.careful)chosen=options.find(o=>o.id==='aspiracion')||options.slice().sort((a,b)=>(a.cost+a.energyCost/3)-(b.cost+b.energyCost/3))[Math.floor(random()*Math.min(2,options.length))];else chosen=options[Math.floor(random()*options.length)];
 const r=g.chooseEvent(e.id,chosen.id);assert.equal(r.ok,true,r.message);result.events[e.id]=(result.events[e.id]||0)+1;const week=Math.floor((g.state.day-1)/7),key=week+':'+e.id;if(seen.has(key))result.weeklyRepeats++;seen.set(key,true);}}
 function act(fn){const r=fn();if(r?.ok)result.actions++;else if(r?.message)result.rejections[r.message]=(result.rejections[r.message]||0)+1;settle();return !!r?.ok;}
 function visit(id,wait=false){if(g.state.location===id)return true;if(!g.getLocationAvailability(id,g.state.hour+.5).open){if(!wait||!act(()=>g.waitUntilOpening(id)))return false;}return act(()=>g.travel(id));}
 function meet(id,type='listen'){const loc=D.locations.find(l=>g.getPresentNPCs(l.id,g.state.hour+(g.state.location===l.id?0:.5)).some(n=>n.id===id));if(!loc||!visit(loc.id))return false;return act(()=>g.interact(id,type,{allowInfidelity:profile.id==='aleatorio'}));}
 function work(){const j=D.jobs.find(j=>j.id===g.state.life.employment.jobId);if(j&&visit(j.location)){if(g.state.hour<j.start)act(()=>g.performAction('descanso'));act(()=>g.lifeAction('workShift'));}}
 function night(){const place=['bar','discoteca','azotea','restaurante','playa','centrocultural'][g.state.day%6];if(!visit(place,true))return;const n=g.getPresentNPCs().find(n=>!n.family&&n.age>=18&&n.available!==false);if(!n)return;act(()=>g.interact(n.id,'chat'));for(const type of ['talkExpectations','casualFlirt','oneNight']){const o=g.getNightOptions(n.id).find(o=>o.id===type);if(o?.available)act(()=>g.interactNight(n.id,type,{confirmEncounter:true,allowInfidelity:profile.id==='aleatorio'}));}}
 function romance(){const id=index%3===0?'alex':index%3===1?'sofia':'mateo',r=g.getRelationship(id);if(r.friendship<35||r.trust<30)meet(id,'listen');else if(r.romance<18)meet(id,'flirt');else if(r.status!=='dating'&&r.status!=='partner')meet(id,'askDate');else if(r.dates<3||r.romance<45)meet(id,'date');else if(r.status!=='partner')meet(id,'relationship');else {meet(id,'listen');if(g.state.money>=230&&g.state.family.children.length===0)act(()=>g.addChild('Luz'));if(g.state.family.children.length&&visit('casa'))act(()=>g.interact(g.state.family.children[0].id,'playTogether'));}}
 for(let day=0;day<days;day++){
  const s=g.state;settle();
  if(!g.getPendingEvent()?.mandatory){
   if(s.life.employment.jobId!==profile.job||s.life.employment.status==='unemployed') {
    if(profile.job==='creativo'&&s.life.skills.creatividad.xp<10)act(()=>g.lifeAction('practiceSkill',{id:'creatividad'}));
    else act(()=>g.lifeAction('changeJob',{id:profile.job}));
   }
   if(profile.id==='estudiante'&&s.profile.path!==(index%2?'school':'university'))act(()=>g.choosePath(index%2?'school':'university'));
   if(day%profile.workEvery===0||profile.careful&&s.money<50)work();
   if(profile.id==='descuidado'&&s.stats.energy>30)work();
   if(profile.careful) {
    if(s.money<50&&s.life.economy.savings>0)act(()=>g.lifeAction('withdrawSavings',{amount:Math.min(80,s.life.economy.savings)}));
    if(s.life.pressure.expenses.length){const b=s.life.pressure.expenses[0];if(b.amount>s.money+s.life.economy.savings)result.economy.troubleDays++;act(()=>g.lifeAction('resolveExpense',{choice:s.money>b.amount+60?'pay':s.money>Math.round(b.amount*.45)+15?'negotiate':'help'}));}
    if((s.life.wellbeing.nutrition<45||s.stats.health<65)&&visit('casa'))act(()=>s.money>=6?g.performAction('comer_casa'):g.lifeAction('assistedMeal'));
   }
   if(profile.id==='prudente'){if(s.money>150)act(()=>g.lifeAction('depositSavings',{amount:Math.min(50,s.money-100)}));meet(['mateo','valentina','madre','nora','ines'][day%5]);}
   if(profile.id==='estudiante'){const loc=index%2?'colegio':'universidad';if(visit(loc)){const a=D.locations.find(l=>l.id===loc).actions.find(a=>/clase|estudi/.test(a.id));if(a)act(()=>g.performAction(a.id));}meet(['uni_sam','nora','compa_iris','leo'][day%4]);}
   if(profile.id==='creativo'){act(()=>g.lifeAction('practiceSkill',{id:'creatividad'}));if(s.life.skills.creatividad.xp>=20&&day%3===0)act(()=>g.lifeAction('createWork',{id:'creatividad'}));if(visit('centrocultural'))act(()=>g.performAction(D.locations.find(l=>l.id==='centrocultural').actions[0].id));}
   if(profile.id==='familia')romance();
   if(profile.id==='hogar'){if(s.life.home.type==='familiar'&&s.money>110)act(()=>g.lifeAction('moveHome',{id:'compartido'}));if(!s.life.pet&&s.money>90)act(()=>g.lifeAction('adoptPet',{id:'gato',name:'Miga'}));if(s.life.pet)act(()=>g.lifeAction('carePet',{id:'play'}));if(visit('casa'))meet('ines');}
   if(profile.id==='nocturno'){if(s.stats.energy<60&&visit('casa'))act(()=>g.performAction('descanso'));night();}
   if(profile.id==='descuidado'){if(visit('mercado')){const a=D.locations.find(l=>l.id==='mercado').actions.find(a=>a.cost>0);if(a)act(()=>g.performAction(a.id));}if(day%5===0)meet('valentina','disagree');}
   if(profile.id==='aleatorio'){const loc=D.locations[Math.floor(random()*D.locations.length)];if(visit(loc.id,true)){const a=loc.actions[Math.floor(random()*loc.actions.length)];if(a)act(()=>g.performAction(a.id));const n=g.getPresentNPCs().find(n=>!n.family);if(n)act(()=>g.interact(n.id,['listen','disagree','flirt','askDate','date','relationship'][Math.floor(random()*6)],{allowInfidelity:true}));}if(day%3===0)night();}
   if(profile.careful&&s.stats.energy<30&&visit('casa'))act(()=>g.performAction('descanso'));
   if(profile.careful&&s.stats.stress>60&&visit('plaza'))act(()=>g.performAction('pasear_plaza'));
   const msg=s.messages.find(m=>!m.answered);if(msg&&profile.careful)act(()=>g.replyMessage(msg.id,'warm'));
   for(const goal of g.getGoals())if(goal.complete)act(()=>g.claimGoal(goal.id));
   if(g.getLegacy().available&&!g.getLegacy().reached){act(()=>g.reviewLegacy());result.legacy={type:g.getLegacy().type,day:s.day};}
  }
  settle();result.stress.sum+=s.stats.stress;if(s.stats.stress===0)result.stress.zero++;if(s.stats.stress>=70)result.stress.high++;
  const rels=Object.values(s.relationships).filter(r=>r.status!=='family');const mean=rels.reduce((n,r)=>n+r.friendship,0)/rels.length;result.relationships.sum+=mean;result.relationships.final=mean;
  const stage=g.getLifeStage();result.stages[stage]=(result.stages[stage]||0)+1;
  const end=g.sleep();assert.equal(end.ok,true,profile.id+': '+end.message);result.days++;
  if(!s.money)result.economy.zeroDays++;result.economy.maxDebt=Math.max(result.economy.maxDebt,s.life.economy.debt);result.economy.min=Math.min(result.economy.min,s.money);result.economy.max=Math.max(result.economy.max,s.money);
  if(day%90===0||day===days-1)result.maxBytes=Math.max(result.maxBytes,Buffer.byteLength(g.exportSave()));
 }
 result.economy.final=g.state.money;result.economy.savings=g.state.life.economy.savings;result.crises=g.state.life.pressure.crises;result.finalHealth=g.state.stats.health;
 return result;
}
async function main(){const days=+argument('--days',1080),seeds=+argument('--seeds',20),worker=argument('--worker',''),out=argument('--output','/tmp/vinculos-v4-simulation.json'),folder='/tmp/vinculos-v4-workers';fs.mkdirSync(folder,{recursive:true});
 if(worker){const p=profiles.find(p=>p.id===worker),runs=[];for(let i=0;i<seeds;i++){const seed=(Math.imul(i+1,2654435761)+p.id.charCodeAt(0))>>>0;const r=runLife(p,seed,days,i);if(i===0)assert.deepEqual(runLife(p,seed,12,i),runLife(p,seed,12,i));runs.push(r);console.log(`${p.id}: ${i+1}/${seeds} · ${r.days}d · legado ${r.legacy?.type||'pendiente'}`);}fs.writeFileSync(path.join(folder,worker+'.json'),JSON.stringify(runs));return;}
 const pending=profiles.map(p=>p.id),active=new Set();let failure;
 await new Promise(resolve=>{function next(){while(active.size<Math.min(4,os.availableParallelism())&&pending.length){const id=pending.shift(),child=spawn(process.execPath,[__filename,'--worker',id,'--days',String(days),'--seeds',String(seeds)],{stdio:['ignore','pipe','pipe']});active.add(child);child.stdout.on('data',x=>process.stdout.write(x));child.stderr.on('data',x=>process.stderr.write(x));child.on('exit',code=>{active.delete(child);if(code)failure=new Error('Falló '+id);if(!active.size&&!pending.length)resolve();else next();});}}next();});if(failure)throw failure;
 const runs=profiles.flatMap(p=>JSON.parse(fs.readFileSync(path.join(folder,p.id+'.json')))),counts={};for(const r of runs)for(const [id,n]of Object.entries(r.events))counts[id]=(counts[id]||0)+n;
 const never=D.events.filter(e=>!counts[e.id]).map(e=>({id:e.id,title:e.title,conditions:e.conditions,chainOnly:!!e.chainOnly,explanation:e.chainOnly?'Continuación que exige la decisión previa; no se fuerza en el piloto.':e.content?.romance||e.content?.casual?'Exige un vínculo, expectativas o decisión íntima concretos; las rutas tienen pruebas dirigidas.':e.conditions?.special?'Fecha especial y selección ponderada.':e.conditions?.scenarios?'Escenario y selección ponderada; se comprueba su elegibilidad por separado.':e.conditions?.jobs||e.conditions?.housing||e.conditions?.pet!==undefined?'Condición de oficio, hogar o mascota y selección ponderada.':'Combinación de condiciones y selección ponderada; véase la auditoría de alcanzabilidad.'}));
 const aggregate={days:runs.reduce((n,r)=>n+r.days,0),runs:runs.length,events:D.events.length,observed:Object.keys(counts).length,repetitions:runs.reduce((n,r)=>n+r.weeklyRepeats,0),maxBytes:Math.max(...runs.map(r=>r.maxBytes)),legacyTypes:{},byProfile:{},never};
 for(const r of runs)if(r.legacy)aggregate.legacyTypes[r.legacy.type]=(aggregate.legacyTypes[r.legacy.type]||0)+1;
 for(const p of profiles){const rows=runs.filter(r=>r.profile===p.id),n=rows.reduce((v,r)=>v+r.days,0);aggregate.byProfile[p.id]={days:n,legacies:rows.filter(r=>r.legacy).length,stressMean:rows.reduce((v,r)=>v+r.stress.sum,0)/n,stressZeroDays:rows.reduce((v,r)=>v+r.stress.zero,0),stressHighDays:rows.reduce((v,r)=>v+r.stress.high,0),zeroMoneyDays:rows.reduce((v,r)=>v+r.economy.zeroDays,0),troubleDays:rows.reduce((v,r)=>v+r.economy.troubleDays,0),maxDebt:Math.max(...rows.map(r=>r.economy.maxDebt)),meanFinalMoney:rows.reduce((v,r)=>v+r.economy.final+r.economy.savings,0)/rows.length,relationshipMean:rows.reduce((v,r)=>v+r.relationships.sum,0)/n,maxBytes:Math.max(...rows.map(r=>r.maxBytes)),crises:rows.reduce((v,r)=>v+r.crises,0)};}
 fs.writeFileSync(out,JSON.stringify({aggregate,runs},null,2));console.log(JSON.stringify(aggregate,null,2));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={runLife,profiles};
