import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { validateApiKey } from '../services/geminiService';
import { AppSettings, AIProvider } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange: (settings: AppSettings | null) => void;
  currentSettings: AppSettings | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSettingsChange, currentSettings }) => {
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState(''); // Optional, for proxies
  
  const [status, setStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (currentSettings) {
        setProvider(currentSettings.provider);
        setApiKey(currentSettings.apiKey);
        setBaseUrl(currentSettings.baseUrl || '');
      } else {
        // Defaults
        setProvider('gemini');
        setApiKey('');
        setBaseUrl('');
      }
      setStatus('idle');
      setStatusMsg('');
    }
  }, [isOpen, currentSettings]);

  const handleSave = async () => {
    // Pollinations doesn't need a key
    if (provider !== 'pollinations' && !apiKey.trim()) {
      onSettingsChange(null);
      onClose();
      return;
    }

    setStatus('checking');
    setStatusMsg('Проверяем доступ...');

    const settingsToValidate: AppSettings = {
        provider,
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim() || undefined
    };

    const isValid = await validateApiKey(settingsToValidate);

    if (isValid) {
      setStatus('valid');
      setStatusMsg('Успешно подключено!');
      onSettingsChange(settingsToValidate);
      setTimeout(onClose, 1000);
    } else {
      setStatus('invalid');
      setStatusMsg('Ошибка проверки. Проверьте ключ или Интернет.');
    }
  };

  const handleClear = () => {
    setApiKey('');
    setBaseUrl('');
    onSettingsChange(null);
    onClose();
  };

  const getProviderInfo = (p: AIProvider) => {
      switch(p) {
          case 'gemini': return { icon: '✨', name: 'Google Gemini', desc: 'Лучшее качество. Видит фото.', hasFree: true, needsKey: true };
          case 'openai': return { icon: '🧠', name: 'OpenAI DALL-E', desc: 'Мощный, но платный. Игнорирует фото.', hasFree: false, needsKey: true };
          case 'stability': return { icon: '🎨', name: 'Stability AI', desc: 'Отлично обрабатывает фото (Img2Img).', hasFree: false, needsKey: true };
          case 'huggingface': return { icon: '🤗', name: 'Hugging Face', desc: 'Бесплатный токен. Хорошее качество.', hasFree: true, needsKey: true };
          case 'pollinations': return { icon: '🌸', name: 'Pollinations', desc: 'Полностью бесплатно. Без ключа.', hasFree: true, needsKey: false };
      }
  };

  if (!isOpen) return null;

  const currentInfo = getProviderInfo(provider);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in" style={{ touchAction: 'none' }}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl scale-100 relative max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
          ⚙️ Настройки Сервиса
        </h3>
        
        <div className="space-y-4">
          
          {/* Provider Selector */}
          <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Выберите сервис</label>
              <div className="grid grid-cols-3 gap-2">
                  {(['gemini', 'huggingface', 'pollinations', 'stability', 'openai'] as AIProvider[]).map(p => {
                      const info = getProviderInfo(p);
                      return (
                          <button
                            key={p}
                            onClick={() => { setProvider(p); setStatus('idle'); setStatusMsg(''); }}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all min-h-[70px] ${provider === p ? 'border-secondary bg-secondary/5 ring-1 ring-secondary' : 'border-gray-100 hover:border-gray-300'}`}
                          >
                              <span className="text-xl mb-1">{info.icon}</span>
                              <span className="text-[9px] font-bold text-gray-600 leading-tight text-center">{info.name}</span>
                          </button>
                      );
                  })}
              </div>
              <div className="mt-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{currentInfo.icon}</span>
                      <span className="font-bold text-sm text-gray-800">{currentInfo.name}</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                      {currentInfo.desc}
                  </p>
                  {!currentInfo.needsKey && (
                      <p className="text-xs text-green-600 font-bold mt-1">✅ Ключ не требуется!</p>
                  )}
              </div>
          </div>

          {/* API Key Input */}
          {currentInfo.needsKey && (
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">API Key</label>
                <input 
                type="password" 
                value={apiKey}
                onChange={(e) => {
                    setApiKey(e.target.value);
                    setStatus('idle');
                    setStatusMsg('');
                }}
                placeholder={`Ключ для ${currentInfo.name}`}
                className={`w-full p-3 rounded-xl bg-gray-50 border outline-none transition-all ${status === 'invalid' ? 'border-red-400 bg-red-50' : status === 'valid' ? 'border-green-400 bg-green-50' : 'border-gray-200 focus:border-secondary focus:bg-white'}`}
                />
                <div className="mt-2 text-right">
                    {provider === 'gemini' && <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-[10px] text-blue-500 hover:underline font-bold bg-blue-50 px-2 py-1 rounded">Получить ключ Google</a>}
                    {provider === 'openai' && <a href="https://platform.openai.com/api-keys" target="_blank" className="text-[10px] text-blue-500 hover:underline font-bold bg-blue-50 px-2 py-1 rounded">Получить ключ OpenAI</a>}
                    {provider === 'stability' && <a href="https://platform.stability.ai/account/keys" target="_blank" className="text-[10px] text-blue-500 hover:underline font-bold bg-blue-50 px-2 py-1 rounded">Получить ключ Stability</a>}
                    {provider === 'huggingface' && <a href="https://huggingface.co/settings/tokens" target="_blank" className="text-[10px] text-blue-500 hover:underline font-bold bg-blue-50 px-2 py-1 rounded">Получить токен HF</a>}
                </div>
            </div>
          )}
          
          {/* Base URL Input (Optional) - Hidden for Pollinations/HF unless needed */}
          {provider !== 'pollinations' && (
            <details className="group">
                <summary className="text-xs font-bold text-gray-500 cursor-pointer hover:text-dark select-none list-none flex items-center gap-1">
                    <span className="transform group-open:rotate-90 transition-transform">▶</span> Дополнительно (Proxy URL)
                </summary>
                <div className="mt-2 pl-2 border-l-2 border-gray-100">
                    <input 
                        type="text" 
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full p-2 text-xs rounded-lg bg-gray-50 border border-gray-200 focus:border-secondary outline-none"
                    />
                </div>
            </details>
          )}

          {statusMsg && (
                <p className={`text-xs mt-2 font-bold text-center animate-pulse ${status === 'valid' ? 'text-green-600' : status === 'invalid' ? 'text-red-500' : 'text-gray-500'}`}>
                    {statusMsg}
                </p>
          )}

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
