import type { ColorLayerInfo, ColorInfo, LottieRGBA } from '../types/lottie';

// 全レイヤーから色を抽出
export function extractAllColors(animationData: unknown): ColorLayerInfo[] {
  const colorLayers: ColorLayerInfo[] = [];
  const data = animationData as { layers?: unknown[] };

  if (!data.layers) return colorLayers;

  data.layers.forEach((layer: unknown, index: number) => {
    const l = layer as Record<string, unknown>;
    const colors: ColorInfo[] = [];

    // テキストレイヤー (ty: 5)
    if (l.ty === 5) {
      const t = l.t as Record<string, unknown> | undefined;
      const d = t?.d as Record<string, unknown> | undefined;
      const k = d?.k as unknown[] | undefined;
      const firstKey = k?.[0] as Record<string, unknown> | undefined;
      const s = firstKey?.s as Record<string, unknown> | undefined;
      const fc = s?.fc as number[] | undefined;
      if (fc && fc.length >= 3) {
        colors.push({
          id: `layer-${index}-text`,
          type: 'text',
          path: ['layers', index, 't', 'd', 'k', 0, 's', 'fc'],
          color: [fc[0], fc[1], fc[2], 1] as LottieRGBA
        });
      }
    }

    // シェイプレイヤー (ty: 4)
    if (l.ty === 4 && l.shapes) {
      extractShapeColors(l.shapes as unknown[], index, colors, ['layers', index, 'shapes']);
    }

    // ソリッドレイヤー (ty: 1)
    if (l.ty === 1 && typeof l.sc === 'string') {
      const hex = l.sc;
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      colors.push({
        id: `layer-${index}-solid`,
        type: 'solid',
        path: ['layers', index, 'sc'],
        color: [r, g, b, 1]
      });
    }

    if (colors.length > 0) {
      colorLayers.push({
        index,
        name: (l.nm as string) || `Layer ${index}`,
        layerType: l.ty as number,
        colors
      });
    }
  });

  return colorLayers;
}

// シェイプ内の色を再帰的に抽出
function extractShapeColors(
  shapes: unknown[],
  layerIndex: number,
  colors: ColorInfo[],
  basePath: (string | number)[]
): void {
  shapes.forEach((shape: unknown, shapeIndex: number) => {
    const s = shape as Record<string, unknown>;
    const currentPath = [...basePath, shapeIndex];

    // グループ (ty: "gr")
    if (s.ty === 'gr' && s.it) {
      extractShapeColors(s.it as unknown[], layerIndex, colors, [...currentPath, 'it']);
    }

    // Fill (ty: "fl")
    if (s.ty === 'fl') {
      const c = s.c as Record<string, unknown> | undefined;
      const k = c?.k as number[] | undefined;
      if (k && k.length >= 3) {
        colors.push({
          id: `layer-${layerIndex}-fill-${colors.length}`,
          type: 'fill',
          path: [...currentPath, 'c', 'k'],
          color: k.length >= 4 ? (k as LottieRGBA) : [k[0], k[1], k[2], 1]
        });
      }
    }

    // Stroke (ty: "st")
    if (s.ty === 'st') {
      const c = s.c as Record<string, unknown> | undefined;
      const k = c?.k as number[] | undefined;
      if (k && k.length >= 3) {
        colors.push({
          id: `layer-${layerIndex}-stroke-${colors.length}`,
          type: 'stroke',
          path: [...currentPath, 'c', 'k'],
          color: k.length >= 4 ? (k as LottieRGBA) : [k[0], k[1], k[2], 1]
        });
      }
    }
  });
}

// JSONの指定パスの値を更新（イミュータブル）
export function updateColorInJson(
  animationData: unknown,
  path: (string | number)[],
  newColor: LottieRGBA | string
): unknown {
  const newData = JSON.parse(JSON.stringify(animationData));
  let current = newData as Record<string | number, unknown>;

  for (let i = 0; i < path.length - 1; i++) {
    current = current[path[i]] as Record<string | number, unknown>;
  }

  const lastKey = path[path.length - 1];

  // 元の値が配列の場合、元の長さを維持する
  const originalValue = current[lastKey];
  if (Array.isArray(originalValue) && Array.isArray(newColor)) {
    // 元が3要素なら3要素、4要素なら4要素で更新
    if (originalValue.length === 3) {
      current[lastKey] = [newColor[0], newColor[1], newColor[2]];
    } else {
      current[lastKey] = newColor;
    }
  } else {
    current[lastKey] = newColor;
  }

  return newData;
}
