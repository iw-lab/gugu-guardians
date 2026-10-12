/**
 * 에셋 로더 — 🔴 경로는 코드에 박지 않는다. `public/assets/manifest.json` 이 단일 진실원이다.
 *    (생성 스크립트·게임 로더·쇼룸·단일파일 빌더·크레딧 생성기가 **같은 파일**을 본다.)
 *
 * 🔴 예전에는 루트 `assets/manifest.json` 과 `public/assets/manifest.json` 두 벌이 있었다.
 *    앱은 앞쪽을, 빌더·쇼룸은 뒤쪽을 읽어서 한쪽에만 에셋을 추가하면 이미지가 조용히
 *    로드되지 않는다(실제로 그랬다 — 인장이 빈 원으로 떴다). 한 파일로 합쳤다.
 */
import manifestRaw from '../../public/assets/manifest.json';
import rigIndexRaw from '../../public/assets/rig/index.json';

export interface AssetEntry {
  key: string;
  path: string;
  kind: 'unit' | 'enemy' | 'castle' | 'bg' | 'ui';
  /** ai | human | cc0 — 라이선스 대장 생성에 쓴다 */
  origin: 'ai' | 'human' | 'cc0';
  license: string;
}

export const MANIFEST = manifestRaw as { version: number; assets: AssetEntry[] };

const images = new Map<string, HTMLImageElement>();
const failed = new Set<string>();

export function getImage(key: string): HTMLImageElement | null {
  const img = images.get(key);
  return img && img.complete && img.naturalWidth > 0 ? img : null;
}

export function assetMissing(key: string): boolean {
  return failed.has(key);
}

/** 🔴 동적 `new URL('../../' + path, import.meta.url)` 은 번들러가 상위 디렉토리를 통째로
 *  에셋으로 끌어간다(실측: package-lock.json·index.html 까지 dist에 들어갔다).
 *  public/ 아래 파일은 빌드 시 그대로 복사되므로 BASE_URL 기준 상대경로로 참조한다. */
function resolve(path: string): string {
  // 단일 HTML 배포(tools/build-single.mjs)에서는 매니페스트 경로가 data URI로 치환된다
  if (path.startsWith('data:')) return path;
  const base = import.meta.env.BASE_URL || './';
  return `${base}${path}`;
}

/** 전체 에셋을 로드한다. 실패해도 게임은 진행된다(도형 폴백). */
export async function loadAll(onProgress?: (done: number, total: number) => void): Promise<void> {
  const list = MANIFEST.assets;
  let done = 0;
  await Promise.all(
    list.map(
      (a) =>
        new Promise<void>((resolveP) => {
          const img = new Image();
          img.decoding = 'async';
          img.onload = () => { images.set(a.key, img); done++; onProgress?.(done, list.length); resolveP(); };
          img.onerror = () => { failed.add(a.key); done++; onProgress?.(done, list.length); resolveP(); };
          img.src = resolve(a.path);
        }),
    ),
  );
}

export function assetUrl(key: string): string {
  const a = MANIFEST.assets.find((x) => x.key === key);
  return a ? resolve(a.path) : '';
}

// ── 뼈대 아틀라스(REMASTER v2.0 · tools/rig-pack.py) ─────────────────────────
/** 칸 크기·프레임 수·액션 행·발 위치 — rig/index.json */
export interface RigEntry { cell: number; frames: number; rows: Record<string, number>; pivot: [number, number]; dir: string }
const RIG_INDEX = rigIndexRaw as unknown as Record<string, RigEntry>;
const rigImages = new Map<string, HTMLImageElement>();

/** 판에 나올 캐릭터 아틀라스만 미리 받는다(전체 91장을 첫 화면에서 받지 않는다 — 성능 예산 R-5) */
export function preloadRigs(ids: Iterable<string>): void {
  for (const id of ids) {
    if (!RIG_INDEX[id] || rigImages.has(id)) continue;
    const img = new Image();
    img.decoding = 'async';
    img.src = resolve(`assets/rig/${id}.webp`);
    rigImages.set(id, img);
  }
}
/** 다 받아진 아틀라스만 돌려준다 — 아직이면 null(그 프레임은 옛 정지 그림/카드로 그린다) */
export function getRig(id: string): { img: HTMLImageElement; ent: RigEntry } | null {
  const ent = RIG_INDEX[id];
  if (!ent) return null;
  let img = rigImages.get(id);
  if (!img) { preloadRigs([id]); img = rigImages.get(id); }
  return img && img.complete && img.naturalWidth > 0 ? { img, ent } : null;
}
export function rigged(): string[] { return Object.keys(RIG_INDEX); }
