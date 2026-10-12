import puppeteer from 'puppeteer';
const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9230', defaultViewport: null });
const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
const W=(ms)=>new Promise(r=>setTimeout(r,ms));
await p.goto('https://firefly.adobe.com/your-stuff?tab=deleted', { waitUntil: 'domcontentloaded', timeout: 60000 }); await W(12000);
const t = await p.evaluate(() => { const out=[]; const walk=(n)=>{ if(!n) return; if(n.shadowRoot) walk(n.shadowRoot); for(const c of n.children||[]) walk(c); if(n.nodeType===1) for (const x of n.childNodes) if (x.nodeType===3 && x.textContent.trim()) out.push(x.textContent.trim()); }; walk(document.body); return out; });
console.log(p.url()); console.log(t.filter(x=>/삭제|제목 없음|영구|휴지|보관|일 후/.test(x)).slice(0,15).join('\n'));
await p.screenshot({ path: '/private/tmp/claude-501/gg/ff/trash.png' });
await p.close(); b.disconnect();
