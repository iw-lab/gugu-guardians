import { el, btn } from './dom';
import { MODES, modeScoreLabel } from '../sim/modes';
import type { BattleResult } from './battle';
import { startRun } from './home';
import { recordMode } from '../meta/modeRecord';
export { recordMode, ruleStars } from '../meta/modeRecord';

type Go = (screen: string, payload?: unknown) => void;

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
