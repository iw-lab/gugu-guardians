#!/usr/bin/env node
/**
 * _raw 안에서 **아직 안 오린** 스프라이트만 골라 cutout-flat 을 돌린다.
 *
 * 🔴 판정 기준은 파일 이름이 아니라 **알파 채널의 유무**다. 이름 목록으로 관리하면
 *    생성이 중간에 끊겼을 때 어디까지 했는지 사람이 기억해야 한다 — 파일이 스스로 말하게 둔다.
 * 🔴 rembg 는 쓰지 않는다(밝은 얼굴을 배경으로 오인해 지운다). cutout-flat 은 테두리에서
 *    출발하는 flood fill 이라 그 사고가 구조적으로 불가능하다.
 *
 * 실행: node tools/cutout-new.mjs [--skip-newest]
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const PY = join(process.env.HOME, '.claude/venvs/vibes/bin/python');
const skipNewest = process.argv.includes('--skip-newest');

const hasAlpha = (f) => {
  const out = execFileSync(PY, ['-c',
    'import sys;from PIL import Image;im=Image.open(sys.argv[1]);print(1 if im.mode in ("RGBA","LA") and im.getchannel("A").getextrema()[0]<250 else 0)',
    f], { encoding: 'utf8' }).trim();
  return out === '1';
};

let done = 0, warned = 0;
for (const dir of ['units', 'enemies']) {
  const d = join(ROOT, '_raw', dir);
  let files = readdirSync(d).filter((f) => f.endsWith('.png'))
    .map((f) => join(d, f))
    .sort((a, b) => statSync(a).mtimeMs - statSync(b).mtimeMs);
  // 생성이 아직 도는 중이면 가장 최근 파일은 쓰다 만 것일 수 있다
  if (skipNewest) files = files.slice(0, -1);
  for (const f of files) {
    if (hasAlpha(f)) continue;
    const out = execFileSync('node', [join(ROOT, 'tools/cutout-flat.mjs'), f], { encoding: 'utf8' });
    process.stdout.write(out);
    if (out.includes('⚠️')) warned++;
    done++;
  }
}
console.log(`\n오려낸 파일 ${done}장${warned ? ` · ⚠️ 경고 ${warned}장 — 눈으로 확인할 것` : ' · 경고 없음'}`);
