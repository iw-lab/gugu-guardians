import { describe, it, expect } from 'vitest';
import { Battle } from '../src/sim/core';
import { modeStage, dailyMod, MODES } from '../src/sim/modes';
import { BOSSES } from '../src/sim/stages';
import { ALLY_BY_ID, defaultDeck, progressionAllies } from '../src/sim/units';
import { tableQuestion, makeRng } from '../src/edu/generator';
import type { StageDef } from '../src/sim/types';

/**
 * 모드 6종(REMASTER-GDD R-2 · DoD 6~10) — 규칙이 «화면 문구»가 아니라 시뮬에서 집행되는지 잰다.
 * 봇 = sim.spec 과 같은 학습자 모델(정답률 acc · 덱에서 살 수 있는 가장 비싼 것 소환).
 */
const DT = 0.1;
function run(stage: StageDef, acc: number, maxT = 900, seed = 7, onStep?: (b: Battle) => void): Battle {
  const b = new Battle(stage);
  const deck = defaultDeck(progressionAllies(Math.max(stage.index, 12)).map((u) => u.id));
  const cheapest = Math.min(...deck.map((id) => ALLY_BY_ID.get(id)!.cost));
  let r = seed >>> 0; const rnd = () => ((r = (r * 1664525 + 1013904223) >>> 0) / 4294967296);
  let nextQuiz = 1.5;
  while (b.status === 'playing' && b.t < maxT) {
    if (b.t >= nextQuiz) { const ok = rnd() < acc; b.answer(ok, ok ? 2400 : 4000); nextQuiz = b.t + (ok ? 2.4 : 4); }
    const a = deck.map((id) => ALLY_BY_ID.get(id)!).filter((u) => b.canSummon(u.id))
      .filter((u) => u.cost === cheapest || b.money - u.cost >= cheapest * 2).sort((x, y) => y.cost - x.cost);
    if (a[0]) b.summon(a[0].id);
    if (b.cannonReady) b.fireCannon();
    b.step(DT);
    onStep?.(b);
  }
  return b;
}

describe('모드 카드', () => {
  it('6종 · 설명은 한 줄(줄바꿈 없음·28자 이하)', () => {
    expect(MODES.map((m) => m.id)).toEqual(['classic', 'time', 'survival', 'rule', 'big', 'daily']);
    for (const m of MODES) { expect(m.desc).not.toMatch(/\n/); expect(m.desc.length).toBeLessThanOrEqual(28); }
  });
});

describe('번개 전투(time) — DoD 6', () => {
  it('90초 시계 · 오답 하나에 −3초 · 성 부수면 +12초 · 새 성은 더 단단하다', () => {
    const st = modeStage('time', 5);
    const b = new Battle(st);
    expect(b.clockLeft).toBe(90);
    b.answer(false, 3000);
    expect(b.clockLeft).toBe(87);
    const hp0 = b.castleHpMax;
    b.castleHp = 0; b.step(DT);
    expect(b.castlesBroken).toBe(1);
    expect(b.status).toBe('playing');
    expect(b.castleHpMax).toBeGreaterThan(hp0);
    expect(b.clockLeft).toBeCloseTo(87 + 12 - DT, 5);
  });
  it('시계가 다 되면 끝 — 성을 하나라도 부쉈으면 win, 아니면 lose', () => {
    const fast = run(modeStage('time', 3), 0.95);
    expect(fast.status).not.toBe('playing');
    expect(fast.t).toBeLessThan(400);
    const idle = new Battle(modeStage('time', 3));
    while (idle.status === 'playing') idle.step(DT);
    expect(idle.status).toBe('lose');
    expect(idle.t).toBeLessThanOrEqual(90 + DT);
    // 성은 지키되 적 성은 못 부순 판 = 시계가 정확히 90초에 끝낸다
    const turtle = new Battle(modeStage('time', 3));
    while (turtle.status === 'playing') { turtle.playerCastleHp = 1e9; turtle.castleHp = Math.max(turtle.castleHp, 1); turtle.step(DT); }
    expect(turtle.status).toBe('lose');
    expect(turtle.t).toBeCloseTo(90, 0);
  });
  it('잘하는 봇은 성을 2개 이상 부순다(시계 연장이 실제로 돈다)', () => {
    const b = run(modeStage('time', 3), 0.95);
    expect(b.castlesBroken).toBeGreaterThanOrEqual(2);
  });
});

describe('끝없는 방어(survival) — DoD 7', () => {
  it('파도 번호가 오르고 파도마다 적 체력이 커진다 · 적 성은 없다(이길 길은 버티기뿐)', () => {
    const hpByWave = new Map<number, number>();
    const b = run(modeStage('survival', 6), 0.8, 900, 3, (x) => {
      for (const u of x.units) if (u.side === -1 && u.defId === 'e_swarm') {
        const w = x.wave; hpByWave.set(w, Math.max(hpByWave.get(w) ?? 0, u.maxHp));
      }
    });
    expect(b.noFoeCastle).toBe(true);
    expect(b.wave).toBeGreaterThanOrEqual(4);
    expect(b.status === 'lose' || b.status === 'win' || b.t >= 900).toBe(true);
    const ws = [...hpByWave.keys()].sort((a, c) => a - c);
    expect(ws.length).toBeGreaterThanOrEqual(2);
    expect(hpByWave.get(ws[ws.length - 1]!)!).toBeGreaterThan(hpByWave.get(ws[0]!)!);
  });
  it('아무것도 안 하면 결국 성이 무너진다(무한 판 없음)', () => {
    const b = new Battle(modeStage('survival', 3));
    while (b.status === 'playing' && b.t < 1200) b.step(DT);
    expect(b.status).toBe('lose');
  });
});

describe('구구단 정복(rule) — DoD 8', () => {
  it('2~9단 각각 200문항 — 고른 단 밖의 식 0개', () => {
    for (let t = 2; t <= 9; t++) {
      const rng = makeRng(t * 97); const recent: string[] = [];
      for (let i = 0; i < 200; i++) {
        const q = tableQuestion(t, rng, recent);
        const [a, b] = q.prompt.split(' × ').map(Number);
        expect(a).toBe(t);
        expect(q.answer).toBe(t * b!);
        expect(b).toBeGreaterThanOrEqual(1); expect(b).toBeLessThanOrEqual(9);
        recent.push(q.key); if (recent.length > 4) recent.shift();
      }
    }
  });
  it('단마다 다른 단 대장(수문장)이 선다', () => {
    const ids = new Set<string>();
    for (let t = 2; t <= 7; t++) {
      const s = modeStage('rule', 0, { table: t });
      const boss = s.spawns.filter((e) => e.cap === 1 && e.every >= 9999).map((e) => e.id);
      expect(boss.length).toBe(1);
      ids.add(boss[0]!);
      expect(s.mode?.table).toBe(t);
    }
    expect(ids.size).toBe(6);
  });
});

describe('보스 연전(big) — DoD 9', () => {
  it('보스 6마리가 정해진 순서로 «앞 보스가 쓰러져야» 하나씩 나온다', () => {
    const seen: string[] = [];
    const b = new Battle(modeStage('big', 8));
    let lastLive = 0;
    for (let i = 0; i < 6; i++) {
      while (!b.units.some((u) => (u as { rush?: boolean }).rush) && b.t < 60) b.step(DT);
      const live = b.units.filter((u) => (u as { rush?: boolean }).rush);
      expect(live.length).toBe(1);
      seen.push(live[0]!.defId);
      lastLive = b.t;
      live[0]!.hp = 0; b.step(DT);
      expect(b.bossesDown).toBe(i + 1);
    }
    expect(seen).toEqual([...BOSSES]);
    expect(b.status).toBe('win');
    expect(lastLive).toBeGreaterThan(0);
  });
});

describe('오늘의 전장(daily) — DoD 10', () => {
  it('같은 날 = 같은 판 · 날짜가 바뀌면 판이나 비틀기가 바뀐다', () => {
    const a = modeStage('daily', 9, { date: '2026-10-12' });
    const a2 = modeStage('daily', 9, { date: '2026-10-12' });
    expect(JSON.stringify(a)).toBe(JSON.stringify(a2));
    let diff = 0;
    for (let d = 13; d <= 26; d++) {
      const o = modeStage('daily', 9, { date: `2026-10-${d}` });
      if (o.index !== a.index || o.mode?.mod !== a.mode?.mod) diff++;
    }
    expect(diff).toBeGreaterThanOrEqual(10);
  });
  it('비틀기는 시뮬 수치로 집행된다(번개 괴수 = 적이 빠르다 · 샘물 = 셈력이 빨리 찬다)', () => {
    let fastDate = '', richDate = '';
    for (let d = 1; d <= 60 && (!fastDate || !richDate); d++) {
      const date = `2026-11-${String(((d - 1) % 28) + 1).padStart(2, '0')}`.replace('11-', d > 28 ? '12-' : '11-');
      const m = dailyMod(date).id;
      if (m === 'fast' && !fastDate) fastDate = date;
      if (m === 'rich' && !richDate) richDate = date;
    }
    expect(fastDate && richDate).toBeTruthy();
    const plain = modeStage('time', 5); const plainB = new Battle({ ...plain, mode: undefined });
    const fast = new Battle({ ...plain, mode: { kind: 'daily', mod: 'fast' } });
    for (let i = 0; i < 400; i++) { plainB.step(DT); fast.step(DT); }
    const sp = (b: Battle) => Math.max(...b.units.filter((u) => u.side === -1 && u.spd > 0).map((u) => u.spd));
    expect(sp(fast)).toBeGreaterThan(sp(plainB));
    const rich = new Battle({ ...plain, mode: { kind: 'daily', mod: 'rich' } }); const p2 = new Battle({ ...plain, mode: undefined });
    rich.money = 0; p2.money = 0; rich.step(1); p2.step(1);
    expect(rich.money).toBeGreaterThan(p2.money);
  });
});
