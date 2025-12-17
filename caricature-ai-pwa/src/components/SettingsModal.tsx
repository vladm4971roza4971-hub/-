import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { validateApiKey, checkProxyConnection } from '../services/geminiService';
import { AppSettings, AIProvider, SavedCredential, SavedProxy } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange: (settings: AppSettings | null) => void;
  currentSettings: AppSettings | null;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSettingsChange, currentSettings }) => {
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  
  // Library State
  const [savedKeys, setSavedKeys] = useState<SavedCredential[]>([]);
  const [savedProxies, setSavedProxies] = useState<SavedProxy[]>([]);
  
  // UI State
  const [showKeyLibrary, setShowKeyLibrary] = useState(false);
  const [showProxyLibrary, setShowProxyLibrary] = useState(false);
  const [aliasInput, setAliasInput] = useState('');
  const [proxyAliasInput, setProxyAliasInput] = useState('');

  // Status
  const [status, setStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [statusMsg, setStatusMsg] = useState('');
  
  const [proxyStatus, setProxyStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  const [proxyMsg, setProxyMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (currentSettings) {
        setProvider(currentSettings.provider);
        setApiKey(currentSettings.apiKey);
        setBaseUrl(currentSettings.baseUrl || '');
      } else {
        setProvider('gemini');
        setApiKey('');
        setBaseUrl('');
      }
      
      // Load libraries
      const keys = JSON.parse(localStorage.getItem('saved_credentials') || '[]');
      const proxies = JSON.parse(localStorage.getItem('saved_proxies') || '[]');
      setSavedKeys(keys);
      setSavedProxies(proxies);
      
      setStatus('idle');
      setStatusMsg('');
      setProxyStatus('idle');
      setProxyMsg('');
      setShowKeyLibrary(false);
      setShowProxyLibrary(false);
    }
  }, [isOpen, currentSettings]);

  // --- HELPER: Normalize Proxy URL ---
  const normalizeProxyUrl = (input: string): string => {
      let url = input.trim();
      if (!url) return '';
      
      // 1. If user pasted "IP Port" (space or tab separated), replace with colon
      // Regex looks for: digits.digits... space digits
      if (!url.includes('://') && url.match(/^[\d\.]+\s+\d+$/)) {
          url = url.replace(/\s+/, ':');
      }

      // 2. Add protocol if missing
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
          url = `http://${url}`;
      }
      
      return url;
  };

  // --- KEY LOGIC ---

  const handleSaveKeyToLibrary = () => {
    if (!apiKey.trim() || !aliasInput.trim()) return;
    const newKey: SavedCredential = {
        id: Date.now().toString(),
        provider,
        alias: aliasInput.trim(),
        key: apiKey.trim(),
        createdAt: Date.now()
    };
    const updated = [...savedKeys, newKey];
    setSavedKeys(updated);
    localStorage.setItem('saved_credentials', JSON.stringify(updated));
    setAliasInput('');
    setShowKeyLibrary(true); // Switch to list view to confirm
  };

  const handleDeleteKey = (id: string) => {
    if(!window.confirm("Удалить этот ключ?")) return;
    const updated = savedKeys.filter(k => k.id !== id);
    setSavedKeys(updated);
    localStorage.setItem('saved_credentials', JSON.stringify(updated));
  };

  const handleSelectKey = (key: string) => {
      setApiKey(key);
      setShowKeyLibrary(false);
      setStatus('idle');
  };

  const checkKey = async () => {
      if (!apiKey) return;
      setStatus('checking');
      setStatusMsg('Проверка ключа...');
      
      const fixedBaseUrl = baseUrl ? normalizeProxyUrl(baseUrl) : undefined;
      if (fixedBaseUrl && fixedBaseUrl !== baseUrl) setBaseUrl(fixedBaseUrl);

      const isValid = await validateApiKey({ provider, apiKey, baseUrl: fixedBaseUrl });
      if (isValid) {
          setStatus('valid');
          setStatusMsg('✅ Ключ работает!');
      } else {
          setStatus('invalid');
          setStatusMsg('❌ Ошибка проверки. Неверный ключ или проблемы с сетью.');
      }
  };

  // --- PROXY LOGIC ---

  const handleSaveProxyToLibrary = () => {
      if (!baseUrl.trim() || !proxyAliasInput.trim()) return;
      
      const fixedUrl = normalizeProxyUrl(baseUrl);
      setBaseUrl(fixedUrl);

      const newProxy: SavedProxy = {
          id: Date.now().toString(),
          alias: proxyAliasInput.trim(),
          url: fixedUrl,
          createdAt: Date.now()
      };
      const updated = [...savedProxies, newProxy];
      setSavedProxies(updated);
      localStorage.setItem('saved_proxies', JSON.stringify(updated));
      setProxyAliasInput('');
      setShowProxyLibrary(true);
  };

  const handleDeleteProxy = (id: string) => {
      if(!window.confirm("Удалить этот прокси?")) return;
      const updated = savedProxies.filter(p => p.id !== id);
      setSavedProxies(updated);
      localStorage.setItem('saved_proxies', JSON.stringify(updated));
  };

  const handleSelectProxy = (url: string) => {
      setBaseUrl(url);
      setShowProxyLibrary(false);
      setProxyStatus('idle');
  };

  const checkProxy = async () => {
      if (!baseUrl) return;
      
      const fixedUrl = normalizeProxyUrl(baseUrl);
      setBaseUrl(fixedUrl); // Update UI with corrected URL

      setProxyStatus('checking');
      setProxyMsg('Пинг...');
      
      const isAlive = await checkProxyConnection(fixedUrl);
      if (isAlive) {
          setProxyStatus('valid');
          setProxyMsg('✅ Прокси доступен (200 OK)');
      } else {
          setProxyStatus('invalid');
          setProxyMsg('❌ Прокси недоступен или ошибка CORS');
      }
  };

  // --- GENERAL ---

  const handleApply = () => {
      if (provider !== 'pollinations' && !apiKey.trim()) {
        onSettingsChange(null);
        onClose();
        return;
      }
      
      const fixedBaseUrl = baseUrl ? normalizeProxyUrl(baseUrl) : undefined;

      const settings: AppSettings = {
          provider,
          apiKey: apiKey.trim(),
          baseUrl: fixedBaseUrl
      };
      onSettingsChange(settings);
      onClose();
  };

  const getProviderInfo = (p: AIProvider) => {
      switch(p) {
          case 'gemini': return { icon: '✨', name: 'Google Gemini', needsKey: true };
          case 'openai': return { icon: '🧠', name: 'OpenAI', needsKey: true };
          case 'stability': return { icon: '🎨', name: 'Stability AI', needsKey: true };
          case 'huggingface': return { icon: '🤗', name: 'Hugging Face', needsKey: true };
          case 'pollinations': return { icon: '🌸', name: 'Pollinations', needsKey: false };
      }
  };

  const currentInfo = getProviderInfo(provider);
  const relevantKeys = savedKeys.filter(k => k.provider === provider);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in" style={{ touchAction: 'none' }}>
      <div className="bg-white rounded-2xl p-0 w-full max-w-md shadow-2xl scale-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">⚙️ Настройки</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-dark">✕</button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
            
            {/* Provider Selection */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Сервис генерации</label>
              <div className="grid grid-cols-5 gap-2">
                  {(['gemini', 'openai', 'stability', 'huggingface', 'pollinations'] as AIProvider[]).map(p => {
                      const info = getProviderInfo(p);
                      return (
                          <button
                            key={p}
                            onClick={() => { setProvider(p); setStatus('idle'); setStatusMsg(''); }}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all h-[60px] ${provider === p ? 'border-primary bg-primary/5' : 'border-gray-100 hover:border-gray-300'}`}
                            title={info.name}
                          >
                              <span className="text-xl">{info.icon}</span>
                          </button>
                      );
                  })}
              </div>
              <p className="text-center text-xs font-bold mt-2 text-gray-700">{currentInfo.name}</p>
            </div>

            {/* API Key Section */}
            {currentInfo.needsKey && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">API Ключ</label>
                        <button onClick={() => setShowKeyLibrary(!showKeyLibrary)} className="text-xs text-primary font-bold hover:underline">
                            {showKeyLibrary ? '← Ввести вручную' : '📚 Выбрать из сохраненных'}
                        </button>
                    </div>

                    {!showKeyLibrary ? (
                        <>
                            <div className="flex gap-2">
                                <input 
                                    type="password" 
                                    value={apiKey} 
                                    onChange={(e) => { setApiKey(e.target.value); setStatus('idle'); }} 
                                    placeholder="sk-..." 
                                    className="flex-1 p-2 rounded-lg border outline-none text-sm font-mono"
                                />
                                <Button onClick={checkKey} isLoading={status === 'checking'} variant="secondary" className="px-3 py-1 text-xs">Проверить</Button>
                            </div>
                            
                            {/* Save Key UI */}
                            {apiKey && (
                                <div className="mt-2 flex gap-2 items-center animate-fade-in">
                                    <input 
                                        type="text" 
                                        value={aliasInput} 
                                        onChange={e => setAliasInput(e.target.value)} 
                                        placeholder="Название (напр. 'Мой Про')" 
                                        className="flex-1 p-2 text-xs border-b bg-transparent outline-none"
                                    />
                                    <button onClick={handleSaveKeyToLibrary} disabled={!aliasInput} className="text-xs bg-dark text-white px-3 py-2 rounded-lg disabled:opacity-50">Сохранить</button>
                                </div>
                            )}
                            
                            {statusMsg && (
                                <div className={`mt-2 text-xs font-bold p-2 rounded ${status === 'valid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {statusMsg}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="space-y-2">
                            {relevantKeys.length === 0 ? (
                                <p className="text-xs text-center text-gray-400 py-4">Нет сохраненных ключей для {currentInfo.name}</p>
                            ) : (
                                relevantKeys.map(k => (
                                    <div key={k.id} className="flex items-center justify-between bg-white p-2 rounded border hover:border-primary cursor-pointer group" onClick={() => handleSelectKey(k.key)}>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-sm text-gray-800">{k.alias}</span>
                                            <span className="text-[10px] text-gray-400 font-mono">...{k.key.slice(-4)}</span>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteKey(k.id); }} className="p-2 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded">🗑️</button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Proxy Section */}
            {provider !== 'pollinations' && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                     <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Proxy / Base URL</label>
                        <button onClick={() => setShowProxyLibrary(!showProxyLibrary)} className="text-xs text-secondary font-bold hover:underline">
                            {showProxyLibrary ? '← Ввести вручную' : '📚 Выбрать прокси'}
                        </button>
                    </div>

                    {!showProxyLibrary ? (
                        <>
                             <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={baseUrl} 
                                    onChange={(e) => { setBaseUrl(e.target.value); setProxyStatus('idle'); }} 
                                    placeholder="https://..." 
                                    className="flex-1 p-2 rounded-lg border outline-none text-sm"
                                />
                                <Button onClick={checkProxy} isLoading={proxyStatus === 'checking'} variant="outline" className="px-3 py-1 text-xs border-gray-300 text-gray-600">Тест</Button>
                            </div>
                            
                            {/* Proxy Format Hint - Custom Styling per Request */}
                            <div className="mt-3 text-[10px] text-gray-500 bg-blue-50 p-3 rounded-xl border border-blue-100 space-y-2">
                              <p className="font-bold text-blue-700">📌 Как настроить прокси (формат URL):</p>
                              
                              <div className="grid grid-cols-1 gap-1 font-mono text-gray-600">
                                <div><span className="font-bold text-gray-500">Пример 1:</span> http://123.45.67.89:8080</div>
                                <div><span className="font-bold text-gray-500">Пример 2:</span> http://user:pass@123.45.67.89:8080</div>
                              </div>
                              
                              <div className="pt-2 border-t border-blue-200 grid grid-cols-2 gap-x-2 gap-y-1">
                                <div className="flex justify-between"><span>IP прокси:</span> <span className="font-bold">123.45.67.89</span></div>
                                <div className="flex justify-between"><span>Порт:</span> <span className="font-bold">8080</span></div>
                                <div className="col-span-2 flex justify-between"><span>Тип:</span> <span className="font-bold">http:// или https://</span></div>
                                <div className="col-span-2 border-t border-blue-200 mt-1 pt-1 text-xs opacity-75">
                                  Логин/пароль — указывать перед IP через @
                                </div>
                              </div>
                            </div>

                             {baseUrl && (
                                <div className="mt-2 flex gap-2 items-center animate-fade-in">
                                    <input 
                                        type="text" 
                                        value={proxyAliasInput} 
                                        onChange={e => setProxyAliasInput(e.target.value)} 
                                        placeholder="Название (напр. 'Домашний')" 
                                        className="flex-1 p-2 text-xs border-b bg-transparent outline-none"
                                    />
                                    <button onClick={handleSaveProxyToLibrary} disabled={!proxyAliasInput} className="text-xs bg-gray-600 text-white px-3 py-2 rounded-lg disabled:opacity-50">Сохранить</button>
                                </div>
                            )}

                             {proxyMsg && (
                                <div className={`mt-2 text-xs font-bold p-2 rounded ${proxyStatus === 'valid' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {proxyMsg}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="space-y-2">
                            {savedProxies.length === 0 ? (
                                <p className="text-xs text-center text-gray-400 py-4">Нет сохраненных прокси</p>
                            ) : (
                                savedProxies.map(p => (
                                    <div key={p.id} className="flex items-center justify-between bg-white p-2 rounded border hover:border-secondary cursor-pointer" onClick={() => handleSelectProxy(p.url)}>
                                        <div className="flex flex-col overflow-hidden">
                                            <span className="font-bold text-sm text-gray-800">{p.alias}</span>
                                            <span className="text-[10px] text-gray-400 truncate w-40">{p.url}</span>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); handleDeleteProxy(p.id); }} className="p-2 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded">🗑️</button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 rounded-b-2xl flex gap-3">
            <Button variant="outline" onClick={() => { onSettingsChange(null); onClose(); }} className="flex-1 text-xs">Сбросить</Button>
            <Button onClick={handleApply} className="flex-[2]">Применить</Button>
        </div>

      </div>
    </div>
  );
};
