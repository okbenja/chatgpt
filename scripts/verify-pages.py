"""Verificación HTTP posterior a publicar; no presupone que Pages esté activo."""
from argparse import ArgumentParser
from pathlib import Path
from datetime import datetime, timezone
from urllib.request import Request,urlopen
import hashlib,json,time
ROOT=Path(__file__).resolve().parents[1]
def verify(url,commit,output):
    if not url.endswith('/'):url+='/'
    assets=['index.html','data.js','systems.js','engine.js','narrative.js','app.js','styles.css','favicon.svg']
    last=None
    for attempt in range(6):
        try:
            evidence={}
            for asset in assets:
                req=Request(url+asset,headers={'Cache-Control':'no-cache','User-Agent':'Vinculos-release-check'})
                with urlopen(req,timeout=25) as response:
                    body=response.read()
                    assert response.status==200
                expected=hashlib.sha256((ROOT/asset).read_bytes()).hexdigest()
                actual=hashlib.sha256(body).hexdigest()
                assert actual==expected,asset+' no coincide con el código publicado'
                evidence[asset]={'status':200,'sha256':actual}
            result={'url':url,'sourceCommit':commit,'verifiedAt':datetime.now(timezone.utc).isoformat(),'assets':evidence}
            output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
            print(json.dumps(result,ensure_ascii=False));return
        except Exception as error:
            last=error
            if attempt<5:time.sleep(10)
    raise RuntimeError('Pages no pasó la comprobación HTTP: '+str(last))
if __name__=='__main__':
    p=ArgumentParser(description=__doc__);p.add_argument('--url',required=True);p.add_argument('--commit',required=True);p.add_argument('--output',type=Path,default=Path('/tmp/vinculos-pages.json'));args=p.parse_args();verify(args.url,args.commit,args.output)
