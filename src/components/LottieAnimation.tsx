import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
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
  assets?: unknown[];
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

const getImageSizeFromDataUrl = (dataUrl: string): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('画像のサイズ取得に失敗しました'));
    img.src = dataUrl;
  });

const loadImageFromDataUrl = (dataUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('画像の読み込みに失敗しました'));
    img.src = dataUrl;
  });

const createContainedImageDataUrl = async (
  sourceDataUrl: string,
  frameWidth: number,
  frameHeight: number
): Promise<string> => {
  const img = await loadImageFromDataUrl(sourceDataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = frameWidth;
  canvas.height = frameHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvasの初期化に失敗しました');

  const ratio = Math.min(frameWidth / img.naturalWidth, frameHeight / img.naturalHeight);
  const drawWidth = img.naturalWidth * ratio;
  const drawHeight = img.naturalHeight * ratio;
  const offsetX = (frameWidth - drawWidth) / 2;
  const offsetY = (frameHeight - drawHeight) / 2;
  ctx.clearRect(0, 0, frameWidth, frameHeight);
  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  return canvas.toDataURL('image/png');
};

const toValidNumber = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const LottieAnimation = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationItem | null>(null);
  const animationDataRef = useRef<LottieJSON | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [animationData, setAnimationData] = useState<LottieJSON | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageAssetIndex, setSelectedImageAssetIndex] = useState<number | null>(null);
  const [animationKey, setAnimationKey] = useState(0);

  const textLayers = useMemo<TextLayerInfo[]>(
    () => (animationData ? extractTextLayers(animationData) : []),
    [animationData]
  );
  const colorLayers = useMemo<ColorLayerInfo[]>(
    () => (animationData ? extractAllColors(animationData) : []),
    [animationData]
  );
  const imageAssetIndices = useMemo<number[]>(
    () =>
      (animationData?.assets ?? [])
        .map((asset, index) => {
          const item = asset as Record<string, unknown>;
          return typeof item.p === 'string' ? index : -1;
        })
        .filter((index) => index >= 0),
    [animationData]
  );
  const activeImageAssetIndex = useMemo<number | null>(() => {
    if (imageAssetIndices.length === 0) return null;
    if (selectedImageAssetIndex !== null && imageAssetIndices.includes(selectedImageAssetIndex)) {
      return selectedImageAssetIndex;
    }
    return imageAssetIndices[0];
  }, [imageAssetIndices, selectedImageAssetIndex]);

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
          setSelectedImageAssetIndex(null);
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

  const handleImageButtonClick = useCallback(() => {
    imageInputRef.current?.click();
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

  const handleImageFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const imageFile = files[0];
    if (!imageFile.type.startsWith('image/')) {
      setError('画像ファイルを選択してください');
      return;
    }

    if (activeImageAssetIndex === null) {
      setError('置き換え対象の画像アセットが見つかりません');
      return;
    }

    const sourceData = animationDataRef.current ?? animationData;
    if (!sourceData?.assets) {
      setError('画像アセットが見つかりません');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : null;
      if (!dataUrl) {
        setError('画像の読み込みに失敗しました');
        return;
      }

      try {
        const { width: imageWidth, height: imageHeight } = await getImageSizeFromDataUrl(dataUrl);
        if (imageWidth <= 0 || imageHeight <= 0) {
          setError('画像サイズが不正です');
          return;
        }

        const updatedData = cloneLottieJSON(sourceData);
        const assets = updatedData.assets as Array<Record<string, unknown>>;
        const targetAsset = assets[activeImageAssetIndex];
        if (!targetAsset) {
          setError('置き換え対象の画像が見つかりません');
          return;
        }

        const frameWidth = toValidNumber(targetAsset.w, imageWidth);
        const frameHeight = toValidNumber(targetAsset.h, imageHeight);
        const normalizedDataUrl = await createContainedImageDataUrl(dataUrl, frameWidth, frameHeight);

        targetAsset.p = normalizedDataUrl;
        targetAsset.u = '';
        targetAsset.e = 1;
        targetAsset.w = frameWidth;
        targetAsset.h = frameHeight;

        animationDataRef.current = updatedData;
        setAnimationKey((prev) => prev + 1);
        setAnimationData(updatedData);
        setError(null);
      } catch {
        setError('画像の読み込みに失敗しました');
      }
    };

    reader.onerror = () => {
      setError('画像の読み込みに失敗しました');
    };
    reader.readAsDataURL(imageFile);

    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  }, [activeImageAssetIndex, animationData]);

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
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageFileSelect}
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
          <div className="image-editor">
            <h3>画像差し替え</h3>
            {imageAssetIndices.length > 0 ? (
              <>
                <select
                  className="image-asset-select"
                  value={activeImageAssetIndex ?? imageAssetIndices[0]}
                  onChange={(e) => setSelectedImageAssetIndex(Number(e.target.value))}
                >
                  {imageAssetIndices.map((assetIndex) => (
                    <option key={assetIndex} value={assetIndex}>
                      画像アセット #{assetIndex}
                    </option>
                  ))}
                </select>
                <button className="file-select-btn image-select-btn" onClick={handleImageButtonClick}>
                  画像を選択
                </button>
              </>
            ) : (
              <p className="no-layers">画像アセットが見つかりません</p>
            )}
          </div>
          <TextEditor textLayers={textLayers} onUpdateText={handleUpdateText} />
          <ColorEditor colorLayers={colorLayers} onUpdateColor={handleUpdateColor} />
        </div>
      )}
    </div>
  );
};

export default LottieAnimation;
