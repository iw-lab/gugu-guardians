#!/usr/bin/env node
/**
 * e2e-play.mjs — 모드 6종을 «실제 화면에서 끝까지» 플레이한다 (REMASTER v2.0 · 2026-10-12 사용자 «실측으로 플레이하고 전수 디버깅»)
 *   node tools/e2e-play.mjs <주소> [스크린샷 폴더]
 *
 * e2e-v2 는 «들어가서 그만하기»까지만 본다. 여기서는 봇이 문제를 실제로 풀고(키패드 입력)·소환하고·대포를 쏴서
 * 각 모드가 **자기 끝 조건으로 끝나는지**, 결과 화면·기록·학교 점수 토스트까지 이어지는지를 잰다.
 *  P1 모드마다 끝까지 간다(시간 상한 안에 결과 화면) · 결과 화면 문구가 그 모드 것이다
 *  P2 모드 기록이 세이브에 남는다(time·survival·rule·big·daily) · 캠페인은 관문→결과→진도
 *  P3 전장 프레임 — 뼈대 아틀라스가 실제로 그려진다(rig 이미지 요청 200)
 *  P4 화면 4종(1280×720·900×310·1920×1080·3840×2160)에서 가로 넘침 0 · 주 단추·키패드가 화면 안
 *  P5 콘솔·페이지 에러 0
 * 🔴 «목록에 없어요»(학교 없음)만 밟는다 — 배포본에서 학교를 고르면 아이들 순위판에 기록된다.
 */
import puppeteer from 'puppeteer';
import fs from 'node:fs';

const url = process.argv[2];
const out = process.argv[3] || '/tmp/gugu-play';
if (!url) { console.log('사용: node tools/e2e-play.mjs <주소> [스크린샷 폴더]'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });
const b = await puppeteer.launch({ executablePath: process.env.CHROME || undefined, headless: 'new', pipe: true, dumpio: !!process.env.PLAY_DUMPIO,
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const fails = [];
const ok = (c, m) => { console.log(`${c ? '✅' : '❌'} ${m}`); if (!c) fails.push(m); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const p = await b.newPage();
await p.setViewport({ width: 1280, height: 720 });
const errs = []; const rigHits = new Map();
p.on('pageerror', (e) => errs.push(e.message));
// 탭이 죽으면(렌더러 충돌) 그 사실과 직전 상태를 남긴다 — «Target closed» 만으로는 원인을 못 가른다
p.on('error', (e) => console.log(`💥 페이지 충돌: ${e.message}`));
b.on('disconnected', () => console.log('💥 브라우저 연결 끊김'));
const cdp = await p.target().createCDPSession();
const mem = async (tag) => { try { const c = await cdp.send('Memory.getDOMCounters'); const h = await p.evaluate(() => Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1e6)); console.log(`   📊 ${tag} 노드 ${c.nodes} · 리스너 ${c.jsEventListeners} · 문서 ${c.documents} · 힙 ${h}MB`); } catch (e) { console.log(`   📊 ${tag} 측정 실패 ${e.message}`); } };
p.on('console', (m) => { if (m.type() === 'error' && !/favicon|404|api\/hub/.test(m.text())) errs.push(m.text()); });
// 다시 받을 땐 캐시 응답(304)이 앞 200 을 덮는다 — 한 번이라도 받아졌으면(200·304) 성공으로 센다
p.on('response', (r) => { const m = r.url().match(/assets\/rig\/([a-z_0-9]+)\.webp/); if (m && (rigHits.get(m[1]) !== 200)) rigHits.set(m[1], r.status() === 304 ? 200 : r.status()); });

const screen = () => p.evaluate(() => window.__gugu__?.screen);
const clickText = (re) => p.evaluate((s) => { const x = [...document.querySelectorAll('button')].find((e) => new RegExp(s).test(e.textContent) && e.getBoundingClientRect().width > 0); if (x) { x.click(); return true; } return false; }, re);
const save = () => p.evaluate(() => { const r = JSON.parse(localStorage.getItem('gugu:save') || '{}'); return r.data ?? r; });

/** 문제 하나 — 맞히거나(wrong=false) 일부러 틀린다. 답은 화면 글자에서 계산(÷ 는 몫/나머지 물음을 본다) */
async function answer(wrong) {
  const q = await p.evaluate(() => ({ q: document.querySelector('.quiz .q')?.textContent || '', ask: document.querySelector('.quiz .ask')?.textContent || '' }));
  const expr = q.q.replace(/=.*$/, '').replace(/_/g, '').trim();
  if (!/\d/.test(expr)) return;
  let v;
  const d = expr.match(/^(\d+)\s*÷\s*(\d+)$/);
  if (d) v = /나머지/.test(q.ask) ? (+d[1]) % (+d[2]) : Math.floor(+d[1] / +d[2]);
  else { try { v = Function(`return (${expr.replace(/×/g, '*').replace(/−/g, '-')})`)(); } catch { return; } }
  if (!Number.isFinite(v)) return;
  if (wrong) v = v + 1;
  for (const ch of String(v)) await p.keyboard.press(ch);
}

/** 전장 봇 한 걸음 — 비싼 카드부터 눌러 보고(못 사면 시뮬이 거절), 대포가 차면 쏜다 */
async function act() {
  await p.evaluate(() => {
    const cards = [...document.querySelectorAll('.dcard')].reverse();
    for (const c of cards) if (!c.disabled) c.click();
    const can = document.querySelector('button.cannon'); if (can && !can.disabled) can.click();
  });
}

/** 판 하나를 끝까지 — wrongWhen(g) 가 참이면 그때부터 일부러 틀린다(끝없는 방어를 끝내려고) */
async function playToEnd(label, limitMs, wrongWhen = () => false) {
  const t0 = Date.now(); let last = '';
  while (Date.now() - t0 < limitMs) {
    const s = await screen();
    if (s !== 'battle') { last = s; break; }
    const g = await p.evaluate(() => window.__gugu__ || {});
    if (Date.now() - t0 > 0 && (Date.now() - t0) % 60000 < 400) await mem(`${label} ${Math.round((Date.now() - t0) / 1000)}초`);
    await answer(wrongWhen(g));
    await act();
    await wait(380);
  }
  const s = last || await screen();
  return { screen: s, sec: Math.round((Date.now() - t0) / 1000) };
}

await p.goto(url, { waitUntil: 'networkidle2' });
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: 'networkidle2' }); await wait(1500);

// ── 캠페인 1판(첫 판) — 학교 정하기 → 전장 → 관문 → 결과 → 진도 1
await p.click('[data-gb="play"]').catch(() => {}); await wait(2000);
await p.click('[data-gb-none]').catch(() => {}); await wait(2500);
ok((await screen()) === 'battle', '캠페인 1판 시작');
let r = await playToEnd('classic', 240000);
await p.screenshot({ path: `${out}/classic-end.png` });
if (r.screen === 'gate') {
  for (let i = 0; i < 10 && (await screen()) === 'gate'; i++) {
    const t = await p.evaluate(() => ({ q: document.querySelector('.gate-q')?.textContent || '', ask: [...document.querySelectorAll('.gate-wrap .muted')].map((x) => x.textContent).join(' ') }));
    const m = /(\d+)\s*([+−×÷])\s*(\d+)/.exec(t.q);
    if (m) { const a = +m[1], c = +m[3]; let v = m[2] === '+' ? a + c : m[2] === '−' ? a - c : m[2] === '×' ? a * c : Math.floor(a / c); if (m[2] === '÷' && t.ask.includes('나머지')) v = a % c;
      await p.evaluate((s) => { const x = [...document.querySelectorAll('.choices button')].find((e) => e.textContent?.trim() === s); x?.click(); }, String(v)); }
    await wait(900);
  }
}
const cs = await screen();
ok(r.screen === 'gate' || r.screen === 'result', `P1 캠페인 1판 끝까지 ${r.sec}초 → ${r.screen} → ${cs}`);
await p.screenshot({ path: `${out}/classic-result.png` });
const sv0 = await save();
ok((sv0.progress?.maxStage ?? 0) >= 1, `P2 캠페인 진도 저장(maxStage=${sv0.progress?.maxStage})`);
// 결과 → 첫 화면
for (let i = 0; i < 4 && (await screen()) !== 'menu'; i++) { await clickText('첫 화면|처음|메뉴|닫기|계속'); await wait(1200); }
if ((await screen()) !== 'menu') { await p.goto(url, { waitUntil: 'networkidle2' }); await wait(1500); }
ok((await screen()) === 'menu', '캠페인 뒤 첫 화면');

// ── 모드 5종 — 각자 끝 조건으로 끝나야 한다
const MODES = [
  ['time', '번개 전투', 200000, () => false, (s) => s.modes?.time >= 1],
  ['survival', '끝없는 방어', 420000, (g) => (g.wave ?? 0) >= 6, (s) => s.modes?.survival >= 1],
  ['rule', '구구단 정복', 300000, () => false, (s) => (s.modes?.rule?.['3'] ?? 0) >= 1],
  ['big', '보스 연전', 600000, () => false, (s) => s.modes?.big > 0 || s.modes?.bigBest >= 1],
  ['daily', '오늘의 전장', 300000, () => false, (s) => (s.modes?.daily?.streak ?? 0) >= 1],
];
for (const [id, label, limit, wrongWhen, check] of MODES) {
  await clickText(label); await wait(1200);
  if (id === 'rule') { await clickText('^\\s*3단'); await wait(1200); }
  await wait(1500);
  ok((await screen()) === 'battle', `${label} 시작`);
  // 끝없는 방어는 파도 6 까지 버틴 뒤 일부러 틀려 성이 무너지게 한다(끝 조건 = 아군 성 붕괴)
  const res = await playToEnd(id, limit, wrongWhen);
  const head = await p.evaluate(() => document.querySelector('.mr-head')?.textContent || document.querySelector('h2')?.textContent || '');
  await p.screenshot({ path: `${out}/${id}-result.png` });
  ok(res.screen === 'modeResult', `P1 ${label} 끝까지 ${res.sec}초 → ${res.screen} «${head}»`);
  const sv = await save();
  ok(check(sv), `P2 ${label} 기록 ${JSON.stringify(sv.modes?.[id])}`);
  await mem(`${label} 뒤`);
  await clickText('첫 화면'); await wait(1500);
  if ((await screen()) !== 'menu') { await p.goto(url, { waitUntil: 'networkidle2' }); await wait(1500); }
}

const rigOk = [...rigHits.values()].filter((s) => s === 200).length;
// 새 세이브 덱 = 기본 셈지기 3종 — 그 셋은 반드시 뼈대로 받아져야 한다(적은 묶인 만큼 더 늘어난다)
ok(['jipsin', 'kkachi', 'musoe'].every((id) => rigHits.get(id) === 200) && rigOk >= 3, `P3 뼈대 아틀라스 실제 요청 ${rigOk}장 200 (${[...rigHits.keys()].slice(0, 8).join(',')}…)`);

// ── 화면 4종 — 가로 넘침·주 단추·키패드
for (const [w, h] of [[1280, 720], [900, 310], [1920, 1080], [3840, 2160]]) {
  await p.setViewport({ width: w, height: h });
  await p.goto(url, { waitUntil: 'networkidle2' }); await wait(1500);
  const home = await p.evaluate(() => { const pb = document.querySelector('[data-gb="play"]')?.getBoundingClientRect();
    return { over: document.documentElement.scrollWidth - innerWidth, play: pb ? pb.bottom <= innerHeight + 1 && pb.right <= innerWidth + 1 && pb.width > 0 : false }; });
  await p.screenshot({ path: `${out}/home-${w}x${h}.png` });
  await p.click('[data-gb="play"]').catch(() => {}); await wait(2500);
  const bt = await p.evaluate(() => { const k = document.querySelector('.pad, .numpad, .keys')?.getBoundingClientRect(); const c = document.querySelector('canvas')?.getBoundingClientRect();
    return { over: document.documentElement.scrollWidth - innerWidth, pad: k ? k.bottom <= innerHeight + 2 && k.right <= innerWidth + 2 : null, canvas: c ? Math.round(c.width) + 'x' + Math.round(c.height) : '' }; });
  await p.screenshot({ path: `${out}/battle-${w}x${h}.png` });
  ok(home.over <= 1 && home.play && bt.over <= 1 && bt.pad !== false, `P4 ${w}×${h} 넘침 홈 ${home.over}·전장 ${bt.over} · 출전 단추 ${home.play ? '보임' : '잘림'} · 키패드 ${bt.pad} · 전장 ${bt.canvas}`);
  await clickText('잠깐'); await wait(300); await clickText('그만하기'); await wait(800);
}

ok(errs.length === 0, `P5 콘솔 에러 0 ${errs.slice(0, 4).join(' | ')}`);
await b.close();
console.log(fails.length ? `❌ E2E-PLAY 실패 ${fails.length}` : '✅ E2E-PLAY PASS');
process.exit(fails.length ? 1 : 0);
