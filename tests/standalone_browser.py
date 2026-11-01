"""El HTML de Releases debe funcionar offline y ejecutar app.js después del DOM."""
from pathlib import Path
import json,shutil,subprocess,tempfile
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
def run():
    output=Path(tempfile.mkdtemp(prefix='vinculos-v4-release-test-'))
    subprocess.run(['python',str(ROOT/'scripts/build-release.py'),'--output',str(output)],check=True,cwd=ROOT)
    errors=[];external=[]
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=shutil.which('chromium'),headless=True,args=['--no-sandbox'])
        context=browser.new_context(offline=True,viewport={'width':390,'height':844})
        page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('request',lambda r:external.append(r.url) if r.url.startswith(('http:','https:')) else None)
        # Managed Chromium forbids file://. Render the complete offline document
        # without a server or an origin; storage failure must remain recoverable.
        page.set_content((output/'Vinculos-V4.html').read_text(),wait_until='load')
        assert page.locator('[data-start-preset]').count()==3,'standalone starts with the actual game'
        page.locator('[data-start-preset="trabajador"]').click()
        assert page.locator('[data-first-choice]').count()==2
        before=page.locator('#money-amount').inner_text()
        page.locator('[data-first-choice="encargo"]').click()
        assert page.locator('#money-amount').inner_text()!=before
        assert page.locator('[data-first-choice]').count()==0
        assert page.locator('script[src]').count()==0
        assert page.locator('link[rel="stylesheet"]').count()==0
        assert not errors,errors
        assert not external,external
        page.screenshot(path=str(output/'offline.png'),full_page=True)
        print(json.dumps({'passed':8,'offline':True,'errors':errors,'external':external,'artifacts':str(output)}))
        browser.close()
if __name__=='__main__':run()
