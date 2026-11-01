# Entrega V4 por fases

La base es el commit publicado de V3. Se conservan sus sistemas y se migra el esquema a 4; las fuentes completas son las del repositorio y los entregables se generan desde ellas.

| Fase | Cambios y archivos principales | Cómo comprobar |
|---|---|---|
|0. Auditoría|Separación data/systems/engine/narrative/app; legado temporal garantizado, estrés trivial, historiales y escrituras excesivas, agendas limitadas y artefactos duplicados.|Auditoría comunicada antes de cambiar reglas; fixture real V3 y catálogo inicial de 536 opciones.|
|1. Tensión|data.js, systems.js, engine.js, narrative.js, app.js: carga persistente, imprevistos por dificultad, salidas con renuncia, avisos de vínculos y metas con costes.|npm test; navegador y simulación corta. Pagar, negociar y pedir apoyo producen resultados distintos.|
|2. Legado|systems.js, engine.js, app.js: huellas y bienestar, tipos de cierre, momentos/citas/personas/asuntos abiertos, texto/SVG y nueva vida con carta.|Caso de cierre no disponible y otro elegible; exportación y continuación; libro heredado sin recursos anteriores.|
|3. Guardado|systems.js, engine.js, app.js, tests/storage.test.js: límites, resumen mensual, deduplicación y guardado diferido.|Dos vidas de 10 años; límites 1,5 MB/300 ms; cuota/bloqueo/exportación y regresiones.|
|4. Calidad|tests/bot_profiles.js, v 4_simulation.js, content_safety.test.js, catalog_audit.js y filtros en motor/interfaz.|Ocho perfiles, 20 semillas y 1080 días; ningún menor/familiar en rutas íntimas; referencias y opciones equivalentes.|
|5. Primer rato|data.js, systems.js, app.js, styles.css: arranques, decisión inmediata, tres pasos, sistemas progresivos, causas del resumen y móvil.|Suite V4 a 360 px, 44 px, foco, medidores, selección de escenario, filtros y legado.|
|6. Personas|data.js, systems.js, engine.js, app.js: agendas, mudanzas, trabajo, vínculos mutuos, red y memoria compartida.|Prueba de 500 días, ida y vuelta del guardado, mensajes con citas y fichas. Se corrigieron rupturas demasiado rápidas y validación de importes graves.|
|7. Contenido|data.js, narrative.js, systems.js, app.js: 104 eventos de ámbitos/escenarios/continuaciones, 10 cadenas y cuatro reglas de inicio; más los 4 conflictos de fase 1.|336 eventos/816 opciones; 331 observados por bots y cinco cubiertos aparte con pruebas dirigidas.|
|8. Repositorio|scripts/, workflows, README/DEV, CHANGELOG, informes y reports/: entregables generados, limpieza de main, CI/Release/Pages y evidencia HTTP.|npm test; seis suites Chromium; simulación completa; generación offline; publicación y comprobación remota por separado.|

Al cerrar las fases se ejecutaron pruebas Node, navegador y una simulación corta o diagnóstico; después se hizo el ensayo completo. Los commits son pequeños y descriptivos; los detalles de resultados están en CHANGELOG.md, BALANCE_V4_REPORT.md y QUALITY_V4_REPORT.md.

Los datos de rendimiento corresponden al entorno de pruebas. El despliegue remoto solo está confirmado cuando su comprobación HTTP termina; el estado se registra separadamente. Los antiguos HTML/ZIP se conservan en la historia Git y se eliminan del árbol actual para evitar divergencias.
