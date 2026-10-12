#!/usr/bin/env python3
"""remaster-char-jobs.py — 91종 캐릭터 T포즈 원화 생성 작업표 + 뼈대 선언(characters.json)을 한 곳에서 만든다 (REMASTER-GDD R-3)
옛 그림(public/assets/<id>.webp)을 레퍼런스로 붙여 «아이들이 아는 얼굴»을 지킨다.
  python3 tools/remaster-char-jobs.py   → game-assets-src/rig/jobs.jsonl · game-assets-src/rig/characters.json
"""
import json, os
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R = json.load(open(os.path.join(ROOT, 'data/roster.json')))
# id: (shape, english description)
D = {
 'jipsin': ('biped', 'a little living straw sandal spirit with stubby arms and legs'),
 'kkachi': ('fly', 'a cheerful Korean magpie warrior bird with a tiny pebble'),
 'musoe': ('biped', 'a sturdy living iron cauldron guardian holding a lid as a shield'),
 'dongjaseok': ('human', 'a stone child statue (dongjaseok) guardian, round stone body'),
 'jorongbak': ('biped', 'a bouncy living gourd bottle spirit'),
 'onggi': ('biped', 'a thick living onggi earthenware jar guardian with short arms and legs'),
 'buttong': ('biped', 'a living brush-holder cylinder spirit holding a calligraphy brush like a club'),
 'yeonip': ('human', 'a child wearing a lotus leaf hat, throwing water drops'),
 'bitjaru': ('human', 'a child sweeping with a big straw broom'),
 'bungbung': ('fly', 'a round bumblebee archer with a tiny bow'),
 'namak': ('human', 'a merchant boy wearing wooden namak clogs, quick on his feet'),
 'ttokttak': ('biped', 'a tiny clockwork wooden knocker spirit that strikes rapidly'),
 'chotbul': ('human', 'a young scholar boy holding a lit candle torch'),
 'dolhareubang': ('biped', 'a Jeju dolhareubang stone grandfather statue'),
 'dokkabi': ('biped', 'a black-ink dokkaebi goblin with one horn and a spiked club'),
 'sotdu': ('human', 'a burly cook warrior holding a huge iron pot lid shield'),
 'mulbangul': ('human', 'a water-drop maiden in hanbok splashing water'),
 'chorong': ('biped', 'a living blue-red cheongsachorong silk lantern spirit'),
 'kkwaenggwari': ('human', 'a pungmul musician boy beating a kkwaenggwari gong'),
 'butdaegam': ('human', 'an old scholar official (daegam) with a giant brush staff'),
 'samjogo': ('fly', 'a three-legged golden crow (samjogo) with sun halo'),
 'talchum': ('human', 'a mask dancer in a white Korean talchum mask with long sleeves'),
 'haetae': ('biped', 'a haetae guardian lion general in armor standing upright'),
 'bulgasari': ('quad', 'bulgasari, an iron-eating mythical beast with metal scales'),
 'baekho': ('quad', 'a white tiger (baekho) of the west, majestic'),
 'seonnyeo': ('human', 'a heavenly fairy (seonnyeo) in flowing hanbok scattering flower petals'),
 'cheongryong': ('worm', 'a blue dragon (cheongryong) of the east, serpentine'),
 'jangseung': ('biped', 'a giant wooden jangseung village guardian totem with fierce face'),
 'dokkabidae': ('biped', 'a big dokkaebi goblin chief with a golden club and horns'),
 'hyeonmu': ('quad', 'hyeonmu, the black tortoise entwined with a snake'),
 'bulgae': ('quad', 'a fire dog (bulgae) with flaming mane'),
 'jujak': ('fly', 'jujak, the vermilion phoenix bird of the south breathing fire'),
 'eosa': ('human', 'a secret royal inspector (amhaeng-eosa) holding a mapae horse badge'),
 'gumiho': ('quad', 'a clever nine-tailed fox with golden tails (friendly)'),
 'sansin': ('human', 'a mountain spirit old man (sansin) with white beard and staff'),
 'cheollima': ('quad', 'cheollima, a winged heavenly horse'),
 'seondol': ('biped', 'a towering standing-stone general (seondol) with stone fists'),
 'yongwang': ('human', 'the Dragon King of the sea in royal robes with dragon crown'),
 'kkotsin': ('biped', 'a living flowered silk shoe spirit, very fast'),
 'jangdok': ('biped', 'a living soy sauce jar (jangdok) guardian, round and sturdy'),
 'dotjari': ('human', 'a child carrying a rolled straw mat to sweep enemies'),
 'buchae': ('human', 'a child waving a big Korean folding fan'),
 'bokjori': ('human', 'a child holding a lucky bamboo rice-scoop (bokjori)'),
 'sotdae': ('fly', 'a carved wooden duck bird from a sotdae pole'),
 'garakji': ('human', 'a young lady in hanbok throwing jade rings'),
 'meokgal': ('biped', 'a living ink-stick spirit grinding ink, strong arms'),
 'baragi': ('human', 'a musician warrior clashing large bara cymbals'),
 'dwiju': ('biped', 'a living wooden rice chest (dwiju) guardian, thick and boxy'),
 'jangmyeong': ('biped', 'a living stone lantern (jangmyeongdeung) spirit glowing'),
 'hwangso': ('biped', 'a bull-headed young warrior (hwangso doryeong) standing upright'),
 'jokduri': ('human', 'a bride in jokduri headdress scattering beads'),
 'kkachiho': ('quad', 'the folk-painting tiger with a magpie on its head (kkachi-horangi), funny face'),
 'seolmun': ('human', 'Seolmundae Halmang, a giant grandmother carrying a basket of earth'),
 'gwimyeon': ('biped', 'a living goblin-face roof tile (gwimyeonwa) guardian with stubby limbs'),
 'bangmangi': ('biped', 'a living magic dokkaebi club (bangmangi) spirit'),
 'sinseon': ('human', 'a Taoist immortal boy riding a small cloud'),
 'geumgang': ('human', 'a muscular Vajra temple guardian (geumgang-yeoksa)'),
 'samsin': ('human', 'Samsin Halmae, a kind grandmother goddess of birth with three helpers'),
 'e_swarm': ('fly', 'a swarm of small buzzing number bugs, cute but mischievous'),
 'e_zero': ('biped', 'a round zero-shaped ghost goblin, hollow middle'),
 'e_bat': ('fly', 'an upside-down bat monster with jumbled numbers on wings'),
 'e_splitlet': ('biped', 'a small split blob goblin'),
 'e_arch': ('biped', 'a crooked goblin archer with a bent bow'),
 'e_mul': ('worm', 'a question-mark shaped caterpillar monster'),
 'e_dash': ('biped', 'a lightning-fast dash goblin with zigzag body'),
 'e_minus': ('fly', 'a crow monster with a minus-sign beak'),
 'e_split': ('worm', 'a forked splitting worm monster'),
 'e_sky': ('fly', 'a mischievous living kite monster'),
 'e_drum': ('biped', 'a drum-bellied monster beating its own drum'),
 'e_knot': ('worm', 'a knotted rope snake monster, purple'),
 'e_ghost': ('fly', 'a cloud of ink-black storm ghosts'),
 'e_armor': ('biped', 'a tangled iron-armored brute monster'),
 'e_thorn': ('biped', 'a walking thorn bush monster'),
 'e_rock': ('biped', 'a tangled boulder golem'),
 'e_shield': ('biped', 'a tangle monster hiding behind a big shield'),
 'e_boss': ('biped', 'the Jumble King boss, crown of scrambled numbers, big belly'),
 'e_boss2': ('worm', 'the Ten-Knot King boss, a huge serpent tied in ten knots'),
 'e_boss3': ('biped', 'the Infinite Tangle boss, a giant made of endless looping ropes'),
 'e_boss4': ('worm', 'the Number-Eating Dragon boss, dark dragon chewing digits'),
 'e_windbell': ('biped', 'a living temple wind-bell monster ringing wrong numbers'),
 'e_abacus': ('biped', 'an abacus ghost goblin with beads for teeth'),
 'e_comma': ('quad', 'a comma-tailed sly fox monster'),
 'e_fraction': ('biped', 'a half-split dokkaebi goblin (two halves of different color)'),
 'e_fractlet': ('biped', 'a small fraction-piece goblin'),
 'e_lantern': ('fly', 'a will-o-the-wisp lantern goblin floating'),
 'e_bracket': ('biped', 'a crab-like monster with bracket-shaped pincers'),
 'e_mirror': ('biped', 'a mirror goblin showing reversed numbers'),
 'e_hourglass': ('biped', 'an hourglass goblin pouring sand'),
 'e_ox': ('quad', 'a counting ox monster with number brand'),
 'e_boss5': ('biped', 'the Shadow Count King boss, a tall shadow wearing a gat hat'),
 'e_boss6': ('quad', 'the Tangle Mountain Lord boss, a giant mountain tiger made of tangled vines'),
}
allies = [u['id'] for u in R['allies']]; foes = [e['id'] for e in R['enemies']]
assert set(D) == set(allies + foes), (set(allies + foes) - set(D), set(D) - set(allies + foes))
POSE = {'human': 'standing in a T-pose, arms straight out horizontally, legs slightly apart',
        'biped': 'standing upright in a T-pose with arms (or stubby limbs) stretched out horizontally, legs apart',
        'quad': 'standing on four legs, body facing the viewer, legs clearly separated',
        'fly': 'wings spread wide open horizontally, body upright facing the viewer',
        'worm': 'body stretched in a gentle S curve, head up facing the viewer',
        'tower': 'standing straight, arms (if any) out to the sides'}
jobs, chars = [], []
for cid, (shape, desc) in D.items():
    ref_src = os.path.join(ROOT, 'public/assets', cid + '.webp'); ref = os.path.join(ROOT, 'game-assets-src/rig/ref', cid + '.png')
    # 셈지기 = 오른쪽 앞(SE) · 괴수 = 왼쪽 앞(SW) — 옆(E/W)으로 찍으면 납작한 Firefly 메시가 막대처럼 보인다(삼족오 시험 2026-10-12)
    if os.path.exists(ref_src) and not os.path.exists(ref):
        im = Image.open(ref_src).convert('RGBA'); s = 512 / max(im.size)
        im = im.resize((round(im.size[0] * s), round(im.size[1] * s)), Image.LANCZOS)
        bg = Image.new('RGBA', (640, 640), (232, 232, 232, 255)); bg.alpha_composite(im, ((640 - im.size[0]) // 2, (640 - im.size[1]) // 2)); bg.convert('RGB').save(ref)
    boss = cid.startswith('e_boss')
    p = (f"Full-body character design for a Korean folk-painting (minhwa) styled children's game: {desc}. "
         f"Front view, {POSE[shape]}, symmetric, the whole body visible from head to toe with margin, cute chibi proportions (about 3 heads tall), "
         "bold black ink outlines, rich dancheong colors (cinnabar red, malachite green, ultramarine, ochre), soft flat shading, even lighting. "
         "Plain solid light gray background (#E8E8E8), no ground shadow, no scenery, no halo, no aura, no flat disc or ornament floating behind the character, no text, no letters, single character only. "
         + ("Make it look powerful and big, a boss. " if boss else "")
         + "Keep the same character identity, colors and face as the reference image, but redraw it cleaner and more detailed in this pose.")
    jobs.append({'prompt': p, 'out': os.path.join(ROOT, 'game-assets-src/rig/src', cid + '.png'), 'aspect': '1:1', 'refs': [ref] if os.path.exists(ref) else []})
    # 뼈대 shape: 사람형도 creature biped 로 — 한복 도포·지팡이·부채를 든 원화는 rig.py 의 사람 랜드마크 게이트에 걸린다(산신령 실측)
    rshape = 'biped' if shape == 'human' else shape
    chars.append({'id': cid, 'src': f'game-assets-src/rig/src/{cid}.png', 'shape': rshape, 'actions': ['idle', 'walk', 'punch'],
                  'dir': 'SE' if cid in allies else 'SW', 'size': 224 if boss else 160, 'frames': 8, 'out': 'public/assets/rig',
                  'replaces': [f'public/assets/{cid}.webp']})
os.makedirs(os.path.join(ROOT, 'game-assets-src/rig'), exist_ok=True)
with open(os.path.join(ROOT, 'game-assets-src/rig/jobs.jsonl'), 'w') as f:
    for j in jobs: f.write(json.dumps(j, ensure_ascii=False) + '\n')
exempt = {}
for c in chars:
    exempt[f"public/assets/rig/{c['id']}.webp"] = '배포용 webp 변환본(tools/rig-pack.py) — 원본 png 는 원장 sha 와 대조된다'
    exempt[f"public/assets/rig/card/{c['id']}.webp"] = '도감·덱 카드 얼굴 — 리그 아틀라스 idle 0프레임을 잘라 만든 것(rig-pack.py)'
json.dump({'characters': chars, 'exempt': exempt}, open(os.path.join(ROOT, 'game-assets-src/rig/characters.json'), 'w'), ensure_ascii=False, indent=1)
print(len(jobs), 'jobs ·', sum(1 for j in jobs if j['refs']), 'with refs')
