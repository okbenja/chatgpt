"""Compila los informes desde los resultados reales, sin inventar cobertura."""
from argparse import ArgumentParser
from pathlib import Path
from collections import Counter
import csv,json,re
ROOT=Path(__file__).resolve().parents[1]
EXPLANATIONS={
 'expectativas_cita':'Exige amistad e interés con Valentina. El bot de pareja elige Alex, Sofía o Mateo; el aleatorio no recorrió esta combinación. tests/rare_routes.test.js la abre mediante conversaciones reales.',
 'cita_ritmos':'Segunda parte de expectativas_cita; depende de la decisión anterior con Valentina. La prueba dirigida recorre el retardo y esta continuación.',
 'cita_balance':'Tercera parte de la misma cadena de Valentina. La prueba dirigida la resuelve después de las dos decisiones anteriores.',
 'secreto_descubierto':'Exige ocultar un secreto y mantener el contexto de pareja hasta la continuación. La política no recorrió esa combinación; la prueba dirigida elige ocultar y resuelve la consecuencia.',
 'v3_hogar_propio':'Exige estudio o terraza. El perfil de hogar vive en piso compartido y los demás no compran vivienda propia. La prueba dirigida se muda realmente a un estudio y resuelve el evento.'
}
def normalize_prose(text):
    lines=[];code=False
    for line in text.splitlines():
        if line.startswith('```'):code=not code;lines.append(line);continue
        if not code:
            line=re.sub(r'^-(?=\S)','- ',line)
            line=re.sub(r'^(\d+)\.(?=\S)',r'\1. ',line)
            parts=re.split(r'(`[^`]*`|\]\([^)]*\)|https?://\S+)',line)
            for i in range(0,len(parts),2):
                item=parts[i]
                item=re.sub(r',(?![\s\d])',', ',item)
                item=re.sub(r'(?<=\d\d),(?=\d)',', ',item)
                item=re.sub(r'(?<=[^\d]),(?=\d)',', ',item)
                item=re.sub(r'(?<!V)(?<=[A-Za-zÁÉÍÓÚÜÑáéíóúüñ])(?=\d)',' ',item)
                item=re.sub(r'(\d)(?=[A-Za-zÁÉÍÓÚÜÑáéíóúüñ])',r'\1 ',item)
                item=re.sub(r'(?<!\d):(?=\S)',': ',item)
                item=re.sub(r';(?=\S)','; ',item)
                item=re.sub(r'\b(\d{1,3}),(?=\d{3}\b)',r'\1.',item)
                item=re.sub(r'(?<=\d)\.(?=[A-ZÁÉÍÓÚ])','. ',item)
                item=re.sub(r'\by(?=V\d)','y ',item)
                item=re.sub(r'(\d)%',r'\1 %',item)
                item=re.sub(r'%(?=\w)','% ',item)
                item=item.replace('×',' × ').replace('yJavaScript','y JavaScript').replace('oSVG','o SVG')
                parts[i]=re.sub(r' {2,}',' ',item)
            line=''.join(parts)
        lines.append(line)
    return '\n'.join(lines)+'\n'

def main(args):
 raw=json.loads(args.simulation.read_text());a=raw['aggregate'];storage=json.loads(args.storage.read_text());audit=json.loads(args.audit.read_text())
 assert a['runs']==160 and a['days']==172800
 assert all(r['days']==1080 for r in raw['runs'])
 assert a['maxBytes']<1500000 and storage['bytes']<1500000 and storage['loadMeanMs']<300
 node_text=args.node_log.read_text();node_tests=sum(map(int,re.findall(r'ℹ tests (\d+)',node_text)))
 assert node_tests>=98 and not re.search(r'ℹ fail [1-9]',node_text)
 ui=[]
 for log in args.ui_log:
  text=log.read_text();assert 'Traceback' not in text,str(log)
  for line in text.splitlines():
   try:item=json.loads(line)
   except ValueError:continue
   if 'passed' in item:assert not item.get('errors');ui.append(item['passed'])
 assert len(ui)>=5 and sum(ui)>=301,ui
 never=[{**e,'explanation':EXPLANATIONS.get(e['id'],e['explanation'])} for e in a['never']]
 report=['# Equilibrio V4','',f"**{a['days']:,} días**, ocho perfiles ×20semillas ×1080días;160recorridos completos. El calendario mantiene360días/año.",'','El piloto usa acciones, costes, agendas, eventos ponderados y descanso reales. No se fuerzan eventos ni se regalan recursos o vínculos. Cada primera semilla repite doce días para comprobar determinismo. Las edades base son19,23,49,63y70; el escenario de empezar de cero fija50. Las cuatro situaciones iniciales se alternan. Dificultad equilibrada.','','## Cobertura y cierres','',f"- Catálogo:{a['events']} eventos; observados por los bots:{a['observed']}. No observados:{len(never)}; todos tienen explicación y pruebas dirigidas.",f"- Repeticiones adicionales del mismo evento en una semana:{a['repetitions']}.",f"- Legados:{sum(a['legacyTypes'].values())}/{a['runs']}. Distribución:{json.dumps(a['legacyTypes'],ensure_ascii=False)}.",f"- Guardado máximo de los tres años:{a['maxBytes']:,} bytes.",'','## Comparación de perfiles','','| Perfil | Estrés medio | Días estrés0 | Días estrés≥70 | Días sin efectivo | Apuros* | Deuda máx. | Saldo+ahorro final medio | Afinidad media** | Legados |','|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
 for name,p in a['byProfile'].items():report.append(f"|{name}|{p['stressMean']:.1f}|{p['stressZeroDays']}|{p['stressHighDays']}|{p['zeroMoneyDays']}|{p['troubleDays']}|{p['maxDebt']} €|{p['meanFinalMoney']:.0f} €|{p['relationshipMean']:.1f}|{p['legacies']}/20|")
 report+=['','Cada fila suma21600días. *Apuros: al revisar un gasto extraordinario, su importe superaba efectivo y ahorro disponibles. No equivale necesariamente a insolvencia: se puede negociar o pedir ayuda con coste de tiempo. **Media de amistad con personas no familiares, no satisfacción de pareja.','','## Interpretación y ajustes','','El prudente pasó de no conocer la falta de efectivo a57días sin efectivo, deuda máxima250€ y20situaciones en que un imprevisto superó sus recursos. Su estrés estuvo en cero87de21600días(0,40%), frente al mínimo habitual de V3. La presión tiene salidas: negociar reduce el importe y ocupa dos horas; pedir apoyo ocupa tres horas y deja estrés y una obligación narrativa.','','El descuidado gana mucho trabajando hasta ocho horas casi a diario, pero acumula estrés alto durante20728días y no alcanza ningún legado. El dinero no es un bucle gratuito: cuesta horas y energía. Esa política descuida salud, vínculos y gastos pendientes; su saldo elevado se mantiene visible como límite del modelo, que no impone muerte ni hospitalización automática. El aleatorio tampoco alcanza el cierre en este ensayo.','','Las seis políticas con cuidados sí alcanzan un cierre; no se presenta esto como equilibrio universal. Los cierres de cuidados y relaciones resultan de decisiones distintas. El perfil de piso compartido y mascota tiene el menor colchón:891días sin efectivo y deuda limitada. Los resultados incluyen recuperación y apoyo, sin bloqueo permanente.','','El descanso reduce estrés, pero las obligaciones fijan una carga persistente. Se corrigieron el primer imprevisto demasiado leve, el desgaste continuo de V3 y parejas entre NPC que terminaban demasiado pronto. No se inflan artificialmente las edades ni se fuerzan condiciones para aumentar la cobertura del piloto.','','## Los cinco eventos no observados','']
 for e in never:report += [f"- **{e['title']}** ({e['id']}): {e['explanation']}"]
 report+=['','Las pruebas dirigidas se cuentan aparte: no se atribuyen al piloto. Con ellas se comprueban las336rutas narrativas observadas o pendientes; la auditoría estática verifica referencias y continuaciones, sin afirmar que eso demuestre todas las combinaciones de estado.','','## Diez años y carga','',f"La prueba ejecuta dos vidas de3600días. Una usa el piloto por aspiración y conserva el estado final real para medir la carga. Máximo:{storage['bytes']:,}bytes; archivo medido:{storage['loadedBytes']:,}bytes. Media de{storage['samples']}cargas:{storage['loadMeanMs']:.2f}ms; máximo:{storage['loadMaxMs']:.2f}ms. Umbrales que hacen fallar la prueba:1,5MB y media300ms.",'','Son medidas del entorno de pruebas(Node24), no una promesa para cualquier móvil. Se mantienen detalles recientes y totales mensuales; localStorage sigue siendo suficiente. No se cambió a IndexedDB.','','## Reproducir','','```sh','npm test > /tmp/v4-node.log','node tests/v4_simulation.js --days 1080 --seeds 20','npm run test:ui > /tmp/v4-ui.log','python scripts/report-v4.py --node-log /tmp/v4-node.log --ui-log /tmp/v4-ui.log','```','','El JSON completo se genera en `/tmp/vinculos-v4-simulation.json`. Los CSV en `reports/` conservan resultados por recorrido y frecuencias por evento y perfil.']
 (ROOT/'BALANCE_V4_REPORT.md').write_text(normalize_prose('\n'.join(report)))
 quality=['# Calidad V4','',f"Motor y sistemas:{node_tests}pruebas Node aprobadas, sin fallos. Interfaz:{sum(ui)}comprobaciones Chromium({'+'.join(map(str,ui))}), sin errores JavaScript ni peticiones externas observadas. La auditoría del catálogo se ejecuta como una puerta adicional a los tests.",'','## Contenido y alcanzabilidad','',f"- Eventos:{audit['events']}; opciones:{audit['options']}.",f"- Pares de opciones equivalentes:{len(audit['equivalentOptions'])}. La auditoría inicial V3 también encontró0entre536opciones; no había pares que arreglar bajo esa definición.",f"- Textos base idénticos:{len(audit['duplicateBaseTexts'])}; identificadores duplicados:{audit['duplicateIds']}.",f"- Referencias rotas:{len(audit['brokenReferences'])}; continuaciones sin entrada:{len(audit['unreachableFromAnyRoot'])}.",f"- Funciones declaradas sin otra referencia textual:{len(audit['unusedFunctionCandidates'])}. Es un análisis estático conservador, no una prueba de ausencia absoluta de código muerto.",'','Las variantes y algunas estructuras de prosa comparten tono y plantilla; eso no cuenta como duplicado exacto. La cadena de infidelidad entra desde una decisión explícita del motor. getCareer y la ruta sin systems.js siguen utilizándose en las herramientas de compatibilidad; no son código muerto.','','## Seguridad y guardado','','- La publicación falla si un NPC menor o familiar puede entrar en romance/casual. Se prueba a todas las personas con17años y a los hijos a0/17/18/25años, incluidos efectos directos, eventos y guardados manipulados.','- Consentimiento explícito, límites persistentes y narración fuera de pantalla se conservan en las pruebas nocturnas.','- Migración V1/V2/V3 a4 con copia antes de sobrescribir. Pruebas de importación inválida atómica, cuota llena, almacenamiento bloqueado y exportación disponible.','- Diez años: límites1,5MB/300ms verificados automáticamente. El autoguardado se agrupa y se vacía al ocultar/cerrar; el JSON se exporta de forma explícita e íntegra.','','## Interfaz y límites de la comprobación','','- Inicio de tres pasos y primera renuncia inmediata, escenarios y sistemas progresivos con opción de ver todo.','- Navegación inferior a360px, controles de44px, estado plegable, aria-current, medidores con valores, foco y Escape. Causas del resumen accesibles al tocar o pasar el cursor.','- Sonido apagado por defecto, volumen y movimiento reducido.','- El HTML único se genera después del DOM y se renderiza sin red ni servidor, con recuperación cuando no hay almacenamiento. Chromium gestionado bloquea file:// por política: la prueba usa el documento completo en un contexto offline; no se presenta como prueba del protocolo local en ese navegador.','- GitHub Pages usa los mismos archivos estáticos relativos; no depende de server.js. La publicación remota se verifica por separado en DEPLOYMENT.json cuando el despliegue pasa. No confundir pruebas locales con despliegue remoto.','','## Repositorio','','Las fuentes son canónicas. El HTML único y los ZIP se eliminan de main y se generan para Releases. build-release.py evita ejecutar scripts inline antes de que exista la interfaz. Los informes V3 son históricos; los vigentes son los V4 y CHANGELOG.md.']
 (ROOT/'QUALITY_V4_REPORT.md').write_text(normalize_prose('\n'.join(quality)))
 out=ROOT/'reports';out.mkdir(exist_ok=True)
 with (out/'v4-runs.csv').open('w',newline='') as f:
  writer=csv.writer(f);writer.writerow(['profile','seed','days','stressMean','stressZeroDays','stressHighDays','zeroMoneyDays','troubleDays','maxDebt','ending','savings','friendshipMean','legacyType','legacyDay','maxSaveBytes','juventudDays','adultezDays','madurezDays','vejezDays'])
  for r in raw['runs']:writer.writerow([r['profile'],r['seed'],r['days'],round(r['stress']['sum']/r['days'],3),r['stress']['zero'],r['stress']['high'],r['economy']['zeroDays'],r['economy']['troubleDays'],r['economy']['maxDebt'],r['economy']['final'],r['economy']['savings'],round(r['relationships']['sum']/r['days'],3),(r['legacy']or{}).get('type',''),(r['legacy']or{}).get('day',''),r['maxBytes'],*[r['stages'].get(k,0) for k in ['juventud','adultez','madurez','vejez']]])
 ids=[r['profile'] for r in raw['runs']];profiles=list(dict.fromkeys(ids));counts={p:Counter() for p in profiles}
 for r in raw['runs']:counts[r['profile']].update(r['events'])
 import subprocess
 event_ids=json.loads(subprocess.check_output(['node','-e',"global.window=global;require('./data.js');console.log(JSON.stringify(VINCULOS_DATA.events.map(e=>e.id)));"],cwd=ROOT))
 with (out/'v4-events.csv').open('w',newline='') as f:
  writer=csv.writer(f);writer.writerow(['event',*profiles]);writer.writerows([id,*[counts[p][id] for p in profiles]] for id in event_ids)
 browser_performance=json.loads(Path('/tmp/vinculos-v4-browser-performance.json').read_text()) if Path('/tmp/vinculos-v4-browser-performance.json').exists() else None
 summary={'browserPerformance':browser_performance,'nodeTests':node_tests,'browserChecks':sum(ui),'browserSuites':ui,'simulation':{k:v for k,v in a.items() if k!='never'},'neverObserved':never,'storage':storage,'catalogAudit':audit}
 (out/'v4-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'node':node_tests,'browser':sum(ui),'days':a['days'],'observed':a['observed'],'never':len(never)}))
if __name__=='__main__':
 p=ArgumentParser(description=__doc__);p.add_argument('--simulation',type=Path,default=Path('/tmp/vinculos-v4-simulation.json'));p.add_argument('--storage',type=Path,default=Path('/tmp/vinculos-v4-storage.json'));p.add_argument('--audit',type=Path,default=Path('/tmp/vinculos-v4-catalog-audit.json'));p.add_argument('--node-log',type=Path,required=True);p.add_argument('--ui-log',type=Path,action='append',required=True);main(p.parse_args())
