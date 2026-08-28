import { describe, it, expect } from 'vitest';
import { Battle } from '../src/sim/core';
import { stageDef, MAX_SEC } from '../src/sim/stages';
import { ALLY_BY_ID, defaultDeck, progressionAllies } from '../src/sim/units';
import { nextTier } from '../src/sim/tier';

/**
 * 한 아이가 **캠페인을 순서대로 밀고 나가는 경험**을 잰다.
 *
 * 🔴 balance-probe 는 판을 하나씩 떼어 재고, 이 파일은 **이어서** 잰다. 다른 질문이다 —
 *    적응 난이도는 앞판 성적이 다음 판 난이도를 정하므로, 판 하나씩 재면
 *    "잘해서 올라간 아이가 그 다음 판에서 어떤 꼴을 당하는가"를 아무도 안 본다.
 *    사용자가 "2판부터 너무 어렵다"고 한 것이 정확히 그 사각지대였다.
 *
 * 🔴 봇은 **대포를 쓴다**. 프로브 모델도 쓴다. 안 쓰는 봇으로 재면 게임이 아니라
 *    봇의 결함을 재게 된다(실측으로 한 번 속았다 — 대포를 뺀 봇은 ST10 을 12판 전패했고,
 *    그건 교착이었지 난이도가 아니었다. 대포를 켜자 12/12 승).
 */
const DT = 0.1;

function playBot(stage: number, acc: number, seed: number, tier: number, pace: number, cannonP: number) {
  const b = new Battle(stageDef(stage), {}, {}, tier);
  const deck = defaultDeck(progressionAllies(stage).map((u) => u.id));
  const cheapest = Math.min(...deck.map((id) => ALLY_BY_ID.get(id)!.cost));
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const tOk = (a: number) => (2.3 + (1 - a) * 2.4) * pace;
  let nextQuiz = 1.5;
  while (b.status === 'playing' && b.t < MAX_SEC) {
    if (b.t >= nextQuiz) {
      const effAcc = Math.min(0.99, acc + b.dda.level * 0.10);
      const ok = rnd() < effAcc;
      b.answer(ok, (ok ? 2400 : 4000) * pace);
      nextQuiz = b.t + (ok ? tOk(acc) : tOk(acc) + 1.6);
    }
    const buy = deck.map((id) => ALLY_BY_ID.get(id)!)
      .filter((u) => b.canSummon(u.id))
      .filter((u) => u.cost === cheapest || b.money - u.cost >= cheapest * 2)
      .sort((x, y) => y.cost - x.cost);
    if (buy[0]) b.summon(buy[0].id);
    if (b.cannonReady && rnd() < cannonP) b.fireCannon();
    b.step(DT);
  }
  return b;
}

interface Run { entryTier: number[]; stuck: number[]; maxTries: number }

function campaign(acc: number, pace: number, upTo: number, cannonP: number, seed = 20260828): Run {
  let tier = 0, streak = 0, maxTries = 0;
  const entryTier: number[] = [], stuck: number[] = [];
  for (let st = 1; st <= upTo; st++) {
    entryTier.push(tier);          // 이 판을 **들고 들어간** 난이도
    let tries = 0, won = false;
    while (tries < 15 && !won) {
      const b = playBot(st, acc, seed + st * 977 + tries * 31, tier, pace, cannonP);
      tries++;
      won = b.status === 'win';
      const n = nextTier(tier, streak, b.outcome);
      tier = n.tier; streak = n.streak;
    }
    if (!won) stuck.push(st);
    maxTries = Math.max(maxTries, tries);
  }
  return { entryTier, stuck, maxTries };
}

const KIDS: [string, number, number][] = [
  ['느린 아이 정답50%', 0.50, 1.35],
  ['보통 아이 정답70%', 0.70, 1.00],
  ['잘하는 아이 정답90%', 0.90, 0.75],
  ['숙달 아동 정답95%', 0.95, 0.55],
];

describe('캠페인을 이어서 밀고 나가는 경험', () => {
  /**
   * 🔴 사용자 신고: "2스테이지로 가면서 너무 어렵다."
   *
   *    **재는 축이 승패가 아니라 「들고 들어가는 단계」인 이유**: 대포까지 쓰는 봇은
   *    옛 승격(1판 이기고 네 칸)으로도 초반을 첫 판에 깬다 — 실측으로 확인했다.
   *    그래서 "첫 판에 이겼는가"로 재면 이 회귀를 **못 잡는다**(죽은 게이트).
   *    아이가 체감한 것은 패배가 아니라 **2판의 적이 갑자기 세진 것**이었고,
   *    그 세기는 그 판에 들고 들어간 단계가 정한다. 그래서 그걸 잰다.
   *
   *    tier.spec 은 nextTier 를 낱개로 재고, 여기서는 **1판부터 쌓여 온 상태**를 잰다.
   */
  it('초반 판에 지나치게 높은 단계를 들고 들어가지 않는다', () => {
    // 잘 푸는 아이일수록 빨리 오른다 — 가장 빠른 아이로 잰다
    const [, acc, pace] = KIDS[3]!;
    const r = campaign(acc, pace, 6, 1.0);
    // ST1 은 항상 0단계에서 시작한다(안전망 기준선)
    expect(r.entryTier[0]).toBe(0);
    // 🔴 ST2 를 2단계 넘게 들고 들어가면 "갑자기 어려워졌다"가 된다.
    //    바닥 감쇠 이전에는 여기가 3.4 였다(실측).
    expect(r.entryTier[1], 'ST2 진입 단계').toBeLessThanOrEqual(2);
    expect(r.entryTier[2], 'ST3 진입 단계').toBeLessThanOrEqual(4);
    expect(r.entryTier[4], 'ST5 진입 단계').toBeLessThanOrEqual(8);
  }, 120000);

  /**
   * 🔴 **대포 의존도의 바닥.** 대포를 꼬박꼬박 누르는 아이만 재면, 대포 없이는 못 이기는
   *    게임이 되어도 게이트가 안 잡는다. 실측(2026-08-28): 대포를 **아예 안 쓰면**
   *    잘하는 아이·숙달 아동이 ST10·ST20 을 15판 지고도 못 깼다(성 100% 인데 420초
   *    시간초과 = 교착). 그런데 **10%만 눌러도** 못 깬 판이 0 이 된다.
   *    그래서 바닥을 10% 로 잡는다 — 여기서 걸리면 대포 의존도가 올라간 것이다.
   */
  it('대포를 어쩌다 한 번(10%)만 눌러도 20판까지 막히지 않는다', () => {
    for (const [name, acc, pace] of KIDS) {
      const r = campaign(acc, pace, 20, 0.1);
      expect(r.stuck, `${name} 이 못 깬 판(대포 10%)`).toEqual([]);
    }
  }, 300000);

  /** 되돌아오지 못하는 벽이 없는가 — 같은 판을 열 번 넘게 지는 일은 없어야 한다 */
  it('같은 판을 열 번 넘게 지는 일이 없다', () => {
    for (const [name, acc, pace] of KIDS) {
      const r = campaign(acc, pace, 20, 1.0);
      expect(r.maxTries, `${name} 의 최다 재시도`).toBeLessThanOrEqual(10);
    }
  }, 300000);
});
