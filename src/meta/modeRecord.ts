import * as store from '../save/store';
import type { BattleResult } from '../ui/battle';

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
        if (r.score > m.bigBest) { m.bigBest = r.score; if (r.status !== 'win') best = true; }
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

