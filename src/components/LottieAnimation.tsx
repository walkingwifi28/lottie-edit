import { useRef, useEffect, useState, useCallback } from 'react';
import lottie from 'lottie-web';
import type { AnimationItem } from 'lottie-web';
import TextEditor from './TextEditor';
import { extractTextLayers } from '../utils/lottieTextUtils';
import type { TextLayerInfo } from '../types/lottie';

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

const LottieAnimation = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<AnimationItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [animationData, setAnimationData] = useState<LottieJSON | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textLayers, setTextLayers] = useState<TextLayerInfo[]>([]);

  useEffect(() => {
    if (animationRef.current) {
      animationRef.current.destroy();
      animationRef.current = null;
    }

    if (containerRef.current && animationData) {
      animationRef.current = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: true,
        autoplay: true,
        animationData: animationData,
      });

      // テキストレイヤーを抽出
      const layers = extractTextLayers(animationData);
      setTextLayers(layers);
    }

    return () => {
      if (animationRef.current) {
        animationRef.current.destroy();
        animationRef.current = null;
      }
    };
  }, [animationData]);

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

      // textLayersのstateも更新
      setTextLayers((prev) =>
        prev.map((layer) =>
          layer.index === layerIndex ? { ...layer, text: newText } : layer
        )
      );
    }
  }, []);

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
          <div ref={containerRef} id="lottie" />
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
        </div>
      )}
    </div>
  );
};

export default LottieAnimation;
