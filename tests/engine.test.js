'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'data.js'), 'utf8'), context);
globalThis.VINCULOS_DATA = context.window.VINCULOS_DATA;
const LifeGame = require('../engine.js');

function fixture(profile = {}) {
  const records = new Map();
  const storage = {
    getItem: key => records.get(key) || null,
    setItem: (key, value) => records.set(key, value),
    removeItem: key => records.delete(key)
  };
  const game = new LifeGame(storage);
  game.create({ name: 'Alex', lastName: 'Rivera', age: 19, path: 'university', ...profile });
  return { game, storage, records };
}

function unchangedFailure(game, action, pattern) {
  const before = JSON.stringify(game.state);
  const outcome = action();
  assert.equal(outcome.ok, false);
  if (pattern) assert.match(outcome.message, pattern);
  assert.equal(JSON.stringify(game.state), before, 'Una acción rechazada debe conservar todo el estado');
  return outcome;
}

function meet(game, npcId) {
  const place = game.data.locations.find(location => game.getPresentNPCs(location.id).some(npc => npc.id === npcId));
  assert.ok(place, `${npcId} debe tener un lugar en su agenda`);
  if (game.state.location !== place.id) assert.equal(game.travel(place.id).ok, true);
  assert.ok(game.getPresentNPCs().some(npc => npc.id === npcId), `${npcId} debe estar presente tras llegar`);
}

function interact(game, npcId, type) {
  meet(game, npcId);
  const result = game.interact(npcId, type);
  assert.equal(result.ok, true, `${npcId}/${type}: ${result.message}`);
  return result;
}

test('El contenido tiene familia completa, entornos y solamente personas adultas', () => {
  const { game } = fixture();
  for (const id of ['padre', 'madre', 'hermana', 'hermano', 'tia', 'tio', 'prima']) {
    assert.equal(game.getNPC(id).family, true);
    assert.equal(game.getRelationship(id).status, 'family');
  }
  assert.equal(game.data.locations.length, 16);
  for(const id of ['casa','plaza','cafeteria','colegio','universidad','trabajo'])assert.ok(game.data.locations.some(l=>l.id===id));
  assert.ok(game.data.npcs.length >= 16);
  assert.ok(game.data.npcs.every(npc => npc.age >= 18));
  for (const npc of game.data.npcs) {
    assert.ok([9,14,19,21].some(hour=>game.data.locations.some(place=>game.getPresentNPCs(place.id,hour).some(person=>person.id===npc.id))),npc.id+' debe tener una agenda accesible');
  }
});

test('El reloj avanza con desplazamientos y actividades; la noche nunca salta de día sola', () => {
  const { game } = fixture();
  assert.equal(game.getClock(), '09:00');
  assert.equal(game.getWeekday(), 'Lunes');
  assert.equal(game.travel('plaza').ok, true);
  assert.equal(game.getClock(), '09:30');
  assert.equal(game.state.stats.energy, 83);
  unchangedFailure(game, () => game.travel('plaza'));
  unchangedFailure(game, () => game.travel('inexistente'));
  game.state.hour = 22;
  assert.equal(game.travel('casa').ok, true);
  unchangedFailure(game, () => game.performAction('estudiar_casa'), /Duerme/);
  assert.equal(game.state.day, 1);
  assert.equal(game.sleep().ok, true);
  assert.equal(game.state.day, 2);
  assert.equal(game.getClock(), '09:00');
  assert.equal(game.state.location, 'casa');
  assert.equal(game.state.stats.energy, 100);
  assert.equal(game.sleep().ok, true, 'El jugador puede terminar expresamente un día incluso por la mañana');
  assert.equal(game.state.day, 3);
});

test('El cansancio y los costes bloquean acciones, pero descansar permite recuperarse', () => {
  const { game } = fixture();
  game.state.stats.energy = 0;
  unchangedFailure(game, () => game.performAction('estudiar_casa'), /energía/);
  unchangedFailure(game, () => game.interact('madre', 'help'), /energía/);
  assert.equal(game.performAction('descanso').ok, true);
  assert.equal(game.state.stats.energy, 25);
  assert.equal(game.performAction('estudiar_casa').ok, true);
  game.state.money = 0;
  unchangedFailure(game, () => game.performAction('comer_casa'), /6 €/);
  assert.ok(Object.values(game.state.stats).every(value => value >= 0 && value <= 100));
});

test('Estudiar desarrolla conocimiento y los rasgos elegidos cambian efectos reales', () => {
  const normal = fixture().game;
  const curious = fixture({ traitIds: ['curiosidad', 'serenidad'] }).game;
  assert.equal(normal.performAction('estudiar_casa').ok, true);
  assert.equal(curious.performAction('estudiar_casa').ok, true);
  assert.equal(normal.state.counters.study, 1);
  assert.ok(curious.state.stats.knowledge > normal.state.stats.knowledge);
  assert.ok(curious.state.stats.stress < normal.state.stats.stress);
  assert.equal(normal.performAction('estudiar_casa').ok, true);
  assert.equal(normal.getGoals().find(goal => goal.type === 'study').complete, true);
  assert.equal(normal.travel('colegio').ok, true);
  unchangedFailure(normal, () => normal.performAction('clase_colegio'), /ruta de colegio/);
  assert.equal(normal.choosePath('school').ok, true);
  assert.equal(normal.performAction('clase_colegio').ok, true);
});

test('El trabajo paga, respeta la ruta y limita la jornada; el freelance admite fines de semana', () => {
  const { game } = fixture();
  assert.equal(game.travel('trabajo').ok, true);
  unchangedFailure(game, () => game.performAction('trabajar_turno'), /ruta de trabajo/);
  assert.equal(game.choosePath('work').ok, true);
  assert.equal(game.performAction('trabajar_turno').ok, true);
  assert.equal(game.state.money, 210);
  assert.equal(game.state.counters.work, 1);
  assert.equal(game.performAction('trabajar_turno').ok, true);
  assert.equal(game.state.daily.workHours, 8);
  unchangedFailure(game, () => game.performAction('trabajar_turno'));
  assert.equal(game.sleep().ok, true);
  assert.equal(game.state.daily.workHours, 0);
  game.state.day = 6;
  assert.equal(game.travel('trabajo').ok, true);
  unchangedFailure(game, () => game.performAction('trabajar_turno'), /fin de semana/);
  assert.equal(game.choosePath('free').ok, true);
  assert.equal(game.performAction('trabajar_freelance').ok, true);
  assert.equal(game.state.money, 332);
});

test('Todos los familiares permiten vínculos y límites, pero nunca romance', () => {
  const { game } = fixture();
  for (const npc of game.data.npcs.filter(person => person.family)) {
    for (const action of ['flirt', 'askDate', 'date', 'relationship']) unchangedFailure(game, () => game.interact(npc.id, action));
    const result = game.interact(npc.id, 'boundary');
    assert.equal(result.ok, true);
    assert.doesNotMatch(result.message + result.dialogue, /rom[aá]nt|coquet|cita/);
    assert.equal(game.getRelationship(npc.id).boundary, false);
    assert.equal(game.getRelationship(npc.id).romance, 0);
    assert.equal(game.getRelationship(npc.id).status, 'family');
    assert.equal(game.getRelationship(npc.id).trust, 74);
    unchangedFailure(game, () => game.interact(npc.id, 'boundary'), /hoy/);
  }
  assert.equal(game.state.stats.stress, 0);
});

test('Las interacciones requieren presencia, tienen rendimientos decrecientes y se reinician al dormir', () => {
  const { game } = fixture();
  unchangedFailure(game, () => game.interact('mateo', 'chat'), /no está aquí/);
  const gains = [];
  for (let i = 0; i < 6; i++) {
    const before = game.getRelationship('madre').trust;
    assert.equal(game.interact('madre', 'chat').ok, true);
    gains.push(game.getRelationship('madre').trust - before);
  }
  assert.ok(gains[0] > gains[5]);
  unchangedFailure(game, () => game.interact('madre', 'chat'), /espacio/);
  assert.equal(game.sleep().ok, true);
  assert.equal(game.state.daily.interactions.madre, undefined);
  assert.equal(game.interact('madre', 'chat').ok, true);
  assert.equal(game.state.daily.interactions.madre, 1);
});

test('El romance progresa mediante amistad, interés, invitación, citas y elección explícita de pareja', () => {
  const { game } = fixture();
  meet(game, 'mateo');
  unchangedFailure(game, () => game.interact('mateo', 'flirt'), /afinidad 30/);
  unchangedFailure(game, () => game.interact('mateo', 'date'), /Primero invita/);
  for (const action of ['chat', 'listen', 'chat', 'flirt', 'flirt', 'flirt']) interact(game, 'mateo', action);
  assert.equal(game.getRelationship('mateo').status, 'acquaintance');
  assert.equal(game.sleep().ok, true);
  interact(game, 'mateo', 'chat');
  interact(game, 'mateo', 'flirt');
  interact(game, 'mateo', 'askDate');
  assert.equal(game.getRelationship('mateo').status, 'dating');
  const moneyBeforeDates = game.state.money;
  interact(game, 'mateo', 'date');
  meet(game, 'mateo');
  unchangedFailure(game, () => game.interact('mateo', 'relationship'), /2 citas/);
  interact(game, 'mateo', 'date');
  assert.equal(game.state.money, moneyBeforeDates - 20);
  assert.equal(game.state.counters.date, 2);
  assert.equal(game.getRelationship('mateo').status, 'dating', 'Dos citas no formalizan una relación automáticamente');
  interact(game, 'mateo', 'relationship');
  assert.equal(game.getRelationship('mateo').status, 'partner');
  assert.equal(game.interact('mateo', 'breakup').ok, true);
  assert.equal(game.getRelationship('mateo').status, 'friend');
  assert.equal(game.getRelationship('mateo').romance, 0);
  assert.equal(game.getRelationship('mateo').dates, 0);
});

test('Se respetan límites personales y una persona con pareja solo permite amistad', () => {
  const { game } = fixture();
  unchangedFailure(game, () => game.interact('gabriel', 'flirt'), /no está buscando/);
  game.getRelationship('mateo').dates = 2;
  game.getRelationship('mateo').romance = 40;
  game.getRelationship('mateo').status = 'dating';
  const social = game.state.stats.social;
  const mood = game.state.stats.mood;
  const conversations = game.state.counters.social;
  assert.equal(game.interact('mateo', 'boundary').ok, true);
  assert.equal(game.getRelationship('mateo').boundary, true);
  assert.equal(game.getRelationship('mateo').dates, 0);
  assert.equal(game.getRelationship('mateo').romance, 0);
  assert.equal(game.state.stats.social, social);
  assert.equal(game.state.stats.mood, mood);
  assert.equal(game.state.counters.social, conversations);
  unchangedFailure(game, () => game.interact('mateo', 'flirt'), /límite/);
  unchangedFailure(game, () => game.interact('mateo', 'boundary'), /hoy/);
  assert.equal(game.sleep().ok, true);
  assert.equal(game.interact('mateo', 'boundary').ok, true);
  assert.equal(game.getRelationship('mateo').boundary, false);
  assert.equal(game.getRelationship('mateo').romance, 0);
});

test('Consultar una agenda futura predice la llegada sin alterar el reloj ni el estado', () => {
  const { game } = fixture();
  game.state.hour = 11.5;
  const before = JSON.stringify(game.state);
  assert.ok(game.getPresentNPCs('cafeteria').some(npc => npc.id === 'mateo'));
  assert.ok(!game.getPresentNPCs('cafeteria', 12).some(npc => npc.id === 'mateo'));
  assert.ok(game.getPresentNPCs('plaza', 12).some(npc => npc.id === 'mateo'));
  assert.equal(JSON.stringify(game.state), before);
  assert.equal(game.travel('plaza').ok, true);
  assert.equal(game.getClock(), '12:00');
  assert.ok(game.getPresentNPCs().some(npc => npc.id === 'mateo'));
});

test('Las metas solo dan recompensa cuando se completan y se cobran una vez', () => {
  const { game } = fixture();
  const goal = game.getGoals().find(item => item.type === 'social');
  unchangedFailure(game, () => game.claimGoal(goal.id), /Aún/);
  for (const action of ['chat', 'listen', 'joke']) assert.equal(game.interact('madre', action).ok, true);
  assert.equal(game.getGoals().find(item => item.id === goal.id).complete, true);
  const before = game.state.money;
  assert.equal(game.claimGoal(goal.id).ok, true);
  assert.equal(game.state.money, before + goal.reward);
  unchangedFailure(game, () => game.claimGoal(goal.id), /Ya/);
  unchangedFailure(game, () => game.claimGoal('no-existe'));
});

test('Los trucos son opcionales y aumentar amistad nunca crea interés romántico', () => {
  const { game } = fixture();
  unchangedFailure(game, () => game.cheat('money'));
  assert.equal(game.cheat('toggle').ok, true);
  assert.equal(game.cheat('money').ok, true);
  assert.equal(game.state.money, 620);
  assert.equal(game.cheat('relationship', 'mateo').ok, true);
  assert.equal(game.getRelationship('mateo').friendship, 100);
  assert.equal(game.getRelationship('mateo').trust, 100);
  assert.equal(game.getRelationship('mateo').romance, 0);
  assert.equal(game.getRelationship('mateo').status, 'friend');
  assert.equal(game.cheat('relationship', 'madre').ok, true);
  assert.equal(game.getRelationship('madre').romance, 0);
  assert.equal(game.cheat('stats').ok, true);
  assert.equal(game.state.stats.stress, 0);
  assert.equal(game.state.stats.energy, 100);
  unchangedFailure(game, () => game.cheat('desconocido'));
});

test('Editar el personaje valida edad/nombre/rasgos y conserva el progreso', () => {
  const { game } = fixture();
  assert.equal(game.performAction('estudiar_casa').ok, true);
  const knowledge = game.state.stats.knowledge;
  unchangedFailure(game, () => game.updateProfile({ name: ' ' }));
  unchangedFailure(game, () => game.updateProfile({ age: 17 }));
  unchangedFailure(game, () => game.updateProfile({ age: 81 }));
  unchangedFailure(game, () => game.updateProfile({ traitIds: ['empatia', 'curiosidad', 'serenidad'] }));
  assert.equal(game.updateProfile({ name: 'Vera', age: 24, traitIds: ['empatia', 'curiosidad'] }).ok, true);
  assert.equal(game.state.profile.name, 'Vera');
  assert.equal(game.state.stats.knowledge, knowledge);
  assert.equal(game.state.counters.study, 1);
});

test('El guardado local y la exportación mantienen la partida; las importaciones inválidas son atómicas', () => {
  const { game, storage } = fixture();
  game.interact('madre', 'listen');
  game.performAction('estudiar_casa');
  const exported = game.exportSave();
  const restored = new LifeGame(storage);
  assert.equal(restored.load(), true);
  assert.deepEqual(JSON.parse(restored.exportSave()), JSON.parse(exported));
  assert.equal(restored.importSave(exported).ok, true);
  for (const transform of [
    data => { data.profile.age = 17; },
    data => { data.money = -10; },
    data => { data.stats.energy = 101; },
    data => { data.location = 'inexistente'; },
    data => { data.relationships.madre.romance = 1; },
    data => { data.relationships.gabriel.status = 'partner'; },
    data => { data.relationships.mateo.status = 'partner'; data.relationships.sofia.status = 'partner'; },
    data => { data.daily = null; }
  ]) {
    const invalid = JSON.parse(exported);
    transform(invalid);
    unchangedFailure(restored, () => restored.importSave(JSON.stringify(invalid)));
  }
  unchangedFailure(restored, () => restored.importSave('{'));
  unchangedFailure(restored, () => restored.importSave('{}'));
  assert.equal(restored.reset().ok, true);
  assert.equal(restored.state, null);
  assert.equal(new LifeGame(storage).load(), false);
});

test('Un guardado corrupto se informa y conserva hasta una decisión explícita del jugador', () => {
  const { storage, records } = fixture();
  records.set(LifeGame.SAVE_KEY, '{guardado dañado');
  const game = new LifeGame(storage);
  assert.equal(game.load(), false);
  assert.equal(game.corruptSave, true);
  assert.match(game.loadError, /dañado/);
  game.create({ name: 'Alex', age: 19, path: 'free' });
  game.performAction('descanso');
  assert.equal(records.get(LifeGame.SAVE_KEY), '{guardado dañado');
  assert.equal(game.lastSaveSucceeded, false);
  const validExport = game.exportSave();
  assert.equal(game.importSave(validExport).ok, true);
  assert.equal(game.corruptSave, false);
  assert.equal(game.loadError, null);
  assert.equal(new LifeGame(storage).load(), true);
});

test('El almacenamiento bloqueado no impide jugar ni exportar una partida', () => {
  const storage = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } };
  const game = new LifeGame(storage);
  assert.equal(game.load(), false);
  assert.match(game.loadError, /no permite leer/);
  assert.equal(game.corruptSave, false);
  game.create({ name: 'Alex', age: 19, path: 'free' });
  assert.equal(game.lastSaveSucceeded, false);
  assert.equal(game.performAction('descanso').ok, true);
  assert.equal(JSON.parse(game.exportSave()).profile.name, 'Alex');
  assert.equal(game.reset().ok, true);
});

test('Una partida real de versión 1 migra sin perder personaje, recursos, vínculos ni decisiones', () => {
  const legacyText = fs.readFileSync(path.join(__dirname, 'fixtures', 'save-v1.json'), 'utf8');
  const legacy = JSON.parse(legacyText);
  const { game, records } = fixture();
  records.set(LifeGame.SAVE_KEY, legacyText);
  assert.equal(game.load(), true);
  assert.equal(game.state.version, 2);
  for (const key of ['day', 'hour', 'location', 'money']) assert.equal(game.state[key], legacy[key]);
  assert.deepEqual(JSON.parse(JSON.stringify(game.state.profile)), legacy.profile);
  assert.deepEqual(game.state.stats, legacy.stats);
  assert.deepEqual(game.state.counters, legacy.counters);
  assert.equal(game.getRelationship('madre').trust, legacy.relationships.madre.trust);
  assert.equal(game.state.journal.length, legacy.journal.length);
  assert.equal(game.state.narrative.pending, null);
  assert.ok(Number.isInteger(game.state.rngState));
  assert.equal(JSON.parse(records.get(LifeGame.SAVE_KEY)).version, 2, 'La migración se persiste al cargar');
  assert.equal(records.get(LifeGame.LEGACY_BACKUP_KEY), legacyText);
  assert.equal(game.save(), true);
  assert.equal(JSON.parse(records.get(LifeGame.SAVE_KEY)).version, 2);
  assert.equal(records.size, 2, 'El slot principal conserva su clave y se añade una copia del original');
});

test('Una migración con cuota llena conserva el original y puede persistirse al recuperar espacio', () => {
  const legacyText = fs.readFileSync(path.join(__dirname, 'fixtures', 'save-v1.json'), 'utf8');
  const records = new Map([[LifeGame.SAVE_KEY, legacyText]]);
  let blocked = true;
  const storage = { getItem: key => records.get(key) || null, setItem: (key, value) => { if (blocked) throw new Error('quota'); records.set(key, value); } };
  const game = new LifeGame(storage);
  assert.equal(game.load(), true, 'El guardado sigue siendo jugable en memoria');
  assert.equal(game.state.version, 2);
  assert.equal(game.lastSaveSucceeded, false);
  assert.match(game.loadError, /original se conserva/);
  assert.equal(records.get(LifeGame.SAVE_KEY), legacyText);
  assert.equal(records.has(LifeGame.LEGACY_BACKUP_KEY), false);
  assert.equal(game.performAction('descanso').ok, true);
  assert.equal(records.get(LifeGame.SAVE_KEY), legacyText, 'Las acciones tampoco omiten la copia de seguridad');
  blocked = false;
  assert.equal(game.save(), true);
  assert.equal(records.get(LifeGame.LEGACY_BACKUP_KEY), legacyText);
  assert.equal(JSON.parse(records.get(LifeGame.SAVE_KEY)).version, 2);
});

test('Si falla escribir v2 después de copiar el original, ambos originales siguen recuperables', () => {
  const legacyText = fs.readFileSync(path.join(__dirname, 'fixtures', 'save-v1.json'), 'utf8');
  const records = new Map([[LifeGame.SAVE_KEY, legacyText]]);
  const storage = { getItem: key => records.get(key) || null, setItem: (key, value) => { if (key === LifeGame.SAVE_KEY) throw new Error('quota'); records.set(key, value); } };
  const game = new LifeGame(storage);
  assert.equal(game.load(), true);
  assert.equal(game.lastSaveSucceeded, false);
  assert.equal(records.get(LifeGame.SAVE_KEY), legacyText);
  assert.equal(records.get(LifeGame.LEGACY_BACKUP_KEY), legacyText);
});

test('Validar una importación es una lectura: no reemplaza ni guarda la partida', () => {
  const { game, records } = fixture();
  const before = game.exportSave();
  const disk = records.get(LifeGame.SAVE_KEY);
  const legacy = fs.readFileSync(path.join(__dirname, 'fixtures', 'save-v1.json'), 'utf8');
  const preview = game.validateImport(legacy);
  assert.equal(preview.ok, true);
  assert.equal(preview.state.profile.name, 'Vera');
  assert.equal(game.exportSave(), before);
  assert.equal(records.get(LifeGame.SAVE_KEY), disk);
  assert.equal(game.importSave(legacy).ok, true);
  assert.equal(game.state.profile.name, 'Vera');
  game.state.flags.storageNoticeSeen = true;
  game.save();
  assert.equal(game.load(), true);
  assert.equal(game.state.flags.storageNoticeSeen, true);
});

test('Los campos nuevos del guardado se validan antes de reemplazar estado o disco', () => {
  const { game, records } = fixture();
  const original = game.exportSave();
  for (const change of [
    state => { state.version = 999; },
    state => { state.rngState = -1; },
    state => { state.rngState = 4294967296; },
    state => { state.rngState = null; },
    state => { state.npcStates.madre.mood = 101; },
    state => { state.npcStates.madre.needs.space = -1; },
    state => { state.family.support = null; },
    state => { state.family.expenses = -10; },
    state => { state.narrative.counts.test = { count: -1, lastDay: 1 }; },
    state => { state.narrative.pending = { eventId: 'x', day: 1, variantIndex: -2 }; },
    state => { state.narrative.queue = [{ eventId: 'x', dueDay: -2 }]; },
    state => { state.messages = [{ id: 'x', npcId: 'no-existe', text: 'Hola', day: 1, answered: false }]; },
    state => { state.ledger.spent = -5; },
    state => { state.dayStart.stats.energy = 101; }
  ]) {
    const invalid = JSON.parse(original);
    change(invalid);
    const disk = records.get(LifeGame.SAVE_KEY);
    unchangedFailure(game, () => game.importSave(JSON.stringify(invalid)));
    assert.equal(records.get(LifeGame.SAVE_KEY), disk);
  }
});

test('El azar es reproducible por semilla y continúa igual después de guardar y cargar', () => {
  const first = fixture();
  const second = fixture();
  first.game.state.rngState = second.game.state.rngState = 123456;
  const a = Array.from({ length: 20 }, () => first.game.random());
  const b = Array.from({ length: 20 }, () => second.game.random());
  assert.deepEqual(a, b);
  assert.ok(a.every(value => value >= 0 && value < 1));
  first.game.save();
  const restored = new LifeGame(first.storage);
  assert.equal(restored.load(), true);
  assert.equal(restored.random(), first.game.random());
});

test('El resumen conserva actividades, deltas, vínculos y contabilidad bruta y llega al diario', () => {
  const { game } = fixture({ path: 'work' });
  game.travel('trabajo');
  game.performAction('trabajar_turno');
  game.travel('casa');
  game.interact('madre', 'gift');
  const live = game.getDaySummary();
  assert.equal(live.earned, 90);
  assert.equal(live.spent, 12);
  assert.equal(live.moneyChange, 78);
  assert.ok(live.actions.some(action => /turno/.test(action)));
  assert.ok(live.relationshipChanges.some(change => change.npcId === 'madre' && change.trust > 0));
  assert.equal(live.stats.energy, game.state.stats.energy - game.state.dayStart.stats.energy);
  const result = game.sleep();
  assert.equal(result.ok, true);
  assert.deepEqual(result.summary, live);
  assert.equal(game.state.summaries.length, 1);
  assert.ok(game.state.journal.some(entry => entry.kind === 'summary' && /78 €/.test(entry.text)));
  assert.equal(game.state.ledger.earned, 0);
  assert.equal(game.state.ledger.spent, 0);
  assert.equal(game.state.dayStart.money, game.state.money);
  game._effects({ money: 10 });
  game._success('Un evento con ingreso y coste', { moneyEarned: 30, moneySpent: 20, kind: 'event', skipNarrative: true });
  assert.equal(game.state.ledger.earned, 30);
  assert.equal(game.state.ledger.spent, 20);
  assert.equal(game.getAnnualSummary(1).days, 1);
});

test('El calendario cambia estaciones y año, recuerda cumpleaños y calcula la etapa vital', () => {
  const { game } = fixture({ age: 24 });
  for (const [day, season] of [[1, 'primavera'], [91, 'verano'], [181, 'otoño'], [271, 'invierno']]) {
    assert.equal(game.getCalendar(day).season, season);
    assert.equal(game.getCalendar(day).seasonDay, 1);
  }
  assert.equal(game.getCalendar(361).year, 2);
  assert.equal(game.getCalendar(361).dayOfYear, 1);
  assert.ok(game.getCalendar(1).special.length);
  const mother = game.getNPC('madre');
  assert.ok(game.getCalendar(mother.birthDay).special.some(date => date.npcId === 'madre'));
  assert.equal(game.getLifeStage(), 'juventud');
  game.state.day = game.state.birthDay;
  assert.equal(game.getAge(), 25);
  assert.equal(game.getLifeStage(), 'adultez_temprana');
  game.state.day = 361;
  assert.equal(game.getNPC('madre').age, mother.age + 1);
});

test('Los mensajes gastan recursos, mejoran vínculos y no pueden responderse dos veces', () => {
  const { game } = fixture();
  game.state.messages.push({ id: 'first', npcId: 'madre', text: '¿Cómo estás?', day: 1, answered: false });
  const trust = game.getRelationship('madre').trust;
  assert.equal(game.replyMessage('first', 'warm').ok, true);
  assert.equal(game.getClock(), '09:15');
  assert.equal(game.state.stats.energy, 82);
  assert.ok(game.getRelationship('madre').trust > trust);
  assert.equal(game.state.messages[0].answered, true);
  assert.ok(game.getRelationship('madre').sharedHistory.some(entry => entry.type === 'message'));
  unchangedFailure(game, () => game.replyMessage('first', 'warm'));
  assert.equal(game.getGoals().find(goal => goal.id === 'respuesta_cercana').complete, true);
  const copy = game.exportSave();
  assert.equal(game.importSave(copy).ok, true);
  assert.equal(game.state.messages[0].answered, true);
});

test('El desacuerdo crea tensión o rivalidad y la personalidad cambia cómo se recibe el humor', () => {
  const { game } = fixture();
  meet(game, 'diego');
  assert.equal(game.interact('diego', 'disagree').ok, true);
  assert.equal(game.getRelationship('diego').status, 'rival');
  assert.ok(game.getRelationship('diego').conflict > 0);
  assert.equal(game.interact('diego', 'apologize').ok, true);
  game.state.npcStates.diego.mood = 20;
  const before = game.getRelationship('diego').friendship;
  const reply = game.interact('diego', 'joke');
  assert.equal(reply.ok, true);
  assert.ok(game.getRelationship('diego').friendship < before);
  assert.match(reply.dialogue, /calma/);
  assert.ok(game.getConversationOptions('diego').some(option => option.id === 'disagree'));
  const worker = fixture({ path: 'work' }).game;
  meet(worker, 'alex');
  assert.equal(worker.interact('alex', 'chat').ok, true);
  assert.equal(worker.getRelationship('alex').status, 'coworker');
});

test('Las personas tienen iniciativa y el deterioro lento actualiza el tipo de vínculo', () => {
  const { game } = fixture();
  game.state.rngState = 781;
  game.state.relationships.mateo.friendship = 40;
  game.state.relationships.mateo.trust = 40;
  game.state.relationships.mateo.status = 'friend';
  game.state.relationships.mateo.lastMet = 1;
  for (let day = 0; day < 12; day++) assert.equal(game.sleep().ok, true);
  assert.ok(game.state.messages.some(message => !message.answered));
  assert.ok(game.getRelationship('mateo').friendship < 40);
  assert.equal(game.getRelationship('mateo').status, 'acquaintance');
  assert.ok(Object.values(game.state.npcStates).some(npc => npc.mood !== 60));
});

test('Los hijos solo llegan por elección, heredan rasgos y sus cuidados tienen costes reales', () => {
  const { game } = fixture({ traitIds: ['empatia', 'creatividad'] });
  unchangedFailure(game, () => game.addChild('Sol'), /pareja estable/);
  Object.assign(game.getRelationship('mateo'), { status: 'partner', friendship: 80, trust: 80, romance: 70, dates: 3 });
  game.state.money = 300;
  game._trackBaseline();
  assert.equal(game.addChild('Sol').ok, true);
  assert.equal(game.state.family.children.length, 1);
  const child = game.state.family.children[0];
  assert.equal(game.getNPC(child.id).age, 0);
  assert.equal(child.traits.length, 2);
  assert.ok(child.traits.includes('Empatía'));
  assert.equal(game.state.family.expenses, 5);
  assert.equal(game.state.money, 150);
  unchangedFailure(game, () => game.interact(child.id, 'flirt'));
  const result = game.sleep();
  assert.equal(result.ok, true);
  assert.equal(result.summary.spent, 155);
  assert.equal(game.state.money, 145);
  const json = game.exportSave();
  assert.equal(game.importSave(json).ok, true);
  assert.equal(game.getNPC(child.id).name, 'Sol');
  const invalid = JSON.parse(json);
  invalid.relationships[child.id].romance = 5;
  unchangedFailure(game, () => game.importSave(JSON.stringify(invalid)));
});

test('Activar trucos marca la partida inmediatamente y bloquea logros futuros', () => {
  const honest = fixture().game;
  honest.state.counters.friend = 1;
  honest._success('Una amistad');
  assert.equal(honest.getAchievements().find(item => item.id === 'first_friend').unlocked, true);
  const cheated = fixture().game;
  cheated.state.counters.friend = 1;
  assert.equal(cheated.cheat('enable').ok, true);
  assert.equal(cheated.state.flags.cheatsUsed, true);
  assert.equal(cheated.getAchievements().find(item => item.id === 'first_friend').unlocked, false);
  cheated.cheat('toggle');
  cheated._success('Un nuevo logro posible');
  assert.equal(cheated.getAchievements().every(item => !item.unlocked && item.disabled), true);
});

test('Un imprevisto obligatorio bloquea acciones, pero no deja atrapada una partida sin tiempo', () => {
  const { game } = fixture();
  game.getPendingEvent = () => ({ mandatory: true, options: [{ available: true }] });
  unchangedFailure(game, () => game.travel('plaza'), /imprevisto/);
  unchangedFailure(game, () => game.performAction('descanso'), /imprevisto/);
  unchangedFailure(game, () => game.interact('madre', 'chat'), /imprevisto/);
  unchangedFailure(game, () => game.sleep(), /imprevisto/);
  game.state.hour = 23;
  game.getPendingEvent = () => ({ mandatory: true, options: [{ available: false }] });
  assert.equal(game.shouldEndDay(), true);
  assert.equal(game.sleep().ok, true);
  assert.equal(game.getClock(), '09:00');
});

test('Las habilidades maduras tienen rendimiento decreciente y el bienestar necesita mantenimiento', () => {
  const low = fixture().game;
  const high = fixture().game;
  low.state.stats.knowledge = 30;
  high.state.stats.knowledge = 90;
  low.performAction('estudiar_casa');
  high.performAction('estudiar_casa');
  assert.ok(low.state.stats.knowledge - 30 > high.state.stats.knowledge - 90);
  const social = low.state.stats.social;
  const health = low.state.stats.health;
  const knowledge = low.state.stats.knowledge;
  low.sleep();
  assert.ok(low.state.stats.social < social);
  assert.ok(low.state.stats.health < health);
  assert.ok(low.state.stats.knowledge < knowledge);
  assert.equal(low.state.stats.energy, 100);
});
