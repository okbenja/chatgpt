"""Browser checks for Vínculos; run ``python tests/browser_smoke.py``.

Use ``--phase1`` while developing the technical foundation. Requires Python
Playwright and Chromium, but neither is a dependency of the game. All traffic
stays on a temporary local HTTP server; screenshots and saves go to /tmp.
"""
from argparse import ArgumentParser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import urlparse
import json
import re
import os
import shutil
import tempfile

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = Path(tempfile.mkdtemp(prefix='vinculos-browser-'))
ROUTES = [('today', 'hoy'), ('map', 'explorar'), ('people', 'relaciones'),
          ('family', 'familia'), ('character', 'personaje'), ('journal', 'diario')]
SAVE_KEY = 'vinculos-save-v1'
RESULTS = []
ERRORS = []
EXTERNAL_REQUESTS = []


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def check(condition, label):
    assert condition, label
    RESULTS.append(label)
    print('PASS', label, flush=True)


def state(page):
    return page.evaluate('(key) => JSON.parse(localStorage.getItem(key))', SAVE_KEY)


def nav(page, view):
    page.locator(f'[data-view="{view}"]:visible').first.click()
    page.wait_for_timeout(35)


def open_settings(page):
    page.locator('#settings-button:visible, #settings-top-button:visible').first.click()
    page.locator('#game-dialog[open]').wait_for()


def dismiss_initial_notice(page):
    notice = page.locator('[data-dismiss-storage], #dismiss-first-save')
    if notice.count() and notice.is_visible():
        notice.click()


def attach_observers(page):
    page.on('pageerror', lambda error: ERRORS.append(str(error)))
    page.on('request', lambda request: EXTERNAL_REQUESTS.append(request.url)
            if urlparse(request.url).scheme in ('http', 'https')
            and urlparse(request.url).hostname not in ('127.0.0.1', 'localhost') else None)


def phase1(browser, url):
    context = browser.new_context(viewport={'width': 1440, 'height': 1080}, accept_downloads=True)
    page = context.new_page()
    attach_observers(page)
    page.goto(url)
    page.locator('.hero-card').wait_for()
    dismiss_initial_notice(page)
    check(page.title().startswith('Vínculos'), 'application starts')
    check(not ERRORS, 'startup has no JavaScript errors')
    check(page.url.endswith('#/hoy'), 'default hash points to today')
    check(page.locator('.brand').get_attribute('href') == '#/hoy', 'logo has valid hash route')
    for view, route in ROUTES:
        nav(page, view)
        check(page.url.endswith('#/' + route), 'hash route ' + route)
        active = page.locator('[data-view][aria-current="page"]:visible')
        check(active.count() == 1 and active.first.get_attribute('data-view') == view,
              'active navigation is announced for ' + route)
        check(page.locator('main h1').count() == 1, 'view renders ' + route)
    nav(page, 'family')
    nav(page, 'journal')
    page.go_back()
    check(page.url.endswith('#/familia') and 'familia' in page.locator('main h1').inner_text().lower(),
          'Back restores previous view')
    page.go_forward()
    check(page.url.endswith('#/diario') and 'diario' in page.locator('main h1').inner_text().lower(),
          'Forward restores next view')
    page.reload()
    page.locator('main h1').wait_for()
    check(page.url.endswith('#/diario') and 'diario' in page.locator('main h1').inner_text().lower(),
          'reload preserves hash view')
    page.locator('a.brand').click()
    check(page.url.endswith('#/hoy') and page.locator('.hero-card').count() == 1, 'logo opens today')
    check(page.locator('svg.icon:not([aria-hidden="true"])').count() == 0,
          'decorative icons hidden from assistive technology')
    meters = page.locator('[role="meter"]')
    check(meters.count() >= 4, 'statistics use accessible meters')
    check(meters.evaluate_all('els => els.every(el => el.getAttribute("aria-valuemin")==="0" && el.getAttribute("aria-valuemax")==="100" && Number(el.getAttribute("aria-valuenow")) >= 0 && Number(el.getAttribute("aria-valuenow")) <= 100)'),
          'meters expose numeric bounds and values')
    check(all(str(round(v)) in page.locator('#stat-bars').inner_text()
              for k, v in state(page)['stats'].items() if k in ('energy', 'mood', 'social', 'stress')),
          'statistic numbers are visible as text')
    skip = page.get_by_role('link', name='Saltar al contenido', exact=False)
    check(skip.count() == 1, 'skip-to-content link exists')
    skip.focus()
    skip.press('Enter')
    check(page.locator('main').evaluate('(el) => el === document.activeElement'), 'skip link focuses content')
    open_settings(page)
    check(page.locator('#game-dialog').evaluate('(el) => el.contains(document.activeElement)'),
          'dialog receives initial focus')
    page.keyboard.press('Escape')
    check(not page.locator('#game-dialog').evaluate('(el) => el.open'), 'Escape closes dialog')
    check(page.locator('#settings-button').evaluate('(el) => el === document.activeElement'),
          'dialog restores focus to its trigger')
    check(page.locator('.sidebar #cheats-button').count() == 0,
          'cheats removed from primary navigation')
    open_settings(page)
    page.locator('#game-dialog #cheats-button, #game-dialog [data-open="cheats"]').first.click()
    check(page.locator('[data-cheat="money"]').is_disabled(), 'cheats initially disabled')
    page.locator('#cheat-toggle').click()
    check(not state(page)['flags']['cheats'] and page.locator('#confirm-cheats').count() == 1,
          'enabling cheats requires confirmation')
    page.keyboard.press('Escape')
    check(not state(page)['flags']['cheats'], 'canceling cheat confirmation preserves normal game')
    open_settings(page)
    page.locator('#game-dialog #cheats-button, #game-dialog [data-open="cheats"]').first.click()
    page.locator('#cheat-toggle').click()
    page.locator('#confirm-cheats').click()
    before = state(page)
    page.locator('[data-cheat="money"]').click()
    after = state(page)
    check(after['money'] == before['money'] + 500, 'confirmed money cheat works')
    check(after['flags']['cheats'] and after['flags']['cheatsUsed'], 'cheated save is permanently marked')
    page.locator('#close-dialog').click()
    check(page.locator('#cheat-indicator').is_visible(), 'active cheats indicator visible')
    page.screenshot(path=str(ARTIFACTS / 'desktop.png'), full_page=True)
    context.close()

    for width in (360, 900):
        mobile = browser.new_context(viewport={'width': width, 'height': 844}, is_mobile=True, has_touch=True)
        mp = mobile.new_page()
        attach_observers(mp)
        mp.goto(url)
        mp.locator('.hero-card').wait_for()
        dismiss_initial_notice(mp)
        panel = mp.locator('details#status-panel')
        check(panel.count() == 1 and not panel.evaluate('(el) => el.open'),
              f'status panel initially collapsed at {width}px')
        for view, route in ROUTES:
            nav(mp, view)
            check(not mp.evaluate('document.documentElement.scrollWidth > innerWidth + 1'),
                  f'no horizontal overflow at {width}px on {route}')
        tabs = mp.locator('[data-view]:visible')
        check(tabs.count() == 6, f'six visible mobile tabs at {width}px')
        boxes = [tabs.nth(i).bounding_box() for i in range(tabs.count())]
        check(all(b and b['width'] >= 44 and b['height'] >= 44 for b in boxes),
              f'mobile tab touch areas meet 44px at {width}px')
        check(all(b['y'] >= 844 - 115 for b in boxes), f'mobile tabs sit at screen bottom at {width}px')
        panel.locator('summary').click()
        check(panel.evaluate('(el) => el.open') and mp.locator('#stat-bars').is_visible(),
              f'status disclosure reveals statistics at {width}px')
        panel.locator('summary').click()
        nav(mp, 'today')
        mp.locator('[data-open="creator"]').first.click()
        check(not mp.evaluate('document.documentElement.scrollWidth > innerWidth + 1'),
              f'character dialog fits {width}px')
        mp.keyboard.press('Escape')
        mp.screenshot(path=str(ARTIFACTS / f'mobile-{width}.png'), full_page=True)
        mobile.close()


def submit_import(page, payload, name='partida.json', confirm=True):
    if not page.locator('#import-file').count():
        open_settings(page)
    raw = payload if isinstance(payload, bytes) else json.dumps(payload).encode()
    page.locator('#import-file').set_input_files({'name': name, 'mimeType': 'application/json', 'buffer': raw})
    page.locator('#confirm-import').wait_for()
    if confirm:
        page.locator('#confirm-import').click()
        page.wait_for_timeout(50)


def settle_pending_event(page):
    """Resolve pending encounters through visible controls between regression steps."""
    for _ in range(4):
        current = state(page)
        if not current['narrative']['pending']:
            return
        if page.locator('#game-dialog[open]').count() and not page.locator('[data-event-option]').count():
            page.keyboard.press('Escape')
        if not page.locator('#game-dialog [data-event-option]').count():
            nav(page, 'today')
            page.locator('[data-event-open]').click()
        option = page.locator('#game-dialog [data-event-option]:not(:disabled)').first
        option.click()
        page.locator('#event-outcome').wait_for()
        page.locator('#event-outcome [data-close]').click()
    raise AssertionError('Too many consecutive encounters in smoke test')


def full_game(browser, url, through3=False):
    """Extended state, narrative, save and relationship UI checks (phases 2–7)."""
    fixture = json.loads((ROOT / 'tests/fixtures/save-v1.json').read_text())
    migration = browser.new_context(viewport={'width': 1440, 'height': 1080})
    migration.add_init_script('if (!localStorage.getItem(' + json.dumps(SAVE_KEY) + ')) localStorage.setItem('
                              + json.dumps(SAVE_KEY) + ', ' + json.dumps(json.dumps(fixture)) + ');')
    legacy = migration.new_page()
    attach_observers(legacy)
    legacy.goto(url)
    legacy.locator('.hero-card').wait_for()
    migrated = legacy.evaluate('(() => {const loaded = new window.LifeGame(); loaded.load(); return loaded.state;})()')
    check(migrated['version'] == 3, 'old saved game migrates to versioned current schema')
    check(migrated['profile'] == fixture['profile'] and migrated['money'] == fixture['money']
          and migrated['stats'] == fixture['stats'] and migrated['counters'] == fixture['counters'],
          'migration preserves character, money, statistics and progress')
    check(migrated['relationships']['madre']['friendship'] == fixture['relationships']['madre']['friendship']
          and migrated['relationships']['madre']['trust'] == fixture['relationships']['madre']['trust'],
          'migration preserves established family affection and trust')
    check('narrative' in migrated and 'rngState' in migrated and 'dayStart' in migrated,
          'migration initializes narrative seed and day ledger')
    legacy.locator('[data-action="descanso"]').click()
    check(state(legacy)['version'] == 3, 'next action persists migrated save in current schema')
    migration.close()

    context = browser.new_context(viewport={'width': 1440, 'height': 1080}, accept_downloads=True)
    page = context.new_page()
    attach_observers(page)
    page.goto(url)
    page.locator('.hero-card').wait_for()
    check(page.locator('#first-save-notice').is_visible(), 'first visit explains local storage and export')
    dismiss_initial_notice(page)
    page.reload()
    page.locator('.hero-card').wait_for()
    check(page.locator('#first-save-notice').count() == 0, 'dismissed storage notice stays dismissed')
    check('hace un momento' in page.locator('#save-status').inner_text(), 'save status reflects a recent successful save')
    check('Mañana' in page.locator('#day-pill').inner_text() and 'Energía' in page.locator('#day-pill').inner_text(),
          'top bar displays day period and remaining energy')
    check('primavera' in page.locator('.calendar-strip').inner_text().lower()
          and page.locator('.special-date').count() >= 1, 'calendar displays season and special date')
    page.locator('[data-open="creator"]').first.click()
    page.locator('[name="name"]').fill('Camila')
    page.locator('[name="lastName"]').fill('Prueba')
    page.locator('[name="age"]').fill('24')
    page.locator('[name="hairStyle"]').select_option('long')
    page.locator('[data-color-field="outfit"]').nth(2).click()
    check(page.locator('[name="name"]').input_value() == 'Camila', 'appearance changes preserve character form values')
    page.locator('#creator-form button[type="submit"]').click()
    check(state(page)['profile']['name'] == 'Camila' and state(page)['profile']['hairStyle'] == 'long',
          'customized character persists')
    open_settings(page)
    with page.expect_download() as download_info:
        page.locator('#export-save').click()
    download_info.value.save_as(str(ARTIFACTS / 'exported.json'))
    exported = json.loads((ARTIFACTS / 'exported.json').read_text())
    check(exported['profile']['name'] == 'Camila' and exported['version'] == 3, 'export downloads current versioned JSON')
    before = state(page)
    page.locator('#import-file').set_input_files({'name': 'invalid.json', 'mimeType': 'application/json', 'buffer': b'{"version":1}'})
    page.wait_for_timeout(80)
    check(state(page) == before and page.locator('#confirm-import').count() == 0,
          'invalid import leaves existing game untouched')
    submit_import(page, exported, confirm=False)
    check(state(page) == before, 'valid import waits for overwrite confirmation')
    page.locator('[data-open="settings"]').click()
    check(state(page) == before, 'canceling import keeps existing game')
    submit_import(page, exported)
    check(state(page)['profile']['name'] == 'Camila' and not page.locator('#game-dialog').evaluate('(el) => el.open'),
          'confirmed import restores the chosen game')

    # Import a reproducible clean morning; player actions below use the public UI.
    seed = state(page)
    seed['rngState'] = 2026
    seed['narrative']['pending'] = None
    submit_import(page, seed)
    nav(page, 'family')
    check(page.locator('.person-card').count() == 13, 'thirteen family members remain interactive')
    page.locator('[data-npc="madre"]').click()
    check(page.locator('[data-interact="flirt"]').count() == 0
          and page.locator('[data-interact="askDate"]').count() == 0, 'family offers no romance actions')
    before = state(page)
    page.locator('[data-interact="chat"]').click()
    after = state(page)
    check(after['hour'] > before['hour'] and after['counters']['social'] > before['counters']['social'],
          'family conversation advances time and meaningful social progress')
    check(after['personality']['sociability'] > before['personality']['sociability'],
          'conversation evolves the player personality')
    check(after['relationships']['madre']['sharedHistory'] and page.locator('.person-history').count() == 1,
          'person card displays needs and recent shared history')
    before = state(page)
    page.locator('[data-interact="boundary"]').click()
    after = state(page)
    check(after['relationships']['madre']['trust'] > before['relationships']['madre']['trust']
          and after['stats']['stress'] < before['stats']['stress']
          and after['relationships']['madre']['romance'] == 0, 'family boundary improves trust and reduces stress safely')
    page.locator('#close-dialog').click()
    settle_pending_event(page)
    nav(page, 'today')
    before = state(page)
    page.locator('[data-action="estudiar_casa"]').click()
    check(state(page)['stats']['knowledge'] > before['stats']['knowledge'], 'study improves knowledge')
    settle_pending_event(page)
    page.locator('[data-action="comer_casa"]').click()
    settle_pending_event(page)
    page.locator('#sleep-button').click()
    check(page.locator('#day-summary').count() == 1 and page.locator('.summary-stat').count() == 8,
          'end-day dialog summarizes all eight statistic changes')
    check('Ingresos' in page.locator('#day-summary').inner_text()
          and 'Gastos' in page.locator('#day-summary').inner_text()
          and page.locator('.summary-actions li').count() >= 2
          and page.locator('.summary-relations li').count() >= 1,
          'day summary includes economy, completed activities and relationships')
    old_day = state(page)['day']
    page.locator('#confirm-sleep').click()
    check(state(page)['day'] == old_day + 1 and state(page)['hour'] == 9,
          'confirmed rest begins next morning')
    check(len(state(page)['summaries']) >= 1 and any(e['kind'] == 'summary' for e in state(page)['journal']),
          'completed day is saved in summaries and narrative journal')
    check(page.locator('#day-summary [data-close]').count()==1, 'rest exposes the final persisted day summary before continuing')
    expense_text=page.locator('#day-summary .summary-economy > span').nth(1).inner_text()
    expense_value=float(re.findall(r'[0-9][0-9.,]*',expense_text)[0].replace('.','').replace(',','.'))
    check(expense_value==round(state(page)['summaries'][-1]['spent']), 'final summary expenses match the saved ledger after rest')
    page.locator('#day-summary [data-close]').click()
    settle_pending_event(page)
    nav(page, 'journal')
    check(page.locator('.annual-summary').count() == 1, 'journal includes annual prose summary')
    page.locator('#journal-person').select_option('madre')
    check(page.locator('.journal-entry').count() >= 1
          and all('Clara' in text for text in page.locator('.journal-entry').all_inner_texts()),
          'journal person filter returns shared memories')
    page.locator('#journal-person').select_option('')
    page.locator('#journal-tag').select_option('summary')
    check(page.locator('.journal-entry').count() >= 1, 'journal topic filter can show day summaries')
    page.locator('#journal-tag').select_option('')

    if through3:
        seed = state(page)
        seed.update(hour=22, location='casa')
        seed['narrative']['pending'] = None
        seed['daily'] = {'interactions': {}, 'actions': {}, 'gifts': {}, 'workHours': 0}
        submit_import(page, seed)
        nav(page, 'today')
        before_day = state(page)['day']
        page.locator('[data-action="descanso"]').click()
        check(page.locator('#day-summary').count() == 1 and state(page)['day'] == before_day + 1,
              'reaching end of day automatically rests and presents the saved summary')
        page.locator('#day-summary [data-close]').click()
        seed = state(page)
        seed.update(day=91, hour=9)
        seed['narrative']['pending'] = None
        submit_import(page, seed)
        nav(page, 'today')
        check('verano' in page.locator('.calendar-strip').inner_text().lower(), 'season changes with the calendar')
        context.close()
        storage_failure(browser, url)
        return

    # Unanswered messages are a real menu count, and replying changes the bond.
    seed = state(page)
    seed['narrative']['pending'] = None
    seed['messages'] = [{'id': 'ui-message', 'npcId': 'madre', 'text': '¿Compartimos una merienda?',
                         'day': seed['day'], 'answered': False}]
    submit_import(page, seed)
    nav(page, 'people')
    check(page.locator('#relations-count').inner_text() == '1'
          and page.locator('[data-message-reply="ui-message"]').count() == 3,
          'relationship menu counts messages awaiting a response')
    before = state(page)
    page.locator('[data-message-reply="ui-message"][data-reply="warm"]').click()
    check(state(page)['messages'][0]['answered'] and page.locator('#relations-count').inner_text() == '0'
          and state(page)['relationships']['madre']['trust'] > before['relationships']['madre']['trust'],
          'reply consumes the pending message and strengthens trust')
    settle_pending_event(page)

    # A clean, progressed friendship isolates explicit romantic decisions.
    seed = state(page)
    seed.update(day=3, hour=9, location='cafeteria')
    seed['stats'].update(energy=100, stress=35)
    seed['daily'] = {'interactions': {}, 'actions': {}, 'gifts': {}, 'workHours': 0}
    seed['narrative']['pending'] = None
    seed['relationships']['mateo'].update(friendship=55, trust=60, romance=15, status='friend', dates=0, boundary=False)
    submit_import(page, seed)
    nav(page, 'today')
    page.locator('[data-npc="mateo"]').click()
    page.locator('[data-interact="flirt"]').click()
    check(state(page)['relationships']['mateo']['romance'] > 15, 'mutual flirting develops romantic interest')
    check(page.locator('.dialogue-bubble').evaluate('(el) => el === document.activeElement'), 'NPC response receives keyboard focus')
    page.locator('[data-interact="askDate"]').click()
    check(state(page)['relationships']['mateo']['status'] == 'dating', 'explicit invitation agrees a date')
    before = state(page)
    page.locator('[data-interact="date"]').click()
    check(state(page)['relationships']['mateo']['dates'] == 1 and state(page)['money'] == before['money'] - 10,
          'first cafe date consumes its stated budget')
    check('pendiente' not in page.locator('.npc-heading .soft-badge').inner_text().lower(), 'completed date is no longer pending')
    page.locator('#close-dialog').click()
    settle_pending_event(page)
    nav(page, 'map')
    page.locator('[data-travel="plaza"]').click()
    settle_pending_event(page)
    nav(page, 'today')
    page.locator('[data-npc="mateo"]').click()
    page.locator('[data-interact="date"]').click()
    check(state(page)['relationships']['mateo']['dates'] == 2
          and state(page)['relationships']['mateo']['status'] == 'dating', 'second park date does not automatically create a partnership')
    page.locator('[data-interact="relationship"]').click()
    check(state(page)['relationships']['mateo']['status'] == 'partner', 'explicit conversation creates partnership')
    before = state(page)
    page.locator('[data-interact="date"]').click()
    check(state(page)['relationships']['mateo']['dates'] == 3 and state(page)['money'] == before['money'] - 10,
          'partners can continue to arrange dates')
    page.locator('[data-interact="breakup"]').click()
    check(page.locator('[data-confirm-breakup="mateo"]').count() == 1
          and state(page)['relationships']['mateo']['status'] == 'partner', 'ending a partnership requires confirmation')
    page.locator('[data-confirm-breakup="mateo"]').click()
    check(state(page)['relationships']['mateo']['romance'] == 0
          and state(page)['relationships']['mateo']['status'] in ('friend', 'acquaintance'), 'confirmed breakup clears romance')
    page.locator('#close-dialog').click()
    settle_pending_event(page)

    # Force representative mandatory and optional stories only through the cheat UI.
    open_settings(page)
    page.locator('#cheats-button').click()
    page.locator('#cheat-toggle').click()
    page.locator('#confirm-cheats').click()
    stories = page.evaluate('window.VINCULOS_DATA.events.map(e => ({id:e.id, mandatory:!!e.mandatory}))')
    check(len(stories) >= 60, 'narrative catalog contains at least sixty base events')
    check(page.locator('.debug-table > div').count() >= 60, 'debugger exposes selector eligibility and weights')
    before = state(page)
    page.locator('#debug-days').fill('7')
    page.locator('#debug-simulate').click()
    page.wait_for_function('!!document.querySelector("#debug-report").dataset.report')
    report = json.loads(page.locator('#debug-report').get_attribute('data-report'))
    check(report['completedDays'] == 7 and 'distribution' in report and 'repetitions' in report,
          'debug simulation reports distribution and repetitions for requested days')
    check(state(page) == before, 'debug simulation preserves the active story')
    mandatory = next(e['id'] for e in stories if e['mandatory'])
    page.locator('#debug-event').select_option(mandatory)
    page.locator('#debug-force').click()
    check(page.locator('#game-dialog [data-event-option]').count() >= 2
          and page.locator('#game-dialog [data-event-dismiss]').count() == 0,
          'mandatory story presents meaningful choices and cannot be dismissed')
    event_before = state(page)
    page.locator('#game-dialog [data-event-option]:not(:disabled)').first.click()
    page.locator('#event-outcome').wait_for()
    check(state(page)['narrative']['pending'] is None
          and len(state(page)['narrative']['history']) > len(event_before['narrative']['history']),
          'story choice resolves an outcome and records narrative history')
    check(len(page.locator('#event-outcome .event-result').inner_text().strip()) > 10,
          'event outcome displays its own narrative consequence')
    page.locator('#event-outcome [data-close]').click()
    open_settings(page)
    page.locator('#cheats-button').click()
    optional = next(e['id'] for e in stories if not e['mandatory'])
    page.locator('#debug-event').select_option(optional)
    page.locator('#debug-force').click()
    before = state(page)
    page.locator('#game-dialog [data-event-dismiss]').click()
    check(state(page)['narrative']['pending'] is None and state(page)['hour'] > before['hour'],
          'optional encounter can be declined with a clear time cost')
    if page.locator('#game-dialog[open]').count():
        page.keyboard.press('Escape')
    achievements = list(state(page)['achievements'])
    nav(page, 'character')
    check('trucos' in page.locator('.achievement-list').inner_text().lower()
          and state(page)['flags']['cheatsUsed'], 'cheated game clearly disables new achievements')

    # The exhausted-clock transition automatically saves a summary and advances.
    seed = state(page)
    seed.update(hour=22, location='casa')
    seed['narrative']['pending'] = None
    seed['daily'] = {'interactions': {}, 'actions': {}, 'gifts': {}, 'workHours': 0}
    submit_import(page, seed)
    nav(page, 'today')
    before_day = state(page)['day']
    page.locator('[data-action="descanso"]').click()
    check(page.locator('#day-summary').count() == 1 and state(page)['day'] == before_day + 1,
          'reaching end of day automatically rests and presents the saved summary')
    check(state(page)['achievements'] == achievements, 'cheated actions do not unlock achievements')
    page.locator('#day-summary [data-close]').click()
    seed = state(page)
    seed.update(day=91, hour=9)
    seed['narrative']['pending'] = None
    submit_import(page, seed)
    nav(page, 'today')
    check('verano' in page.locator('.calendar-strip').inner_text().lower(), 'season changes with the calendar')

    # Expansion: career, explicit infidelity, additional kin and chosen parenthood.
    seed = state(page)
    seed.update(hour=9, location='trabajo')
    seed['profile']['path']='work'
    seed['career']={'level':0,'experience':36,'promotions':[],'lastRequestDay':0}
    seed['life']['employment'].update(jobId='nexo',status='employed',performance=75,lastWorkedDay=seed['day'])
    seed['life']['skills']['tecnologia'].update(xp=15,lastPracticeDay=seed['day'])
    seed['stats'].update(energy=100,knowledge=65,responsibility=70)
    seed['relationships']['jefa']['trust']=60
    seed['narrative']['pending']=None
    submit_import(page,seed)
    nav(page,'today')
    page.locator('#request-promotion').click()
    check(state(page)['career']['level']==1 and 'Nivel 2' in page.locator('.career-panel').inner_text(),'career review grants a real promotion through UI')
    settle_pending_event(page)
    nav(page,'character')
    check('94' in page.locator('.career-panel').inner_text(),'promotion displays the increased salary of the active Nexo job')

    seed=state(page)
    seed.update(hour=9,location='cafeteria')
    seed['stats']['energy']=100
    seed['daily']={'interactions':{},'actions':{},'gifts':{},'workHours':0}
    seed['narrative'].update(pending=None,queue=[])
    for r in seed['relationships'].values():
        if r['status']=='partner':r['status']='friend'
    seed['relationships']['valentina'].update(status='partner',friendship=85,trust=85,romance=70,dates=3)
    seed['relationships']['mateo'].update(status='friend',friendship=60,trust=60,romance=20,boundary=False)
    submit_import(page,seed)
    nav(page,'people')
    page.locator('[data-npc="mateo"]').click()
    before=state(page)
    page.locator('[data-interact="flirt"]').click()
    check(page.locator('#confirm-infidelity').count()==1 and state(page)==before,'infidelity is a distinct confirmed decision rather than an accidental flirt')
    page.locator('#confirm-infidelity').click()
    check(state(page)['narrative']['flags']['secret_affair'] and any(q['eventId']=='secreto_pesa' for q in state(page)['narrative']['queue']),'confirmed infidelity records a secret and schedules consequences')
    if page.locator('#game-dialog[open]').count():page.keyboard.press('Escape')
    settle_pending_event(page)

    seed=state(page)
    seed.update(hour=9,location='casa',money=600)
    seed['stats']['energy']=100
    seed['narrative'].update(pending=None,queue=[])
    seed['narrative']['flags'].update(secret_affair=False,affair_discovered=False)
    seed['relationships']['valentina']['status']='friend'
    seed['relationships']['mateo'].update(status='partner',trust=90,romance=75,dates=3)
    submit_import(page,seed)
    nav(page,'family')
    page.locator('#add-child').click()
    page.locator('#child-name').fill('Sol')
    page.locator('#confirm-child').click()
    check(len(state(page)['family']['children'])==1 and state(page)['family']['children'][0]['name']=='Sol','forming a family requires and records an explicit named decision')
    check(state(page)['money']==450 and state(page)['family']['expenses']==5,'parenthood has a real setup cost and ongoing care costs')
    check('Sol' in page.locator('.family-status').inner_text(),'new child appears in the family view with inherited traits')
    child=state(page)['family']['children'][0]['id']
    page.locator('[data-npc="'+child+'"]').click()
    check(page.locator('[data-interact="flirt"]').count()==0,'child family card never exposes romance')
    page.locator('[data-interact="shareMemory"]').click()
    check(state(page)['relationships'][child]['sharedHistory'],'new family member supports real shared interactions')
    if page.locator('#game-dialog[open]').count():page.keyboard.press('Escape')
    settle_pending_event(page)

    open_settings(page)
    page.locator('#reset-game').click()
    page.locator('#confirm-reset').click()
    page.wait_for_timeout(60)
    check(page.locator('#creator-form').count() == 1 and state(page)['day'] == 1, 'confirmed reset opens new character creator')
    page.locator('[name="name"]').fill('Nueva historia')
    page.locator('[data-color-field="hair"]').nth(3).click()
    page.locator('#creator-form button[type="submit"]').click()
    check(state(page)['profile']['name'] == 'Nueva historia', 'new creator stays usable after queued native dialog close')
    page.locator('[data-open="creator"]').first.click()
    page.keyboard.press('Escape')
    page.locator('[data-open="creator"]').first.click()
    page.locator('[data-color-field="outfit"]').nth(4).click()
    page.locator('#creator-form button[type="submit"]').click()
    check(state(page)['profile']['outfit'] == '#b69860', 'character creator reopens correctly after Escape')
    context.close()

    storage_failure(browser, url)


def storage_failure(browser, url):
    blocked = browser.new_context(viewport={'width': 1440, 'height': 1080})
    blocked.add_init_script("Storage.prototype.setItem = function(){throw new DOMException('Storage blocked', 'QuotaExceededError')}")
    bp = blocked.new_page()
    attach_observers(bp)
    bp.goto(url)
    bp.locator('.hero-card').wait_for()
    check('No se pudo guardar' in bp.locator('#save-status').inner_text(), 'blocked storage is reported accurately')
    old_clock = bp.locator('#day-pill').inner_text()
    bp.locator('[data-action="descanso"]').click()
    check(bp.locator('#day-pill').inner_text() != old_clock, 'game remains playable when local storage is unavailable')
    open_settings(bp)
    with bp.expect_download() as download_info:
        bp.locator('#export-save').click()
    check(download_info.value.suggested_filename.endswith('.json'), 'blocked-storage session can still export a backup')
    blocked.close()



def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument('--phase1', action='store_true', help='Only validate the technical foundation')
    parser.add_argument('--through3', action='store_true', help='Validate phases 1–3 while narrative work continues')
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    url = f'http://127.0.0.1:{server.server_port}'
    executable = os.environ.get('CHROMIUM_PATH') or shutil.which('chromium') or shutil.which('google-chrome')
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=executable, headless=True, args=['--no-sandbox'])
            try:
                phase1(browser, url)
                if not args.phase1:
                    full_game(browser, url, through3=args.through3)
                check(not ERRORS, 'no JavaScript errors across tested workflows')
                check(not EXTERNAL_REQUESTS, 'game makes no external network requests')
                print(json.dumps({'passed': len(RESULTS), 'errors': ERRORS,
                                  'artifacts': str(ARTIFACTS)}, ensure_ascii=False))
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()


if __name__ == '__main__':
    main()
