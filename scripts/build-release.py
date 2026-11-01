"""Genera entregables desde las fuentes canónicas, sin duplicarlos en Git."""
from pathlib import Path
from argparse import ArgumentParser
import base64, re, zipfile, hashlib, json
ROOT=Path(__file__).resolve().parents[1]
def build(output):
    output.mkdir(parents=True,exist_ok=True)
    html=(ROOT/'index.html').read_text()
    html,count=re.subn(r'<link\b[^>]*href="styles.css"[^>]*>',lambda _: '<style>\n'+(ROOT/'styles.css').read_text()+'\n</style>',html)
    assert count==1,'Falta la hoja de estilos canónica'
    scripts=re.findall(r'<script\b[^>]*src="([^"]+)"[^>]*>\s*</script>',html)
    assert scripts==['data.js','systems.js','engine.js','narrative.js','app.js'],'Revisar el orden de los módulos'
    html=re.sub(r'<script\b[^>]*src="[^"]+"[^>]*>\s*</script>','',html)
    inline='\n'.join('<script>\n'+re.sub(r'</script',r'<\\/script',(ROOT/name).read_text(),flags=re.I)+'\n</script>' for name in scripts)
    # Inline scripts cannot use defer: execute after the interface exists.
    html=html.replace('</body>',inline+'\n</body>')
    icon=base64.b64encode((ROOT/'favicon.svg').read_bytes()).decode()
    html=html.replace('href="favicon.svg"','href="data:image/svg+xml;base64,'+icon+'"')
    standalone=output/'Vinculos-V4.html';standalone.write_text(html)
    public=['index.html','styles.css','data.js','systems.js','engine.js','narrative.js','app.js','favicon.svg']
    public_dir=output/'site';public_dir.mkdir(exist_ok=True)
    for name in public:(public_dir/name).write_bytes((ROOT/name).read_bytes())
    (public_dir/'.nojekyll').write_text('')
    source=public+['server.js','package.json','README.md','README_DEV.md','CHANGELOG.md','RELEASE_NOTES.md','PHASES_V4.md','BALANCE_V4_REPORT.md','QUALITY_V4_REPORT.md']
    source.extend(str(p.relative_to(ROOT)) for folder in ['tests','scripts','reports','.github'] for p in (ROOT/folder).rglob('*') if p.is_file() and '__pycache__' not in p.parts)
    with zipfile.ZipFile(output/'Vinculos-V4.zip','w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
        for name in sorted(set(source)):
            if (ROOT/name).is_file():z.write(ROOT/name,Path('vinculos-v4')/name)
    with zipfile.ZipFile(output/'Vinculos-V4.zip') as z:assert z.testzip() is None
    manifest={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in output.iterdir() if p.is_file() and p.suffix in ['.html','.zip']}
    (output/'SHA256.json').write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps({'output':str(output),'sha256':manifest}))
if __name__=='__main__':
    parser=ArgumentParser(description=__doc__);parser.add_argument('--output',type=Path,default=Path('/tmp/vinculos-v4-release'));build(parser.parse_args().output)
