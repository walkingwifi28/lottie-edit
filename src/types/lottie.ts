// RGB色（Lottie内部形式: 0.0〜1.0）
export type LottieRGB = [number, number, number];
export type LottieRGBA = [number, number, number, number];

// 色の種類
export type ColorType = 'text' | 'fill' | 'stroke' | 'solid';

// 単一の色情報
export interface ColorInfo {
  id: string;                    // 一意のID（例: "layer-3-fill-0"）
  type: ColorType;               // 色の種類
  path: (string | number)[];     // JSONパス
  color: LottieRGBA;             // 現在の色
}

// レイヤーの色情報
export interface ColorLayerInfo {
  index: number;                 // レイヤーインデックス
  name: string;                  // レイヤー名
  layerType: number;             // Lottieレイヤータイプ (1, 4, 5)
  colors: ColorInfo[];           // このレイヤー内の全色
}

// テキストレイヤー情報（既存、互換性のため維持）
export interface TextLayerInfo {
  index: number;    // レイヤーインデックス
  name: string;     // レイヤー名（UI表示用）
  text: string;     // 現在のテキスト
}
