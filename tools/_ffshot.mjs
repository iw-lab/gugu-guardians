import puppeteer from 'puppeteer';
import fs from 'node:fs';
const list = fs.readFileSync('/private/tmp/claude-501/gg/ff/amb.txt','utf8').split('\n').filter(Boolean);
const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9230', defaultViewport: null });
const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
const W=(ms)=>new Promise(r=>setTimeout(r,ms));
const deepFind = (pred) => p.evaluate((src)=>{ const f=eval(src); const out=[]; const walk=(n)=>{ if(!n) return; if(n.shadowRoot) walk(n.shadowRoot); for(const c of n.children||[]) walk(c); if(n.nodeType===1 && f(n)) { const b=n.getBoundingClientRect(); if (b.width>0) out.push({t:(n.textContent||'').trim(), x:b.x+b.width/2, y:b.y+b.height/2}); } }; walk(document.body); return out; }, pred.toString());
await p.goto('https://firefly.adobe.com/your-stuff?tab=your-files&type=boards', { waitUntil: 'domcontentloaded', timeout: 60000 }); await W(9000);
for (const t of list) {
  let s = [];
  for (let k = 0; k < 20 && !s.length; k++) { s = await deepFind((n)=>{ if(n.tagName!=='INPUT') return false; const b=n.getBoundingClientRect(); return b.y<200 && b.x>700; }); if (!s.length) await W(1500); }
  if (!s.length) { console.log('검색창 없음'); await p.screenshot({path:'/private/tmp/claude-501/gg/ff/nosearch.png'}); break; }
  await p.mouse.click(s[0].x, s[0].y, {clickCount:3}); await p.keyboard.type(t); await p.keyboard.press('Enter'); await W(7000);
  let tt = null;
  for (let k = 0; k < 15 && !tt; k++) { tt = (await deepFind((n)=>[...n.childNodes].some(x=>x.nodeType===3&&/^제목 없음/.test(x.textContent.trim())))).find(o=>o.t.includes(t)); if (!tt) await W(1500); }
  if (tt) await p.screenshot({ path: `/private/tmp/claude-501/gg/ff/amb-${t}.png`, clip: { x: tt.x-110, y: tt.y-170, width: 220, height: 200 } });
  console.log(t, !!tt);
}
await p.close(); b.disconnect();
