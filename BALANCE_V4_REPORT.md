# Equilibrio V4

**172, 800 días**, ocho perfiles × 20 semillas × 1080 días; 160 recorridos completos. El calendario mantiene 360 días/año.

El piloto usa acciones, costes, agendas, eventos ponderados y descanso reales. No se fuerzan eventos ni se regalan recursos o vínculos. Cada primera semilla repite doce días para comprobar determinismo. Las edades base son 19, 23, 49, 63 y 70; el escenario de empezar de cero fija 50. Las cuatro situaciones iniciales se alternan. Dificultad equilibrada.

## Cobertura y cierres

- Catálogo: 336 eventos; observados por los bots: 331. No observados: 5; todos tienen explicación y pruebas dirigidas.
- Repeticiones adicionales del mismo evento en una semana: 0.
- Legados: 120/160. Distribución: {"estabilidad": 20, "comunidad": 40, "cuidados": 20, "conocimiento": 20, "creatividad": 20}.
- Guardado máximo de los tres años: 360, 190 bytes.

## Comparación de perfiles

| Perfil | Estrés medio | Días estrés 0 | Días estrés≥70 | Días sin efectivo | Apuros* | Deuda máx. | Saldo+ahorro final medio | Afinidad media** | Legados |
|---|---: |---: |---: |---: |---: |---: |---: |---: |---: |
|prudente|25.1|87|0|57|20|250 €|7038 €|27.0|20/20|
|descuidado|85.4|0|20728|0|0|0 €|130976 €|11.6|0/20|
|nocturno|10.6|1275|0|409|42|250 €|1844 €|26.4|20/20|
|familia|7.9|979|0|0|20|0 €|26341 €|16.5|20/20|
|estudiante|30.5|0|0|6|61|31 €|1735 €|26.9|20/20|
|creativo|37.2|0|0|307|39|250 €|1791 €|13.3|20/20|
|hogar|10.2|1405|0|891|77|250 €|258 €|19.1|20/20|
|aleatorio|69.2|5|13238|13|0|250 €|4728 €|14.8|0/20|

Cada fila suma 21600 días. *Apuros: al revisar un gasto extraordinario, su importe superaba efectivo y ahorro disponibles. No equivale necesariamente a insolvencia: se puede negociar o pedir ayuda con coste de tiempo. **Media de amistad con personas no familiares, no satisfacción de pareja.

## Interpretación y ajustes

El prudente pasó de no conocer la falta de efectivo a 57 días sin efectivo, deuda máxima 250€ y 20 situaciones en que un imprevisto superó sus recursos. Su estrés estuvo en cero 87 de 21600 días(0,40 %), frente al mínimo habitual de V3. La presión tiene salidas: negociar reduce el importe y ocupa dos horas; pedir apoyo ocupa tres horas y deja estrés y una obligación narrativa.

El descuidado gana mucho trabajando hasta ocho horas casi a diario, pero acumula estrés alto durante 20728 días y no alcanza ningún legado. El dinero no es un bucle gratuito: cuesta horas y energía. Esa política descuida salud, vínculos y gastos pendientes; su saldo elevado se mantiene visible como límite del modelo, que no impone muerte ni hospitalización automática. El aleatorio tampoco alcanza el cierre en este ensayo.

Las seis políticas con cuidados sí alcanzan un cierre; no se presenta esto como equilibrio universal. Los cierres de cuidados y relaciones resultan de decisiones distintas. El perfil de piso compartido y mascota tiene el menor colchón: 891 días sin efectivo y deuda limitada. Los resultados incluyen recuperación y apoyo, sin bloqueo permanente.

El descanso reduce estrés, pero las obligaciones fijan una carga persistente. Se corrigieron el primer imprevisto demasiado leve, el desgaste continuo de V3 y parejas entre NPC que terminaban demasiado pronto. No se inflan artificialmente las edades ni se fuerzan condiciones para aumentar la cobertura del piloto.

## Los cinco eventos no observados

- **Lo que esperáis de una cita** (expectativas_cita): Exige amistad e interés con Valentina. El bot de pareja elige Alex, Sofía o Mateo; el aleatorio no recorrió esta combinación. tests/rare_routes.test.js la abre mediante conversaciones reales.
- **Un ritmo para dos** (cita_ritmos): Segunda parte de expectativas_cita; depende de la decisión anterior con Valentina. La prueba dirigida recorre el retardo y esta continuación.
- **Lo que sí queréis cuidar** (cita_balance): Tercera parte de la misma cadena de Valentina. La prueba dirigida la resuelve después de las dos decisiones anteriores.
- **Una conversación inevitable** (secreto_descubierto): Exige ocultar un secreto y mantener el contexto de pareja hasta la continuación. La política no recorrió esa combinación; la prueba dirigida elige ocultar y resuelve la consecuencia.
- **Tu casa también descansa** (v 3_hogar_propio): Exige estudio o terraza. El perfil de hogar vive en piso compartido y los demás no compran vivienda propia. La prueba dirigida se muda realmente a un estudio y resuelve el evento.

Las pruebas dirigidas se cuentan aparte: no se atribuyen al piloto. Con ellas se comprueban las 336 rutas narrativas observadas o pendientes; la auditoría estática verifica referencias y continuaciones, sin afirmar que eso demuestre todas las combinaciones de estado.

## Diez años y carga

La prueba ejecuta dos vidas de 3600 días. Una usa el piloto por aspiración y conserva el estado final real para medir la carga. Máximo: 358, 520 bytes; archivo medido: 358, 520 bytes. Media de 12 cargas: 3.78 ms; máximo: 8.21 ms. Umbrales que hacen fallar la prueba: 1,5 MB y media 300 ms.

Son medidas del entorno de pruebas(Node 24), no una promesa para cualquier móvil. Se mantienen detalles recientes y totales mensuales; localStorage sigue siendo suficiente. No se cambió a IndexedDB.

## Reproducir

```sh
npm test > /tmp/v4-node.log
node tests/v4_simulation.js --days 1080 --seeds 20
npm run test:ui > /tmp/v4-ui.log
python scripts/report-v4.py --node-log /tmp/v4-node.log --ui-log /tmp/v4-ui.log
```

El JSON completo se genera en `/tmp/vinculos-v4-simulation.json`. Los CSV en `reports/` conservan resultados por recorrido y frecuencias por evento y perfil.
