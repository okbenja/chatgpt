'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'data.js'), 'utf8'), context);
globalThis.VINCULOS_DATA = context.window.VINCULOS_DATA;
const LifeGame = require('../engine.js');
const Narrative = require('../narrative.js');

function fixture(customEvents) {
  const storage = new Map();
  const adapter = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
  const game = new LifeGame(adapter);
  game.create({ name: 'Vera', age: 24, path: 'university', traitIds: ['empatia', 'curiosidad'] });
  game.state.rngState = 83442;
  if (customEvents) game.data = { ...game.data, events: customEvents };
  return { game, adapter };
}
const base = (overrides = {}) => ({ id: 'encuentro', title: 'Una pregunta', text: '{player}, {npc} recuerda {memory:proyecto}.', tags: ['amistad'], weight: 10, cooldown: 5, maxOccurrences: 3, npcId: 'mateo', options: [{ id: 'escuchar', text: 'Escuchar con calma', duration: 0.5, results: [{ id: 'cerca', text: 'La conversación abre un espacio de confianza.', weight: 1, effects: { stats: { mood: 2 }, relationships: { mateo: { trust: 3 } }, flags: { proyecto: 'la libreta compartida' } } }] }, { id: 'actuar', text: 'Proponer un plan', cost: 5, duration: 1, results: [{ id: 'plan', text: 'Encontráis un plan concreto.', weight: 1, effects: { stats: { responsibility: 3 }, money: 2 } }] }], ...overrides });

test('El catálogo contiene al menos sesenta historias base y diez cadenas completas', () => {
  const data = globalThis.VINCULOS_DATA;
  assert.ok(data.events.filter(event => !event.chainOnly).length >= 60);
  const ids = new Set(data.events.map(event => event.id));
  assert.equal(ids.size, data.events.length);
  const roots = data.events.filter(event => !event.chainOnly && event.options.some(option => option.results.some(result => result.next)));
  assert.ok(roots.length >= 10);
  for (const event of data.events) {
    assert.ok(event.title && event.text && event.tags.length && event.options.length >= 2, event.id);
    for (const option of event.options) {
      assert.ok(option.text && option.results.length >= 1, event.id);
      assert.ok(option.results.every(result => result.text && result.effects));
      for (const result of option.results) if (result.next) assert.ok(ids.has(result.next.eventId), result.next.eventId);
    }
  }
});

test('La semilla reproduce elecciones y los getters nunca consumen azar', () => {
  const first = fixture([base()]).game, second = fixture([base()]).game;
  assert.equal(Narrative.maybeQueue(first, { kind: 'start' }).id, Narrative.maybeQueue(second, { kind: 'start' }).id);
  const before = JSON.stringify(first.state);
  assert.deepEqual(Narrative.getPendingEvent(first), Narrative.getPendingEvent(first));
  Narrative.getEventWeights(first);
  assert.equal(JSON.stringify(first.state), before);
  const a = Narrative.chooseEvent(first, 'encuentro', 'escuchar');
  const b = Narrative.chooseEvent(second, 'encuentro', 'escuchar');
  assert.equal(a.resultId, b.resultId);
  assert.equal(first.state.rngState, second.state.rngState);
});

test('Recargar conserva el encuentro pendiente, su variante, la semilla y sus recuerdos', () => {
  const { game, adapter } = fixture([base({ variants: ['Otra manera de recordar {memory:proyecto}.'] })]);
  Narrative.maybeQueue(game, { kind: 'start' });
  game.save();
  const restored = new LifeGame(adapter);
  restored.data = game.data;
  assert.equal(restored.load(), true);
  assert.deepEqual(Narrative.getPendingEvent(restored), Narrative.getPendingEvent(game));
  const first = Narrative.chooseEvent(game, 'encuentro', 'escuchar');
  const second = Narrative.chooseEvent(restored, 'encuentro', 'escuchar');
  assert.equal(first.resultId, second.resultId);
  assert.equal(game.state.rngState, restored.state.rngState);
  const final = new LifeGame(adapter);
  final.data = game.data;
  assert.equal(final.load(), true);
  assert.equal(final.state.narrative.history[0].optionId, 'escuchar');
  assert.equal(final.state.narrative.flags.proyecto, 'la libreta compartida');
});

test('Las condiciones combinan lugar, etapa, estación, recursos, vínculos y decisiones', () => {
  const { game } = fixture([base()]);
  const season = game.getCalendar().season;
  assert.equal(Narrative.evaluateRequirements(game, { locations: ['casa'], paths: ['university'], seasons: [season], stats: { energy: { min: 50 } }, relationships: { madre: { trust: { min: 60 }, status: ['family'] } }, flags: { promesa: false } }).ok, true);
  assert.equal(Narrative.evaluateRequirements(game, { stats: { energy: { min: 90 } } }).ok, false);
  assert.equal(Narrative.evaluateRequirements(game, { locations: ['trabajo'] }).ok, false);
  assert.equal(Narrative.evaluateRequirements(game, { flags: { promesa: true } }).ok, false);
  assert.equal(Narrative.evaluateRequirements(game, { traits: ['empatia'] }).ok, true);
});

test('El cooldown, máximo por partida y etiquetas recientes afectan los pesos', () => {
  const { game } = fixture([base(), base({ id: 'otra', tags: ['dinero'] })]);
  game.state.narrative.counts.encuentro = { count: 1, lastDay: 1 };
  assert.equal(Narrative.getEventWeights(game).find(item => item.id === 'encuentro').weight, 0);
  game.state.day = 7;
  game.state.narrative.recentTags = [{ tag: 'amistad', day: 6 }];
  const weights = Narrative.getEventWeights(game);
  assert.ok(weights.find(item => item.id === 'encuentro').weight < weights.find(item => item.id === 'otra').weight);
  game.state.narrative.counts.encuentro.count = 3;
  assert.equal(Narrative.getEventWeights(game).find(item => item.id === 'encuentro').weight, 0);
});

test('Las opciones validan coste y requisitos antes de cambiar el estado o la semilla', () => {
  const { game } = fixture([base()]);
  Narrative.maybeQueue(game, { kind: 'start' });
  game.state.money = 0;
  const before = JSON.stringify(game.state);
  assert.equal(Narrative.chooseEvent(game, 'encuentro', 'actuar').ok, false);
  assert.equal(JSON.stringify(game.state), before);
  assert.equal(Narrative.chooseEvent(game, 'encuentro', 'no-existe').ok, false);
  assert.equal(JSON.stringify(game.state), before);
});

test('Las estadísticas, personalidad y confianza modifican la probabilidad del resultado', () => {
  const { game } = fixture([base()]);
  const outcome = { weight: 1, modifiers: [{ stat: 'knowledge', factor: 0.04 }, { relationship: 'trust', npcId: 'mateo', factor: 0.03 }, { trait: 'empatia', factor: 0.5 }] };
  game.state.stats.knowledge = 10;
  game.getRelationship('mateo').trust = 10;
  const low = Narrative.resultWeight(game, outcome, 'mateo');
  game.state.stats.knowledge = 80;
  game.getRelationship('mateo').trust = 70;
  const high = Narrative.resultWeight(game, outcome, 'mateo');
  assert.ok(high > low * 3);
});

test('Las decisiones cambian recursos y vínculos y dejan memoria, historial y prosa', () => {
  const { game } = fixture([base()]);
  Narrative.maybeQueue(game, { kind: 'start' });
  const before = game.getRelationship('mateo').trust;
  const result = Narrative.chooseEvent(game, 'encuentro', 'escuchar');
  assert.equal(result.ok, true);
  assert.equal(game.getRelationship('mateo').trust, before + 3);
  assert.equal(game.state.hour, 9.5);
  assert.equal(game.state.narrative.flags.proyecto, 'la libreta compartida');
  assert.equal(game.state.narrative.flags.decision_encuentro, 'Escuchar con calma');
  assert.equal(game.state.narrative.history.length, 1);
  assert.equal(game.state.narrative.pending, null);
  assert.ok(game.state.journal.some(entry => entry.eventId === 'encuentro'));
  assert.ok(game.getRelationship('mateo').sharedHistory.length >= 1);
});

test('Conversaciones y eventos comparten un historial reciente en orden cronológico', () => {
  const { game } = fixture([base()]);
  game.state.location = 'cafeteria';
  assert.equal(game.interact('mateo', 'chat').ok, true);
  Narrative.maybeQueue(game, { kind: 'start' });
  assert.equal(Narrative.chooseEvent(game, 'encuentro', 'escuchar').ok, true);
  assert.equal(game.interact('mateo', 'chat').ok, true);
  const shared = game.getRelationship('mateo').sharedHistory;
  assert.equal(shared.length, 3);
  assert.equal(shared[0].type, 'chat');
  assert.equal(shared[1].title, 'Una pregunta');
  assert.equal(shared[2].type, 'chat');
});

test('Una cadena respeta el retardo y recupera la decisión anterior dentro del texto', () => {
  const root = base({ id: 'inicio' });
  root.options[0].results[0].next = { eventId: 'continuacion', delayDays: 2 };
  const next = base({ id: 'continuacion', text: 'Recordáis {memory:proyecto}.', chainOnly: true });
  const { game } = fixture([root, next]);
  Narrative.maybeQueue(game, { kind: 'start' });
  assert.equal(Narrative.chooseEvent(game, 'inicio', 'escuchar').ok, true);
  assert.equal(game.state.narrative.queue[0].dueDay, 3);
  game.state.day = 2;
  assert.equal(Narrative.maybeQueue(game, { kind: 'day' }), null);
  game.state.day = 3;
  const pending = Narrative.maybeQueue(game, { kind: 'day' });
  assert.equal(pending.id, 'continuacion');
  assert.match(pending.text, /la libreta compartida/);
});

test('Las continuaciones también respetan cooldown y máximo de apariciones', () => {
  const next = base({ id: 'continuacion', chainOnly: true, maxOccurrences: 2 });
  const { game } = fixture([next]);
  game.state.day = 4;
  game.state.narrative.counts.continuacion = { count: 1, lastDay: 3 };
  game.state.narrative.queue = [{ eventId: 'continuacion', dueDay: 3, sourceEventId: 'inicio', npcId: 'mateo' }];
  assert.equal(Narrative.maybeQueue(game, { kind: 'day' }), null);
  assert.equal(game.state.narrative.queue.length, 1);
  game.state.day = 8;
  game.state.narrative.counts.continuacion.count = 2;
  assert.equal(Narrative.maybeQueue(game, { kind: 'day' }), null);
  assert.equal(game.state.narrative.queue.length, 0);
});

test('Los imprevistos obligatorios no se pueden saltar y la depuración necesita trucos', () => {
  const { game } = fixture([base({ mandatory: true })]);
  const before = JSON.stringify(game.state);
  assert.equal(Narrative.forceEvent(game, 'encuentro').ok, false);
  assert.equal(JSON.stringify(game.state), before);
  game.cheat('enable');
  assert.equal(Narrative.forceEvent(game, 'encuentro').ok, true);
  assert.equal(game.state.flags.cheatsUsed, true);
  const pending = JSON.stringify(game.state.narrative.pending);
  assert.equal(Narrative.deferEvent(game).ok, false);
  assert.equal(JSON.stringify(game.state.narrative.pending), pending);
});

test('Las opciones diferentes producen consecuencias diferentes y aplazar consume tiempo', () => {
  const a = fixture([base()]).game, b = fixture([base()]).game;
  Narrative.maybeQueue(a, { kind: 'start' }); Narrative.maybeQueue(b, { kind: 'start' });
  Narrative.chooseEvent(a, 'encuentro', 'escuchar'); Narrative.chooseEvent(b, 'encuentro', 'actuar');
  assert.notEqual(a.state.money, b.state.money);
  assert.notEqual(a.getRelationship('mateo').trust, b.getRelationship('mateo').trust);
  const c = fixture([base()]).game;
  Narrative.maybeQueue(c, { kind: 'start' });
  assert.equal(Narrative.deferEvent(c).ok, true);
  assert.equal(c.state.hour, 9.5);
  assert.equal(c.state.narrative.pending, null);
});

test('La simulación recorre días reales, reproduce una semilla y conserva la partida viva', () => {
  const { game } = fixture();
  const before = JSON.stringify(game.state);
  const first = Narrative.simulateDays(game, 5, 42);
  assert.equal(first.completedDays, 5);
  assert.ok(first.actions > 10);
  assert.equal(first.errors.length, 0);
  assert.equal(JSON.stringify(game.state), before);
  const second = Narrative.simulateDays(game, 5, 42);
  assert.deepEqual(first.distribution, second.distribution);
  assert.deepEqual(first.economy.samples, second.economy.samples);
});


test('La mañana siguiente se limita al día posterior al encuentro y no inventa recuerdos antiguos',()=>{
  const {game}=fixture([base()]);
  const conditions={flagAge:{name:'casual_last_encounter_day',min:1,max:1}};
  assert.equal(Narrative.evaluateRequirements(game,conditions).ok,false);
  game.state.narrative.flags.casual_last_encounter_day=1;game.state.day=2;
  assert.equal(Narrative.evaluateRequirements(game,conditions).ok,true);
  game.state.day=3;assert.equal(Narrative.evaluateRequirements(game,conditions).ok,false);
});
