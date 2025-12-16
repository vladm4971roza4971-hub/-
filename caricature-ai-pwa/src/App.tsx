import React, { useState, useRef, useEffect } from 'react';
import { AppState, ArtStyle, Quality, HistoryItem, Tool, SelectionData, Point, ReferenceImage } from './types';
import { Button } from './components/Button';
import { Spinner } from './components/Spinner';
import { StyleSelector } from './components/StyleSelector';
import { SaveModal } from './components/SaveModal';
import { generateCaricature, fileToBase64 } from './services/geminiService';
import { saveHistoryItem, getHistoryItems } from './services/dbService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.IDLE);
  
  // Images Data
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [rawBase64, setRawBase64] = useState<string | null>(null); // Full image base64
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  
  // Reference Images (Additional photos)
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [activeReferenceId, setActiveReferenceId] = useState<string | null>(null); // If not null, we are editing a reference

  // Settings
  const [selectedStyle, setSelectedStyle] = useState<ArtStyle>(ArtStyle.CARTOON);
  const [quality, setQuality] = useState<Quality>('Standard');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  
  // Selection & Tools State
  const [activeTool, setActiveTool] = useState<Tool>(Tool.NONE);
  const [selection, setSelection] = useState<SelectionData | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]); // For Pencil
  const [startPoint, setStartPoint] = useState<Point | null>(null); // For Rect
  const [currentRect, setCurrentRect] = useState<{x:number, y:number, w:number, h:number} | null>(null);

  // New Tool Settings
  const [brushSize, setBrushSize] = useState<number>(30);
  const [brushHardness, setBrushHardness] = useState<number>(80);
  const [stampScale, setStampScale] = useState<number>(1);
  const [stampRotation, setStampRotation] = useState<number>(0);
  const [stampSource, setStampSource] = useState<HTMLImageElement | null>(null);
  const [lastPos, setLastPos] = useState<Point | null>(null);

  // App State misc
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({ brightness: 100, contrast: 100, saturation: 100 });
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  
  // PWA Install State
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null); // For post-processing edits
  const mainCanvasRef = useRef<HTMLCanvasElement>(null); // Main editing canvas (replaces img)
  const selectionCanvasRef = useRef<HTMLCanvasElement>(null); // Overlay for drawing selection/cursor
  const imageRef = useRef<HTMLImageElement>(null); // HIDDEN reference img to hold source data if needed
  const fileInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null); // For additional photos

  // --- Computed Properties ---
  
  // Determine what image is currently being shown on the main canvas
  const currentDisplayImage = activeReferenceId 
    ? referenceImages.find(r => r.id === activeReferenceId)?.originalUrl || null 
    : originalImage;

  // Load history on mount & Setup PWA
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const localSaved = localStorage.getItem('caricature_history');
        if (localSaved) {
           const items: HistoryItem[] = JSON.parse(localSaved);
           for (const item of items) {
             await saveHistoryItem(item);
           }
           localStorage.removeItem('caricature_history');
        }
        const items = await getHistoryItems();
        setHistory(items);
      } catch (e) {
        console.error("Failed to load history", e);
      }
    };
    loadHistory();

    // Listen for PWA install prompt (Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    // Detect iOS
    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
      // Check if running in standalone mode (already installed)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      
      if (isIosDevice && !isStandalone) {
        setIsIOS(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    checkIOS();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        setInstallPrompt(null);
      }
    });
  };

  // --- Canvas Rendering Logic ---

  // Load the current image into the Main Canvas whenever it changes
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
                if (ctx) {
                    ctx.clearRect(0,0, ctx.canvas.width, ctx.canvas.height);
                    ctx.drawImage(img, 0, 0);
                }
                // Also store in hidden ref for utility access
                if (imageRef.current) imageRef.current.src = currentDisplayImage;
            }
        };
    }
  }, [currentDisplayImage, activeReferenceId]); // Re-run when switching images

  // Helper: Get coordinates relative to the canvas natural size
  const getCoords = (e: React.MouseEvent | React.TouchEvent): Point | null => {
    if (!mainCanvasRef.current || !selectionCanvasRef.current) return null;
    
    const rect = selectionCanvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    // Position on the displayed canvas
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    // Scale to natural image size
    const scaleX = mainCanvasRef.current.width / rect.width;
    const scaleY = mainCanvasRef.current.height / rect.height;

    return {
      x: x * scaleX,
      y: y * scaleY
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTool === Tool.NONE) return;
    if (e.cancelable) e.preventDefault(); // Prevent scroll on touch
    
    const coords = getCoords(e);
    if (!coords) return;

    setIsDrawing(true);
    setLastPos(coords);

    if (activeTool === Tool.PENCIL) {
        setSelection(null);
        setCurrentPoints([coords]);
    } else if (activeTool === Tool.RECTANGLE) {
        setSelection(null);
        setStartPoint(coords);
        setCurrentRect({ x: coords.x, y: coords.y, w: 0, h: 0 });
    } else if (activeTool === Tool.ERASER) {
        erase(coords);
    } else if (activeTool === Tool.STAMP) {
        if (stampSource) {
            applyStamp(coords);
        }
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    const coords = getCoords(e);
    if (!coords) return;

    // Always update overlay for tool preview (cursor)
    renderSelectionOverlay(coords);

    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault();

    if (activeTool === Tool.PENCIL) {
      setCurrentPoints(prev => [...prev, coords]);
    } else if (activeTool === Tool.RECTANGLE && startPoint) {
      const w = coords.x - startPoint.x;
      const h = coords.y - startPoint.y;
      setCurrentRect({
        x: w < 0 ? startPoint.x + w : startPoint.x,
        y: h < 0 ? startPoint.y + h : startPoint.y,
        w: Math.abs(w),
        h: Math.abs(h)
      });
    } else if (activeTool === Tool.ERASER) {
        erase(coords);
        setLastPos(coords);
    } else if (activeTool === Tool.STAMP && stampSource) {
        // Optional: Drag to paint stamps? Usually stamps are single click.
        // Let's stick to click for stamp, or drag for continuous stamping if desired.
        // For now, let's just do nothing on drag for stamp to avoid mess.
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setLastPos(null);

    if (activeTool === Tool.PENCIL && currentPoints.length > 2) {
      setSelection({
        type: Tool.PENCIL,
        points: [...currentPoints]
      });
    } else if (activeTool === Tool.RECTANGLE && currentRect && currentRect.w > 0 && currentRect.h > 0) {
      setSelection({
        type: Tool.RECTANGLE,
        points: [],
        rect: currentRect
      });
    } else if (activeTool === Tool.ERASER || activeTool === Tool.STAMP) {
        // Save changes to state
        saveCanvasToState();
    }
  };

  // --- Eraser Logic ---
  const erase = (pos: Point) => {
      if (!mainCanvasRef.current) return;
      const ctx = mainCanvasRef.current.getContext('2d');
      if (!ctx) return;

      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      
      if (lastPos) {
          ctx.moveTo(lastPos.x, lastPos.y);
          ctx.lineTo(pos.x, pos.y);
      } else {
          ctx.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
      }
      
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Simulate softness using shadow (blur)
      if (brushHardness < 100) {
          ctx.shadowBlur = brushSize * ((100 - brushHardness) / 100);
          ctx.shadowColor = 'black'; // Color doesn't matter for destination-out, just opacity/alpha
      }

      ctx.stroke();
      // If it was a single dot (click)
      if (!lastPos) ctx.fill(); 

      ctx.restore();
  };

  // --- Stamp Logic ---
  const applyStamp = (pos: Point) => {
      if (!mainCanvasRef.current || !stampSource) return;
      const ctx = mainCanvasRef.current.getContext('2d');
      if (!ctx) return;

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate((stampRotation * Math.PI) / 180);
      ctx.scale(stampScale, stampScale);
      
      // Draw centered
      ctx.drawImage(stampSource, -stampSource.width / 2, -stampSource.height / 2);
      ctx.restore();
  };

  // Capture selection as stamp
  const captureStamp = async () => {
      if (!selection || !mainCanvasRef.current) return;
      
      // Logic similar to getCroppedBase64 but returning an image element
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let x=0, y=0, w=0, h=0;
      if (selection.type === Tool.RECTANGLE && selection.rect) { ({x, y, w, h} = selection.rect); }
      else if (selection.type === Tool.PENCIL && selection.points.length > 0) {
        const xs = selection.points.map(p => p.x);
        const ys = selection.points.map(p => p.y);
        x = Math.min(...xs); y = Math.min(...ys); w = Math.max(...xs)-x; h = Math.max(...ys)-y;
      }
      
      if (w <= 0 || h <= 0) return;

      canvas.width = w;
      canvas.height = h;

      if (selection.type === Tool.PENCIL && selection.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(selection.points[0].x - x, selection.points[0].y - y);
        selection.points.forEach(p => ctx.lineTo(p.x - x, p.y - y));
        ctx.closePath();
        ctx.clip();
      }

      ctx.drawImage(mainCanvasRef.current, x, y, w, h, 0, 0, w, h);

      const img = new Image();
      img.src = canvas.toDataURL();
      await new Promise(r => img.onload = r);
      
      setStampSource(img);
      setSelection(null); // Clear selection after capture
      setActiveTool(Tool.STAMP);
  };

  const saveCanvasToState = () => {
      if (!mainCanvasRef.current) return;
      const newDataUrl = mainCanvasRef.current.toDataURL(mimeType); // Keep original mime type? Or PNG for transparency.
      // Eraser introduces transparency, so we should switch to PNG if erasing.
      // But preserving mimeType is good for logic. Let's use png if tool is eraser.
      const saveMime = (activeTool === Tool.ERASER || activeTool === Tool.STAMP) ? 'image/png' : mimeType;

      if (activeReferenceId) {
          setReferenceImages(prev => prev.map(r => r.id === activeReferenceId ? { ...r, originalUrl: newDataUrl, mimeType: saveMime, base64: newDataUrl.split(',')[1] } : r));
      } else {
          setOriginalImage(newDataUrl);
          setRawBase64(newDataUrl.split(',')[1]);
          if (saveMime === 'image/png') setMimeType('image/png');
      }
  };

  // --- Overlay Rendering ---
  const renderSelectionOverlay = (cursorPos?: Point) => {
    const canvas = selectionCanvasRef.current;
    if (!canvas || !mainCanvasRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Selection
    const pointsToDraw = isDrawing ? currentPoints : selection?.points;
    const rectToDraw = isDrawing ? currentRect : selection?.rect;
    const toolToDraw = isDrawing ? activeTool : selection?.type; // Draw selection shape

    // Only draw selection if we are in a selection tool OR we have a persisted selection
    const isSelectionTool = activeTool === Tool.PENCIL || activeTool === Tool.RECTANGLE || activeTool === Tool.NONE;
    
    if (selection || (isDrawing && isSelectionTool)) {
        ctx.lineWidth = 4 * (canvas.width / 1000); 
        ctx.strokeStyle = '#4ECDC4'; 
        ctx.fillStyle = 'rgba(78, 205, 196, 0.3)';

        if ((toolToDraw === Tool.PENCIL || selection?.type === Tool.PENCIL) && pointsToDraw && pointsToDraw.length > 0) {
            ctx.beginPath();
            ctx.moveTo(pointsToDraw[0].x, pointsToDraw[0].y);
            for (let i = 1; i < pointsToDraw.length; i++) {
                ctx.lineTo(pointsToDraw[i].x, pointsToDraw[i].y);
            }
            if (!isDrawing) ctx.closePath(); 
            ctx.stroke();
            ctx.fill();
        } else if ((toolToDraw === Tool.RECTANGLE || selection?.type === Tool.RECTANGLE) && rectToDraw) {
            ctx.fillRect(rectToDraw.x, rectToDraw.y, rectToDraw.w, rectToDraw.h);
            ctx.strokeRect(rectToDraw.x, rectToDraw.y, rectToDraw.w, rectToDraw.h);
        }
    }

    // 2. Draw Tool Preview (Cursor)
    if (cursorPos && !isDrawing) { // Hide cursor while drawing for performance? Or show. Let's show.
        if (activeTool === Tool.ERASER) {
            ctx.beginPath();
            ctx.arc(cursorPos.x, cursorPos.y, brushSize / 2, 0, Math.PI * 2);
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cursorPos.x, cursorPos.y, brushSize / 2, 0, Math.PI * 2);
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 1;
            ctx.stroke();
        } else if (activeTool === Tool.STAMP && stampSource) {
            ctx.save();
            ctx.globalAlpha = 0.6;
            ctx.translate(cursorPos.x, cursorPos.y);
            ctx.rotate((stampRotation * Math.PI) / 180);
            ctx.scale(stampScale, stampScale);
            ctx.drawImage(stampSource, -stampSource.width / 2, -stampSource.height / 2);
            ctx.restore();
        }
    }
  };

  useEffect(() => {
    renderSelectionOverlay();
  }, [selection, currentPoints, currentRect, activeTool]); // Redraw when these change

  // --- Image Handling Logic ---

  const addToHistory = async (imageUrl: string, style: ArtStyle) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      url: imageUrl,
      style,
      timestamp: Date.now(),
    };
    try {
      await saveHistoryItem(newItem);
      const items = await getHistoryItems();
      setHistory(items);
    } catch (e) {
      console.error("Failed to save history", e);
    }
  };

  const handleMainFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError("Пожалуйста, загрузите корректный файл изображения.");
      return;
    }

    try {
      const previewUrl = URL.createObjectURL(file);
      setOriginalImage(previewUrl);
      
      const base64 = await fileToBase64(file);
      setRawBase64(base64);
      setMimeType(file.type);
      
      // Reset state
      setGeneratedImage(null);
      setError(null);
      setState(AppState.IDLE);
      setIsEditing(false);
      setSelection(null); 
      setReferenceImages([]); 
      setActiveReferenceId(null);
      setStampSource(null);
    } catch (err) {
      console.error(err);
      setError("Ошибка при обработке изображения.");
    }
  };

  const handleReferenceFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
       return;
    }
    
    try {
        const previewUrl = URL.createObjectURL(file);
        const base64 = await fileToBase64(file);
        const newRef: ReferenceImage = {
            id: Date.now().toString(),
            originalUrl: previewUrl,
            base64: base64,
            mimeType: file.type
        };
        setReferenceImages(prev => [...prev, newRef]);
    } catch (e) {
        console.error("Ref upload error", e);
    }
  };

  // Switch context to edit a specific image
  const switchToImage = (id: string | null) => {
      setSelection(null);
      setActiveTool(Tool.NONE);
      setActiveReferenceId(id);
  };

  // Logic to crop currently viewed image based on selection (for generation)
  const getCroppedBase64 = async (): Promise<string | null> => {
    if (!selection || !mainCanvasRef.current) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    let x=0, y=0, w=0, h=0;

    if (selection.type === Tool.RECTANGLE && selection.rect) {
      ({x, y, w, h} = selection.rect);
    } else if (selection.type === Tool.PENCIL && selection.points.length > 0) {
      const xs = selection.points.map(p => p.x);
      const ys = selection.points.map(p => p.y);
      x = Math.min(...xs);
      y = Math.min(...ys);
      w = Math.max(...xs) - x;
      h = Math.max(...ys) - y;
    }

    if (w <= 0 || h <= 0) return null;

    canvas.width = w;
    canvas.height = h;

    if (selection.type === Tool.PENCIL && selection.points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(selection.points[0].x - x, selection.points[0].y - y);
        selection.points.forEach(p => ctx.lineTo(p.x - x, p.y - y));
        ctx.closePath();
        ctx.clip();
    }

    ctx.drawImage(mainCanvasRef.current, x, y, w, h, 0, 0, w, h);
    
    const activeRef = referenceImages.find(r => r.id === activeReferenceId);
    const mime = activeRef ? activeRef.mimeType : mimeType;
    
    return canvas.toDataURL(mime).split(',')[1];
  };

  const handleApplyCropToReference = async () => {
     if (!activeReferenceId) return;
     const cropped = await getCroppedBase64();
     if (cropped) {
         setReferenceImages(prev => prev.map(r => r.id === activeReferenceId ? { ...r, croppedBase64: cropped } : r));
         setSelection(null);
         setActiveTool(Tool.NONE);
     }
  };

  const handleDeleteReference = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setReferenceImages(prev => prev.filter(r => r.id !== id));
      if (activeReferenceId === id) {
          switchToImage(null);
      }
  };

  const handleGenerateAndSave = async () => {
    if (!rawBase64) return;
    
    setState(AppState.LOADING);
    setError(null);
    setIsEditing(false);

    try {
      let mainInputBase64 = rawBase64;
      let cropInfo = null;

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
                 const canvas = document.createElement('canvas');
                 canvas.width = w; canvas.height = h;
                 const ctx = canvas.getContext('2d');
                 if (ctx) {
                    ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
                    mainInputBase64 = canvas.toDataURL(mimeType).split(',')[1];
                    cropInfo = { x, y, w, h };
                 }
            }
        }
      }

      const resultUrl = await generateCaricature(mainInputBase64, selectedStyle, customPrompt, referenceImages, quality, mimeType);
      
      let finalResultUrl = resultUrl;

      // Composite back if Main was cropped
      if (cropInfo && !activeReferenceId && originalImage) {
          const mainImgObj = new Image(); mainImgObj.src = originalImage; await new Promise(r => mainImgObj.onload = r);
          
          const finalCanvas = document.createElement('canvas');
          finalCanvas.width = mainImgObj.naturalWidth;
          finalCanvas.height = mainImgObj.naturalHeight;
          const ctx = finalCanvas.getContext('2d');
          
          if (ctx) {
             ctx.drawImage(mainImgObj, 0, 0);
             
             const genImgObj = new Image(); genImgObj.src = resultUrl; await new Promise(r => genImgObj.onload = r);

             ctx.save();
             ctx.beginPath();
             if (selection?.type === Tool.RECTANGLE && selection.rect) {
                ctx.rect(selection.rect.x, selection.rect.y, selection.rect.w, selection.rect.h);
             } else if (selection?.type === Tool.PENCIL && selection.points.length > 0) {
                ctx.moveTo(selection.points[0].x, selection.points[0].y);
                selection.points.forEach(p => ctx.lineTo(p.x, p.y));
                ctx.closePath();
             }
             ctx.clip();
             ctx.drawImage(genImgObj, cropInfo.x, cropInfo.y, cropInfo.w, cropInfo.h);
             ctx.restore();
             
             finalResultUrl = finalCanvas.toDataURL(mimeType);
          }
      }

      setGeneratedImage(finalResultUrl);
      setState(AppState.SUCCESS);
      await addToHistory(finalResultUrl, selectedStyle);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ошибка генерации");
      setState(AppState.ERROR);
    }
  };

  const handleQuickDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `caricature-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveAs = async (filename: string, format: 'png' | 'jpeg') => {
    if (!generatedImage) return;
    
    // We will draw the image to a temporary canvas to convert it if needed
    // generatedImage could be a PNG base64 already.
    const img = new Image();
    img.src = generatedImage;
    
    // Wait for image load
    await new Promise((resolve) => {
        if (img.complete) resolve(true);
        img.onload = () => resolve(true);
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
        // Fill white background for JPEGs as they don't support transparency
        if (format === 'jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // Apply edits if they exist (usually edits are baked into generatedImage, 
        // but let's re-apply current editValues just in case user is in editing mode)
        if (isEditing) {
             ctx.filter = `brightness(${editValues.brightness}%) contrast(${editValues.contrast}%) saturate(${editValues.saturation}%)`;
        }

        ctx.drawImage(img, 0, 0);

        const mime = format === 'png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(mime, 0.9);
        
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${filename || 'caricature'}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setIsSaveModalOpen(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!generatedImage || !canvasRef.current) return;
    
    const img = new Image();
    img.src = generatedImage;
    img.onload = async () => {
      const canvas = canvasRef.current!;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      ctx.filter = `brightness(${editValues.brightness}%) contrast(${editValues.contrast}%) saturate(${editValues.saturation}%)`;
      ctx.drawImage(img, 0, 0);
      
      const editedDataUrl = canvas.toDataURL('image/png');
      setGeneratedImage(editedDataUrl);
      setIsEditing(false);
      await addToHistory(editedDataUrl, selectedStyle);
    };
  };

  const loadFromHistory = (item: HistoryItem) => {
    setGeneratedImage(item.url);
    setState(AppState.SUCCESS);
    setOriginalImage(null); 
    setReferenceImages([]);
    setActiveReferenceId(null);
    setSelection(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-dark font-sans selection:bg-primary selection:text-white pb-32 lg:pb-12">
      <SaveModal 
        isOpen={isSaveModalOpen} 
        onClose={() => setIsSaveModalOpen(false)} 
        onSave={handleSaveAs}
      />

      {/* Full Screen Image Modal */}
      {fullScreenImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in touch-none"
          onClick={() => setFullScreenImage(null)}
        >
           <button 
             onClick={() => setFullScreenImage(null)}
             className="absolute top-6 right-6 z-10 text-white/80 bg-white/10 rounded-full w-12 h-12 flex items-center justify-center hover:bg-white/20 hover:text-white transition-all backdrop-blur-md border border-white/10"
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
             </svg>
           </button>
           <img 
             src={fullScreenImage} 
             alt="Full Screen" 
             className="max-w-full max-h-full object-contain shadow-2xl rounded-sm"
             onClick={(e) => e.stopPropagation()}
             style={isEditing ? {
                filter: `brightness(${editValues.brightness}%) contrast(${editValues.contrast}%) saturate(${editValues.saturation}%)`
             } : {}}
           />
        </div>
      )}

      {/* iOS Install Instructions Banner */}
      {isIOS && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] bg-gray-900/95 backdrop-blur text-white p-4 safe-bottom animate-slide-up shadow-2xl border-t border-gray-700">
           <div className="flex justify-between items-start">
             <div className="flex-1">
                <p className="font-bold text-sm mb-2 text-primary">Установить приложение на iPhone:</p>
                <ol className="text-xs text-gray-300 space-y-2 ml-4 list-decimal leading-relaxed">
                   <li>Нажмите кнопку <span className="text-blue-400 font-bold">"Поделиться"</span> <span className="inline-block bg-gray-700 rounded px-1">⎋</span> (обычно внизу экрана)</li>
                   <li>Прокрутите вниз и выберите <span className="font-bold text-white bg-gray-700 px-1 rounded">"На экран «Домой»"</span> ➕</li>
                   <li>Нажмите "Добавить" в верхнем углу.</li>
                </ol>
             </div>
             <button onClick={() => setIsIOS(false)} className="text-gray-500 hover:text-white p-2 ml-2 bg-gray-800 rounded-full w-8 h-8 flex items-center justify-center transition-colors">✕</button>
           </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100 shadow-sm safe-top">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎭</span>
            <h1 className="text-xl font-comic font-bold text-gray-800">Карикатура AI</h1>
          </div>
          <div className="flex items-center gap-2">
             {installPrompt && (
               <button 
                 onClick={handleInstallClick}
                 className="hidden sm:flex bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold items-center gap-2 hover:bg-gray-800 transition-colors animate-pulse shadow-lg shadow-black/20"
               >
                 <span>⬇️</span> Установить приложение
               </button>
             )}
            <div className="text-xs font-semibold text-gray-400 hidden sm:block">
              Powered by Gemini
            </div>
          </div>
        </div>
        {/* Mobile Install Banner (Android) */}
        {installPrompt && (
           <div className="sm:hidden bg-black text-white p-2 flex justify-between items-center px-4">
              <span className="text-xs font-bold">Установите для быстрого доступа!</span>
              <button onClick={handleInstallClick} className="bg-white text-black px-3 py-1 rounded text-xs font-bold shadow-sm">
                 Установить
              </button>
           </div>
        )}
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        
        {/* Intro */}
        {state === AppState.IDLE && !originalImage && (
          <div className="text-center py-12 space-y-6 flex flex-col items-center justify-center min-h-[60vh]">
            <div className="text-6xl mb-4 animate-bounce">🎨</div>
            <h2 className="text-3xl md:text-5xl font-black text-gray-800 mb-2 leading-tight">
              Создайте свой <br />
              <span className="text-primary transform -rotate-2 inline-block">Шарж</span>
            </h2>
            <p className="text-lg text-gray-500 max-w-xs mx-auto">
              Загрузите фото, и искусственный интеллект превратит его в веселую карикатуру.
            </p>
            <div className="pt-8 w-full max-w-xs">
              <Button onClick={() => fileInputRef.current?.click()} className="w-full text-lg py-4 shadow-xl shadow-primary/20 rounded-2xl">
                Загрузить фото 📸
              </Button>
            </div>
          </div>
        )}

        <input type="file" ref={fileInputRef} onChange={handleMainFileChange} accept="image/*" className="hidden" />
        <input type="file" ref={refInputRef} onChange={handleReferenceFileChange} accept="image/*" className="hidden" />

        {/* Workspace */}
        {originalImage && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mb-12">
            
            {/* Left Column: Input & Controls */}
            <div className="space-y-4">
              
              {/* Canvas Card */}
              <div className={`bg-white rounded-2xl p-4 shadow-lg border-2 transition-colors ${activeReferenceId ? 'border-secondary/50 ring-2 ring-secondary/10' : 'border-gray-100'}`}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-gray-700 text-sm">
                    {activeReferenceId ? (
                        <span className="text-secondary flex items-center gap-2">✂️ Редактирование</span>
                    ) : 'Холст'}
                  </h3>
                  
                  {activeReferenceId ? (
                      <button 
                        onClick={() => switchToImage(null)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-bold text-gray-600 transition-colors"
                      >
                        Назад
                      </button>
                  ) : (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="text-xs text-primary font-bold bg-primary/10 px-2 py-1 rounded hover:bg-primary/20"
                        >
                          Сменить
                        </button>
                      </div>
                  )}
                </div>

                {/* Toolbar - Scrollable on mobile */}
                <div className="flex gap-2 mb-3 pb-2 overflow-x-auto no-scrollbar items-center">
                    {[
                        { t: Tool.NONE, i: '✋', title: 'Двигать' },
                        { t: Tool.PENCIL, i: '✏️', title: 'Лассо' },
                        { t: Tool.RECTANGLE, i: '⬜', title: 'Прямоугольник' },
                        { t: Tool.ERASER, i: '🧼', title: 'Ластик' },
                        { t: Tool.STAMP, i: '🥔', title: 'Штамп' },
                    ].map(tool => (
                        <button
                            key={tool.t}
                            onClick={() => {
                                if (tool.t === Tool.STAMP && !stampSource && !selection) {
                                    alert("Сначала выделите область и нажмите 'Создать штамп', или выделите область и переключитесь на штамп.");
                                }
                                if (tool.t === Tool.STAMP && selection) {
                                    captureStamp();
                                } else {
                                    setActiveTool(tool.t);
                                }
                            }}
                            className={`flex-shrink-0 w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all active:scale-95 ${activeTool === tool.t ? 'bg-gray-800 text-white shadow-md' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                            title={tool.title}
                        >
                            {tool.i}
                        </button>
                    ))}
                    
                    {selection && (
                        <>
                        <div className="w-px h-8 bg-gray-200 mx-1 flex-shrink-0"></div>
                        <button
                            onClick={captureStamp}
                            className="flex-shrink-0 text-xs font-bold bg-secondary text-white px-3 h-10 rounded-xl hover:bg-teal-500 shadow-sm"
                        >
                           Создать штамп
                        </button>
                        <button
                            onClick={() => { setSelection(null); setActiveTool(Tool.NONE); }}
                            className="flex-shrink-0 text-xs font-bold text-red-500 bg-red-50 px-3 h-10 rounded-xl hover:bg-red-100"
                        >
                            Сброс
                        </button>
                        </>
                    )}
                </div>

                {/* Tool Settings Bar */}
                {activeTool === Tool.ERASER && (
                    <div className="mb-3 p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-gray-500 w-16">Размер</span>
                            <input type="range" min="5" max="100" value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none accent-primary" />
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-gray-500 w-16">Жесткость</span>
                            <input type="range" min="0" max="100" value={brushHardness} onChange={e => setBrushHardness(Number(e.target.value))} className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none accent-primary" />
                        </div>
                    </div>
                )}
                {activeTool === Tool.STAMP && (
                     <div className="mb-3 p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-gray-500 w-16">Масштаб</span>
                            <input type="range" min="0.1" max="3" step="0.1" value={stampScale} onChange={e => setStampScale(Number(e.target.value))} className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none accent-secondary" />
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-gray-500 w-16">Поворот</span>
                            <input type="range" min="0" max="360" value={stampRotation} onChange={e => setStampRotation(Number(e.target.value))} className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none accent-secondary" />
                        </div>
                        {!stampSource && <div className="text-xs text-red-400 mt-1">⚠️ Нет штампа. Выделите область и нажмите 'Создать штамп'</div>}
                    </div>
                )}

                {/* Image Container */}
                <div 
                    className={`relative w-full rounded-xl overflow-hidden bg-[url('https://t3.ftcdn.net/jpg/03/76/74/78/360_F_376747823_L8il80K6c0B8K47eqV8a6q8b75k4b8h0.jpg')] bg-repeat border-2 border-dashed border-gray-300 touch-none shadow-inner`}
                    style={{ backgroundSize: '16px 16px' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                >
                  <canvas 
                    ref={mainCanvasRef}
                    className="w-full h-auto block select-none pointer-events-none" 
                  />
                  <canvas 
                    ref={selectionCanvasRef}
                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    style={{ cursor: activeTool === Tool.NONE ? 'default' : 'none' }} 
                  />
                  {/* Hidden ref just for data access if needed */}
                  <img ref={imageRef} className="hidden" />
                </div>
                
                {/* Contextual Action Bar under Image */}
                {activeReferenceId && (
                    <div className="mt-3">
                         <p className="text-xs text-secondary font-semibold mb-2">
                            Выделите объект, чтобы вырезать его.
                        </p>
                        {selection && (
                            <Button variant="secondary" onClick={handleApplyCropToReference} className="w-full py-3 text-sm rounded-xl">
                                Подтвердить выделение ✅
                            </Button>
                        )}
                    </div>
                )}
              </div>
              
              {/* Additional Photos Section */}
              <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
                 <div className="flex justify-between items-center mb-3">
                     <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Доп. фото</h3>
                     <button 
                        onClick={() => refInputRef.current?.click()}
                        className="text-xs bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-full font-bold text-dark transition-colors flex items-center gap-1 border border-gray-200"
                     >
                        <span>+</span> Добавить
                     </button>
                 </div>
                 
                 {referenceImages.length === 0 ? (
                     <div className="text-center py-4 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                         <p className="text-gray-400 text-xs">Загрузите фото объектов <br/>(шляпы, коты, очки)</p>
                     </div>
                 ) : (
                     <div className="grid grid-cols-4 gap-2">
                         {referenceImages.map((ref) => (
                             <div 
                                key={ref.id} 
                                onClick={() => switchToImage(ref.id)}
                                className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer border-2 transition-all active:scale-95 ${activeReferenceId === ref.id ? 'border-secondary ring-2 ring-secondary/30' : 'border-gray-100'}`}
                             >
                                 <img src={ref.originalUrl} className="w-full h-full object-cover" />
                                 {ref.croppedBase64 && (
                                     <div className="absolute inset-0 bg-secondary/30 flex items-center justify-center backdrop-blur-[1px]">
                                         <span className="text-white text-[10px] font-bold">✂️</span>
                                     </div>
                                 )}
                                 <button 
                                    onClick={(e) => handleDeleteReference(e, ref.id)}
                                    className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
                                 >
                                     ×
                                 </button>
                             </div>
                         ))}
                     </div>
                 )}
              </div>

              {/* Controls Card */}
              <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100 space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Стиль</label>
                  <StyleSelector selectedStyle={selectedStyle} onSelect={setSelectedStyle} disabled={state === AppState.LOADING} />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Качество</label>
                  <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                    {(['Standard', 'High'] as Quality[]).map((q) => (
                      <button
                        key={q}
                        onClick={() => setQuality(q)}
                        disabled={state === AppState.LOADING}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${quality === q ? 'bg-white text-dark shadow-sm border border-gray-100' : 'text-gray-400'}`}
                      >
                        {q === 'Standard' ? 'Быстро' : 'HD (Высокое)'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                   <label htmlFor="custom-prompt" className="block text-sm font-bold text-gray-700 mb-2">Детали</label>
                   <textarea
                     id="custom-prompt"
                     rows={3}
                     value={customPrompt}
                     onChange={(e) => setCustomPrompt(e.target.value)}
                     disabled={state === AppState.LOADING}
                     placeholder={referenceImages.length > 0 ? "Например: надень шляпу на голову..." : "Например: сделай фон космосом..."}
                     className="w-full p-3 rounded-xl bg-gray-50 border-transparent focus:bg-white focus:border-secondary focus:ring-2 focus:ring-secondary/10 transition-all outline-none resize-none text-sm placeholder-gray-400"
                   />
                </div>
              </div>
            </div>

            {/* Right Column: Output */}
            <div className="space-y-4 sticky top-20">
               <div className={`bg-white rounded-2xl p-4 shadow-xl border border-gray-100 h-full min-h-[400px] flex flex-col ${state === AppState.SUCCESS ? 'border-primary/30 ring-4 ring-primary/5' : ''}`}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-gray-700 text-sm">Результат</h3>
                  {generatedImage && state === AppState.SUCCESS && !isEditing && (
                    <button 
                      onClick={() => {
                        setIsEditing(true);
                        setEditValues({ brightness: 100, contrast: 100, saturation: 100 });
                      }}
                      className="text-xs font-bold text-secondary bg-secondary/10 px-3 py-1 rounded-lg hover:bg-secondary/20 flex items-center gap-1"
                    >
                      ✏️ Редактор
                    </button>
                  )}
                </div>
                <div className="flex-1 flex items-center justify-center bg-gray-50/50 rounded-xl relative overflow-hidden min-h-[350px]">
                  {state === AppState.IDLE && !generatedImage && (
                    <div className="text-center text-gray-400 p-8">
                      <p className="text-6xl mb-4 opacity-50">🖼️</p>
                      <p className="text-sm">Результат появится здесь</p>
                    </div>
                  )}
                  {state === AppState.LOADING && <Spinner />}
                  {state === AppState.ERROR && (
                     <div className="text-center p-8 max-w-xs">
                       <p className="text-5xl mb-4">😕</p>
                       <p className="text-red-500 font-bold mb-2">Упс!</p>
                       <p className="text-gray-600 text-sm">{error}</p>
                     </div>
                  )}
                  {generatedImage && state !== AppState.LOADING && (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <img 
                        src={generatedImage} 
                        alt="Caricature" 
                        onClick={() => setFullScreenImage(generatedImage)}
                        className="max-w-full max-h-[600px] object-contain rounded-lg shadow-sm transition-all duration-500 animate-fade-in hover:scale-[1.01] cursor-zoom-in"
                        style={isEditing ? {
                          filter: `brightness(${editValues.brightness}%) contrast(${editValues.contrast}%) saturate(${editValues.saturation}%)`
                        } : {}}
                      />
                    </div>
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>

                {isEditing && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 animate-fade-in">
                    <div className="space-y-4">
                      <div>
                        <label className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                          <span>Яркость</span> <span>{editValues.brightness}%</span>
                        </label>
                        <input type="range" min="50" max="150" value={editValues.brightness} onChange={(e) => setEditValues(prev => ({...prev, brightness: Number(e.target.value)}))} className="w-full accent-primary h-2 bg-gray-200 rounded-lg appearance-none" />
                      </div>
                      <div>
                        <label className="flex justify-between text-xs font-bold text-gray-500 mb-1">
                          <span>Контраст</span> <span>{editValues.contrast}%</span>
                        </label>
                        <input type="range" min="50" max="150" value={editValues.contrast} onChange={(e) => setEditValues(prev => ({...prev, contrast: Number(e.target.value)}))} className="w-full accent-primary h-2 bg-gray-200 rounded-lg appearance-none" />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" onClick={() => setIsEditing(false)} className="flex-1 py-3 text-xs rounded-xl">Отмена</Button>
                        <Button onClick={handleSaveEdits} className="flex-1 py-3 text-xs rounded-xl">Сохранить</Button>
                      </div>
                    </div>
                  </div>
                )}
                {state === AppState.SUCCESS && generatedImage && !isEditing && (
                  <div className="mt-4 animate-slide-up grid grid-cols-2 gap-3">
                    <Button variant="outline" onClick={() => setIsSaveModalOpen(true)} className="py-4 rounded-xl text-sm border-2">Сохранить как...</Button>
                    <Button variant="secondary" onClick={handleQuickDownload} className="py-4 rounded-xl shadow-lg shadow-secondary/20 text-sm">Скачать 📥</Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sticky Mobile Action Bar */}
        {originalImage && !activeReferenceId && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-lg border-t border-gray-200 z-50 lg:hidden safe-bottom shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                 <Button 
                    onClick={handleGenerateAndSave} 
                    isLoading={state === AppState.LOADING}
                    className="w-full text-lg py-4 rounded-2xl shadow-xl shadow-primary/30"
                    disabled={!!activeReferenceId} 
                  >
                    {state === AppState.SUCCESS ? 'Создать еще ✨' : 'Сделать карикатуру! 🎨'}
                  </Button>
            </div>
        )}

        {/* Desktop Action Button (hidden on mobile) */}
        {originalImage && !activeReferenceId && (
            <div className="hidden lg:block fixed bottom-8 right-8 z-40">
                <Button 
                    onClick={handleGenerateAndSave} 
                    isLoading={state === AppState.LOADING}
                    className="text-lg py-4 px-8 rounded-full shadow-2xl shadow-primary/40 transform hover:scale-105 active:scale-95 transition-all"
                >
                    {state === AppState.SUCCESS ? 'Создать еще ✨' : 'Сделать карикатуру! 🎨'}
                </Button>
            </div>
        )}

        {/* History Section */}
        {history.length > 0 && (
          <div className="mt-8 border-t border-gray-200 pt-8 pb-20">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2"><span>🕰️</span> История</h2>
            <div className="flex overflow-x-auto gap-3 pb-4 no-scrollbar">
              {history.map((item) => (
                <div key={item.id} onClick={() => loadFromHistory(item)} className="flex-shrink-0 w-32 bg-white p-2 rounded-xl shadow-sm border border-gray-100 active:scale-95 transition-transform">
                  <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-gray-50">
                    <img src={item.url} alt="History" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex justify-between items-center px-1">
                     <span className="text-[9px] font-bold text-gray-500 truncate max-w-[60px]">{item.style}</span>
                     <span className="text-[9px] text-gray-300">{new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.5s ease-out forwards;
        }
        /* Hide Scrollbar but keep functionality */
        .no-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
        .safe-bottom {
            padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </div>
  );
};

export default App;
