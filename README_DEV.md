# Desarrollo de Vínculos V3

El juego usa HTML, CSS y JavaScript sin frameworks, librerías de ejecución ni peticiones externas. Los retratos, escenas y gráficos son SVG propios. Puede abrirse desde `index.html`; Node.js 18 o posterior permite iniciar el servidor y ejecutar las pruebas.

## Iniciar y validar

```sh
npm run dev
npm test
python tests/browser_smoke.py
python tests/nightlife_browser.py
python tests/v3_browser.py
node tests/v3_simulation.js --days 1080 --seeds 20
```

No se necesita instalar paquetes para jugar, servir los archivos o ejecutar las pruebas Node. Los tests Python usan Playwright y Chromium como herramientas de desarrollo: cada suite levanta y detiene su servidor temporal y escribe capturas en `/tmp`. `server.js` sirve únicamente los archivos públicos del juego, incluido `systems.js`; `PORT` configura el puerto y `HOST` la interfaz de escucha.

La aplicación debe cargarse en este orden: `data.js`, `systems.js`, `engine.js`, `narrative.js`, `app.js`. En una prueba Node se puede usar:

```js
global.window = global;
require('./data.js');
require('./systems.js');
const Game = require('./engine.js');
require('./narrative.js');
const game = new Game(null);
game.create({name: 'Vera', age: 24, aspirationIds: ['creatividad']}, {seed: 42});
```

El motor cargado sin `systems.js` mantiene el contrato anterior para herramientas y pruebas de compatibilidad. La aplicación completa carga el módulo y crea partidas V3.

## Arquitectura y estado

| Archivo | Responsabilidad |
| --- | --- |
| `data.js` | Personas, lugares, actividades, eventos y catálogos de aspiraciones, etapas, dificultad, habilidades, empleos, vivienda, mascotas, clima y noticias. |
| `systems.js` | Módulo `Vinculos.LifeSystems`: hidratación y validación V3, metas, legado, economía, trabajo, práctica, hogar, bienestar y cambios diarios. |
| `engine.js` | Estado central, acciones y relaciones, calendario, recursos, guardado, migraciones y llamadas al módulo de sistemas. |
| `narrative.js` | Condiciones, pesos, cooldown, memoria, cadenas, selección y resultados con RNG persistente. |
| `app.js` | Vistas, formularios, diálogos, gráficos SVG y audio opcional. Los resultados pasan por las APIs del motor. |
| `styles.css` | Diseño adaptable, foco, medidores, controles táctiles y preferencia de movimiento reducido. |
| `tests/` | Regresiones Node, Chromium, fixtures de guardado y pilotos de simulación. |

Los campos V3 principales son:

```text
version: 3
aspirations: [id, id?]
direction:
  progress, legacy, memories, visitedLocations, lastChangeDay,
  settings {difficulty, audioEnabled, volume}, tutorial
life:
  economy {savings, debt, creditLimit, lastBilledDay, transactions, weeks}
  employment {jobId, status, performance, lastWorkedDay, missedShifts}
  skills {id: {xp, lastPracticeDay}}
  home {type, roommateId, upgrades, lastMoveDay}
  pet: null | {kind, name, care, bond, lastCareDay}
  world {weather, news, lastUpdatedDay}
  wellbeing {nutrition, movement, rest, illness}
  history, annual
```

`_success` conecta las acciones con el tutorial, las visitas, la práctica social y el motor narrativo. Al dormir, `beforeSleep` cobra gastos y registra tendencias; `afterSummary` conserva agregados anuales; `newDay` actualiza clima, noticias, práctica abandonada, mascota y rendimiento. Los eventos usan el mismo calendario y las mismas habilidades.

Las listas detalladas tienen límites: 120 recuerdos, 1.200 muestras de tendencias, 300 transacciones y 160 balances semanales. Los agregados de `life.annual` permiten consultar años anteriores aunque se recorten resúmenes diarios detallados.

## APIs para interfaz y pruebas

Los métodos que realizan acciones devuelven `{ok, message}`; usa ese resultado para informar al jugador. No modifiques el estado directamente desde controles de la interfaz.

| Propósito | Métodos |
| --- | --- |
| Dirección | `getGoals()`, `claimGoal(id)`, `changeAspirations(ids)`, `getLifeStage()` |
| Legado y recuerdos | `getLegacy()`, `reviewLegacy()`, `getMemories()`, `markMemory(journalIndex)` |
| Sistemas | `getEconomy()`, `getEmployment()`, `getSkills()`, `getHome()`, `getPet()`, `getWorld()` |
| Preferencias | `setDifficulty(id)`, `setPreferences({audioEnabled, volume})`, `getTutorial()`, `tutorialAction('skip'\|'restart'\|'next')` |
| Historia y mundo | `getTrends()`, `getCalendar(day)`, `getLocationAvailability(id, hour)`, `getPresentNPCs(location, hour)` |
| Guardado | `save()`, `exportSave()`, `importSave(json)`, `load()` |

`lifeAction(type, payload)` concentra las decisiones de los nuevos sistemas:

```js
game.lifeAction('depositSavings', {amount: 25});
game.lifeAction('withdrawSavings', {amount: 25});
game.lifeAction('borrowMoney', {amount: 50});
game.lifeAction('repayDebt', {amount: 50});
game.lifeAction('practiceSkill', {id: 'creatividad'});
game.lifeAction('createWork', {id: 'creatividad'});
game.lifeAction('changeJob', {id: 'autonomo'});
game.lifeAction('workShift');
game.lifeAction('promoteJob'); // requestPromotion() también delega aquí en V3.
game.lifeAction('moveHome', {id: 'compartido'});
game.lifeAction('improveHome', {id: 'lectura'});
game.lifeAction('adoptPet', {id: 'gato', name: 'Luna'});
game.lifeAction('carePet', {id: 'feed'}); // 'play' es un cuidado sin compra.
game.lifeAction('requestSupport');
game.lifeAction('assistedMeal');
```

## Añadir un evento

Añade un objeto a `VINCULOS_DATA.events` en `data.js`, con identificadores únicos y al menos una opción viable sin dinero. No uses funciones ni código ejecutable como contenido. Este ejemplo sigue el esquema real:

```js
VINCULOS_DATA.events.push({
  id: 'lectura_compartida',
  title: 'Una pregunta entre páginas',
  text: 'Nora encuentra una idea que merece otra mirada.',
  variants: ['Nora deja una página abierta para conversar.'],
  npcId: 'nora',
  tags: ['conocimiento', 'amistad'],
  aspirations: ['conocimiento'],
  introducedIn: 3,
  conditions: {
    lifeStages: ['juventud', 'adultez', 'madurez', 'vejez'],
    locations: ['biblioteca'],
    hour: {min: 10, max: 19}
  },
  weight: 1,
  cooldown: 21,
  maxOccurrences: 3,
  options: [{
    id: 'escuchar', text: 'Escuchar y compartir una duda',
    duration: 1, energyCost: 5,
    results: [{
      id: 'otra_mirada', weight: 3,
      text: 'No resolvéis la duda, pero sabéis qué preguntar después.',
      modifiers: [{skill: 'comunicacion', factor: 0.025}],
      effects: {
        skills: {comunicacion: 3}, stats: {knowledge: 2},
        relationships: {nora: {friendship: 2, trust: 2}},
        flags: {lectura_compartida: 'dejar una pregunta abierta'}
      }
    }]
  }, {
    id: 'otro_dia', text: 'Guardar la pregunta para otro día', duration: 0.5,
    results: [{id: 'pausa', weight: 1, text: 'Acordáis retomarlo sin prisa.',
      effects: {stats: {stress: -3}}}]
  }]
});
```

Las condiciones admiten itinerarios (`paths`), lugares, etapas, estaciones, día, hora, dinero, estadísticas, relaciones, flags, aspiraciones, habilidades, empleo (`jobs`), vivienda (`housing`), mascota (`pet`), clima (`weather`), noticias (`news`) y economía. Los rangos se expresan como `{min, max}`; consulta `requirements` en `narrative.js` para el formato de cada condición.

Una opción puede exigir `requirements: {aspirations: ['conocimiento']}` o una habilidad mínima. Los resultados ponderados admiten modificadores de estadística, habilidad, aspiración y relación; diferencias de texto deben corresponder a consecuencias reales. `important: true` en el evento o sus efectos propone un recuerdo.

Para una cadena, añade al resultado `next: {eventId: 'lectura_revision', delayDays: 2}` y crea ese segundo evento con `chainOnly: true`. Guarda una decisión en `effects.flags` y recupérala en el texto con `{memory:lectura_compartida}`. Mantén una salida que cierre la historia sin obligar a continuarla. `cooldown`, `maxOccurrences` y las etiquetas recientes limitan repeticiones. No cambies el RNG desde la interfaz: el motor lo persiste.

## Añadir un lugar

Añade un objeto a `data.locations` con `id`, `name`, `description`, `icon`, `color`, `scene`, `category`, `type`, `opensAt`, `closesAt` y `actions`. Puedes reutilizar una escena existente; una escena nueva requiere su SVG en `app.js`.

```js
VINCULOS_DATA.locations.push({
  id: 'taller_barrio', name: 'Taller del Barrio',
  description: 'Un espacio para aprender haciendo.',
  icon: 'palette', color: '#bccbb5', scene: 'centrocultural',
  category: 'ciudad', type: 'ocio', opensAt: 10, closesAt: 20,
  actions: [{
    id: 'practica_taller', label: 'Probar una idea',
    description: 'Dedica una hora a una pieza pequeña.',
    icon: 'palette', duration: 1, cost: 2,
    effects: {knowledge: 4, mood: 3, energy: -7}
  }]
});
```

Da a las personas una agenda que incluya ese lugar y añade eventos con `conditions.locations`. Prueba antes de abrir, durante el horario y cerca del cierre: ni viajar ni realizar una actividad deben consumir recursos si el plan no cabe. Si añades un archivo público, incorpóralo también a la lista explícita de `server.js`.

## Añadir un empleo

Añade un descriptor a `data.jobs`. Sus referencias deben existir:

```js
VINCULOS_DATA.jobs.push({
  id: 'taller', label: 'Equipo del Taller', location: 'taller_barrio',
  bossId: 'ines', colleagueIds: ['alex'],
  start: 10, end: 20, duration: 3, basePay: 55,
  skill: 'creatividad', minSkill: 10
});
```

El turno debe caber en el horario y ejecutarse en su lugar. El sueldo es `round(basePay * (1 + level * 0.18))`; hay niveles 0 a 4. Un ascenso exige rendimiento 70, práctica `10 + level * 8` y experiencia `24 * (level + 1)`. El cambio de oficio reinicia nivel y experiencia del oficio actual. `autonomo` es la ruta por cuenta propia; los demás contratos usan el estado de empleo ordinario.

Los jefes y colegas deben tener ficha y agenda accesibles; añade historias con `conditions.jobs`. Comprueba contratación con y sin habilidad suficiente, turno, ascenso, ausencias, final del contrato y vuelta a otro empleo.

## Añadir una aspiración

Añade un descriptor con **tres tramos**, objetivos y recompensas:

```js
VINCULOS_DATA.aspirations.push({
  id: 'aprendizaje_compartido', label: 'Aprendizaje compartido',
  description: 'Aprender con otras personas.', icon: 'book',
  tags: ['conocimiento', 'comunidad'],
  stages: [3, 10, 25].map((target, i) => ({
    id: 'aprendizaje_compartido_' + (i + 1),
    title: ['Primeras preguntas', 'Seguir aprendiendo', 'Compartir lo aprendido'][i],
    description: 'Un paso que puedes adaptar a tu vida.',
    metric: 'study', target, reward: 10 + i * 10
  }))
});
```

Las métricas existentes son `savings`, `skill` (creación), `friend`, `family` (confianza familiar media), `explore` y `study`. Para una métrica nueva, amplía `metric` en `systems.js`; la interfaz ya representa los tramos desde los datos. Añade eventos con `aspirations` y opciones exclusivas con el requisito correspondiente.

El validador exige progreso para cada aspiración del catálogo. Si se amplía el catálogo después de publicar V3, añade una migración que rellene ese progreso en partidas existentes, o eleva el esquema; no rechaces partidas válidas de la versión publicada. Si cambias el número de tramos, actualiza también la validación, que actualmente admite 0 a 3.

## Guardado y migración

Se conserva `vinculos-save-v1`, y la aplicación completa guarda `version: 3`. Las versiones 1 y 2 pasan por la validación e hidratación anteriores y reciben `aspirations`, `direction` y `life`. La dificultad inicial es equilibrada, el sonido está apagado, el hogar es familiar, no hay mascota ni deuda nueva y la aspiración por defecto es estabilidad. El tutorial no se impone al migrar una partida antigua. El empleo inicial depende del itinerario laboral conservado.

Antes de persistir una migración local se guarda el texto original en `vinculos-save-v1-backup`. Las importaciones se validan antes de sustituir el estado; JSON mal formado, versiones desconocidas, referencias o rangos inválidos deben dejar la sesión intacta. `tests/fixtures/save-v1.json` y `tests/fixtures/save-v2.json` conservan partidas anteriores para comprobarlo. Los campos casuales y familiares antiguos se mantienen.

Si `localStorage` falla, no se promete un guardado que no ocurrió. La sesión puede seguir y exportarse. Al probar migración, exporta primero cualquier progreso que quieras conservar.

## Decisiones de diseño

- El calendario tiene 360 días por año: doce meses de 30 días y cuatro estaciones de 90. Tres años completos son 1.080 días.
- Las etapas son juventud hasta 24, adultez 25–49, madurez 50–64 y vejez desde 65. La edad avanza al ritmo del calendario. Su ritmo de energía se aplica a la recuperación nocturna, sin recargos ocultos por acción: antes de mejoras o enfermedad se recuperan 100, 97, 94 y 89 puntos respectivamente.
- Cambiar de aspiraciones cuesta una hora, 8 de energía y 3 de ánimo; deben pasar siete días entre cambios. La primera configuración del personaje está exenta.
- El legado se puede revisar desde el día 90, o desde el día 30 si se completaron tres tramos. Se guarda un cierre y puedes continuar.
- Los gastos semanales son alquiler más 8 € de facturas y 12 € de comida, más mascota si la hay, ajustados por dificultad y noticias. El interés es un 1 % semanal redondeado al euro; la deuda no supera 250 €. La dificultad tranquila elimina cargos recurrentes e interés, incluidos cuidados familiares.
- El hogar familiar cuesta menos y puede recuperarse sin coste de mudanza. El apoyo del barrio y la comida asistida permiten reponerse; comparten un uso diario. Los importes son euros ficticios, sin pagos reales.
- La formación de familia representa un proyecto compartido de adopción o crianza: pareja estable, tres citas, confianza 70 y 150 € iniciales. Los cuidados cuestan 5 € diarios por hijo antes de aplicar dificultad.
- Las habilidades van de 0 a 100; tras diez días sin practicar pierden 0,08 puntos diarios. A partir de 20 permiten proyectos propios. Las prácticas repetidas tienen rendimiento decreciente y límites diarios.
- Activar trucos marca la partida para impedir nuevos logros, aunque luego se apaguen. Los logros no descubiertos no revelan requisitos.
- Web Audio permanece apagado por defecto, no se inicia solo al recargar y se suspende al ocultar la pestaña. La preferencia de movimiento reducido impide activarlo.

## Pruebas manuales de aceptación

1. **Inicio y dirección:** crea un personaje con dos aspiraciones; cambia nombre, colores y rasgos antes de guardar. Comprueba que las elecciones se conservan. Completa y reclama una meta, y verifica que aparece el siguiente tramo. Cambia de aspiración y contrasta costes y espera de siete días.
2. **Edad y legado:** prueba protagonistas de 19, 30, 55 y 70 años. Contrasta etapa, recuperación y eventos. Marca una entrada del Diario, abre el legado cuando esté disponible y continúa al día siguiente.
3. **Economía:** aparta y retira ahorro, pide y devuelve deuda. No debe aceptarse un importe negativo, fraccionario, mayor que el saldo o que exceda el crédito. Al cerrar una semana, verifica balance, interés y resumen final guardado. Sin dinero, usa apoyo o comida asistida y regresa al hogar familiar.
4. **Empleo:** cambia de oficio, viaja a su lugar y completa un turno dentro del horario. Comprueba sueldo, práctica y rendimiento. Alcanza un ascenso y verifica el nuevo salario. Tras ausencias prolongadas debe ser posible encontrar otro empleo.
5. **Mundo vivo:** visita biblioteca, gimnasio y mercado, prueba sitios cerrados y espera explícitamente. Revisa noticias, clima, exámenes, vacaciones y cumpleaños. Una tormenta debe cerrar playa y azotea; la casa debe seguir accesible.
6. **Profundidad:** practica una habilidad, abre un proyecto al llegar a 20 y comprueba decaimiento al abandonarla. Múdate, visita a tu familia en su casa, instala una mejora, adopta y nombra una mascota, y contrasta gastos y cuidados.
7. **Experiencia:** cambia entre las tres dificultades. Salta y reinicia la introducción. Comprueba gráficos en Mi personaje y Diario. Activa sonido por gesto y ajusta volumen; recarga, oculta la pestaña y prueba movimiento reducido. Ninguno de estos casos debe iniciar audio inesperado.
8. **Relaciones anteriores:** conversa con familia, colegas y compañeros. Comprueba citas, pareja, proyecto familiar, encuentros casuales e infidelidad. Cancelar sus confirmaciones debe dejar el estado intacto; familia e hijos no deben mostrar romance ni opciones casuales.
9. **Narrativa:** abre un evento, comprueba costes y exclusivas, guarda pendiente y recarga. Repite semilla y decisiones. Recorre una cadena y verifica retardo, referencias a la decisión anterior y posibilidad de cerrar el intento.
10. **Persistencia y acceso:** importa V1 y V2, exporta V3 e importa de nuevo; rechaza JSON inválido sin cambios. Recorre las seis rutas, Atrás/Adelante, Tab/Mayús+Tab/Enter/Escape y retorno del foco. Prueba móvil de 360 px, controles de 44 px, medidores con nombre/valor, sin desbordamiento ni errores de consola. El juego debe seguir funcionando sin Internet externo.

## Evidencia y límites

Las suites Chromium pasan 249 comprobaciones: 140 generales, 44 nocturnas y 65 V3. Las suites Node pasan 80 pruebas: 31 de motor, 15 de narrativa, 5 de ampliación, 13 nocturnas y 16 de sistemas V3.

El ensayo `tests/v3_simulation.js` realiza 1.080 días × 20 semillas × seis aspiraciones, 129.600 días en 120 recorridos. El piloto usa acciones, gastos y eventos reales, clona la partida de origen, comprueba que no cambie y repite una secuencia inicial para confirmar determinismo. Usa edades iniciales 23, 27, 49, 63 y 68, sin acelerar el envejecimiento; informa exposición real por etapa.

El informe [BALANCE_V3_REPORT.md](BALANCE_V3_REPORT.md) enumera repeticiones semanales, eventos no observados, días en extremos 0/100, dinero, ahorro, deuda, legados y etapas. El JSON detallado se genera en `/tmp/vinculos-v3-balance.json`. La política no demuestra equilibrio para todas las decisiones: 32 eventos no aparecieron y ramas como intimidad, infidelidad o adopción se verifican con pruebas dirigidas. No atribuyas esas ramas al piloto general. Tras cambios de reglas, pesos o costes, repite el ensayo afectado.
