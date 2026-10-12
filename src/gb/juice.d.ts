export type JuiceChannel = "sfx" | "combo" | "pop" | "burst" | "punch" | "flash" | "slowmo" | "hitstop" | "banner" | "haptic" | "kick";
export const CHANNELS: readonly JuiceChannel[];
export function validateJuiceTable(table: Record<string, string[]>): string[];
export interface JuiceFireOpts {
  x?: number; y?: number; n?: number; text?: string; color?: string;
  sfx?: string; vol?: number; big?: number;
  flashColor?: string; flashAlpha?: number; slowSec?: number; stopSec?: number;
  title?: string; bannerColor?: string; bannerSec?: number; comboColor?: string;
  vib?: number[]; punch?: string | Element | (string | Element)[];
  [k: string]: unknown;
}
export interface Juice {
  readonly combo: number;
  fire(action: string, o?: JuiceFireOpts): void;
  time(dt: number): number;
  pop(text: string, x: number, y: number, color?: string, big?: number): void;
  punch(sel: string | Element, big?: number): void;
  flash(color?: string, a?: number): void;
  banner(text: string, color?: string, sec?: number): void;
  destroy(): void;
}
export function createJuice(o: {
  table: Record<string, string[]>;
  host?: HTMLElement;
  sfx?: (name: string, o: { rate: number; vol: number }) => void;
  burst?: (o: JuiceFireOpts & { action: string; mult: number; big: number }) => void;
  kick?: (o: JuiceFireOpts & { action: string; mult: number; big: number }) => void;
  punch?: Record<string, string | Element | (string | Element)[]>;
  haptics?: () => boolean;
  comboWindow?: number;
}): Juice;
