#!/usr/bin/env node
/**
 * v4 신규 에셋 생성 잡 파일 → Meta AI 배치 입력.
 *
 * 🔴 화풍 접미사(STYLE)·등급 수식(GRADE)은 gen-jobs-v3.mjs 와 **글자 그대로 같다.**
 *    한 글자만 달라도 톤이 갈리고, 같은 화면에 구·신 캐릭터가 나란히 서면 즉시 티가 난다.
 * 🔴 아군은 facing right, 적은 facing left — 코드는 좌우 반전을 하지 않는다(에셋이 정본).
 * 🔴 Meta 는 알파를 못 만든다 → 순백 배경으로 뽑고 `tools/cutout-flat.mjs` 로 오린다.
 *    (`--cutout`(rembg)은 쓰지 않는다 — 밝은 얼굴을 배경으로 오인해 지운다.)
 *
 * 실행: node tools/gen-jobs-v4.mjs
 */
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const RAW = join(ROOT, '_raw');
/** --force = 이미 있는 것도 다시 뽑는다 · --only a,b = 그 id 만 */
const FORCE = process.argv.includes('--force');
const ONLY = (process.argv.find((x) => x.startsWith('--only='))?.slice(7) ?? '').split(',').filter(Boolean);

const STYLE =
  'Korean folk art minhwa style, bold black ink outlines, flat vibrant dancheong palette ' +
  '(vermilion red, indigo blue, jade green, ochre yellow, white), cute 3-head-tall chibi proportions, ' +
  'full body visible, single character centered, pure solid white background, no text, no letters, ' +
  'no shadow, no border, children\'s educational game sprite art';

/**
 * 🔴 **금지 문구(2026-08-28 추가).** v4 1차 배치 32장에서 실제로 나온 세 가지 실패다.
 *    STYLE 자체는 v1~v3 과 **글자 그대로** 유지한다 — 화풍이 갈리면 안 되므로 여기에 덧붙인다.
 *
 *  ① 스티커 테두리 — 캐릭터 둘레에 흰 테와 그 바깥 어두운 선을 그린다. 기존 40장에는 없다.
 *     흰 배경에서는 안 보이지만 Meta 가 마젠타 배경을 내면 **분홍 테**로 남는다
 *     (황소도령 실측: 색 기준 컷아웃 후 불투명 자홍 22,176px).
 *  ② 실사 사진 — 족두리각시가 사람 이마 클로즈업 사진으로 나왔다.
 *  ③ 장면 그림 — 까치호랑이가 소나무까지 그린 민화 전신 그림으로 나왔다(캐릭터가 아니다).
 *
 *  배경색은 지시해도 안 듣는다(20장 중 8장 마젠타·1장 회색·1장 베이지). 그건 프롬프트가
 *  아니라 컷아웃이 감당한다(tools/cutout-flat.mjs 는 배경색을 재서 쓴다).
 */
/**
 * 🔴 **금지 문구는 GRADE 와 싸우면 안 된다.** 등급 수식에는 유니크 'subtle glow',
 *    전설 'legendary divine radiant aura' 가 들어 있다 — 그건 **등급을 알리는 연출**이라
 *    유지해야 한다. 그래서 "no glow" 같은 넓은 금지 대신, 실제로 나온 결함인
 *    **실루엣을 따라 도는 흰 테(die-cut sticker edge)** 만 정확히 겨냥한다.
 */
const NEGATIVE =
  ' Do not draw a sticker cutout edge: no white outline tracing the silhouette, ' +
  'no die-cut border, no dark stroke around the outside, no drop shadow, no vignette. ' +
  'The character sits directly on the plain background with nothing behind it — ' +
  'no scenery, no ground, no frame. Flat 2D illustration only: not a photograph, ' +
  'not a real person, not a landscape painting.';

const GRADE = {
  normal: '',
  rare: ' slightly ornate details,',
  unique: ' ornate elegant ornaments, subtle glow,',
  epic: ' majestic ornate armor with gold accents, imposing presence,',
  legend: ' legendary divine radiant aura, lavish gold and jade ornaments, awe-inspiring,',
};

/** 신규 셈지기 20종 */
const ALLIES = [
  ['kkotsin',   'normal', 'a pair-of-embroidered-flower-shoes spirit, a cheerful child wearing bright red kkotsin shoes running fast, tiny flower petals trailing'],
  ['jangdok',   'normal', 'a fat brown onggi jar spirit standing on stubby legs, a lid tilted like a hat, calm sturdy face'],
  ['dotjari',   'normal', 'a rolled straw mat spirit unrolling itself in a wide sweep, a small face on the rolled end, straw texture'],
  ['buchae',    'normal', 'a child spirit holding a huge painted folding fan open wide, fanning a gust of wind forward'],
  ['bokjori',   'normal', 'a lucky bamboo rice-strainer spirit, a woven bamboo scoop with a round smiling face, holding tiny gold coins'],
  ['sotdae',    'rare',   'a wooden sotdae pole bird spirit, a carved duck perched on a tall pole, wings spread, watching far'],
  ['garakji',   'rare',   'a young bride spirit in a pale green hanbok throwing shining twin gold rings like a discus'],
  ['meokgal',   'rare',   'a sturdy ink-grinding goblin rubbing an ink stick on a stone inkstone, black ink swirls rising around him'],
  ['baragi',    'rare',   'a stout monk musician clashing two large brass bara cymbals, wide shockwave rings, thick robe'],
  ['dwiju',     'rare',   'a big wooden rice chest spirit with iron corner fittings, short legs, a heavy calm face on the lid'],
  ['jangmyeong','rare',   'a stone jangmyeong lantern spirit, a tall carved stone lamp with a warm glowing flame inside its window'],
  ['hwangso',   'unique', 'a strong young ox-boy spirit with curved horns and a nose ring, lowering his shoulder to charge forward'],
  // 🔴 'elegant bride' 는 실사 미인 초상으로 끌고 간다(실측: 사람 이마 클로즈업이 나왔다).
  //    「어린 신부 정령」으로 못박고 둥근 볼·전신을 먼저 말해야 화풍 안에 남는다.
  ['jokduri',   'unique', 'a small chibi bride spirit girl with round rosy cheeks, wearing a red and blue hanbok and a tiny jeweled jokduri coronet on her head, scattering shining beads in a wide arc'],
  ['kkachiho',  'unique', 'a comical folk-painting tiger with a magpie on its back, striped orange fur, grinning wide, minhwa kkachi-horangi'],
  ['seolmun',   'unique', 'a giant grandmother spirit of Jeju, enormous and kind, carrying a small mountain in her apron, towering'],
  ['gwimyeon',  'epic',   'a roof-tile demon face guardian, a huge scowling ceramic mask with bulging eyes and fangs, standing as a wall'],
  ['bangmangi', 'epic',   'a magic goblin club spirit, a knobbed wooden bat wrapped in cloth, swinging with gold sparks bursting out'],
  ['sinseon',   'epic',   'a serene taoist immortal boy on a small cloud, long white sleeves, holding a gnarled staff, looking down'],
  ['geumgang',  'legend', 'a temple gate guardian warrior, immense muscular body, fist raised, fierce protective glare, flowing sash'],
  ['samsin',    'legend', 'a kindly grandmother deity in white hanbok with three shining spirit lights circling her, gentle powerful presence'],
];

/** 신규 엉킴괴수 12종(수문장 2종 포함) */
const ENEMIES = [
  ['e_windbell', 'a tiny wind-chime bell monster with a torn paper tail, many of them swarming, ink black and pale brass'],
  ['e_abacus',   'a floating abacus monster, a wooden frame with beads for eyes, flicking beads like bullets from far'],
  ['e_comma',    'a sly slim fox monster shaped like a comma, curled tail, dashing past in a blur, ink black and murky orange'],
  ['e_fraction', 'a plump goblin monster with a crack down its middle as if ready to split into halves, murky green'],
  ['e_fractlet', 'a small half-goblin fragment monster, one lopsided piece with a single eye, murky green'],
  ['e_lantern',  'a will-o-wisp goblin monster wreathed in wide cold blue flame that spreads outward, hollow eyes'],
  ['e_bracket',  'a heavy iron pincer monster shaped like two thick brackets clamping shut, riveted plates, rust brown'],
  ['e_mirror',   'a cracked bronze mirror monster with a face reflected in it, shards spinning wide around the rim'],
  ['e_hourglass','a colossal hourglass monster of dark stone, sand pouring inside, immensely heavy, slow and imposing'],
  ['e_ox',       'a huge tangled black ox monster with knotted rope horns, head lowered, charging straight ahead'],
  ['e_boss5',    'a colossal shadow king monster made of swirling dark ink with a crown of broken numerals, looming'],
  ['e_boss6',    'a colossal mountain-lord monster, a mossy rock giant tangled in thick ropes, crowned with pine trees, imposing'],
];

const jobs = [];
for (const [id, grade, desc] of ALLIES) {
  const out = join(RAW, 'units', `${id}.png`);
  if (ONLY.length && !ONLY.includes(id)) continue;
  if (!FORCE && existsSync(out)) continue;   // 이미 뽑은 것은 건너뛴다(재실행 안전)
  jobs.push({ prompt: `${desc},${GRADE[grade]} facing right. ${STYLE}${NEGATIVE}`, output: out, cutout: false });
}
for (const [id, desc] of ENEMIES) {
  const out = join(RAW, 'enemies', `${id}.png`);
  if (ONLY.length && !ONLY.includes(id)) continue;
  if (!FORCE && existsSync(out)) continue;
  jobs.push({ prompt: `${desc}, facing left. ${STYLE}${NEGATIVE}`, output: out, cutout: false });
}

mkdirSync(join(RAW, 'units'), { recursive: true });
mkdirSync(join(RAW, 'enemies'), { recursive: true });
const outPath = join(RAW, `jobs-v4${ONLY.length ? '-only' : ''}.json`);
writeFileSync(outPath, JSON.stringify(jobs, null, 1));
console.log(`${jobs.length}건 → ${outPath}`);
console.log('  다음: ~/.claude/venvs/vibes/bin/python ~/.claude/bin/meta-image.py --batch ' + outPath);
console.log('  그 다음: 각 png 에 node tools/cutout-flat.mjs (rembg 아님) → node tools/build-assets.mjs');
