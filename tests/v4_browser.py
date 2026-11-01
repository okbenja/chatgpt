"""Acceptance of the V4 first minutes, pressure, legacy, content and mobile UI."""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
import json, shutil, tempfile
from playwright.sync_api import sync_playwright
from v3_browser import state, nav, settings, import_save, close_dialog
ROOT=Path(__file__).resolve().parents[1]
ART=Path(tempfile.mkdtemp(prefix='vinculos-v4-browser-'))
checks=[]; errors=[]; external=[]
def check(value,label):
    assert value,label
    checks.append(label); print('PASS',label,flush=True)
class Quiet(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
def run():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox'])
            context=browser.new_context(viewport={'width':360,'height':800},accept_downloads=True)
            page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
            page.on('request',lambda r:external.append(r.url) if r.url.startswith(('http:','https:')) and '127.0.0.1' not in r.url else None)
            page.goto(f'http://127.0.0.1:{server.server_port}/')
            check(page.locator('[data-start-preset]').count()==3,'three prepared beginnings and custom creation')
            check(page.locator('#start-custom').count()==1,'custom beginning remains available')
            check(page.locator('.nav-list [data-view]:visible').count()==3,'first minute shows three main tabs')
            page.screenshot(path=str(ART/'start-360.png'),full_page=True)
            check(page.locator('#start-scenario option').count()==5,'four rule-based scenarios accompany the presets')
            page.locator('#start-scenario').select_option('cero50')
            page.locator('[data-start-preset="estudiante"]').click()
            check(state(page)['profile']['age']==50 and state(page)['direction']['scenario']=='cero50','starting over at fifty applies its actual scenario rules')
            check(page.locator('[data-first-choice]').count()==2,'first meaningful choice appears immediately')
            before=state(page);page.locator('[data-first-choice="encargo"]').click();after=state(page)
            check(after['money']==before['money']+20 and after['hour']==before['hour']+1.5,'first choice has exact announced income and time')
            check(after['stats']['energy']==before['stats']['energy']-8 and after['stats']['stress']==before['stats']['stress']+5,'first choice applies announced energy and stress')
            check(page.locator('[data-first-choice]').count()==0,'the first decision cannot be harvested repeatedly')
            check(after['direction']['tutorial']['step']==2,'short introduction advances through actual decisions')
            check(not page.locator('#status-panel').evaluate('(e)=>e.open'),'mobile status panel starts folded')
            page.locator('#status-panel > summary').click()
            page.locator('#sleep-button').click()
            check(page.locator('#day-summary .summary-stat details').count()==0,'day changes share one summary panel')
            energy=page.locator('#day-summary .summary-stat').first;energy.locator('summary').click()
            check(energy.locator('li').count()>=1,'stat changes explain their cause by touch')
            check(bool(energy.locator('summary').get_attribute('title')),'stat explanation is also available on hover')
            close_dialog(page)
            if page.locator('#status-panel').evaluate('(e)=>e.open'):page.locator('#status-panel > summary').click()
            settings(page);page.locator('#show-all-systems').check();close_dialog(page)
            check(page.locator('.nav-list [data-view]:visible').count()==6,'settings can reveal all systems and tabs')
            settings(page)
            for key in ['nightlife','romance','casual']:
                page.locator(f'[data-content-setting="{key}"]').uncheck()
                check(state(page)['direction']['settings'][key] is False,f'{key} content filter persists')
            close_dialog(page)
            seed=state(page);seed['money']=0;seed['life']['pressure']['expenses']=[{'kind':'reparacion','amount':900,'day':1,'dueDay':8}]
            seed['narrative']['pending']=None;seed['hour']=9;seed['stats']['energy']=90
            import_save(page,seed);nav(page,'today')
            check('900' in page.locator('.pressure-panel').inner_text(),'extraordinary expense appears before deciding')
            before=state(page);page.locator('[data-expense-choice="help"]').click();after=state(page)
            check(after['hour']==before['hour']+3 and after['money']==0,'community recovery has a real time cost without requiring money')
            check(not after['life']['pressure']['expenses'],'agreement actually settles the expense')
            seed=state(page);seed['day']=90;seed['stats'].update(health=80,mood=70,stress=30)
            seed['direction']['progress'][seed['aspirations'][0]]['stage']=2
            seed['journal']=[{'day':i+70,'hour':10,'title':f'Decisión propia {i}','text':'Nos sentamos a hablar sobre lo que podíamos sostener.','kind':'event','npcId':'mateo','tags':['amistad'],'eventId':None} for i in range(15)]
            seed['narrative']['pending']=None
            import_save(page,seed);nav(page,'journal');page.locator('#legacy-review').click()
            check(8<=page.locator('.legacy-timeline li').count()<=12,'legacy displays eight to twelve real key moments')
            check(page.locator('.legacy-timeline blockquote').count()>=8,'legacy quotes the diary rather than generic advice')
            with page.expect_download() as download:
                page.locator('[data-legacy-export="svg"]').click()
            target=ART/'legado.svg';download.value.save_as(target)
            check('<svg xmlns=' in target.read_text(),'legacy can be exported as a standalone SVG')
            page.locator('#new-life').click();page.locator('#confirm-new-life').click()
            after=state(page)
            check(after['day']==1 and after['direction']['inheritance']['kind']=='carta','new life receives a letter without old resources')
            check(len(after['direction']['book'])>=1,'book retains earlier lives')
            if page.locator('[data-start-preset]').count():page.locator('[data-start-preset="estudiante"]').click()
            settings(page);page.locator('#show-all-systems').check();close_dialog(page)
            for view in ['today','map','people','family','character','journal']:
                nav(page,view)
                check(page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),f'{view} fits 360px')
                check(page.locator(f'.nav-list [data-view="{view}"][aria-current="page"]').count()==1,f'{view} exposes aria-current')
            nav(page,'today')
            check(page.locator('[role="meter"][aria-valuenow]').count()>=4,'state bars have accessible meter values')
            check(not page.locator('#status-panel').evaluate('(e)=>e.open'),'mobile status panel starts folded')
            sizes=page.locator('.nav-list button:visible').evaluate_all('(a)=>a.map(e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}))')
            check(all(x['w']>=44 and x['h']>=44 for x in sizes),'mobile tabs meet 44px touch targets')
            check(page.locator('.nav-list').bounding_box()['y']>650,'mobile tabs stay at the bottom')
            page.screenshot(path=str(ART/'today-360.png'),full_page=True)
            check(not errors,'no JavaScript console errors')
            check(not external,'no external runtime requests')
            (ART/'results.json').write_text(json.dumps({'passed':len(checks),'checks':checks,'errors':errors,'external':external},ensure_ascii=False,indent=2))
            print(json.dumps({'passed':len(checks),'artifacts':str(ART)}))
            browser.close()
    finally:server.shutdown();server.server_close()
if __name__=='__main__':run()
