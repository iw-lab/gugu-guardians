import { describe, it, expect } from 'vitest';
import * as store from '../src/save/store';
import { recordMode } from '../src/meta/modeRecord';
import type { BattleResult } from '../src/ui/battle';

/**
 * 모드 기록 저장(recordMode) — 결과 화면의 «새 기록!»과 첫 화면 «최고 …»의 근거.
 * 🔴 보스 연전은 예전엔 «완주 최단 시간»만 남겨, 완주 못 한 아이는 몇 마리를 잡아도 기록 0 이었다
 *    (2026-10-12 실측 플레이: 새 아이 7분에 3마리 → 기록 0).
 */
const R = (o: Partial<BattleResult>): BattleResult => ({ status: 'lose', solved: 20, correct: 18, maxCombo: 3, seconds: 400, score: 0, mode: 'classic', ...o } as BattleResult);

describe('모드 기록', () => {
  it('보스 연전 — 완주 못 해도 쓰러뜨린 보스 수가 남고, 더 많이 잡으면 새 기록', () => {
    store.save({ ...store.load(), modes: { time: 0, survival: 0, rule: {}, big: 0, bigBest: 0, daily: { date: '', streak: 0 } } });
    expect(recordMode(R({ mode: 'big', status: 'draw', score: 3 })).best).toBe(true);
    expect(store.load().modes.bigBest).toBe(3);
    expect(recordMode(R({ mode: 'big', status: 'draw', score: 2 })).best).toBe(false);
    expect(store.load().modes.bigBest).toBe(3);
    // 완주 = 최단 시간 기록
    expect(recordMode(R({ mode: 'big', status: 'win', score: 6, seconds: 300 })).best).toBe(true);
    expect(store.load().modes.big).toBe(300);
    expect(store.load().modes.bigBest).toBe(6);
  });
  it('번개 전투·끝없는 방어 — 더 큰 값만 새 기록 · 오늘의 전장은 같은 날 두 번 안 올린다', () => {
    expect(recordMode(R({ mode: 'time', score: 3 })).best).toBe(true);
    expect(recordMode(R({ mode: 'time', score: 2 })).best).toBe(false);
    expect(recordMode(R({ mode: 'survival', score: 7 })).best).toBe(true);
    expect(recordMode(R({ mode: 'daily', status: 'win', date: '2026-10-12' })).value).toBe(1);
    expect(recordMode(R({ mode: 'daily', status: 'win', date: '2026-10-12' })).value).toBe(1);
    expect(recordMode(R({ mode: 'daily', status: 'win', date: '2026-10-13' })).value).toBe(2);
    expect(recordMode(R({ mode: 'daily', status: 'lose', date: '2026-10-14' })).value).toBe(2);
  });
  it('옛 세이브(bigBest 없음)도 0 으로 채워 읽는다', () => {
    const d = store.load(); const m = { ...d.modes } as Record<string, unknown>; delete m['bigBest'];
    expect(() => recordMode(R({ mode: 'big', status: 'draw', score: 1 }))).not.toThrow();
  });
});
