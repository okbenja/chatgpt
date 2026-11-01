"""Preparación reproducible de Chromium en CI, con diagnóstico visible si falla."""
import subprocess,sys
commands=[
 [sys.executable,'-m','pip','install','playwright==1.56.0'],
 [sys.executable,'-m','playwright','install','--with-deps','chromium']
]
for command in commands:
    result=subprocess.run(command,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
    print(result.stdout,flush=True)
    if result.returncode:
        tail=result.stdout[-2400:].replace('%','%25').replace('\r','%0D').replace('\n','%0A')
        print('::error title=Preparación del navegador::'+tail,flush=True)
        raise SystemExit(result.returncode)
