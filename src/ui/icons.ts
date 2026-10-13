/* icons.ts — 게임 화면 아이콘(24px 선 SVG · currentColor). 이모지 대신 쓴다 — 기기마다 모양·색이 달라 먹색 톤이 깨진다
 * (2026-10-13 사용자 «이모지좀 게임화면에 넣지마 촌스러»). 게이트 = game-builder tools/check-no-emoji.mjs
 * 키트 아이콘(gb-icons.js)과 같은 꼴 — 선 2px·둥근 끝 */
const P = {
  castle: '<path d="M4 21V9h3V6h2v3h2V6h2v3h2V6h2v3h3v12z"/><path d="M10 21v-4a2 2 0 0 1 4 0v4"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M10 2h4"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/>',
  times: '<path d="M6 6l12 12M18 6L6 18"/>',
  crown: '<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  play: '<path d="M8 5v14l11-7z" fill="currentColor"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  burst: '<path d="M12 2l2 6 6-2-3 5 5 3-6 1 1 6-5-4-5 4 1-6-6-1 5-3-3-5 6 2z"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="currentColor"/>',
  wave: '<path d="M2 9c2.5-2.5 5-2.5 7.5 0s5 2.5 7.5 0 3.5-2 5-1"/><path d="M2 15c2.5-2.5 5-2.5 7.5 0s5 2.5 7.5 0 3.5-2 5-1"/>',
  school: '<path d="M3 10l9-6 9 6"/><path d="M5 9v11h14V9"/><path d="M10 20v-5h4v5"/>',
  summon: '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><path d="M19 3v4M17 5h4"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M8 7h7"/>',
  list: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9zM9 11h6M9 15h6"/>',
  seal: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
  chart: '<path d="M4 20h16M7 20v-6M12 20V8M17 20v-9"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  box: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  left: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  swords: '<path d="M4 4l12 12M20 4L8 16M14 18l4 2M10 18l-4 2M16 16l2 2M8 16l-2 2"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor"/>',
} as const;
export type IconName = keyof typeof P;

/** 인라인 SVG 문자열 — innerHTML 로 넣을 때 */
export function iconSvg(name: IconName, cls = ''): string {
  return `<svg class="gg-ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name]}</svg>`;
}

/** SVG 노드 — el() 자식으로 바로 넣는다 */
export function icon(name: IconName, cls = ''): SVGSVGElement {
  const t = document.createElement('template');
  t.innerHTML = iconSvg(name, cls);
  return t.content.firstElementChild as SVGSVGElement;
}
