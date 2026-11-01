'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(require.resolve('../data.js'), 'utf8'), context);
globalThis.VINCULOS_DATA = context.window.VINCULOS_DATA;
const Game = require('../engine.js');

function fixture() {
  const store = new Map();
  const storage = { getItem: key => store.get(key) || null, setItem: (key, value) => store.set(key, value), removeItem: key => store.delete(key) };
  const game = new Game(storage);
  game.create({ name: 'Vera', age: 27, path: 'free', traitIds: ['empatia'] }, { seed: 55 });
  return { game, storage, store };
}
function rejected(game, action, pattern) {
  const before = game.exportSave();
  const result = action();
  assert.equal(result.ok, false);
  if (pattern) assert.match(result.message, pattern);
  assert.equal(game.exportSave(), before, 'Una decisión rechazada no modifica recursos, semilla ni guardado');
  return result;
}
function atClub(game) { game.state.hour = 19; game.state.location = 'discoteca'; }
function ready(game, npcId = 'celia') {
  game.getRelationship(npcId).casual = { expectations: 'casual', attraction: 30, encounters: 0, lastEncounterDay: 0, history: [] };
}

test('Los seis destinos nuevos tienen horarios y las llegadas se validan antes de viajar', () => {
  const { game } = fixture();
  assert.equal(game.data.locations.length, 16);
  for (const id of ['bar', 'discoteca', 'azotea', 'playa', 'centrocultural', 'restaurante']) assert.ok(game.data.locations.some(p => p.id === id));
  assert.equal(game.getLocationAvailability('discoteca', 18.5).open, false);
  assert.equal(game.getLocationAvailability('discoteca', 19).open, true);
  assert.equal(game.getLocationAvailability('discoteca', 23).open, false);
  rejected(game, () => game.travel('discoteca'), /abre/);
  game.state.hour = 18.5;
  assert.equal(game.travel('discoteca').ok, true);
  assert.equal(game.state.hour, 19);
  assert.equal(game.state.location, 'discoteca');
});

test('Esperar la apertura consume las horas y la energía indicadas, sin teletransportar ni saltar de día', () => {
  const { game } = fixture();
  assert.equal(game.waitUntilOpening('discoteca').ok, true);
  assert.equal(game.state.hour, 18.5);
  assert.equal(game.state.stats.energy, 66);
  assert.equal(game.state.location, 'casa');
  assert.equal(game.state.day, 1);
  assert.equal(game.travel('discoteca').ok, true);
  rejected(game, () => game.waitUntilOpening('discoteca'), /abierto/);
  game.state.hour = 22.5;
  game.state.location = 'casa';
  rejected(game, () => game.waitUntilOpening('centrocultural'), /mañana/);
});

test('Los personajes tienen agenda nocturna y no aparecen en locales cerrados', () => {
  const { game } = fixture();
  assert.equal(game.getPresentNPCs('discoteca', 18).length, 0);
  assert.ok(game.getPresentNPCs('discoteca', 19).some(n => n.id === 'celia'));
  assert.ok(game.getPresentNPCs('bar', 18).some(n => n.id === 'hugo'));
  assert.ok(game.getPresentNPCs('bar', 19).some(n => n.id === 'alex'));
  assert.ok(!game.getPresentNPCs('discoteca', 20).some(n => n.family || n.child || n.age < 18));
  assert.ok(game.data.npcs.every(n => game.data.locations.some(p => game.getPresentNPCs(p.id, 9).some(person => person.id === n.id))));
});

test('Las actividades no pueden continuar más allá del cierre de un lugar', () => {
  const { game } = fixture();
  game.state.location = 'centrocultural'; game.state.hour = 21.5;
  rejected(game, () => game.performAction('fabrica_exposicion'), /cierre/);
  game.state.hour = 9;
  rejected(game, () => game.performAction('fabrica_exposicion'), /abre/);
});

test('Las opciones nocturnas no consumen azar ni mutan estado y excluyen familiares y personas no disponibles', () => {
  const { game } = fixture(); atClub(game);
  const before = game.exportSave();
  const options = game.getNightOptions('celia');
  assert.equal(options.length, 8);
  assert.ok(options.every(o => typeof o.available === 'boolean' && typeof o.reason === 'string'));
  assert.equal(game.exportSave(), before);
  assert.deepEqual(game.getNightOptions('madre'), []);
  assert.deepEqual(game.getNightOptions('elias'), []);
  rejected(game, () => game.interactNight('madre', 'oneNight', { confirmEncounter: true }), /adultas/);
  rejected(game, () => game.interactNight('elias', 'casualFlirt'), /adultas/);
});

test('Un encuentro casual se construye con expectativas y atracción sin exigir amistad alta', () => {
  const { game } = fixture(); atClub(game);
  const initial = { friendship: game.getRelationship('celia').friendship, romance: game.getRelationship('celia').romance, dates: game.state.counters.date };
  assert.equal(game.interactNight('celia', 'talkExpectations').ok, true);
  assert.equal(game.getRelationship('celia').casual.expectations, 'casual');
  assert.equal(game.interactNight('celia', 'casualFlirt').ok, true);
  assert.equal(game.getRelationship('celia').casual.attraction, 20);
  const confirm = rejected(game, () => game.interactNight('celia', 'oneNight'));
  assert.equal(confirm.requiresEncounterConfirmation, true);
  const before = game.state.hour, money = game.state.money;
  const result = game.interactNight('celia', 'oneNight', { confirmEncounter: true });
  assert.equal(result.ok, true);
  assert.equal(game.state.hour, before + 1.5);
  assert.equal(game.state.money, money, 'La intimidad no se compra ni genera ingresos');
  assert.equal(game.getRelationship('celia').casual.encounters, 1);
  assert.equal(game.getRelationship('celia').status, 'acquaintance');
  assert.equal(game.getRelationship('celia').friendship, initial.friendship);
  assert.equal(game.getRelationship('celia').romance, initial.romance);
  assert.equal(game.state.counters.date, initial.dates);
  assert.equal(game.state.narrative.flags.casual_experience, true);
  assert.ok(result.message.includes('fuera de pantalla'));
  assert.ok(game.getRelationship('celia').casual.history.some(e => e.type === 'oneNight'));
});

test('Las negativas se respetan y ni un regalo ni una bebida permiten reiniciar el consentimiento', () => {
  const { game } = fixture(); game.state.hour = 18; game.state.location = 'bar';
  assert.equal(game.interactNight('mara', 'talkExpectations').ok, true);
  assert.equal(game.getRelationship('mara').casual.expectations, 'declined');
  rejected(game, () => game.interactNight('mara', 'casualFlirt'), /límite/);
  rejected(game, () => game.interactNight('mara', 'talkExpectations'), /hablado/);
  assert.equal(game.interactNight('mara', 'offerDrink').ok, true);
  assert.equal(game.getRelationship('mara').casual.expectations, 'declined');
  rejected(game, () => game.interactNight('mara', 'oneNight', { confirmEncounter: true }));
});

test('Puedes decir que no sin castigos sentimentales y ese límite persiste', () => {
  const { game } = fixture(); atClub(game); ready(game);
  const before = JSON.parse(game.exportSave());
  assert.equal(game.interactNight('celia', 'declineCasual').ok, true);
  assert.equal(game.getRelationship('celia').casual.expectations, 'declined');
  assert.equal(game.getRelationship('celia').friendship, before.relationships.celia.friendship);
  assert.equal(game.getRelationship('celia').trust, before.relationships.celia.trust);
  assert.equal(game.getRelationship('celia').romance, before.relationships.celia.romance);
  rejected(game, () => game.interactNight('celia', 'oneNight', { confirmEncounter: true }));
});

test('Poner un límite y despedirse siguen disponibles después del máximo diario de planes', () => {
  const { game } = fixture(); atClub(game); ready(game);
  game.state.daily.interactions.celia = 6;
  assert.equal(game.interactNight('celia', 'declineCasual').ok, true);
  assert.equal(game.getRelationship('celia').casual.expectations, 'declined');
  assert.equal(game.interactNight('celia', 'sayGoodbye').ok, true);
  rejected(game, () => game.interactNight('celia', 'sayGoodbye'), /despedido/);
});

test('El dinero, energía, tiempo y los límites de repetición bloquean acciones atómicamente', () => {
  const { game } = fixture(); atClub(game); ready(game);
  game.state.money = 0; rejected(game, () => game.interactNight('celia', 'offerDrink'), /Necesitas/);
  game.state.money = 120; game.state.stats.energy = 0;
  rejected(game, () => game.interactNight('celia', 'oneNight', { confirmEncounter: true }), /energía/);
  game.state.stats.energy = 100; game.state.hour = 22;
  rejected(game, () => game.interactNight('celia', 'oneNight', { confirmEncounter: true }), /tarde/);
  game.state.hour = 19;
  assert.equal(game.interactNight('celia', 'oneNight', { confirmEncounter: true }).ok, true);
  rejected(game, () => game.interactNight('celia', 'oneNight', { confirmEncounter: true }), /Ya has vivido/);
  assert.equal(game.interactNight('celia', 'danceTogether').ok, true);
  rejected(game, () => game.interactNight('celia', 'danceTogether'), /Ya habéis/);
});

test('La infidelidad casual necesita su propia confirmación y conserva sus consecuencias', () => {
  const { game } = fixture(); atClub(game); ready(game);
  Object.assign(game.getRelationship('valentina'), { status: 'partner', romance: 70, trust: 80, friendship: 80, dates: 3 });
  const confirm = rejected(game, () => game.interactNight('celia', 'oneNight', { confirmEncounter: true }));
  assert.equal(confirm.requiresInfidelityConfirmation, true);
  assert.equal(game.interactNight('celia', 'oneNight', { allowInfidelity: true, confirmEncounter: true }).ok, true);
  assert.equal(game.state.narrative.flags.secret_affair, true);
  assert.equal(game.state.narrative.flags.affair_target, 'celia');
  assert.ok(game.state.narrative.queue.some(q => q.eventId === 'secreto_pesa'));
});

test('El historial casual y las expectativas sobreviven al guardado, exportación e importación', () => {
  const { game, storage } = fixture(); atClub(game); ready(game);
  assert.equal(game.interactNight('celia', 'oneNight', { confirmEncounter: true }).ok, true);
  const exported = game.exportSave(), loaded = new Game(storage);
  assert.equal(loaded.load(), true);
  assert.deepEqual(loaded.getRelationship('celia').casual, game.getRelationship('celia').casual);
  assert.equal(loaded.importSave(exported).ok, true);
  assert.equal(loaded.getRelationship('celia').casual.history[0].type, 'oneNight');
});

test('Los guardados antiguos reciben campos casuales neutrales; valores mal formados nunca reemplazan la partida', () => {
  const { game } = fixture();
  const legacy = fs.readFileSync(require.resolve('./fixtures/save-v1.json'), 'utf8');
  assert.equal(game.importSave(legacy).ok, true);
  assert.deepEqual(game.getRelationship('celia').casual, { expectations: 'unknown', attraction: 0, encounters: 0, lastEncounterDay: 0, history: [] });
  const exported = JSON.parse(game.exportSave());
  for (const change of [s => s.relationships.celia.casual.attraction = 101, s => s.relationships.celia.casual.expectations = 'forzado', s => s.relationships.celia.casual.encounters = -1, s => s.relationships.celia.casual.history = [{}], s => s.relationships.madre.casual.attraction = 20]) {
    const invalid = JSON.parse(JSON.stringify(exported)); change(invalid);
    rejected(game, () => game.importSave(JSON.stringify(invalid)));
  }
});
