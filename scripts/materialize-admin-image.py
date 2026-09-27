#!/usr/bin/env python3
"""Fetch a validated Git blob and place it under public/ for the catalog commit."""
import base64
import hashlib
import json
import os
import re
import urllib.request
from pathlib import Path
from PIL import Image, UnidentifiedImageError
from io import BytesIO

payload=json.loads(Path('/tmp/admin-operation.json').read_text())
item=payload['item'];image=item.pop('image',None)
if not image: Path('/tmp/admin-operation.json').write_text(json.dumps(payload,ensure_ascii=False));raise SystemExit(0)
if set(image)!={'path','blobSha','alt','author','source','license'}: raise SystemExit('Metadatos de imagen inválidos')
path,sha=image['path'],image['blobSha']
kind={'activity':'activities','topic':'topics'}[payload['entity']]
if not re.fullmatch(rf'/images/admin/{kind}/[a-f0-9]{{32}}\.(png|jpg|webp)',path) or not re.fullmatch('[a-f0-9]{40}',sha): raise SystemExit('Imagen inválida')
for key in ('alt','author','source','license'):
 if not isinstance(image[key],str) or not image[key].strip() or len(image[key])>300: raise SystemExit('Faltan créditos de imagen')
url=f'https://api.github.com/repos/{os.environ["GITHUB_REPOSITORY"]}/git/blobs/{sha}'
request=urllib.request.Request(url,headers={'Authorization':'Bearer '+os.environ['GH_TOKEN'],'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'})
with urllib.request.urlopen(request,timeout=15) as response: result=json.load(response)
raw=base64.b64decode(result['content'],validate=False)
if len(raw)>1_000_000 or len(raw)<32 or hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest()!=sha: raise SystemExit('Blob corrupto o demasiado grande')
expected={'png':'PNG','jpg':'JPEG','webp':'WEBP'}[path.rsplit('.',1)[1]]
try:
 with Image.open(BytesIO(raw)) as im:
  if im.format!=expected or im.width<100 or im.height<100 or im.width>4096 or im.height>4096 or im.width*im.height>8_000_000: raise ValueError('Formato o dimensiones inválidas')
  im.verify()
except (UnidentifiedImageError,ValueError,OSError) as exc: raise SystemExit('Imagen inválida') from exc
file=Path('public')/path.lstrip('/')
if file.exists(): raise SystemExit('Ya existe un archivo con ese nombre')
file.parent.mkdir(parents=True,exist_ok=True);file.write_bytes(raw)
Path('/tmp/admin-image-path').write_text(str(file))
Path('/tmp/admin-operation.json').write_text(json.dumps(payload,ensure_ascii=False))
