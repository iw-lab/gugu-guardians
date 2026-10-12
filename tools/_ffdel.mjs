// Firefly «제목 없음» 보드 삭제(사용자 허락 2026-10-12: 구구성 3D 변환이 자동으로 만든 보드만) — 목록 파일의 시각 하나씩
import puppeteer from 'puppeteer';
import fs from 'node:fs';
const list = fs.readFileSync(process.argv[2],'utf8').split('\n').filter(Boolean);
const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9230', defaultViewport: null });
const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
const W=(ms)=>new Promise(r=>setTimeout(r,ms));
const deepFind = (pred) => p.evaluate((src)=>{ const f=eval(src); const out=[]; const walk=(n)=>{ if(!n) return; if(n.shadowRoot) walk(n.shadowRoot); for(const c of n.children||[]) walk(c); if(n.nodeType===1 && f(n)) { const b=n.getBoundingClientRect(); if (b.width>0) out.push({tag:n.tagName,t:(n.getAttribute('aria-label')||n.textContent||'').trim().replace(/\s+/g,' '), x:b.x+b.width/2, y:b.y+b.height/2}); } }; walk(document.body); return out; }, pred.toString());
const poll = async (fn, n=15) => { for (let k=0;k<n;k++){ const r=await fn(); if (r) return r; await W(1500);} return null; };
await p.goto('https://firefly.adobe.com/your-stuff?tab=your-files&type=boards', { waitUntil: 'domcontentloaded', timeout: 60000 }); await W(8000);
let done = 0;
for (const t of list) {
  await p.goto('https://firefly.adobe.com/your-stuff?tab=your-files&type=boards', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {}); await W(6000);
  const s = await poll(async()=> (await deepFind((n)=>{ if(n.tagName!=='INPUT') return false; const b=n.getBoundingClientRect(); return b.y<200 && b.x>700; }))[0]);
  if (!s) { console.log('검색창 없음'); break; }
  await p.mouse.click(s.x, s.y, {clickCount:3}); await p.keyboard.press('Backspace'); await p.keyboard.type(t); await p.keyboard.press('Enter');
  const tt = await poll(async()=> (await deepFind((n)=>[...n.childNodes].some(x=>x.nodeType===3&&/^제목 없음 - 2026년 10월 12일/.test(x.textContent.trim())))).find(o=>o.t.endsWith(t)), 20);
  if (!tt) { console.log(t, '못 찾음'); continue; }
  const all = await deepFind((n)=>[...n.childNodes].some(x=>x.nodeType===3&&/^제목 없음 - /.test(x.textContent.trim())));
  if (all.filter(o=>o.t.endsWith(t)).length !== 1) { console.log(t, '같은 제목 여럿 — 건너뜀'); continue; }
  await p.mouse.move(tt.x, tt.y - 90); await W(800);
  const menu = (await deepFind((n)=>/ACTION-BUTTON/.test(n.tagName) && /액션 메뉴/.test(n.getAttribute('aria-label')||''))).find(o=>Math.abs(o.x-(tt.x+38))<60 && o.y<tt.y && o.y>tt.y-200);
  if (!menu) { console.log(t, '메뉴 없음'); continue; }
  await p.mouse.click(menu.x, menu.y); await W(1000);
  const del = await poll(async()=> (await deepFind((n)=>/MENU-ITEM/.test(n.tagName) && /^삭제$/.test((n.textContent||'').trim())))[0], 5);
  if (!del) { console.log(t, '삭제 항목 없음'); await p.keyboard.press('Escape'); continue; }
  await p.mouse.click(del.x, del.y); await W(1200);
  const conf = await poll(async()=> (await deepFind((n)=>/BUTTON/.test(n.tagName) && /^삭제$/.test((n.textContent||'').trim()) && n.closest && true)).filter(o=>o.y>200).pop(), 5);
  if (conf) { await p.mouse.click(conf.x, conf.y); await W(2500); }
  done++; console.log(t, '삭제', conf ? '(확인창)' : '');
}
console.log('삭제', done, '/', list.length);
await p.close(); b.disconnect();
