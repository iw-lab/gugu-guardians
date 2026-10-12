/**
 * 반응(주스) 배선 — game-builder kit/juice/juice.js(@gb-juice). 내용 수정 금지, 이 파일만 게임마다 쓴다.
 * 🔒 tools/check-juice.mjs 가 이 파일의 JUICE 반응표 + fire 호출 전부를 읽는다.
 */
import { createJuice, type Juice } from './juice.js';
import { play, playCorrect, playLose, playBossAppear } from '../render/audio';
import * as store from '../save/store';

export const JUICE = {
  correct: ['sfx', 'combo', 'pop', 'punch', 'flash'], // 정답
  wrong: ['sfx', 'flash', 'pop'], // 오답
  win: ['sfx', 'banner', 'flash', 'pop'], // 판 승리(성 방어 성공)
  legend: ['sfx', 'banner', 'flash', 'pop'], // 전설 셈지기 강림
  bossAppear: ['sfx', 'banner', 'flash', 'haptic'], // 수문장 등장
};

/** sfx 콜백은 action 이름만 받는다 — 콤보 수 같은 가변값은 fire() 직전에 여기 적어 둔다 */
let comboN = 1;
let J: Juice | null = null;

/** 앱 생애주기에 한 번만 — document.body 오버레이, battle 화면은 판마다 다시 들어온다 */
function juice(): Juice {
  if (!J) {
    J = createJuice({
      table: JUICE,
      host: document.body,
      haptics: () => store.load().settings.sound,
      sfx: (name) => {
        if (name === 'correct') playCorrect(comboN);
        else if (name === 'wrong') play('wrong');
        else if (name === 'win') play('win');
        else if (name === 'legend') play('legend');
        else if (name === 'bossAppear') playBossAppear();
      },
    });
  }
  return J;
}

type FireOpts = Parameters<Juice['fire']>[1];

export function fireCorrect(combo: number, o?: FireOpts): void {
  comboN = combo;
  juice().fire('correct', o);
}
export function fireWrong(o?: FireOpts): void {
  juice().fire('wrong', o);
}
export function fireWin(o?: FireOpts): void {
  juice().fire('win', o);
}
export function fireLegend(o?: FireOpts): void {
  juice().fire('legend', o);
}
export function fireBossAppear(o?: FireOpts): void {
  juice().fire('bossAppear', o);
}
/** 패배는 과한 반응 대상이 아니다 — 기존 playLose()를 그대로 쓴다(반응표 없음) */
export { playLose };
