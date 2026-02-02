import type { LottieRGBA } from '../types/lottie';

// Lottie RGBA → HEX
export function lottieRGBAToHex(rgba: LottieRGBA): string {
  const r = Math.round(rgba[0] * 255);
  const g = Math.round(rgba[1] * 255);
  const b = Math.round(rgba[2] * 255);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// HEX → Lottie RGBA（アルファは1.0固定）
export function hexToLottieRGBA(hex: string): LottieRGBA {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0, 1];
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
    1
  ];
}

// デフォルト色
export const DEFAULT_COLOR: LottieRGBA = [0, 0, 0, 1];
