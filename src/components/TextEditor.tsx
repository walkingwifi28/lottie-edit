import { useEffect, useState } from 'react';
import type { TextLayerInfo } from '../types/lottie';

interface TextEditorProps {
  textLayers: TextLayerInfo[];
  onUpdateText: (index: number, newText: string) => void;
}

const buildEditedTexts = (textLayers: TextLayerInfo[]): Record<number, string> =>
  textLayers.reduce<Record<number, string>>((acc, layer) => {
    acc[layer.index] = layer.text;
    return acc;
  }, {});

const TextEditor = ({ textLayers, onUpdateText }: TextEditorProps) => {
  const [editedTexts, setEditedTexts] = useState<Record<number, string>>(() => buildEditedTexts(textLayers));

  useEffect(() => {
    setEditedTexts(buildEditedTexts(textLayers));
  }, [textLayers]);

  const handleTextChange = (index: number, value: string) => {
    setEditedTexts((prev) => ({
      ...prev,
      [index]: value,
    }));
  };

  const handleSave = (index: number) => {
    const newText = editedTexts[index];
    if (newText !== undefined) {
      onUpdateText(index, newText);
    }
  };

  if (textLayers.length === 0) {
    return (
      <div className="text-editor">
        <h3>テキストレイヤー</h3>
        <p className="no-layers">テキストレイヤーが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="text-editor">
      <h3>テキストレイヤー</h3>
      <div className="text-layers-list">
        {textLayers.map((layer) => (
          <div key={layer.index} className="text-layer-item">
            <label className="layer-name">{layer.name}</label>
            <input
              type="text"
              value={editedTexts[layer.index] ?? layer.text}
              onChange={(e) => handleTextChange(layer.index, e.target.value)}
              className="text-input"
            />
            <button
              onClick={() => handleSave(layer.index)}
              className="save-btn"
            >
              保存
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TextEditor;
