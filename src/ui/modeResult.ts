import { el, btn } from './dom';
import * as store from '../save/store';
import { MODES, modeScoreLabel } from '../sim/modes';
import type { BattleResult } from './battle';
import { startRun } from './home';

type Go = (screen: string, payload?: unknown) => void;

/** 구구단 정복 별 — 이긴 판만, 정답률 70·85·95% (단 대장을 쓰러뜨려야 별이 있다) */
export function ruleStars(r: Pick<BattleResult, 'status' | 'solved' | 'correct'>): number {
  if (r.status !== 'win' || r.solved === 0) return 0;
  const acc = r.correct / r.solved;
  return acc >= 0.95 ? 3 : acc >= 0.85 ? 2 : acc >= 0.7 ? 1 : 0;
}

/**
 * 모드 기록 반영 — 새 최고면 true. 결과 화면이 «새 기록!»을 띄우는 근거라 저장과 판정을 한 곳에서 한다.
 * 오늘의 전장 = 이긴 날 «누적» 일수(같은 날 두 번째 판은 안 올린다).
 * 🔴 «연속 며칠»은 쓰지 않는다 — 하루 빠지면 0 이 되는 숫자는 손실 회피로 아이를 붙잡는다
 *    (todayCard 주석 · 교차검증 부적절 판정). 키트의 «연속 기록»을 이 게임에서는 «누적»으로 바꾼다.
 */
export function recordMode(r: BattleResult): { best: boolean; value: number } {
  let best = false, value = r.score;
  store.update((d) => {
    const m = d.modes;
    switch (r.mode) {
      case 'time': if (r.score > m.time) { m.time = r.score; best = true; } break;
      case 'survival': if (r.score > m.survival) { m.survival = r.score; best = true; } break;
      case 'rule': {
        const k = String(r.table ?? 0); const s = ruleStars(r); value = s;
        if (/^[2-9]$/.test(k) && s > (m.rule[k] ?? 0)) { m.rule[k] = s; best = true; }
        break;
      }
      case 'big': {
        value = Math.round(r.seconds);
        if (r.status === 'win' && (m.big === 0 || value < m.big)) { m.big = value; best = true; }
        break;
      }
      case 'daily': {
        if (r.status !== 'win' || !r.date || m.daily.date === r.date) { value = m.daily.streak; break; }
        m.daily.streak += 1;
        m.daily.date = r.date;
        value = m.daily.streak; best = true;
        break;
      }
      default: break;
    }
  });
  return { best, value };
}

export function modeResultScreen(go: Go, r: BattleResult): { node: HTMLElement } {
  const info = MODES.find((m) => m.id === r.mode) ?? MODES[0]!;
  const { best, value } = recordMode(r);
  const won = r.status === 'win';
  const headline =
    r.mode === 'time' ? `성 ${r.score}개를 부쉈어요!`
    : r.mode === 'survival' ? `파도 ${r.score}번을 버텼어요!`
    : r.mode === 'big' ? (won ? `보스 6마리 완주! ${modeScoreLabel('big', value)}` : `보스 ${r.score}마리를 쓰러뜨렸어요`)
    : r.mode === 'rule' ? (won ? `${r.table}단 정복! ${'★'.repeat(value)}${'☆'.repeat(3 - value)}` : `${r.table}단 대장이 버텼어요 — 다시 도전!`)
    : r.mode === 'daily' ? (won ? `오늘의 전장 승리! 모두 ${value}일` : '오늘의 전장 — 내일 또 도전!')
    : won ? '승리!' : '아쉬워요';
  const acc = r.solved ? Math.round((r.correct / r.solved) * 100) : 0;
  const again = r.mode === 'rule' ? { mode: r.mode, table: r.table } : { mode: r.mode };
  const node = el('section', { class: `screen mode-result ${won ? 'win' : 'lose'}` },
    el('div', { class: 'mr-card' },
      el('div', { class: 'mr-mode' }, `${info.emoji} ${info.label}`),
      el('h2', { class: 'mr-head' }, headline),
      best ? el('div', { class: 'mr-best' }, '🎉 새 기록!') : el('span', {}),
      el('div', { class: 'mr-stats' },
        el('span', {}, `푼 문제 ${r.solved}`), el('span', {}, `정답률 ${acc}%`), el('span', {}, `최고 콤보 ${r.maxCombo}`), el('span', {}, `${Math.round(r.seconds)}초`),
      ),
      el('div', { class: 'row' },
        btn('한 판 더', () => startRun(go, again), 'btn ju big'),
        r.mode === 'rule' ? btn('다른 단', () => go('table'), 'btn') : el('span', {}),
        btn('첫 화면', () => go('menu'), 'btn ghost'),
      ),
    ),
  );
  return { node };
}
