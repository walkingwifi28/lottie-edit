# Lottie Text Editor - プロジェクト仕様

## Claude Codeへの指示
- **仕様変更時は必ずこのファイルを更新すること**
- 機能の追加・削除・変更を行った場合、該当セクションを同期的に更新する
- 新しいファイル/コンポーネント追加時はディレクトリ構造セクションに反映
- 型定義の変更時は型定義セクションを更新
- 依存関係の追加/削除時は技術スタックを更新

## 概要
Lottie JSONアニメーションのビューアー兼テキスト編集ツール。
ユーザーがLottieファイルをアップロードし、アニメーション内のテキストレイヤーをリアルタイムで編集できる。

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
│   └── TextEditor.tsx       # テキストレイヤー編集UI
├── types/
│   └── lottie.ts            # TextLayerInfo型定義
└── utils/
    └── lottieTextUtils.ts   # Lottie JSONからテキストレイヤー抽出
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

## 型定義

```typescript
// TextLayerInfo（types/lottie.ts）
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
- Lottie JSONのテキストレイヤーは `layer.ty === 5` で判別
- テキスト更新は `renderer.elements[index].updateDocumentData()` を使用
- 日本語UIを使用
