import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { validateApiKey } from '../services/geminiService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApiKeyChange: (key: string | null) => void;
  currentKey: string | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onApiKeyChange, currentKey }) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setApiKeyInput(currentKey || '');
      setStatus('idle');
      setStatusMsg('');
    }
  }, [isOpen, currentKey]);

  const handleSave = async () => {
    if (!apiKeyInput.trim()) {
      onApiKeyChange(null);
      onClose();
      return;
    }

    setStatus('checking');
    setStatusMsg('Проверяем ключ...');

    const isValid = await validateApiKey(apiKeyInput.trim());

    if (isValid) {
      setStatus('valid');
      setStatusMsg('Ключ успешно проверен и сохранен!');
      onApiKeyChange(apiKeyInput.trim());
      setTimeout(onClose, 1000);
    } else {
      setStatus('invalid');
      setStatusMsg('Неверный ключ или ошибка доступа к API.');
    }
  };

  const handleClear = () => {
    setApiKeyInput('');
    onApiKeyChange(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in" style={{ touchAction: 'none' }}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl scale-100 relative">
        <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
          ⚙️ Настройки API
        </h3>
        
        <p className="text-xs text-gray-500 mb-4">
          По умолчанию используется встроенный ключ. Вы можете использовать свой ключ Google Gemini API.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">API Key</label>
            <input 
              type="password" 
              value={apiKeyInput}
              onChange={(e) => {
                  setApiKeyInput(e.target.value);
                  setStatus('idle');
                  setStatusMsg('');
              }}
              placeholder="Введите ключ (AIza...)"
              className={`w-full p-3 rounded-xl bg-gray-50 border outline-none transition-all ${status === 'invalid' ? 'border-red-400 bg-red-50' : status === 'valid' ? 'border-green-400 bg-green-50' : 'border-gray-200 focus:border-secondary focus:bg-white'}`}
            />
            {statusMsg && (
                <p className={`text-xs mt-2 font-bold ${status === 'valid' ? 'text-green-600' : status === 'invalid' ? 'text-red-500' : 'text-gray-500'}`}>
                    {statusMsg}
                </p>
            )}
            <div className="mt-2 text-right">
                 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-secondary hover:underline font-bold">Получить ключ →</a>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleClear} className="flex-1 rounded-xl text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600">Сбросить</Button>
            <Button onClick={handleSave} isLoading={status === 'checking'} className="flex-1 rounded-xl">Сохранить</Button>
          </div>
          
          <button onClick={onClose} className="w-full text-xs text-gray-400 py-2 hover:text-gray-600">Закрыть</button>
        </div>
      </div>
    </div>
  );
};
