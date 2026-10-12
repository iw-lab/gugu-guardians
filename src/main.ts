import './gb/gb-ui.css';
import './style.css';
import { mount } from './ui/dom';
import { loadAll } from './render/assets';
import { installUnlockHooks, playBgm } from './render/audio';
import { buildBattle, type BattleResult } from './ui/battle';
import {
  mapScreen, prepScreen, gateScreen, resultScreen, summonScreen,
  codexScreen, srsScreen, reportScreen, settingsScreen, missionsScreen,
  type ResultPayload, type GatePayload,
} from './ui/screens';
import { homeScreen, tableScreen, finishRun, leaveRun, type RunPayload } from './ui/home';
import { modeResultScreen } from './ui/modeResult';
import { modeStage } from './sim/modes';
import { reconcileDeck } from './sim/units';
import { ownedIds } from './ui/screens';
import { matchInk } from './sim/economy';
import { bump, rollDaily } from './meta/daily';
import * as store from './save/store';
import { revokeConsent } from './net/board';
import { initAap, aapState } from './net/aap';
import { showAapBadge } from './ui/aapBadge';
import { weekKey, today } from './edu/date';
import { stageDef } from './sim/stages';

/**
 * 구구성 수호대 — 부트스트랩 & 화면 라우터.
 * 로그인·서버 없음. 모든 기록은 이 기기 localStorage 에만 남는다.
 */

const root = document.getElementById('app')!;

// QA/E2E 훅 — 🔴 `window.game`은 DOM id에 점유될 수 있어 고유 키를 쓴다
declare global {
  interface Window { __gugu__?: Record<string, unknown> }
}

function applySettings(): void {
  const d = store.load();
  document.documentElement.style.setProperty('--fs', String(d.settings.fontScale));
}

/** 주 1회 θ 스냅샷 — 리포트의 "4주 변화"를 계산하려면 시계열이 필요하다 */
function snapshotWeekly(): void {
  store.update((d) => {
    const wk = weekKey(today());
    const last = d.edu.thetaWeekly[d.edu.thetaWeekly.length - 1];
    if (last?.week === wk) { last.theta = { ...d.edu.theta }; return; }
    d.edu.thetaWeekly.push({ week: wk, theta: { ...d.edu.theta } });
    if (d.edu.thetaWeekly.length > 52) d.edu.thetaWeekly.shift();
  });
}

/**
 * 화면 → 음악. 전투만 곡이 바뀌고 나머지는 같은 곡을 이어 튼다
 * (화면을 옮길 때마다 음악이 끊기면 산만하다 — `playBgm` 이 같은 곡이면 아무 일도 안 한다).
 */
function bgmFor(screen: string, payload?: unknown): void {
  if (screen === 'battle') {
    const stage = (payload as { stage?: number } | undefined)?.stage ?? 1;
    playBgm(stageDef(stage).boss || stageDef(stage).endless ? 'boss' : 'battle');
    return;
  }
  playBgm('field');
}

let currentScreen = '';
function go(screen: string, payload?: unknown): void {
  currentScreen = screen;
  bgmFor(screen, payload);
  switch (screen) {
    case 'menu':
      mount(root, () => homeScreen(go));
      break;
    case 'missions':
      mount(root, () => missionsScreen(go));
      break;
    case 'table':
      mount(root, () => tableScreen(go));
      break;
    case 'modeResult':
      mount(root, () => modeResultScreen(go, payload as BattleResult));
      break;
    case 'map':
      mount(root, () => mapScreen(go, payload));
      break;
    case 'summon':
      mount(root, () => summonScreen(go));
      break;
    case 'prep':
      mount(root, () => prepScreen(go, Number(payload)));
      break;
    case 'battle': {
      const p = payload as RunPayload;
      const save0 = store.load();
      const deck = p.deck ?? reconcileDeck(save0.deck, ownedIds());
      const date = today();
      const mstage = p.mode === 'classic' ? undefined : modeStage(p.mode, save0.progress.maxStage, { table: p.table, date });
      const stageN = p.stage ?? mstage?.index ?? Math.max(1, save0.progress.maxStage + 1);
      mount(root, () => buildBattle(stageN, deck, (r: BattleResult) => {
        snapshotWeekly();
        /**
         * 🔴 **판 보상은 승패와 무관하게 여기서 준다.** 관문(gate)은 이겨야 가는 곳이라
         *    거기서만 주면 패배가 보상 0 이 되고, 그러면 막힌 아이는 전력을 올릴 방법이
         *    영영 없다(순환). 맞힌 문제 수만큼 주므로 **진 판도 공부한 만큼은 남는다.**
         */
        const ink = matchInk(r.correct, r.stage);
        if (ink > 0) store.update((d) => { d.currency.meokmul += ink; });
        /**
         * 오늘의 임무 진행도 — **이기든 지든** 올린다. 판 보상과 같은 이유다:
         * 막힌 아이에게도 오늘 할 것이 끝나야 한다. 'clear'(길 깨기)만 승리 조건이다.
         */
        store.update((d) => {
          let s = rollDaily(d.daily);
          s = bump(s, 'play', 1);
          s = bump(s, 'correct', r.correct);
          s = bump(s, 'combo', r.maxCombo);
          s = bump(s, 'fast', r.fastCorrect);
          s = bump(s, 'srs', r.srsAdvanced);
          if (r.status === 'win') s = bump(s, 'clear', 1);
          d.daily = s;
        });
        // 학교 점수 정산(판 하나에 한 번 · 이기든 지든) — 판 보상 지급 «뒤»에 둔다(match-reward 배선 시험)
        void finishRun(r.status === 'win');
        // 모드 판은 모드 결과 화면으로(캠페인 진도·별과 섞지 않는다)
        if (r.mode !== 'classic') { go('modeResult', { ...r, matchInk: ink }); return; }
        // 이겼을 때만 봉인 해제(관문)로 간다. 졌으면 바로 결과 — 학습은 이미 전투 중에 했다.
        if (r.status === 'win') go('gate', { ...r, matchInk: ink });
        else go('result', { ...r, starN: 0, gateCorrect: 0, gateTotal: 5, matchInk: ink });
      }, { ...(mstage ? { stage: mstage } : {}), ...(p.table ? { table: p.table } : {}), date, onQuit: () => { leaveRun(); go('menu'); } }));
      break;
    }
    case 'gate':
      mount(root, () => gateScreen(go, payload as GatePayload));
      break;
    case 'result':
      mount(root, () => resultScreen(go, payload as ResultPayload));
      break;
    case 'codex':
      mount(root, () => codexScreen(go));
      break;
    case 'srs':
      mount(root, () => srsScreen(go));
      break;
    case 'report':
      mount(root, () => reportScreen(go));
      break;
    case 'settings':
      mount(root, () => settingsScreen(go));
      break;
    default:
      mount(root, () => homeScreen(go));
  }
  window.__gugu__ = { ...(window.__gugu__ ?? {}), screen, ready: true, aap: aapState() };
  syncRotate();
}

async function boot(): Promise<void> {
  applySettings();
  installUnlockHooks();   // 🔴 첫 사용자 입력에서 AudioContext 언락 (없으면 배포 후 무음)

  // 🚪 알찬에서 넘어왔다면 신원을 받는다. **에셋 로딩과 나란히 돌린다** —
  //    이걸 기다리느라 게임 시작이 늦어지면 안 된다(로그인 없는 게임이라는 성질을 지킨다).
  //    ⚠️ `initAap` 은 절대 던지지 않는다(안에서 다 잡는다). 그래도 방어를 한 겹 더 둔다 —
  //       여기서 던지면 boot 의 catch 가 물어 **게임 전체가 "문제가 생겼어요"로 죽는다.**
  const identity = initAap().catch(() => undefined);

  const bar = document.createElement('div');
  bar.className = 'boot';
  bar.textContent = '셈나라를 여는 중… 0%';
  root.replaceChildren(bar);

  await loadAll((done, total) => {
    bar.textContent = `셈나라를 여는 중… ${Math.round((done / total) * 100)}%`;
  });

  snapshotWeekly();
  // 개인 주간 순위 폐지(v2.0 · 사용자 2026-10-12 «학교 순위로 교체») — 예전에 켠 기기는 한 번 «잊어 줘»를 보내
  //   서버에 남은 별명·기록을 지우고 동의를 내린다(revokeConsent = /forget). 다시 켤 단추는 없다.
  if (store.load().board.consent) revokeConsent();
  go('menu');

  // 🔴 **신원을 기다리지 않는다.** 처음엔 여기서 `await identity` 를 했는데, 그러면 바로 위
  //    주석("게임 시작이 늦어지면 안 된다")과 코드가 정면으로 어긋난다 — 에셋이 다 받아져
  //    진행바가 100% 를 찍어도 화면은 신원이 올 때까지 멈춰 있다. 최악은 discovery·JWKS
  //    두 번(회전 시 세 번) 왕복 × 5초 상한이라 학교망에서 체감 프리징이 된다.
  //    (2026-08-22 Gemini 레인 — **내가 쓴 주석이 내 코드를 고발했다.**)
  //    배지는 늦게 붙어도 아무 문제가 없다. 메뉴가 늦게 뜨는 것만 문제다.
  void identity.then(() => {
    showAapBadge(aapState());
    // QA/E2E 훅도 같이 갱신한다 — `go()` 안에서만 쓰면 신원이 늦게 와도 화면 전환 전까지
    // 옛 값(`none`)이 남아, 자동화가 "연결 안 됨"으로 오독한다.
    window.__gugu__ = { ...(window.__gugu__ ?? {}), aap: aapState() };
  });
}

// 가로 모드 안내 — 세로에서는 힌트를 띄운다(CSS가 landscape에서 자동으로 숨긴다)
const rotate = document.getElementById('rotate-hint');
function syncRotate(): void {
  if (!rotate) return;
  // 세로 폰: 첫 화면·도감·학교 고르기는 세로로도 쓴다. 가로가 꼭 필요한 건 전장뿐이다
  rotate.hidden = window.innerWidth >= window.innerHeight || currentScreen !== 'battle';
}
window.addEventListener('resize', syncRotate);
// 큰 화면(PC 1920·전자칠판 4K) — 글자·단추·카드를 화면에 비례해 키운다(CSS 의 zoom: var(--k)). 1280×720 이하는 1.
function syncScale(): void {
  const k = Math.max(1, Math.min(3, Math.min(window.innerWidth / 1280, window.innerHeight / 720)));
  document.documentElement.style.setProperty('--k', k.toFixed(3));
}
window.addEventListener('resize', syncScale);
syncScale();
window.addEventListener('orientationchange', syncRotate);
syncRotate();

// 전체화면은 키트(gb-fullscreen)가 맡는다 — 출전 단추(gbGate) 안에서 자동 · 홈·전장의 ⛶ 단추.
//   옛 «가로 폰 첫 터치 자동»(ui/fullscreen.ts)은 키트와 둘이 같이 돌면 토글이 엇갈려 뺐다.

boot().catch((e: unknown) => {
  root.replaceChildren();
  const msg = document.createElement('div');
  msg.className = 'boot';
  msg.textContent = '문제가 생겼어요. 새로고침해 주세요.';
  root.append(msg);
  console.error('[gugu] boot 실패', e);
});
