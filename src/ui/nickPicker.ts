/* nickPicker.ts — 아이가 직접 고르는 별명 (2026-11-04 사용자
 *   «나인지도 모르는 닉네임은 무쓸모 · 개인 식별은 안 되는데 개인별로 원하는 걸 만들게»).
 *
 * 🔴 자유 입력 0 — src/save/schema.ts 의 NICK_A(꾸밈말) × NICK_B(동물) 목록에서만 고른다.
 *    순위 서버(shared/board-contract.ts)는 별명을 이 두 목록의 **인덱스**로만 받는다
 *    (schema.ts nickIndex) — 목록이 달라지면 서버가 조용히 0,0으로 떨어뜨린다.
 *    그래서 game-builder 키트의 gb-nick.js(다른 낱말 목록)를 쓰지 않고 이 게임 목록 그대로 짠다.
 * 🔴 학교 이름은 넣지 않는다 — 학교는 순위판 합계에만 쓰고 이름표에는 올리지 않는다.
 */
import { NICK_A, NICK_B } from '../save/schema';
import { el, btn } from './dom';

function splitNick(v: string): { a: string; b: string } {
  const [a, b] = v.split(' ');
  return { a: NICK_A.includes(a ?? '') ? a! : NICK_A[0]!, b: NICK_B.includes(b ?? '') ? b! : NICK_B[0]! };
}

function chipRow(list: readonly string[], cur: string, label: string, onPick: (v: string) => void): HTMLElement {
  const row = el('div', { class: 'nick-row', role: 'radiogroup', 'aria-label': label });
  for (const word of list) {
    const chip = btn(word, () => {
      onPick(word);
      for (const x of Array.from(row.children)) {
        const on = x.textContent === word;
        x.classList.toggle('on', on);
        x.setAttribute('aria-checked', String(on));
      }
    }, `nick-chip${word === cur ? ' on' : ''}`);
    chip.setAttribute('role', 'radio');
    chip.setAttribute('aria-checked', String(word === cur));
    row.append(chip);
  }
  return row;
}

export interface NickPickerOpts {
  /** 지금 별명(있으면 그 낱말에서 시작) */
  value?: string;
  /** «그만두기» 단추를 보일지 — 처음 고를 때는 반드시 골라야 하니 false */
  allowCancel?: boolean;
  title?: string;
}

/** 고르기 창을 띄운다. 고르면 별명 문자열을, 그만두면 null을 돌려준다(배경을 눌러도 안 닫힌다 — 실수로 닫혀 빈 별명이 되면 안 된다) */
export function openNickPicker(opts: NickPickerOpts = {}): Promise<string | null> {
  return new Promise((resolve) => {
    let { a, b } = splitNick(opts.value ?? '');
    const back = el('div', { class: 'nick-pick-back', 'data-gb': 'nick-picker' });
    const out = el('div', { class: 'nick-pick-out', 'aria-live': 'polite' }, `${a} ${b}`);
    const rowA = chipRow(NICK_A, a, '꾸밈말', (v) => { a = v; out.textContent = `${a} ${b}`; });
    const rowB = chipRow(NICK_B, b, '동물', (v) => { b = v; out.textContent = `${a} ${b}`; });
    const close = (r: string | null): void => { back.remove(); resolve(r); };
    const okBtn = btn('이 별명으로', () => close(`${a} ${b}`), 'btn nick-pick-ok');
    const actions = [okBtn];
    if (opts.allowCancel) actions.push(btn('그만두기', () => close(null), 'btn ghost sm'));
    const card = el('div', { class: 'card nick-pick-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': opts.title ?? '내 별명 만들기' },
      el('b', {}, opts.title ?? '내 별명 만들기'),
      el('p', { class: 'muted' }, '꾸밈말과 동물을 하나씩 골라요. 이름·학교는 들어가지 않아요.'),
      out,
      el('div', { class: 'nick-pick-h' }, '꾸밈말'), rowA,
      el('div', { class: 'nick-pick-h' }, '동물'), rowB,
      el('div', { class: 'nick-pick-actions' }, ...actions),
    );
    back.append(card);
    document.body.append(back);
    okBtn.focus();
  });
}
