#!/usr/bin/env node
/**
 * e2e-v2.mjs — v2.0 업그레이드 배포본 e2e (REMASTER-GDD DoD 4·5·11·12·13·16)
 *   node tools/e2e-v2.mjs <주소> [스크린샷 폴더]
 * 🔴 «목록에 없어요»(학교 없음 = 0점) 경로만 밟는다 — 배포본에서 학교를 실제로 고르면 아이들 순위판에 기록된다
 *    (메모리 e2e-against-prod-lands-in-real-users-laps).
 * 확인:
 *  E1 첫 화면 학교 순위 보임 · «문제 풀고 이용권» 단추 없음(FREE_PLAY)
 *  E2 출전 → 학교 정하기 → «목록에 없어요» → 문제 화면 없이 바로 전장(이용권 0) · 자동 전체화면 호출
 *  E3 모드 6종 각각: 카드 → (구구단은 단 고르기) → 전장 HUD 에 모드 표시 → 잠깐 → 그만하기 → 첫 화면
 *  E4 네트워크: /pack·/grade(이용권 문제)·주간 순위(/submit·/top·board) 요청 0
 *  E5 콘솔·페이지 에러 0
 */
import puppeteer from 'puppeteer';
import fs from 'node:fs';

const url = process.argv[2];
const out = process.argv[3] || '/tmp/gugu-e2e';
if (!url) { console.log('사용: node tools/e2e-v2.mjs <주소> [스크린샷 폴더]'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });
const b = await puppeteer.launch({ executablePath: process.env.CHROME || undefined, headless: 'new', pipe: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
const fails = [];
const ok = (c, m) => { console.log(`${c ? '✅' : '❌'} ${m}`); if (!c) fails.push(m); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const p = await b.newPage();
await p.setViewport({ width: 1280, height: 720 });
await p.evaluateOnNewDocument(() => {
  window.__fs = 0;
  const o = Element.prototype.requestFullscreen;
  Element.prototype.requestFullscreen = function (...a) { window.__fs++; return o ? o.apply(this, a).catch(() => {}) : Promise.resolve(); };
});
const errs = []; const reqs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => { if (m.type() === 'error' && !/favicon|404/.test(m.text())) errs.push(m.text()); });
p.on('request', (r) => reqs.push(r.url()));
const vis = (s) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; }, s);
const clickText = (re) => p.evaluate((s) => { const x = [...document.querySelectorAll('button')].find((e) => new RegExp(s).test(e.textContent) && e.getBoundingClientRect().width > 0); if (x) { x.click(); return true; } return false; }, re);
const screen = () => p.evaluate(() => window.__gugu__?.screen);

await p.goto(url, { waitUntil: 'networkidle2' }); await wait(1800);
ok(await vis('[data-gb="school-rank"]'), 'E1 첫 화면 학교 순위 보임');
ok(!(await p.evaluate(() => !!document.querySelector('[data-gb-act="quiz"]'))), 'E1 «문제 풀고 이용권» 단추 없음(FREE_PLAY)');
await p.screenshot({ path: `${out}/home.png` });

await p.click('[data-gb="play"]').catch(() => {}); await wait(2500);
ok(await vis('[data-gb="school-pick"]'), 'E2 새 기기 → 학교 정하기가 뜬다');
await p.click('[data-gb-none]').catch(() => {}); await wait(3000);
ok(!(await vis('[data-gb="quiz"]')), 'E2 문제(이용권) 화면이 안 뜬다');
ok((await screen()) === 'battle', `E2 바로 전장(screen=${await screen()})`);
ok((await p.evaluate(() => window.__fs)) > 0, 'E2 자동 전체화면 호출');
await p.screenshot({ path: `${out}/battle-classic.png` });
await clickText('잠깐'); await wait(300); await clickText('그만하기'); await wait(1500);
ok((await screen()) === 'menu', 'E3 classic 그만하기 → 첫 화면');

// 모드 표시 = .mode-hud 의 SVG 아이콘 + 글자(이모지 금지 — check-no-emoji). 아이콘이 없으면 «모드 HUD» 가 빈 것
const MODES = [['time', '번개 전투', /^부순 성 \d+ \| \d+초$/], ['survival', '끝없는 방어', /^파도 \d+ \|/], ['rule', '구구단 정복', /^7단 \|/], ['big', '보스 연전', /^보스 \d\/6 \|/], ['daily', '오늘의 전장', /^\S.* \| \d+초 \/ \d+초$/]];
for (const [id, label, hud] of MODES) {
  await clickText(label); await wait(1200);
  if (id === 'rule') { await clickText('^\\s*7단'); await wait(1200); }
  await wait(2500);
  const h = await p.evaluate(() => {
    const m = document.querySelector('.mode-hud'); const t = document.querySelector('.bhud .muted');
    return m?.querySelector('svg') ? `${m.textContent.trim()} | ${t?.textContent.trim() ?? ''}` : `(모드 아이콘 없음) ${m?.textContent ?? ''}`;
  });
  ok((await screen()) === 'battle' && hud.test(h), `E3 ${label} 전장 · HUD «${h.slice(0, 60)}»`);
  if (id === 'rule') {
    const qs = new Set();
    for (let i = 0; i < 6; i++) {
      const q = await p.evaluate(() => document.querySelector('.quiz .q')?.textContent || '');
      qs.add(q.trim());
      const m = q.match(/(\d+)\s*×\s*(\d+)/); if (m) for (const ch of String(+m[1] * +m[2])) await p.keyboard.press(ch);
      await wait(700);
    }
    ok([...qs].every((q) => /^7 × \d/.test(q)), `E3 구구단 7단만 나온다 [${[...qs].join(' | ')}]`);
  }
  await p.screenshot({ path: `${out}/battle-${id}.png` });
  await clickText('잠깐'); await wait(300); await clickText('그만하기'); await wait(1500);
  ok((await screen()) === 'menu', `E3 ${label} 그만하기 → 첫 화면`);
}

const bad = reqs.filter((u) => /\/api\/hub\/(pack|grade)|\/submit|\/board|gugu-board/.test(u));
ok(bad.length === 0, `E4 이용권 문제·개인 순위 요청 0 ${bad.length ? bad.slice(0, 3).join(' ') : ''}`);
ok(reqs.some((u) => /\/api\/hub\/spend/.test(u)), 'E4 판 영수증(/api/hub/spend)은 나간다 — 학교 점수 정산 경로 살아 있음');
ok(errs.length === 0, `E5 콘솔 에러 0 ${errs.slice(0, 3).join(' | ')}`);
await b.close();
console.log(fails.length ? `\n❌ e2e-v2 FAIL ${fails.length}` : '\n✅ e2e-v2 PASS');
process.exit(fails.length ? 1 : 0);
