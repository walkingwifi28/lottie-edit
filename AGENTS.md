# Lottie Editor - プロジェクト仕様

このファイルは `.claude/CLAUDE.md` の内容を AGENT 向けに共有したものです。仕様変更時は **両方を同期** してください。

## Claude Codeへの指示
- **仕様変更時は必ずこのファイルを更新すること**
- 機能の追加・削除・変更を行った場合、該当セクションを同期的に更新する
- 新しいファイル/コンポーネント追加時はディレクトリ構造セクションに反映
- 型定義の変更時は型定義セクションを更新
- 依存関係の追加/削除時は技術スタックを更新

## 概要
Lottie JSONアニメーションのビューアー兼編集ツール。
ユーザーがLottieファイルをアップロードし、アニメーション内のテキストレイヤーと各種レイヤーの色をリアルタイムで編集できる。

## 技術スタック
- **フレームワーク**: Vite 7 + React 19 + TypeScript 5.9
- **アニメーション**: lottie-web
- **Lint**: ESLint 9 + typescript-eslint

## ディレクトリ構造
```
src/
├── App.tsx              # エントリポイント、LottieAnimationをレンダリング
├── App.css              # 全体スタイル
├── main.tsx             # Reactのルート
├── components/
│   ├── LottieAnimation.tsx  # メインコンポーネント（ファイルアップロード＆アニメーション表示）
│   ├── TextEditor.tsx       # テキストレイヤー編集UI
│   └── ColorEditor.tsx      # 色編集UI
├── types/
│   └── lottie.ts            # 型定義（TextLayerInfo, ColorLayerInfo, ColorInfo等）
└── utils/
    ├── lottieTextUtils.ts   # Lottie JSONからテキストレイヤー抽出
    ├── lottieColorUtils.ts  # Lottie JSONから色情報抽出・更新
    └── colorUtils.ts        # RGB⇔HEX変換ユーティリティ
```

## 主要機能

### 1. ファイルアップロード（LottieAnimation.tsx）
- ドラッグ&ドロップ対応
- ファイル選択ボタン
- JSONバリデーション（Lottie形式チェック）

### 2. アニメーション再生
- lottie-webで自動再生＆ループ
- SVGレンダラー使用

### 3. テキスト編集（TextEditor.tsx）
- Lottie JSONからテキストレイヤー（ty: 5）を抽出
- 各レイヤーのテキストを入力フィールドで編集
- 保存ボタンでアニメーションに反映（updateDocumentData API使用）

### 4. 色編集（ColorEditor.tsx）
- 対応レイヤータイプ：
  - テキストレイヤー（ty: 5）: `layer.t.d.k[0].s.fc` - updateDocumentData APIで即時反映
  - シェイプレイヤー（ty: 4）: fill（塗り）/stroke（線） - JSON更新+再ロード
  - ソリッドレイヤー（ty: 1）: `layer.sc` - JSON更新+再ロード
- カラーピッカーで色を選択
- リアルタイムでアニメーションに反映

## 型定義

```typescript
// types/lottie.ts

// RGB色（Lottie内部形式: 0.0〜1.0）
type LottieRGB = [number, number, number];
type LottieRGBA = [number, number, number, number];

// 色の種類
type ColorType = 'text' | 'fill' | 'stroke' | 'solid';

// 単一の色情報
interface ColorInfo {
  id: string;                    // 一意のID（例: "layer-3-fill-0"）
  type: ColorType;               // 色の種類
  path: (string | number)[];     // JSONパス
  color: LottieRGBA;             // 現在の色
}

// レイヤーの色情報
interface ColorLayerInfo {
  index: number;                 // レイヤーインデックス
  name: string;                  // レイヤー名
  layerType: number;             // Lottieレイヤータイプ (1, 4, 5)
  colors: ColorInfo[];           // このレイヤー内の全色
}

// テキストレイヤー情報
interface TextLayerInfo {
  index: number;    // レイヤーインデックス
  name: string;     // レイヤー名
  text: string;     // テキスト内容
}
```

## コマンド
```bash
npm run dev      # 開発サーバー起動
npm run build    # プロダクションビルド（tsc -b && vite build）
npm run lint     # ESLint実行
npm run preview  # ビルド結果プレビュー
```

## 注意事項
- Lottie JSONのレイヤータイプ判別：
  - テキストレイヤー: `layer.ty === 5`
  - シェイプレイヤー: `layer.ty === 4`
  - ソリッドレイヤー: `layer.ty === 1`
- テキスト更新は `renderer.elements[index].updateDocumentData()` を使用
- テキスト色の更新も `updateDocumentData({ fc: [r, g, b] })` で即時反映
- シェイプ/ソリッドの色更新はJSON編集後にアニメーション再ロードが必要
- 日本語UIを使用
