import { BOSSES, stageDef, CHAPTER_LEN } from './stages';
import type { DailyMod, ModeKind, SpawnEntry, StageDef } from './types';
import type { IconName } from '../ui/icons';

/** 수문장(보스) 출전 항목 — stageDef 는 보스를 every 9999 · cap 1 로 세운다 */
export const isGatekeeper = (e: SpawnEntry): boolean => e.cap === 1 && e.every >= 9999;

/**
 * 모드 6종(REMASTER-GDD R-2) — 캠페인 판 정의(stageDef)를 바탕으로 «한 가지 규칙만 비튼» 판을 만든다.
 * 🔴 수치는 새로 짓지 않는다. 적 예산·배율·문항 유형은 전부 stageDef 에서 온다 —
 *    모드마다 따로 밸런스를 지으면 캠페인 프로브(tools/balance-probe.mjs)가 못 보는 구멍이 생긴다.
 * 판 번호 기준 = 아이가 깬 가장 먼 판(maxStage). 처음 온 아이(0)도 1~3판 수준에서 시작한다.
 */

export interface ModeInfo {
  id: ModeKind;
  /** 화면 아이콘 이름(src/ui/icons.ts) — 이모지 금지 */
  icon: IconName;
  label: string;
  /** 카드 설명 한 줄(키트 게이트 B4 — 두 줄이면 카드 높이가 갈라진다) */
  desc: string;
}

export const MODES: readonly ModeInfo[] = [
  { id: 'classic', icon: 'castle', label: '구역 원정', desc: '판을 하나씩 깨며 셈나라를 되찾아요' },
  { id: 'time', icon: 'timer', label: '번개 전투', desc: '90초 · 성 부수면 +12초 · 오답 −3초' },
  { id: 'survival', icon: 'shield', label: '끝없는 방어', desc: '점점 세지는 파도를 몇 번 버틸까?' },
  { id: 'rule', icon: 'times', label: '구구단 정복', desc: '한 단만 나와요 · 단 대장을 쓰러뜨려요' },
  { id: 'big', icon: 'crown', label: '보스 연전', desc: '보스 6마리를 차례로 · 전자칠판 추천' },
  { id: 'daily', icon: 'calendar', label: '오늘의 전장', desc: '하루 한 판 · 매일 규칙 하나가 바뀌어요' },
];

const DAILY_MODS: readonly { id: DailyMod; label: string }[] = [
  { id: 'fast', label: '번개 괴수 — 괴수가 빨라요' },
  { id: 'rich', label: '샘물 넘침 — 셈력이 빨리 차요' },
  { id: 'giant', label: '거인 괴수 — 적은 적고 단단해요' },
  { id: 'swarm', label: '떼거리 — 약한 괴수가 우르르' },
];

/** 깬 판 → 모드 기준 판(처음 온 아이는 3판) */
function baseOf(maxStage: number): number { return Math.max(3, Math.floor(maxStage)); }

/** 날짜(YYYY-MM-DD) → 32비트 해시 — 같은 날 같은 판(DoD 10) */
export function dayHash(date: string): number {
  let h = 2166136261;
  for (let i = 0; i < date.length; i++) { h ^= date.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function dailyMod(date: string): { id: DailyMod; label: string } {
  return DAILY_MODS[dayHash(date) % DAILY_MODS.length]!;
}

/**
 * 모드 판 정의.
 * @param opt.table 구구단 정복의 단(2~9) · @param opt.date 오늘의 전장 날짜
 */
export function modeStage(kind: ModeKind, maxStage: number, opt: { table?: number; date?: string } = {}): StageDef {
  const base = baseOf(maxStage);
  switch (kind) {
    case 'time': {
      const s = stageDef(base);
      return { ...s, name: '번개 전투', boss: false, mode: { kind, clock: { start: 90, perCastle: 12, perWrong: 3 } } };
    }
    case 'survival': {
      // 출전표는 비운다 — 파도는 Battle.modeTick 이 stageDef(base + 2k) 에서 22초마다 덧붙인다
      const s = stageDef(Math.max(1, base - 2));
      return { ...s, name: '끝없는 방어', boss: false, spawns: [], mode: { kind, waves: { every: 22, base: Math.max(1, base - 2), step: 2 } } };
    }
    case 'rule': {
      const t = Math.max(2, Math.min(9, Math.floor(opt.table ?? 2)));
      // 단 대장 = 그 구역의 수문장 판(10·20·30…) 그대로. 처음 온 아이는 10판(첫 수문장)
      const at = Math.max(CHAPTER_LEN, Math.floor(maxStage / CHAPTER_LEN) * CHAPTER_LEN);
      const s = stageDef(at);
      const bossId = BOSSES[(t - 2) % BOSSES.length]!;
      // 수문장 항목 = every 9999(stageDef 가 그렇게 세운다) — cap 1 잡몹과 헷갈리지 않게 주기로 가린다
      const spawns = s.spawns.map((e) => (isGatekeeper(e) ? { ...e, id: bossId } : e));
      return { ...s, name: `${t}단 정복`, spawns, quizTypes: [t <= 5 ? 'M1' : 'M2'], mode: { kind, table: t } };
    }
    case 'big': {
      // 호위 잡몹은 절반만 — 주인공은 보스 6마리다
      const s = stageDef(Math.max(5, base));
      const spawns = s.spawns.filter((e) => !isGatekeeper(e)).map((e) => ({ ...e, cap: Math.max(1, Math.round(e.cap * 0.5)) }));
      return { ...s, name: '보스 연전', boss: true, spawns, mode: { kind, bossRush: [...BOSSES] } };
    }
    case 'daily': {
      const date = opt.date ?? '2026-01-01';
      const h = dayHash(date);
      const idx = Math.max(1, base + (h % 5) - 2);
      const s = stageDef(idx);
      return { ...s, name: '오늘의 전장', mode: { kind, mod: dailyMod(date).id } };
    }
    default:
      return stageDef(Math.max(1, Math.floor(maxStage) || 1));
  }
}

/** 판 끝 기록 한 줄(결과 화면·모드 카드 배지) */
export function modeScoreLabel(kind: ModeKind, v: number): string {
  switch (kind) {
    case 'time': return `성 ${v}개`;
    case 'survival': return `파도 ${v}`;
    case 'big': return v > 0 ? `${Math.floor(v / 60)}분 ${v % 60}초` : '-';
    case 'daily': return `${v}일 승리`;
    case 'rule': return `★ ${v}`;
    default: return `${v}판`;
  }
}
