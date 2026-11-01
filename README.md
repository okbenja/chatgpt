# Vínculos · V4

Un simulador de vida y relaciones en español, con decisiones que compiten por tu tiempo. HTML, CSS y JavaScript puro; sin dependencias de ejecución ni peticiones externas.

## Jugar y descargar

La versión web se publica en [GitHub Pages](https://okbenja.github.io/chatgpt/) mediante el workflow del repositorio. El despliegue se considera comprobado cuando existe `DEPLOYMENT.json` para el commit servido. Si Pages no está habilitado todavía, activa **Settings → Pages → Source: GitHub Actions** y ejecuta el workflow.

El [último Release](https://github.com/okbenja/chatgpt/releases/latest) ofrece el HTML completo y el ZIP de fuentes después de pasar las pruebas. Ya no se duplican esos archivos generados en main.

Para jugar desde las fuentes, abre `index.html` o usa Node 18 o posterior:

```sh
npm run dev
```

No hace falta `npm install`. El servidor estático es opcional. Si cambias entre el HTML descargado y Pages, exporta e importa la partida: cada origen tiene su propio almacenamiento.

## Qué puedes vivir

- 37 personas adultas iniciales y 13 familiares, con padres, hermanos, tíos, primos y abuelos. También puedes formar una familia y cuidar a tus hijos.
- 16 lugares, incluidos colegio para adultos, universidad, trabajo, biblioteca, gimnasio, mercado, discoteca, bar, playa y hogar familiar.
- Personalización, estadísticas, personalidad, amistad, rivalidad, citas, pareja, infidelidad y encuentros casuales. Consentimiento explícito entre adultos y escenas íntimas fuera de pantalla; familiares e hijos nunca entran en esas rutas.
- 336 eventos y 816 opciones. V4 añade 108 eventos: 4 conflictos, 60 escenas de ámbitos menos recorridos, 24 historias de escenario y 20 continuaciones para 10 nuevas cadenas de tres pasos.
- Seis aspiraciones, cuatro etapas por edad real, habilidades, empleos y ascensos, hogar, mejoras, mascota opcional, calendario, clima y noticias con efectos.

## Decidir también cuesta algo

El estrés puede sobrevivir al descanso cuando siguen pendientes trabajo, deuda, conflictos o cuidados. Reduce recuperación, ánimo y calidad de algunos resultados. Los imprevistos tienen cuantía y frecuencia por dificultad: pagar, negociar o pedir ayuda deja costes distintos y visibles. Los vínculos avisan antes de enfriarse y cerrar una meta ocupa tiempo, energía y a veces dinero.

El primer rato ofrece tres arranques preparados y una renuncia inmediata. Puedes escoger entre mudarte de ciudad, volver al pueblo, tu primer empleo o empezar de cero a los 50. Economía, trabajo, hogar y mascota se muestran cuando los necesitas; Ajustes permite verlo todo desde el principio.

El legado requiere una huella y una situación que permita mirarla; esperar no garantiza alcanzarlo. Incluye hasta 12 momentos, citas del diario, personas y asuntos abiertos. Se exporta como texto o SVG. Puedes seguir jugando o empezar otra vida con una carta y el libro anterior.

## Personas y preferencias

Las personas se mudan, cambian de actividad, forman vínculos entre ellas y envían mensajes que recuperan experiencias compartidas. Sus fichas explican qué les importa y qué esperan de ti. Amistades, alianzas, celos y secretos circulan por una red del barrio.

En Ajustes puedes cambiar dificultad y desactivar vida nocturna, romance o encuentros casuales por separado. El sonido sintetizado está apagado por defecto y respeta movimiento reducido. Los logros no descubiertos ocultan sus requisitos; usar trucos desactiva nuevos logros en esa partida.

## Tu partida

El esquema 4 migra V1, V2 y V3. Se conserva `vinculos-save-v1` y una copia previa en `vinculos-save-v1-backup` antes de sustituir un guardado antiguo. Una importación inválida deja la sesión intacta.

El autoguardado se agrupa durante el tiempo inactivo y se vacía al ocultar/cerrar. Las listas se acotan y los detalles antiguos se conservan como resúmenes mensuales. Si el navegador bloquea el guardado o se llena, puedes seguir y exportar inmediatamente.

## Calidad y desarrollo

```sh
npm test
npm run test:sim:smoke
npm run test:ui
npm run test:sim
npm run build:release
```

Las pruebas Node no requieren paquetes adicionales. Las de navegador usan Python Playwright y Chromium, solo para desarrollo. El ensayo largo ejecuta ocho perfiles por 20 semillas y 1080 días: 172800 días reales de juego, con 331 de 336 eventos observados; los cinco restantes se verifican aparte con pruebas dirigidas.

Consulta [README_DEV.md](README_DEV.md), [CHANGELOG.md](CHANGELOG.md), [PHASES_V4.md](PHASES_V4.md), [BALANCE_V4_REPORT.md](BALANCE_V4_REPORT.md) y [QUALITY_V4_REPORT.md](QUALITY_V4_REPORT.md). Los informes V3 son históricos. `reports/` conserva resultados compactos por recorrido y evento.
