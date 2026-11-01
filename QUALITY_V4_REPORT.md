# Calidad V4

Motor y sistemas: 99 pruebas Node aprobadas, sin fallos. Interfaz: 311 comprobaciones Chromium(140+44+65+44+8+10), sin errores JavaScript ni peticiones externas observadas. La auditoría del catálogo se ejecuta como una puerta adicional a los tests.

## Contenido y alcanzabilidad

- Eventos: 336; opciones: 816.
- Pares de opciones equivalentes: 0. La auditoría inicial V3 también encontró 0 entre 536 opciones; no había pares que arreglar bajo esa definición.
- Textos base idénticos: 0; identificadores duplicados: 0.
- Referencias rotas: 0; continuaciones sin entrada: 0.
- Funciones declaradas sin otra referencia textual: 0. Es un análisis estático conservador, no una prueba de ausencia absoluta de código muerto.

Las variantes y algunas estructuras de prosa comparten tono y plantilla; eso no cuenta como duplicado exacto. La cadena de infidelidad entra desde una decisión explícita del motor. getCareer y la ruta sin systems.js siguen utilizándose en las herramientas de compatibilidad; no son código muerto.

## Seguridad y guardado

- La publicación falla si un NPC menor o familiar puede entrar en romance/casual. Se prueba a todas las personas con 17 años y a los hijos a 0/17/18/25 años, incluidos efectos directos, eventos y guardados manipulados.
- Consentimiento explícito, límites persistentes y narración fuera de pantalla se conservan en las pruebas nocturnas.
- Migración V1/V2/V3 a 4 con copia antes de sobrescribir. Pruebas de importación inválida atómica, cuota llena, almacenamiento bloqueado y exportación disponible.
- Diez años: límites 1,5 MB/300 ms verificados automáticamente. El autoguardado se agrupa y se vacía al ocultar/cerrar; el JSON se exporta de forma explícita e íntegra.

## Interfaz y límites de la comprobación

- Inicio de tres pasos y primera renuncia inmediata, escenarios y sistemas progresivos con opción de ver todo.
- Navegación inferior a 360 px, controles de 44 px, estado plegable, aria-current, medidores con valores, foco y Escape. Causas del resumen accesibles al tocar o pasar el cursor.
- Sonido apagado por defecto, volumen y movimiento reducido.
- El HTML único se genera después del DOM y se renderiza sin red ni servidor, con recuperación cuando no hay almacenamiento. Chromium gestionado bloquea file: // por política: la prueba usa el documento completo en un contexto offline; no se presenta como prueba del protocolo local en ese navegador.
- GitHub Pages usa los mismos archivos estáticos relativos; no depende de server.js. La publicación remota se verifica por separado en DEPLOYMENT.json cuando el despliegue pasa. No confundir pruebas locales con despliegue remoto.

## Repositorio

Las fuentes son canónicas. El HTML único y los ZIP se eliminan de main y se generan para Releases. build-release.py evita ejecutar scripts inline antes de que exista la interfaz. Los informes V3 son históricos; los vigentes son los V4 y CHANGELOG.md.
