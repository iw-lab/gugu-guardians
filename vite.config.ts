import { defineConfig, type Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

/**
 * 뼈대 아틀라스 원본(png)·Phaser 프레임표(json)는 배포에 안 싣는다 — 게임은 rig-pack 이 만든 webp 와 index.json 만 읽는다.
 * 🔴 원본 png 는 public 에 남아 있어야 한다(gate-char-rig 가 원장 sha 와 바이트를 대조) — 그래서 지우는 곳은 dist 뿐이다.
 */
function stripRigPng(): Plugin {
  let out = 'dist';
  return {
    name: 'strip-rig-png',
    apply: 'build',
    configResolved(c) { out = path.resolve(c.root, c.build.outDir); },
    closeBundle() {
      const dir = path.join(out, 'assets', 'rig');
      if (!fs.existsSync(dir)) return;
      for (const f of fs.readdirSync(dir)) if (/\.png$/.test(f) || (/\.json$/.test(f) && f !== 'index.json')) fs.rmSync(path.join(dir, f));
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [stripRigPng()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 2048,
    chunkSizeWarningLimit: 700,
  },
});
