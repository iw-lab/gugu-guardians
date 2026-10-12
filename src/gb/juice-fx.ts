/**
 * 반응(주스) 배선 — game-builder kit/juice/juice.js(@gb-juice). 내용 수정 금지, 이 파일만 게임마다 쓴다.
 * 🔒 tools/check-juice.mjs 가 이 파일의 JUICE 반응표 + fire 호출 전부를 읽는다.
 *
 * 🔴 2026-10-12 확장: 전투 화면(정답·오답·승리·전설강림·수문장등장) 다음으로, 이 게임의
 *    나머지 "플레이어 행동" — 전장 배치(소환)·먹 대포·소환 뽑기·도감 승급·진도 해금 —
 *    도 같은 허브(싱글턴 J, document.body 오버레이)에 반응을 건다. sfx 는 전부 이 파일의
 *    sfx 콜백 하나를 거치므로, 호출부가 play() 를 또 직접 부르지 않는 한 같은 순간
 *    같은 소리가 두 번 나지 않는다.
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
  deploy: ['sfx', 'punch', 'pop'], // 전장 배치(덱 카드로 셈지기 소환)
  cannonFire: ['sfx', 'punch', 'flash', 'pop'], // 먹 대포 발사
  summonReveal: ['sfx', 'pop', 'punch'], // 소환(뽑기) 카드 한 장이 열릴 때마다
  jackpot: ['sfx', 'banner', 'flash', 'burst'], // 소환에서 유니크 이상(10연 확정 등급)
  upgrade: ['sfx', 'punch', 'flash', 'pop'], // 도감에서 조각으로 승급
  unlock: ['sfx', 'banner', 'flash', 'punch'], // 진도로 새 셈지기 합류(해금)
};

/** sfx 콜백은 action 이름만 받는다 — 콤보 수 같은 가변값은 fire() 직전에 여기 적어 둔다 */
let comboN = 1;
let J: Juice | null = null;

/**
 * jackpot 전용 꽃가루. kit 은 burst 를 "게임이 그린다"로 비워 둔다 — 소환 화면엔 Canvas가
 * 없으므로 DOM 파티클로 직접 그린다(스타일은 style.css 끝 "juice 확장" 블록).
 */
function burstConfetti(o: { x?: number; y?: number }): void {
  const cx = o.x ?? innerWidth / 2;
  const cy = o.y ?? innerHeight / 2;
  const colors = ['#f4d03f', '#e08a1e', '#d4342f', '#2e8b6f', '#1b4f8c'];
  const n = 14;
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'iwd-confetti';
    const ang = (Math.PI * 2 * i) / n + Math.random() * 0.4;
    const dist = 60 + Math.random() * 60;
    s.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
    s.style.setProperty('--dy', `${Math.sin(ang) * dist}px`);
    s.style.left = `${cx}px`;
    s.style.top = `${cy}px`;
    s.style.background = colors[i % colors.length]!;
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 700);
  }
}

/** 앱 생애주기에 한 번만 — document.body 오버레이, battle 화면은 판마다 다시 들어온다 */
function juice(): Juice {
  if (!J) {
    J = createJuice({
      table: JUICE,
      host: document.body,
      haptics: () => store.load().settings.sound,
      burst: burstConfetti,
      punch: { cannonFire: ['.cannon'] },
      sfx: (name) => {
        if (name === 'correct') playCorrect(comboN);
        else if (name === 'wrong') play('wrong');
        else if (name === 'win') play('win');
        else if (name === 'legend') play('legend');
        else if (name === 'bossAppear') playBossAppear();
        else if (name === 'deploy' || name === 'summonReveal' || name === 'unlock') play('summon');
        else if (name === 'cannonFire' || name === 'jackpot') play(name === 'jackpot' ? 'win' : 'hit');
        else if (name === 'upgrade') play('correct');
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
export function fireDeploy(o?: FireOpts): void {
  juice().fire('deploy', o);
}
export function fireCannonFire(o?: FireOpts): void {
  juice().fire('cannonFire', o);
}
export function fireSummonReveal(o?: FireOpts): void {
  juice().fire('summonReveal', o);
}
export function fireJackpot(o?: FireOpts): void {
  juice().fire('jackpot', o);
}
export function fireUpgrade(o?: FireOpts): void {
  juice().fire('upgrade', o);
}
export function fireUnlock(o?: FireOpts): void {
  juice().fire('unlock', o);
}
/** 패배는 과한 반응 대상이 아니다 — 기존 playLose()를 그대로 쓴다(반응표 없음) */
export { playLose };
