import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (f: string): string => readFileSync(new URL(`../${f}`, import.meta.url).pathname, 'utf8');

/**
 * 타격감 배선 검사.
 *
 * 🔴 캔버스에 무엇이 그려졌는지는 유닛테스트로 못 본다. 하지만 **연출을 부르는 코드가
 *    거기 있는지**는 볼 수 있고, 이 프로젝트에서 실제로 사고가 난 지점이 정확히 거기다:
 *    2026-08-02 에 성 타격 경로의 기술 이벤트를 큐에 담기만 하고 렌더러로 넘기는 한 줄이
 *    빠져 있었는데, 시뮬 테스트는 전부 초록이었다(이벤트는 큐에 있었으니까).
 *    그래서 여기서는 **호출부의 존재**를 검사하고, 실제 화면은 tools/qa-launch.mjs 가 센다.
 */
describe('타격감 배선', () => {
  const battle = read('src/ui/battle.ts');
  const field = read('src/render/field.ts');
  const audio = read('src/render/audio.ts');
  const juiceFx = read('src/gb/juice-fx.ts');

  it('정답을 맞히면 전장이 반응한다 (renderer.cheer 호출)', () => {
    // 🔴 정답 처리 블록 안에 있어야 한다 — 파일 아무 데나 있으면 의미가 없다
    const i = battle.indexOf('battle.answer(true');
    const j = battle.indexOf('renderer.cheer(');
    expect(i, '정답 처리 지점을 못 찾았다').toBeGreaterThan(0);
    expect(j, 'renderer.cheer 호출이 없다 — 정답에 화면이 반응하지 않는다').toBeGreaterThan(0);
    expect(Math.abs(j - i), 'cheer 호출이 정답 처리와 떨어져 있다').toBeLessThan(400);
  });

  it('콤보가 소리에 반영된다 (fireCorrect 가 콤보를 받고, juice-fx 가 playCorrect 로 넘긴다)', () => {
    // 🎮 반응(주스) 배선 이후: playCorrect 직접 호출을 fireCorrect(→juice-fx의 sfx 콜백)로 옮겼다
    // (중복 소리 방지, check-juice.mjs 가 요구).
    expect(battle).toMatch(/fireCorrect\(battle\.combo/);
    expect(juiceFx).toMatch(/playCorrect\(comboN\)/);
    expect(audio).toMatch(/export function playCorrect/);
  });

  it('졌을 때 전용 소리가 난다', () => {
    expect(battle).toMatch(/playLose\(\)/);
    expect(audio).toMatch(/export function playLose/);
  });

  it('수문장 등장에 연출이 있다', () => {
    expect(battle).toMatch(/renderer\.boss\(/);
    // 🎮 반응(주스) 배선 이후: playBossAppear 직접 호출을 fireBossAppear 로 옮겼다(juice-fx 가 그 안에서 부른다)
    expect(battle).toMatch(/fireBossAppear\(/);
    expect(juiceFx).toMatch(/playBossAppear\(\)/);
  });

  it('처치 이펙트가 덩치를 받는다 (등급이 화면에서 읽혀야 한다)', () => {
    expect(battle).toMatch(/renderer\.puff\(e\.x, e\.side, e\.big/);
    expect(field).toMatch(/puff\(x: number, side: 1 \| -1, big = 1\)/);
  });

  it('히트스톱이 시뮬 시계를 건드리지 않는다 (그리기 전용)', () => {
    // 🔴 이 프로젝트는 '화면 배속'으로 한 번 밸런스를 깨 봤다(같은 판의 문항 수가 줄었다).
    //    히트스톱은 반드시 그리기 변환에만 있어야 한다.
    expect(field).toMatch(/hitstop\(\)/);
    expect(field, '히트스톱이 setTimeout/시뮬을 건드린다').not.toMatch(/hitstop[\s\S]{0,200}(battle\.|step\(|dt)/);
  });

  /**
   * 🔴 reduceMotion 은 **동작을 줄이라는 설정이지 정보를 지우라는 설정이 아니다**(진단 영향 4/10).
   *    환호는 얻은 먹물과 콤보를 알려 주는 정보라, 움직임만 죽이고 글자는 남겨야 한다.
   */
  it('reduceMotion 이어도 정답 환호의 정보는 남는다', () => {
    const i = field.indexOf('private drawCheers');
    const body = field.slice(i, i + 1400);
    expect(i, 'drawCheers 를 못 찾았다').toBeGreaterThan(0);
    expect(body, 'reduceMotion 에서 조기 return 하면 정보가 사라진다').not.toMatch(/reduceMotion\)\s*return/);
    expect(body, 'reduceMotion 을 고려하지 않는다').toMatch(/reduceMotion/);
  });

  it('QA 하네스가 연출 횟수를 읽을 수 있다', () => {
    expect(battle).toMatch(/cheers: renderer\.cheersShown/);
    expect(battle).toMatch(/bosses: renderer\.bossesShown/);
  });

  /**
   * 🔴 2026-10-12 확장분 — 전투 화면 밖(전장 배치·먹 대포·소환 뽑기·도감 승급·진도 해금)도
   *    같은 허브(juice-fx.ts)에 반응을 건다. tools/check-juice.mjs 가 CI에는 안 물려 있어서,
   *    여기서 "표에 행동이 있고, 그 행동을 실제로 부르는 곳이 있다"를 직접 지킨다
   *    (표만 있고 fire 가 없으면 반응이 0인 채로 넘어간다 — 이 파일 머리말의 교훈과 같다).
   */
  const screens = read('src/ui/screens.ts');

  it('전장 배치(소환)·먹 대포에 반응이 걸려 있다', () => {
    expect(juiceFx).toMatch(/deploy:\s*\[.*'sfx'/);
    expect(battle, 'battle.ts 에서 fireDeploy 를 안 부른다').toMatch(/fireDeploy\(/);
    expect(juiceFx).toMatch(/cannonFire:\s*\[.*'sfx'/);
    expect(battle, 'battle.ts 에서 fireCannonFire 를 안 부른다').toMatch(/fireCannonFire\(/);
  });

  it('소환(뽑기) 카드 공개·잭팟에 반응이 걸려 있다', () => {
    expect(juiceFx).toMatch(/summonReveal:\s*\[.*'sfx'/);
    expect(screens, 'screens.ts 에서 fireSummonReveal 을 안 부른다').toMatch(/fireSummonReveal\(/);
    expect(juiceFx).toMatch(/jackpot:\s*\[.*'sfx'/);
    expect(screens, 'screens.ts 에서 fireJackpot 을 안 부른다').toMatch(/fireJackpot\(/);
  });

  it('도감 승급·새 셈지기 합류(해금)에 반응이 걸려 있다', () => {
    expect(juiceFx).toMatch(/upgrade:\s*\[.*'sfx'/);
    expect(screens, 'screens.ts 에서 fireUpgrade 를 안 부른다').toMatch(/fireUpgrade\(/);
    expect(juiceFx).toMatch(/unlock:\s*\[.*'sfx'/);
    expect(screens, 'screens.ts 에서 fireUnlock 을 안 부른다').toMatch(/fireUnlock\(/);
  });

  it('소환은 소리가 두 번 겹치지 않는다 (카드 열리는 시점에만 난다)', () => {
    // 🔴 예전엔 doSummon() 진입 즉시 play('summon')을 부르고, 첫 카드가 열릴 때 또 울렸다.
    //    첫 카드의 지연(at)이 0이라 거의 같은 순간에 같은 소리가 두 번 났다.
    const i = screens.indexOf('function doSummon');
    const j = screens.indexOf('fireSummonReveal(', i);
    const body = screens.slice(i, j);
    expect(j, 'doSummon 안에서 fireSummonReveal 을 못 찾았다').toBeGreaterThan(i);
    expect(body, "doSummon 이 fireSummonReveal 보다 먼저 play('summon')을 또 부른다").not.toMatch(/play\('summon'\);/);
  });
});
