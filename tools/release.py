#!/usr/bin/env python3
"""Bump the app version everywhere it appears, so a release never ships mixed files.

    python3 tools/release.py 4.0.1 "One-line note for the update banner"

Updates:
  index.html     <meta name="app-version"> and the ?v= on css/app.css and js/*.js
  js/app.js      APP_VERSION
  sw.js          CACHE name and the ?v= on the files it keeps offline
  version.json   version, date and notes (what the in-app update check reads)
Then add the CHANGELOG.md entry by hand (it is longer than one line).
"""
import json, re, sys, os, datetime

if len(sys.argv) < 2 or not re.fullmatch(r'\d+\.\d+\.\d+', sys.argv[1]):
    sys.exit(__doc__)
new, notes = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else None)
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
path = lambda *p: os.path.join(root, *p)

def edit(name, fn):
    with open(path(name), encoding='utf-8') as f: before = f.read()
    after = fn(before)
    if after == before: sys.exit('Nothing changed in %s: is the version already %s?' % (name, new))
    with open(path(name), 'w', encoding='utf-8') as f: f.write(after)
    print('updated', name)

own = r'((?:css/app\.css|js/[\w.-]+\.js)\?v=)[\d.]+'
edit('index.html', lambda s: re.sub(own, r'\g<1>' + new, re.sub(r'(<meta name="app-version" content=")[\d.]+', r'\g<1>' + new, s)))
edit('js/app.js', lambda s: re.sub(r"(var APP_VERSION = ')[\d.]+", r'\g<1>' + new, s, count=1))
edit('sw.js', lambda s: re.sub(own, r'\g<1>' + new, re.sub(r"(var CACHE = 'pencil-markup-)[\d.]+", r'\g<1>' + new, s)))
with open(path('version.json'), encoding='utf-8') as f: v = json.load(f)
v['version'] = new
v['date'] = datetime.date.today().isoformat()
if notes: v['notes'] = notes
with open(path('version.json'), 'w', encoding='utf-8') as f: json.dump(v, f, indent=2)
print('updated version.json')
if '## ' + new not in open(path('CHANGELOG.md'), encoding='utf-8').read():
    print('Remember: add a "## %s" entry to CHANGELOG.md.' % new)
