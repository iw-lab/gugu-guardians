#!/usr/bin/env python3
"""rig-pack.py — 뼈대 아틀라스(rig-characters.py 산출 PNG)를 게임이 싣는 모양으로 묶는다 (REMASTER-GDD R-3·R-5)

  python3 tools/rig-pack.py            → public/assets/rig/<id>.webp(전장 아틀라스) · rig/card/<id>.webp(도감·덱 얼굴)
                                          · rig/index.json(칸·행·발 위치) · manifest.json 의 그 캐릭터 경로를 카드로 바꿈
                                          · 옛 정지 그림(public/assets/<id>.webp) 삭제(replaces — gate-char-rig ②)
  python3 tools/rig-pack.py --check    → 원장 ok 인데 묶음이 없거나 낡았으면 종료코드 1(빌드 전에 부른다)

🔴 PNG 원본은 public/assets/rig 에 남긴다 — gate-char-rig 가 원장 sha 와 바이트를 대조한다(손으로 고친 그림 금지).
   배포본에는 webp 만 간다(vite.config.ts 의 strip-rig-png 가 dist 에서 png·json 을 지운다 — 91장 × 180KB 를 안 싣는다).
🔴 카드 얼굴은 idle 0프레임을 «내용 상자»로 잘라 정사각에 앉힌다. 옛 정지 그림과 같은 얼굴을 쓰면 도감과 전장이 달라 보인다.
"""
import json, os, sys, hashlib
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RIG = os.path.join(ROOT, 'public/assets/rig')
CARD = os.path.join(RIG, 'card')
ST = os.path.join(ROOT, 'tools/rig-status.json')
DECL = os.path.join(ROOT, 'game-assets-src/rig/characters.json')
MAN = os.path.join(ROOT, 'public/assets/manifest.json')
ACT_ALIAS = {'punch': 'attack'}   # 게임 쪽 이름은 attack 하나 — creature 는 punch, 사람형은 attack


def sha(p):
    return hashlib.sha256(open(p, 'rb').read()).hexdigest()[:16]


def main(check=False):
    st = json.load(open(ST)) if os.path.exists(ST) else {}
    decl = {c['id']: c for c in json.load(open(DECL))['characters']}
    os.makedirs(CARD, exist_ok=True)
    idx_p = os.path.join(RIG, 'index.json')
    old_idx = json.load(open(idx_p)) if os.path.exists(idx_p) else {}
    idx, stale = {}, []
    for cid, r in sorted(st.items()):
        if not r.get('ok') or cid not in decl:
            continue
        png = os.path.join(RIG, cid + '.png'); meta_p = os.path.join(RIG, cid + '.json')
        if not os.path.exists(png) or not os.path.exists(meta_p):
            stale.append(f'{cid}: 아틀라스 없음'); continue
        meta = json.load(open(meta_p))['meta']
        cell = int(r.get('size', 160)); nf = int(meta.get('frames', 8))
        rows = {}
        for i, a in enumerate(r.get('actions', [])):
            rows[ACT_ALIAS.get(a, a)] = i
        src_sha = sha(png)
        webp = os.path.join(RIG, cid + '.webp'); card = os.path.join(CARD, cid + '.webp')
        ent = {'cell': cell, 'frames': nf, 'rows': rows, 'pivot': [round(meta['pivotPx'][0], 1), round(meta['pivotPx'][1], 1)],
               'dir': meta.get('dir', ''), 'src': src_sha}
        idx[cid] = ent
        fresh = old_idx.get(cid, {}).get('src') == src_sha and os.path.exists(webp) and os.path.exists(card)
        if fresh:
            continue
        if check:
            stale.append(f'{cid}: 묶음이 아틀라스보다 낡음'); continue
        im = Image.open(png).convert('RGBA')
        q = 82
        while True:
            im.save(webp, 'WEBP', quality=q, method=6)
            if os.path.getsize(webp) <= 140_000 or q <= 50: break
            q -= 8
        # 카드 얼굴 = idle 0프레임 내용 상자
        r0 = rows.get('idle', 0)
        fr = im.crop((0, r0 * cell, cell, (r0 + 1) * cell))
        bb = fr.getbbox() or (0, 0, cell, cell)
        fr = fr.crop(bb); s = max(fr.size)
        sq = Image.new('RGBA', (s, s), (0, 0, 0, 0)); sq.alpha_composite(fr, ((s - fr.size[0]) // 2, s - fr.size[1]))
        sq.resize((192, 192), Image.LANCZOS).save(card, 'WEBP', quality=86, method=6)
        print(f'  ✓ {cid}: {os.path.getsize(webp) // 1024}KB 아틀라스 · 카드')
    if check:
        if stale:
            print('❌ RIG-PACK 낡음:\n  ' + '\n  '.join(stale)); return 1
        print(f'✓ RIG-PACK — {len(idx)}종 최신'); return 0
    json.dump(idx, open(idx_p, 'w'), ensure_ascii=False, separators=(',', ':'))
    # 매니페스트 — 리그된 캐릭터의 «얼굴» 경로를 카드로, 옛 정지 그림은 지운다
    man = json.load(open(MAN)); n = 0
    for a in man['assets']:
        if a['key'] in idx and a['kind'] in ('unit', 'enemy'):
            new = f'assets/rig/card/{a["key"]}.webp'
            if a['path'] != new:
                old = os.path.join(ROOT, 'public', a['path'])
                a['path'] = new; a['origin'] = 'ai'
                a['license'] = 'GPT 웹앱 원화 → Adobe Firefly 3D → 자체 뼈대(game-builder rig-characters) · 프로젝트 내 사용'
                n += 1
                if os.path.exists(old) and os.path.abspath(old).startswith(os.path.join(ROOT, 'public/assets')):
                    os.remove(old)
    json.dump(man, open(MAN, 'w'), ensure_ascii=False, indent=2)
    print(f'✅ rig-pack — {len(idx)}종 · 매니페스트 {n}개 카드로 교체 · index.json')
    return 0


if __name__ == '__main__':
    sys.exit(main('--check' in sys.argv))
