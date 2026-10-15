"""킹수학 썸네일 v4 참조판 — 게임 원화(game-assets-src/rig/ref, 2D 민화풍)에서 아군 6·괴물 4를 흰 바탕 한 장에.
v3 는 3D 뼈대 스프라이트를 세워 «실사 느낌»이 났다(2026-10-15 사용자 「너무 실사느낌이라 노잼」) → 그림은 원화 화풍으로 다시 그린다."""
import os
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REF = os.path.join(ROOT, 'game-assets-src/rig/ref')
OUT = os.path.join(ROOT, 'game-assets-src/thumb-v4/ref-board.png')
ALLIES = ['gumiho', 'baekho', 'haetae', 'cheollima', 'geumgang', 'yongwang']
FOES = ['e_mul', 'e_boss', 'e_zero', 'e_swarm']

def fit(name, s):
    im = Image.open(os.path.join(REF, name + '.png')).convert('RGBA')
    bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
    g = bg.convert('L'); base = g.getpixel((2, 2))                # 원화 바탕(연회색)과 다른 곳만 남겨 자른다
    box = g.point(lambda v: 255 if abs(v - base) > 18 else 0).getbbox()
    im = bg.crop(box)
    im = Image.composite(Image.new('RGBA', im.size, (255, 255, 255, 255)), im,
                         im.convert('L').point(lambda v: 255 if abs(v - base) <= 6 else 0))   # 바탕색 → 흰색
    r = s / max(im.size)
    return im.resize((round(im.width * r), round(im.height * r)), Image.LANCZOS)

W, H = 1536, 1024
board = Image.new('RGBA', (W, H), (255, 255, 255, 255))
for i, n in enumerate(ALLIES):
    t = fit(n, 300); board.alpha_composite(t, (int(W * (i + .5) / 6 - t.width / 2), 40 + (300 - t.height)))
for i, n in enumerate(FOES):
    t = fit(n, 300); board.alpha_composite(t, (int(W * (i + .5) / 4 - t.width / 2), 560 + (300 - t.height)))
board.convert('RGB').save(OUT)
print('ok', OUT)
