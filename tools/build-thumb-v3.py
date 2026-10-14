#!/usr/bin/env python3
"""킹수학 썸네일 v3(«91종») — 첫 화면 키아트 위에 게임 속 뼈대 캐릭터(public/assets/rig idle_00) 무리를 세운다 · 400×267 WebP RGB.
전설 7종은 크게 앞줄 가운데, 나머지 수호대·괴물은 뒷줄로 빽빽이. 글자 규격 = quiz-rush tools/build-thumb.py.
🔴 등재 문구에 중학교 학년 금지(킹수학 = 초등 전용).
실행: ~/.claude/venvs/vibes/bin/python tools/build-thumb-v3.py → dist-kingsmath/v3/thumb.webp"""
import importlib.util, json, os, random
from PIL import Image, ImageDraw, ImageFilter
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'dist-kingsmath/v3')
RIG = os.path.join(ROOT, 'public/assets/rig')
spec = importlib.util.spec_from_file_location('bt', '/Users/sim-insu/quiz-rush/tools/build-thumb.py')
bt = importlib.util.module_from_spec(spec); spec.loader.exec_module(bt)
TITLE, SUB, INFO = '구구성 수호대', '수호대·괴물 91종 총출동!', '모드 6종 · 학교 대항전 · 구구단 정복'
SS = 3  # 3배로 그린 뒤 줄인다(작은 캐릭터 가장자리 계단 방지)
W, H = bt.W * SS, bt.H * SS
roster = json.load(open(os.path.join(ROOT, 'data/roster.json')))
rank = {'legend': 0, 'epic': 1, 'unique': 2, 'rare': 3, 'normal': 4}

def sprite(uid):
    meta = json.load(open(os.path.join(RIG, uid + '.json')))
    f = meta['frames'][f'{uid}_idle_00']['frame']
    im = Image.open(os.path.join(RIG, uid + '.png')).convert('RGBA').crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))
    return im.crop(im.getbbox())

allies = sorted(roster['allies'], key=lambda u: rank[u['rarity']])
enemies = roster['enemies']
ids = [u['id'] for u in allies] + [e['id'] for e in enemies]
missing = [i for i in ids if not os.path.exists(os.path.join(RIG, i + '.json'))]
assert not missing, f'뼈대 없음: {missing}'
assert len(ids) == 91, len(ids)

img = bt.cover(Image.open(os.path.join(ROOT, 'public/assets/home_bg.webp')).convert('RGB'), W, H).convert('RGBA')
img = Image.blend(img, Image.new('RGBA', (W, H), bt.INK + (255,)), 0.35)

def place(im, cx, by, h, shadow=True):
    s = h / im.height; sp = im.resize((max(1, int(im.width * s)), int(h)), Image.LANCZOS)
    x, y = int(cx - sp.width / 2), int(by - sp.height)
    if shadow:
        sh = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(sh)
        d.ellipse((cx - sp.width * .42, by - h * .05, cx + sp.width * .42, by + h * .05), fill=(0, 0, 0, 110))
        img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(SS * 2)))
    img.alpha_composite(sp, (x, y))

rng = random.Random(91)
legend = [u['id'] for u in allies if u['rarity'] == 'legend']
rest = [i for i in ids if i not in legend]
rng.shuffle(rest)
# 뒤에서 앞으로 3줄 — 뒷줄은 작고 위, 앞줄은 크고 아래(원근)
rows = [(rest[:30], H * .60, H * .14), (rest[30:58], H * .72, H * .17), (rest[58:], H * .84, H * .20)]
for k, (row, by, h) in enumerate(rows):
    n = len(row)
    for j, uid in enumerate(row):
        cx = W * (j + .5) / n + rng.uniform(-SS * 3, SS * 3)
        place(sprite(uid), cx, by + rng.uniform(-SS * 4, SS * 4), h, shadow=k == 2)
    # 줄마다 어둡게 덮어 원근 — 앞줄 전설이 튀어나오게
    veil = Image.new('RGBA', (W, H), bt.INK + (int(70 - k * 25),)); img.alpha_composite(veil)
# 전설 7종 = 맨 앞 가운데 크게(가운데가 가장 크다)
order = [5, 3, 1, 0, 2, 4, 6]
for slot, li in enumerate(order):
    uid = legend[li]; off = slot - 3
    h = H * (.42 - abs(off) * .03)
    place(sprite(uid), W / 2 + off * W * .135, H * .985 - abs(off) * SS * 2, h)

img = img.convert('RGB').resize((bt.W, bt.H), Image.LANCZOS)
band = Image.new('L', (1, bt.H), 0); bd = ImageDraw.Draw(band)
for y in range(bt.H):
    t = min(1.0, y / (bt.H * 0.42)); bd.point((0, y), fill=int(220 * (1 - t) ** 1.6))
img.paste(Image.new('RGB', (bt.W, bt.H), bt.INK), (0, 0), band.resize((bt.W, bt.H)))
d = ImageDraw.Draw(img); cx = bt.W // 2
bt.centered(d, cx, 8, TITLE, bt.font(40), bt.WHITE, ow=4)
bt.centered(d, cx, 58, SUB, bt.font(21, bt.BOLD), bt.GOLD, ow=3)
bt.centered(d, cx, 87, INFO, bt.font(15, bt.BOLD), bt.SKY, ow=3)
for s in (TITLE, SUB, INFO): assert not any(w in s for w in ('중1', '중2', '중3', '중학')), s
os.makedirs(OUT, exist_ok=True)
img.save(os.path.join(OUT, 'thumb.png'))
out = os.path.join(OUT, 'thumb.webp'); q = 92
while q >= 55:
    img.save(out, 'WEBP', quality=q, method=6)
    if os.path.getsize(out) <= bt.MAX_BYTES: break
    q -= 6
img.resize((200, 134), Image.LANCZOS).save(os.path.join(OUT, 'thumb-preview.png'))
c = Image.open(out); assert c.size == (bt.W, bt.H) and c.mode == 'RGB'
print(f'✅ {out} {os.path.getsize(out)/1024:.1f}KB q={q} 캐릭터 {len(ids)}')
