/* Vínculos V3: dirección y sistemas de vida. Los catálogos viven en data.js. */
(function(root){
  'use strict';
  const clone=x=>JSON.parse(JSON.stringify(x));
  const cap=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
  const fail=message=>({ok:false,message});
  const finite=n=>typeof n==='number'&&Number.isFinite(n);
  const defs=g=>g.data;
  const difficulty=g=>defs(g).difficulties.find(d=>d.id===g.state.direction.settings.difficulty);
  const mean=g=>{const a=Object.values(g.state.relationships);return a.reduce((n,r)=>n+r.friendship,0)/a.length;};
  function hydrate(g,s,input={}){
    const ids=defs(g).aspirations.map(a=>a.id);
    const requested=input.profile?.aspirationIds || input.aspirations || ['estabilidad'];
    s.version=4;s.aspirations=[...new Set(requested.filter(id=>ids.includes(id)))].slice(0,2);if(!s.aspirations.length)s.aspirations=['estabilidad'];
    s.direction={progress:{},legacy:{reached:false,day:0,title:'Una vida que es tuya',text:'',snapshots:[]},memories:[],visitedLocations:[s.location],lastChangeDay:0,settings:{difficulty:defs(g).difficulties.some(d=>d.id===input.profile?.difficulty)?input.profile.difficulty:'equilibrada',audioEnabled:false,volume:0.15},tutorial:{enabled:input.version!==1&&input.version!==2,step:0,completed:false}};
    s.life={economy:{savings:0,debt:0,creditLimit:250,lastBilledDay:Math.max(0,s.day-1),transactions:[],weeks:[]},employment:{jobId:s.profile.path==='work'?'nexo':'none',status:s.profile.path==='work'?'employed':'unemployed',performance:60,lastWorkedDay:0,missedShifts:0},skills:Object.fromEntries(defs(g).skills.map(k=>[k.id,{xp:0,lastPracticeDay:0}])),home:{type:'familiar',roommateId:'hermana',upgrades:[],lastMoveDay:0},pet:null,world:{weather:'despejado',news:[],lastUpdatedDay:s.day},annual:{},wellbeing:{nutrition:65,movement:50,rest:75,illness:0},history:[]};
    for(const a of defs(g).aspirations)s.direction.progress[a.id]={stage:0};
    if(input.version>=3){validate(g,input);s.aspirations=clone(input.aspirations);s.direction=clone(input.direction);s.life=clone(input.life);s.life.annual=s.life.annual||{};}
    const settings=s.direction.settings;
    for(const key of ['nightlife','romance','casual','showAllSystems']) {
      if(settings[key]!==undefined&&typeof settings[key]!=='boolean')throw Error('Ajuste de contenido inválido');
      if(settings[key]===undefined)settings[key]=key!=='showAllSystems';
    }
    const book=input.version===4?input.direction.book:input.book||[];
    if(!Array.isArray(book)||book.length>12||book.some(x=>!x||typeof x.text!=='string'||x.text.length>1600||typeof x.title!=='string'||typeof x.name!=='string'||!finite(x.day)))throw Error('Libro inválido');
    s.direction.book=clone(book);
    const inheritance=input.version===4?input.direction.inheritance:input.inheritance||null;
    if(inheritance!==null&&(!inheritance||inheritance.kind!=='carta'||typeof inheritance.from!=='string'||typeof inheritance.text!=='string'||inheritance.text.length>1000))throw Error('Herencia inválida');
    s.direction.inheritance=clone(inheritance);
    const archive=input.version===4?input.life.archive:null;
    if(archive!==null&&archive!==undefined&&(!archive||!Array.isArray(archive.months)||archive.months.length>120||archive.months.some(m=>!Number.isInteger(m.month)||m.month<1||!finite(m.days)||m.days>30||!finite(m.earned)||!finite(m.spent)||!Array.isArray(m.notes)||m.notes.length>3||m.notes.some(t=>typeof t!=='string'||t.length>180))))throw Error('Archivo mensual inválido');
    s.life.archive=archive?clone(archive):{months:[]};
    if(input.version===3) {
      for(const summary of s.summaries)archiveSummary(s,summary);
      compactState(s);
    }
    hydratePressure(g,s,input);
    s.lifeStage=stage(g,s);
    return s;
  }
  function validate(g,s){
    const bad=()=>{throw Error('Guardado V3 inválido');};
    const obj=x=>{if(!x||typeof x!=='object'||Array.isArray(x))bad();return x;};
    const num=(x,min=0,max=100)=>{if(!finite(x)||x<min||x>max)bad();};
    const arr=(x,max)=>{if(!Array.isArray(x)||x.length>max)bad();return x;};
    const text=(x,max=3000)=>{if(typeof x!=='string'||x.length>max)bad();};
    const id=(x,list)=>{if(!list.some(a=>a.id===x))bad();};
    arr(s.aspirations,2);if(!s.aspirations.length||new Set(s.aspirations).size!==s.aspirations.length)bad();s.aspirations.forEach(a=>id(a,defs(g).aspirations));
    const d=obj(s.direction);obj(d.settings);id(d.settings.difficulty,defs(g).difficulties);num(d.settings.volume,0,1);if(typeof d.settings.audioEnabled!=='boolean')bad();num(d.lastChangeDay,0,s.day);
    obj(d.progress);for(const a of defs(g).aspirations){num(obj(d.progress[a.id]).stage,0,3);if(!Number.isInteger(d.progress[a.id].stage))bad();}
    const t=obj(d.tutorial);num(t.step,0,5);if(typeof t.enabled!=='boolean'||typeof t.completed!=='boolean')bad();
    arr(d.visitedLocations,100).forEach(x=>{if(!defs(g).locations.some(l=>l.id===x))bad();});
    arr(d.memories,120).forEach(m=>{obj(m);text(m.key,300);text(m.title,200);text(m.text);num(m.day,1,s.day);num(m.hour,0,23);});
    const l=obj(d.legacy);if(typeof l.reached!=='boolean')bad();num(l.day,0,s.day);text(l.title,200);text(l.text,12000);arr(l.snapshots,20).forEach(x=>{obj(x);text(x.text,12000);num(x.day,1,s.day);});
    const life=obj(s.life);if(life.annual!==undefined){obj(life.annual);for(const v of Object.values(life.annual)){obj(v);for(const key of ['days','earned','spent','events'])num(v[key],0,99999999);}}
    const e=obj(life.economy);num(e.savings,0,99999999);num(e.debt,0,250);num(e.creditLimit,0,250);num(e.lastBilledDay,0,s.day);arr(e.transactions,300).forEach(x=>{obj(x);num(x.day,1,s.day);num(x.amount,-99999999,99999999);text(x.type,80);});arr(e.weeks,160).forEach(w=>{obj(w);num(w.day,1,s.day);num(w.income,0,99999999);num(w.expenses,0,99999999);num(w.interest,0,250);});
    const job=obj(life.employment);if(job.jobId!=='none')id(job.jobId,defs(g).jobs);if(!['employed','unemployed','self_employed'].includes(job.status))bad();num(job.performance);num(job.lastWorkedDay,0,s.day);num(job.missedShifts,0,1000000);
    obj(life.skills);for(const sk of defs(g).skills){const k=obj(life.skills[sk.id]);num(k.xp);num(k.lastPracticeDay,0,s.day);}
    const h=obj(life.home);if(!defs(g).housing.some(x=>x.id===h.type))bad();if(h.roommateId!==null&&!defs(g).npcs.some(n=>n.id===h.roommateId))bad();arr(h.upgrades,3).forEach(x=>id(x,defs(g).homeUpgrades));num(h.lastMoveDay,0,s.day);
    if(life.pet!==null){const p=obj(life.pet);id(p.kind,defs(g).pets);text(p.name,32);num(p.care);num(p.bond);num(p.lastCareDay,0,s.day);}
    const w=obj(life.world);id(w.weather,defs(g).weathers);num(w.lastUpdatedDay,0,s.day);arr(w.news,10).forEach(n=>{obj(n);id(n.id,defs(g).worldNews);num(n.startDay,1,s.day);num(n.endDay,n.startDay,n.startDay+90);});
    if(life.lastWarning!==undefined)text(life.lastWarning,3000);
    const wb=obj(life.wellbeing);for(const key of ['nutrition','movement','rest','illness'])num(wb[key]);
    arr(life.history,1200).forEach(h=>{obj(h);num(h.day,1,s.day);num(h.money,0,99999999);num(h.mood);num(h.relationships);num(h.energy);});
  }
  function stage(g,s=g.state){const age=s.profile.age+Math.floor((s.day+360-s.birthDay)/360)-(s.birthDay===1?1:0);return age<25?'juventud':age<50?'adultez':age<65?'madurez':'vejez';}
  function metric(g,name){const s=g.state,l=s.life;return name==='savings'?l.economy.savings:name==='skill'?l.skills.creatividad.xp:name==='friend'?Object.values(s.relationships).filter(r=>r.status==='friend'||r.status==='partner').length:name==='family'?Object.values(s.relationships).filter(r=>r.status==='family').reduce((a,r)=>a+r.trust,0)/Object.values(s.relationships).filter(r=>r.status==='family').length:name==='explore'?s.direction.visitedLocations.length:s.counters.study;}
  function goals(g){return g.state.aspirations.flatMap(id=>{const a=defs(g).aspirations.find(a=>a.id===id),stage=g.state.direction.progress[id].stage,t=a.stages[stage];if(!t)return [];const value=metric(g,t.metric);return [{...t,renunciation:defs(g).aspirationTradeoffs[id].text,id:'asp_'+t.id,aspirationId:id,type:t.metric,progress:Math.min(Math.floor(value*10)/10,t.target),complete:value>=t.target,claimed:false}];});}
  function claim(g,id){const goal=goals(g).find(x=>x.id===id);if(!goal||!goal.complete)return fail('Todavía queda un poco para ese paso.');const trade=defs(g).aspirationTradeoffs[goal.aspirationId],check=g._timeCheck(trade.duration,trade.energy);if(check)return check;if(g.state.money<(trade.cost||0))return fail('Necesitas reservar el coste indicado antes de cerrar este tramo.');g._advance(trade.duration);g._effects({...trade.stats,energy:-trade.energy,money:-(trade.cost||0)});g.state.direction.progress[goal.aspirationId].stage++;g._effects({money:goal.reward,mood:3});g._journal('Un rumbo que toma forma',`${goal.title}. Avanzas en tu aspiración de ${goal.aspirationId}.`,'milestone',{tags:['aspiraciones']});return g._success('Has completado un tramo de tu historia.',{kind:'goal'});}
  function legacy(g) {
    const s=g.state,done=Object.values(s.direction.progress).reduce((n,p)=>n+p.stage,0);
    const close=Object.values(s.relationships).filter(r=>r.lastMet>0&&r.trust>=65&&r.friendship>=45).length;
    const care=s.family.children.length+Math.floor(s.family.support/40);
    const risks=s.direction.visitedLocations.length+s.life.pressure.history.length;
    const reasons=[];
    if(s.day<90&&!(s.day>=30&&done>=3))reasons.push('Vivir 90 días, o 30 días y tres tramos.');
    if(!(done>=1||close>=4||care>=3||risks>=12))reasons.push('Dejar una huella: un tramo, cuatro vínculos cercanos, cuidados compartidos o doce experiencias.');
    if(s.stats.health<35||s.stats.mood<25||s.stats.stress>=85)reasons.push('Recuperar salud y ánimo, y reducir el estrés por debajo de 85.');
    if(s.life.economy.debt>150||s.life.pressure.expenses.some(b=>s.day>b.dueDay))reasons.push('Acordar una salida a los gastos vencidos y reducir la deuda a 150 € o menos.');
    return {...s.direction.legacy,available:reasons.length===0,completedStages:done,reasons};
  }
  function legacyPortrait(g) {
    const s=g.state,asp=s.aspirations.slice().sort((a,b)=>s.direction.progress[b].stage-s.direction.progress[a].stage)[0];
    const close=Object.entries(s.relationships).filter(([,r])=>r.lastMet>0&&r.trust>=55&&r.friendship>=35).sort((a,b)=>(b[1].friendship+b[1].trust)-(a[1].friendship+a[1].trust)).slice(0,5).map(([id])=>({id,name:g.getNPC(id).name,quote:s.relationships[id].sharedHistory.at(-1)?.text.slice(0,170)||'La confianza se construyó con tiempo compartido.'}));
    const unresolved=[];
    for(const b of s.life.pressure.expenses)unresolved.push(`Quedó pendiente ${defs(g).expenseCatalog.find(x=>x.id===b.kind).title.toLowerCase()}.`);
    for(const [id,r]of Object.entries(s.relationships))if(r.conflict>25)unresolved.push(`Una conversación por retomar con ${g.getNPC(id).name}.`);
    if(s.life.economy.debt)unresolved.push(`Una deuda de ${s.life.economy.debt} € sigue abierta.`);
    if(s.narrative.flags.secret_affair)unresolved.push('Una verdad íntima todavía no compartida.');
    const names={estabilidad:'Un lugar donde respirar',creatividad:'Una obra que sigue abierta',comunidad:'Una mesa con sitio',familia:'Lo que aprendimos a cuidar',aventura:'Los caminos que elegiste',conocimiento:'Preguntas que te acompañan'};
    let type=asp,title=names[asp];
    if(s.family.children.length&&s.family.support>=60){type='cuidados';title='Una vida que sostuvo otras';}
    else if(close.length>=4&&s.direction.progress[asp].stage===0){type='vinculos';title='Las personas que hicieron hogar';}
    else if(s.life.pressure.helpCount>=5&&s.life.pressure.history.length>=8){type='resiliencia';title='Aprender a pedir y volver a empezar';}
    const pool=[...s.direction.memories,...s.journal.filter(j=>!['day','summary'].includes(j.kind))].sort((a,b)=>a.day-b.day);
    const unique=[...new Map(pool.map(j=>[`${j.day}:${j.title}`,j])).values()];
    const timeline=unique.length<=12?unique:Array.from({length:12},(_,i)=>unique[Math.round(i*(unique.length-1)/11)]);
    const moments=timeline.map(j=>({day:j.day,title:j.title.slice(0,140),quote:j.text.slice(0,230)}));
    const text=`${s.profile.name}: ${title.toLowerCase()}. En ${s.day} días completaste ${legacy(g).completedStages} tramos. ${close.length?'Te acompañaron '+close.map(p=>p.name).join(', ')+'.':'Aprendiste a reservar espacio para otras personas.'} Tomaste ${s.life.pressure.history.length} decisiones ante imprevistos y exploraste ${s.direction.visitedLocations.length} lugares. ${unresolved.length?'Todavía queda: '+unresolved.slice(0,3).join(' '):'No todo fue sencillo; hoy tus compromisos tienen margen.'} Puedes seguir escribiendo esta vida.`;
    return {type,title,text,people:close,timeline:moments,unresolved:unresolved.slice(0,8)};
  }
  function reviewLegacy(g) {
    const s=g.state,check=legacy(g);
    if(!check.available)return fail('Este cierre todavía no está listo. '+check.reasons.join(' '));
    if(s.direction.legacy.reached&&s.direction.legacy.day===s.day)return {ok:true,message:'Puedes revisar el legado guardado y seguir viviendo.'};
    const portrait=legacyPortrait(g);
    s.direction.legacy={...portrait,reached:true,day:s.day,snapshots:[...s.direction.legacy.snapshots,{day:s.day,text:portrait.text}].slice(-6)};
    const item={id:`${s.profile.name}:${s.savedAt||0}:${s.day}`,name:s.profile.name,day:s.day,type:portrait.type,title:portrait.title,text:portrait.text.slice(0,1600)};
    const old=s.direction.book.find(x=>x.name===item.name&&x.type===item.type);
    if(old)Object.assign(old,item);else s.direction.book.push(item);
    s.direction.book=s.direction.book.slice(-12);
    try{g.storage?.setItem('vinculos-book-v1',JSON.stringify(s.direction.book));}catch{/* La exportación conserva el libro aunque falle la copia separada. */}
    g._journal(portrait.title,portrait.text,'legacy',{tags:['legado']});
    return g._success('Tu legado queda guardado. Puedes seguir viviendo o empezar una nueva vida con una carta.',{kind:'legacy'});
  }
  function legacyText(g) {
    const l=g.state.direction.legacy;
    if(!l.reached)return '';
    return [l.title,l.text,...(l.timeline||[]).map(m=>`Día ${m.day} · ${m.title}\n«${m.quote}»`),'Personas importantes',...(l.people||[]).map(p=>p.name+': '+p.quote),'Lo que quedó abierto',...(l.unresolved?.length?l.unresolved:['Un futuro todavía por escribir.'])].join('\n\n');
  }
  function legacySVG(g) {
    const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
    const lines=legacyText(g).split('\n').flatMap(t=>t.match(/.{1,65}(?:\s|$)|.{1,65}/g)||['']).slice(0,100),height=120+lines.length*26;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 ${height}"><rect width="900" height="${height}" fill="#f5f1e5"/><g font-family="sans-serif" font-size="18" fill="#23493e">${lines.map((t,i)=>`<text x="40" y="${65+i*26}">${esc(t)}</text>`).join('')}</g></svg>`;
  }
  function newLife(g,profile={}) {
    const s=g.state;
    if(s.day<30&&!s.direction.legacy.reached)return fail('Vive al menos treinta días antes de pasar una carta a otra vida.');
    const inheritance={kind:'carta',from:s.profile.name,text:(s.direction.legacy.text||'No pude resolverlo todo. Me quedo con las personas y las preguntas que aprendí a cuidar.').slice(0,1000)};
    const book=clone(s.direction.book);
    try{if(g.storage)g.storage.setItem('vinculos-previous-life',g.exportSave());}catch{return fail('No cabe una copia de esta vida. Expórtala antes de comenzar otra.');}
    const next={name:'Alex',age:19,path:'free',aspirationIds:['comunidad'],...profile};
    if(!next.name?.trim()||!Number.isInteger(next.age)||next.age<18||next.age>80)return fail('Elige un personaje adulto y un nombre para la nueva vida.');
    g.create(next,{seed:g.state.rngState,book,inheritance});
    g._effects({mood:3});g.state.life.skills.comunicacion.xp=3;
    g._journal('Una carta que cruza vidas',`${inheritance.from} dejó estas palabras: «${inheritance.text}»`,'inheritance',{tags:['legado']});g.save();
    return {ok:true,message:'Empiezas otra vida con una carta, una pequeña práctica y el libro anterior.'};
  }
  function changeAspirations(g,ids){if(!Array.isArray(ids)||ids.length<1||ids.length>2||new Set(ids).size!==ids.length||ids.some(id=>!defs(g).aspirations.some(a=>a.id===id)))return fail('Elige una o dos aspiraciones distintas.');if([...ids].sort().join() === [...g.state.aspirations].sort().join())return fail('Ese ya es tu rumbo.');if(g.state.direction.lastChangeDay&&g.state.day-g.state.direction.lastChangeDay<7)return fail('Dale una semana de espacio a este cambio antes de volver a elegir.');const check=g._timeCheck(1,8);if(check)return check;g._advance(1);g._effects({energy:-8,mood:-3});g.state.aspirations=[...ids];g.state.direction.lastChangeDay=g.state.day;g._journal('Cambiar de rumbo',`Decides hacer espacio para ${ids.join(' y ')}. Dejar otro proyecto trae dudas y también nuevas posibilidades.`,'life',{tags:['aspiraciones']});return g._success('Cambias de rumbo y te das tiempo para encontrar el ritmo.',{kind:'direction'});}
  function memories(g,index){const entry=g.state.journal[index];if(!entry)return fail('No encuentras ese recuerdo.');const key=`${entry.day}:${entry.hour}:${entry.title}`.slice(0,300),list=g.state.direction.memories;if(list.some(m=>m.key===key))return fail('Ese momento ya está en tu línea de tiempo.');list.push({key,day:entry.day,hour:entry.hour,title:entry.title,text:entry.text});if(list.length>120)list.shift();g.save();return {ok:true,message:'Has guardado este momento en tu línea de tiempo.'};}
  function tutorial(g,action){const t=g.state.direction.tutorial;if(action==='skip'){t.enabled=false;t.completed=true;}else if(action==='restart'){t.enabled=true;t.step=0;t.completed=false;}else if(action==='next'){t.step=Math.min(5,t.step+1);t.completed=t.step===5;t.enabled=!t.completed;}else return fail('Elige cómo continuar la introducción.');g.save();return {ok:true,message:action==='skip'?'Puedes seguir a tu ritmo.':'La introducción se ha actualizado.'};}
  function transaction(g,amount,type){g.state.life.economy.transactions.push({day:g.state.day,amount,type});g.state.life.economy.transactions=g.state.life.economy.transactions.slice(-300);}
  function action(g,type,payload={}){
    const special=pressureAction(g,type,payload);if(special)return special;
    const s=g.state,l=s.life;let message='',duration=0,energy=0,cost=0,changes={},effect={};const blocked=g._eventBlock();if(blocked)return blocked;
    const amount=Number(payload.amount);
    if(['depositSavings','withdrawSavings','borrowMoney','repayDebt'].includes(type)){
      if(!finite(amount)||amount<=0||amount>999999||!Number.isInteger(amount))return fail('Indica una cantidad entera mayor que cero.');
      if(type==='depositSavings'&&s.money<amount||type==='withdrawSavings'&&l.economy.savings<amount||type==='repayDebt'&&(s.money<amount||l.economy.debt<amount))return fail('No tienes esa cantidad disponible para este movimiento.');
      if(type==='borrowMoney'&&l.economy.debt+amount>l.economy.creditLimit)return fail('Ese préstamo superaría el límite de crédito. Puedes solicitar apoyo o aceptar un encargo sin coste.');
      if(type==='depositSavings'){s.money-=amount;l.economy.savings+=amount;message='Apartas dinero sin dejar de contar con él para el futuro.';}
      if(type==='withdrawSavings'){s.money+=amount;l.economy.savings-=amount;message='Usas una parte del colchón que habías preparado.';}
      if(type==='borrowMoney'){s.money+=amount;l.economy.debt+=amount;message='Recibes el préstamo y anotas sus condiciones: 1 % de interés semanal y límite de 250 €.';}
      if(type==='repayDebt'){s.money-=amount;l.economy.debt-=amount;message='Devuelves parte de la deuda y recuperas margen.';}
      transaction(g,type==='depositSavings'||type==='repayDebt'?-amount:amount,type);return g._success(message,{kind:'finance'});
    }
    if(type==='createWork'){const k=defs(g).skills.find(x=>x.id===payload.id);if(!k||l.skills[k.id].xp<k.advancedAt)return fail('Necesitas al menos 20 de práctica en esa habilidad para preparar un proyecto propio.');if(s.daily.actions['project_'+k.id])return fail('Hoy ya has trabajado en un proyecto de esta habilidad.');duration=2;energy=14;changes.project=k.id;message=`Das forma a un proyecto de ${k.label.toLowerCase()} y guardas qué quieres revisar la próxima vez.`;effect={mood:5,knowledge:3,responsibility:2};
    } else if(type==='practiceSkill'){
      const skill=defs(g).skills.find(k=>k.id===payload.id);if(!skill)return fail('Esa habilidad no existe.');if((s.daily.actions['skill_'+skill.id]||0)>=3)return fail('Hoy has practicado bastante esto. Puedes probar otra cosa o descansar.');duration=1;energy=8;message=`Practicas ${skill.label.toLowerCase()} a tu ritmo.`;changes.skill=skill.id;effect={knowledge:2,mood:2};
    } else if(type==='changeJob'){
      const job=defs(g).jobs.find(j=>j.id===payload.id);if(!job)return fail('No encuentras ese oficio.');if(l.employment.jobId===job.id&&l.employment.status!=='unemployed')return fail('Ya trabajas en ese oficio.');if(l.skills[job.skill].xp<job.minSkill)return fail(`Necesitas ${job.minSkill} de ${defs(g).skills.find(k=>k.id===job.skill).label} para optar a ese trabajo.`);duration=1;energy=5;changes.job=job;message=`Acuerdas las condiciones para empezar en ${job.label.toLowerCase()}.`;effect={mood:3};
    } else if(type==='workShift'){
      const job=defs(g).jobs.find(j=>j.id===l.employment.jobId);if(!job||l.employment.status==='unemployed')return fail('Elige primero un empleo. También puedes aceptar encargos puntuales en el estudio.');if(s.location!==job.location)return fail(`Este trabajo se realiza en ${defs(g).locations.find(x=>x.id===job.location).name}.`);if(s.hour<job.start||s.hour+job.duration>job.end)return fail(`El turno debe encajar entre las ${job.start}:00 y las ${job.end}:00.`);if(s.daily.workHours+job.duration>8)return fail('Ya has dedicado ocho horas al trabajo hoy.');duration=job.duration;energy=job.duration*6;changes.work=job;effect={money:Math.round(job.basePay*(1+s.career.level*.18)),responsibility:4,stress:6,knowledge:2};message=`Completas un turno de ${job.label.toLowerCase()} y cobras ${effect.money} €.`;
    } else if(type==='promoteJob'){
      const j=defs(g).jobs.find(j=>j.id===l.employment.jobId);if(!j||l.employment.status==='unemployed')return fail('Necesitas un empleo activo para hablar de un ascenso.');if(s.location!==j.location)return fail('Esta revisión se hace en el lugar de trabajo.');if(s.career.level>=4)return fail('Ya has llegado al último nivel de este oficio.');if(l.employment.performance<70||l.skills[j.skill].xp<10+s.career.level*8||s.career.experience<24*(s.career.level+1))return fail(`Necesitas rendimiento 70, habilidad ${10+s.career.level*8} y experiencia ${24*(s.career.level+1)} para esta revisión.`);duration=1;energy=5;changes.promotion=true;message='Presentas tu aportación y acordáis un nuevo nivel de responsabilidad y sueldo.';
    } else if(type==='moveHome'){
      const h=defs(g).housing.find(x=>x.id===payload.id);if(!h)return fail('Esa vivienda no está disponible.');if(h.id===l.home.type)return fail('Ese ya es tu hogar.');duration=2;energy=12;cost=h.moveCost;changes.home=h;message=`Te mudas a ${h.label.toLowerCase()} y acuerdas cómo repartir espacio y gastos.`;effect={mood:5,stress:4};
    } else if(type==='improveHome'){
      const u=defs(g).homeUpgrades.find(x=>x.id===payload.id);if(!u||l.home.upgrades.includes(u.id))return fail('Esa mejora no está disponible o ya forma parte de tu hogar.');duration=1;energy=6;cost=u.cost;changes.upgrade=u.id;message=`Preparas ${u.label.toLowerCase()} para que el hogar se parezca un poco más a lo que necesitas.`;
    } else if(type==='adoptPet'){
      const pet=defs(g).pets.find(p=>p.id===payload.id);if(l.pet)return fail('Ya compartes tu hogar con una mascota.');if(!pet||typeof payload.name!=='string'||!payload.name.trim())return fail('Elige una mascota y su nombre.');duration=1;energy=5;cost=pet.cost;changes.pet={kind:pet.id,name:payload.name.trim().slice(0,32),bond:25,care:80,lastCareDay:s.day};message=`Das la bienvenida a ${changes.pet.name}. Organizas sus cuidados, espacio y gastos.`;effect={mood:6};
    } else if(type==='carePet'){
      if(!l.pet)return fail('Todavía no hay una mascota en casa.');if((s.daily.actions.petCare||0)>=2)return fail('Hoy ya habéis tenido vuestros ratos de cuidados.');duration=.5;energy=3;cost=payload.id==='feed'?2:0;changes.care=true;message=`Dedicas un rato a cuidar a ${l.pet.name}, sin convertirlo en otra tarea a toda prisa.`;effect={mood:4,stress:-3};
    } else if(type==='requestSupport'||type==='assistedMeal'){
      if(s.daily.actions.support)return fail('Hoy ya has contado con ese apoyo. Mañana habrá otro margen.');duration=1;energy=0;changes.support=true;effect=type==='assistedMeal'?{health:6,energy:18}:{money:15,energy:5};message='Aceptas apoyo del barrio. No tienes que resolverlo todo a solas.';
    } else return fail('Ese plan no está disponible.');
    if(s.money<cost)return fail(`Necesitas ${cost} € para este plan. Puedes ahorrar, cambiar de plan o pedir apoyo.`);
    const check=g._timeCheck(duration,energy);if(check)return check;
    s.money-=cost;g._advance(duration);g._effects({...effect,energy:(effect.energy||0)-energy});
    if(changes.project){l.skills[changes.project].xp=cap(l.skills[changes.project].xp+4);l.skills[changes.project].lastPracticeDay=s.day;s.daily.actions['project_'+changes.project]=1;}
    if(changes.skill){const k=l.skills[changes.skill];k.xp=cap(k.xp+6*(1-k.xp/110));k.lastPracticeDay=s.day;s.daily.actions['skill_'+changes.skill]=(s.daily.actions['skill_'+changes.skill]||0)+1;}
    if(changes.job){l.employment={jobId:changes.job.id,status:changes.job.id==='autonomo'?'self_employed':'employed',performance:60,lastWorkedDay:0,missedShifts:0};s.profile.path='work';s.career.level=0;s.career.experience=0;}
    if(changes.work){l.employment.lastWorkedDay=s.day;l.employment.missedShifts=0;l.employment.performance=cap(l.employment.performance+3+l.skills[changes.work.skill].xp/30);s.daily.workHours+=duration;s.counters.work++;s.career.experience+=duration*3;l.skills[changes.work.skill].xp=cap(l.skills[changes.work.skill].xp+2);l.skills[changes.work.skill].lastPracticeDay=s.day;}
    if(changes.promotion){s.career.level++;s.career.promotions.push({day:s.day,level:s.career.level});}
    if(changes.home)l.home={type:changes.home.id,roommateId:changes.home.roommateId,upgrades:[],lastMoveDay:s.day};
    if(changes.upgrade)l.home.upgrades.push(changes.upgrade);
    if(changes.pet)l.pet=changes.pet;
    if(changes.care){l.pet.care=cap(l.pet.care+22);l.pet.bond=cap(l.pet.bond+4);l.pet.lastCareDay=s.day;s.daily.actions.petCare=(s.daily.actions.petCare||0)+1;}
    if(changes.support){s.daily.actions.support=1;if(type==='assistedMeal')l.wellbeing.nutrition=cap(l.wellbeing.nutrition+25);}
    transaction(g,(effect.money||0)-cost,type);g._journal('Un paso en tu vida',message,'life',{tags:[type]});return g._success(message,{kind:'system',actionId:type});
  }
  function afterAction(g,extra){
    const s=g.state,l=s.life,id=extra.actionId||'';
    afterPressureAction(g,extra);
    if(extra.kind==='travel'){const weather=defs(g).weathers.find(w=>w.id===l.world.weather),extraEnergy=weather.energyExtra+l.world.news.reduce((n,x)=>n+(defs(g).worldNews.find(z=>z.id===x.id).energyExtra||0),0);if(extraEnergy)g._effects({energy:-extraEnergy});}
    if(extra.kind==='travel'&&!s.direction.visitedLocations.includes(s.location))s.direction.visitedLocations.push(s.location);
    if(extra.kind==='social'){l.skills.comunicacion.xp=cap(l.skills.comunicacion.xp+.4);l.skills.comunicacion.lastPracticeDay=s.day;}
    if(/comer|cocina|tapas|merienda|desayuno/.test(id))l.wellbeing.nutrition=cap(l.wellbeing.nutrition+15);
    if(/paseo|ejercicio|gimnasio/.test(id)){l.wellbeing.movement=cap(l.wellbeing.movement+12);l.skills.deporte.xp=cap(l.skills.deporte.xp+1);l.skills.deporte.lastPracticeDay=s.day;}
    if(/estudi|biblioteca|clase/.test(id)){l.skills.tecnologia.xp=cap(l.skills.tecnologia.xp+.5);l.skills.tecnologia.lastPracticeDay=s.day;}
    const t=s.direction.tutorial;if(t.enabled){if(t.step===0&&extra.kind==='profile'||t.step===1&&extra.kind==='travel'||t.step===2&&extra.kind==='social'||t.step===3&&['action','system'].includes(extra.kind)||t.step===4&&extra.kind==='day'){t.step++;if(t.step>=5){t.completed=true;t.enabled=false;}}}
    const stageNow=stage(g);if(stageNow!==s.lifeStage){g._journal('Otra etapa se abre',`Entras en ${defs(g).lifeStages.find(x=>x.id===stageNow).label.toLowerCase()}. Puedes revisar tus ritmos y prioridades.`,'life',{tags:['etapa']});s.lifeStage=stageNow;}
  }
  function beforeSleep(g){
    const s=g.state,l=s.life,e=l.economy;let warning=pressureEvening(g);
    if(s.day-e.lastBilledDay>=7){const h=defs(g).housing.find(x=>x.id===l.home.type),pet=l.pet?defs(g).pets.find(x=>x.id===l.pet.kind).weeklyCost:0,factor=difficulty(g).costFactor,newsFactor=l.world.news.reduce((f,n)=>f*(defs(g).worldNews.find(x=>x.id===n.id).costFactor||1),1);const bills=Math.round((h.weeklyRent+8+12+pet)*factor*newsFactor);let short=Math.max(0,bills-s.money),credit=Math.min(short,250-e.debt);if(credit>0){e.debt+=credit;s.money+=credit;g._recordMutation(`Usas ${credit} € del crédito para cubrir las facturas.`,{kind:'finance'});g._trackBaseline();}const paid=Math.min(s.money,bills);s.money-=paid;const interest=factor===0?0:Math.min(250-e.debt,Math.round(e.debt*.01));e.debt+=interest;g._recordMutation(`Gastos semanales: alquiler ${h.weeklyRent*factor} €, facturas y comida ${20*factor} €, cuidados ${pet*factor} €. Pagas ${paid} €.`,{kind:'finance'});g._trackBaseline();e.weeks.push({day:s.day,income:s.summaries.slice(-7).reduce((n,d)=>n+d.earned,0)+s.ledger.earned,expenses:paid,interest});e.weeks=e.weeks.slice(-160);e.lastBilledDay=s.day;transaction(g,-paid,'bills');if(short>0)warning='Los gastos superaron el dinero disponible. Puedes volver al hogar familiar, aceptar encargos, usar ahorro o solicitar apoyo.';if(paid<bills){l.wellbeing.illness=cap(l.wellbeing.illness+1);warning+=' El barrio te ayuda con lo imprescindible; no se acumulan cargos sin límite.';}g._journal('Balance de la semana',`Pagaste ${paid} € y la deuda queda en ${e.debt.toFixed(2)} €. ${warning}`,'money',{tags:['economía']});}
    if(s.stats.energy<15||s.stats.stress>70)warning+=' El ritmo de hoy deja poco margen de descanso. Puedes reducir planes mañana.';
    if(l.pet&&l.pet.care<35)warning+=` ${l.pet.name} necesita más compañía y cuidados.`;
    l.wellbeing.rest=cap(l.wellbeing.rest+(s.hour<22?5:-3));l.wellbeing.nutrition=cap(l.wellbeing.nutrition-4);l.wellbeing.movement=cap(l.wellbeing.movement-3);l.wellbeing.illness=cap(l.wellbeing.illness+(l.wellbeing.nutrition<20?2:-1));
    l.lastWarning=warning;
    l.history.push({day:s.day,money:s.money,mood:s.stats.mood,relationships:mean(g),energy:s.stats.energy});l.history=l.history.slice(-1200);
  }
  function newDay(g){const s=g.state,l=s.life;compactState(s);pressureMorning(g);const recoveryPenalty=Math.round((defs(g).lifeStages.find(x=>x.id===stage(g)).energyFactor-1)*50);if(recoveryPenalty)g._effects({energy:-recoveryPenalty});l.world.weather=defs(g).weathers[Math.floor(g.random()*defs(g).weathers.length)].id;l.world.news=l.world.news.filter(n=>n.endDay>s.day);if(l.world.news.length<2&&g.random()<.12*difficulty(g).riskFactor){const n=defs(g).worldNews[Math.floor(g.random()*defs(g).worldNews.length)];if(!l.world.news.some(x=>x.id===n.id)){l.world.news.push({id:n.id,startDay:s.day,endDay:s.day+n.days});g._journal(n.title,n.text,'world',{tags:['barrio']});}}l.world.lastUpdatedDay=s.day;for(const k of Object.values(l.skills))if(s.day-k.lastPracticeDay>10)k.xp=Math.max(0,k.xp-.08);if(l.pet){l.pet.care=cap(l.pet.care-9);if(l.pet.care>60)g._effects({mood:2});}for(const id of l.home.upgrades)g._effects(defs(g).homeUpgrades.find(x=>x.id===id).effects);if(l.wellbeing.illness>60)g._effects({energy:-8,health:-2});const j=l.employment;if(j.jobId!=='none'&&j.status==='employed'&&s.day-j.lastWorkedDay>7&&!g.isWeekend()){j.performance=cap(j.performance-4*difficulty(g).riskFactor);if(j.performance<15){j.status='unemployed';g._journal('Un trabajo termina','El contrato termina tras varias ausencias. Puedes buscar otro empleo, formarte o aceptar encargos mientras decides.','work',{tags:['trabajo']});}}}
  function availability(g,id,base){if(!base.open||id==='casa')return base;const w=defs(g).weathers.find(w=>w.id===g.state.life.world.weather);const closed=(w.closed||[]).includes(id)||g.state.life.world.news.some(n=>(defs(g).worldNews.find(x=>x.id===n.id).closed||[]).includes(id));return closed?{...base,open:false,reason:'Este lugar está cerrado temporalmente por el clima o las noticias del barrio.'}:base;}
  function applyEffects(g,e){for(const [id,xp] of Object.entries(e.skills||{}))if(g.state.life.skills[id]&&finite(xp)){const k=g.state.life.skills[id];k.xp=cap(k.xp+xp);k.lastPracticeDay=g.state.day;}if(e.performance)g.state.life.employment.performance=cap(g.state.life.employment.performance+e.performance);}
  function get(g,name){const s=g.state,l=s.life;if(name==='travel')return 2+defs(g).weathers.find(w=>w.id===l.world.weather).energyExtra+l.world.news.reduce((n,x)=>n+(defs(g).worldNews.find(z=>z.id===x.id).energyExtra||0),0);if(name==='economy'){const h=defs(g).housing.find(h=>h.id===l.home.type);return {...l.economy,weekly:l.economy.weeks.at(-1)||{income:0,expenses:0,interest:0},upcomingExpenses:Math.round((h.weeklyRent+20+(l.pet?defs(g).pets.find(p=>p.id===l.pet.kind).weeklyCost:0))*difficulty(g).costFactor*l.world.news.reduce((factor,n)=>factor*(defs(g).worldNews.find(x=>x.id===n.id).costFactor||1),1))};}if(name==='employment'){const j=defs(g).jobs.find(j=>j.id===l.employment.jobId);return {...l.employment,title:j?.label||'Entre trabajos',level:s.career.level,salary:j?Math.round(j.basePay*(1+s.career.level*.18)):0,schedule:j?`${j.start}:00–${j.end}:00`:'A tu ritmo',...j};}if(name==='skills')return defs(g).skills.map(k=>({...k,value:l.skills[k.id].xp}));if(name==='home')return {...defs(g).housing.find(h=>h.id===l.home.type),...l.home,housingId:l.home.type};if(name==='pet')return l.pet;if(name==='world')return {...l.world,weather:defs(g).weathers.find(w=>w.id===l.world.weather),news:l.world.news.map(n=>({...defs(g).worldNews.find(x=>x.id===n.id),...n}))};return null;}
  function afterSummary(g,summary){archiveSummary(g.state,summary);const key=String(summary.year),a=g.state.life.annual[key] || {days:0,earned:0,spent:0,events:0};a.days++;a.earned+=summary.earned;a.spent+=summary.spent;a.events+=g.state.narrative.history.filter(h=>h.day===summary.day).length;g.state.life.annual[key]=a;}
  // V4: obligaciones que sobreviven al descanso y salidas con un coste visible.
  function hydratePressure(g,s,input) {
    const saved=input.version===4?input.life?.pressure:null;
    if(input.version===4) {
      if(!saved || !finite(saved.load) || saved.load<0 || saved.load>100 ||
        !Number.isInteger(saved.nextCrisisDay) || saved.nextCrisisDay<1 ||
        !Array.isArray(saved.expenses) || saved.expenses.length>3 ||
        !Array.isArray(saved.history) || saved.history.length>60 ||
        !Array.isArray(saved.warnings) || saved.warnings.length>20 ||
        !finite(saved.crises) || saved.crises<0 || !finite(saved.helpCount) || saved.helpCount<0)throw Error('Presión inválida');
      for(const b of saved.expenses)if(!defs(g).expenseCatalog.some(x=>x.id===b.kind)||!finite(b.amount)||b.amount<0||b.amount>1000||!Number.isInteger(b.day)||b.day<1||b.day>s.day||!Number.isInteger(b.dueDay)||b.dueDay<b.day)throw Error('Gasto inválido');
      for(const w of saved.warnings)if(typeof w.npcId!=='string'||!s.relationships[w.npcId]||!finite(w.day)||w.day>s.day)throw Error('Aviso inválido');
      for(const h of saved.history)if(!finite(h.day)||h.day>s.day||typeof h.text!=='string'||h.text.length>500)throw Error('Historial inválido');
    }
    s.life.pressure=saved?clone(saved):{load:12,expenses:[],history:[],warnings:[],nextCrisisDay:s.day+20,crises:0,helpCount:0};
  }
  function afterPressureAction(g,extra) {
    const s=g.state,p=s.life.pressure,id=extra.actionId||'';
    const factor=defs(g).pressureRules[s.direction.settings.difficulty].loadFactor;
    if(id==='workShift'||/trabajar|turno|encargo/.test(id))p.load=cap(p.load+(s.daily.workHours>4?9:4)*factor);
    if(id==='practiceSkill'||id==='createWork'||/estudi|clase/.test(id))p.load=cap(p.load+2*factor);
    if(/descanso|pasear|medita/.test(id))p.load=cap(p.load-3);
    if(extra.kind==='social'&&extra.npcId) {
      p.warnings=p.warnings.filter(w=>w.npcId!==extra.npcId);
      if(g.getRelationship(extra.npcId)?.conflict>20)p.load=cap(p.load+3*factor);
      else p.load=cap(p.load-1);
    }
  }
  function pressureEvening(g) {
    const s=g.state,p=s.life.pressure;
    const conflicts=Object.values(s.relationships).filter(r=>r.conflict>25).length;
    p.load=cap(p.load*.93+conflicts*.7+(s.life.economy.debt>0?2:0)+p.expenses.length*2+s.family.children.length*.7);
    if(s.stats.stress>=60)g._effects({mood:-Math.ceil((s.stats.stress-50)/12),health:s.stats.stress>=85?-2:0});
    return p.expenses.length?'Queda un gasto extraordinario pendiente. Negociar o pedir ayuda también ocupa tiempo y deja una historia. ':'';
  }
  function pressureMorning(g) {
    const s=g.state,p=s.life.pressure,rules=defs(g).pressureRules[s.direction.settings.difficulty];
    const floor=Math.round(8+p.load*.65+(s.life.economy.debt>0?5:0));
    if(s.stats.stress<floor)g._effects({stress:floor-s.stats.stress});
    if(s.stats.stress>55)g._effects({energy:-Math.ceil((s.stats.stress-55)/4),mood:-2});
    if(s.day>=p.nextCrisisDay&&p.expenses.length<3) {
      const kind=defs(g).expenseCatalog[Math.floor(g.random()*defs(g).expenseCatalog.length)];
      const bill={kind:kind.id,amount:Math.round(kind.amount*rules.expenseFactor*(p.crises===0&&s.direction.settings.difficulty!=='tranquila'?5:1)),day:s.day,dueDay:s.day+7};
      p.expenses.push(bill);p.crises++;p.load=cap(p.load+10*rules.loadFactor);
      p.nextCrisisDay=s.day+rules.minDays+Math.floor(g.random()*(rules.maxDays-rules.minDays+1));
      g._journal(kind.title,`${kind.text} El presupuesto es ${bill.amount} €. Tienes siete días para acordar una salida.`,'pressure',{tags:['economía','decision']});
    }
    for(const [id,r] of Object.entries(s.relationships)) {
      if(r.status==='family'||r.friendship<25||!r.lastMet)continue;
      const away=s.day-r.lastMet;
      if(away===4&&!p.warnings.some(w=>w.npcId===id)) {
        p.warnings.push({npcId:id,day:s.day});
        g._journal('Un vínculo pide espacio en tu agenda',`${g.getNPC(id).name} echa de menos compartir tiempo. Dentro de unos días puede sentirse la distancia.`,'social',{npcId:id,tags:['aviso']});
      }
      if(away>8&&['dating','partner'].includes(r.status)&&s.day%3===0){r.trust=cap(r.trust-1);r.romance=cap(r.romance-1);}
    }
    p.warnings=p.warnings.filter(w=>s.day-w.day<30).slice(-20);
  }
  function pressureAction(g,type,payload) {
    if(type!=='resolveExpense')return null;
    const s=g.state,p=s.life.pressure,b=p.expenses[0];
    if(!b)return fail('No hay gastos extraordinarios pendientes.');
    const choice=payload.choice;
    if(!['pay','help','negotiate'].includes(choice))return fail('Elige pagar, pedir ayuda o negociar.');
    const blocked=g._eventBlock();if(blocked)return blocked;
    const cost=choice==='pay'?b.amount:choice==='negotiate'?Math.round(b.amount*.45):0;
    const hours=choice==='pay'?.5:choice==='negotiate'?2:3,energy=choice==='pay'?2:12;
    const check=g._timeCheck(hours,energy);if(check)return check;
    if(s.money<cost)return fail(`Necesitas ${cost} €. Puedes usar ahorro, crédito o pedir ayuda dedicando tres horas.`);
    s.money-=cost;g._advance(hours);g._effects({energy:-energy,stress:choice==='help'?6:choice==='negotiate'?3:-3,mood:choice==='help'?-2:0});
    p.load=cap(p.load-(choice==='pay'?8:3));p.expenses.shift();if(choice==='help')p.helpCount++;
    const text=choice==='pay'?`Pagas ${cost} € y renuncias a otros planes.`:choice==='negotiate'?`Acuerdas ${cost} € y dedicas dos horas a resolver el resto.`:'Aceptas apoyo y dedicas tres horas a colaborar. Queda pendiente devolver ese tiempo a la comunidad.';
    p.history.push({day:s.day,text});p.history=p.history.slice(-60);transaction(g,-cost,'extraordinary');g._journal('Una salida posible',text,'pressure',{tags:['economía','decision']});
    return g._success(text,{kind:'system',actionId:type});
  }
  function archiveSummary(s,summary) {
    const month=Math.floor((summary.day-1)/30)+1,list=s.life.archive.months;
    let row=list.find(m=>m.month===month);
    if(!row){row={month,days:0,earned:0,spent:0,notes:[]};list.push(row);}
    row.days++;row.earned+=summary.earned;row.spent+=summary.spent;
    if(summary.highlight&&!row.notes.includes(summary.highlight.slice(0,180)))row.notes.push(summary.highlight.slice(0,180));
    row.notes=row.notes.slice(-3);s.life.archive.months=list.slice(-120);
  }
  function compactState(s) {
    // Totales mensuales conservan la historia; los detalles recientes son una ventana.
    const seen=new Set();
    s.journal=s.journal.filter(j=>{if(j.kind==='summary')return false;const key=j.day+':'+j.title+':'+j.text;if(seen.has(key))return false;seen.add(key);return true;}).slice(0,180);
    s.summaries=s.summaries.slice(-30).map(({stats,...row})=>row);
    s.messages=s.messages.slice(-40);
    s.narrative.history=s.narrative.history.slice(-200);
    s.narrative.queue=s.narrative.queue.slice(-20);
    for(const r of Object.values(s.relationships)){r.sharedHistory=r.sharedHistory.slice(-8);if(r.casual)r.casual.history=r.casual.history.slice(-8);}
    for(const n of Object.values(s.npcStates))n.history=n.history.slice(-8);
    s.direction.memories=s.direction.memories.slice(-60);
    s.life.history=s.life.history.filter((h,i,a)=>h.day>=s.day-90||h.day%7===0||i===a.length-1).slice(-360);
    s.life.economy.transactions=s.life.economy.transactions.slice(-80);
    s.life.economy.weeks=s.life.economy.weeks.slice(-52);
    if(s.life.pressure)s.life.pressure.history=s.life.pressure.history.slice(-30);
  }
  function compact(g){compactState(g.state);}
  const api={compact,legacyText,legacySVG,newLife,afterSummary,hydrate,validate,stage,goals,claim,legacy,reviewLegacy,changeAspirations,memories,tutorial,action,afterAction,beforeSleep,newDay,availability,applyEffects,get};
  root.Vinculos=root.Vinculos||{};root.Vinculos.LifeSystems=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
