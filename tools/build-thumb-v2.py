#!/usr/bin/env python3
"""킹수학 썸네일 v2.0(«All new») — 첫 화면 키아트(public/assets/home_bg.webp) 위 글자 · 400×267 WebP RGB.
글자 규격은 quiz-rush tools/build-thumb.py 를 그대로 쓴다(비트:온 All new 와 같은 꼴).
🔴 등재 문구에 중학교 학년 금지(킹수학 = 초등 전용).
실행: ~/.claude/venvs/vibes/bin/python tools/build-thumb-v2.py → dist-kingsmath/v2/thumb.webp"""
import importlib.util, os
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'dist-kingsmath/v2')
spec = importlib.util.spec_from_file_location('bt', '/Users/sim-insu/quiz-rush/tools/build-thumb.py')
bt = importlib.util.module_from_spec(spec); spec.loader.exec_module(bt)
TITLE, SUB, INFO = '구구성 수호대 All new', '모드 6종 · 학교 대항전!', '구구단 정복 · 보스 연전 · 끝없는 방어'
img = bt.cover(Image.open(os.path.join(ROOT, 'public/assets/home_bg.webp')).convert('RGB'), bt.W, bt.H)
band = Image.new('L', (1, bt.H), 0); bd = ImageDraw.Draw(band)
for y in range(bt.H):
    t = min(1.0, y / (bt.H * 0.55)); bd.point((0, y), fill=int(210 * (1 - t) ** 1.5))
img.paste(Image.new('RGB', (bt.W, bt.H), bt.INK), (0, 0), band.resize((bt.W, bt.H)))
d = ImageDraw.Draw(img); cx = bt.W // 2
bt.centered(d, cx, 10, TITLE, bt.font(38), bt.WHITE, ow=4)
bt.centered(d, cx, 60, SUB, bt.font(22, bt.BOLD), bt.GOLD, ow=3)
bt.centered(d, cx, 91, INFO, bt.font(16, bt.BOLD), bt.SKY, ow=3)
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
print(f'✅ {out} {os.path.getsize(out)/1024:.1f}KB q={q}')
