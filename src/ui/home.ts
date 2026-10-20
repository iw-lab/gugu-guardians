import { icon, iconSvg, type IconName } from './icons';
import { el, btn } from './dom';
import * as store from '../save/store';
import { MODES, modeScoreLabel, dailyMod } from '../sim/modes';
import type { ModeKind } from '../sim/types';
import { chapterOf, CHAPTER_LEN } from '../sim/stages';
import { ALLIES } from '../sim/units';
import { assetUrl } from '../render/assets';
import { play } from '../render/audio';
import { today } from '../edu/date';
import { mountSchoolRank, refreshSchoolRank, gbGate, gbFinish, gbLeave, configureSchool } from '../gb/gb-school.js';
import { bindFullscreenButton } from '../gb/gb-fullscreen.js';
import { renderModeCards } from '../gb/gb-modes.js';
import { configureHub } from '../gb/hubnet.js';

/**
 * 첫 화면 — game-builder 기본틀(kit/school-hub · REMASTER-GDD R-1)
 *   ① 맨 위 학교 순위(접지 않음) ② 주 단추 1개(«출전» = 다음 판 바로) ③ 같은 모양 모드 카드 6장 ④ 보조 줄
 * 판 시작은 언제나 startRun() 하나 — 클릭 «안에서 바로» gbGate 를 불러야 자동 전체화면이 된다(키트 README).
 */
type Go = (screen: string, payload?: unknown) => void;

let hubReady = false;
export function initHub(): void {
  if (hubReady) return;
  hubReady = true;
  // 단일 HTML·아티팩트 빌드에는 /api/hub 중계가 없다 — 키트가 «안 닿음»으로 보고 학교 점수 없이 판을 연다
  configureHub({ key: 'gugu.hub.v1', direct: 'https://gugu-hub.starlight-heroes.workers.dev' });
  configureSchool({ freePlay: true, playWord: '출전', sfx: { tick: () => play('tap'), win: () => play('win') } });
}

/** 지금 판의 학교 점수 영수증 — 판 하나에 하나(이기든 지든 gbFinish, 중간에 나가면 gbLeave) */
let ticket: string | null = null;
let starting = false;
export interface RunPayload { mode: ModeKind; stage?: number; table?: number; deck?: string[] }

/** 판 시작 관문 — 시작 단추 클릭 핸들러에서 «바로» 부른다 */
export function startRun(go: Go, p: RunPayload): void {
  if (starting) return;
  if (ticket) { void gbLeave(ticket); ticket = null; }
  starting = true;
  let launched = false;
  void gbGate((ref) => {
    launched = true;
    ticket = ref;
    try { go('battle', p); } catch (e) { if (ticket === ref) { void gbLeave(ref); ticket = null; } throw e; } finally { starting = false; }
  }, { kind: p.mode === 'classic' ? 'level' : p.mode }).finally(() => { if (!launched) starting = false; });
}

/** 판 끝 — 학교 점수 정산 후 토스트 */
export async function finishRun(won: boolean): Promise<void> {
  const ref = ticket; ticket = null;
  if (!ref) return;
  const r = await gbFinish(ref, won);
  if (r && r.added > 0 && r.school) toast(`${r.school} +${r.added}점!`, 'school');
}
/** 판 중간에 나감 */
export function leaveRun(): void { const ref = ticket; ticket = null; if (ref) void gbLeave(ref); }

export function toast(text: string, ic?: IconName): void {
  const t = el('div', { class: 'gg-toast', role: 'status' }, ...(ic ? [icon(ic), ' ', text] : [text]));
  document.body.append(t);
  setTimeout(() => t.classList.add('out'), 2400);
  setTimeout(() => t.remove(), 3000);
}

function bestText(kind: ModeKind): string {
  const d = store.load();
  const m = d.modes;
  switch (kind) {
    case 'classic': return d.progress.maxStage ? `${chapterOf(d.progress.maxStage)}구역 ${((d.progress.maxStage - 1) % CHAPTER_LEN) + 1}판` : '';
    case 'time': return m.time ? `최고 ${modeScoreLabel('time', m.time)}` : '';
    case 'survival': return m.survival ? `최고 ${modeScoreLabel('survival', m.survival)}` : '';
    case 'rule': { const n = Object.values(m.rule).reduce((s, v) => s + v, 0); return n ? `★ ${n}/24` : ''; }
    case 'big': return m.big ? `최단 ${modeScoreLabel('big', m.big)}` : m.bigBest ? `최고 보스 ${m.bigBest}마리` : '';
    case 'daily': return m.daily.date === today() ? `오늘 승리 ✓ · 총 ${m.daily.streak}일` : m.daily.streak ? `총 ${m.daily.streak}일 승리` : '';
  }
}

export function homeScreen(go: Go): { node: HTMLElement; teardown?: () => void } {
  initHub();
  const d = store.load();
  const next = Math.max(1, d.progress.maxStage + 1);
  const fsBtn = el('button', { class: 'gb-icon', type: 'button', 'data-gb': 'fullscreen', 'aria-label': '전체화면' }, '⛶');
  bindFullscreenButton(fsBtn);
  const rank = el('div', { id: 'schoolRank' });
  const grid = el('div', { id: 'modeGrid' });
  renderModeCards(grid, MODES.map((m) => ({ id: m.id, kind: m.id, icon: iconSvg(m.icon), label: m.label, desc: m.id === 'daily' ? `오늘: ${dailyMod(today()).label.split(' — ')[0]}` : m.desc, best: bestText(m.id) })), (id) => {
    const kind = id as ModeKind;
    play('tap');
    if (kind === 'classic') { go('map'); return; }
    if (kind === 'rule') { go('table'); return; }
    startRun(go, { mode: kind });
  });
  // 처음 온 아이 = 1판 · 해 본 아이 = 다음 판 «바로»(지도·준비 화면을 건너뛴다 — 고르고 싶으면 «구역 원정» 카드)
  const playBtn = btn(d.progress.maxStage ? `출전! ${chapterOf(next)}구역 ${((next - 1) % CHAPTER_LEN) + 1}판` : '출전!', () => startRun(go, { mode: 'classic', stage: next }), 'gb-play');
  playBtn.dataset['gb'] = 'play';
  playBtn.dataset['gbMode'] = 'classic';
  const owned = Object.keys(d.roster).length;
  const sub = el('div', { class: 'gb-sub' },
    btn([icon('summon'), ' 소환'], () => go('summon')),
    btn([icon('book'), ` 도감 ${owned}/${ALLIES.length}`], () => go('codex')),
    btn([icon('list'), ' 임무'], () => go('missions')),
    btn([icon('seal'), ' 봉인'], () => go('srs')),
    btn([icon('chart'), ' 기록'], () => go('report')),
  );
  const node = el('section', { class: 'screen home-screen' },
    el('div', { class: 'gb-home' },
      el('div', { class: 'gb-home-top' },
        el('div', { class: 'gb-brand' }, el('img', { src: assetUrl('crest_haetae'), alt: '', class: 'brand-crest' }), '구구성 수호대'),
        el('div', { class: 'gb-tools' }, fsBtn, btn([icon('gear')], () => go('settings'), 'gb-icon')),
      ),
      el('div', { class: 'home-cols' },
        el('div', { class: 'home-left' }, rank, playBtn, sub),
        el('div', { class: 'home-right' }, grid),
      ),
    ),
  );
  mountSchoolRank(rank);
  void refreshSchoolRank();
  return { node };
}

/** 구구단 정복 — 단 고르기(2~9) · 단마다 별 */
export function tableScreen(go: Go): { node: HTMLElement } {
  const d = store.load();
  const cells = [2, 3, 4, 5, 6, 7, 8, 9].map((t) => {
    const s = d.modes.rule[String(t)] ?? 0;
    const b = btn('', () => startRun(go, { mode: 'rule', table: t }), 'table-cell');
    b.append(el('b', {}, `${t}단`), el('span', { class: 'stars' }, '★'.repeat(s) + '☆'.repeat(3 - s)));
    b.setAttribute('aria-label', `${t}단 정복, 별 ${s}개`);
    return b;
  });
  const node = el('section', { class: 'screen table-screen' },
    el('div', { class: 'topbar' }, btn('← 뒤로', () => go('menu'), 'btn sm ghost'), el('h2', {}, icon('times'), ' 구구단 정복'), el('span', {})),
    el('p', { class: 'muted' }, '고른 단만 나와요. 단 대장을 쓰러뜨리면 별을 받아요(정답률 70%·85%·95%).'),
    el('div', { class: 'table-grid' }, ...cells),
  );
  return { node };
}
