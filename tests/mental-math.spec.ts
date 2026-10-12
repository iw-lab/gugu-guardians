/**
 * 🧮 «종이에 대고 풀어야 하는 문제»를 내지 않는가.
 *
 * 🔴 구구성은 적이 다가오는 동안 푸는 게임이다. 종이 계산을 내면 아이는 풀지 않고 **찍는다** —
 *    학습은 0인데 화면은 「문제를 냈다」고 말한다(2026-09-18·09-22 사용자 지시, 전 게임 공통).
 * 🔴 잣대는 여기서 다시 쓰지 않는다. 게임마다 복사하면 「통과한다」가 게임마다 다른 뜻이 된다.
 *    유일 정본 = ~/Documents/dev/_shared/mental-math.mjs
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { generate, makeRng, MAX_LEVEL } from '../src/edu/generator';
import type { QType } from '../src/edu/curriculum';

const TYPES: QType[] = ['A1', 'S1', 'A2', 'S2', 'M1', 'M2', 'M3', 'AS1', 'AS2', 'D1', 'D2'];

// 🔴 정본은 저장소 밖이라 GitHub CI 에는 없다(2026-10-12 CI 가 «Failed to load url» 로 배포를 막았다).
//    CI 에서만 건너뛴다 — 학생 사이트 배포(wrangler)는 로컬 `npm run check` 뒤에만 하므로 여기서 집행된다.
//    로컬에서 정본이 없으면 건너뛰지 않고 실패한다(잣대가 사라진 걸 조용히 넘기지 않는다).
const JUDGE = fileURLToPath(new URL('../../_shared/mental-math.mjs', import.meta.url));
const inCi = !!process.env['CI'] && !existsSync(JUDGE);

describe('암산선', () => {
  it.skipIf(inCi)('모든 유형·레벨에서 종이 문제가 0 이다', async () => {
    expect(existsSync(JUDGE), `공용 판정기 없음: ${JUDGE}`).toBe(true);
    const { isPaper } = (await import(/* @vite-ignore */ JUDGE)) as { isPaper: (stem: string) => boolean };
    const bad: string[] = [];
    let total = 0;
    for (const t of TYPES) {
      for (let L = 1; L <= MAX_LEVEL; L++) {
        for (let s = 1; s <= 400; s++) {
          const q = generate(t, L, makeRng(s * 7919 + L));
          const stem = `${q.prompt} = ?`;
          total++;
          if (isPaper(stem)) bad.push(`${t}/L${L} ${q.prompt}`);
        }
      }
    }
    expect(total).toBeGreaterThan(1000);
    expect(bad.slice(0, 8)).toEqual([]);
  });
});
