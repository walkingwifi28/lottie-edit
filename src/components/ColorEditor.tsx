import { useState, useEffect } from 'react';
import type { ColorLayerInfo, ColorInfo, LottieRGBA } from '../types/lottie';
import { lottieRGBAToHex, hexToLottieRGBA } from '../utils/colorUtils';

interface ColorEditorProps {
  colorLayers: ColorLayerInfo[];
  onUpdateColor: (colorId: string, path: (string | number)[], newColor: LottieRGBA | string) => void;
}

const ColorEditor = ({ colorLayers, onUpdateColor }: ColorEditorProps) => {
  // 編集中の色を保持（colorId -> hex文字列）
  const [editedColors, setEditedColors] = useState<Record<string, string>>({});

  // colorLayersが変更されたら初期値を設定
  useEffect(() => {
    const initial: Record<string, string> = {};
    colorLayers.forEach((layer) => {
      layer.colors.forEach((colorInfo) => {
        initial[colorInfo.id] = lottieRGBAToHex(colorInfo.color);
      });
    });
    setEditedColors(initial);
  }, [colorLayers]);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'text': return 'テキスト';
      case 'fill': return '塗り';
      case 'stroke': return '線';
      case 'solid': return '背景';
      default: return type;
    }
  };

  const handleColorChange = (colorId: string, hexColor: string) => {
    setEditedColors((prev) => ({
      ...prev,
      [colorId]: hexColor,
    }));
  };

  const handleSave = (colorInfo: ColorInfo) => {
    const hexColor = editedColors[colorInfo.id];
    if (hexColor === undefined) return;

    // solidの場合はHEX文字列で更新
    if (colorInfo.type === 'solid') {
      onUpdateColor(colorInfo.id, colorInfo.path, hexColor);
    } else {
      const rgba = hexToLottieRGBA(hexColor);
      onUpdateColor(colorInfo.id, colorInfo.path, rgba);
    }
  };

  if (colorLayers.length === 0) {
    return (
      <div className="color-editor">
        <h3>色設定</h3>
        <p className="no-layers">色を持つレイヤーが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="color-editor">
      <h3>色設定</h3>
      <div className="color-layers-list">
        {colorLayers.map((layer) => (
          <div key={layer.index} className="color-layer-item">
            <div className="layer-header">{layer.name}</div>
            {layer.colors.map((colorInfo) => (
              <div key={colorInfo.id} className="color-row">
                <span className="color-type">{getTypeLabel(colorInfo.type)}</span>
                <input
                  type="color"
                  value={editedColors[colorInfo.id] ?? lottieRGBAToHex(colorInfo.color)}
                  onChange={(e) => handleColorChange(colorInfo.id, e.target.value)}
                  className="color-input"
                />
                <span className="color-hex">
                  {editedColors[colorInfo.id] ?? lottieRGBAToHex(colorInfo.color)}
                </span>
                <button
                  onClick={() => handleSave(colorInfo)}
                  className="save-btn color-save-btn"
                >
                  保存
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ColorEditor;
