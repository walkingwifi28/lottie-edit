import type { TextLayerInfo } from '../types/lottie';

interface LottieTextLayer {
  ty: number;
  nm?: string;
  t?: {
    d?: {
      k?: Array<{
        s?: {
          t?: string;
        };
      }>;
    };
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractTextLayers(animationData: { layers?: any[] }): TextLayerInfo[] {
  const textLayers: TextLayerInfo[] = [];

  if (!animationData.layers) {
    return textLayers;
  }

  animationData.layers.forEach((layer: LottieTextLayer, index: number) => {
    // ty: 5 はテキストレイヤーを示す
    if (layer.ty === 5) {
      const textContent = layer.t?.d?.k?.[0]?.s?.t || '';
      textLayers.push({
        index,
        name: layer.nm || `Text Layer ${index}`,
        text: textContent,
      });
    }
  });

  return textLayers;
}
