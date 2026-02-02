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
ユーザーがLottieファイルをアップロードし、アニメーション内のテキストレイヤー・各種レイヤーの色・画像アセットをリアルタイムで編集できる。

## 技術スタック
- **フレームワーク**: Vite 7 + React 19 + TypeScript 5.9
- **アニメーション**: lottie-web
- **Lint**: ESLint 9 + typescript-eslint
- **パッケージマネージャー**: pnpm

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

### 5. 画像差し替え（LottieAnimation.tsx）
- `assets` 内の画像アセット（`p` を持つ要素）を検出
- サイドパネルから差し替え対象の画像アセットを選択
- 画像ファイル選択でData URLに変換し、`asset.p` に埋め込み
- `asset.u = ''` / `asset.e = 1` に更新して外部ファイル依存を排除
- 差し替え画像は元アセット枠サイズに contain で中央配置したData URLに変換して `asset.p` に埋め込み
- 画像レイヤー（`ty: 2`）の transform（位置/アンカー/スケール）は変更しない
- JSON更新後にアニメーションを再ロードして即時反映

### 6. 編集後JSONのファイル出力（LottieAnimation.tsx）
- サイドパネルから「編集後JSONを書き出し（画像埋め込み）」を実行可能
- 出力時に全画像アセットをData URL化し、`asset.u = ''` / `asset.e = 1` に正規化
- ダウンロード名は元ファイル名ベースで `*-edited-embedded.json`

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
pnpm dev      # 開発サーバー起動
pnpm build    # プロダクションビルド（tsc -b && vite build）
pnpm lint     # ESLint実行
pnpm preview  # ビルド結果プレビュー
```

## 注意事項
- Lottie JSONのレイヤータイプ判別：
  - テキストレイヤー: `layer.ty === 5`
  - シェイプレイヤー: `layer.ty === 4`
  - ソリッドレイヤー: `layer.ty === 1`
- テキスト更新は `renderer.elements[index].updateDocumentData()` を使用
- テキスト色の更新も `updateDocumentData({ fc: [r, g, b] })` で即時反映
- シェイプ/ソリッドの色更新はJSON編集後にアニメーション再ロードが必要
- 画像差し替えは `assets[n].p` をData URL化し、`assets[n].e = 1` にして再ロード
- JSON出力時も画像アセットをData URL化して埋め込み状態を保証してからダウンロード
- 画像差し替え時は元アセットの `w/h` を維持したまま `assets` の画像データのみ更新し、画像レイヤーの transform（位置/アンカー/スケール）は変更しない
- 日本語UIを使用
