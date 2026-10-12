import { describe, it, expect, vi } from 'vitest';

/**
 * 뼈대 아틀라스 받기 실패 → 5초 뒤 다시 받는다(2026-10-12 교차검증 grok).
 * 🔴 예전엔 한 번 실패한 Image 가 맵에 그대로 남아(naturalWidth 0) 그 판 내내 정지 그림이었다 —
 *    학교 와이파이가 한 번 끊기면 그 캐릭터만 움직이지 않는다.
 */
describe('뼈대 아틀라스 재시도', () => {
  it('실패한 아틀라스는 5초 안엔 다시 안 받고, 5초 뒤엔 다시 받아 그린다', async () => {
    let now = 1000;
    vi.stubGlobal('performance', { now: () => now });
    const made: FakeImg[] = [];
    class FakeImg { decoding = ''; complete = false; naturalWidth = 0; onerror: (() => void) | null = null; _src = '';
      set src(v: string) { this._src = v; made.push(this); } get src() { return this._src; } }
    vi.stubGlobal('Image', FakeImg);
    const { getRig, rigged } = await import('../src/render/assets');
    const id = rigged()[0]!;
    expect(getRig(id)).toBeNull();            // 첫 요청 — 받는 중
    expect(made.length).toBe(1);
    made[0]!.complete = true; made[0]!.onerror?.();   // 끊김
    now += 1000;
    expect(getRig(id)).toBeNull();
    expect(made.length).toBe(1);              // 5초 안엔 두드리지 않는다(매 프레임 재요청 폭주 금지)
    now += 5000;
    expect(getRig(id)).toBeNull();
    expect(made.length).toBe(2);              // 다시 받는다
    made[1]!.complete = true; made[1]!.naturalWidth = 640;
    expect(getRig(id)?.img).toBe(made[1]);    // 이번엔 그린다
    vi.unstubAllGlobals();
  });
});
