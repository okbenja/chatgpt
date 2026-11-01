# Vínculos · V3

Un simulador de vida, familia y relaciones en español. HTML, CSS y JavaScript puro, sin dependencias de ejecución ni peticiones externas. Conserva las relaciones, la vida nocturna y las partidas anteriores, y añade objetivos, economía, empleos y etapas de vida.

## Jugar

Abre `index.html` en un navegador moderno o ejecuta, con Node.js 18 o posterior:

```sh
npm run dev
```

El servidor estático usa el puerto 3000; puedes cambiarlo con `PORT`. No hace falta `npm install`. Para empezar, personaliza al protagonista y elige una o dos aspiraciones. La introducción de cinco pasos se puede saltar y repetir desde Ajustes y ayuda.

El progreso pertenece al navegador y al origen desde el que juegas. Usa **Ajustes y ayuda → Exportar partida** para trasladarlo entre el archivo local y el servidor, o conservar una copia.

## Tu historia

- **37 personajes adultos iniciales**, incluidos 13 familiares: padres, hermanos, tíos, primos y abuelos. Hay círculos laborales, escolares, universitarios y sociales, mensajes, agendas, necesidades y recuerdos.
- Personalización de nombre, edad, pronombres, apariencia, rasgos e itinerario. Estadísticas y personalidad cambian con tus acciones.
- Amistad, rivalidad, citas, pareja, infidelidad y reparación de acuerdos. Puedes formar una familia mediante un proyecto compartido y cuidar a los hijos a medida que crecen.
- **16 lugares**: hogar, casa familiar, parque, café, colegio, universidad, trabajo, discoteca, bar, azotea, playa, centro cultural, restaurante, biblioteca, gimnasio y mercado. Tienen horarios, actividades y personas habituales.
- Encuentros de una noche con expectativas y atracción mutuas, confirmación explícita y narración fuera de pantalla. La química casual es independiente del romance y no crea una pareja automáticamente.
- **228 eventos narrativos**, con condiciones, consecuencias, variantes y azar con semilla guardada. V3 incorpora **124 eventos: 94 bases y 30 continuaciones**, incluidas 15 nuevas cadenas de tres momentos.

Los familiares y los hijos conservan interacciones familiares. El colegio representa educación para personas adultas; los vínculos románticos y casuales son entre mayores de edad.

## Lo nuevo en V3

| Sistema | Lo que puedes hacer |
| --- | --- |
| Aspiraciones | Elegir estabilidad, creatividad, comunidad, familia, aventura o conocimiento; completar tres tramos por aspiración y abrir opciones narrativas propias. Cambiar de rumbo requiere tiempo, energía y una semana entre cambios. |
| Etapas y legado | Vivir juventud, adultez, madurez y vejez, con eventos y recuperación de energía diferentes. Revisar un legado basado en tus vínculos y decisiones, y seguir jugando después. |
| Economía | Afrontar alquiler, facturas y comida semanales; separar ahorro, pedir crédito limitado, devolver deuda y consultar balances. Hay apoyo y comidas asistidas para recuperarte de una mala racha. |
| Trabajo | Elegir entre Estudio Nexo, hostelería, producción cultural y trabajo por cuenta propia. Cumplir horarios, desarrollar habilidades y rendimiento, ascender, perder un empleo o cambiar de rumbo. |
| Mundo vivo | Consultar estaciones, cumpleaños, fiestas, exámenes y vacaciones. El clima y las noticias temporales cambian desplazamientos, gastos y lugares disponibles. |
| Hogar y bienestar | Mudarte entre cuatro viviendas, compartir piso, comprar mejoras, adoptar un gato o perro con nombre y cuidar descanso, alimentación, movimiento y estrés. |
| Habilidades | Practicar comunicación, cocina, creación, tecnología, movimiento y música; desbloquear proyectos propios y trabajos. La práctica abandonada decae suavemente. |
| Diario | Marcar recuerdos, consultar su línea de tiempo, resúmenes diarios y anuales, legado y gráficos SVG de ánimo, dinero y relaciones. |

El modo **Tranquila** elimina gastos recurrentes y suaviza riesgos. **Equilibrada** mantiene costes normales; **Exigente** aumenta gastos e imprevistos. Puedes cambiarlo desde Ajustes. Los costes puntuales de actividades, compras y mudanzas siguen indicados antes de decidir.

El ambiente sonoro usa Web Audio, está apagado por defecto, requiere una acción para iniciarse y ofrece volumen. Se desactiva con la preferencia de movimiento reducido. Los logros muestran solo los hitos que has descubierto; los trucos desactivan nuevos logros de forma persistente en esa partida.

## Guardado y compatibilidad

El esquema actual es `version: 3`. Se conserva la clave histórica `vinculos-save-v1` y se migran partidas V1 y V2 sin reiniciar el progreso. Antes de sustituir un guardado local antiguo se conserva una copia en `vinculos-save-v1-backup`.

La migración mantiene personaje, relaciones, dinero, estadísticas y decisiones, y completa los sistemas nuevos con valores por defecto. Puedes importar y exportar JSON desde Ajustes; reemplazar una partida exige confirmación y un archivo inválido se rechaza sin modificar la sesión. Si el almacenamiento está bloqueado o lleno, el aviso refleja el fallo y todavía puedes exportar.

## Desarrollo y comprobaciones

```sh
npm test
python tests/browser_smoke.py
python tests/nightlife_browser.py
python tests/v3_browser.py
node tests/v3_simulation.js --days 1080 --seeds 20
```

Node ejecuta las pruebas del motor, narrativa, relaciones y sistemas V3 sin paquetes adicionales. Las pruebas de interfaz necesitan Python Playwright y Chromium, herramientas opcionales de desarrollo que no utiliza el juego.

La revisión V3 supera **80 pruebas de motor y narrativa** y **249 comprobaciones en Chromium**: 140 generales, 44 nocturnas y 65 de sistemas nuevos, sin errores JavaScript ni conexiones externas observadas. La simulación recorre **129.600 días**: tres años de 360 días × 20 semillas × seis aspiraciones, con 120 legados alcanzados y ninguna repetición adicional del mismo evento en una semana. Observó 196 de los 228 eventos; las condiciones no recorridas se enumeran en el informe y tienen comprobaciones dirigidas cuando corresponde.

Consulta [README_DEV.md](README_DEV.md) para extender el juego y reproducir las pruebas, [PHASES_V3.md](PHASES_V3.md) para la entrega por fases y [BALANCE_V3_REPORT.md](BALANCE_V3_REPORT.md) para las métricas y los límites del ensayo. [BALANCE_REPORT.md](BALANCE_REPORT.md) conserva el ensayo general anterior.

## Archivos

`data.js` contiene los catálogos y el contenido. `systems.js` concentra los sistemas de vida V3. `engine.js` aplica reglas, calendario, relaciones, migración y persistencia. `narrative.js` selecciona y resuelve historias con azar reproducible. `app.js`, `index.html`, `styles.css` y `favicon.svg` forman la interfaz. `server.js` es el servidor estático opcional.
