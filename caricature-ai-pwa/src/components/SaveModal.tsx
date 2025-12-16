import React, { useState } from 'react';
import { Button } from './Button';

interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (filename: string, format: 'png' | 'jpeg') => void;
}

export const SaveModal: React.FC<SaveModalProps> = ({ isOpen, onClose, onSave }) => {
  const [filename, setFilename] = useState('caricature');
  const [format, setFormat] = useState<'png' | 'jpeg'>('png');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl scale-100">
        <h3 className="text-xl font-bold mb-4 text-gray-800">Сохранить как...</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Имя файла</label>
            <input 
              type="text" 
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="Введите имя..."
              className="w-full p-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-secondary focus:bg-white outline-none transition-all"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Формат</label>
            <div className="flex gap-3">
              <button 
                onClick={() => setFormat('png')}
                className={`flex-1 py-3 rounded-xl font-bold border transition-all ${format === 'png' ? 'bg-secondary/10 border-secondary text-secondary shadow-sm' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                PNG
              </button>
              <button 
                onClick={() => setFormat('jpeg')}
                className={`flex-1 py-3 rounded-xl font-bold border transition-all ${format === 'jpeg' ? 'bg-secondary/10 border-secondary text-secondary shadow-sm' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                JPG
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl">Отмена</Button>
            <Button onClick={() => onSave(filename, format)} className="flex-1 rounded-xl">Скачать</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
