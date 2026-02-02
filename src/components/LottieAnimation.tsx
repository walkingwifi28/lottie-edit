import { useRef, useEffect, useState, useCallback } from 'react';
import lottie from 'lottie-web';
import type { AnimationItem } from 'lottie-web';
import TextEditor from './TextEditor';
import ColorEditor from './ColorEditor';
import { extractTextLayers } from '../utils/lottieTextUtils';
import { extractAllColors, updateColorInJson } from '../utils/lottieColorUtils';
import type { TextLayerInfo, ColorLayerInfo, LottieRGBA } from '../types/lottie';

interface LottieJSON {
  v?: string;
  fr?: number;
  ip?: number;
  op?: number;
  w?: number;
  h?: number;
  layers?: unknown[];
}

const isValidLottieJSON = (data: unknown): data is LottieJSON => {
  if (typeof data !== 'object' || data === null) return false;
  const json = data as LottieJSON;
  return (
    typeof json.v === 'string' &&
    typeof json.fr === 'number' &&
    typeof json.ip === 'number' &&
    typeof json.op === 'number' &&
    typeof json.w === 'number' &&
    typeof json.h === 'number' &&
    Array.isArray(json.layers)
  );
};

const cloneLottieJSON = <T,>(data: T): T => JSON.parse(JSON.stringify(data)) as T;

const LottieAnimation = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationItem | null>(null);
  const animationDataRef = useRef<LottieJSON | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [animationData, setAnimationData] = useState<LottieJSON | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textLayers, setTextLayers] = useState<TextLayerInfo[]>([]);
  const [colorLayers, setColorLayers] = useState<ColorLayerInfo[]>([]);
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    if (animationData) {
      animationDataRef.current = animationData;
    }

    // コンテナのサイズを保持してレイアウトシフトを防ぐ（破棄前に取得）
    const container = containerRef.current;
    let prevWidth = 0;
    let prevHeight = 0;
    if (container) {
      prevWidth = container.offsetWidth;
      prevHeight = container.offsetHeight;
    }

    if (animationRef.current) {
      animationRef.current.destroy();
      animationRef.current = null;
    }

    if (container && animationData) {
      // 破棄前に取得したサイズを設定
      if (prevWidth > 0 && prevHeight > 0) {
        container.style.minWidth = `${prevWidth}px`;
        container.style.minHeight = `${prevHeight}px`;
      }

      animationRef.current = lottie.loadAnimation({
        container: container,
        renderer: 'svg',
        loop: true,
        autoplay: false,
        // lottie-web mutates animationData internally, so always pass a deep copy.
        animationData: cloneLottieJSON(animationData),
        rendererSettings: {
          preserveAspectRatio: 'xMidYMid meet',
        },
      });

      // アニメーション読み込み完了後に再生開始
      // 注意: フレーム位置の復元は行わない（リピーターやエクスプレッションを持つ
      // レイヤーで内部状態が破損するため、常にフレーム0から再生する）
      const anim = animationRef.current;
      anim.addEventListener('DOMLoaded', () => {
        container.style.minWidth = '';
        container.style.minHeight = '';
        anim.play();
      });

      // テキストレイヤーを抽出
      const layers = extractTextLayers(animationData);
      setTextLayers(layers);

      // 色レイヤーを抽出
      const colors = extractAllColors(animationData);
      setColorLayers(colors);
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.destroy();
        animationRef.current = null;
      }
    };
  }, [animationData, animationKey]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith('.json')) {
      setError('JSONファイルを選択してください');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (isValidLottieJSON(json)) {
          animationDataRef.current = json;
          setAnimationData(json);
          setError(null);
        } else {
          setError('有効なLottie JSONファイルではありません');
        }
      } catch {
        setError('JSONの解析に失敗しました');
      }
    };
    reader.onerror = () => setError('ファイルの読み込みに失敗しました');
    reader.readAsText(file);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  }, [processFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFile]);

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleUpdateText = useCallback((layerIndex: number, newText: string) => {
    if (animationRef.current) {
      // lottie-webのupdateDocumentData APIを使用してテキストを更新
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (animationRef.current as any).renderer.elements[layerIndex]?.updateDocumentData({ t: newText }, 0);

      if (animationDataRef.current) {
        animationDataRef.current = updateColorInJson(
          animationDataRef.current,
          ['layers', layerIndex, 't', 'd', 'k', 0, 's', 't'],
          newText
        ) as LottieJSON;
      }

      // textLayersのstateも更新
      setTextLayers((prev) =>
        prev.map((layer) =>
          layer.index === layerIndex ? { ...layer, text: newText } : layer
        )
      );
    }
  }, []);

  const handleUpdateColor = useCallback((
    colorId: string,
    path: (string | number)[],
    newColor: LottieRGBA | string
  ) => {
    if (!animationRef.current) return;

    // テキストレイヤーの場合はupdateDocumentData APIを使用
    if (colorId.includes('-text')) {
      const layerIndex = parseInt(colorId.split('-')[1]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const element = (animationRef.current as any).renderer.elements[layerIndex];
      if (element?.updateDocumentData) {
        element.updateDocumentData({ fc: (newColor as LottieRGBA).slice(0, 3) }, 0);
      }
      if (animationDataRef.current) {
        animationDataRef.current = updateColorInJson(
          animationDataRef.current,
          path,
          newColor
        ) as LottieJSON;
      }
      // colorLayersのstateを更新
      setColorLayers(prev =>
        prev.map(layer => ({
          ...layer,
          colors: layer.colors.map(c =>
            c.id === colorId ? { ...c, color: newColor as LottieRGBA } : c
          )
        }))
      );
    } else {
      // その他のレイヤーはJSON更新 + 再ロード
      const sourceData = animationDataRef.current ?? animationData;
      if (!sourceData) return;
      const updatedData = updateColorInJson(sourceData, path, newColor) as LottieJSON;
      animationDataRef.current = updatedData;
      // キーを更新してコンテナを強制的に再マウント（リピーター等の内部状態をリセット）
      setAnimationKey(prev => prev + 1);
      setAnimationData(updatedData);
    }
  }, [animationData]);

  return (
    <div className="app-container">
      <div
        className="drop-zone"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {animationData ? (
          <div key={animationKey} ref={containerRef} id="lottie" />
        ) : (
          <div className="drop-hint">
            <p>Lottie JSONファイルをドロップ</p>
            <p>または</p>
            <button className="file-select-btn" onClick={handleButtonClick}>
              ファイルを選択
            </button>
          </div>
        )}

        {isDragging && (
          <div className="drop-overlay">
            <p>ここにドロップ</p>
          </div>
        )}

        {error && <div className="error-toast">{error}</div>}
      </div>

      {animationData && (
        <div className="side-panel">
          <TextEditor textLayers={textLayers} onUpdateText={handleUpdateText} />
          <ColorEditor colorLayers={colorLayers} onUpdateColor={handleUpdateColor} />
        </div>
      )}
    </div>
  );
};

export default LottieAnimation;
