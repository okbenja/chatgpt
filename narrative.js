/* Vínculos · selección narrativa reproducible, sin DOM ni dependencias. */
(function (root) {
  'use strict';
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
  const fail = message => ({ ok: false, message });
  const cleanSeason = season => String(season || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const resolveNPCId = (game, id) => ['$partner', 'partner', 'pareja'].includes(id) ? Object.keys(game.state.relationships).find(key => game.state.relationships[key].status === 'partner') || null : id;

  function story(game) {
    const state = game.state;
    if (!state.narrative) state.narrative = {};
    const memory = state.narrative;
    for (const key of ['history', 'queue', 'recentTags']) if (!Array.isArray(memory[key])) memory[key] = [];
    for (const key of ['flags', 'counts']) if (!memory[key] || typeof memory[key] !== 'object' || Array.isArray(memory[key])) memory[key] = {};
    if (!own(memory, 'pending')) memory.pending = null;
    return memory;
  }

  const calendarCache=new WeakMap();
  function calendar(game) {
    const cached=calendarCache.get(game.state);if(cached?.day===game.state.day)return cached.value;
    const value= typeof game.getCalendar === 'function' ? game.getCalendar() : { season: ['primavera', 'verano', 'otoño', 'invierno'][Math.floor(((game.state.day - 1) % 360) / 90)], special: [] };
    calendarCache.set(game.state,{day:game.state.day,value});return value;
  }

  function lifeStage(game) {
    if (typeof game.getLifeStage === 'function') {
      const stage = game.getLifeStage();
      return typeof stage === 'string' ? stage : stage.id;
    }
    return game.state.lifeStage || (game.state.profile.age < 25 ? 'juventud' : game.state.profile.age < 60 ? 'adultez' : 'madurez');
  }

  function range(value, requirement) {
    if (finite(requirement)) return value >= requirement;
    if (!requirement || typeof requirement !== 'object') return true;
    return (!finite(requirement.min) || value >= requirement.min) && (!finite(requirement.max) || value <= requirement.max);
  }

  // Las condiciones son datos, nunca expresiones ejecutables.
  function requirements(game, conditions = {}) {
    const s = game.state;
    if (!s) return { ok: false, reason: 'Primero crea tu personaje.' };
    const inList = (value, allowed) => !allowed || (Array.isArray(allowed) ? allowed : [allowed]).includes(value);
    if (!inList(s.profile.path, conditions.paths)) return { ok: false, reason: 'Este encuentro pertenece a otro itinerario.' };
    if (!inList(s.location, conditions.locations)) return { ok: false, reason: 'Este encuentro sucede en otro lugar.' };
    if(conditions.aspirations && !conditions.aspirations.some(id=>(s.aspirations || []).includes(id)))return {ok:false,reason:'Esta opción sigue otra aspiración.'};
    for(const [id,req] of Object.entries(conditions.skills || {}))if(!range(s.life?.skills[id]?.xp || 0,req))return {ok:false,reason:'Necesitas más práctica en esa habilidad.'};
    if(conditions.jobs && !inList(s.life?.employment.jobId,conditions.jobs))return {ok:false,reason:'Corresponde a otro oficio.'};
    if(conditions.housing && !inList(s.life?.home.type,conditions.housing))return {ok:false,reason:'Hace falta otro tipo de hogar.'};
    if(conditions.pet!==undefined && Boolean(s.life?.pet)!==conditions.pet)return {ok:false,reason:'Este momento depende de compartir tu hogar con una mascota.'};
    if(conditions.weather && !inList(s.life?.world.weather,conditions.weather))return {ok:false,reason:'Espera a otro clima.'};
    if(conditions.news && !s.life?.world.news.some(n=>conditions.news.includes(n.id)))return {ok:false,reason:'Esa noticia no está activa en el barrio.'};
    for(const [id,req] of Object.entries(conditions.economy || {}))if(!range(s.life?.economy[id] || 0,req))return {ok:false,reason:'Tu economía necesita otro margen.'};
    if (conditions.lifeStages && !inList(lifeStage(game), conditions.lifeStages)) return { ok: false, reason: 'Corresponde a otra etapa de la vida.' };
    if (conditions.seasons && !conditions.seasons.map(cleanSeason).includes(cleanSeason(calendar(game).season))) return { ok: false, reason: 'Espera a otra estación.' };
    if (conditions.day && !range(s.day, conditions.day)) return { ok: false, reason: 'Todavía no es el momento de esta historia.' };
    if (conditions.hour && !range(s.hour, conditions.hour)) return { ok: false, reason: 'Necesitas otra franja del día.' };
    if (conditions.money && !range(s.money, conditions.money)) return { ok: false, reason: 'Tu economía no cumple las condiciones.' };
    for (const [key, requirement] of Object.entries(conditions.stats || {})) {
      if (!range(s.stats[key] || 0, requirement)) return { ok: false, reason: 'Tus estadísticas todavía no permiten esta opción.' };
    }
    for (const [id, requirement] of Object.entries(conditions.relationships || {})) {
      const rel = game.getRelationship(resolveNPCId(game, id));
      if (!rel) return { ok: false, reason: 'Falta conocer a esa persona.' };
      if (requirement.status && !inList(rel.status, requirement.status)) return { ok: false, reason: 'El vínculo necesita otra base compartida.' };
      for (const key of ['friendship', 'trust', 'romance', 'affection', 'dates']) {
        const value = key === 'affection' ? rel.friendship : rel[key];
        if (own(requirement, key) && !range(value || 0, requirement[key])) return { ok: false, reason: 'Necesitas desarrollar antes este vínculo.' };
      }
    }
    const flags = conditions.flags || conditions.flagAge ? { ...s.flags, ...(s.narrative ? s.narrative.flags : {}) } : {};
    for (const [key, expected] of Object.entries(conditions.flags || {})) {
      const actual = flags[key];
      if (expected && typeof expected === 'object') {
        if (own(expected, 'not') && actual === expected.not) return { ok: false, reason: 'Una decisión anterior ha abierto otro camino.' };
        if (own(expected, 'exists') && own(flags, key) !== expected.exists) return { ok: false, reason: 'Necesitas vivir antes otra parte de esta historia.' };
      } else if ((actual === undefined && expected === false ? false : actual) !== expected) return { ok: false, reason: 'Necesitas vivir antes otra parte de esta historia.' };
    }
    if(conditions.flagAge){const last=flags[conditions.flagAge.name];if(!finite(last) || !range(s.day-last,conditions.flagAge))return {ok:false,reason:'Este momento corresponde a otra fecha de tu historia.'};}
    const traits = conditions.traits || conditions.traitIds;
    if (traits && !traits.every(id => s.profile.traitIds.includes(id))) return { ok: false, reason: 'Esta opción requiere otro rasgo de personalidad.' };
    for (const [key, requirement] of Object.entries(conditions.family || {})) {
      if (!range((s.family || {})[key] || 0, requirement)) return { ok: false, reason: 'La situación familiar necesita otro momento.' };
    }
    if (conditions.special) {
      const special = (calendar(game).special || []).map(item => typeof item === 'string' ? item : item.id);
      const requested = Array.isArray(conditions.special) ? conditions.special : [conditions.special];
      if (!requested.some(id => special.includes(id) || id==='festival' && special.some(key=>key.startsWith('festival_')) || id === 'birthday' && special.some(key => /birthday|cumple/.test(key)))) return { ok: false, reason: 'Este encuentro espera una fecha especial.' };
    }
    return { ok: true, reason: '' };
  }

  const catalogCache=new WeakMap(),historyCache=new WeakMap();
  function catalog(game){const list=game.data.events || [];let c=catalogCache.get(list);if(!c||c.size!==list.length){const rows=list.filter(e=>e&&e.id&&Array.isArray(e.options));c={size:list.length,rows,map:new Map(rows.map(e=>[e.id,e]))};catalogCache.set(list,c);}return c;}
  function events(game){return catalog(game).rows;}
  function findEvent(game,id){return catalog(game).map.get(id);}
  function occurrence(memory, id) {
    const stored = memory.counts[id];
    if (stored && typeof stored === 'object') return { count: stored.count || 0, lastDay: stored.lastDay || 0 };
    let cached=historyCache.get(memory);if(!cached||cached.ref!==memory.history||cached.length!==memory.history.length){const map=new Map();for(const h of memory.history){const x=map.get(h.eventId)||{count:0,lastDay:0};x.count++;x.lastDay=h.day;map.set(h.eventId,x);}cached={ref:memory.history,length:memory.history.length,map};historyCache.set(memory,cached);}
    const item=cached.map.get(id);const history=item?[{day:item.lastDay}]:[];
    return { count: typeof stored === 'number' ? stored : item?.count || 0, lastDay: history.length ? history[history.length - 1].day : 0 };
  }

  function rng(game) {
    if (typeof game.random === 'function') return game.random();
    // Mulberry32 de respaldo para fixtures; el juego persiste el mismo estado.
    let seed = game.state.rngState = ((game.state.rngState || 1) + 0x6D2B79F5) >>> 0;
    seed = Math.imul(seed ^ seed >>> 15, seed | 1);
    seed ^= seed + Math.imul(seed ^ seed >>> 7, seed | 61);
    return ((seed ^ seed >>> 14) >>> 0) / 4294967296;
  }

  function weighted(game, candidates, weightOf) {
    const total = candidates.reduce((sum, item) => sum + Math.max(0, weightOf(item)), 0);
    if (!total) return null;
    let point = rng(game) * total;
    for (const item of candidates) { point -= Math.max(0, weightOf(item)); if (point < 0) return item; }
    return candidates[candidates.length - 1];
  }

  function getEventWeights(game) {
    if (!game.state) return [];
    const memory = story(game);
    const tagCounts={};for(const entry of memory.recentTags){if(typeof entry==='string')tagCounts[entry]=(tagCounts[entry]||0)+1;else if(game.state.day-entry.day<4)tagCounts[entry.tag]=(tagCounts[entry.tag]||0)+1;}
    return events(game).map(event => {
      const seen = occurrence(memory, event.id);
      const check = requirements(game, event.conditions);
      let reason = check.reason;
      if (!reason && event.chainOnly) reason = 'Solo se abre como continuación de una decisión.';
      if (!reason && event.maxOccurrences && seen.count >= event.maxOccurrences) reason = 'Esta historia ya ha terminado en esta partida.';
      if (!reason && seen.count && game.state.day - seen.lastDay < (event.cooldown || 0)) reason = 'Está dentro de su periodo de descanso.';
      let weight = Math.max(0, Number(event.weight) || 1);
      if(game.state.aspirations && (event.aspirations || []).some(id=>game.state.aspirations.includes(id)))weight*=1.8;
      if(event.mandatory && game.state.direction)weight*=game.data.difficulties.find(d=>d.id===game.state.direction.settings.difficulty).riskFactor;
      for (const modifier of event.weightModifiers || []) if (requirements(game, modifier.conditions).ok) weight *= Math.max(0, Number(modifier.multiplier) || 0);
      const repeatedTags = (event.tags || []).reduce((count, tag) => count + (tagCounts[tag]||0), 0);
      weight *= Math.pow(0.62, Math.min(4, repeatedTags));
      return { id: event.id, title: event.title, tags: event.tags || [], weight: reason ? 0 : Math.round(weight * 1000) / 1000, eligible: !reason, reason, count: seen.count, lastDay: seen.lastDay, mandatory: !!event.mandatory };
    });
  }

  function pendingFrom(game, event, context = {}) {
    const variants = Array.isArray(event.variants) ? event.variants : [];
    return { eventId: event.id, day: game.state.day, npcId: resolveNPCId(game, event.npcId) || context.npcId || null, variantIndex: variants.length ? Math.floor(rng(game) * (variants.length + 1)) : 0, context: { kind: context.kind || 'event', actionId: context.actionId || null } };
  }

  function maybeQueue(game, context = {}) {
    if (!game.state || !events(game).length || game._simulationSuppressNarrative) return null;
    const memory = story(game);
    if (memory.pending) {
      const pending = getPendingEvent(game);
      if (pending) return pending;
      memory.pending = null; // Una actualización del catálogo puede retirar una historia antigua.
    }
    memory.queue = memory.queue.filter(item => {
      const event = findEvent(game, item.eventId);
      return event && (!event.maxOccurrences || occurrence(memory, event.id).count < event.maxOccurrences);
    });
    const due = memory.queue.find(item => {
      const event = findEvent(game, item.eventId), seen = occurrence(memory, event.id);
      return item.dueDay <= game.state.day && (!seen.count || game.state.day - seen.lastDay >= (event.cooldown || 0)) && requirements(game, event.conditions).ok;
    });
    if (due) {
      const event = findEvent(game, due.eventId);
      memory.queue.splice(memory.queue.indexOf(due), 1);
      memory.pending = pendingFrom(game, event, { ...context, npcId: due.npcId });
      return getPendingEvent(game);
    }
    let today=0;for(let i=memory.history.length-1;i>=0&&memory.history[i].day===game.state.day;i--)if(!findEvent(game,memory.history[i].eventId)?.chainOnly)today++;
    if (today >= 2 || game.state.hour >= 22.5 || game.state.stats.energy <= 0) return null;
    if (context.kind !== 'day' && context.kind !== 'start' && rng(game) > 0.48) return null;
    const candidates = getEventWeights(game).filter(item => item.weight > 0);
    const special = candidates.filter(item => findEvent(game, item.id).conditions?.special);
    const selected = weighted(game, special.length ? special : candidates, item => item.weight);
    if (!selected) return null;
    memory.pending = pendingFrom(game, findEvent(game, selected.id), context);
    return getPendingEvent(game);
  }

  function interpolate(game, text, npcId) {
    const npc = npcId ? game.getNPC(npcId) : null;
    const flags = story(game).flags;
    return String(text || '').replace(/\{player\}/g, game.state.profile.name).replace(/\{npc\}/g, npc ? npc.name : 'alguien de tu entorno').replace(/\{memory:([^}]+)\}/g, (_, key) => typeof flags[key] === 'string' ? flags[key] : 'lo que decidiste aquella vez');
  }

  function optionCheck(game, option) {
    const result = requirements(game, option.requirements);
    if (!result.ok) return result;
    const cost = Math.max(0, Number(option.cost) || 0);
    if (game.state.money < cost) return { ok: false, reason: `Necesitas ${cost} € para este plan.` };
    const energy = Math.max(0, Number(option.energyCost) || 0);
    if (game.state.stats.energy < energy) return { ok: false, reason: `Necesitas ${energy} puntos de energía.` };
    const duration = Math.max(0, Number(option.duration ?? 0.5));
    if (game.state.hour + duration > 23) return { ok: false, reason: 'Hoy ya no queda tiempo para esta opción.' };
    if (!Array.isArray(option.results) || !option.results.some(result => requirements(game, result.conditions).ok)) return { ok: false, reason: 'Esta posibilidad todavía no se ha abierto.' };
    return { ok: true, reason: '' };
  }

  function getPendingEvent(game) {
    if (!game.state || !game.state.narrative || !game.state.narrative.pending) return null;
    const pending = game.state.narrative.pending;
    const event = findEvent(game, typeof pending === 'string' ? pending : pending.eventId);
    if (!event) return null;
    const npcId = pending.npcId || event.npcId;
    const variants = [event.text, ...(event.variants || [])];
    return { id: event.id, title: interpolate(game, event.title, npcId), text: interpolate(game, variants[(pending.variantIndex || 0) % variants.length], npcId), tags: event.tags || [], mandatory: !!event.mandatory, npcId, options: event.options.map(option => {
      const check = optionCheck(game, option);
      return { id: option.id, text: interpolate(game, option.text, npcId), available: check.ok, reason: check.reason, cost: Math.max(0, Number(option.cost) || 0), duration: Math.max(0, Number(option.duration ?? 0.5)), energyCost: Math.max(0, Number(option.energyCost) || 0) };
    }) };
  }

  function resultWeight(game, result, npcId) {
    if (!requirements(game, result.conditions).ok) return 0;
    let weight = Math.max(0.01, Number(result.weight) || 1);
    for (const modifier of result.modifiers || []) {
      let value = 0;
      if(modifier.skill)value=game.state.life?.skills[modifier.skill]?.xp || 0;
      if(modifier.aspiration)value=(game.state.aspirations || []).includes(modifier.aspiration)?1:0;
      if (modifier.stat) value = game.state.stats[modifier.stat] || 0;
      if (modifier.personality) value = (game.state.personality || {})[modifier.personality] || 0;
      if (modifier.relationship) value = (game.getRelationship(resolveNPCId(game, modifier.npcId || npcId)) || {})[modifier.relationship === 'affection' ? 'friendship' : modifier.relationship] || 0;
      if (modifier.trait) value = game.state.profile.traitIds.includes(modifier.trait) ? 1 : 0;
      if (modifier.conditions) value = requirements(game, modifier.conditions).ok ? 1 : 0;
      weight *= Math.max(0.05, 1 + value * (Number(modifier.factor) || 0));
    }
    if(game.state.version>=4&&game.state.stats.stress>50){const quality=result.quality||((result.effects?.stats?.mood||0)>=0?'positive':'negative');const strain=(game.state.stats.stress-50)/65;weight*=quality==='negative'?1+strain:Math.max(.25,1-strain);}
    return Math.max(0.001, weight);
  }

  function remember(game, event, optionId, resultId, text) {
    const memory = story(game), seen = occurrence(memory, event.id);
    memory.counts[event.id] = { count: seen.count + 1, lastDay: game.state.day };
    const entry = { eventId: event.id, day: game.state.day, optionId, resultId, tags: [...(event.tags || [])], npcId: memory.pending?.npcId || event.npcId || null, title: event.title, text };
    memory.history.push(entry);
    memory.history = memory.history.slice(-1600);
    memory.recentTags.push(...(event.tags || []).map(tag => ({ tag, day: game.state.day })));
    memory.recentTags = memory.recentTags.filter(item => game.state.day - item.day < 7).slice(-40);
    return entry;
  }

  function chooseEvent(game, id, optionId) {
    const pending = getPendingEvent(game);
    if (!pending || pending.id !== id) return fail('Este encuentro ya no está pendiente.');
    const event = findEvent(game, id), option = event.options.find(item => item.id === optionId);
    if (!option) return fail('Elige una de las opciones de este encuentro.');
    const check = optionCheck(game, option);
    if (!check.ok) return fail(check.reason);
    const candidates = option.results.filter(result => requirements(game, result.conditions).ok);
    const result = weighted(game, candidates, result => resultWeight(game, result, pending.npcId));
    if (!result) return fail('No hay un resultado disponible para esa decisión.');
    const memory = story(game);
    const effects = JSON.parse(JSON.stringify(result.effects || {}));
    if (effects.relationships) effects.relationships = Object.fromEntries(Object.entries(effects.relationships).map(([npcId, changes]) => [resolveNPCId(game, npcId), changes]).filter(([npcId]) => npcId));
    if (effects.npcStates) effects.npcStates = Object.fromEntries(Object.entries(effects.npcStates).map(([npcId, changes]) => [resolveNPCId(game, npcId), changes]).filter(([npcId]) => npcId));
    const resultMoney = Number(effects.money) || 0;
    const optionCost = Math.max(0, Number(option.cost) || 0);
    effects.money = resultMoney - optionCost;
    effects.stats = { ...(effects.stats || {}), energy: ((effects.stats || {}).energy || 0) - Math.max(0, Number(option.energyCost) || 0) };
    memory.flags[`decision_${id}`] = option.text;
    if (typeof game.applyEffects === 'function') game.applyEffects(effects);
    else {
      game._effects({ ...(effects.stats || {}), money: effects.money });
      for (const [npcId, changes] of Object.entries(effects.relationships || {})) { const npc = game.getNPC(npcId); if (npc) game._updateRelationship(npc, changes); }
      Object.assign(memory.flags, effects.flags || {});
    }
    // El texto se construye después de los efectos para recordar la elección.
    const resultTexts = [result.text, ...(result.variants || [])];
    const resultText = interpolate(game, resultTexts.length > 1 ? resultTexts[Math.floor(rng(game) * resultTexts.length)] : result.text, pending.npcId);
    if (typeof game.advanceTime === 'function') game.advanceTime(Math.max(0, Number(option.duration ?? 0.5)) * 60);
    else game._advance(Math.max(0, Number(option.duration ?? 0.5)));
    const entry = remember(game, event, option.id, result.id || 'resultado', resultText);

    if (result.next && findEvent(game, result.next.eventId)) {
      const delay = Math.max(0, Math.floor(Number(result.next.delayDays) || 0));
      if (!memory.queue.some(item => item.eventId === result.next.eventId)) memory.queue.push({ eventId: result.next.eventId, dueDay: game.state.day + delay, sourceEventId: event.id, npcId: pending.npcId || null });
    }
    memory.pending = null;
    game._journal(event.title, `${interpolate(game, option.text, pending.npcId)}. ${resultText}`, 'event', { npcId: pending.npcId, tags: event.tags || [], eventId: event.id });
    if(game.state.direction && (event.important || effects.important))game.markMemory(0);
    if (pending.npcId && game.getRelationship(pending.npcId)) {
      const rel = game.getRelationship(pending.npcId);
      if (!Array.isArray(rel.sharedHistory)) rel.sharedHistory = [];
      rel.sharedHistory.push({ day: game.state.day, title: event.title, text: resultText, kind: 'event' });
      rel.sharedHistory = rel.sharedHistory.slice(-30);
    }
    const extra = { title: event.title, dialogue: resultText, eventId: event.id, optionId: option.id, resultId: result.id || 'resultado', event: entry, effects, kind: 'event', tags: event.tags || [], npcId: pending.npcId, skipNarrative: true, moneyEarned: Math.max(0, resultMoney), moneySpent: optionCost + Math.max(0, -resultMoney), endDay: typeof game.shouldEndDay === 'function' ? game.shouldEndDay() : game.state.hour >= 23 || game.state.stats.energy <= 0 };
    return typeof game._success === 'function' ? game._success(resultText, extra) : (game.save(), { ok: true, message: resultText, ...extra });
  }

  function deferEvent(game) {
    const pending = getPendingEvent(game);
    if (!pending) return fail('No hay un encuentro pendiente.');
    if (pending.mandatory) return fail('Este imprevisto necesita una decisión antes de continuar.');
    const event = findEvent(game, pending.id);
    const text = 'Decides dejar pasar este plan. También puedes elegir a qué dedicar tu tiempo.';
    remember(game, event, 'defer', 'aplazado', text);
    story(game).pending = null;
    if (typeof game.advanceTime === 'function') game.advanceTime(Math.min(30, Math.max(0, (23 - game.state.hour) * 60)));
    else game._advance(Math.min(0.5, 23 - game.state.hour));
    game._journal(event.title, text, 'event', { npcId: pending.npcId, tags: event.tags || [], eventId: event.id });
    return typeof game._success === 'function' ? game._success(text, { kind: 'event', skipNarrative: true, eventId: event.id, title: event.title }) : (game.save(), { ok: true, message: text });
  }

  function forceEvent(game, id) {
    if (!game.state?.flags.cheats) return fail('Activa los trucos para usar la depuración narrativa.');
    const event = findEvent(game, id);
    if (!event) return fail('No existe ese evento.');
    game.state.flags.cheatsUsed = true;
    story(game).pending = pendingFrom(game, event, { kind: 'debug' });
    game.save();
    return { ok: true, message: 'Encuentro preparado en esta partida con trucos.', event: getPendingEvent(game) };
  }

  function simulateDays(sourceGame, requested = 30, seed = 1) {
    if (!sourceGame.state) return { ok: false, message: 'Primero crea una partida.' };
    const days = clamp(Math.floor(Number(requested) || 30), 1, 3650);
    const game = new sourceGame.constructor(null);
    game.data = sourceGame.data;
    game.state = JSON.parse(JSON.stringify(sourceGame.state));
    game.state.rngState = Number(seed) >>> 0;
    game.save = () => { game.lastSaveSucceeded = true; return true; };
    if (typeof game._trackBaseline === 'function') game._trackBaseline();
    const report = { ok: true, days, completedDays: 0, seed: Number(seed) >>> 0, actions: 0, distribution: {}, repetitions: { weekly: {}, repeatedWithinWeek: 0, maxPerWeek: 0 }, neverTriggered: [], statExtremes: {}, economy: { start: game.state.money, end: game.state.money, earned: 0, spent: 0, min: game.state.money, max: game.state.money, samples: [] }, history: [], errors: [] };
    const runs = {};
    for (const key of Object.keys(game.state.stats)) { report.statExtremes[key] = { atZero: 0, atHundred: 0, maxRunZero: 0, maxRunHundred: 0, ending: game.state.stats[key] }; runs[key] = { zero: 0, hundred: 0 }; }
    const paths = ['work', 'university', 'school', 'free'];
    const destinations = ['trabajo', 'universidad', 'colegio', 'plaza', 'cafeteria', 'casa'];
    const recordResult = result => {
      if (!result || !result.ok) return;
      report.actions++;
      if (!result.eventId) return;
      const event = findEvent(game, result.eventId);
      if (!event) return;
      report.distribution[event.id] = (report.distribution[event.id] || 0) + 1;
      const week = Math.floor((game.state.day - 1) / 7);
      const counts = report.repetitions.weekly[week] ||= {};
      counts[event.id] = (counts[event.id] || 0) + 1;
      if (counts[event.id] > 1) report.repetitions.repeatedWithinWeek++;
      report.repetitions.maxPerWeek = Math.max(report.repetitions.maxPerWeek, counts[event.id]);
      report.history.push({ eventId: event.id, day: game.state.day, optionId: result.optionId || 'defer', resultId: result.resultId || 'aplazado', tags: event.tags || [] });
    };
    const resolve = () => {
      for (let i = 0; i < 4; i++) {
        const pending = getPendingEvent(game);
        if (!pending) break;
        const options = pending.options.filter(option => option.available);
        if (!options.length) {
          if (!pending.mandatory) recordResult(deferEvent(game));
          else if (game.state.hour < 22.5 && game.state.stats.energy > 0) report.errors.push(`Día ${game.state.day}: ${pending.id} no ofrece una salida disponible.`);
          break;
        }
        const option = options[Math.floor(rng(game) * options.length)];
        const result = chooseEvent(game, pending.id, option.id);
        if (!result.ok) { report.errors.push(`Día ${game.state.day}: ${result.message}`); break; }
        recordResult(result);
      }
    };
    const visit = destination => {
      if (destination !== game.state.location) { const result = game.travel(destination); recordResult(result); resolve(); return result.ok; }
      return true;
    };
    const perform = id => { const result = game.performAction(id); recordResult(result); resolve(); return result.ok; };
    const meetTarget = () => {
      const primary = game.getNPC('mateo') || game.data.npcs.find(npc => !npc.family && npc.available);
      const others = game.data.npcs.filter(npc => !npc.family && npc.id !== primary?.id);
      const target = others.length && game.state.day % 3 === 0 ? game.getNPC(others[Math.floor(game.state.day / 3) % others.length].id) : primary;
      if (!target) return false;
      const destination = game.data.locations.find(location => game.getPresentNPCs(location.id, game.state.hour + (game.state.location === location.id ? 0 : 0.5)).some(npc => npc.id === target.id));
      if (!destination || !visit(destination.id)) return false;
      const rel = game.getRelationship(target.id);
      let type = 'listen';
      if (target.id === primary.id && rel.friendship >= 35 && rel.trust >= 25 && rel.romance >= 15 && !['dating', 'partner'].includes(rel.status)) type = 'askDate';
      else if (target.id === primary.id && ['dating', 'partner'].includes(rel.status) && ['plaza', 'cafeteria'].includes(game.state.location) && game.state.hour <= 20 && game.state.money >= 10 && rel.dates < 3) type = 'date';
      else if (target.id === primary.id && rel.dates >= 2 && rel.romance >= 40 && rel.trust >= 45 && rel.status !== 'partner') type = 'relationship';
      else if (target.id === primary.id && rel.friendship >= 30 && rel.trust >= 25 && rel.romance < 40 && !rel.boundary) type = 'flirt';
      else if (rel.friendship < 35) type = 'help';
      const result = game.interact(target.id, type); recordResult(result); resolve(); return result.ok;
    };

    for (let day = 0; day < days; day++) {
      const dayBefore = game.state.day;
      const moneyBefore = game.state.money;
      const chosenPath = paths[(Math.floor(day / 7) + (Number(seed) >>> 0)) % paths.length];
      if (game.state.profile.path !== chosenPath) recordResult(game.choosePath(chosenPath));
      maybeQueue(game, { kind: 'day' }); resolve();
      for (let turn = 0; turn < 12 && game.state.hour < 22 && game.state.stats.energy > 0; turn++) {
        resolve();
        if (getPendingEvent(game)?.mandatory) break;
        const pendingMessage = (game.state.messages || []).find(message => !message.answered);
        if (pendingMessage && typeof game.replyMessage === 'function' && turn === 0) { recordResult(game.replyMessage(pendingMessage.id, 'warm')); resolve(); }
        if (game.state.hour >= 22 || game.state.stats.energy <= 0) break;
        if (game.state.stats.energy < 22) { if (visit('casa')) perform('descanso'); continue; }
        if (game.state.stats.health < 52 && game.state.money >= 6) { if (visit('casa')) perform('comer_casa'); continue; }
        if (game.state.stats.stress > 62) { if (visit('plaza')) perform('pasear_plaza'); continue; }
        if (game.state.money < 55 && game.state.hour <= 20) { if (visit('trabajo')) perform('trabajar_freelance'); continue; }
        if (turn % 3 === 0 && meetTarget()) continue;
        const destination = destinations[(day + turn + (Number(seed) >>> 0)) % destinations.length];
        if (!visit(destination)) break;
        const location = game.data.locations.find(item => item.id === destination);
        const options = location.actions.filter(action => (!action.path || action.path === chosenPath) && action.duration + game.state.hour <= 23 && (action.cost || 0) <= game.state.money && -(action.effects?.energy || 0) <= game.state.stats.energy);
        const fitting = options.filter(action => !(game.isWeekend() && action.path && /clase|turno/.test(action.id)));
        if (!fitting.length) continue;
        const selected = fitting[Math.floor(rng(game) * fitting.length)];
        if (!perform(selected.id) && game.state.hour >= 21) break;
      }
      resolve();
      for (const goal of game.getGoals()) if (goal.complete && !goal.claimed) recordResult(game.claimGoal(goal.id));
      const ledger = game.state.ledger || {};
      for (const [key, value] of Object.entries(game.state.stats)) {
        const stats = report.statExtremes[key];
        if (value === 0) { stats.atZero++; runs[key].zero++; } else runs[key].zero = 0;
        if (value === 100) { stats.atHundred++; runs[key].hundred++; } else runs[key].hundred = 0;
        stats.maxRunZero = Math.max(stats.maxRunZero, runs[key].zero); stats.maxRunHundred = Math.max(stats.maxRunHundred, runs[key].hundred); stats.ending = value;
      }
      const result = game.sleep();
      if (!result.ok || game.state.day !== dayBefore + 1) { report.errors.push(`El día ${dayBefore} no pudo terminar: ${result.message}`); break; }
      const summary = result.summary || ledger;
      report.economy.earned += Number(summary.earned) || Math.max(0, game.state.money - moneyBefore);
      report.economy.spent += Number(summary.spent) || Math.max(0, moneyBefore - game.state.money);
      report.economy.min = Math.min(report.economy.min, game.state.money); report.economy.max = Math.max(report.economy.max, game.state.money);
      report.economy.samples.push(game.state.money);
      report.completedDays++;
    }
    report.economy.end = game.state.money;
    report.neverTriggered = events(game).filter(event => !report.distribution[event.id]).map(event => event.id);
    report.finalDay = game.state.day;
    report.finalRelationships = Object.fromEntries(Object.entries(game.state.relationships).filter(([, rel]) => ['partner', 'friend', 'rival'].includes(rel.status)).map(([id, rel]) => [id, { status: rel.status, friendship: rel.friendship, trust: rel.trust }]));
    return report;
  }

  const api = { maybeQueue, getPendingEvent, chooseEvent, getEventWeights, forceEvent, deferEvent, simulateDays, evaluateRequirements: requirements, resultWeight };
  root.Vinculos = root.Vinculos || {};
  root.Vinculos.Narrative = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
