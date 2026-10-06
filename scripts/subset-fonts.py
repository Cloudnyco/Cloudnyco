"""Subsets the OFL source fonts into assets/fonts for embedding in the SVGs.

    pip install fonttools brotli
    python scripts/subset-fonts.py <dir with JetBrainsMono[wght].ttf and NotoSansSC[wght].ttf>

JetBrains Mono keeps printable ASCII plus the symbols the SVGs use; Noto Sans SC keeps only the characters the SVGs
use (node scripts/build.mjs --charset). Re-run after changing any CJK text in build.mjs.
"""
import pathlib, subprocess, sys
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools import subset

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'fonts'
src = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '.')
extra = subprocess.run(['node', str(ROOT / 'scripts' / 'build.mjs'), '--charset'], capture_output=True, text=True, encoding='utf-8', check=True).stdout
ascii_ = ''.join(chr(c) for c in range(0x20, 0x7f))
mono_text = ascii_ + ''.join(c for c in extra if ord(c) < 0x2e80)
cjk_text = ''.join(c for c in extra if ord(c) >= 0x2e80) + ascii_

def build(file, weight, text, out):
    font = instancer.instantiateVariableFont(TTFont(src / file), {'wght': weight})
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['kern', 'liga', 'calt'] if 'Mono' in file else ['kern']
    opts.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]  # keep copyright and license entries
    opts.desubroutinize = True
    s = subset.Subsetter(opts)
    s.populate(text=text)
    s.subset(font)
    font.flavor = 'woff2'
    font.save(OUT / out)
    covered = {chr(c) for c in font.getBestCmap()}
    missing = [c for c in text if c not in covered and c != ' ']
    if missing: sys.exit(f'{out}: missing {"".join(missing)}')
    print(f'{out}: {(OUT / out).stat().st_size} bytes')
    return covered

OUT.mkdir(parents=True, exist_ok=True)
cov = set()
for w in (400, 700):
    cov |= build('JetBrainsMono[wght].ttf', w, mono_text, f'jetbrains-mono-{w}.woff2')
    cov |= build('NotoSansSC[wght].ttf', w, cjk_text, f'noto-sans-sc-{w}.woff2')
(OUT / 'charset.txt').write_text(''.join(sorted(c for c in cov if ord(c) > 0x7e)), encoding='utf-8')
