"""Local browser regression for the adult nightlife expansion.

Run ``python tests/nightlife_browser.py`` with Python Playwright and Chromium.
No network or application packages are required. Artifacts are written to /tmp.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlparse
import json
import os
import re
import shutil
import tempfile

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = Path(tempfile.mkdtemp(prefix='vinculos-nightlife-'))
SAVE_KEY = 'vinculos-save-v1'
RESULTS, ERRORS, EXTERNAL = [], [], []


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def check(value, label):
    assert value, label
    RESULTS.append(label)
    print('PASS', label, flush=True)


def prepare_full_ui(page):
    if page.locator('[data-start-preset]').count():
        page.locator('[data-start-preset="estudiante"]').click()
        page.locator('#settings-top-button:visible, #settings-button:visible').first.click()
        page.locator('#show-all-systems').check()
        page.keyboard.press('Escape')
        page.wait_for_function("!document.querySelector('#save-status')?.textContent.includes('Guardando los cambios')")


def state(page):
    # V4 writes during idle time; observe completion rather than assuming sync IO.
    page.wait_for_function("!document.querySelector('#save-status')?.textContent.includes('Guardando los cambios')")
    return page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))', SAVE_KEY)


def observe(page):
    page.on('pageerror', lambda error: ERRORS.append(str(error)))
    page.on('request', lambda request: EXTERNAL.append(request.url)
            if urlparse(request.url).scheme in ('http', 'https')
            and urlparse(request.url).hostname not in ('127.0.0.1', 'localhost') else None)


def nav(page, view):
    page.locator(f'[data-view="{view}"]:visible').first.click()


def close_dialog(page):
    if page.locator('#game-dialog[open]').count():
        page.keyboard.press('Escape')


def import_save(page, payload):
    close_dialog(page)
    page.locator('#settings-button:visible, #settings-top-button:visible').first.click()
    page.locator('#import-file').set_input_files({
        'name': 'historia-nocturna.json', 'mimeType': 'application/json',
        'buffer': json.dumps(payload).encode(),
    })
    page.locator('#confirm-import').wait_for()
    page.locator('#confirm-import').click()
    page.wait_for_timeout(60)


def quiet_seed(page):
    # Avoid unrelated narrative interruptions while testing this particular
    # conversation; ordinary event selection is covered by browser_smoke.py.
    return page.evaluate("""() => {
      const g=new LifeGame(null);
      g.create({name:'Vera',age:25,path:'free'},{seed:1});
      for(let seed=1;seed<200000;seed++){
        g.state.rngState=seed;
        if(Array.from({length:12},()=>g.random()).every(n=>n>.48))return seed;
      }
      throw new Error('No deterministic quiet seed found');
    }""")


def fresh_evening(page, hour=19, location='discoteca'):
    saved=state(page)
    saved.update(hour=hour, location=location, money=200)
    saved['stats'].update(energy=100, mood=75, stress=20, charm=45)
    saved['daily']={'interactions':{},'actions':{},'gifts':{},'workHours':0}
    saved['narrative'].update(pending=None,queue=[])
    saved['flags']['storageNoticeSeen']=True
    saved['rngState']=quiet_seed(page)
    for rel in saved['relationships'].values():
        if rel['status'] in ('partner','dating'):
            rel['status']='friend'
    return saved


def main():
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietHandler,directory=str(ROOT)))
    Thread(target=server.serve_forever,daemon=True).start()
    url=f'http://127.0.0.1:{server.server_port}'
    browser_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch(executable_path=browser_path,headless=True,args=['--no-sandbox'])
            try:
                context=browser.new_context(viewport={'width':1440,'height':1050},accept_downloads=True)
                page=context.new_page()
                observe(page)
                page.goto(url)
                prepare_full_ui(page)
                page.locator('.hero-card').wait_for()
                if page.locator('#dismiss-first-save').count():
                    page.locator('#dismiss-first-save').click()
                catalog=page.evaluate('VINCULOS_DATA.locations.map(l=>({id:l.id,category:l.category,opensAt:l.opensAt,closesAt:l.closesAt}))')
                check(len(catalog)==16,'the current world retains nightlife within sixteen destinations')
                new_ids={'bar','discoteca','azotea','playa','centrocultural','restaurante'}
                check(new_ids.issubset({l['id'] for l in catalog}),'all six new places are available in the catalog')
                nav(page,'map')
                check(page.locator('.map-grid [data-travel]').count()==len(catalog),'Explore renders all destinations')
                page.locator('[data-explore-filter="noche"]').click()
                visible_ids=page.locator('.map-grid [data-travel]').evaluate_all('els=>els.map(e=>e.dataset.travel)')
                night_ids={l['id'] for l in catalog if l.get('category')=='noche'}
                check(visible_ids and set(visible_ids).issubset(night_ids),'nightlife filter shows the matching places')
                check({'bar','discoteca'}.issubset(visible_ids),'nightlife includes the bar and nightclub')
                page.screenshot(path=str(ARTIFACTS/'explore-night.png'),full_page=True)
                before=state(page)
                page.locator('[data-travel="discoteca"]').click()
                check(state(page)['location']==before['location'] and state(page)['hour']==before['hour'],'closed venue cannot consume travel time')
                check('19' in page.locator('body').inner_text(),'nightclub opening time is visible')
                page.locator('[data-wait-place="discoteca"]').click()
                check(page.locator('#confirm-wait-opening').count()==1,'waiting until opening is an explicit choice')
                close_dialog(page)
                check(state(page)['hour']==before['hour'],'canceling the wait preserves the day')
                page.locator('[data-wait-place="discoteca"]').click()
                wait_copy=page.locator('#game-dialog .confirm-copy').inner_text()
                wait_energy=int(re.search(r'emplearás (\d+) de energía',wait_copy).group(1))
                page.locator('#confirm-wait-opening').click()
                check(state(page)['hour']>=18.5 and state(page)['hour']<19.1,'waiting advances to the planned departure or opening')
                check(before['stats']['energy']-state(page)['stats']['energy']==wait_energy,'waiting consumes exactly the energy displayed in its confirmation')

                # A fresh, unpartnered encounter starts from ordinary acquaintance
                # values; no maximum friendship or relationship cheat is used.
                seed=fresh_evening(page)
                seed['relationships']['celia'].update(friendship=10,trust=10,romance=0,status='acquaintance',boundary=False)
                seed['relationships']['celia']['casual']={'expectations':'unknown','attraction':0,'encounters':0,'lastEncounterDay':0,'history':[]}
                import_save(page,seed)
                nav(page,'today')
                check(page.locator('.nightlife-hero').count()==1,'the nightlife location has its own scene and presentation')
                check(page.locator('[data-npc="celia"]').count()>=1,'an adult nightlife character is present at the nightclub')
                page.screenshot(path=str(ARTIFACTS/'nightclub.png'),full_page=True)
                page.locator('[data-npc="celia"]').first.click()
                check(page.locator('.nightlife-panel').count()==1,'adult character exposes a separate casual-interaction panel')
                check(page.locator('.casual-meters').count()==1,'casual attraction is displayed separately from romantic commitment')
                check(page.locator('[data-night-action="oneNight"]').is_disabled(),'a one-night encounter requires prior mutual expectations and attraction')
                page.locator('[data-night-action="talkExpectations"]').click()
                check(state(page)['relationships']['celia']['casual']['expectations']=='casual','an honest conversation establishes mutual casual expectations')
                page.locator('[data-night-action="danceTogether"]').click()
                page.locator('[data-night-action="casualFlirt"]').click()
                rel=state(page)['relationships']['celia']
                check(rel['casual']['attraction']>=20 and rel['friendship']<35,'mutual casual attraction does not require an emotional friendship grind')
                check(rel['romance']==0 and rel['status']=='acquaintance','casual flirting does not silently start dating or a relationship')
                before=state(page)
                page.locator('[data-night-action="oneNight"]').click()
                check(page.locator('#confirm-casual-encounter').count()==1 and page.locator('.encounter-confirm').count()==1,'one-night encounter receives its own final confirmation')
                encounter_copy=page.locator('.encounter-confirm .notice').inner_text()
                encounter_energy=int(re.search(r'y (\d+) de energía',encounter_copy).group(1))
                check(state(page)==before,'opening the encounter confirmation does not consume resources')
                page.keyboard.press('Escape')
                check(state(page)==before,'canceling the encounter leaves the story intact')
                nav(page,'people')
                page.locator('.person-card[data-npc="celia"]').click()
                page.locator('[data-night-action="oneNight"]').click()
                page.locator('#confirm-casual-encounter').click()
                after=state(page)
                check(after['relationships']['celia']['casual']['encounters']==1,'confirmed encounter records an actual casual experience')
                check(after['hour']>before['hour'] and before['stats']['energy']-after['stats']['energy']==encounter_energy,'the encounter consumes its stated time and exact energy')
                check(after['money']==before['money'],'consent is not purchased by the encounter action')
                check(after['relationships']['celia']['romance']==0 and after['relationships']['celia']['status']=='acquaintance','one-night encounter remains separate from emotional commitment')
                check(after['relationships']['celia']['casual']['history'] and any(e['npcId']=='celia' for e in after['journal']),'casual experience has a shared history and diary memory')
                check(page.locator('[data-night-action="oneNight"]').is_disabled(),'same-day encounter repetition is limited')
                close_dialog(page)
                persisted=state(page)
                page.reload()
                page.locator('main h1').wait_for()
                check(state(page)==persisted,'reload preserves the casual history and expectations')

                # A different adult who does not want casual intimacy can decline
                # without being turned into a romance-farming target.
                seed=fresh_evening(page,hour=19,location='bar')
                import_save(page,seed)
                nav(page,'today')
                page.locator('[data-npc="mara"]').first.click()
                before=state(page)
                button=page.locator('[data-night-action="talkExpectations"]')
                if button.is_enabled():
                    button.click()
                rel=state(page)['relationships']['mara']
                check(rel['casual']['expectations'] in ('declined','romantic','unknown') and rel['casual']['encounters']==0,'a person uninterested in casual encounters keeps that preference')
                check(page.locator('[data-night-action="oneNight"]').is_disabled(),'a refusal or different preference does not expose a casual encounter')
                check(rel['romance']==before['relationships']['mara']['romance'],'a boundary does not create romantic interest')
                close_dialog(page)
                nav(page,'family')
                page.locator('[data-npc="madre"]').click()
                check(page.locator('.nightlife-panel').count()==0 and page.locator('[data-night-action]').count()==0,'family cards never offer casual intimacy')
                close_dialog(page)

                # Build a valid child through the public engine operation, then
                # use the normal import dialog to inspect the live family card.
                family=page.evaluate("""() => {
                  const g=new LifeGame(null);g.create({name:'Vera',age:25,path:'free'},{seed:42});
                  g.state.money=600;Object.assign(g.getRelationship('mateo'),{status:'partner',trust:90,romance:70,dates:3});
                  const r=g.addChild('Luz');if(!r.ok)throw new Error(r.message);
                  g.state.narrative.pending=null;g.state.narrative.queue=[];
                  return JSON.parse(g.exportSave());
                }""")
                import_save(page,family)
                nav(page,'family')
                child=state(page)['family']['children'][0]['id']
                page.locator(f'[data-npc="{child}"]').click()
                check(page.locator('.nightlife-panel').count()==0 and page.locator('[data-night-action]').count()==0,'a child has family-only interactions and no nightlife panel')
                close_dialog(page)

                # Original-format compatibility is rechecked with the expanded
                # NPC list, not only with a newly created evening save.
                old=json.loads((ROOT/'tests/fixtures/save-v1.json').read_text())
                import_save(page,old)
                migrated=state(page)
                check(migrated['version']==4 and migrated['profile']['name']==old['profile']['name'],'the original save still migrates after nightlife expansion')
                check(migrated['relationships']['madre']['trust']==old['relationships']['madre']['trust'] and 'celia' in migrated['relationships'],'migration preserves established bonds and adds nightlife acquaintances')
                seed=fresh_evening(page)
                import_save(page,seed)
                with page.expect_download() as download_info:
                    page.locator('#settings-button:visible, #settings-top-button:visible').first.click()
                    page.locator('#export-save').click()
                export=ARTIFACTS/'nightlife-save.json'
                download_info.value.save_as(str(export))
                check(json.loads(export.read_text())['relationships']['celia'].get('casual') is not None,'export includes the casual relationship schema')
                close_dialog(page)
                context.close()

                mobile=browser.new_context(viewport={'width':360,'height':844},is_mobile=True,has_touch=True)
                mp=mobile.new_page();observe(mp);mp.goto(url);prepare_full_ui(mp);mp.locator('.hero-card').wait_for()
                import_save(mp,seed)
                nav(mp,'map');mp.locator('[data-explore-filter="noche"]').click()
                check(not mp.evaluate('document.documentElement.scrollWidth>innerWidth+1'),'nightlife Explore fits a 360px screen')
                nav(mp,'today');mp.locator('[data-npc="celia"]').first.click()
                check(not mp.evaluate('document.documentElement.scrollWidth>innerWidth+1'),'casual-interaction dialog fits a 360px screen')
                touch=mp.locator('.nightlife-panel [data-night-action]:visible').evaluate_all('els=>els.every(e=>{const r=e.getBoundingClientRect();return r.height>=44 && r.width>=44})')
                check(touch,'nightlife actions retain usable 44px touch areas')
                check(mp.locator('#game-dialog').evaluate('d=>d.contains(document.activeElement)'),'nightlife dialog keeps initial keyboard focus inside')
                mp.screenshot(path=str(ARTIFACTS/'casual-mobile.png'),full_page=True)
                mp.keyboard.press('Escape')
                check(not mp.locator('#game-dialog').evaluate('d=>d.open'),'Escape closes the casual-interaction dialog')
                mobile.close()
                check(not ERRORS,'all nightlife flows complete without JavaScript errors')
                check(not EXTERNAL,'nightlife assets and game logic make no external requests')
                print(json.dumps({'passed':len(RESULTS),'errors':ERRORS,'artifacts':str(ARTIFACTS)},ensure_ascii=False))
            finally:
                browser.close()
    finally:
        server.shutdown();server.server_close()


if __name__=='__main__':
    main()
