# Entrega V3 por fases

V3 amplía el juego existente y conserva sus relaciones, familia, personalización, trucos, vida nocturna y progreso anterior. La entrega contiene los archivos completos del estado final en `vinculos-v3.zip`; las fases siguientes describen qué aporta cada conjunto de cambios y cómo revisarlo. No representan archivos parciales que deban aplicarse uno detrás de otro.

## Fase 0 · Auditoría

El juego ya contaba con motor central, calendario, persistencia, relaciones y un catálogo narrativo con condiciones, pesos, cooldown y semilla guardada. Se mantuvieron esos puntos de entrada. Los nuevos catálogos viven en `data.js`; las reglas de vida se concentran en `systems.js` y se conectan desde `engine.js`, para evitar reglas dispersas en la interfaz. Se extendió la migración antes de añadir controles. La selección narrativa reutiliza el mismo RNG y añade condiciones de aspiración, habilidad, empleo, vivienda y mundo. La interfaz mantiene rutas, diálogos y estilos accesibles. El ensayo anterior se conserva y se añadió un piloto específico de tres años por aspiración.

## Fase 1 · Dirección

- **Añadido:** seis aspiraciones elegibles de una en una o por parejas, metas por tres tramos, opciones exclusivas y pesos propios; cambios de rumbo con coste. Cuatro etapas por edad real, recuperación nocturna distinta y eventos propios. Legado revisable con vínculos, decisiones y recuerdos, seguido de juego continuo.
- **Archivos:** `data.js`, `systems.js`, `engine.js`, `narrative.js`, `app.js`, `styles.css`, `index.html`.
- **Cómo probar:** personaliza un protagonista, completa y reclama un tramo, cambia de aspiración y verifica coste y espera. Crea edades de 19/30/55/70 años. Abre legado al cumplir sus condiciones y continúa al día siguiente.

## Fase 2 · Tensión

- **Añadido:** alquiler, facturas y comida semanales; ahorro, crédito de hasta 250 €, interés suave y balances. Cuatro oficios con turnos, habilidad, rendimiento, compañeros y jefes; ascensos, ausencias, fin de contrato y cambio de rumbo. Apoyo y comida asistida mantienen vías de recuperación.
- **Archivos:** `data.js`, `systems.js`, `engine.js`, `app.js`, `styles.css`.
- **Cómo probar:** mueve ahorro, pide y devuelve crédito y termina una semana. Contrasta gastos con el resumen final. Trabaja en el lugar y horario del oficio, consigue un ascenso y prueba volver al empleo tras perderlo. Cambia a Tranquila y verifica que no cobre cargos recurrentes.

## Fase 3 · Mundo vivo

- **Añadido:** biblioteca, gimnasio, mercado y casa familiar, con 16 lugares en total. Horarios y agendas; clima y noticias temporales con cierres y cambios de energía o precios; exámenes y vacaciones junto al calendario existente.
- **Archivos:** `data.js`, `systems.js`, `engine.js`, `narrative.js`, `app.js`, `styles.css`.
- **Cómo probar:** visita los sitios nuevos y a sus personas habituales. Intenta viajar fuera de horario y espera explícitamente; comprueba que el coste anunciado coincide. Revisa tormenta, obras, mantenimiento, exámenes y vacaciones.

## Fase 4 · Profundidad

- **Añadido:** seis habilidades, práctica con rendimiento decreciente, proyectos desbloqueables y decaimiento suave. Cuatro viviendas, compañeros de piso y mejoras; mascota opcional con nombre, cuidados y gastos. Hábitos, recuperación gradual y recuerdos consultables en una línea de tiempo.
- **Archivos:** `data.js`, `systems.js`, `engine.js`, `narrative.js`, `app.js`, `styles.css`.
- **Cómo probar:** alcanza 20 de práctica, abre un proyecto y deja pasar días sin practicar. Múdate y visita a tu familia en su casa; instala una mejora. Adopta una mascota y comprueba cuidado y balance semanal. Marca un momento del Diario y recarga.

## Fase 5 · Experiencia

- **Añadido:** dificultades Tranquila, Equilibrada y Exigente; introducción contextual de cinco pasos que se puede saltar o reiniciar. Logros descubiertos sin mostrar requisitos ocultos, gráficos SVG de ánimo/dinero/relaciones y ambiente Web Audio apagado por defecto, con volumen y respeto por movimiento reducido.
- **Archivos:** `data.js`, `systems.js`, `engine.js`, `app.js`, `styles.css`.
- **Cómo probar:** cambia dificultad, completa o salta el tutorial y reinícialo. Consulta gráficos y un logro descubierto. Prueba audio por gesto, volumen, recarga y preferencia de movimiento reducido. Recorre controles con teclado y a 360 px.

## Fase 6 · Contenido

- **Añadido:** 124 eventos nuevos, repartidos entre etapas y sistemas: 94 bases y 30 continuaciones, incluidas 15 cadenas de tres momentos. Opciones con costes y consecuencias distintos, variantes, habilidades, aspiraciones y memoria de decisiones. El catálogo completo contiene 228 eventos.
- **Archivos:** `data.js`, `narrative.js`, `systems.js`, `engine.js`, `app.js`.
- **Cómo probar:** compara opciones normales y exclusivas, resultados según práctica y vínculos y continuaciones con retardo. Guarda un evento pendiente y recarga; repetir semilla y decisiones debe conservar el resultado. Revisa cooldown, máximo de apariciones y etiquetas recientes desde depuración con trucos.

## Fase 7 · Calidad y entrega

- **Añadido:** fixture V2 real y 16 casos de sistemas V3, regresiones de interfaz y simulación de 1.080 días por 20 semillas y seis aspiraciones. Documentación para ampliar contenido y sistemas, informe de equilibrio y entrega completa.
- **Archivos:** `tests/v3_engine.test.js`, `tests/fixtures/save-v2.json`, `tests/v3_browser.py`, `tests/browser_smoke.py`, `tests/nightlife_browser.py`, `tests/v3_simulation.js`, suites de compatibilidad, `package.json`, `server.js`, `README.md`, `README_DEV.md`, `BALANCE_V3_REPORT.md`, este documento.
- **Evidencia:** 80 pruebas Node y 249 comprobaciones Chromium aprobadas, sin errores JavaScript ni conexiones externas observadas. La simulación completó 129.600 días en 120 recorridos, observó 196 de 228 eventos, no repitió un mismo evento dentro de una semana y alcanzó 120 legados. Los 32 eventos no observados y los extremos de estadísticas se publican en el informe; el piloto no sustituye las pruebas dirigidas de ramas románticas o familiares.
- **Cómo reproducir:** ejecuta `npm test`, las tres suites Python y `node tests/v3_simulation.js --days 1080 --seeds 20`. Sigue las pruebas manuales de `README_DEV.md` para migración, costes, accesibilidad y funcionamiento sin Internet externo.

## Archivos completos

El ZIP contiene `index.html`, `styles.css`, `data.js`, `systems.js`, `engine.js`, `narrative.js`, `app.js`, `favicon.svg`, el servidor opcional, manifiesto, documentación y pruebas. Descomprímelo como un proyecto completo y abre `index.html` o ejecuta `npm run dev`. Exporta tu progreso antes de trasladarlo a otro navegador u origen.

Las decisiones simples de calendario, edades, recuperación, crédito, formación de familia, límites de historial y migración están documentadas en `README_DEV.md`; las métricas del ensayo están en `BALANCE_V3_REPORT.md`.
