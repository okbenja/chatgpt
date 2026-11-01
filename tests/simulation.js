'use strict';

// Ensayo de equilibrio reproducible: usa las mismas reglas y el mismo piloto
// automático que el panel de depuración; no modifica ninguna partida real.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8'), context);
globalThis.VINCULOS_DATA = context.window.VINCULOS_DATA;
const LifeGame = require(path.join(ROOT, 'engine.js'));
require(path.join(ROOT, 'narrative.js'));
const Narrative = globalThis.Vinculos.Narrative;
const catalog = globalThis.VINCULOS_DATA.events;
assert.ok(Array.isArray(catalog), 'El catálogo narrativo debe estar cargado');
assert.ok(catalog.filter(event => !event.chainOnly).length >= 60, 'Se necesitan al menos 60 eventos base');
const starts = catalog.filter(event => !event.chainOnly && event.options.some(option => option.results.some(result => result.next && catalog.some(target => target.id === result.next.eventId && target.chainOnly))));
assert.ok(starts.length >= 10, 'Se necesitan al menos 10 cadenas con un inicio base y continuaciones');
assert.ok(globalThis.VINCULOS_DATA.npcs.every(npc => npc.traits.length === 3), 'Cada persona debe conservar tres rasgos');

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? Number(process.argv[index + 1]) : fallback;
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name}: se necesita un entero positivo`);
  return value;
}

const days = option('--days', 365);
const count = option('--seeds', 20);
const seeds = Array.from({ length: count }, (_, i) => (0x6d2b79f5 + Math.imul(i + 1, 2654435761)) >>> 0);
const paths = ['school', 'university', 'work', 'free'];
const ages = [19, 22, 28, 35, 44, 59, 67];
const reports = [];

function fixture(index = 0) {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
  };
  const game = new LifeGame(storage);
  game.create({
    name: 'Vera', lastName: 'Ensayo', age: ages[index % ages.length],
    path: paths[index % paths.length],
    traitIds: index % 2 ? ['empatia', 'curiosidad'] : ['serenidad', 'creatividad']
  }, { seed: seeds[index % seeds.length] });
  return game;
}

// Guardamos toda la partida, no solo el dinero, para detectar que el ensayo
// depurador altere por accidente el RNG, los eventos pendientes o el guardado.
const source = fixture();
const original = source.exportSave();
const first = Narrative.simulateDays(source, Math.min(days, 30), seeds[0]);
const repeat = Narrative.simulateDays(source, Math.min(days, 30), seeds[0]);
for (const key of ['distribution', 'history', 'statExtremes', 'economy']) {
  assert.deepEqual(first[key], repeat[key], `La semilla debe reproducir ${key}`);
}
assert.equal(source.exportSave(), original, 'Simular no puede modificar la partida de origen');
console.log('PASS: semilla reproducible y partida de origen intacta');

for (let index = 0; index < count; index++) {
  const game = fixture(index);
  const before = game.exportSave();
  const report = Narrative.simulateDays(game, days, seeds[index]);
  assert.equal(game.exportSave(), before, 'El piloto no debe modificar el guardado de origen');
  assert.equal(report.days, days, 'El ensayo debe solicitar todos los días');
  assert.equal(report.completedDays, days, 'El ensayo debe completar todos los días solicitados');
  assert.equal(report.finalDay, game.state.day + days, 'El reloj debe haber avanzado exactamente todos los días');
  assert.ok(report.distribution && report.statExtremes && report.economy, 'Informe incompleto');
  assert.equal(report.economy.end, report.economy.start + report.economy.earned - report.economy.spent, 'La economía debe incluir todos los ingresos y gastos, incluidos los de terminar el día');
  assert.deepEqual(report.errors || [], [], `Errores en la semilla ${seeds[index]}`);
  reports.push({ ...report, initialProfile: { age: game.state.profile.age, path: game.state.profile.path, traits: game.state.profile.traitIds } });
  console.log(`PASS: semilla ${index + 1}/${count}, ${days} días, ${Object.values(report.distribution).reduce((a, b) => a + b, 0)} eventos`);
}

const distribution = {};
const statExtremes = {};
let repetitions = 0, maxPerWeek = 0, weekCount = 0;
for (const report of reports) {
  for (const [id, occurrences] of Object.entries(report.distribution)) distribution[id] = (distribution[id] || 0) + occurrences;
  repetitions += report.repetitions.repeatedWithinWeek;
  maxPerWeek = Math.max(maxPerWeek, report.repetitions.maxPerWeek);
  weekCount += Object.keys(report.repetitions.weekly).length;
  for (const [key, values] of Object.entries(report.statExtremes)) {
    const total = statExtremes[key] ||= { atZero: 0, atHundred: 0, maxRunZero: 0, maxRunHundred: 0, ending: [] };
    total.atZero += values.atZero;
    total.atHundred += values.atHundred;
    total.maxRunZero = Math.max(total.maxRunZero, values.maxRunZero);
    total.maxRunHundred = Math.max(total.maxRunHundred, values.maxRunHundred);
    total.ending.push(values.ending);
  }
}
const neverTriggered = catalog.filter(event => !distribution[event.id]);
const totalDays = days * count;
const totalEvents = Object.values(distribution).reduce((a, b) => a + b, 0);
const sum = field => reports.reduce((total, report) => total + report.economy[field], 0);
const ends = reports.map(report => report.economy.end);
const aggregate = {
  daysPerSeed: days, seeds, totalDays, initialProfiles: reports.map(r => r.initialProfile),
  totalEvents, catalogSize: catalog.length,
  baseEvents: catalog.filter(event => !event.chainOnly).length,
  triggeredDistinct: Object.keys(distribution).length,
  distribution, neverTriggered: neverTriggered.map(event => ({ id: event.id, title: event.title, chainOnly: !!event.chainOnly, conditions: event.conditions })),
  repetitions: { totalExtraWithinWeek: repetitions, weeksObserved: weekCount, averageExtraPerWeek: repetitions / Math.max(1, weekCount), maxSameEventInOneWeek: maxPerWeek },
  statExtremes,
  economy: { earned: sum('earned'), spent: sum('spent'), initial: sum('start'), final: sum('end'), min: Math.min(...reports.map(r => r.economy.min)), max: Math.max(...reports.map(r => r.economy.max)), endingMin: Math.min(...ends), endingMax: Math.max(...ends), endingMean: ends.reduce((a, b) => a + b, 0) / ends.length },
  reproducibility: true, sourceSaveUnchanged: true,
  errors: reports.flatMap(r => r.errors || [])
};

const percent = value => `${(100 * value / totalDays).toFixed(2)} %`;
const range = values => `${Math.min(...values)}–${Math.max(...values)}`;
const baseNever = neverTriggered.filter(event => !event.chainOnly);
const chainNever = neverTriggered.filter(event => event.chainOnly);
const money = value => `${Math.round(value).toLocaleString('es-ES')} €`;
const reportText = [
  '# Informe de equilibrio de Vínculos',
  '',
  `Ensayo reproducible de **${days} días × ${count} semillas = ${totalDays.toLocaleString('es-ES')} días** con el piloto automático del motor narrativo. No usa trucos, no fuerza eventos y no modifica la partida que inicia el ensayo.`,
  '',
  '## Método',
  '',
  '- El piloto ejecuta desplazamientos, actividades, conversaciones, mensajes, decisiones narrativas y descansos mediante los métodos del juego. Sus decisiones siguen una política de autocuidado y variedad, no una estrategia humana óptima.',
  '- Los perfiles iniciales recorren colegio, universidad, trabajo y tiempo libre; edades de 19 a 67 años y dos combinaciones de rasgos. Las condiciones de pareja, confianza, estación o cadenas siguen siendo necesarias: no se eliminan para conseguir cobertura.',
  '- Dos ejecuciones de una misma semilla comparan distribución, historial, extremos y economía; se verifica que todo el guardado de origen permanezca idéntico.',
  '- Las estadísticas se observan al cierre de cada día. Una frecuencia de 100 no equivale por sí sola a un bloqueo: energía, por ejemplo, vuelve a subir al descansar. Se informa también de la racha máxima.',
  '',
  '## Eventos y repetición',
  '',
  `- Catálogo: **${catalog.length} eventos**, de los que **${aggregate.baseEvents} son bases** y ${catalog.length - aggregate.baseEvents} son continuaciones.`,
  `- Resoluciones: **${totalEvents.toLocaleString('es-ES')}**, con **${aggregate.triggeredDistinct} eventos distintos**.`,
  `- Repeticiones adicionales del mismo evento dentro de una semana: **${repetitions}** en ${weekCount} semanas observadas (${aggregate.repetitions.averageExtraPerWeek.toFixed(3)} por semana).`,
  `- Máximo de apariciones del mismo evento en una semana: **${maxPerWeek}**.`,
  `- Eventos base no vistos: **${baseNever.length}**. Continuaciones no vistas: **${chainNever.length}**.`,
  '',
  '| Evento no observado | Tipo | Condiciones |',
  '| --- | --- | --- |',
  ...(neverTriggered.length ? neverTriggered.map(event => `| ${event.title} (${event.id}) | ${event.chainOnly ? 'Continuación' : 'Base'} | \`${JSON.stringify(event.conditions || {})}\` |`) : ['| Ninguno | — | Todos aparecieron en al menos una ejecución |']),
  '',
  '## Estadísticas',
  '',
  '| Estadística | Días en 0 | Días en 100 | Racha máxima en 0 / 100 | Valor final (rango) |',
  '| --- | ---: | ---: | ---: | ---: |',
  ...Object.entries(statExtremes).map(([key, values]) => `| ${key} | ${values.atZero} (${percent(values.atZero)}) | ${values.atHundred} (${percent(values.atHundred)}) | ${values.maxRunZero} / ${values.maxRunHundred} | ${range(values.ending)} |`),
  '',
  '## Economía',
  '',
  `- Dinero inicial agregado: ${money(aggregate.economy.initial)}. Ingresos: ${money(aggregate.economy.earned)}. Gastos: ${money(aggregate.economy.spent)}.`,
  `- Saldo final por partida: ${money(aggregate.economy.endingMin)}–${money(aggregate.economy.endingMax)}; media ${money(aggregate.economy.endingMean)}.`,
  `- Mínimo y máximo observados durante el ensayo: ${money(aggregate.economy.min)} / ${money(aggregate.economy.max)}.`,
  `- Errores de ejecución: **${aggregate.errors.length}**.`,
  '',
  '## Límites e interpretación',
  '',
  'La cobertura corresponde a esta política automática y estas semillas. No demuestra que todos los recorridos humanos estén equilibrados ni que un evento condicionado sin aparecer sea imposible. Las estadísticas persistentes pueden acercarse a sus límites al acumular un año de práctica; las tablas permiten detectar esa saturación sin confundirla con un fallo del generador. Los eventos encadenados dependen de elecciones previas y pueden no recorrerse con esta política.',
  '',
  '## Reproducir',
  '',
  '```sh',
  'node tests/simulation.js --days 365 --seeds 20 --write',
  '```',
  '',
  'El informe JSON completo se escribe en `/tmp/vinculos-balance-report.json`; `--write` actualiza este documento con los resultados de la ejecución.',
  ''
].join('\n');

fs.writeFileSync('/tmp/vinculos-balance-report.json', JSON.stringify({ aggregate, reports }, null, 2));
if (process.argv.includes('--write')) fs.writeFileSync(path.join(ROOT, 'BALANCE_REPORT.md'), reportText);
console.log(JSON.stringify(aggregate, null, 2));
