# Informe de equilibrio de Vínculos

Ensayo reproducible de **365 días × 20 semillas = 7300 días** con el piloto automático del motor narrativo. No usa trucos, no fuerza eventos y no modifica la partida que inicia el ensayo.

## Método

- El piloto ejecuta desplazamientos, actividades, conversaciones, mensajes, decisiones narrativas y descansos mediante los métodos del juego. Sus decisiones siguen una política de autocuidado y variedad, no una estrategia humana óptima.
- Los perfiles iniciales recorren colegio, universidad, trabajo y tiempo libre; edades de 19 a 67 años y dos combinaciones de rasgos. Las condiciones de pareja, confianza, estación o cadenas siguen siendo necesarias: no se eliminan para conseguir cobertura.
- Dos ejecuciones de una misma semilla comparan distribución, historial, extremos y economía; se verifica que todo el guardado de origen permanezca idéntico.
- Las estadísticas se observan al cierre de cada día. Una frecuencia de 100 no equivale por sí sola a un bloqueo: energía, por ejemplo, vuelve a subir al descansar. Se informa también de la racha máxima.

## Eventos y repetición

- Catálogo: **104 eventos**, de los que **79 son bases** y 25 son continuaciones.
- Resoluciones: **11.557**, con **95 eventos distintos**.
- Repeticiones adicionales del mismo evento dentro de una semana: **0** en 1024 semanas observadas (0.000 por semana).
- Máximo de apariciones del mismo evento en una semana: **1**.
- Eventos base no vistos: **4**. Continuaciones no vistas: **5**.

| Evento no observado | Tipo | Condiciones |
| --- | --- | --- |
| Lo que esperáis de una cita (expectativas_cita) | Base | `{"relationships":{"valentina":{"friendship":{"min":30},"romance":{"min":5}}}}` |
| Poder decir todavía no (intimidad_limites) | Base | `{"relationships":{"alex":{"romance":{"min":5}}}}` |
| Dos agendas, una idea (proyecto_compartido) | Base | `{"relationships":{"sofia":{"romance":{"min":5}}}}` |
| Un ritmo para dos (cita_ritmos) | Continuación | `{}` |
| Lo que sí queréis cuidar (cita_balance) | Continuación | `{}` |
| Lo que no has contado (secreto_pesa) | Continuación | `{}` |
| Una conversación inevitable (secreto_descubierto) | Continuación | `{}` |
| Después de la verdad (reparar_acuerdo) | Continuación | `{}` |
| La mañana siguiente (noche_manana_siguiente) | Base | `{"flags":{"casual_experience":true},"hour":{"max":12},"day":{"min":2},"locations":["casa","cafeteria"]}` |

## Estadísticas

| Estadística | Días en 0 | Días en 100 | Racha máxima en 0 / 100 | Valor final (rango) |
| --- | ---: | ---: | ---: | ---: |
| energy | 0 (0.00 %) | 3 (0.04 %) | 0 / 1 | 12–66 |
| mood | 0 (0.00 %) | 0 (0.00 %) | 0 / 0 | 87–90 |
| health | 0 (0.00 %) | 0 (0.00 %) | 0 / 0 | 71–81 |
| social | 0 (0.00 %) | 0 (0.00 %) | 0 / 0 | 85–90 |
| knowledge | 0 (0.00 %) | 0 (0.00 %) | 0 / 0 | 92–97 |
| charm | 0 (0.00 %) | 0 (0.00 %) | 0 / 0 | 84–91 |
| responsibility | 0 (0.00 %) | 0 (0.00 %) | 0 / 0 | 89–93 |
| stress | 4456 (61.04 %) | 0 (0.00 %) | 17 / 0 | 0–8 |

## Economía

- Dinero inicial agregado: 2400 €. Ingresos: 108.860 €. Gastos: 32.121 €.
- Saldo final por partida: 3346 €–4502 €; media 3957 €.
- Mínimo y máximo observados durante el ensayo: 115 € / 4502 €.
- Errores de ejecución: **0**.

## Límites e interpretación

La cobertura corresponde a esta política automática y estas semillas. No demuestra que todos los recorridos humanos estén equilibrados ni que un evento condicionado sin aparecer sea imposible. Las estadísticas persistentes pueden acercarse a sus límites al acumular un año de práctica; las tablas permiten detectar esa saturación sin confundirla con un fallo del generador. Los eventos encadenados dependen de elecciones previas y pueden no recorrerse con esta política.

## Reproducir

```sh
node tests/simulation.js --days 365 --seeds 20 --write
```

El informe JSON completo se escribe en `/tmp/vinculos-balance-report.json`; `--write` actualiza este documento con los resultados de la ejecución.

### Cobertura de la ampliación nocturna

El catálogo del ensayo contiene 104 eventos. El piloto general no toma decisiones de encuentros íntimos; esa rama se comprueba con `tests/nightlife.test.js` y `tests/nightlife_browser.py`. La prueba dirigida verifica que la química casual no aumenta romance, que las confirmaciones no consumen recursos al cancelar y que las negativas, límites, horarios y guardados se respetan. No se afirma cobertura anual automática de esa rama. La condición de la mañana siguiente se ha restringido además al día inmediatamente posterior al encuentro, con una prueba específica.
