"""Directed V3 interface regression. Run: python tests/v3_browser.py.

Python Playwright and Chromium are optional development tools, never runtime
requirements. Tests use a local temporary server and write artifacts to /tmp.
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
ARTIFACTS = Path(tempfile.mkdtemp(prefix='vinculos-v3-browser-'))
RESULTS, ERRORS, EXTERNAL = [], [], []
SAVE_KEY = 'vinculos-save-v1'


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


def settings(page):
    close_dialog(page)
    page.locator('#settings-button:visible, #settings-top-button:visible').first.click()


def import_save(page, payload):
    settings(page)
    page.locator('#import-file').set_input_files({
        'name': 'prueba-v3.json', 'mimeType': 'application/json',
        'buffer': json.dumps(payload).encode(),
    })
    page.locator('#confirm-import').wait_for()
    page.locator('#confirm-import').click()
    page.wait_for_timeout(60)


def directed_state(page, **overrides):
    """A valid fixture isolates a system; it does not alter production rules."""
    saved = state(page)
    saved.update(hour=9, money=1000, location='casa')
    saved['stats'].update(energy=100, mood=75, stress=15, knowledge=65, responsibility=70)
    saved['narrative'].update(pending=None, queue=[])
    saved['daily'] = {'interactions': {}, 'actions': {}, 'gifts': {}, 'workHours': 0}
    saved['flags']['storageNoticeSeen'] = True
    saved.update(overrides)
    return saved


def action(page, name, item=None):
    selects={'changeJob':'#job-select','moveHome':'#housing-select','adoptPet':'#pet-kind'}
    if item and name in selects and page.locator(selects[name]).count():
        page.locator(selects[name]).select_option(item)
    selector = f'[data-life-action="{name}"]'
    if item:
        selectors = [selector+f'[data-id="{item}"]', selector+f'[data-item="{item}"]', selector+f'[data-value="{item}"]']
        for candidate in selectors:
            if page.locator(candidate).count():
                page.locator(candidate).first.click()
                return
    page.locator(selector).first.click()


def full_game(browser, url):
    context = browser.new_context(viewport={'width': 1440, 'height': 1080}, accept_downloads=True)
    page = context.new_page()
    observe(page)
    page.goto(url)
    prepare_full_ui(page)
    page.locator('main h1').wait_for()
    check(state(page)['version'] == 4, 'fresh game uses schema version 3')
    check(len(state(page)['aspirations']) in (1, 2), 'fresh game has a valid aspiration')
    check(state(page)['direction']['settings']['audioEnabled'] is False, 'ambient audio is off by default')
    check(page.locator('.tutorial-panel').count() == 1, 'first day includes an interactive introduction')
    page.screenshot(path=str(ARTIFACTS / 'today.png'), full_page=True)
    initial=state(page)
    links=initial['relationships'].values()
    initial_average=int(sum(rel['friendship'] for rel in links)/len(initial['relationships'])+.5)
    nav(page, 'character')
    links_chart=page.locator('svg.trend-svg[aria-label^="Vínculos:"]')
    check(f'Vínculos: de {initial_average} a {initial_average},' in links_chart.get_attribute('aria-label')
          and f'{initial_average} → {initial_average}' in links_chart.locator('..').locator('.chart-caption').inner_text(),
          'initial relationship chart and accessible description use the actual friendship average')

    # Both an existing browser slot and explicit import use the real migration path.
    fixture = json.loads((ROOT / 'tests/fixtures/save-v2.json').read_text())
    migration = browser.new_context(viewport={'width': 1280, 'height': 900})
    migration.add_init_script("if(!localStorage.getItem('vinculos-save-v1')) localStorage.setItem('vinculos-save-v1',JSON.stringify("+json.dumps(fixture)+"));")
    mp=migration.new_page()
    observe(mp)
    mp.goto(url)
    mp.locator('main h1').wait_for()
    check(state(mp)['version']==4 and state(mp)['profile']==fixture['profile'], 'an existing V2 browser slot migrates without starting a new character')
    backup=mp.evaluate('JSON.parse(localStorage.getItem(LifeGame.LEGACY_BACKUP_KEY))')
    check(backup==fixture,'migration preserves an exact previous-version backup')
    migration.close()
    import_save(page, fixture)
    migrated = state(page)
    check(migrated['version'] == 4, 'previous version migrates through the public import interface')
    check(migrated['profile'] == fixture['profile'] and migrated['money'] == fixture['money'],
          'migration preserves identity and cash')
    check(migrated['stats'] == fixture['stats'] and migrated['relationships']['madre']['trust'] == fixture['relationships']['madre']['trust'],
          'migration preserves statistics and established relationships')
    check('life' in migrated and 'direction' in migrated and len(migrated['aspirations']) >= 1,
          'migration initializes direction and life systems')

    # New identity setup remains editable through existing creator controls.
    nav(page, 'character')
    page.locator('[data-open="creator"]').first.click()
    check(page.locator('[data-aspiration]').count() == 6, 'creator exposes six aspirations')
    check(page.locator('#difficulty-select, [name="difficulty"]').count() >= 1,
          'creator exposes difficulty selection')
    page.locator('[data-aspiration="aventura"]').click()
    page.locator('[data-aspiration="estabilidad"]').click()
    page.locator('[data-aspiration="conocimiento"]').click()
    page.locator('[data-aspiration="familia"]').click()
    check(page.locator('[data-aspiration][aria-pressed="true"]').count()==2,'creator limits selection to two aspirations')
    page.locator('#creator-form button[type="submit"]').click()
    check(set(state(page)['aspirations'])=={'aventura','conocimiento'},'selected aspirations are saved by character creation')
    check(state(page)['hour']==migrated['hour']+1 and state(page)['stats']['energy']==migrated['stats']['energy']-8,'changing an established aspiration has its stated narrative time and energy cost')
    nav(page, 'today')
    check(page.locator('.direction-panel').count() >= 1, 'today displays direction and current aspiration steps')
    check(page.locator('#goals-list .goal-item').count() in (1, 2), 'small steps follow the selected aspirations')

    # World data must affect actual destinations, not merely decorate the page.
    storm=directed_state(page,hour=18)
    storm['life']['world']['weather']='tormenta'
    storm['life']['world']['news']=[{'id':'cierre','startDay':storm['day'],'endDay':storm['day']+3}]
    import_save(page,storm)
    nav(page,'today')
    check('tormenta' in page.locator('.world-strip').inner_text().lower(),'world strip displays the active weather')
    check('azotea' in page.locator('.world-news').inner_text().lower(),'neighborhood news explains its temporary effect')
    nav(page,'map')
    before=state(page)
    page.locator('[data-travel="playa"]').click()
    check(state(page)==before,'weather closure prevents travel without consuming time or money')

    # Every system action is exercised through visible controls.
    seed = directed_state(page)
    seed['life']['employment'].update(jobId='nexo',status='unemployed')
    import_save(page, seed)
    nav(page, 'character')
    check(page.locator('#request-promotion').is_disabled(),
          'a previous job without an active contract cannot request promotion')
    check(page.locator('.finance-panel').count() == 1, 'character screen exposes the weekly balance')
    page.locator('#finance-amount').fill('50')
    before = state(page)
    action(page, 'depositSavings')
    after = state(page)
    check(after['life']['economy']['savings'] == before['life']['economy']['savings']+50
          and after['money'] == before['money']-50, 'deposit moves cash into savings')
    page.locator('#finance-amount').fill('20')
    action(page, 'withdrawSavings')
    check(state(page)['life']['economy']['savings'] == after['life']['economy']['savings']-20,
          'withdrawal recovers part of the savings')
    page.locator('#finance-amount').fill('30')
    action(page, 'borrowMoney')
    check(state(page)['life']['economy']['debt'] == 30, 'credit has a real recorded balance')
    page.locator('#finance-amount').fill('10')
    action(page, 'repayDebt')
    check(state(page)['life']['economy']['debt'] == 20, 'repayment reduces outstanding credit')

    before = state(page)
    action(page, 'practiceSkill', 'creatividad')
    after = state(page)
    check(after['life']['skills']['creatividad']['xp'] > before['life']['skills']['creatividad']['xp']
          and after['hour'] > before['hour'], 'practicing a skill costs time and develops ability')
    check(page.locator('.skill-card').count() == 6, 'six skills display their current levels')

    before = state(page)
    action(page, 'moveHome', 'compartido')
    after = state(page)
    check(after['life']['home']['type'] == 'compartido' and after['money'] == before['money']-50,
          'choosing shared housing records a move and its cost')
    check(after['life']['home']['roommateId'], 'shared housing identifies a roommate')
    action(page, 'improveHome', 'lectura')
    check('lectura' in state(page)['life']['home']['upgrades'], 'home improvement persists')

    page.locator('#pet-name').fill('Miga')
    action(page, 'adoptPet', 'gato')
    check(state(page)['life']['pet']['name'] == 'Miga', 'pet adoption is explicit and named')
    before = state(page)
    action(page, 'carePet', 'play')
    check(state(page)['life']['pet']['care'] > before['life']['pet']['care'],
          'pet care changes the actual care state')

    # A separate valid state gives sufficient time to review work and legacy.
    seed = directed_state(page)
    import_save(page, seed)
    nav(page, 'character')
    action(page, 'changeJob', 'autonomo')
    check(state(page)['life']['employment']['jobId'] == 'autonomo', 'job choice records the new career')
    before = state(page)
    action(page, 'workShift')
    check(state(page)['money'] > before['money'] and state(page)['life']['employment']['lastWorkedDay'] == before['day'],
          'working the chosen shift pays and records performance')

    settings(page)
    difficulty = page.locator('#difficulty-select, #settings-difficulty, [name="difficulty"]').first
    difficulty.select_option('tranquila')
    check(state(page)['direction']['settings']['difficulty'] == 'tranquila', 'difficulty can change in settings')
    if page.locator('#tutorial-restart').count():
        page.locator('#tutorial-restart').click()
    else:
        page.locator('[data-tutorial="restart"]').click()
    close_dialog(page)
    nav(page, 'today')
    check(state(page)['direction']['tutorial']['enabled'], 'introduction can be replayed')
    if page.locator('#tutorial-skip').count():
        page.locator('#tutorial-skip').click()
    else:
        page.locator('[data-tutorial="skip"]').click()
    check(not state(page)['direction']['tutorial']['enabled'], 'introduction can be skipped')

    nav(page, 'journal')
    check(page.locator('[data-memory-index]').count() >= 1, 'journal offers real entries to mark as memories')
    page.locator('[data-memory-index]').first.click()
    check(len(state(page)['direction']['memories']) >= 1 and page.locator('.memory-card').count() >= 1,
          'marked memory appears in the consultable timeline')

    seed = directed_state(page, day=90)
    seed['direction']['progress'][seed['aspirations'][0]]['stage'] = 1
    import_save(page, seed)
    nav(page, 'journal')
    check(page.locator('#legacy-review').count() == 1, 'reachable legacy milestone offers a review')
    page.locator('#legacy-review').click()
    check(state(page)['direction']['legacy']['reached'] and len(state(page)['direction']['legacy']['text']) > 50,
          'explicit legacy review saves a life summary')
    close_dialog(page)
    check(page.locator('main h1').count() == 1, 'player can continue after the legacy milestone')

    # Closing a day generates the data displayed in the custom SVG trend charts.
    nav(page, 'today')
    before_rest=state(page)
    page.locator('#sleep-button').click()
    page.locator('#confirm-sleep').click()
    check(state(page)['money']==before_rest['money'] and state(page)['life']['economy']['debt']==before_rest['life']['economy']['debt'], 'calm difficulty removes recurring economic pressure and interest')
    check(page.locator('#day-summary [data-close]').count()==1,'completed day offers its final saved summary')
    page.locator('#day-summary [data-close]').click()
    nav(page, 'character')
    check(page.locator('svg.trend-svg').count() >= 1, 'character screen draws its own SVG trends')
    nav(page, 'journal')
    check(page.locator('svg.trend-svg').count() >= 1, 'journal also displays historical trends')

    settings(page)
    check(not page.locator('#sound-toggle').is_checked(), 'sound control initially remains disabled')
    page.locator('#sound-volume').evaluate("el=>{el.value='0.2';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}")
    check(abs(state(page)['direction']['settings']['volume']-.2) < .001, 'volume preference is stored')
    close_dialog(page)
    page.reload()
    page.locator('main h1').wait_for()
    check(state(page)['direction']['legacy']['reached'] and state(page)['life']['pet']['name'] == 'Miga',
          'legacy and new systems survive reload together')
    page.screenshot(path=str(ARTIFACTS / 'journal.png'), full_page=True)

    # Later life changes overnight recovery, while each confirmed activity
    # keeps the resource cost that the player was shown before choosing it.
    elder = directed_state(page)
    elder['profile']['age'] = 70
    import_save(page, elder)
    nav(page, 'character')
    check('Vejez' in page.locator('.life-stage-chip').inner_text(),
          'older characters expose their current life stage')
    nav(page, 'map')
    page.locator('[data-wait-place="discoteca"]').click()
    wait_copy=page.locator('#game-dialog .confirm-copy').inner_text()
    wait_energy=int(re.search(r'emplearás (\d+) de energía',wait_copy).group(1))
    before_wait=state(page)
    page.locator('#confirm-wait-opening').click()
    check(before_wait['stats']['energy']-state(page)['stats']['energy']==wait_energy,
          'older characters consume the exact energy quoted before waiting')
    context.close()


def mobile_game(browser, url):
    context = browser.new_context(viewport={'width': 360, 'height': 800}, is_mobile=True, has_touch=True,
                                  reduced_motion='reduce')
    page = context.new_page()
    observe(page)
    page.goto(url)
    prepare_full_ui(page)
    page.locator('main h1').wait_for()
    for view in ['today', 'character', 'journal', 'map', 'people', 'family']:
        nav(page, view)
        check(not page.evaluate('document.documentElement.scrollWidth > innerWidth + 1'),
              'no horizontal overflow at 360 px in '+view)
    nav(page, 'character')
    page.locator('[data-open="creator"]').first.click()
    check(not page.evaluate('document.documentElement.scrollWidth > innerWidth + 1'),
          'extended creator fits the mobile viewport')
    page.keyboard.press('Escape')
    check(not page.locator('#game-dialog').evaluate('(d)=>d.open'), 'Escape closes the extended creator')
    page.screenshot(path=str(ARTIFACTS / 'mobile-character.png'), full_page=True)
    settings(page)
    page.locator('#sound-toggle').click()
    check(not page.locator('#sound-toggle').is_checked()
          and not state(page)['direction']['settings']['audioEnabled'],
          'reduced-motion preference keeps both sound checkbox and saved setting off')
    check('movimiento reducido' in page.locator('.sound-status').inner_text(),
          'sound control explains why reduced-motion preference keeps ambience off')
    context.close()


def main():
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    url = f'http://127.0.0.1:{server.server_port}'
    chromium = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=chromium, headless=True, args=['--no-sandbox'])
            try:
                full_game(browser, url)
                mobile_game(browser, url)
                check(not ERRORS, 'V3 workflows complete without JavaScript errors')
                check(not EXTERNAL, 'V3 requests no external services or assets')
                print(json.dumps({'passed': len(RESULTS), 'errors': ERRORS, 'artifacts': str(ARTIFACTS)}, ensure_ascii=False))
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
