# Desarrollo de Vínculos V4

JavaScript puro, sin librerías de ejecución, evaluación de código desde datos ni peticiones de red. Node 18+ sirve para pruebas y servidor opcional; Python Playwright y Chromium se usan solo en desarrollo.

## Flujo de trabajo

```sh
npm test
npm run test:sim:smoke
npm run test:ui
npm run test:sim
npm run dev
python scripts/build-release.py
```

No hace falta instalar paquetes npm. Para preparar las herramientas opcionales de navegador: `python -m pip install playwright==1.56.0` y `python -m playwright install --with-deps chromium`. Los tests usan el Chromium del sistema si existe, o el que instala Playwright.

El orden de carga es `data.js`, `systems.js`, `engine.js`, `narrative.js`, `app.js`. Abrir `index.html` no requiere `server.js`; las rutas son hash y todos los recursos son relativos. Mantén el mismo origen para conservar el almacenamiento o exporta/importa el JSON.

```js
global.window = global;
require('./data.js');
require('./systems.js');
const Game = require('./engine.js');
require('./narrative.js');
const game = new Game(null);
game.create({name:'Vera',age:50,path:'free',scenario:'cero50',aspirationIds:['creatividad']},{seed:42});
```

## Arquitectura

| Archivo | Función |
|---|---|
|data.js|Catálogos declarativos: personas, lugares, actividades, eventos, escenarios, dificultades, imprevistos y cambios del mundo.|
|systems.js|Reglas V4: hidratación, metas y renuncias, presión, empleo, hogar, legado, archivo, escenarios, agendas y red social.|
|engine.js|Estado y acciones, relaciones, recursos, calendario, validación y persistencia.|
|narrative.js|Condiciones, pesos, calidad por estrés, selección con semilla, memoria y cadenas.|
|app.js / styles.css|Vistas, diálogos, accesibilidad, SVG y audio opcional. Las acciones pasan por el motor.|
|server.js|Servidor estático de lista pública explícita. No sirve .git ni archivos privados.|
|tests/|Regresiones, seguridad, fixture de migraciones y políticas de simulación.|
|scripts/|Generación de entregables, informes y comprobación HTTP posterior al despliegue.|

El motor sin `systems.js` conserva el contrato anterior para las pruebas de compatibilidad. La aplicación completa crea V4. `getCareer` se conserva para esa ruta y la depuración; no es una función muerta.

## Estado y migración

Se guarda `version:4` en la clave histórica `vinculos-save-v1`. Los formatos 1, 2 y 3 pasan por sus validadores, conservan recursos y decisiones y reciben los campos nuevos por defecto. Antes de persistir una migración local se copia el texto exacto a `vinculos-save-v1-backup`; si falla la copia no se sobrescribe el original. Hay fixtures V1, V2 y V3 en tests/fixtures/.

```text
direction:
  progress, memories, visitedLocations, lastChangeDay, tutorial
  settings: difficulty, audioEnabled, volume, nightlife, romance, casual, showAllSystems
  legacy: reached, day, type, title, text, timeline, people, unresolved, snapshots
  book, inheritance, onboarding, scenario
life:
  economy, employment, skills, home, pet, world, wellbeing
  annual, history, archive.months
  pressure: load, expenses, history, warnings, nextCrisisDay, crises, helpCount
  socialWorld: people, edges, history, secrets
```

Las importaciones se validan antes de sustituir el estado. Al añadir campos o catálogos después de publicar V4, crea una migración y sube el esquema: no conviertas una partida válida anterior en inválida. Los límites y referencias forman parte del contrato de guardado.

El autoguardado de la interfaz activa `autosaveDeferred`: agrupa cambios mediante requestIdleCallback con plazo, o temporizador corto. `savePending` distingue trabajo pendiente de éxito. `flushSave()` vacía la cola en pagehide/visibilitychange; una exportación no depende del disco. Las herramientas Node guardan de forma síncrona salvo que se active ese modo. Se escribe una instantánea acotada completa; no se simula una persistencia parcial que localStorage no ofrece.

## Límites de historial

| Lista | Límite habitual |
|---|---: |
|Diario detallado|180 entradas|
|Resúmenes diarios|30 días|
|Eventos detallados|200|
|Mensajes|40|
|Historia compartida/casual por persona|8 de cada tipo|
|Historia dinámica por NPC|8|
|Recuerdos marcados|60|
|Muestras de tendencia|360, con detalle reciente y muestreo semanal antiguo|
|Transacciones / balances semanales|80 /52|
|Resúmenes mensuales|120 meses|
|Libro de vidas / instantáneas del legado|12 /6|
|Red social / historia global / secretos|80 /40 /20|

Se eliminan registros idénticos del mismo día y el resumen diario no se repite como texto persistido en el Diario: la interfaz lo reconstruye. Los totales mensuales y anuales y las decisiones de cadenas se conservan por separado. Hay pequeñas ventanas transitorias entre el cierre y la compactación siguiente; los validadores aceptan la instantánea válida resultante.

Se mantiene localStorage porque la prueba real de diez años pasa holgadamente 1,5 MB y 300 ms; IndexedDB se evaluó y no se adoptó. Las medidas concretas y su entorno aparecen en BALANCE_V4_REPORT.md.

## APIs

Las acciones devuelven `{ok, message}` y comprueban costes antes de mutar. Los getters no consumen azar.

| Área | Métodos |
|---|---|
|Inicio|startPreset(id, scenarioId?), getSystemUnlocks(), updateProfile(profile)|
|Dirección|getGoals(), claimGoal(id), changeAspirations(ids), getLifeStage()|
|Legado|getLegacy(), reviewLegacy(), exportLegacy('text'/'svg'), newLife(profile)|
|Memoria|getMemories(), markMemory(journalIndex), getTrends(), getAnnualSummary(year)|
|Sistemas|getEconomy(), getEmployment(), getSkills(), getHome(), getPet(), getWorld()|
|Personas|getNPC(id), getPersonInfo(id), getPresentNPCs(place, hour), interact(id, type)|
|Contenido|setPreferences({nightlife, romance, casual, showAllSystems, audioEnabled, volume}), setDifficulty(id)|
|Persistencia|save(), flushSave(), exportSave(), validateImport(json), importSave(json)|

```js
game.lifeAction('firstChoice',{id:'ayudar'}); // o encargo; una vez.
game.lifeAction('resolveExpense',{choice:'pay'}); // help o negotiate.
game.lifeAction('depositSavings',{amount:25});
game.lifeAction('withdrawSavings',{amount:25});
game.lifeAction('borrowMoney',{amount:50});
game.lifeAction('repayDebt',{amount:50});
game.lifeAction('practiceSkill',{id:'creatividad'});
game.lifeAction('createWork',{id:'creatividad'});
game.lifeAction('changeJob',{id:'autonomo'});
game.lifeAction('workShift');
game.requestPromotion();
game.lifeAction('moveHome',{id:'compartido'});
game.lifeAction('improveHome',{id:'lectura'});
game.lifeAction('adoptPet',{id:'gato',name:'Miga'});
game.lifeAction('carePet',{id:'play'}); // feed compra comida.
game.lifeAction('requestSupport');
game.lifeAction('assistedMeal');
```

## Añadir un evento

Pon el contenido en data.js, con identificadores únicos. Reutiliza el motor; no añadas lógica de reglas a app.js.

```js
VINCULOS_DATA.events.push({
  id:'taller_pregunta',title:'Una pregunta a tiempo',
  text:'Nora propone revisar una idea antes de entregarla.',
  variants:['La entrega está cerca; todavía puedes cambiar una parte.'],
  npcId:'nora',tags:['estudios'],aspirations:['conocimiento'],
  content:{},introducedIn:4,
  conditions:{lifeStages:['juventud','adultez','madurez','vejez'],locations:['biblioteca']},
  weight:2,cooldown:28,maxOccurrences:4,
  options:[{
    id:'revisar',text:'Revisar ahora: 1 h y5 energía',duration:1,energyCost:5,
    results:[{id:'otra_mirada',weight:3,quality:'positive',
      text:'Encontráis una pregunta más pequeña y una forma de comprobarla.',
      modifiers:[{skill:'comunicacion',factor:.025}],
      effects:{skills:{comunicacion:3},stats:{knowledge:2,stress:3},relationships:{nora:{trust:3}},flags:{taller_pregunta:'revisar antes de entregar'}}}]
  },{
    id:'limite',text:'Conservar la tarde; aceptar una entrega más pequeña',duration:.5,
    results:[{id:'menos',weight:1,text:'Acotas la entrega sin fingir que hará lo mismo.',effects:{stats:{stress:-4},skills:{tecnologia:1}}}]
  }]
});
```

Declara `content:{romance:true}`, `{casual:true}` o `{nightlife:true}` cuando corresponda. Los filtros actúan también sobre eventos pendientes y depuración. El motor vuelve a comprobar edad y parentesco: una etiqueta no sustituye esa barrera.

Condiciones: paths, locations, lifeStages, seasons, day/hour/money, stats, relationships, flags/flagAge, family, special, aspirations, skills, jobs, housing, pet, weather, news, economy y scenarios. Los rangos usan `{min, max}`. Consulta evaluateRequirements para formatos concretos.

Una opción exclusiva puede usar `requirements:{aspirations:['conocimiento']}`. Diferencia costes y resultados reales; una prosa distinta con el mismo efecto no basta. Resultados positivos/negativos pueden declarar quality para la ponderación por estrés.

Las cadenas usan `next:{eventId:'taller_revision', delayDays:2}` en el resultado y `chainOnly:true` en la continuación. Guarda una decisión en effects.flags y recupérala con `{memory:taller_pregunta}`. Mantén una salida gratuita y límites de repetición. Los eventos importantes pueden proponer recuerdos con important: true.

## Añadir un lugar

```js
VINCULOS_DATA.locations.push({
  id:'taller',name:'Taller del barrio',description:'Aprender haciendo.',
  icon:'palette',color:'#bccbb5',scene:'centrocultural',category:'ciudad',type:'ocio',
  opensAt:10,closesAt:20,
  actions:[{id:'practica_taller',label:'Probar una idea',description:'Una hora para una pieza pequeña.',
    icon:'palette',duration:1,cost:2,effects:{knowledge:4,mood:3,energy:-7}}]
});
```

Reutiliza una escena SVG o añade la suya. Incorpora el lugar a agendas y condiciones de eventos. Prueba antes de abrir, cerca del cierre y bajo noticias/clima. Si añades un archivo público, inclúyelo en server.js y en build-release.py; no introduzcas peticiones externas.

## Añadir un empleo

```js
VINCULOS_DATA.jobs.push({
  id:'taller',label:'Equipo del taller',location:'taller',bossId:'ines',colleagueIds:['alex'],
  start:10,end:20,duration:3,basePay:55,skill:'creatividad',minSkill:10
});
```

Las referencias deben existir. El salario base crece un 18 % por nivel; las noticias pueden modificarlo y el getter anuncia el mismo sueldo que paga el turno. Ascenso: rendimiento 70, habilidad 10+8 × nivel y experiencia 24 × (nivel+1), en el lugar del empleo. Hay niveles 0–4; cambiar de oficio reinicia su progreso. Prueba ausencia, despido y recuperación, además del camino de ascenso.

## Añadir una aspiración o un escenario

Una aspiración tiene id, label, description, icon, tags y tres stages. Cada tramo declara id, title, description, metric, target, reward. Las métricas existentes son savings, skill(creatividad), friend, family, explore ystudy. Una métrica nueva se implementa centralmente en systems.js. Añade su renuncia a aspirationTradeoffs y eventos exclusivos. La migración debe completar su progreso en guardados publicados.

Los escenarios declaran recursos, hogar, edad/empleo opcionales y rules de duración limitada: rentFactor, experienceFactor, practiceFactor, until. Sus eventos usan conditions.scenarios. El escenario solo se aplica al crear; editar un personaje ya iniciado no debe regalar recursos ni reiniciarlo.

## Añadir un perfil de bot

1. Añade datos a tests/bot_profiles.js: id, label, aspiration, job, workEvery, careful.
2. Implementa su política en runLife(tests/v 4_simulation.js) usando APIs reales. No inyectes dinero, romance, personas presentes ni eventos para aumentar cobertura.
3. Dale al menos 20 semillas y 1080 días; usa un RNG de política separado del RNG narrativo guardado.
4. Registra costes, fallos de acciones, estrés, dinero, relaciones, etapas, cierres, tamaño y repeticiones. Las pruebas dirigidas se publican aparte.
5. Vuelve a generar el informe y explica cada evento no observado. No llames inalcanzable a una condición que el perfil simplemente no busca.

```sh
node tests/v4_simulation.js --days 1080 --seeds 20
npm test > /tmp/v4-node.log
npm run test:ui > /tmp/v4-ui.log
python scripts/report-v4.py --node-log /tmp/v4-node.log --ui-log /tmp/v4-ui.log
```

El JSON detallado se genera en /tmp; reports/ conserva CSV pequeños por recorrido y frecuencias por evento, más el resumen de métricas. El informe distingue cobertura automática, pruebas dirigidas y análisis estático.

## Decisiones simples y límites

- Calendario de 360 días/año; edad real sin aceleración. Juventud hasta 24, adultez 25–49, madurez 50–64 y vejez desde 65.
- El ritmo por edad cambia recuperación nocturna, no añade costes ocultos a los botones. Estrés, enfermedad y mejoras también afectan a la recuperación.
- Presión persistente, primer imprevisto grave en Equilibrada/Exigente y gastos posteriores por dificultad. Siempre puedes negociar o colaborar; esos caminos cuestan tiempo y tienen texto propio. El modo Tranquila reduce esa presión y no cobra gastos recurrentes ni interés.
- Crédito de 250€ y 1 % semanal redondeado al euro; los impagos no crecen sin límite. El ahorro no produce ingresos automáticos.
- Cambiar aspiraciones cuesta 1 h, 8 energía y 3 ánimo, con siete días entre cambios; reclamar un tramo añade la renuncia anunciada.
- Legado: 90 días, o 30 días y tres tramos, más huella y bienestar. Deuda superior a 150€, gastos vencidos, salud/ánimo bajos o estrés≥85 pueden impedirlo. Revisarlo no termina forzosamente la vida.
- Las parejas entre NPC son mutuas y no sustituyen decisiones románticas del jugador. Hay un periodo mínimo antes de que una revisión pueda terminarlas.
- La formación de familia representa adopción/crianza compartida: pareja, tres citas, confianza 70 y 150€ iniciales. Familiares e hijos permanecen fuera de rutas íntimas incluso al crecer.
- No hay muerte automática ni simulación médica exhaustiva. Un bot puede ganar dinero a costa de salud y vínculos; se informa de esa limitación.

## Pruebas manuales

1. Inicio: prueba los tres arranques y los cuatro escenarios; llega a la primera decisión sin navegar seis menús. Compara costes anunciados y resultado.
2. Progresión: observa desbloqueos por necesidad y activa Ver todo. Tener un hijo o un libro debe abrir su pantalla aunque sea el primer día.
3. Estrés/economía: deja obligaciones pendientes, descansa y comprueba que la carga sigue. Resuelve el mismo gasto por cada salida en copias separadas; compara horas, dinero y bienestar.
4. Vínculos: observa un aviso de distancia, busca a la persona y consulta su expectativa y memoria. Verifica cambios propios en la prueba de 500 días.
5. Legado: revisa un caso elegible y otro en mala situación. Exporta texto/SVG; empieza otra vida y contrasta carta, libro y recursos nuevos.
6. Hogar/habilidades: mudanza, mejoras, mascota, gastos y práctica con decaimiento. Escenarios no deben reaplicarse al editar el perfil.
7. Filtros: desactiva romance/casual/noche, incluidos eventos pendientes; no se borran recuerdos existentes. Ningún hijo o familiar puede activar esos caminos.
8. Resumen: cada delta abre sus causas por teclado o toque; la suma coincide con el cambio neto. El Diario reconstruye resúmenes sin duplicar texto persistido.
9. Persistencia: migra las tres versiones, prueba cuota llena y bloqueo, exporta y rechaza JSON mal formado sin cambios. Espera el indicador de guardado o cambia de pestaña para vaciar la cola.
10. Acceso: 360 px, barra inferior, 44 px, foco visible, Tab/Enter/Escape, aria-current, meter y movimiento reducido. HTML de Release sin red y sitio estático bajo un subdirectorio.

## Entrega y Pages

build-release.py genera HTML único, ZIP y un directorio site fuera del repositorio. Los scripts inline van al final del cuerpo: defer no funciona en un script inline. Nunca edites el HTML generado como si actualizara las fuentes automáticamente; regénéralo después de cambiar las fuentes.

El workflow ejecuta pruebas, genera entregables, publica un Release y despliega Pages. Habilita Pages una sola vez en Settings → Pages → Source: GitHub Actions. Esa habilitación requiere administración; GITHUB_TOKEN no puede crear el sitio por sí solo. No se incluyen credenciales en el código.

verify-pages.py verifica HTTP 200 y las huellas de los ocho archivos públicos. Solo después guarda DEPLOYMENT.json. El workflow ignora los commits que cambian únicamente esa evidencia para evitar bucles. Una URL prevista o un archivo workflow no prueban que el despliegue haya terminado.
