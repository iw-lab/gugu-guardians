#!/usr/bin/env node
/**
 * 단색 배경 컷아웃 — 먹선을 못 넘는 flood fill 방식.
 *
 * 🔴 왜 rembg를 안 쓰나: rembg(u2net)는 "무엇이 주인공인가"를 추측한다. 민화풍 캐릭터는
 *    얼굴이 아이보리·흰색인 경우가 많은데, 배경도 순백이라 **얼굴을 배경으로 오인해 지운다.**
 *    실제로 해태 유닛은 얼굴·뿔의 알파가 0까지 깎여 유령이 된 채 배포됐고(반투명 69%),
 *    게임 안 128px에서는 아무도 못 알아챘다. 인장으로 키우고 나서야 드러났다.
 *
 * 이 방식은 그 사고가 **구조적으로 불가능하다**: 배경은 "이미지 테두리에서 출발해
 * 먹선을 넘지 않고 도달할 수 있는 흰 영역"으로만 정의한다. 캐릭터 안쪽은 굵은 먹선으로
 * 닫혀 있으므로, 얼굴이 순백이어도 바깥에서 도달할 수 없다 → 절대 안 지워진다.
 * 추측이 없으니 같은 입력에 항상 같은 결과가 나온다.
 *
 * 대신 전제가 있다: **배경이 단색이고, 캐릭터 외곽선이 닫혀 있어야 한다.**
 * 배경색은 네 모서리에서 읽어내므로 순백이 아니어도 된다 — 실제로 Meta가 "pure solid white
 * background" 지시를 무시하고 마젠타로 뽑은 적이 있다. 색을 가정하지 않으면 그때도 그냥 동작한다.
 * 외곽선이 끊겨 배경이 안쪽으로 새면 피사체 비율이 급감하므로 아래 경고로 잡힌다.
 *
 * 실행: node tools/cutout-flat.mjs <입력.png> [출력.png]   (출력 생략 시 제자리 덮어쓰기)
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const PY = join(process.env.HOME, '.claude/venvs/vibes/bin/python');
const [src, dst] = process.argv.slice(2);

if (!src) { console.error('사용법: node tools/cutout-flat.mjs <입력.png> [출력.png]'); process.exit(1); }
if (!existsSync(src)) { console.error(`✗ 입력이 없다: ${src}`); process.exit(1); }
if (!existsSync(PY)) { console.error('✗ PIL/numpy 환경이 없다(~/.claude/venvs/vibes)'); process.exit(1); }

const out = execFileSync(PY, ['-c', `
import sys
import numpy as np
from scipy import ndimage
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]

INK_MAX  = 110         # 이보다 어두우면 '먹선'. 화풍 지시가 bold black ink outlines 라 보장된다.
TOL      = 20          # 색 기준 대안 경로에서 쓰는 배경색 허용 오차
SOFT_LO  = 5
SOFT_HI  = 55
SPECK    = 0.0002      # 이보다 작은 조각은 노이즈로 보고 버린다(전체 픽셀 대비)
HOLE_BAD = 0.03        # 내부구멍이 이보다 크면 먹선이 끊긴 것으로 보고 색 기준으로 되돌린다

a = np.array(Image.open(src).convert('RGB')).astype(np.float64)
H, W = a.shape[:2]

# 배경색은 네 모서리에서 읽는다 — 순백이라고 가정하지 않는다.
# 🔴 Meta 는 pure solid white background 를 요구해도 장마다 다른 색을 낸다
#    (2026-08-28 배치 실측: 11장 중 6장이 마젠타 #F901F4 부근).
corners = np.stack([a[0, 0], a[0, -1], a[-1, 0], a[-1, -1]])
bgc = np.median(corners, axis=0)
d = np.abs(a - bgc).max(axis=2)

def holes_of(subject):
    inner = ndimage.binary_fill_holes(subject)
    return (inner & ~subject).sum() / max(1, inner.sum())

# ── 1차: **먹선 바깥**을 배경으로 본다 ─────────────────────────────────────
# 🔴 색 기준(테두리에서 배경색을 flood fill)만 쓰면 **글로우를 못 지운다.**
#    Meta 는 캐릭터 둘레에 스티커풍 흰 테두리를 자주 그리는데, 배경이 흰색이면 배경과
#    구분이 안 돼 그냥 지워지지만 **마젠타면 분홍 테로 남는다** — 그 테는 배경색에서
#    멀어(d > 55) '피사체'로 판정되어 **불투명**하게 살아남는다.
#    실측(황소도령): 색 기준 → 불투명 자홍 22,176px / 먹선 기준 → 127px.
#    그래서 기준을 색이 아니라 **닫힌 먹선**으로 옮긴다. 화풍이 그걸 보장한다.
ink = a.mean(axis=2) < INK_MAX
seed = np.zeros((H, W), bool)
seed[0, :] = seed[-1, :] = seed[:, 0] = seed[:, -1] = True
seed &= ~ink
outside = ndimage.binary_propagation(seed, mask=~ink)
mode = 'ink'

# ── 2차(대안): 먹선이 끊겨 안쪽까지 샜으면 종전 색 기준으로 되돌린다 ──────
# 🔴 화풍을 벗어난 산출물(사진·전신 민화)에는 닫힌 먹선이 없다. 그때는 안 쓴다.
if holes_of(~outside) > HOLE_BAD:
    lbl, n = ndimage.label(d <= TOL)
    e = np.unique(np.concatenate([lbl[0], lbl[-1], lbl[:, 0], lbl[:, -1]]))
    outside = np.isin(lbl, e[e > 0])
    mode = 'color(먹선 끊김)'

# ── 알파 ───────────────────────────────────────────────────────────────
alpha = np.where(outside, 0.0, 255.0)
band = outside & ndimage.binary_dilation(~outside, iterations=1)
alpha[band] = np.clip((d - SOFT_LO) / (SOFT_HI - SOFT_LO), 0, 1)[band] * 255

# 파편 제거 — 본체와 떨어진 작은 조각(생성 노이즈)
sol = alpha > 200
sl, sn = ndimage.label(sol)
if sn:
    sz = ndimage.sum(np.ones_like(sl), sl, range(1, sn + 1))
    tiny = np.isin(sl, (np.nonzero(sz < a[..., 0].size * SPECK)[0] + 1))
    alpha[ndimage.binary_dilation(tiny, iterations=3) & (alpha > 0)] = 0

# 배경색이 섞인 경계색을 되돌린다 — 안 하면 캐릭터 둘레에 배경색 테가 남는다
f = (alpha / 255.0)[..., None]
rgb = np.where(f > 0.02, (a - (1 - f) * bgc) / np.maximum(f, 0.02), a)
rgb = np.clip(rgb, 0, 255)

# ── 알파 블리드 ────────────────────────────────────────────────────────
# 🔴 투명 픽셀의 RGB 를 0(검정)으로 두거나 배경색으로 남기면, 리사이즈·WebP 압축·GPU
#    이중선형 보간에서 이웃과 섞여 **테**로 되살아난다(PIL resize 는 non-premultiplied).
#    가장 가까운 «불투명하고 배경색이 아닌» 픽셀 색으로 덮는다. 알파는 건드리지 않는다.
r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
# 자홍 판정은 defringe.py 의 실측 기준을 따른다 — G 가 낮을 것이 **필수**다.
# (min(R,B)-G 만 보면 붉은 한복·보라 캐릭터를 통째로 배경으로 몰아넣는다.)
magenta = (np.minimum(r, b) > 100) & (np.abs(r - b) < 45) & (g < 45)
donor = (alpha >= 250) & ~magenta
# 🔴 블리드는 **실루엣 근처만** 하면 된다. 1600px 원본을 256px 로 줄이면 출력 1픽셀이
#    원본 6.25×6.25 를 평균하므로 7px 밖은 섞이지 않는다. 24px 이면 충분하다.
#    전 영역을 칠하면 렌더에는 무해하지만(알파 0) **투명 영역이 그림처럼 보여
#    사람이 실루엣을 눈으로 검수할 수 없다**(실측으로 겪었다).
BLEED_PX = 24
if donor.any():
    dist, idx = ndimage.distance_transform_edt(~donor, return_indices=True)
    near = rgb[idx[0], idx[1]]
    fill = (~donor) & (dist <= BLEED_PX)
    rgb = np.where(donor[..., None], rgb, np.where(fill[..., None], near, 0.0))

Image.fromarray(np.dstack([rgb, alpha]).astype(np.uint8)).save(dst)

# ── 자기검증 ───────────────────────────────────────────────────────────
subj = alpha >= 40
hole = holes_of(subj)
op = alpha >= 250
# 🔴 자홍 잔류는 **저장할 배열**로 재야 한다. 블리드 이전의 rgb 로 재면, 블리드가
#    이미 이웃 색으로 덮어 고쳐 놓은 픽셀까지 결함으로 세서 멀쩡한 그림에
#    「눈으로 확인할 것」이 뜬다(meokgal 32,199px 오탐 — 실제 출력엔 0px).
fr, fg, fb = rgb[..., 0], rgb[..., 1], rgb[..., 2]
mg = int((((np.minimum(fr, fb) > 100) & (np.abs(fr - fb) < 45) & (fg < 45)) & op).sum())
print('%s · 배경색 %s · 피사체 %.1f%% · 내부구멍 %.2f%% · 잔류 배경테 %d px'
      % (mode, tuple(int(v) for v in bgc), subj.mean() * 100, hole * 100, mg))
if subj.mean() > 0.95: print('⚠️ 피사체 95%% 초과 — 배경이 단색이 아니다(장면 그림일 수 있다)')
if subj.mean() < 0.05: print('⚠️ 피사체 5%% 미만 — 외곽선이 끊겨 배경이 안쪽까지 샜다')
if hole > 0.03:        print('⚠️ 내부 구멍 3%% 초과 — 화풍을 벗어난 산출물일 수 있다')
if mg > 500:           print('⚠️ 배경색 테가 남았다 — 눈으로 확인할 것')
`, src, dst ?? src], { encoding: 'utf8' });

console.log(`${src.split('/').pop()} → ${(dst ?? src).split('/').pop()}  ${out.trim()}`);
