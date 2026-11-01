from pathlib import Path
import sys,json,shutil
ROOT=Path(__file__).resolve().parents[1]
from v3_browser import prepare_full_ui,nav,settings,close_dialog
from playwright.sync_api import sync_playwright
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from functools import partial
class Q(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
js=r'''()=>{const parse=c=>{const a=c.match(/[\d.]+/g)?.map(Number)||[0,0,0,0];return [a[0],a[1],a[2],a[3]??1];};const mix=(a,b)=>[...a.slice(0,3).map((x,i)=>x*a[3]+b[i]*(1-a[3])),1];const lum=c=>c.slice(0,3).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((s,x,i)=>s+x*[.2126,.7152,.0722][i],0);const out=[];for(const e of document.querySelectorAll('body *')){if(!e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})||e.closest('svg,[aria-hidden=true],button:disabled')||!Array.from(e.childNodes).some(n=>n.nodeType===3&&n.textContent.trim()))continue;const s=getComputedStyle(e);let a=[],p=e;while(p){a.push(parse(getComputedStyle(p).backgroundColor));p=p.parentElement;}let bg=[255,255,255,1];for(const x of a.reverse())bg=mix(x,bg);const fg=mix(parse(s.color),bg),ls=[lum(fg),lum(bg)].sort((a,b)=>a-b),ratio=(ls[1]+.05)/(ls[0]+.05),target=parseFloat(s.fontSize)>=24||(parseFloat(s.fontSize)>=18.66&&parseInt(s.fontWeight)>=700)?3:4.5;if(ratio+.01<target)out.push({tag:e.tagName,cls:e.className,text:e.textContent.trim().slice(0,60),color:s.color,bg,ratio:+ratio.toFixed(2),target});}return out;}'''
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Q,directory=str(ROOT)));Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox']);page=b.new_page(viewport={'width':1440,'height':1000});page.goto(f'http://127.0.0.1:{server.server_port}/');prepare_full_ui(page);rows=[]
  for v in ['today','map','people','family','character','journal']:
   nav(page,v);page.wait_for_timeout(250);rows += [{**x,'view':v} for x in page.evaluate(js)]
  settings(page);page.wait_for_timeout(250);rows+=page.evaluate(js);close_dialog(page)
  page.locator('#edit-profile:visible').click();page.wait_for_timeout(250);rows+=page.evaluate(js);close_dialog(page)
  nav(page,'today');page.locator('[data-npc="madre"]').first.click();page.wait_for_timeout(250);rows+=page.evaluate(js);close_dialog(page)
  assert not rows,json.dumps(rows,ensure_ascii=False)
  raw=Path('/tmp/v4-ten-year-save.json').read_text()
  timing=page.evaluate("""raw=>{const times=[];for(let i=0;i<12;i++){const t=performance.now(),g=new LifeGame({getItem:()=>raw,setItem:()=>{}});if(!g.load())throw Error(g.loadError);times.push(performance.now()-t);}return {meanMs:times.reduce((a,b)=>a+b)/times.length,maxMs:Math.max(...times),samples:times.length};}""",raw)
  assert timing['meanMs']<300,timing
  Path('/tmp/vinculos-v4-browser-performance.json').write_text(json.dumps(timing,indent=2))
  print(json.dumps({'passed':10,'errors':[],'contrastAA':True,'load':timing}));b.close()
finally:server.shutdown()
