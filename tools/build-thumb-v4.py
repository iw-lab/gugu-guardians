#!/usr/bin/env python3
"""킹수학 썸네일 v4 — GPT 웹앱으로 원화(2D 민화풍) 그대로 다시 그린 그림 위에 글자 · 400×267 WebP RGB.
v3(3D 뼈대 스프라이트 91종)는 «너무 실사 느낌이라 노잼»(2026-10-15 사용자) → 그림 = game-assets-src/thumb-v4/art.webp(gen.sh).
글자 규격 = quiz-rush tools/build-thumb.py (v3 와 같은 자리·크기). 🔴 등재 문구에 중학교 학년 금지(킹수학 = 초등 전용).
실행: ~/.claude/venvs/vibes/bin/python tools/build-thumb-v4.py → dist-kingsmath/v4/thumb.webp (+ thumb.png · thumb-preview.png · thumb-check.png)"""
import importlib.util, os
from PIL import Image, ImageDraw
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, 'game-assets-src/thumb-v4/art.webp')
OUT = os.path.join(ROOT, 'dist-kingsmath/v4')
spec = importlib.util.spec_from_file_location('bt', '/Users/sim-insu/quiz-rush/tools/build-thumb.py')
bt = importlib.util.module_from_spec(spec); spec.loader.exec_module(bt)
TITLE, SUB, INFO = '구구성 수호대', '수호대·괴물 91종 총출동!', '모드 6종 · 학교 대항전 · 구구단 정복'

img = bt.cover(Image.open(ART).convert('RGB'), bt.W, bt.H)
# 위 띠만 어둡게 — 밝은 하늘 위에서 흰 제목이 읽히게(그림 아래쪽은 그대로 밝게)
band = Image.new('L', (1, bt.H), 0); bd = ImageDraw.Draw(band)
for y in range(bt.H):
    t = min(1.0, y / (bt.H * 0.40)); bd.point((0, y), fill=int(170 * (1 - t) ** 1.5))
img.paste(Image.new('RGB', (bt.W, bt.H), bt.INK), (0, 0), band.resize((bt.W, bt.H)))
d = ImageDraw.Draw(img); cx = bt.W // 2
bt.centered(d, cx, 8, TITLE, bt.font(40), bt.WHITE, ow=4)
bt.centered(d, cx, 58, SUB, bt.font(21, bt.BOLD), bt.GOLD, ow=3)
bt.centered(d, cx, 87, INFO, bt.font(15, bt.BOLD), bt.SKY, ow=3)
for s in (TITLE, SUB, INFO): assert not any(w in s for w in ('중1', '중2', '중3', '중학')), s
assert d.textlength(TITLE, font=bt.font(40)) / 2 + cx <= 352, '제목이 오른쪽 위 즐겨찾기 별 자리를 덮는다'
os.makedirs(OUT, exist_ok=True)
img.save(os.path.join(OUT, 'thumb.png'))
out = os.path.join(OUT, 'thumb.webp'); q = 92
while q >= 55:
    img.save(out, 'WEBP', quality=q, method=6)
    if os.path.getsize(out) <= bt.MAX_BYTES: break
    q -= 6
img.resize((200, 134), Image.LANCZOS).save(os.path.join(OUT, 'thumb-preview.png'))
# 카드가 덮는 세 자리(NEW 배지 · 별 · 제작자 리본)를 빨간 틀로 얹은 검수본
chk = img.copy(); cd = ImageDraw.Draw(chk)
for r in ((0, 0, 95, 45), (355, 0, 399, 45), (100, 196, 300, 266)):
    cd.rectangle(r, outline=(255, 0, 0), width=2)
chk.save(os.path.join(OUT, 'thumb-check.png'))
c = Image.open(out); assert c.size == (bt.W, bt.H) and c.mode == 'RGB'
print(f'✅ {out} {os.path.getsize(out)/1024:.1f}KB q={q}')
