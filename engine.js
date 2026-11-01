/* Vínculos — motor de simulación, sin dependencias ni acceso al DOM. */
(function (root) {
  'use strict';

  const SAVE_KEY = 'vinculos-save-v1';
  const LEGACY_BACKUP_KEY = 'vinculos-save-v1-backup';
  const PATHS = ['school', 'university', 'work', 'free'];
  const STATS = ['energy', 'mood', 'health', 'social', 'knowledge', 'charm', 'responsibility', 'stress'];
  const COUNTERS = ['social', 'study', 'work', 'friend', 'date'];
  const STATUS = ['family', 'acquaintance', 'friend', 'dating', 'partner', 'coworker', 'rival'];
  const ACHIEVEMENTS = [
    { id: 'first_friend', title: 'Alguien con quien contar', description: 'Construye una amistad.', check: s => s.counters.friend >= 1 },
    { id: 'first_date', title: 'Un encuentro especial', description: 'Comparte tu primera cita.', check: s => s.counters.date >= 1 },
    { id: 'week', title: 'A tu ritmo', description: 'Vive siete días.', check: s => s.day >= 8 },
    { id: 'learner', title: 'Siempre aprendiendo', description: 'Dedica diez momentos al estudio.', check: s => s.counters.study >= 10 },
    { id: 'steady_work', title: 'Construir un camino', description: 'Completa cinco jornadas o encargos.', check: s => s.counters.work >= 5 },
    { id: 'family_care', title: 'El lugar al que volver', description: 'Cuida la confianza de cinco familiares.', check: s => Object.values(s.relationships).filter(r => r.status === 'family' && r.trust >= 85).length >= 5 },
    { id: 'year', title: 'Una vuelta al sol', description: 'Completa un año de tu historia.', check: s => s.day >= 361 }
  ];
  const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));
  const isObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const cleanText = (value, fallback = '', length = 160) => typeof value === 'string' ? value.trim().slice(0, length) : fallback;
  const fail = message => ({ ok: false, message });
  const freshCasual = () => ({ expectations: 'unknown', attraction: 0, encounters: 0, lastEncounterDay: 0, history: [] });
  const NIGHT_ACTIONS = ['offerDrink', 'danceTogether', 'talkExpectations', 'casualFlirt', 'oneNight', 'sayGoodbye', 'exchangeContact', 'declineCasual'];

  class LifeGame {
    constructor(storage) {
      this.data = root.VINCULOS_DATA || { locations: [], npcs: [], goals: [], traits: [] };
      this.state = null;
      this.lastSaveSucceeded = true;
      this.loadError = null;
      this.corruptSave = false;
      this._trackedSnapshot = null;
      this._legacyMigrationText = null;
      try { this.storage = storage === undefined ? root.localStorage : storage; }
      catch (_) { this.storage = null; }
    }

    _profile(input = {}) {
      const validTraits = new Set((this.data.traits || []).map(trait => trait.id));
      return {
        name: cleanText(input.name, 'Alex', 32) || 'Alex',
        lastName: cleanText(input.lastName, 'Rivera', 40),
        age: Math.round(clamp(Number(input.age) || 19, 18, 80)),
        pronouns: cleanText(input.pronouns, 'elle', 20),
        gender: ['female', 'male', 'nonbinary'].includes(input.gender) ? input.gender : 'nonbinary',
        skin: /^#[a-f\d]{6}$/i.test(input.skin || '') ? input.skin : '#dca67d',
        hair: /^#[a-f\d]{6}$/i.test(input.hair || '') ? input.hair : '#43332c',
        hairStyle: ['short', 'long', 'curly', 'bob'].includes(input.hairStyle) ? input.hairStyle : 'curly',
        outfit: /^#[a-f\d]{6}$/i.test(input.outfit || '') ? input.outfit : '#739486',
        traitIds: [...new Set(Array.isArray(input.traitIds) ? input.traitIds.filter(id => validTraits.has(id)) : [])].slice(0, 2),
        path: PATHS.includes(input.path) ? input.path : 'university'
      };
    }

    _seed() {
      try { if (root.crypto && root.crypto.getRandomValues) return root.crypto.getRandomValues(new Uint32Array(1))[0]; } catch (_) { /* El reloj permite arrancar también desde archivos locales. */ }
      return (Date.now() ^ Math.imul(Date.now() % 65536, 2654435761)) >>> 0;
    }

    random() {
      this.state.rngState = (this.state.rngState + 0x6D2B79F5) >>> 0;
      let value = this.state.rngState;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    }

    _birthday(id) {
      let hash = 2166136261;
      for (const letter of id) hash = Math.imul(hash ^ letter.charCodeAt(0), 16777619) >>> 0;
      return hash % 360 + 1;
    }

    getCalendar(day = this.state ? this.state.day : 1) {
      const dayOfYear = ((Math.max(1, Math.floor(day)) - 1) % 360) + 1;
      const seasonIndex = Math.floor((dayOfYear - 1) / 90);
      const monthIndex = Math.floor((dayOfYear - 1) / 30);
      const months = ['Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre', 'Enero', 'Febrero'];
      const special = [];
      const festivals = { 1: 'Fiesta de la primavera', 91: 'Fiesta del sol', 181: 'Feria de otoño', 271: 'Encuentro de invierno', 360: 'Despedida del año' };
      if (festivals[dayOfYear]) special.push({ id: `festival_${dayOfYear}`, title: festivals[dayOfYear] });
      for (const npc of this.data.npcs.concat(this.state ? this.state.family.children : [])) {
        if ((npc.birthDay || npc.birthday?.day || this._birthday(npc.id)) === dayOfYear) special.push({ id: 'birthday', title: `Cumpleaños de ${npc.name}`, npcId: npc.id });
      }
      if (this.state && this.state.birthDay === dayOfYear) special.push({ id: 'birthday', title: 'Tu cumpleaños', npcId: 'player' });
      for(const e of this.data.calendarEvents || [])if(dayOfYear>=e.from&&dayOfYear<=e.to)special.push({id:e.id,title:e.title});
      return { year: Math.floor((day - 1) / 360) + 1, dayOfYear, season: ['primavera', 'verano', 'otoño', 'invierno'][seasonIndex], seasonDay: (dayOfYear - 1) % 90 + 1, dayOfMonth: (dayOfYear - 1) % 30 + 1, month: months[monthIndex], dateLabel: `${(dayOfYear - 1) % 30 + 1} de ${months[monthIndex].toLowerCase()}`, special };
    }

    getAge() { return this.state.profile.age + Math.floor((this.state.day + 360 - this.state.birthDay) / 360) - (this.state.birthDay === 1 ? 1 : 0); }
    getLifeStage() { if(this.state.direction)return this._system('stage');const age = this.getAge(); return age < 25 ? 'juventud' : age < 40 ? 'adultez_temprana' : age < 65 ? 'adultez' : 'madurez'; }
    shouldEndDay() { return !!this.state && (this.state.hour >= 23 || this.state.stats.energy <= 0); }

    _hydrateV2(state, seed) {
      state.version = 2;
      state.savedAt = 0;
      state.rngState = Number.isInteger(seed) ? seed >>> 0 : this._seed();
      state.birthDay = this._birthday('player');
      state.lifeStage = state.profile.age < 25 ? 'juventud' : state.profile.age < 40 ? 'adultez_temprana' : state.profile.age < 65 ? 'adultez' : 'madurez';
      state.narrative = { history: [], queue: [], pending: null, flags: {}, recentTags: [], counts: {} };
      state.messages = [];
      state.npcStates = {};
      for (const npc of this.data.npcs) state.npcStates[npc.id] = { movedTo: null, awayUntil: 0, mood: 60, needs: { support: 50, space: 50 }, history: [] };
      state.family = { support: 65, tension: 15, expenses: 0, children: [] };
      state.achievements = [];
      state.dayStart = { stats: { ...state.stats }, money: state.money, relationships: Object.fromEntries(Object.entries(state.relationships).map(([id, rel]) => [id, { friendship: rel.friendship, trust: rel.trust, romance: rel.romance }])), counters: { ...state.counters } };
      state.ledger = { earned: 0, spent: 0, actions: [] };
      state.summaries = [];
      state.career = {level:0,experience:0,promotions:[],lastRequestDay:0};
      for (const relationship of Object.values(state.relationships)) if (!relationship.casual) relationship.casual = freshCasual();
      return state;
    }

    _beginDay() {
      this.state.dayStart = { stats: { ...this.state.stats }, money: this.state.money, relationships: Object.fromEntries(Object.entries(this.state.relationships).map(([id, rel]) => [id, { friendship: rel.friendship, trust: rel.trust, romance: rel.romance }])), counters: { ...this.state.counters } };
      this.state.ledger = { earned: 0, spent: 0, actions: [] };
    }

    _trackBaseline() {
      this._trackedSnapshot = this.state ? { day: this.state.day, money: this.state.money } : null;
    }

    _recordMutation(message, extra) {
      if (!this.state.ledger || !this._trackedSnapshot || this._trackedSnapshot.day !== this.state.day) return;
      const delta = this.state.money - this._trackedSnapshot.money;
      if (finite(extra.moneyEarned) || finite(extra.moneySpent)) {
        this.state.ledger.earned += Math.max(0, extra.moneyEarned || 0);
        this.state.ledger.spent += Math.max(0, extra.moneySpent || 0);
      } else {
        if (delta > 0) this.state.ledger.earned += delta;
        if (delta < 0) this.state.ledger.spent -= delta;
      }
      if (extra.kind !== 'day') this.state.ledger.actions.push({ hour: this.state.hour, text: cleanText(message, '', 800), kind: extra.kind || 'life' });
      this.state.ledger.actions = this.state.ledger.actions.slice(-80);
    }

    getDaySummary() {
      if (!this.state) return null;
      const start = this.state.dayStart;
      const statChanges = Object.fromEntries(STATS.map(key => [key, this.state.stats[key] - start.stats[key]]));
      const relationshipChanges = Object.entries(this.state.relationships).map(([npcId, relationship]) => ({ npcId, name: this.getNPC(npcId)?.name || npcId, friendship: relationship.friendship - (start.relationships[npcId]?.friendship || 0), trust: relationship.trust - (start.relationships[npcId]?.trust || 0), romance: relationship.romance - (start.relationships[npcId]?.romance || 0) })).filter(change => change.friendship || change.trust || change.romance);
      const featured = this.state.narrative.history.filter(item => item.day === this.state.day).slice(-1)[0];
      return { day: this.state.day, year: this.getCalendar().year, dateLabel: this.getCalendar().dateLabel, stats: statChanges, statChanges, earned: this.state.ledger.earned, spent: this.state.ledger.spent, moneyChange: this.state.money - start.money, actions: this.state.ledger.actions.map(action => action.text), relationshipChanges, sustainability: this.state.life?.lastWarning || '', highlight: featured ? featured.title || featured.text : relationshipChanges.length ? 'Dedicaste tiempo a tus vínculos.' : 'Cada día también deja espacio para empezar de nuevo.' };
    }

    getAnnualSummary(year = this.getCalendar().year) {
      if(this.state.life?.annual){const a=this.state.life.annual[String(year)] || {days:0,earned:0,spent:0,events:0};return {...a,year:Number(year),text:`En el año ${year} guardaste ${a.days} días de historia y ${a.events} encuentros. Tus ingresos fueron ${Math.round(a.earned)} € y las salidas de caja ${Math.round(a.spent)} €. Los recuerdos que elegiste conservan tu mirada sobre lo vivido.`};}
      const days = this.state.summaries.filter(summary => summary.year === Number(year));
      const entries = this.state.journal.filter(entry => this.getCalendar(entry.day).year === Number(year));
      return { year: Number(year), days: days.length, earned: days.reduce((sum, day) => sum + day.earned, 0), spent: days.reduce((sum, day) => sum + day.spent, 0), events: this.state.narrative.history.filter(entry => this.getCalendar(entry.day).year === Number(year)).length, text: `En el año ${year} dejaste ${entries.length} recuerdos en el diario, compartiste ${days.reduce((sum, day) => sum + day.relationshipChanges.length, 0)} momentos que cambiaron tus vínculos y seguiste escribiendo tu historia.` };
    }

    _unlockAchievements() {
      if (this.state.flags.cheatsUsed) return;
      for (const achievement of ACHIEVEMENTS) if (!this.state.achievements.includes(achievement.id) && achievement.check(this.state)) this.state.achievements.push(achievement.id);
    }
    getAchievements() { return ACHIEVEMENTS.map(({ check, ...achievement }) => ({ ...achievement, unlocked: this.state.achievements.includes(achievement.id), disabled: this.state.flags.cheatsUsed })); }

    advanceTime(minutes) {
      if (!finite(minutes) || minutes < 0) return fail('El tiempo indicado no es válido.');
      const check = this._timeCheck(minutes / 60);
      if (check) return check;
      this._advance(minutes / 60);
      return { ok: true, message: 'El tiempo avanza.' };
    }

    applyEffects(effects = {}) {
      this._effects({ ...effects.stats, ...(finite(effects.money) ? { money: effects.money } : {}) });
      for (const [id, changes] of Object.entries(effects.relationships || {})) { const target=id==='$partner'?this.data.npcs.find(n=>this.getRelationship(n.id).status==='partner')?.id:id==='$affair'?this.state.narrative.flags.affair_target:id;const npc = this.getNPC(target); if (npc) this._updateRelationship(npc, changes); }
      if(effects.breakupPartner){for(const n of this.data.npcs){const r=this.getRelationship(n.id);if(r.status==='partner'){r.status=r.friendship>=40?'friend':'acquaintance';r.romance=0;r.dates=0;}}}
      for (const key of ['support', 'tension']) if (finite(effects.family && effects.family[key])) this.state.family[key] = clamp(this.state.family[key] + effects.family[key]);
      if (finite(effects.family && effects.family.expenses)) this.state.family.expenses = clamp(this.state.family.expenses + effects.family.expenses, 0, 1000000);
      for (const [id, changes] of Object.entries(effects.npcStates || {})) {
        const dynamic = this.state.npcStates[id];
        if (!dynamic || !isObject(changes)) continue;
        if (finite(changes.mood)) dynamic.mood = clamp(dynamic.mood + changes.mood);
        for (const key of ['support', 'space']) if (finite(changes.needs && changes.needs[key])) dynamic.needs[key] = clamp(dynamic.needs[key] + changes.needs[key]);
        if (changes.movedTo === null || this.data.locations.some(location => location.id === changes.movedTo)) dynamic.movedTo = changes.movedTo;
        if (finite(changes.awayUntil)) dynamic.awayUntil = Math.max(this.state.day, Math.floor(changes.awayUntil));
      }
      for (const [key, value] of Object.entries(effects.flags || {})) if (!['__proto__', 'constructor', 'prototype'].includes(key) && (typeof value === 'boolean' || typeof value === 'string' || finite(value))) this.state.narrative.flags[key] = value;
      if(this.state.direction)this._system('applyEffects',[effects]);
      return { ok: true, message: 'Tu decisión deja huella.' };
    }

    _system(method,args=[]) {const m=root.Vinculos?.LifeSystems;return m&&typeof m[method]==='function'?m[method](this,...args):undefined;}
    getEconomy(){return this._system('get',['economy']);}
    getEmployment(){return this._system('get',['employment']);}
    getSkills(){return this._system('get',['skills'])||[];}
    getHome(){return this._system('get',['home']);}
    getPet(){return this._system('get',['pet']);}
    getWorld(){return this._system('get',['world']);}
    lifeAction(type,payload={}){return this._system('action',[type,payload])||fail('Este sistema no está disponible.');}
    changeAspirations(ids){return this._system('changeAspirations',[ids]);}
    getLegacy(){return this._system('legacy');}
    reviewLegacy(){return this._system('reviewLegacy');}
    getMemories(){return this.state.direction?.memories||[];}
    markMemory(index){return this._system('memories',[index]);}
    getTutorial(){return {...this.state.direction?.tutorial,steps:this.data.tutorialSteps||[]};}
    tutorialAction(action){return this._system('tutorial',[action]);}
    setDifficulty(id){if(!this.data.difficulties?.some(d=>d.id===id))return fail('Elige una dificultad válida.');this.state.direction.settings.difficulty=id;return this._success('Has ajustado el ritmo de la partida.');}
    setPreferences(input){if(!input||typeof input!=='object'||Object.keys(input).some(k=>!['audioEnabled','volume'].includes(k))||input.volume!==undefined&&(!finite(input.volume)||input.volume<0||input.volume>1)||input.audioEnabled!==undefined&&typeof input.audioEnabled!=='boolean')return fail('Los ajustes no son válidos.');Object.assign(this.state.direction.settings,input);this.save();return {ok:true,message:'Preferencias guardadas.'};}
    getTrends(){return this.state.life?.history||[];}

    _narrativeCall(method, args = []) { const module = root.Vinculos && root.Vinculos.Narrative; return module && typeof module[method] === 'function' ? module[method](this, ...args) : method === 'getPendingEvent' ? null : fail('No hay un evento disponible.'); }
    getPendingEvent() { return this._narrativeCall('getPendingEvent'); }
    chooseEvent(eventId, optionId) { return this._narrativeCall('chooseEvent', [eventId, optionId]); }
    getEventWeights() { return this._narrativeCall('getEventWeights'); }
    forceEvent(id) { return this._narrativeCall('forceEvent', [id]); }
    simulateDays(days, seed) { return this._narrativeCall('simulateDays', [days, seed]); }
    deferEvent() { return this._narrativeCall('deferEvent'); }
    _eventBlock(allowRest = false) {
      const pending = this.getPendingEvent();
      if (!pending || !pending.mandatory) return null;
      if (allowRest && !pending.options.some(option => option.available)) return null;
      return fail(pending.options.some(option => option.available) ? 'Hay un imprevisto pendiente. Elige cómo afrontarlo antes de continuar.' : 'No queda tiempo o energía para resolver este imprevisto. Descansa y retómalo mañana.');
    }

    create(profile, options = {}) {
      const relationships = {};
      for (const npc of this.data.npcs) {
        relationships[npc.id] = {
          friendship: npc.family ? 65 : 10,
          romance: 0,
          trust: npc.family ? 70 : 10,
          status: npc.family ? 'family' : 'acquaintance',
          dates: 0,
          boundary: false,
          lastMet: 0,
          friendMilestone: false,
          sharedHistory: [], conflict: 0, casual: freshCasual()
        };
      }
      this.state = {
        version: 2,
        profile: this._profile(profile),
        day: 1,
        hour: 9,
        location: 'casa',
        money: 120,
        stats: { energy: 85, mood: 75, health: 90, social: 45, knowledge: 30, charm: 35, responsibility: 45, stress: 15 },
        personality: { empathy: 50, confidence: 50, discipline: 50, creativity: 50, sociability: 50 },
        relationships,
        journal: [],
        counters: { social: 0, study: 0, work: 0, friend: 0, date: 0 },
        claimedGoals: [],
        flags: { cheats: false, cheatsUsed: false, storageNoticeSeen: false },
        daily: { interactions: {}, actions: {}, workHours: 0, gifts: {} }
      };
      this._hydrateV2(this.state, options.seed);
      this._system('hydrate',[this.state,{profile,...options}]);
      const traitPersonality = { empatia: 'empathy', creatividad: 'creativity', sociabilidad: 'sociability', ambicion: 'discipline', curiosidad: 'confidence', serenidad: 'confidence' };
      for (const id of this.state.profile.traitIds) if (traitPersonality[id]) this._personality(traitPersonality[id], 12);
      this._journal('Una vida por escribir', 'Llegas a tu nuevo comienzo con 120 € y muchas posibilidades. Tú decides qué relaciones y proyectos cuidar.', 'milestone');
      this._beginDay();
      this._trackBaseline();
      this.save();
      return this.state;
    }

    save() {
      if (!this.state) return false;
      // Un guardado dañado se conserva hasta que el jugador importe o reinicie expresamente.
      if (this.corruptSave) { this.lastSaveSucceeded = false; return false; }
      try {
        if (!this.storage || typeof this.storage.setItem !== 'function') { this.lastSaveSucceeded = false; return false; }
        if (this._legacyMigrationText !== null) {
          // Primero conservamos el original; un error de cuota nunca reemplaza la partida antigua.
          this.storage.setItem(LEGACY_BACKUP_KEY, this._legacyMigrationText);
          this._legacyMigrationText = null;
        }
        this.state.savedAt = Date.now();
        this.storage.setItem(SAVE_KEY, JSON.stringify(this.state));
        this.lastSaveSucceeded = true;
        return true;
      } catch (_) { this.lastSaveSucceeded = false; return false; }
    }

    load() {
      this.loadError = null;
      this.corruptSave = false;
      this._legacyMigrationText = null;
      let text;
      try {
        text = this.storage && this.storage.getItem(SAVE_KEY);
      } catch (_) {
        this.loadError = 'El navegador no permite leer el guardado local. Puedes jugar y exportar tu partida.';
        return false;
      }
      if (!text) return false;
      try {
        const input = JSON.parse(text);
        const state = this._validatedState(input);
        this.state = state;
        this._trackBaseline();
        if (input.version < state.version) {
          this._legacyMigrationText = text;
          if (!this.save()) this.loadError = 'Tu partida antigua se ha abierto de forma segura, pero no se pudo guardar la actualización. El original se conserva; libera espacio o exporta una copia.';
        }
        return true;
      } catch (_) {
        this.corruptSave = true;
        this.loadError = 'El guardado local está dañado o no es compatible. Se ha conservado: importa una copia válida o reinicia la partida para volver a guardar.';
        return false;
      }
    }

    reset() {
      try { if (this.storage) this.storage.removeItem(SAVE_KEY); } catch (_) { /* La sesión sigue siendo reiniciable sin almacenamiento. */ }
      this.state = null;
      this.loadError = null;
      this.corruptSave = false;
      this._trackedSnapshot = null;
      this._legacyMigrationText = null;
      return { ok: true, message: 'Partida reiniciada.' };
    }

    getNPC(id) {
      const npc = this.data.npcs.find(person => person.id === id) || (this.state && this.state.family.children.find(person => person.id === id));
      if (!npc) return null;
      if (!this.state) return npc;
      const dynamic = this.state.npcStates[id] || {};
      const birthday = npc.birthDay || npc.birthday?.day || this._birthday(id);
      const elapsed = npc.child ? Math.floor((this.state.day - npc.bornOn) / 360) : Math.floor((this.state.day + 360 - birthday) / 360) - (birthday === 1 ? 1 : 0);
      return { ...npc, age: npc.child ? Math.max(0, elapsed) : npc.age + elapsed, mood: dynamic.mood ?? 60, needs: { support: 50, space: 50, ...(dynamic.needs || {}) }, movedTo: dynamic.movedTo || null, birthDay: birthday };
    }
    getRelationship(id) { return this.state && this.state.relationships[id] || null; }
    getLocationAvailability(id, hour = this.state ? this.state.hour : 9) {
      const place = this.data.locations.find(location => location.id === id);
      if (!place) return { open: false, reason: 'Ese lugar no existe.', opensAt: 9, closesAt: 23 };
      const opensAt = finite(place.opensAt) ? place.opensAt : 9;
      const closesAt = finite(place.closesAt) ? place.closesAt : 23;
      const open = finite(hour) && hour >= opensAt && hour < closesAt;
      const time = value => `${String(Math.floor(value)).padStart(2, '0')}:${String(Math.round(value * 60) % 60).padStart(2, '0')}`;
      const base={ open, opensAt, closesAt, reason: open ? '' : hour < opensAt ? `${place.name} abre a las ${time(opensAt)}.` : `${place.name} ha cerrado. Vuelve mañana entre las ${time(opensAt)} y las ${time(closesAt)}.` };
      return this.state?.direction?this._system('availability',[id,base]):base;
    }

    waitUntilOpening(id) {
      if (!this.state) return fail('Crea tu personaje para comenzar.');
      const blocked = this._eventBlock(); if (blocked) return blocked;
      const place = this.data.locations.find(location => location.id === id);
      if (!place) return fail('Ese lugar no existe.');
      const arrival = this.state.hour + (this.state.location === id ? 0 : 0.5);
      const availability = this.getLocationAvailability(id, arrival);
      if (availability.open) return fail('El lugar ya estará abierto cuando llegues. Puedes ir ahora.');
      if (arrival >= availability.closesAt || arrival >= availability.opensAt) return fail('Hoy ya no puedes esperar a su apertura. Elige otro plan o vuelve mañana.');
      const target = availability.opensAt - (this.state.location === id ? 0 : 0.5);
      const duration = target - this.state.hour;
      if (duration <= 0 || target > 23) return fail('No hace falta esperar o ya no queda tiempo hoy.');
      const energy = Math.ceil(duration * 2);
      const check = this._timeCheck(duration, energy); if (check) return check;
      this._advance(duration); this._effects({ energy: -energy });
      const message = `Dejas pasar ${Number(duration.toFixed(2)).toLocaleString('es-ES')} horas antes de salir hacia ${place.name}. La espera consume ${energy} de energía; sigues en el mismo lugar.`;
      this._journal('Esperar a la apertura', message, 'life', { tags: ['planes', 'noche'] });
      return this._success(message, { kind: 'action', actionId: 'waitOpening', duration, locationId: id });
    }
    getClock() {
      if (!this.state) return '09:00';
      const minutes = Math.round(this.state.hour * 60);
      return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    }
    getWeekday() { return ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][((this.state ? this.state.day : 1) - 1) % 7]; }
    isWeekend() { return this.state ? (this.state.day - 1) % 7 >= 5 : false; }

    getPresentNPCs(location, hour = this.state ? this.state.hour : 9) {
      if (!this.state) return [];
      const destination = location || this.state.location;
      if (!finite(hour)) hour = this.state.hour;
      if (!this.getLocationAvailability(destination, hour).open) return [];
      return this.data.npcs.concat(this.state.family.children).filter((npc, index) => {
        const dynamic = this.state.npcStates[npc.id];
        if (dynamic && dynamic.awayUntil > this.state.day) return false;
        if(npc.child)return destination==='casa';
        if(npc.family)return destination===(this.state.life&&this.state.life.home.type!=='familiar'?'casa_familiar':'casa');
        if(this.state.life?.home.roommateId===npc.id&&hour>=18)return destination==='casa';
        const locations = npc.locations && npc.locations.length ? npc.locations : [npc.home || 'plaza'];
        let current = npc.home || locations[0];
        if (hour < 12) current = locations[0];
        else if (hour < 17) current = locations.length > 1 ? locations[1] : locations[0];
        else current = locations[(this.state.day + index) % locations.length];
        if (this.isWeekend() && ['trabajo', 'colegio', 'universidad'].includes(current)) {
          current = locations.find(id => ['plaza', 'cafeteria'].includes(id)) || 'plaza';
        }
        if (dynamic && dynamic.movedTo) current = dynamic.movedTo;
        if (npc.nightHome && hour >= (npc.nightStartsAt || 18) && !npc.family && npc.age >= 18) current = npc.nightHome;
        if (!this.getLocationAvailability(current, hour).open) current = locations.find(id => this.getLocationAvailability(id, hour).open) || 'plaza';
        return current === destination;
      }).map(npc => this.getNPC(npc.id));
    }

    _journal(title, text, kind = 'life', meta = {}) {
      this.state.journal.unshift({ day: this.state.day, hour: this.state.hour, title, text, kind, npcId: meta.npcId || null, tags: Array.isArray(meta.tags) ? meta.tags.slice(0, 8) : [kind], eventId: meta.eventId || null });
      this.state.journal = this.state.journal.slice(0, 1000);
    }

    _effects(effects) {
      for (const [key, value] of Object.entries(effects || {})) {
        if (!finite(value)) continue;
        if (key === 'money') this.state.money = Math.round(clamp(this.state.money + value, 0, 99999999));
        else if (STATS.includes(key)) {
          // Las habilidades maduras siguen creciendo, pero necesitan práctica y mantenimiento.
          const current = this.state.stats[key];
          const diminishing = value > 0 && !['energy', 'stress'].includes(key) && current > 60 ? Math.pow((100 - current) / 40, 1.4) : 1;
          this.state.stats[key] = Math.round(clamp(current + Math.round(value * diminishing)));
        }
      }
    }

    _personality(key, amount) {
      if (key in this.state.personality) this.state.personality[key] = Math.round(clamp(this.state.personality[key] + amount));
    }

    _timeCheck(duration = 1, energy = 0) {
      if (!this.state) return fail('Crea tu personaje para comenzar.');
      if (this.state.hour + duration > 23) return fail('Ya es tarde. Duerme para comenzar un nuevo día.');
      if (energy > 0 && this.state.stats.energy < energy) return fail('Te falta energía. Descansa en casa, come algo o duerme.');
      return null;
    }

    _advance(duration) { this.state.hour = Math.round((this.state.hour + duration) * 60) / 60; }

    _success(message, extra = {}) {
      if(this.state.direction)this._system('afterAction',[extra]);
      this._recordMutation(message, extra);
      this._unlockAchievements();
      if (!extra.skipNarrative && ['travel', 'action', 'social', 'day'].includes(extra.kind)) {
        const narrative = root.Vinculos && root.Vinculos.Narrative;
        if (narrative && typeof narrative.maybeQueue === 'function') narrative.maybeQueue(this, { ...extra, message });
      }
      this.save();
      this._trackBaseline();
      return { ok: true, message, ...extra };
    }

    travel(id) {
      if (!this.state) return fail('Crea tu personaje para comenzar.');
      const pending = this._eventBlock();
      if (pending) return pending;
      const location = this.data.locations.find(place => place.id === id);
      if (!location) return fail('Ese lugar no existe.');
      if (this.state.location === id) return fail('Ya estás aquí.');
      const check = this._timeCheck(0.5,this.state.direction?this._system('get',['travel']):2);
      if (check) return check;
      const availability = this.getLocationAvailability(id, this.state.hour + 0.5);
      if (!availability.open) return fail(availability.reason);
      this.state.location = id;
      this._advance(0.5);
      this._effects({ energy: -2, stress: -1 });
      return this._success(`Llegas a ${location.name}. El trayecto ha tomado 30 minutos.`, { title: location.name, kind: 'travel', locationId: id });
    }

    performAction(id) {
      if (!this.state) return fail('Crea tu personaje para comenzar.');
      const pending = this._eventBlock();
      if (pending) return pending;
      const location = this.data.locations.find(place => place.id === this.state.location);
      const action = location && location.actions.find(item => item.id === id);
      if (!action) return fail('Esa actividad no está disponible aquí.');
      if (action.path && this.state.profile.path !== action.path) {
        const labels = { school: 'colegio', university: 'universidad', work: 'trabajo' };
        return fail(`Esta actividad requiere la ruta de ${labels[action.path] || action.path}. Puedes cambiar tu rumbo desde «Mi personaje».`);
      }
      const duration = Number(action.duration) || 1;
      const effects = action.effects || {};
      const energyCost = Math.max(0, -(effects.energy || 0));
      const check = this._timeCheck(duration, energyCost);
      if (check) return check;
      const availability = this.getLocationAvailability(location.id);
      if (!availability.open) return fail(availability.reason);
      if (this.state.hour + duration > availability.closesAt) return fail('Esta actividad no termina antes del cierre. Elige un plan más corto.');
      const cost = Math.max(0, Number(action.cost) || 0);
      if (this.state.money < cost) return fail(`Necesitas ${cost} € para esta actividad.`);
      const isWork = action.path === 'work' || /trabajar|turno|work|shift/.test(id);
      const isStudy = /estudi|clase|biblioteca|study|lecture/.test(id);
      if (isWork && this.state.daily.workHours + duration > 8) return fail('Ya completaste tu jornada. Mañana podrás hacer otro turno.');
      if (action.path === 'work' && this.isWeekend()) return fail('La oficina cierra el fin de semana. Puedes aceptar un encargo independiente o aprovechar para descansar.');
      if (action.path && ['school', 'university'].includes(action.path) && this.isWeekend() && /clase|lecture/.test(id)) return fail('Hoy no hay clases. Puedes estudiar por tu cuenta o disfrutar tu tiempo libre.');
      const repeats = this.state.daily.actions[id] || 0;
      if (repeats >= 4 && energyCost > 0) return fail('Hoy ya has dedicado bastante tiempo a esto. Prueba otra actividad o vuelve mañana.');
      this.state.money -= cost;
      const appliedEffects = { ...effects };
      if(id==='trabajar_turno' && this.state.career.level)appliedEffects.money=Math.round(effects.money*(1+this.state.career.level*0.25));
      if (this.state.profile.traitIds.includes('curiosidad') && (appliedEffects.knowledge || 0) > 0) appliedEffects.knowledge += 2;
      if (this.state.profile.traitIds.includes('ambicion') && isWork) appliedEffects.responsibility = (appliedEffects.responsibility || 0) + 2;
      if (this.state.profile.traitIds.includes('serenidad')) appliedEffects.stress = (appliedEffects.stress || 0) - 2;
      if (repeats >= 2) {
        for (const key of ['knowledge', 'charm', 'social', 'responsibility']) {
          if ((appliedEffects[key] || 0) > 0) appliedEffects[key] = Math.max(1, Math.round(appliedEffects[key] * 0.5));
        }
      }
      this._effects(appliedEffects);
      this._advance(duration);
      this.state.daily.actions[id] = repeats + 1;
      if (isStudy) { this.state.counters.study++; this._personality('discipline', 2); }
      if (isWork) { this.state.career.experience+=Math.round(duration*3);this.state.counters.work++; this.state.daily.workHours += duration; this._personality('discipline', 2); }
      if (/crea|arte|pint|escrib/.test(id)) this._personality('creativity', 3);
      this._journal(action.label, `${action.description}${isWork && effects.money ? ` Ganaste ${appliedEffects.money} €.` : ''}`, isWork ? 'work' : isStudy ? 'study' : 'life');
      return this._success(`${action.label}: ${action.description}`, { title: action.label, kind: 'action', actionId: id });
    }

    _updateRelationship(npc, changes) {
      const relationship = this.state.relationships[npc.id];
      const wasFriend = relationship.friendship >= 40;
      for (const key of ['friendship', 'romance', 'trust']) {
        if (finite(changes[key])) relationship[key] = Math.round(clamp(relationship[key] + changes[key]));
      }
      if (npc.family) { relationship.romance = 0; relationship.status = 'family'; }
      else if (!['dating', 'partner'].includes(relationship.status)) {
        if (relationship.friendship < 15 && relationship.trust < 15 && (changes.friendship < 0 || changes.trust < 0 || relationship.status === 'rival')) relationship.status = 'rival';
        else if (relationship.friendship >= 40) relationship.status = 'friend';
        else if (relationship.status === 'rival' && relationship.friendship >= 25 && relationship.trust >= 25) relationship.status = 'acquaintance';
        else if (relationship.status !== 'rival') relationship.status = npc.locations?.includes('trabajo') && this.state.profile.path === 'work' ? 'coworker' : 'acquaintance';
      }
      if (finite(changes.conflict)) relationship.conflict = clamp((relationship.conflict || 0) + changes.conflict);
      if (!npc.family && !wasFriend && relationship.friendship >= 40 && !relationship.friendMilestone) {
        this.state.counters.friend++;
        relationship.friendMilestone = true;
        this._journal('Una amistad que crece', `${npc.name} ya te considera una persona cercana. La confianza se construye con tiempo y escucha.`, 'milestone');
      }
      relationship.lastMet = this.state.day;
    }

    getConversationOptions(id) {
      const npc = this.getNPC(id);
      if (!npc) return [];
      const traits = npc.traits.join(' ').toLowerCase();
      return [
        { id: 'chat', label: 'Conversar', description: `Preguntar por ${npc.interests[0] || 'sus intereses'} abre una conversación cercana.` },
        { id: 'listen', label: 'Escuchar de verdad', description: npc.needs.support > 60 ? 'Le vendría bien sentirse acompañado. Escuchar importa especialmente hoy.' : 'Una conversación sin prisas para construir confianza.' },
        { id: 'joke', label: 'Compartir una broma', description: /reservad|tímid|analít/.test(traits) ? 'Prefiere el humor cercano. Si está de ánimo bajo, quizá necesite calma.' : 'Suele disfrutar del humor espontáneo y de los momentos ligeros.' },
        { id: 'help', label: 'Ofrecer ayuda', description: `Puedes echarle una mano con ${npc.interests[1] || 'algo que le importa'}.` },
        { id: 'disagree', label: 'Expresar un desacuerdo', description: /direct|sincer|analít/.test(traits) ? 'Valora la honestidad, aunque no siempre piense igual que tú.' : 'Una conversación difícil puede crear tensión si no hay confianza.' }
      ];
    }

    interact(npcId, type, option) {
      if (!this.state) return fail('Crea tu personaje para comenzar.');
      const pending = this._eventBlock();
      if (pending) return pending;
      const npc = this.getNPC(npcId);
      if (!npc) return fail('No encuentras a esa persona.');
      const rel = this.getRelationship(npcId);
      if((this.data.interactions || []).some(item=>item.id===type))return this._interactExpanded(npcId,type);
      if(type==='confess'){if(this.getRelationship(npcId).status!=='partner' || !this.state.narrative.flags.secret_affair)return fail('No hay un secreto romántico pendiente que contar.');this.state.narrative.pending={eventId:'secreto_pesa',day:this.state.day,npcId,variantIndex:0,context:{kind:'social'}};this.save();return {ok:true,message:'Decides hablar con honestidad.'};}
      const romantic = ['flirt', 'askDate', 'date', 'relationship'].includes(type);
      const committed=this.data.npcs.find(n=>n.id!==npcId && this.getRelationship(n.id).status==='partner');
      if(romantic && committed && !npc.family && option?.allowInfidelity!==true)return {ok:false,message:`Tienes un acuerdo exclusivo con ${committed.name}. Continuar sería una infidelidad.`,requiresInfidelityConfirmation:true,partnerId:committed.id};
      if (romantic && (npc.family || npc.available === false || npc.age < 18)) return fail(npc.family ? 'Los vínculos familiares se cuidan desde el cariño y el respeto.' : `${npc.name} no está buscando una relación romántica. Puedes cultivar una amistad.`);
      if (romantic && rel.boundary) return fail(`Habéis acordado mantener una amistad con ${npc.name}. Respeta ese límite.`);
      if (!['boundary', 'breakup'].includes(type) && !this.getPresentNPCs().some(person => person.id === npcId)) return fail(`${npc.name} no está aquí ahora. Consulta sus lugares habituales y busca otro momento.`);
      const duration = type === 'date' ? 2 : type === 'boundary' || type === 'breakup' ? 0.5 : 1;
      const energy = type === 'date' ? 12 : type === 'help' ? 8 : ['boundary', 'breakup'].includes(type) ? 0 : 5;
      const check = this._timeCheck(duration, energy);
      if (check) return check;
      if (!['boundary', 'breakup'].includes(type) && this.state.hour + duration > this.getLocationAvailability(this.state.location).closesAt) return fail('La conversación terminaría después del cierre. Buscad un plan más breve o retomadla otro día.');
      const count = this.state.daily.interactions[npcId] || 0;
      if (count >= 6 && !['boundary', 'breakup'].includes(type)) return fail(`Has pasado mucho tiempo con ${npc.name} hoy. Dale espacio y vuelve a conversar mañana.`);
      const factor = count < 2 ? 1 : count < 4 ? 0.6 : 0.25;
      const traitIds = this.state.profile.traitIds;
      const empathyBonus = traitIds.includes('empatia') ? 1 : 0;
      const socialBonus = traitIds.includes('sociabilidad') ? 1 : 0;
      const scaled = changes => Object.fromEntries(Object.entries(changes).map(([key, value]) => [key, value > 0 ? Math.max(1, Math.round((value + (key === 'trust' ? empathyBonus : key === 'friendship' ? socialBonus : 0)) * factor)) : value]));
      let changes = {};
      let message = '';
      let dialogue = '';
      let title = '';
      let cost = 0;
      const extraEffects = { energy: -energy, social: 2, mood: 2 };
      const lines = npc.dialogue || {};
      const personality = npc.traits.join(' ').toLowerCase();

      switch (type) {
        case 'chat':
          changes = scaled({ friendship: 9, trust: 5 });
          title = 'Una buena conversación';
          message = `Conversas con ${npc.name} sobre ${npc.interests && npc.interests[0] || 'vuestros planes'}. Descubres un poco más de su mundo.`;
          dialogue = lines.chat || 'Me gusta tener tiempo para conversar contigo. ¿Cómo te ha ido hoy?';
          this._personality('sociability', 2);
          break;
        case 'listen':
          changes = scaled({ friendship: 7, trust: 10 });
          if (npc.needs.support > 60) changes.trust += 2;
          title = 'Estar presente';
          message = `Escuchas a ${npc.name} sin interrumpir ni dar consejos que no ha pedido. La confianza crece.`;
          dialogue = lines.listen || 'Gracias por escucharme. A veces solo necesito ordenar las ideas en voz alta.';
          this._personality('empathy', 3);
          break;
        case 'joke':
          changes = scaled({ friendship: 7, trust: 2 });
          title = 'Una risa compartida';
          message = `Compartes un momento ligero con ${npc.name}. No todo tiene que ser una conversación profunda.`;
          dialogue = lines.joke || 'Vale, esa sí me hizo reír. La próxima anécdota la cuento yo.';
          extraEffects.mood = 6;
          extraEffects.charm = 2;
          if (traitIds.includes('creatividad')) extraEffects.charm++;
          this._personality('creativity', 2);
          if (npc.mood < 40 && /reservad|tímid|analít/.test(personality)) {
            changes = { friendship: -2, trust: 0 };
            message = `Notas que ${npc.name} no está de humor para bromas. Cambiar de tema y escuchar será mejor que insistir.`;
            dialogue = 'Hoy me cuesta seguir las bromas. ¿Podemos hablar con un poco más de calma?';
            extraEffects.mood = 0;
          }
          break;
        case 'disagree':
          changes = /direct|sincer|analít/.test(personality) && rel.trust >= 25 ? { friendship: -2, trust: 3, conflict: 2 } : { friendship: -8, trust: -6, conflict: 12 };
          title = 'No siempre pensamos igual';
          message = `Expresas una opinión distinta a la de ${npc.name}. ${changes.trust > 0 ? 'La conversación es incómoda, pero agradece tu honestidad.' : 'La conversación deja tensión. Dar espacio y hablar con cuidado puede ayudar más adelante.'}`;
          dialogue = changes.trust > 0 ? 'No lo veo igual, pero agradezco que me lo digas de frente.' : 'Me ha costado escuchar eso. Necesito un poco de tiempo antes de seguir hablando.';
          extraEffects.mood = -3;
          extraEffects.stress = 4;
          break;
        case 'help':
          changes = scaled({ friendship: 10, trust: 8 });
          title = 'Un pequeño gesto';
          message = `Preguntas a ${npc.name} qué necesita y le ayudas sin decidir por su cuenta. Dedicar tiempo también es una forma de cuidar.`;
          dialogue = lines.help || 'Gracias. Me viene bien una mano, y agradezco que primero hayas preguntado.';
          extraEffects.energy = -8;
          extraEffects.responsibility = 3;
          this._personality('empathy', 2);
          break;
        case 'flirt':
          if (rel.friendship < 30 || rel.trust < 25) return fail(`Aún os estáis conociendo. Construye una amistad con ${npc.name} antes de coquetear (afinidad 30 y confianza 25).`);
          changes = scaled({ romance: 9, friendship: 3, trust: 2 });
          title = 'Hay algo entre vosotros';
          message = `Expresas interés con respeto y ${npc.name} corresponde al gesto. Ambos podéis marcar vuestro ritmo.`;
          dialogue = lines.flirt || 'Creo que yo también siento curiosidad por conocerte de otra manera. Sin prisas, ¿sí?';
          extraEffects.charm = 2;
          this._personality('confidence', 2);
          break;
        case 'askDate':
          if (['dating', 'partner'].includes(rel.status)) return fail(`Ya habéis acordado veros. Encuentra a ${npc.name} en la plaza o la cafetería y elige «Tener una cita».`);
          if (rel.friendship < 35 || rel.trust < 25 || rel.romance < 15) return fail(`${npc.name} prefiere conocerte más antes de quedar (afinidad 35, confianza 25 e interés 15). Un «todavía no» merece respeto.`);
          rel.status = 'dating';
          changes = { trust: 3, romance: 3 };
          title = 'Una invitación, un sí';
          message = `${npc.name} acepta una cita. Podéis encontraros en la plaza o en la cafetería cuando esté allí. Reserva 2 horas y 10 €.`;
          dialogue = 'Sí, me gustaría. Busquemos un rato en el que podamos estar tranquilos.';
          break;
        case 'date':
          if (!['dating', 'partner'].includes(rel.status)) return fail('Primero invita a esta persona a una cita y espera su respuesta.');
          if (!['plaza', 'cafeteria'].includes(this.state.location)) return fail('Para una cita, encontraos en la plaza o en la cafetería.');
          cost = 10;
          if (this.state.money < cost) return fail('Necesitas 10 € para el plan compartido.');
          changes = { romance: 14, trust: 10, friendship: 8 };
          title = 'Una cita para recordar';
          message = `Pasas dos horas con ${npc.name}, compartiendo historias y hablando de lo que buscáis. El tiempo de calidad acerca más que cualquier gesto grandioso.`;
          dialogue = rel.dates > 0 ? 'Me gusta cómo nos estamos conociendo. Para mí importa que podamos hablar con sinceridad.' : 'He estado a gusto. Me gustaría que repitiéramos otro día.';
          rel.dates++;
          this.state.counters.date++;
          extraEffects.mood = 12;
          extraEffects.stress = -6;
          break;
        case 'relationship': {
          const partner = this.data.npcs.find(person => person.id !== npcId && this.state.relationships[person.id].status === 'partner');
          if (partner) return fail(`Tienes una relación con ${partner.name}. Habla y cierra esa etapa antes de proponer otra relación exclusiva.`);
          if (rel.status === 'partner') return fail('Ya sois pareja. Seguid cuidando la relación.');
          if (rel.dates < 2 || rel.romance < 40 || rel.trust < 45) return fail('Una relación necesita una base compartida: 2 citas, interés 40 y confianza 45.');
          rel.status = 'partner';
          changes = { trust: 5, romance: 5 };
          title = 'Elegís estar juntos';
          message = `Hablas con ${npc.name} sobre expectativas, exclusividad y espacio personal. Ambos elegís comenzar una relación.`;
          dialogue = 'Sí. Quiero intentarlo contigo, y quiero que sigamos hablando de lo que necesitamos.';
          extraEffects.mood = 15;
          break;
        }
        case 'gift':
          if (this.state.daily.gifts[npcId]) return fail('Ya has tenido un detalle con esta persona hoy. El afecto no se compra a base de regalos.');
          cost = 12;
          if (this.state.money < cost) return fail('Necesitas 12 € para este detalle.');
          changes = scaled({ friendship: 8, trust: 2 });
          title = 'Pensé en ti';
          message = `Eliges un pequeño detalle relacionado con ${npc.interests && npc.interests[0] || 'los gustos de ' + npc.name}.`;
          dialogue = 'Te has acordado de lo que me gusta. Qué bonito detalle, gracias.';
          this.state.daily.gifts[npcId] = true;
          break;
        case 'boundary':
          if (this.state.daily.actions['boundary-' + npcId]) return fail('Ya has expresado este límite hoy. Dale tiempo para que se traduzca en hechos.');
          this.state.daily.actions['boundary-' + npcId] = 1;
          extraEffects.social = 0;
          extraEffects.mood = 0;
          if (npc.family) {
            changes = { trust: 4 };
            title = 'Cuidar tu espacio';
            message = `Hablas con ${npc.name} sobre tu necesidad de espacio y de tomar tus propias decisiones. Acordáis preguntar antes de opinar y respetar el tiempo de cada persona.`;
            dialogue = 'Gracias por decírmelo. Quiero acompañarte sin decidir por ti. Voy a respetar ese espacio.';
            extraEffects.stress = -8;
            break;
          }
          rel.boundary = !rel.boundary;
          if (rel.boundary) {
            if (['dating', 'partner'].includes(rel.status)) rel.status = rel.friendship >= 40 ? 'friend' : 'acquaintance';
            rel.romance = 0;
            rel.dates = 0;
          }
          changes = { trust: 3 };
          title = 'Hablar de límites';
          message = rel.boundary ? `Explicas a ${npc.name} que quieres una amistad. Tu decisión queda clara y el vínculo romántico se cierra.` : `Explicas a ${npc.name} que estás dispuesto a explorar otro vínculo. Eso no implica una cita ni una relación: el interés debe construirse de nuevo.`;
          dialogue = lines.boundary || 'Gracias por decirlo con claridad. Respeto lo que necesitas.';
          break;
        case 'apologize':
          if (!(rel.conflict > 0) && rel.status !== 'rival') return fail('No hay un conflicto pendiente que reparar. Puedes mostrar cariño conversando o escuchando.');
          if (this.state.daily.actions['apology-' + npcId]) return fail('Ya has expresado tu disculpa hoy. Ahora toca demostrarla con tiempo y acciones.');
          changes = { ...scaled({ trust: 5, friendship: 3 }), conflict: -10 };
          title = 'Asumir tu parte';
          message = `Ofreces una disculpa concreta a ${npc.name}, sin exigir que todo se arregle de inmediato.`;
          dialogue = 'Agradezco que lo reconozcas. Prefiero que sigamos cuidando cómo nos tratamos.';
          this.state.daily.actions['apology-' + npcId] = 1;
          break;
        case 'breakup':
          if (!['dating', 'partner'].includes(rel.status)) return fail('No tienes un vínculo romántico activo con esta persona.');
          rel.status = rel.friendship >= 40 ? 'friend' : 'acquaintance';
          rel.romance = 0;
          rel.dates = 0;
          changes = { friendship: -8, trust: -5 };
          title = 'Cerrar una etapa';
          message = `Hablas con ${npc.name} con honestidad y terminas el vínculo romántico. Os dais espacio para procesarlo.`;
          dialogue = 'Me cuesta escucharlo, pero agradezco que lo hablemos con respeto. Necesito algo de espacio.';
          extraEffects.mood = -8;
          break;
        default: return fail('Esa interacción no está disponible.');
      }

      this.state.money -= cost;
      this._advance(duration);
      this._effects(extraEffects);
      this._updateRelationship(npc, changes);
      rel.sharedHistory.push({ day: this.state.day, type, title, text: message });
      rel.sharedHistory = rel.sharedHistory.slice(-30);
      const npcState = this.state.npcStates[npcId];
      if (npcState) {
        npcState.mood = clamp(npcState.mood + (changes.friendship < 0 ? -4 : 2));
        npcState.needs.support = clamp(npcState.needs.support - (type === 'listen' ? 12 : type === 'help' ? 8 : 2));
        npcState.needs.space = clamp(npcState.needs.space + 3);
      }
      if (npc.family) {
        this.state.family.support = clamp(this.state.family.support + (changes.trust > 0 ? 1 : -2));
        this.state.family.tension = clamp(this.state.family.tension + (type === 'disagree' ? 5 : -2));
      }
      this.state.daily.interactions[npcId] = count + 1;
      if (type !== 'boundary') this.state.counters.social++;
      if(romantic && committed){if(!this.state.narrative.flags.secret_affair && !this.state.narrative.queue.some(q=>q.eventId==='secreto_pesa'))this.state.narrative.queue.push({eventId:'secreto_pesa',dueDay:this.state.day+2,sourceEventId:null,npcId:committed.id});this.state.narrative.flags.secret_affair=true;this.state.narrative.flags.affair_partner=committed.id;this.state.narrative.flags.affair_target=npcId;this._effects({stress:6});message+=' Mantienes este acercamiento en secreto y rompes vuestro acuerdo de exclusividad.';}
      if(type==='breakup' && this.state.narrative.flags.affair_partner===npcId){this.state.narrative.flags.secret_affair=false;this.state.narrative.flags.affair_discovered=false;this.state.narrative.queue=this.state.narrative.queue.filter(q=>!['secreto_pesa','secreto_descubierto','reparar_acuerdo'].includes(q.eventId));}
      this._journal(`${title} · ${npc.name}`, message, romantic || type === 'breakup' ? 'romance' : 'social', { npcId, tags: [npc.family ? 'familia' : romantic ? 'pareja' : 'amistad', type] });
      return this._success(message, { title, dialogue, npcId, changes, cost, duration, kind: 'social' });
    }

    getCareer() {
      const levels=['En formación','Profesional junior','Especialista','Responsable de equipo','Dirección de proyectos'];
      const c=this.state.career;
      return {...c,title:levels[c.level],nextTitle:levels[c.level+1] || null,salary:Math.round(90*(1+c.level*0.25)),requiredExperience:(c.level+1)*36,requiredKnowledge:30+c.level*12,requiredResponsibility:40+c.level*12,requiredTrust:20+c.level*10};
    }
    requestPromotion() {
      if(this.state.direction)return this.lifeAction('promoteJob');
      if(this.state.profile.path!=='work' || this.state.location!=='trabajo')return fail('Pide la revisión en el estudio y elige la ruta laboral.');
      const blocked=this._eventBlock();if(blocked)return blocked;
      const c=this.getCareer();if(c.level>=4)return fail('Ya has llegado al último nivel. Puedes seguir cuidando al equipo y tus proyectos.');
      if(this.state.career.lastRequestDay===this.state.day)return fail('Ya has hablado de tu carrera hoy. Deja tiempo para cumplir lo acordado.');
      const trust=Math.max(this.getRelationship('gabriel').trust,this.getRelationship('jefa').trust);
      if(c.experience<c.requiredExperience || this.state.stats.knowledge<c.requiredKnowledge || this.state.stats.responsibility<c.requiredResponsibility || trust<c.requiredTrust)return fail(`Necesitas ${c.requiredExperience} de experiencia, conocimiento ${c.requiredKnowledge}, responsabilidad ${c.requiredResponsibility} y confianza profesional ${c.requiredTrust} con Gabriel o Alicia.`);
      const check=this._timeCheck(1,6);if(check)return check;
      this.state.career.lastRequestDay=this.state.day;this.state.career.level++;this.state.career.promotions.push({day:this.state.day,level:this.state.career.level});
      this.state.narrative.flags.career_level=this.state.career.level;
      this._advance(1);this._effects({energy:-6,mood:8,responsibility:3});
      const title=`Ascenso: ${this.getCareer().title}`;
      this._journal(title,`Presentas tus aportaciones y acuerdas nuevas responsabilidades. Tu sueldo por turno pasa a ${this.getCareer().salary} €.`, 'work',{tags:['trabajo','ascenso'],npcId:'jefa'});
      return this._success(`Tu trabajo recibe reconocimiento. Nuevo puesto: ${this.getCareer().title}.`,{title,kind:'action',actionId:'promotion'});
    }
    _interactExpanded(npcId,type) {
      const n=this.getNPC(npcId),a=this.data.interactions.find(i=>i.id===type),r=this.getRelationship(npcId);
      if(!n || !a)return fail('No encuentras esa interacción.');
      const blocked=this._eventBlock();if(blocked)return blocked;
      if(!this.getPresentNPCs().some(p=>p.id===npcId))return fail(`${n.name} no está aquí ahora.`);
      if(['cookTogether'].includes(type) && !['casa','cafeteria'].includes(this.state.location))return fail('Para cocinar juntos, queda en casa o en la cafetería.');
      if(type==='studyTogether' && !['casa','colegio','universidad','cafeteria'].includes(this.state.location))return fail('Buscad una mesa en casa, el colegio, el campus o la cafetería.');
      if(type==='collaborate' && !['trabajo','colegio','universidad'].includes(this.state.location))return fail('Los proyectos compartidos necesitan el entorno laboral o de estudios.');
      if(type==='resolveConflict' && !(r.conflict>0 || r.trust<50))return fail('No hay un conflicto pendiente que reparar. Podéis compartir otro momento.');
      const count=this.state.daily.interactions[npcId] || 0;if(count>=6)return fail(`Hoy habéis compartido bastante tiempo. Vuelve a conversar mañana.`);
      const check=this._timeCheck(a.duration,a.energy);if(check)return check;
      if(this.state.hour+a.duration>this.getLocationAvailability(this.state.location).closesAt)return fail('No queda tiempo para este plan antes del cierre.');
      if(this.state.money<(a.cost || 0))return fail(`Necesitas ${a.cost} € para este plan.`);
      const traits=n.traits.join(' ').toLowerCase(),direct=/direct|sincer|analít|práctic/.test(traits),creative=/creativ|imagin|curios/.test(traits);
      const receptive=type==='debate'?direct:type==='shareHobby'?creative:true;
      const gains={friendship:Math.max(1,Math.round((receptive?7:3)*(count<2?1:0.5))),trust:type==='support'?9:type==='resolveConflict'?8:receptive?5:2,conflict:type==='resolveConflict'?-12:type==='debate'&&!direct?3:0};
      const effects={energy:-a.energy,social:3,mood:3};
      if(type==='studyTogether')effects.knowledge=7;
      if(type==='collaborate'){effects.responsibility=5;effects.knowledge=3;if(this.state.location==='trabajo')this.state.career.experience+=3;}
      if(type==='cookTogether'){effects.health=5;effects.energy=8;}
      if(type==='walkTogether'){effects.health=3;effects.stress=-5;}
      if(type==='support'){effects.stress=-3;this._personality('empathy',2);}
      this.state.money-=a.cost || 0;this._effects(effects);this._advance(a.duration);this._updateRelationship(n,gains);
      this.state.daily.interactions[npcId]=count+1;this.state.counters.social++;
      if(type==='studyTogether')this.state.counters.study++;
      if(n.family){this.state.family.support=clamp(this.state.family.support+2);this.state.family.tension=clamp(this.state.family.tension-2);}
      const response=type==='resolveConflict'?'Agradezco que no quieras pasar por encima de lo ocurrido. Necesito ver esos cambios con el tiempo.':type==='debate'?(direct?'No pensamos igual, pero me gusta poder hablarlo con argumentos.':'Hoy prefiero una charla tranquila. Podemos retomar ese debate otro día.'):`Me gusta que te intereses por ${n.interests[0]}. Este rato compartido me ha sentado bien.`;
      const message=`${a.label} con ${n.name}. ${receptive?'Encontráis una forma de disfrutarlo juntos.':'Vuestros ritmos son distintos y aprendéis a tenerlo en cuenta.'}`;
      r.sharedHistory.push({day:this.state.day,type,title:a.label,text:message});r.sharedHistory=r.sharedHistory.slice(-30);
      this._journal(a.label,message,'social',{npcId,tags:[n.family?'familia':'amistad',type]});
      return this._success(message,{title:a.label,dialogue:response,npcId,changes:gains,cost:a.cost || 0,duration:a.duration,kind:'social'});
    }

    _casualState(npcId) { return this.getRelationship(npcId)?.casual || freshCasual(); }

    _nightCheck(npcId, action) {
      if (!this.state) return fail('Crea tu personaje para comenzar.');
      const npc = this.getNPC(npcId), rel = this.getRelationship(npcId);
      if (!npc || !rel) return fail('No encuentras a esa persona.');
      if (npc.family || npc.child || npc.age < 18 || npc.available === false) return fail('Los encuentros casuales solo se proponen a otras personas adultas y disponibles.');
      const blocked = this._eventBlock(); if (blocked) return blocked;
      if (!this.getPresentNPCs().some(person => person.id === npcId)) return fail(`${npc.name} no está aquí ahora.`);
      if (!(this.data.nightLocations || []).includes(this.state.location)) return fail('Estos planes se proponen en los nuevos lugares de ocio.');
      const availability = this.getLocationAvailability(this.state.location);
      if (!availability.open) return fail(availability.reason);
      const time = this._timeCheck(action.duration, action.energy); if (time) return time;
      if (this.state.hour + action.duration > availability.closesAt) return fail('No queda tiempo para este plan antes del cierre.');
      if (this.state.money < (action.cost || 0)) return fail(`Necesitas ${action.cost} € para este plan.`);
      const count = this.state.daily.interactions[npcId] || 0;
      if (count >= 6 && !['declineCasual', 'sayGoodbye'].includes(action.id)) return fail(`Ya habéis compartido bastante tiempo hoy. Da espacio a ${npc.name}.`);
      const casual = this._casualState(npcId);
      const romantic = ['casualFlirt', 'oneNight'].includes(action.id);
      if (romantic && rel.boundary) return fail('Habéis acordado mantener una amistad. Ese límite también se respeta en una noche de ocio.');
      if (romantic && ['declined', 'romantic'].includes(casual.expectations)) return fail('No buscáis el mismo tipo de encuentro. No insistas en un límite que ya está claro.');
      if (romantic && !npc.casualInterest) return fail(`${npc.name} no busca encuentros casuales. Puedes compartir otro tipo de plan.`);
      if (action.id === 'talkExpectations' && casual.expectations !== 'unknown') return fail('Ya habéis hablado de lo que buscáis. Respeta lo que acordasteis.');
      if (action.id === 'casualFlirt' && !(rel.sharedHistory?.length || casual.history.length)) return fail('Primero compartid una conversación o un plan sencillo para comprobar si hay química.');
      if (action.id === 'oneNight') {
        if (this.state.hour < 18) return fail('Un encuentro de una noche se propone a partir de las 18:00.');
        if (npc.mood < 35) return fail(`${npc.name} no tiene ganas de un encuentro íntimo ahora. Elegid otro plan sin presionar.`);
        if (casual.expectations !== 'casual') return fail('Hablad primero de expectativas: ambas personas deben querer algo casual.');
        if (casual.attraction < 20) return fail('Todavía no habéis expresado suficiente atracción mutua. Una invitación no equivale a consentimiento.');
        if (casual.lastEncounterDay === this.state.day || this.state.daily.actions.casualEncounter) return fail('Ya has vivido un encuentro casual esta noche. Puedes seguir con otros planes sin repetirlo.');
      }
      if (['offerDrink', 'danceTogether'].includes(action.id) && this.state.daily.actions[`night_${npcId}_${action.id}`]) return fail('Ya habéis compartido ese plan hoy. Elegid algo distinto.');
      if (action.id === 'casualFlirt' && this.state.daily.actions[`night_${npcId}_casualFlirt`]) return fail('Ya has expresado esa atracción hoy. Deja espacio para decidir y compartir otro plan.');
      if (action.id === 'exchangeContact' && this.state.daily.actions[`night_${npcId}_exchangeContact`]) return fail('Ya habéis hablado de intercambiar contacto hoy. No hace falta volver a pedirlo.');
      if (action.id === 'declineCasual' && casual.expectations === 'declined') return fail('Tu límite ya está expresado y se mantiene.');
      if (action.id === 'sayGoodbye' && this.state.daily.actions[`night_${npcId}_sayGoodbye`]) return fail('Ya os habéis despedido por hoy.');
      return { ok: true, npc, rel, casual };
    }

    getNightOptions(npcId) {
      const npc = this.getNPC(npcId);
      if (!npc || npc.family || npc.child || npc.age < 18 || npc.available === false) return [];
      return (this.data.nightInteractions || []).filter(action => NIGHT_ACTIONS.includes(action.id)).map(action => {
        const check = this._nightCheck(npcId, action);
        return { ...action, available: check.ok, reason: check.ok ? '' : check.message };
      });
    }

    interactNight(npcId, type, options = {}) {
      const action = (this.data.nightInteractions || []).find(item => item.id === type && NIGHT_ACTIONS.includes(type));
      if (!action) return fail('Ese plan de ocio no está disponible.');
      const checked = this._nightCheck(npcId, action);
      if (!checked.ok) return checked;
      const { npc, rel } = checked;
      const committed = this.data.npcs.find(person => person.id !== npcId && this.getRelationship(person.id).status === 'partner');
      const romantic = ['casualFlirt', 'oneNight'].includes(type);
      if (romantic && committed && options.allowInfidelity !== true) return { ok: false, message: `Tienes un acuerdo exclusivo con ${committed.name}. Continuar sería una infidelidad.`, requiresInfidelityConfirmation: true, partnerId: committed.id };
      if (type === 'oneNight' && options.confirmEncounter !== true) return { ok: false, message: 'Confirma que quieres compartir este encuentro y que ambos habéis expresado lo mismo.', requiresEncounterConfirmation: true, npcId };

      // El consentimiento y el tipo de plan se registran separados del interés romántico.
      const casual = rel.casual || (rel.casual = freshCasual());
      let title = action.label, dialogue = '', message = '', attraction = 0;
      const changes = { friendship: 0, trust: 0 };
      const effects = { energy: -action.energy, mood: 2, social: 1 };
      switch (type) {
        case 'offerDrink':
          changes.friendship = 1;
          dialogue = 'Gracias. Me apetece una bebida sin alcohol. Y después ya veremos qué plan nos gusta a cada uno.';
          message = `Invitas a ${npc.name} a una bebida que elige libremente. Compartirla no implica ninguna otra obligación.`;
          break;
        case 'danceTogether':
          changes.friendship = 1; attraction = npc.casualInterest && casual.expectations !== 'declined' ? 6 : 0;
          effects.mood = 5;
          dialogue = 'Una canción, sí. Si me apetece parar, te lo digo; haz lo mismo conmigo.';
          message = `Compartes una canción con ${npc.name}, cuidando el espacio y las ganas de ambos.`;
          break;
        case 'talkExpectations':
          if (npc.casualInterest && npc.mood >= 35 && !rel.boundary) {
            casual.expectations = 'casual'; attraction = 8;
            dialogue = 'Ahora me apetece algo casual, sin promesas de pareja. Si seguimos, quiero que ambos podamos decir qué sí y qué no.';
            message = `Tú y ${npc.name} aclarais que buscáis un encuentro casual. Hablarlo no os obliga a seguir.`;
          } else {
            casual.expectations = 'declined'; casual.attraction = 0;
            dialogue = npc.dialogue?.boundary || 'No busco un encuentro casual. Prefiero que respetemos que hoy queremos cosas distintas.';
            message = `${npc.name} deja claro que no quiere un encuentro casual. Aceptas la respuesta sin convertirla en un reto.`;
          }
          changes.trust = 1;
          break;
        case 'casualFlirt':
          if (npc.mood < 35) {
            casual.expectations = 'declined'; casual.attraction = 0;
            dialogue = 'Hoy no me apetece seguir por ahí. Gracias por escucharlo sin insistir.';
            message = `Expresas atracción y ${npc.name} prefiere parar. Su respuesta se mantiene y no supone una deuda contigo.`;
          } else {
            attraction = 12; effects.mood = 4;
            dialogue = npc.dialogue?.flirt || 'Sí, hay atracción. Me gusta que no intentemos convertirla en una promesa que no queremos hacer.';
            message = `Expresas atracción por ${npc.name} sin fingir un proyecto de pareja. La atracción es mutua y podéis elegir vuestro ritmo.`;
          }
          break;
        case 'oneNight':
          title = 'Una noche compartida';
          casual.encounters++; casual.lastEncounterDay = this.state.day;
          this.state.daily.actions.casualEncounter = 1;
          this.state.narrative.flags.casual_experience = true;
          this.state.narrative.flags.casual_last_encounter_day = this.state.day;
          effects.mood = 8; effects.stress = -4;
          dialogue = 'Me apetece compartir este momento contigo, con los límites que hemos hablado. No lo voy a convertir en una promesa de mañana.';
          message = `Tú y ${npc.name} elegís compartir un encuentro íntimo. Acordáis límites y podéis cambiar de opinión. La escena queda fuera de pantalla; después, os despedís sin asumir compromiso sentimental.`;
          break;
        case 'sayGoodbye':
          effects.stress = -2;
          dialogue = 'Lo he pasado bien. Que termine aquí no le quita valor, y no tenemos que prometer repetir.';
          message = `Te despides de ${npc.name} con claridad. Cerráis el momento sin convertirlo automáticamente en romance ni en una cita pendiente.`;
          break;
        case 'exchangeContact':
          changes.trust = 1;
          dialogue = ['declined', 'romantic'].includes(casual.expectations) ? 'Podemos seguir en contacto como amistad, sin cambiar el límite que ya hemos hablado.' : 'Podemos intercambiar contacto. Eso no significa que ninguno de los dos deba otro encuentro.';
          message = `Preguntas a ${npc.name} si quiere intercambiar contacto. Acordáis que escribir o responder seguirá siendo una elección.`;
          break;
        case 'declineCasual':
          casual.expectations = 'declined'; casual.attraction = 0;
          effects.stress = -3;
          dialogue = 'Entendido. Gracias por decir qué te apetece. Podemos cambiar de plan o despedirnos, sin más.';
          message = `Dices que no te apetece un encuentro casual con ${npc.name}. Tu decisión se respeta, sin penalizar el vínculo.`;
          break;
      }
      casual.attraction = Math.round(clamp(casual.attraction + attraction));
      if (romantic && committed && casual.expectations !== 'declined') {
        if (!this.state.narrative.flags.secret_affair && !this.state.narrative.queue.some(item => item.eventId === 'secreto_pesa')) this.state.narrative.queue.push({ eventId: 'secreto_pesa', dueDay: this.state.day + 2, sourceEventId: null, npcId: committed.id });
        this.state.narrative.flags.secret_affair = true;
        this.state.narrative.flags.affair_partner = committed.id;
        this.state.narrative.flags.affair_target = npcId;
        effects.stress = (effects.stress || 0) + 6;
        message += ' Decides ocultarlo a tu pareja y rompes vuestro acuerdo de exclusividad.';
      }
      this.state.money -= action.cost || 0;
      this._effects(effects); this._advance(action.duration);
      this._updateRelationship(npc, changes);
      this.state.daily.interactions[npcId] = (this.state.daily.interactions[npcId] || 0) + 1;
      this.state.daily.actions[`night_${npcId}_${type}`] = (this.state.daily.actions[`night_${npcId}_${type}`] || 0) + 1;
      this.state.counters.social++;
      const entry = { day: this.state.day, hour: this.state.hour, type, title, text: message };
      casual.history.push(entry); casual.history = casual.history.slice(-40);
      rel.sharedHistory.push({ day: entry.day, type, title, text: message }); rel.sharedHistory = rel.sharedHistory.slice(-30);
      this._journal(`${title} · ${npc.name}`, message, 'social', { npcId, tags: ['noche', 'casual', type] });
      return this._success(message, { title, dialogue, npcId, changes, casual: { ...casual }, duration: action.duration, cost: action.cost || 0, kind: 'social' });
    }

    sleep() {
      if (!this.state) return fail('Crea tu personaje para comenzar.');
      const pending = this._eventBlock(true);
      if (pending) return pending;
      const oldDay = this.state.day;
      if(this.state.direction)this._system('beforeSleep');
      if (this.state.family.expenses > 0) {
        const factor=this.state.direction?this.data.difficulties.find(d=>d.id===this.state.direction.settings.difficulty).costFactor:1;
        const paid = Math.min(this.state.money, Math.round(this.state.family.expenses*factor));
        this._effects({ money: -paid });
        if (paid < Math.round(this.state.family.expenses*factor)) this.state.family.tension = clamp(this.state.family.tension + 3);
        this._recordMutation(`Reservas ${paid} € para los cuidados de la familia.`, { kind: 'family' });
        this._trackBaseline();
      }
      const summary = this.getDaySummary();
      if(this.state.direction)this._system('afterSummary',[summary]);
      this.state.summaries.push(summary);
      this.state.summaries = this.state.summaries.slice(-720);
      this._journal(`Así fue el día ${oldDay}`, `${summary.actions.length ? `Viviste ${summary.actions.length} momentos: ${summary.actions.slice(0, 3).join(' ')}` : 'Te diste tiempo para descansar y observar.'} Tu saldo cambió ${summary.moneyChange >= 0 ? '+' : ''}${summary.moneyChange} €. ${summary.highlight} ${summary.sustainability || ''}`, 'summary', { tags: ['resumen', this.getCalendar().season] });
      this.state.day++;
      this.state.hour = 9;
      this.state.location = 'casa';
      this.state.daily = { interactions: {}, actions: {}, workHours: 0, gifts: {} };
      this._effects({ energy: 100, health: this.state.stats.stress > 80 ? -3 : 1, stress: -22, mood: 5 });
      // El ánimo, la salud y las habilidades necesitan atención continuada, no una barra permanente.
      this._effects({mood:-4,health:-3,...(this.state.direction?{social:this.state.stats.social>25?-1:0,knowledge:this.state.stats.knowledge>75?-1:this.state.stats.knowledge>30&&this.state.day%7===0?-1:0,charm:this.state.stats.charm>70?-1:this.state.stats.charm>35&&this.state.day%7===0?-1:0,responsibility:this.state.stats.responsibility>75?-1:this.state.stats.responsibility>45&&this.state.day%7===0?-1:0}:{social:-3,knowledge:-1,charm:-1,responsibility:-1})});
      // El paso del tiempo solo desgasta vínculos descuidados; nunca toma decisiones por el jugador.
      for (const npc of this.data.npcs) {
        const rel = this.getRelationship(npc.id);
        if (!npc.family && rel.lastMet && this.state.day - rel.lastMet > 4 && rel.friendship > 10) {
          rel.friendship = Math.max(10, rel.friendship - (this.state.day % 2 === 0 ? 1 : 0));
          if (rel.status === 'friend' && rel.friendship < 40) rel.status = 'acquaintance';
        }
      }
      this._npcNewDay();
      if(this.state.direction)this._system('newDay');
      this._beginDay();
      this._trackBaseline();
      const events = [
        'Tu madre deja una nota en la cocina: «Tienes comida en casa. No te olvides de cuidarte».',
        'La plaza amanece tranquila. Hoy puede ser un buen día para conocer mejor a alguien.',
        'Tu familia propone buscar un rato para conversar. Tú decides cuándo acercarte.',
        'Encuentras tu libreta abierta en un proyecto pendiente. Cada pequeño paso cuenta.',
        'La ciudad empieza otra mañana. No hace falta resolver toda tu vida hoy.'
      ];
      const event = this.isWeekend() ? 'Es fin de semana: las clases y la oficina descansan. Hay tiempo para tus vínculos y para ti.' : events[(this.state.day - 1) % events.length];
      this._journal(`Día ${this.state.day} · Un nuevo comienzo`, event, 'day');
      return this._success(`Descansas después del día ${oldDay}. Tu energía se recupera. ${event}`, { title: `Buenos días · ${this.getWeekday()}`, summary, kind: 'day' });
    }

    _npcNewDay() {
      let sent = 0;
      for (const npc of this.data.npcs) {
        const dynamic = this.state.npcStates[npc.id];
        const rel = this.getRelationship(npc.id);
        dynamic.mood = clamp(dynamic.mood + Math.round(this.random() * 12 - 6));
        dynamic.needs.support = clamp(dynamic.needs.support + 4);
        dynamic.needs.space = clamp(dynamic.needs.space - 12);
        if (!npc.family && this.state.day > 10 && this.random() < 0.005) {
          const place = npc.locations[Math.floor(this.random() * npc.locations.length)];
          dynamic.movedTo = place;
          dynamic.history.push({ day: this.state.day, text: `Ahora suele pasar más tiempo en ${this.data.locations.find(location => location.id === place).name}.` });
          dynamic.history = dynamic.history.slice(-12);
        }
        if (sent >= 2 || this.state.messages.some(message => message.npcId === npc.id && !message.answered)) continue;
        if ((npc.family || rel.friendship >= 30) && this.random() < 0.14) {
          const text = dynamic.mood < 40 ? 'Hoy tengo un día un poco difícil. ¿Podemos hablar cuando tengas un rato?' : rel.lastMet && this.state.day - rel.lastMet > 3 ? 'Hace unos días que no conversamos. Me gustaría saber cómo estás.' : `Me acordé de ti al pensar en ${npc.interests[0]}. ¿Cómo va tu día?`;
          this.state.messages.push({ id: `msg_${this.state.day}_${npc.id}`, npcId: npc.id, text, day: this.state.day, answered: false });
          sent++;
        }
      }
      this.state.messages = this.state.messages.slice(-120);
    }

    replyMessage(id, option = 'warm') {
      if (!this.state) return fail('Crea tu personaje para comenzar.');
      const pending = this._eventBlock();
      if (pending) return pending;
      const message = this.state.messages.find(item => item.id === id);
      if (!message || message.answered) return fail('Este mensaje ya no espera una respuesta.');
      if (!['warm', 'honest', 'later'].includes(option)) return fail('Elige cómo quieres responder.');
      const check = this._timeCheck(0.25, option === 'later' ? 1 : 3);
      if (check) return check;
      const npc = this.getNPC(message.npcId);
      this._advance(0.25);
      this._effects({ energy: option === 'later' ? -1 : -3 });
      const direct = /direct|sincer|analít/.test(npc.traits.join(' ').toLowerCase());
      this._updateRelationship(npc, option === 'warm' ? { friendship: 3, trust: 4 } : option === 'honest' ? { friendship: 1, trust: direct ? 5 : 3 } : { trust: 1 });
      message.answered = true;
      message.reply = option;
      const text = option === 'later' ? `Explicas a ${npc.name} que necesitas tiempo y que responderás con calma más adelante.` : option === 'honest' ? `Cuentas a ${npc.name} cómo te sientes, sin fingir que todo va perfecto.` : `Respondes a ${npc.name} con interés y le preguntas cómo está.`;
      const rel = this.getRelationship(npc.id);
      rel.sharedHistory.push({ day: this.state.day, type: 'message', title: 'Un mensaje respondido', text });
      rel.sharedHistory = rel.sharedHistory.slice(-30);
      this._journal('Una conversación que continúa', text, 'social', { npcId: npc.id, tags: ['mensaje'] });
      return this._success(text, { title: 'Mensaje respondido', kind: 'social', npcId: npc.id });
    }

    addChild(name) {
      if (!this.state) return fail('Crea tu personaje para comenzar.');
      const pending = this._eventBlock();
      if (pending) return pending;
      if (typeof name !== 'string' || !name.trim()) return fail('Elige un nombre para este nuevo miembro de la familia.');
      const partner = this.data.npcs.find(npc => this.getRelationship(npc.id).status === 'partner');
      if (!partner || this.getRelationship(partner.id).trust < 70 || this.getRelationship(partner.id).dates < 3) return fail('Formar una familia requiere una pareja estable, tres citas compartidas y confianza 70.');
      if (this.state.family.children.length >= 4) return fail('Tu familia ya tiene cuatro hijos. Es momento de cuidar los vínculos que habéis construido.');
      if (this.state.money < 150) return fail('Necesitas reservar 150 € para recibir a un nuevo miembro de la familia.');
      const check = this._timeCheck(1, 10);
      if (check) return check;
      const id = `child_${this.state.day}_${this.state.family.children.length + 1}`;
      const inherited = [...new Set([this.data.traits.find(trait => trait.id === this.state.profile.traitIds[0])?.label || 'Curiosidad', partner.traits[0]])].slice(0, 2);
      const child = { id, name: cleanText(name, '', 32), lastName: this.state.profile.lastName, age: 0, pronouns: 'elle', gender: 'nonbinary', child: true, bornOn: this.state.day, birthDay: this.getCalendar().dayOfYear, family: true, relation: 'Hije', occupation: 'Nuevo miembro de la familia', bio: 'Un nuevo capítulo que habéis elegido cuidar juntos.', traits: inherited, interests: ['juegos', 'cuentos'], available: false, home: 'casa', locations: ['casa'], skin: this.state.profile.skin, hair: partner.hair, hairStyle: 'short', outfit: '#9da992', color: '#c9d6bc' };
      this.state.family.children.push(child);
      this.state.relationships[id] = { friendship: 70, trust: 70, romance: 0, status: 'family', dates: 0, boundary: false, lastMet: this.state.day, friendMilestone: false, sharedHistory: [], conflict: 0 };
      this.state.npcStates[id] = { movedTo: null, awayUntil: 0, mood: 75, needs: { support: 70, space: 20 }, history: [] };
      this.state.family.expenses += 5;
      this._effects({ money: -150, energy: -10 });
      this._advance(1);
      this._journal('La familia crece', `Por una decisión compartida y meditada, dais la bienvenida a ${child.name}. Hereda ${inherited.join(' y ').toLowerCase()} de vuestra familia.`, 'family', { npcId: id, tags: ['familia', 'ciclo_vital'] });
      return this._success(`Dais la bienvenida a ${child.name}. Este capítulo trae cuidados, gastos y nuevos recuerdos.`, { kind: 'social', npcId: id });
    }

    choosePath(path) {
      if (!this.state) return fail('Crea tu personaje para comenzar.');
      if (!PATHS.includes(path)) return fail('Elige un rumbo válido.');
      if (this.state.profile.path === path) return fail('Ya sigues este rumbo.');
      this.state.profile.path = path;
      const names = { school: 'Terminar el colegio', university: 'Estudiar en la universidad', work: 'Comenzar a trabajar', free: 'Explorar a tu ritmo' };
      this._journal('Un cambio de rumbo', `Decides: ${names[path].toLowerCase()}. Tus relaciones y tus aprendizajes te acompañan.`, 'milestone');
      return this._success(`Tu nuevo rumbo: ${names[path]}.`);
    }

    updateProfile(profile) {
      if (!this.state) return fail('Crea tu personaje para comenzar.');
      if (!isObject(profile)) return fail('Los datos del personaje no son válidos.');
      const merged = { ...this.state.profile, ...profile };
      if (typeof merged.name !== 'string' || !merged.name.trim()) return fail('Elige un nombre para tu personaje.');
      const age = Number(merged.age);
      if (!Number.isInteger(age) || age < 18 || age > 80) return fail('Tu personaje debe tener entre 18 y 80 años.');
      if (!PATHS.includes(merged.path)) return fail('Elige un rumbo válido.');
      if (Array.isArray(merged.traitIds) && merged.traitIds.length > 2) return fail('Puedes escoger hasta dos rasgos de personalidad.');
      if(this.state.direction&&profile.difficulty&&!this.data.difficulties.some(d=>d.id===profile.difficulty))return fail('Elige una dificultad válida.');
      if(this.state.direction && Array.isArray(profile.aspirationIds)){const ids=profile.aspirationIds;if(ids.length<1||ids.length>2||new Set(ids).size!==ids.length||ids.some(id=>!this.data.aspirations.some(a=>a.id===id)))return fail('Elige una o dos aspiraciones distintas.');if(ids.slice().sort().join()!==this.state.aspirations.slice().sort().join()){if(this.state.day===1&&!this.state.ledger.actions.length)this.state.aspirations=ids.slice();else{const r=this.changeAspirations(ids);if(!r.ok)return r;}}}
      if(this.state.direction&&profile.difficulty)this.state.direction.settings.difficulty=profile.difficulty;
      this.state.profile = this._profile({ ...merged, age });
      return this._success('Personaje actualizado. Tu historia y tus vínculos se conservan.',{kind:'profile'});
    }

    getGoals() {
      if (!this.state) return [];
      if(this.state.direction)return this._system('goals');
      const goals = (this.data.goals || []).map(goal => ({ ...goal, priority: goal.type === 'study' && ['school', 'university'].includes(this.state.profile.path) || goal.type === 'work' && this.state.profile.path === 'work' ? 20 : 10 }));
      if (this.state.messages.length) goals.push({ id: 'respuesta_cercana', title: 'Seguir la conversación', description: 'Responde a alguien que se ha acordado de ti.', target: 1, type: 'message', reward: 10, progress: this.state.messages.filter(message => message.answered).length, priority: 25 });
      if (this.state.family.support >= 70 || this.state.family.tension > 35) goals.push({ id: 'hogar_compartido', title: 'Un hogar que acompaña', description: 'Cuida los vínculos hasta alcanzar apoyo familiar 80.', target: 80, type: 'family', reward: 20, progress: this.state.family.support, priority: 18 });
      if (this.state.counters.work > 0) goals.push({ id: 'fondo_tranquilo', title: 'Un pequeño colchón', description: 'Reúne 200 € para tus próximos planes.', target: 200, type: 'money', reward: 15, progress: this.state.money, priority: 15 });
      return goals.map(goal => {
        const progress = Math.min(goal.target, goal.progress ?? this.state.counters[goal.type] ?? 0);
        return { ...goal, progress, complete: progress >= goal.target, claimed: this.state.claimedGoals.includes(goal.id) };
      }).sort((a, b) => Number(a.claimed) - Number(b.claimed) || b.priority - a.priority);
    }

    claimGoal(id) {
      if(this.state?.direction && id.startsWith('asp_'))return this._system('claim',[id]);
      if (!this.state) return fail('Crea tu personaje para comenzar.');
      const goal = this.getGoals().find(item => item.id === id);
      if (!goal) return fail('Ese objetivo no existe.');
      if (goal.claimed) return fail('Ya has recogido esta recompensa.');
      if (!goal.complete) return fail('Aún no has completado este objetivo.');
      this.state.claimedGoals.push(id);
      const reward = typeof goal.reward === 'number' ? goal.reward : Number(goal.reward && goal.reward.money) || 25;
      this._effects({ money: reward, mood: 5 });
      this._journal('Un paso adelante', `${goal.title}. Recibes ${reward} € por tu logro.`, 'milestone');
      return this._success(`Objetivo completado: ${goal.title}. Has recibido ${reward} €.`);
    }
    setGoalClaim(id) { return this.claimGoal(id); }

    cheat(type, value, npcId) {
      if (!this.state) return fail('Crea tu personaje para comenzar.');
      if (type === 'toggle' || type === 'enable') {
        this.state.flags.cheats = type === 'enable' ? true : !this.state.flags.cheats;
        if (this.state.flags.cheats) this.state.flags.cheatsUsed = true;
        return this._success(this.state.flags.cheats ? 'Trucos activados. Tú decides cómo jugar.' : 'Trucos desactivados.');
      }
      if (!this.state.flags.cheats) return fail('Activa los trucos para utilizar esta opción.');
      let message;
      switch (type) {
        case 'money':
          this._effects({ money: finite(value) ? Math.round(clamp(value, 0, 999999)) : 500 });
          message = 'Saldo actualizado.';
          break;
        case 'stats':
          for (const key of STATS) this.state.stats[key] = key === 'stress' ? 0 : 100;
          message = 'Estadísticas al máximo y estrés a cero.';
          break;
        case 'energy':
          this._effects({ energy: 100, stress: -100 });
          message = 'Energía recuperada y estrés a cero.';
          break;
        case 'relationship': {
          const npc = this.getNPC(npcId || value);
          if (!npc) return fail('Elige una persona.');
          const rel = this.getRelationship(npc.id);
          this._updateRelationship(npc, { friendship: 100, trust: 100 });
          message = `Afinidad y confianza con ${npc.name} al máximo. Las citas y la relación siguen siendo decisiones tuyas.`;
          break;
        }
        case 'time':
          this.state.hour = finite(value) ? Math.round(clamp(value, 8, 22) * 2) / 2 : 9;
          message = 'Hora actualizada.';
          break;
        default: return fail('Ese truco no existe.');
      }
      this.state.flags.cheatsUsed = true;
      return this._success(message);
    }

    exportSave() { return this.state ? JSON.stringify(this.state, null, 2) : ''; }

    importSave(json) {
      try {
        if (typeof json !== 'string' || json.length > 3000000) return fail('El archivo de guardado no es válido o es demasiado grande.');
        const next = this._validatedState(JSON.parse(json));
        this.state = next;
        this.corruptSave = false;
        this.loadError = null;
        this._legacyMigrationText = null;
        this._trackBaseline();
        this.save();
        return { ok: true, message: 'Partida importada. Ya puedes continuar tu historia.' };
      } catch (_) { return fail('No se pudo importar: el archivo no contiene una partida válida de Vínculos. Tu partida actual se conserva.'); }
    }

    validateImport(json) {
      try {
        if (typeof json !== 'string' || json.length > 3000000) return fail('El archivo no es válido o supera el tamaño permitido.');
        const state = this._validatedState(JSON.parse(json));
        return { ok: true, message: `Partida de ${state.profile.name}, día ${state.day}.`, state };
      } catch (_) { return fail('El archivo no contiene una partida válida de Vínculos.'); }
    }

    _validatedState(input) {
      const invalid = () => { throw new Error('Invalid save'); };
      if (!isObject(input) || ![1, 2, 3].includes(input.version) || !isObject(input.profile)) invalid();
      const profile = input.profile;
      if (typeof profile.name !== 'string' || !profile.name.trim() || !finite(profile.age) || profile.age < 18 || profile.age > 80 || !PATHS.includes(profile.path)) invalid();
      if (!finite(input.day) || input.day < 1 || input.day > 1000000 || !Number.isInteger(input.day)) invalid();
      if (!finite(input.hour) || input.hour < 0 || input.hour > 23 || Math.abs(input.hour * 60 - Math.round(input.hour * 60)) > 0.00001) invalid();
      if (!finite(input.money) || input.money < 0 || input.money > 99999999) invalid();
      if (!this.data.locations.some(location => location.id === input.location)) invalid();
      if (!isObject(input.stats) || !STATS.every(key => finite(input.stats[key]) && input.stats[key] >= 0 && input.stats[key] <= 100)) invalid();
      if (!isObject(input.relationships) || !isObject(input.counters) || !COUNTERS.every(key => finite(input.counters[key]) && input.counters[key] >= 0 && input.counters[key] <= 1000000000)) invalid();
      if (!Array.isArray(input.journal) || !Array.isArray(input.claimedGoals) || !isObject(input.flags) || !isObject(input.daily)) invalid();
      const relationships = {};
      let partners = 0;
      for (const npc of this.data.npcs) {
        const rel = input.relationships[npc.id] || (npc.addedIn ? {friendship:npc.family?65:10,trust:npc.family?70:10,romance:0,status:npc.family?'family':'acquaintance',dates:0,boundary:false,lastMet:0,sharedHistory:[],conflict:0} : null);
        if (!isObject(rel) || !['friendship', 'trust', 'romance'].every(key => finite(rel[key]) && rel[key] >= 0 && rel[key] <= 100) || !STATUS.includes(rel.status)) invalid();
        if (!npc.family && rel.status === 'family') invalid();
        if (npc.family && (rel.romance !== 0 || rel.status !== 'family')) invalid();
        if (!npc.family && (npc.available === false || npc.age < 18) && (rel.romance > 0 || ['dating', 'partner'].includes(rel.status))) invalid();
        if (rel.boundary && (rel.romance > 0 || ['dating', 'partner'].includes(rel.status))) invalid();
        if (rel.status === 'partner') partners++;
        relationships[npc.id] = {
          friendship: rel.friendship, trust: rel.trust, romance: rel.romance, status: rel.status,
          dates: finite(rel.dates) ? Math.floor(clamp(rel.dates, 0, 100000)) : 0,
          boundary: !!rel.boundary,
          lastMet: finite(rel.lastMet) ? Math.floor(clamp(rel.lastMet, 0, input.day)) : 0,
          friendMilestone: !!rel.friendMilestone,
          sharedHistory: this._cleanHistory(rel.sharedHistory || [], invalid), conflict: finite(rel.conflict) ? clamp(rel.conflict) : 0,
          casual: this._validatedCasual(rel.casual, input.day, invalid, npc.family || npc.age < 18)
        };
      }
      if (partners > 1) invalid();
      const personality = {};
      for (const key of ['empathy', 'confidence', 'discipline', 'creativity', 'sociability']) personality[key] = finite(input.personality && input.personality[key]) ? clamp(input.personality[key]) : 50;
      const safeMap = (source, predicate) => {
        const result = {};
        if (isObject(source)) for (const [key, value] of Object.entries(source)) {
          if (key !== '__proto__' && key !== 'constructor' && key !== 'prototype' && predicate(key, value)) result[key] = value;
        }
        return result;
      };
      const journal = input.journal.slice(0, 1000).map(entry => {
        if (!isObject(entry) || !finite(entry.day) || !finite(entry.hour) || typeof entry.title !== 'string' || typeof entry.text !== 'string') invalid();
        return { day: Math.floor(clamp(entry.day, 1, input.day)), hour: clamp(entry.hour, 0, 23), title: cleanText(entry.title, '', 100), text: cleanText(entry.text, '', 3000), kind: cleanText(entry.kind, 'life', 20), npcId: typeof entry.npcId === 'string' ? cleanText(entry.npcId, '', 80) : null, tags: Array.isArray(entry.tags) ? entry.tags.filter(tag => typeof tag === 'string').slice(0, 8) : [entry.kind || 'life'], eventId: typeof entry.eventId === 'string' ? cleanText(entry.eventId, '', 100) : null };
      });
      const state = {
        version: 2, profile: this._profile(profile), day: input.day, hour: input.hour, location: input.location, money: Math.round(input.money),
        stats: Object.fromEntries(STATS.map(key => [key, input.stats[key]])), personality, relationships, journal,
        counters: Object.fromEntries(COUNTERS.map(key => [key, Math.floor(input.counters[key])])),
        claimedGoals: [...new Set(input.claimedGoals.filter(id => (this.data.goals || []).some(goal => goal.id === id) || typeof id==='string'&&id.startsWith('asp_') || ['respuesta_cercana', 'hogar_compartido', 'fondo_tranquilo'].includes(id)))],
        flags: { cheats: input.flags.cheats === true, cheatsUsed: input.flags.cheatsUsed === true || input.flags.cheats === true, storageNoticeSeen: input.flags.storageNoticeSeen === true },
        daily: {
          interactions: safeMap(input.daily.interactions, (key, value) => !!this.getNPC(key) && finite(value) && value >= 0 && value <= 100),
          actions: safeMap(input.daily.actions, (key, value) => key.length < 100 && finite(value) && value >= 0 && value <= 100),
          gifts: safeMap(input.daily.gifts, (key, value) => !!this.getNPC(key) && value === true),
          workHours: finite(input.daily.workHours) ? clamp(input.daily.workHours, 0, 8) : 0
        }
      };
      this._hydrateV2(state, input.rngState);
      if(input.version>=2)this._validatedV2(input,state,invalid);
      if(input.version===3&&!root.Vinculos?.LifeSystems)invalid();
      this._system('hydrate',[state,input]);
      return state;
    }

    _cleanHistory(history, invalid, limit = 100) {
      if (!Array.isArray(history) || history.length > 3000) invalid();
      return history.slice(-limit).map(entry => {
        if (!isObject(entry) || !finite(entry.day)) invalid();
        const result = { day: Math.floor(clamp(entry.day, 1, 1000000)) };
        for (const key of ['type', 'title', 'text', 'eventId', 'optionId', 'resultId', 'npcId']) if (typeof entry[key] === 'string') result[key] = cleanText(entry[key], '', key === 'text' ? 3000 : 160);
        if (Array.isArray(entry.tags)) result.tags = entry.tags.filter(tag => typeof tag === 'string').slice(0, 8).map(tag => tag.slice(0, 80));
        return result;
      });
    }

    _validatedCasual(value, day, invalid, forbidden = false) {
      if (value === undefined) return freshCasual();
      if (!isObject(value) || !['unknown', 'casual', 'romantic', 'declined'].includes(value.expectations)) invalid();
      if (!finite(value.attraction) || value.attraction < 0 || value.attraction > 100) invalid();
      if (!Number.isInteger(value.encounters) || value.encounters < 0 || value.encounters > 1000000) invalid();
      if (!Number.isInteger(value.lastEncounterDay) || value.lastEncounterDay < 0 || value.lastEncounterDay > day) invalid();
      if (!Array.isArray(value.history) || value.history.length > 40) invalid();
      if (forbidden && (value.expectations !== 'unknown' || value.attraction || value.encounters || value.lastEncounterDay || value.history.length)) invalid();
      const history = value.history.map(entry => {
        if (!isObject(entry) || !Number.isInteger(entry.day) || entry.day < 1 || entry.day > day || !finite(entry.hour) || entry.hour < 0 || entry.hour > 23) invalid();
        if (!NIGHT_ACTIONS.includes(entry.type) || typeof entry.title !== 'string' || entry.title.length > 160 || typeof entry.text !== 'string' || entry.text.length > 3000) invalid();
        return { day: entry.day, hour: entry.hour, type: entry.type, title: entry.title, text: entry.text };
      });
      return { expectations: value.expectations, attraction: value.attraction, encounters: value.encounters, lastEncounterDay: value.lastEncounterDay, history };
    }

    _validatedV2(input, state, invalid) {
      const number = (value, min, max, integer = false) => { if (!finite(value) || value < min || value > max || integer && !Number.isInteger(value)) invalid(); return value; };
      const object = value => { if (!isObject(value)) invalid(); return value; };
      const array = (value, max) => { if (!Array.isArray(value) || value.length > max) invalid(); return value; };
      const text = (value, max = 160) => { if (typeof value !== 'string' || value.length > max) invalid(); return value; };
      const safeEntries = value => Object.entries(object(value)).filter(([key]) => !['__proto__', 'constructor', 'prototype'].includes(key));
      if(input.career!==undefined){const c=object(input.career);state.career={level:number(c.level,0,4,true),experience:number(c.experience,0,1000000,true),lastRequestDay:number(c.lastRequestDay,0,state.day,true),promotions:array(c.promotions,4).map(item=>{object(item);return {day:number(item.day,1,state.day,true),level:number(item.level,1,4,true)};})};}
      state.rngState = number(input.rngState, 0, 4294967295, true);
      state.savedAt = number(input.savedAt, 0, 8640000000000000, true);
      state.birthDay = number(input.birthDay, 1, 360, true);
      const family = object(input.family);
      state.family = { support: number(family.support, 0, 100), tension: number(family.tension, 0, 100), expenses: number(family.expenses, 0, 1000000), children: [] };
      const childIds = new Set();
      for (const child of array(family.children, 4)) {
        object(child);
        if (!/^child_[a-z\d_]+$/i.test(child.id) || childIds.has(child.id) || child.family !== true || child.available !== false || child.child !== true) invalid();
        childIds.add(child.id);
        const bornOn = number(child.bornOn, 1, state.day, true);
        const traits = array(child.traits, 3).map(trait => text(trait, 80));
        state.family.children.push({ id: child.id, name: text(child.name, 32), lastName: cleanText(child.lastName, '', 40), age: 0, pronouns: 'elle', gender: 'nonbinary', child: true, bornOn, birthDay: number(child.birthDay, 1, 360, true), family: true, available: false, relation: 'Hije', occupation: 'Miembro de la familia', bio: cleanText(child.bio, '', 500), traits, interests: ['juegos', 'cuentos'], home: 'casa', locations: ['casa'], skin: /^#[a-f\d]{6}$/i.test(child.skin) ? child.skin : state.profile.skin, hair: /^#[a-f\d]{6}$/i.test(child.hair) ? child.hair : state.profile.hair, hairStyle: 'short', outfit: '#9da992', color: '#c9d6bc' });
        const rel = object(input.relationships[child.id]);
        if (rel.status !== 'family' || rel.romance !== 0) invalid();
        state.relationships[child.id] = { friendship: number(rel.friendship, 0, 100), trust: number(rel.trust, 0, 100), romance: 0, status: 'family', dates: 0, boundary: false, lastMet: number(rel.lastMet, 0, state.day, true), friendMilestone: false, sharedHistory: this._cleanHistory(rel.sharedHistory, invalid), conflict: finite(rel.conflict) ? clamp(rel.conflict) : 0, casual: this._validatedCasual(rel.casual, state.day, invalid, true) };
      }
      state.npcStates = {};
      for (const npc of this.data.npcs.concat(state.family.children)) {
        const dynamic = object(object(input.npcStates)[npc.id] || (npc.addedIn ? {movedTo:null,awayUntil:0,mood:60,needs:{support:50,space:50},history:[]} : null));
        if (dynamic.movedTo !== null && !this.data.locations.some(location => location.id === dynamic.movedTo)) invalid();
        const needs = object(dynamic.needs);
        state.npcStates[npc.id] = { movedTo: dynamic.movedTo, awayUntil: number(dynamic.awayUntil, 0, 1000000, true), mood: number(dynamic.mood, 0, 100), needs: { support: number(needs.support, 0, 100), space: number(needs.space, 0, 100) }, history: this._cleanHistory(dynamic.history, invalid) };
      }
      const narrative = object(input.narrative);
      const flags = {};
      for (const [key, value] of safeEntries(narrative.flags)) {
        if (key.length > 160 || !(typeof value === 'boolean' || typeof value === 'string' && value.length <= 1000 || finite(value))) invalid();
        flags[key] = value;
      }
      const counts = {};
      for (const [key, value] of safeEntries(narrative.counts)) { object(value); counts[text(key)] = { count: number(value.count, 0, 1000000, true), lastDay: number(value.lastDay, 0, state.day, true) }; }
      const queue = array(narrative.queue, 100).map(item => { object(item); return { eventId: text(item.eventId), dueDay: number(item.dueDay, 1, 1000000, true), sourceEventId: typeof item.sourceEventId === 'string' ? text(item.sourceEventId) : null, npcId: typeof item.npcId === 'string' ? text(item.npcId) : null }; });
      let pending = null;
      if (narrative.pending !== null) {
        const item = object(narrative.pending);
        const context = isObject(item.context) ? JSON.parse(JSON.stringify(item.context)) : {};
        if (JSON.stringify(context).length > 10000) invalid();
        pending = { eventId: text(item.eventId), day: number(item.day, 1, state.day, true), npcId: typeof item.npcId === 'string' ? text(item.npcId) : null, variantIndex: number(item.variantIndex ?? 0, 0, 100, true), context };
      }
      state.narrative = { history: this._cleanHistory(narrative.history, invalid, 3000), queue, pending, flags, counts, recentTags: array(narrative.recentTags, 100).map(item => { object(item); return { tag: text(item.tag, 80), day: number(item.day, 1, state.day, true) }; }) };
      const ids = new Set();
      state.messages = array(input.messages, 200).map(item => {
        object(item);
        if (ids.has(item.id) || !state.relationships[item.npcId] || typeof item.answered !== 'boolean') invalid();
        ids.add(item.id);
        const message = { id: text(item.id), npcId: text(item.npcId), text: text(item.text, 2000), day: number(item.day, 1, state.day, true), answered: item.answered };
        if (typeof item.reply === 'string') message.reply = text(item.reply, 80);
        return message;
      });
      state.achievements = [...new Set(array(input.achievements, 100).filter(id => ACHIEVEMENTS.some(achievement => achievement.id === id)))];
      const start = object(input.dayStart);
      const stats = {};
      for (const key of STATS) stats[key] = number(object(start.stats)[key], 0, 100);
      const startRelationships = {};
      for (const [id, rel] of safeEntries(start.relationships)) { if (!state.relationships[id]) continue; object(rel); startRelationships[id] = { friendship: number(rel.friendship, 0, 100), trust: number(rel.trust, 0, 100), romance: number(rel.romance, 0, 100) }; }
      const counters = {};
      for (const key of COUNTERS) counters[key] = number(object(start.counters)[key], 0, 1000000000);
      state.dayStart = { stats, money: number(start.money, 0, 99999999), relationships: startRelationships, counters };
      for(const [id,rel] of Object.entries(state.relationships))if(!state.dayStart.relationships[id])state.dayStart.relationships[id]={friendship:rel.friendship,trust:rel.trust,romance:rel.romance};
      const ledger = object(input.ledger);
      state.ledger = { earned: number(ledger.earned, 0, 1000000000), spent: number(ledger.spent, 0, 1000000000), actions: array(ledger.actions, 100).map(action => { object(action); return { hour: number(action.hour, 0, 23), text: text(action.text, 3000), kind: text(action.kind, 30) }; }) };
      state.summaries = array(input.summaries, 720).map(summary => {
        object(summary);
        const changes = {};
        for (const key of STATS) changes[key] = number(object(summary.statChanges || summary.stats)[key], -100, 100);
        return { day: number(summary.day, 1, state.day, true), year: number(summary.year, 1, 1000000, true), dateLabel: text(summary.dateLabel), stats: changes, statChanges: changes, earned: number(summary.earned, 0, 1000000000), spent: number(summary.spent, 0, 1000000000), moneyChange: number(summary.moneyChange, -99999999, 99999999), actions: array(summary.actions, 100).map(action => text(action, 3000)), relationshipChanges: array(summary.relationshipChanges, 100).map(change => { object(change); return { npcId: text(change.npcId), name: text(change.name), friendship: number(change.friendship, -100, 100), trust: number(change.trust, -100, 100), romance: number(change.romance, -100, 100) }; }), highlight: text(summary.highlight, 3000) };
      });
      const age = state.profile.age + Math.floor((state.day + 360 - state.birthDay) / 360) - (state.birthDay === 1 ? 1 : 0);
      state.lifeStage = age < 25 ? 'juventud' : age < 40 ? 'adultez_temprana' : age < 65 ? 'adultez' : 'madurez';
    }
  }

  LifeGame.SAVE_KEY = SAVE_KEY;
  LifeGame.LEGACY_BACKUP_KEY = LEGACY_BACKUP_KEY;
  root.LifeGame = LifeGame;
  if (typeof module !== 'undefined' && module.exports) module.exports = LifeGame;
})(typeof window !== 'undefined' ? window : globalThis);
