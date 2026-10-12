#!/usr/bin/env node
/**
 * e2e-legend.mjs — 전설 셈지기 차별화가 **실제 화면에** 나는가 (REMASTER v2.0 · 2026-10-12 사용자 «전설급은 크기·공격 이펙트·효과음·등장 차별화 돼 있지?»)
 *   node tools/e2e-legend.mjs <주소> [스크린샷 폴더]
 * 확인:
 *  L1 전설을 출전시키면 «전설 강림» 연출이 난다(fx.arrivals > 0) — 등장 순간 스크린샷
 *  L2 전설 특별기술 연출이 난다(fx.skills > 0)
 *  L3 전설 전용 효과음 두 개(legend·skill)를 실제로 받아 온다(네트워크 200)
 *  L4 콘솔·페이지 에러 0
 * 🔴 «목록에 없어요»(학교 없음)만 밟는다 — 배포본에서 학교를 고르면 아이들 순위판에 기록된다.
 */
import puppeteer from 'puppeteer';
import fs from 'node:fs';

const url = process.argv[2];
const out = process.argv[3] || '/tmp/gugu-legend';
if (!url) { console.log('사용: node tools/e2e-legend.mjs <주소> [스크린샷 폴더]'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });
const roster = JSON.parse(fs.readFileSync(new URL('../data/roster.json', import.meta.url), 'utf8'));
const LEGEND = roster.allies.find((u) => u.rarity === 'legend').id;   // 손으로 적지 않는다 — 로스터가 바뀌면 없는 유닛을 쥐어 준다
const b = await puppeteer.launch({ executablePath: process.env.CHROME || undefined, headless: 'new', pipe: true,
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
const fails = [];
const ok = (c, m) => { console.log(`${c ? '✅' : '❌'} ${m}`); if (!c) fails.push(m); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const p = await b.newPage();
await p.setViewport({ width: 1280, height: 720 });
const errs = []; const sfx = new Map();
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => { if (m.type() === 'error' && !/favicon|404|api\/hub/.test(m.text())) errs.push(m.text()); });
p.on('response', (r) => { const m = r.url().match(/audio\/sfx\/(legend|skill)\.ogg/); if (m) sfx.set(m[1], r.status()); });

await p.goto(url, { waitUntil: 'networkidle2' });
await p.evaluate((legend) => {
  const ids = ['jipsin', 'kkachi', 'musoe', legend];
  localStorage.clear();
  localStorage.setItem('gugu:save', JSON.stringify({ version: 6, data: {
    progress: { maxStage: 12, cleared: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [String(i + 1), 3])) },
    roster: Object.fromEntries(ids.map((id) => [id, { level: 5, shards: 0 }])),
    deck: ids, codex: { unlocked: ids }, upgrades: { mana: 6, regen: 5, cannon: 5 } } }));
}, LEGEND);
await p.reload({ waitUntil: 'networkidle2' }); await wait(1500);
await p.click('[data-gb="play"]').catch(() => {}); await wait(2000);
await p.click('[data-gb-none]').catch(() => {}); await wait(2500);
ok(await p.evaluate(() => window.__gugu__?.screen === 'battle'), '전장 진입');

// 정답을 넣어 셈력을 모으고, 전설 카드가 눌리면 출전시킨다
let shot = false, t0 = Date.now(), arrivals = 0, skills = 0;
while (Date.now() - t0 < 90000) {
  const q = await p.evaluate(() => document.querySelector('.quiz .q')?.textContent || '');
  const m = q.match(/(\d+)\s*([+−×÷-])\s*(\d+)/);
  if (m) { const a = +m[1], c = +m[3]; const ans = m[2] === '+' ? a + c : m[2] === '×' ? a * c : m[2] === '÷' ? Math.floor(a / c) : a - c;
    for (const ch of String(ans)) await p.keyboard.press(ch); }
  await p.evaluate(() => { const c = document.querySelector('.dcard.r-legend'); if (c && !c.disabled) c.click(); });
  const fx = await p.evaluate(() => window.__gugu__?.fx || {});
  if (fx.arrivals > arrivals && !shot) { await wait(350); await p.screenshot({ path: `${out}/legend-arrive.png` }); shot = true; }
  arrivals = fx.arrivals || 0; skills = fx.skills || 0;
  if (shot && skills > 0) { await wait(1500); await p.screenshot({ path: `${out}/legend-field.png` }); break; }
  await wait(450);
}
ok(arrivals > 0, `L1 전설 강림 연출 ${arrivals}회 (스크린샷 ${shot ? out + '/legend-arrive.png' : '없음'})`);
ok(skills > 0, `L2 전설 특별기술 연출 ${skills}회`);
ok(sfx.get('legend') === 200 && sfx.get('skill') === 200, `L3 전설 효과음 받음 legend=${sfx.get('legend')} skill=${sfx.get('skill')}`);
ok(errs.length === 0, `L4 콘솔 에러 0 ${errs.slice(0, 3).join(' | ')}`);
await b.close();
console.log(fails.length ? `❌ E2E-LEGEND 실패 ${fails.length}` : '✅ E2E-LEGEND PASS');
process.exit(fails.length ? 1 : 0);
