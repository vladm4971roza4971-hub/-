import React, { useState, useRef, useEffect } from 'react';
import { AppState, ArtStyle, Tool } from './types';
import type { HistoryItem, SelectionData, Point, ReferenceImage, AppSettings } from './types';
import { Button } from './components/Button';
import { Spinner } from './components/Spinner';
import { StyleSelector } from './components/StyleSelector';
import { SaveModal } from './components/SaveModal';
import { SettingsModal } from './components/SettingsModal';
import { generateCaricature, fileToBase64 } from './services/geminiService';
import { saveHistoryItem, getHistoryItems } from './services/dbService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  
  // Images Data
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [rawBase64, setRawBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  
  // Reference Images
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [activeReferenceId, setActiveReferenceId] = useState<string | null>(null);

  // Settings
  const [selectedStyle, setSelectedStyle] = useState<ArtStyle>(ArtStyle.CARTOON);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  
  // Tools
  const [activeTool, setActiveTool] = useState<Tool>(Tool.NONE);
  const [selection, setSelection] = useState<SelectionData | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentRect, setCurrentRect] = useState<{x:number, y:number, w:number, h:number} | null>(null);

  // Tool Settings
  const [brushSize, setBrushSize] = useState<number>(30);
  const [brushHardness, setBrushHardness] = useState<number>(80);
  const [stampScale, setStampScale] = useState<number>(1);
  const [stampRotation, setStampRotation] = useState<number>(0);
  const [stampSource, setStampSource] = useState<HTMLImageElement | null>(null);
  const [lastPos, setLastPos] = useState<Point | null>(null);

  // App Misc
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({ brightness: 100, contrast: 100, saturation: 100 });
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Settings
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const selectionCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  const currentDisplayImage = activeReferenceId 
    ? referenceImages.find(r => r.id === activeReferenceId)?.originalUrl || null 
    : originalImage;
  
  const showEnglishHint = appSettings && ['pollinations', 'stability', 'huggingface'].includes(appSettings.provider);

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedSettings = localStorage.getItem('app_settings');
        if (savedSettings) {
            try { setAppSettings(JSON.parse(savedSettings)); } catch (e) {}
        } else {
             const oldKey = localStorage.getItem('user_api_key');
             if (oldKey) { setAppSettings({ provider: 'gemini', apiKey: oldKey }); }
        }
        const localSaved = localStorage.getItem('caricature_history');
        if (localSaved) {
           const items: HistoryItem[] = JSON.parse(localSaved);
           for (const item of items) await saveHistoryItem(item);
           localStorage.removeItem('caricature_history');
        }
        const items = await getHistoryItems();
        setHistory(items);
      } catch (e) { console.error("Failed to load data", e); }
    };
    loadData();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault(); setInstallPrompt(e);
    };
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIos = /iphone|ipad|ipod/.test(userAgent);
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      if (isIos && !isStandalone) setIsIOS(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    checkIOS();
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') setInstallPrompt(null);
    });
  };

  const handleSettingsChange = (settings: AppSettings | null) => {
      setAppSettings(settings);
      if (settings) {
          localStorage.setItem('app_settings', JSON.stringify(settings));
          localStorage.removeItem('user_api_key');
      } else {
          localStorage.removeItem('app_settings');
      }
  };

  const goHome = () => {
      if (window.confirm("Вернуться на главный экран? Текущий прогресс будет потерян.")) {
          setOriginalImage(null); setRawBase64(null); setGeneratedImage(null);
          setState(AppState.IDLE); setReferenceImages([]); setActiveReferenceId(null);
          setSelection(null); setError(null); setIsEditing(false); setStampSource(null);
      }
  };

  const handleExit = () => {
      if (window.confirm("Выйти из приложения?")) {
          window.close(); window.location.reload(); 
      }
  };

  useEffect(() => {
    if (currentDisplayImage && mainCanvasRef.current) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = currentDisplayImage;
        img.onload = () => {
            if (mainCanvasRef.current && selectionCanvasRef.current) {
                mainCanvasRef.current.width = img.naturalWidth;
                mainCanvasRef.current.height = img.naturalHeight;
                selectionCanvasRef.current.width = img.naturalWidth;
                selectionCanvasRef.current.height = img.naturalHeight;
                const ctx = mainCanvasRef.current.getContext('2d');
                if (ctx) { ctx.clearRect(0,0, ctx.canvas.width, ctx.canvas.height); ctx.drawImage(img, 0, 0); }
                if (imageRef.current) imageRef.current.src = currentDisplayImage;
            }
        };
    }
  }, [currentDisplayImage, activeReferenceId]);

  const getCoords = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    if (!mainCanvasRef.current || !selectionCanvasRef.current) return null;
    const rect = selectionCanvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const scaleX = mainCanvasRef.current.width / rect.width;
    const scaleY = mainCanvasRef.current.height / rect.height;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTool === Tool.NONE) return;
    if (e.cancelable) e.preventDefault(); 
    const coords = getCoords(e);
    if (!coords) return;
    setIsDrawing(true); setLastPos(coords);
    if (activeTool === Tool.PENCIL) { setSelection(null); setCurrentPoints([coords]); }
    else if (activeTool === Tool.RECTANGLE) { setSelection(null); setStartPoint(coords); setCurrentRect({ x: coords.x, y: coords.y, w: 0, h: 0 }); }
    else if (activeTool === Tool.ERASER) { erase(coords); }
    else if (activeTool === Tool.STAMP && stampSource) { applyStamp(coords); }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoords(e);
    if (!coords) return;
    renderSelectionOverlay(coords);
    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault();
    if (activeTool === Tool.PENCIL) { setCurrentPoints(prev => [...prev, coords]); }
    else if (activeTool === Tool.RECTANGLE && startPoint) {
      const w = coords.x - startPoint.x; const h = coords.y - startPoint.y;
      setCurrentRect({ x: w < 0 ? startPoint.x + w : startPoint.x, y: h < 0 ? startPoint.y + h : startPoint.y, w: Math.abs(w), h: Math.abs(h) });
    } else if (activeTool === Tool.ERASER) { erase(coords); setLastPos(coords); }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false); setLastPos(null);
    if (activeTool === Tool.PENCIL && currentPoints.length > 2) { setSelection({ type: Tool.PENCIL, points: [...currentPoints] }); }
    else if (activeTool === Tool.RECTANGLE && currentRect && currentRect.w > 0 && currentRect.h > 0) { setSelection({ type: Tool.RECTANGLE, points: [], rect: currentRect }); }
    else if (activeTool === Tool.ERASER || activeTool === Tool.STAMP) { saveCanvasToState(); }
  };

  const erase = (pos: Point) => {
      if (!mainCanvasRef.current) return;
      const ctx = mainCanvasRef.current.getContext('2d'); if (!ctx) return;
      ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath();
      if (lastPos) { ctx.moveTo(lastPos.x, lastPos.y); ctx.lineTo(pos.x, pos.y); } else { ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2); }
      ctx.lineWidth = brushSize; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (brushHardness < 100) { ctx.shadowBlur = brushSize * ((100 - brushHardness) / 100); ctx.shadowColor = 'black'; }
      ctx.stroke(); if (!lastPos) ctx.fill(); ctx.restore();
  };

  const applyStamp = (pos: Point) => {
      if (!mainCanvasRef.current || !stampSource) return;
      const ctx = mainCanvasRef.current.getContext('2d'); if (!ctx) return;
      ctx.save(); ctx.translate(pos.x, pos.y); ctx.rotate((stampRotation * Math.PI) / 180); ctx.scale(stampScale, stampScale);
      ctx.drawImage(stampSource, -stampSource.width / 2, -stampSource.height / 2); ctx.restore();
  };

  const captureStamp = async () => {
      if (!selection || !mainCanvasRef.current) return;
      const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); if (!ctx) return;
      let x=0, y=0, w=0, h=0;
      if (selection.type === Tool.RECTANGLE && selection.rect) { ({x, y, w, h} = selection.rect); }
      else if (selection.type === Tool.PENCIL && selection.points.length > 0) {
        const xs = selection.points.map(p => p.x); const ys = selection.points.map(p => p.y);
        x = Math.min(...xs); y = Math.min(...ys); w = Math.max(...xs)-x; h = Math.max(...ys)-y;
      }
      if (w <= 0 || h <= 0) return;
      canvas.width = w; canvas.height = h;
      if (selection.type === Tool.PENCIL && selection.points.length > 0) {
        ctx.beginPath(); ctx.moveTo(selection.points[0].x - x, selection.points[0].y - y);
        selection.points.forEach(p => ctx.lineTo(p.x - x, p.y - y)); ctx.closePath(); ctx.clip();
      }
      ctx.drawImage(mainCanvasRef.current, x, y, w, h, 0, 0, w, h);
      const img = new Image(); img.src = canvas.toDataURL(); await new Promise(r => img.onload = r);
      setStampSource(img); setSelection(null); setActiveTool(Tool.STAMP);
  };

  const saveCanvasToState = () => {
      if (!mainCanvasRef.current) return;
      const newDataUrl = mainCanvasRef.current.toDataURL(mimeType);
      const saveMime = (activeTool === Tool.ERASER || activeTool === Tool.STAMP) ? 'image/png' : mimeType;
      if (activeReferenceId) { setReferenceImages(prev => prev.map(r => r.id === activeReferenceId ? { ...r, originalUrl: newDataUrl, mimeType: saveMime, base64: newDataUrl.split(',')[1] } : r)); }
      else { setOriginalImage(newDataUrl); setRawBase64(newDataUrl.split(',')[1]); if (saveMime === 'image/png') setMimeType('image/png'); }
  };

  const renderSelectionOverlay = (cursorPos?: Point) => {
    const canvas = selectionCanvasRef.current; if (!canvas || !mainCanvasRef.current) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pointsToDraw = isDrawing ? currentPoints : selection?.points;
    const rectToDraw = isDrawing ? currentRect : selection?.rect;
    const toolToDraw = isDrawing ? activeTool : selection?.type;
    
    if (selection || (isDrawing && (activeTool === Tool.PENCIL || activeTool === Tool.RECTANGLE))) {
        ctx.lineWidth = 4 * (canvas.width / 1000); ctx.strokeStyle = '#4ECDC4'; ctx.fillStyle = 'rgba(78, 205, 196, 0.3)';
        if ((toolToDraw === Tool.PENCIL) && pointsToDraw && pointsToDraw.length > 0) {
            ctx.beginPath(); ctx.moveTo(pointsToDraw[0].x, pointsToDraw[0].y);
            for (let i = 1; i < pointsToDraw.length; i++) ctx.lineTo(pointsToDraw[i].x, pointsToDraw[i].y);
            if (!isDrawing) ctx.closePath(); ctx.stroke(); ctx.fill();
        } else if ((toolToDraw === Tool.RECTANGLE) && rectToDraw) {
            ctx.fillRect(rectToDraw.x, rectToDraw.y, rectToDraw.w, rectToDraw.h); ctx.strokeRect(rectToDraw.x, rectToDraw.y, rectToDraw.w, rectToDraw.h);
        }
    }
    if (cursorPos && !isDrawing) { 
        if (activeTool === Tool.ERASER) {
            ctx.beginPath(); ctx.arc(cursorPos.x, cursorPos.y, brushSize / 2, 0, Math.PI * 2); ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.stroke();
            ctx.beginPath(); ctx.arc(cursorPos.x, cursorPos.y, brushSize / 2, 0, Math.PI * 2); ctx.strokeStyle = 'black'; ctx.lineWidth = 1; ctx.stroke();
        } else if (activeTool === Tool.STAMP && stampSource) {
            ctx.save(); ctx.globalAlpha = 0.6; ctx.translate(cursorPos.x, cursorPos.y); ctx.rotate((stampRotation * Math.PI) / 180);
            ctx.scale(stampScale, stampScale); ctx.drawImage(stampSource, -stampSource.width / 2, -stampSource.height / 2); ctx.restore();
        }
    }
  };

  useEffect(() => { renderSelectionOverlay(); }, [selection, currentPoints, currentRect, activeTool]);

  const addToHistory = async (imageUrl: string, style: ArtStyle) => {
    const newItem: HistoryItem = { id: Date.now().toString(), url: imageUrl, style, timestamp: Date.now() };
    try { await saveHistoryItem(newItem); const items = await getHistoryItems(); setHistory(items); } catch (e) { console.error(e); }
  };

  const handleMainFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith('image/')) { setError("Некорректный файл."); return; }
    try {
      setOriginalImage(URL.createObjectURL(file));
      const base64 = await fileToBase64(file);
      setRawBase64(base64); setMimeType(file.type); setGeneratedImage(null); setError(null); setState(AppState.IDLE);
      setIsEditing(false); setSelection(null); setReferenceImages([]); setActiveReferenceId(null); setStampSource(null);
    } catch (err) { console.error(err); setError("Ошибка обработки."); }
  };

  const handleTextMode = async () => {
      const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      if (ctx) {
          ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 1024, 1024);
          ctx.fillStyle = '#f3f4f6'; ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('Холст для описания', 512, 512);
          const dataUrl = canvas.toDataURL('image/jpeg');
          setOriginalImage(dataUrl); setRawBase64(dataUrl.split(',')[1]); setMimeType('image/jpeg');
          setGeneratedImage(null); setError(null); setState(AppState.IDLE); setIsEditing(false); setSelection(null); 
          setReferenceImages([]); setActiveReferenceId(null); setStampSource(null); setCustomPrompt("Смешная карикатура на...");
      }
  };

  const handleReferenceFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file || !file.type.startsWith('image/')) return;
    try {
        const base64 = await fileToBase64(file);
        setReferenceImages(prev => [...prev, { id: Date.now().toString(), originalUrl: URL.createObjectURL(file), base64, mimeType: file.type }]);
    } catch (e) { console.error(e); }
  };

  const switchToImage = (id: string | null) => { setSelection(null); setActiveTool(Tool.NONE); setActiveReferenceId(id); };

  const getCroppedBase64 = async (): Promise<string | null> => {
    if (!selection || !mainCanvasRef.current) return null;
    const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); if (!ctx) return null;
    let x=0, y=0, w=0, h=0;
    if (selection.type === Tool.RECTANGLE && selection.rect) { ({x, y, w, h} = selection.rect); }
    else if (selection.type === Tool.PENCIL && selection.points.length > 0) {
      const xs = selection.points.map(p => p.x); const ys = selection.points.map(p => p.y);
      x = Math.min(...xs); y = Math.min(...ys); w = Math.max(...xs) - x; h = Math.max(...ys) - y;
    }
    if (w <= 0 || h <= 0) return null;
    canvas.width = w; canvas.height = h;
    if (selection.type === Tool.PENCIL && selection.points.length > 0) {
        ctx.beginPath(); ctx.moveTo(selection.points[0].x - x, selection.points[0].y - y);
        selection.points.forEach(p => ctx.lineTo(p.x - x, p.y - y)); ctx.closePath(); ctx.clip();
    }
    ctx.drawImage(mainCanvasRef.current, x, y, w, h, 0, 0, w, h);
    const activeRef = referenceImages.find(r => r.id === activeReferenceId);
    return canvas.toDataURL(activeRef ? activeRef.mimeType : mimeType).split(',')[1];
  };

  const handleApplyCropToReference = async () => {
     if (!activeReferenceId) return; const cropped = await getCroppedBase64();
     if (cropped) { setReferenceImages(prev => prev.map(r => r.id === activeReferenceId ? { ...r, croppedBase64: cropped } : r)); setSelection(null); setActiveTool(Tool.NONE); }
  };

  const handleDeleteReference = (e: React.MouseEvent, id: string) => {
      e.stopPropagation(); setReferenceImages(prev => prev.filter(r => r.id !== id)); if (activeReferenceId === id) switchToImage(null);
  };

  const handleGenerateAndSave = async () => {
    if (!rawBase64) return;
    setState(AppState.LOADING); setError(null); setIsEditing(false);
    try {
      let mainInputBase64 = rawBase64; let cropInfo = null;
      if (!activeReferenceId && selection) {
        const img = mainCanvasRef.current;
        if (img) {
            let x=0, y=0, w=0, h=0;
            if (selection.type === Tool.RECTANGLE && selection.rect) { ({x,y,w,h} = selection.rect); }
            else if (selection.type === Tool.PENCIL) {
                const xs = selection.points.map(p => p.x); const ys = selection.points.map(p => p.y);
                x = Math.min(...xs); y = Math.min(...ys); w = Math.max(...xs)-x; h = Math.max(...ys)-y;
            }
            if (w > 0 && h > 0) {
                 const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
                 const ctx = canvas.getContext('2d');
                 if (ctx) { ctx.drawImage(img, x, y, w, h, 0, 0, w, h); mainInputBase64 = canvas.toDataURL(mimeType).split(',')[1]; cropInfo = { x, y, w, h }; }
            }
        }
      }

      // No quality argument passed
      const resultUrl = await generateCaricature(mainInputBase64, selectedStyle, customPrompt, referenceImages, mimeType, appSettings);
      
      let finalResultUrl = resultUrl;
      const isGemini = !appSettings || appSettings.provider === 'gemini';
      if (cropInfo && !activeReferenceId && originalImage && isGemini) {
          const mainImgObj = new Image(); mainImgObj.src = originalImage; await new Promise(r => mainImgObj.onload = r);
          const finalCanvas = document.createElement('canvas'); finalCanvas.width = mainImgObj.naturalWidth; finalCanvas.height = mainImgObj.naturalHeight;
          const ctx = finalCanvas.getContext('2d');
          if (ctx) {
             ctx.drawImage(mainImgObj, 0, 0); const genImgObj = new Image(); genImgObj.src = resultUrl; await new Promise(r => genImgObj.onload = r);
             ctx.save(); ctx.beginPath();
             if (selection?.type === Tool.RECTANGLE && selection.rect) { ctx.rect(selection.rect.x, selection.rect.y, selection.rect.w, selection.rect.h); }
             else if (selection?.type === Tool.PENCIL && selection.points.length > 0) {
                ctx.moveTo(selection.points[0].x, selection.points[0].y); selection.points.forEach(p => ctx.lineTo(p.x, p.y)); ctx.closePath();
             }
             ctx.clip(); ctx.drawImage(genImgObj, cropInfo.x, cropInfo.y, cropInfo.w, cropInfo.h); ctx.restore();
             finalResultUrl = finalCanvas.toDataURL(mimeType);
          }
      }
      setGeneratedImage(finalResultUrl); setState(AppState.SUCCESS); await addToHistory(finalResultUrl, selectedStyle);
    } catch (err: any) { console.error(err); setError(err.message || "Ошибка генерации"); setState(AppState.ERROR); }
  };

  const handleQuickDownload = () => { if (!generatedImage) return; const link = document.createElement('a'); link.href = generatedImage; link.download = `caricature-${Date.now()}.png`; document.body.appendChild(link); link.click(); document.body.removeChild(link); };
  const handleShare = async () => { if (!generatedImage) return; try { const res = await fetch(generatedImage); const blob = await res.blob(); await navigator.share({ title: 'Карикатура', files: [new File([blob], 'caricature.png', { type: 'image/png' })] }); } catch (e) { alert('Не удалось поделиться.'); } };
  const handleSaveAs = async (filename: string, format: 'png' | 'jpeg') => { if (!generatedImage) return; const img = new Image(); img.src = generatedImage; await new Promise(r => img.onload = r); const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight; const ctx = canvas.getContext('2d'); if (ctx) { if (format === 'jpeg') { ctx.fillStyle='#FFF'; ctx.fillRect(0,0,canvas.width,canvas.height); } if (isEditing) ctx.filter = `brightness(${editValues.brightness}%) contrast(${editValues.contrast}%) saturate(${editValues.saturation}%)`; ctx.drawImage(img, 0, 0); const link = document.createElement('a'); link.href = canvas.toDataURL(`image/${format}`); link.download = `${filename}.${format}`; document.body.appendChild(link); link.click(); document.body.removeChild(link); setIsSaveModalOpen(false); } };
  const handleSaveEdits = async () => { if (!generatedImage || !canvasRef.current) return; const img = new Image(); img.src = generatedImage; img.onload = async () => { const canvas = canvasRef.current!; const ctx = canvas.getContext('2d'); if (!ctx) return; canvas.width = img.naturalWidth; canvas.height = img.naturalHeight; ctx.filter = `brightness(${editValues.brightness}%) contrast(${editValues.contrast}%) saturate(${editValues.saturation}%)`; ctx.drawImage(img, 0, 0); const res = canvas.toDataURL('image/png'); setGeneratedImage(res); setIsEditing(false); await addToHistory(res, selectedStyle); }; };
  const loadFromHistory = (item: HistoryItem) => { setOriginalImage(item.url); if (item.url.includes(',')) setRawBase64(item.url.split(',')[1]); else setRawBase64(item.url); setMimeType('image/png'); setGeneratedImage(null); setState(AppState.IDLE); setReferenceImages([]); setActiveReferenceId(null); setSelection(null); setStampSource(null); setCustomPrompt(''); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <div className="min-h-screen bg-gray-50 text-dark font-sans selection:bg-primary selection:text-white pb-32 lg:pb-12 overflow-x-hidden">
      <SaveModal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} onSave={handleSaveAs} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onSettingsChange={handleSettingsChange} currentSettings={appSettings} />
      {fullScreenImage && <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => setFullScreenImage(null)}><button onClick={() => setFullScreenImage(null)} className="absolute top-6 right-6 z-10 text-white/80 text-4xl">✕</button><img src={fullScreenImage} className="max-w-full max-h-[85vh] object-contain shadow-2xl rounded-sm" onClick={e => e.stopPropagation()} style={isEditing ? { filter: `brightness(${editValues.brightness}%) contrast(${editValues.contrast}%) saturate(${editValues.saturation}%)` } : {}} /><div className="absolute bottom-6 flex gap-4 pointer-events-none"><div className="pointer-events-auto flex gap-4"><Button variant="secondary" onClick={(e) => { e.stopPropagation(); handleQuickDownload(); }}>📥 Скачать</Button><Button onClick={(e) => { e.stopPropagation(); loadFromHistory(history.find(i => i.url === fullScreenImage) || { id: '0', url: fullScreenImage, style: ArtStyle.NO_STYLE, timestamp: 0 }); setFullScreenImage(null); }} className="!bg-white !text-dark">✏️ Редактор</Button></div></div></div>}
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100 shadow-sm safe-top"><div className="container mx-auto px-4 py-3 flex justify-between items-center"><div className="flex items-center gap-2">{originalImage && <button onClick={goHome} className="text-xl">🏠</button>}<span className="text-2xl">🎭</span><h1 className="text-xl font-comic font-bold text-gray-800">Карикатура AI</h1></div><div className="flex gap-2"><button onClick={() => setIsSettingsOpen(true)} className="text-xl">⚙️</button><button onClick={handleExit} className="text-xl">🚪</button>{installPrompt && <button onClick={handleInstallClick} className="bg-black text-white px-2 rounded text-xs">⬇️</button>}</div></div></header>
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {state === AppState.IDLE && !originalImage && <div className="text-center py-12 flex flex-col items-center justify-center min-h-[60vh]"><div className="text-6xl mb-4">🎨</div><h2 className="text-3xl font-black mb-2">Создайте свой <span className="text-primary">Шарж</span></h2><div className="pt-8 w-full max-w-sm flex flex-col gap-3"><Button onClick={() => fileInputRef.current?.click()}>Загрузить фото 📸</Button><Button onClick={handleTextMode} variant="secondary">По описанию 📝</Button></div></div>}
        <input type="file" ref={fileInputRef} onChange={handleMainFileChange} accept="image/*" className="hidden" /><input type="file" ref={refInputRef} onChange={handleReferenceFileChange} accept="image/*" className="hidden" />
        {originalImage && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mb-12">
            <div className="space-y-4">
              <div className={`bg-white rounded-2xl p-4 shadow-lg border-2 ${activeReferenceId ? 'border-secondary' : 'border-gray-100'}`}>
                <div className="flex justify-between items-center mb-3"><h3 className="font-bold text-sm">{activeReferenceId ? '✂️ Редактирование' : 'Холст'}</h3>{activeReferenceId ? <button onClick={() => switchToImage(null)} className="text-xs bg-gray-100 px-2 py-1 rounded">Назад</button> : <button onClick={() => fileInputRef.current?.click()} className="text-xs text-primary font-bold bg-primary/10 px-2 py-1 rounded">Сменить</button>}</div>
                <div className="flex gap-2 mb-3 pb-2 overflow-x-auto no-scrollbar">{[{t: Tool.NONE, i:'✋'}, {t:Tool.PENCIL, i:'✏️'}, {t:Tool.RECTANGLE, i:'⬜'}, {t:Tool.ERASER, i:'🧼'}, {t:Tool.STAMP, i:'🥔'}].map(tool => <button key={tool.t} onClick={() => setActiveTool(tool.t)} className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${activeTool === tool.t ? 'bg-dark text-white' : 'bg-gray-50'}`}>{tool.i}</button>)}{selection && <><div className="w-px h-8 bg-gray-200 mx-1"></div><button onClick={captureStamp} className="text-xs font-bold bg-secondary text-white px-2 rounded">Штамп</button><button onClick={() => { setSelection(null); setActiveTool(Tool.NONE); }} className="text-xs text-red-500">Сброс</button></>}</div>
                {activeTool === Tool.ERASER && <div className="mb-3 p-2 bg-gray-50 rounded flex flex-col gap-2"><input type="range" min="5" max="100" value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} className="w-full accent-primary" /></div>}
                {activeTool === Tool.STAMP && <div className="mb-3 p-2 bg-gray-50 rounded flex flex-col gap-2"><input type="range" min="0.1" max="3" step="0.1" value={stampScale} onChange={e => setStampScale(Number(e.target.value))} className="w-full accent-secondary" /><input type="range" min="0" max="360" value={stampRotation} onChange={e => setStampRotation(Number(e.target.value))} className="w-full accent-secondary" />{!stampSource && <div className="text-xs text-red-400">⚠️ Нет штампа</div>}</div>}
                <div className="relative w-full rounded-xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} style={{ touchAction: activeTool === Tool.NONE ? 'pan-y' : 'none' }}><canvas ref={mainCanvasRef} className="w-full h-auto block select-none pointer-events-none" /><canvas ref={selectionCanvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" /><img ref={imageRef} className="hidden" /></div>
                {activeReferenceId && selection && <Button variant="secondary" onClick={handleApplyCropToReference} className="w-full mt-3 py-2 text-sm">Подтвердить ✅</Button>}
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100"><div className="flex justify-between items-center mb-3"><h3 className="text-xs font-bold text-gray-400">ДОП. ФОТО</h3><button onClick={() => refInputRef.current?.click()} className="text-xs bg-gray-50 px-2 py-1 rounded font-bold">+ Добавить</button></div><div className="grid grid-cols-4 gap-2">{referenceImages.map(ref => <div key={ref.id} onClick={() => switchToImage(ref.id)} className={`relative aspect-square rounded overflow-hidden cursor-pointer border-2 ${activeReferenceId === ref.id ? 'border-secondary' : 'border-gray-100'}`}><img src={ref.originalUrl} className="w-full h-full object-cover" /><button onClick={e => handleDeleteReference(e, ref.id)} className="absolute top-0 right-0 bg-black/50 text-white w-4 h-4 flex items-center justify-center text-[10px]">×</button></div>)}</div></div>
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 space-y-5">
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Стиль</label><StyleSelector selectedStyle={selectedStyle} onSelect={setSelectedStyle} disabled={state === AppState.LOADING} /></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-2">Детали</label><textarea rows={3} value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} disabled={state === AppState.LOADING} placeholder="Например: надень шляпу..." className="w-full p-3 rounded-xl bg-gray-50 outline-none text-sm" />{showEnglishHint && <p className="text-[10px] text-orange-500 mt-1 font-bold">💡 Лучше писать на английском.</p>}</div>
              </div>
            </div>
            <div className="space-y-4 sticky top-20">
               <div className={`bg-white rounded-2xl p-4 shadow-xl border border-gray-100 min-h-[400px] flex flex-col ${state === AppState.SUCCESS ? 'border-primary/30' : ''}`}>
                <div className="flex justify-between items-center mb-3"><h3 className="font-bold text-gray-700 text-sm">Результат</h3>{generatedImage && state === AppState.SUCCESS && !isEditing && <button onClick={() => { setIsEditing(true); setEditValues({ brightness: 100, contrast: 100, saturation: 100 }); }} className="text-xs font-bold text-secondary bg-secondary/10 px-2 py-1 rounded">✏️ Редактор</button>}</div>
                <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-xl relative overflow-hidden min-h-[350px]">
                  {state === AppState.IDLE && !generatedImage && <div className="text-center text-gray-400"><p className="text-6xl mb-2">🖼️</p><p className="text-sm">Здесь будет результат</p></div>}
                  {state === AppState.LOADING && <Spinner />}
                  {state === AppState.ERROR && <div className="text-center p-4"><p className="text-4xl mb-2">😕</p><p className="text-red-500 font-bold mb-1">Упс!</p><p className="text-gray-500 text-xs mb-3">{error}</p><Button onClick={() => setIsSettingsOpen(true)} className="text-xs py-1 px-3" variant="outline">Настройки</Button></div>}
                  {generatedImage && state !== AppState.LOADING && <img src={generatedImage} onClick={() => setFullScreenImage(generatedImage)} className="max-w-full max-h-[600px] object-contain rounded cursor-zoom-in" style={isEditing ? { filter: `brightness(${editValues.brightness}%) contrast(${editValues.contrast}%) saturate(${editValues.saturation}%)` } : {}} />}
                  <canvas ref={canvasRef} className="hidden" />
                </div>
                {isEditing && <div className="mt-4 p-3 bg-gray-50 rounded"><div className="space-y-2"><input type="range" min="50" max="150" value={editValues.brightness} onChange={e => setEditValues(prev => ({...prev, brightness: Number(e.target.value)}))} className="w-full accent-primary h-1" /><input type="range" min="50" max="150" value={editValues.contrast} onChange={e => setEditValues(prev => ({...prev, contrast: Number(e.target.value)}))} className="w-full accent-primary h-1" /><div className="flex gap-2 pt-2"><Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1 py-1 text-xs">Отмена</Button><Button onClick={handleSaveEdits} className="flex-1 py-1 text-xs">Сохранить</Button></div></div></div>}
                {state === AppState.SUCCESS && generatedImage && !isEditing && <div className="mt-4 grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => setIsSaveModalOpen(true)} className="py-3 text-xs">Сохранить как...</Button><div className="flex flex-col gap-1"><Button variant="secondary" onClick={handleQuickDownload} className="py-1 text-xs">Скачать</Button><Button onClick={handleShare} className="py-1 bg-blue-500 text-white text-xs">Поделиться</Button></div></div>}
              </div>
            </div>
        </div>}
        {originalImage && !activeReferenceId && <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur border-t z-50 lg:hidden"><Button onClick={handleGenerateAndSave} isLoading={state === AppState.LOADING} className="w-full py-3 shadow-xl" disabled={!!activeReferenceId}>{state === AppState.SUCCESS ? 'Создать еще ✨' : 'Сделать карикатуру! 🎨'}</Button></div>}
        {originalImage && !activeReferenceId && <div className="hidden lg:block fixed bottom-8 right-8 z-40"><Button onClick={handleGenerateAndSave} isLoading={state === AppState.LOADING} className="py-4 px-8 rounded-full shadow-2xl hover:scale-105">{state === AppState.SUCCESS ? 'Создать еще ✨' : 'Сделать карикатуру! 🎨'}</Button></div>}
        {history.length > 0 && <div className="mt-8 border-t pt-8 pb-20"><h2 className="text-xl font-bold mb-4">🕰️ История</h2><div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">{history.map(item => <div key={item.id} onClick={() => setFullScreenImage(item.url)} className="flex-shrink-0 w-24 bg-white p-1 rounded border cursor-pointer relative group"><img src={item.url} className="w-full aspect-square object-cover rounded" /><button onClick={e => { e.stopPropagation(); loadFromHistory(item); }} className="absolute top-1 right-1 bg-white/80 p-1 rounded-full text-xs opacity-0 group-hover:opacity-100">✏️</button></div>)}</div></div>}
      </main>
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .safe-top { padding-top: env(safe-area-inset-top); }`}</style>
    </div>
  );
};

export default App;
