import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { 
  ViewType, 
  Position3D, 
  project3DToView, 
  canvas2DTo3D, 
  calculateCanvasBounds
} from '@shared/3d/projections';
import { Lesion, Severity } from '@/lib/lesionStore';

export type DrawingTool = 'select' | 'pen' | 'eraser' | 'line' | 'text' | 'circle' | 'circle-filled' | 'ruler';

export interface Canvas2DHandle {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

interface Canvas2DProps {
  viewType: ViewType;
  lesions?: Lesion[];
  selectedLesionId?: string | null;
  zoomLevel: number;
  editMode: boolean;
  drawingTool?: DrawingTool;
  drawingColor?: string;
  drawingSize?: number;
  drawingData?: string;
  fillTexture?: "none" | "solid" | "pattern";
  onLesionSelect?: (id: string | null) => void;
  onLesionMove?: (id: string, position: Position3D) => void;
  onLesionCreate?: (position: Position3D) => void;
  onCanvasRef?: (canvas: HTMLCanvasElement | null, drawingCanvas: HTMLCanvasElement | null) => void;
  onDrawingChange?: (dataUrl: string) => void;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
}

const SEVERITY_COLORS: Record<Severity, string> = {
  superficial: '#ef4444',
  deep: '#3b82f6'
};

const VIEW_IMAGES: Record<ViewType, string> = {
  'sagittal-avf': '/assets/sagittal-avf-view.png',
  'sagittal-rvf': '/assets/sagittal-rvf-view.png',
  'coronal': '/assets/coronal-view.png',
  'posterior': '/assets/posterior-view.jpg'
};

const MAX_HISTORY = 50;

const Canvas2D = forwardRef<Canvas2DHandle, Canvas2DProps>(({
  viewType,
  lesions = [],
  selectedLesionId = null,
  zoomLevel,
  editMode,
  drawingTool = 'select',
  drawingColor = '#ffffff',
  drawingSize = 3,
  drawingData,
  fillTexture = "none",
  onLesionSelect,
  onLesionMove,
  onLesionCreate,
  onCanvasRef,
  onDrawingChange,
  onHistoryChange
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragLesionId, setDragLesionId] = useState<string | null>(null);
  const [hoveredLesionId, setHoveredLesionId] = useState<string | null>(null);
  const [viewImage, setViewImage] = useState<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [showRulerInput, setShowRulerInput] = useState(false);
  const [rulerInput, setRulerInput] = useState('');
  const [rulerLineData, setRulerLineData] = useState<{ sx: number; sy: number; ex: number; ey: number } | null>(null);
  const drawingRestoredRef = useRef(false);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const drawingBaseRef = useRef<ImageData | null>(null);

  // History: array of data URL snapshots. Index points to the current state.
  // Index -1 means blank canvas (no history yet).
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);

  const notifyHistoryChange = useCallback(() => {
    const canUndo = historyIndexRef.current >= 0;
    const canRedo = historyIndexRef.current < historyRef.current.length - 1;
    onHistoryChange?.(canUndo, canRedo);
  }, [onHistoryChange]);

  const pushHistory = useCallback(() => {
    const drawingCanvas = drawingCanvasRef.current;
    if (!drawingCanvas || drawingCanvas.width === 0 || drawingCanvas.height === 0) return;
    const dataUrl = drawingCanvas.toDataURL('image/png');
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(dataUrl);
    historyIndexRef.current = historyRef.current.length - 1;
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
      historyIndexRef.current = historyRef.current.length - 1;
    }
    notifyHistoryChange();
  }, [notifyHistoryChange]);

  const restoreSnapshot = useCallback((dataUrl: string) => {
    const drawingCanvas = drawingCanvasRef.current;
    if (!drawingCanvas) return;
    const ctx = drawingCanvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
      ctx.drawImage(img, 0, 0, drawingCanvas.width, drawingCanvas.height);
      onDrawingChange?.(dataUrl);
    };
    img.src = dataUrl;
  }, [onDrawingChange]);

  const undo = useCallback(() => {
    if (historyIndexRef.current < 0) return;
    historyIndexRef.current -= 1;
    if (historyIndexRef.current < 0) {
      const drawingCanvas = drawingCanvasRef.current;
      if (drawingCanvas) {
        const ctx = drawingCanvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
          onDrawingChange?.('');
        }
      }
    } else {
      restoreSnapshot(historyRef.current[historyIndexRef.current]);
    }
    notifyHistoryChange();
  }, [restoreSnapshot, onDrawingChange, notifyHistoryChange]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    restoreSnapshot(historyRef.current[historyIndexRef.current]);
    notifyHistoryChange();
  }, [restoreSnapshot, notifyHistoryChange]);

  useImperativeHandle(ref, () => ({
    undo,
    redo,
    get canUndo() { return historyIndexRef.current >= 0; },
    get canRedo() { return historyIndexRef.current < historyRef.current.length - 1; },
  }), [undo, redo]);

  useEffect(() => {
    setShowTextInput(false);
    setTextInput('');
    setShowRulerInput(false);
    setRulerInput('');
    setRulerLineData(null);
    setStartPos(null);
  }, [drawingTool]);

  useEffect(() => {
    const imagePath = VIEW_IMAGES[viewType];
    if (imagePath) {
      const img = new Image();
      img.src = imagePath;
      img.onload = () => setViewImage(img);
    }
  }, [viewType]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    if (canvas) {
      onCanvasRef?.(canvas, drawingCanvas);
    }
    return () => {
      onCanvasRef?.(null, null);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const roundedWidth = Math.floor(width);
        const roundedHeight = Math.floor(height);
        
        if (roundedWidth > 0 && roundedHeight > 0) {
          setCanvasSize(prev => {
            if (Math.abs(prev.width - roundedWidth) > 1 || Math.abs(prev.height - roundedHeight) > 1) {
              return { width: roundedWidth, height: roundedHeight };
            }
            return prev;
          });
        }
      }
    });

    resizeObserver.observe(container);
    
    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setCanvasSize({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
    }

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (drawingData && !drawingRestoredRef.current && canvasSize.width > 0 && canvasSize.height > 0) {
      const drawingCanvas = drawingCanvasRef.current;
      if (!drawingCanvas) return;

      drawingCanvas.width = canvasSize.width;
      drawingCanvas.height = canvasSize.height;

      const img = new Image();
      img.onload = () => {
        const ctx = drawingCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, drawingCanvas.width, drawingCanvas.height);
        }
        drawingRestoredRef.current = true;
      };
      img.src = drawingData;
    }
  }, [drawingData, canvasSize]);

  const saveDrawing = useCallback(() => {
    const drawingCanvas = drawingCanvasRef.current;
    if (drawingCanvas && onDrawingChange) {
      const dataUrl = drawingCanvas.toDataURL('image/png');
      onDrawingChange(dataUrl);
    }
    pushHistory();
  }, [onDrawingChange, pushHistory]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const drawingCanvas = drawingCanvasRef.current;
    if (!canvas || canvasSize.width === 0 || canvasSize.height === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let drawingImageData: ImageData | null = null;
    
    if (drawingCanvas && drawingCanvas.width > 0 && drawingCanvas.height > 0) {
      const drawingCtx = drawingCanvas.getContext('2d');
      if (drawingCtx) {
        try {
          drawingImageData = drawingCtx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height);
        } catch (e) {
          // Handle CORS or other errors
        }
      }
    }
    
    if (canvas.width !== canvasSize.width || canvas.height !== canvasSize.height) {
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
    }
    
    if (drawingCanvas) {
      if (drawingCanvas.width !== canvasSize.width || drawingCanvas.height !== canvasSize.height) {
        drawingCanvas.width = canvasSize.width;
        drawingCanvas.height = canvasSize.height;
      }
      
      if (drawingImageData) {
        const drawingCtx = drawingCanvas.getContext('2d');
        if (drawingCtx) {
          try {
            drawingCtx.putImageData(drawingImageData, 0, 0);
          } catch (e) {
            // Handle errors silently
          }
        }
      }
    }

    const bounds = calculateCanvasBounds(canvas.width, canvas.height, zoomLevel);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (viewImage) {
      const baseSize = Math.min(canvas.width, canvas.height) * 0.9;
      const scale = (baseSize / Math.max(viewImage.width, viewImage.height)) * zoomLevel;
      const scaledWidth = viewImage.width * scale;
      const scaledHeight = viewImage.height * scale;
      const x = (canvas.width - scaledWidth) / 2;
      const y = (canvas.height - scaledHeight) / 2;
      
      ctx.globalAlpha = 0.9;
      ctx.drawImage(viewImage, x, y, scaledWidth, scaledHeight);
      ctx.globalAlpha = 1.0;
    }

    lesions.forEach(lesion => {
      const pos2D = project3DToView(lesion.position, viewType, bounds);
      const isSelected = lesion.id === selectedLesionId;
      const isHovered = lesion.id === hoveredLesionId;
      const color = SEVERITY_COLORS[lesion.severity];
      
      const baseRadius = 12 * zoomLevel;
      const radius = isHovered ? baseRadius * 1.2 : baseRadius;

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(pos2D.x, pos2D.y, radius + 8, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(pos2D.x, pos2D.y, radius + 4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const gradient = ctx.createRadialGradient(
        pos2D.x - radius * 0.3,
        pos2D.y - radius * 0.3,
        0,
        pos2D.x,
        pos2D.y,
        radius
      );
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, `${color}88`);
      
      ctx.beginPath();
      ctx.arc(pos2D.x, pos2D.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(pos2D.x - radius * 0.25, pos2D.y - radius * 0.25, radius * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fill();
    });

    // Label removed per user request

  }, [lesions, selectedLesionId, hoveredLesionId, zoomLevel, viewType, viewImage, canvasSize]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const getLesionAtPosition = useCallback((x: number, y: number): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const bounds = calculateCanvasBounds(canvas.width, canvas.height, zoomLevel);
    const hitRadius = 15 * zoomLevel;

    for (let i = lesions.length - 1; i >= 0; i--) {
      const lesion = lesions[i];
      const pos2D = project3DToView(lesion.position, viewType, bounds);
      const distance = Math.sqrt(Math.pow(x - pos2D.x, 2) + Math.pow(y - pos2D.y, 2));
      
      if (distance <= hitRadius) {
        return lesion.id;
      }
    }
    return null;
  }, [lesions, viewType, zoomLevel]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!editMode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const lesionId = getLesionAtPosition(x, y);

    if (lesionId) {
      setIsDragging(true);
      setDragLesionId(lesionId);
      onLesionSelect?.(lesionId);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else if (onLesionCreate) {
      const bounds = calculateCanvasBounds(canvas.width, canvas.height, zoomLevel);
      const position3D = canvas2DTo3D(x, y, viewType, bounds);
      onLesionCreate(position3D);
    }
  }, [editMode, getLesionAtPosition, onLesionSelect, onLesionCreate, viewType, zoomLevel]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging && dragLesionId && editMode && onLesionMove) {
      const bounds = calculateCanvasBounds(canvas.width, canvas.height, zoomLevel);
      const currentLesion = lesions.find(l => l.id === dragLesionId);
      const position3D = canvas2DTo3D(x, y, viewType, bounds, currentLesion?.position);
      onLesionMove(dragLesionId, position3D);
    } else {
      const lesionId = getLesionAtPosition(x, y);
      setHoveredLesionId(lesionId);
      canvas.style.cursor = lesionId ? 'pointer' : (editMode ? 'crosshair' : 'default');
    }
  }, [isDragging, dragLesionId, editMode, getLesionAtPosition, onLesionMove, lesions, viewType, zoomLevel]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      setDragLesionId(null);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  }, [isDragging]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!editMode || drawingTool !== 'select') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const lesionId = getLesionAtPosition(x, y);
    if (lesionId) {
      onLesionSelect?.(lesionId);
    }
  }, [editMode, drawingTool, getLesionAtPosition, onLesionSelect]);

  const closeAllInputs = useCallback(() => {
    setShowTextInput(false);
    setTextInput('');
    setShowRulerInput(false);
    setRulerInput('');
    setRulerLineData(null);
  }, []);

  const handleDrawingPointerDown = useCallback((e: React.PointerEvent) => {
    if (drawingTool === 'select') return;
    
    closeAllInputs();

    const drawingCanvas = drawingCanvasRef.current;
    if (!drawingCanvas) return;

    const rect = drawingCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (drawingTool === 'text') {
      setStartPos({ x, y });
      setShowTextInput(true);
      return;
    }

    setIsDrawing(true);
    setStartPos({ x, y });
    const ctx = drawingCanvas.getContext('2d');
    if (!ctx) return;

    if (drawingTool === 'line' || drawingTool === 'circle' || drawingTool === 'circle-filled' || drawingTool === 'ruler') {
      try {
        drawingBaseRef.current = ctx.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height);
      } catch (e) {
        drawingBaseRef.current = null;
      }
    }

    ctx.lineWidth = drawingSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = drawingColor;

    if (drawingTool === 'pen') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else if (drawingTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.moveTo(x, y);
    }
  }, [drawingTool, drawingColor, drawingSize, closeAllInputs]);

  const handleDrawingPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawing || !startPos || drawingTool === 'select' || drawingTool === 'text') return;

    const drawingCanvas = drawingCanvasRef.current;
    if (!drawingCanvas) return;

    const rect = drawingCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = drawingCanvas.getContext('2d');
    if (!ctx) return;

    if (drawingTool === 'pen' || drawingTool === 'eraser') {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (drawingTool === 'line' || drawingTool === 'circle' || drawingTool === 'circle-filled' || drawingTool === 'ruler') {
      if (drawingBaseRef.current) {
        ctx.putImageData(drawingBaseRef.current, 0, 0);
      } else {
        ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
      }
      
      ctx.lineWidth = drawingSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = drawingColor;
      ctx.fillStyle = drawingColor;

      if (fillTexture === "pattern" && (drawingTool === 'circle' || drawingTool === 'circle-filled')) {
        const patternCanvas = document.createElement('canvas');
        const pCtx = patternCanvas.getContext('2d');
        if (pCtx) {
          patternCanvas.width = 10;
          patternCanvas.height = 10;
          pCtx.strokeStyle = drawingColor;
          pCtx.lineWidth = 1;
          pCtx.beginPath();
          pCtx.moveTo(0, 10);
          pCtx.lineTo(10, 0);
          pCtx.stroke();
          const pattern = ctx.createPattern(patternCanvas, 'repeat');
          if (pattern) ctx.fillStyle = pattern;
        }
      }

      if (drawingTool === 'line') {
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      } else if (drawingTool === 'ruler') {
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        const markerSize = 6;
        ctx.beginPath();
        ctx.moveTo(startPos.x - markerSize, startPos.y - markerSize);
        ctx.lineTo(startPos.x + markerSize, startPos.y + markerSize);
        ctx.moveTo(startPos.x + markerSize, startPos.y - markerSize);
        ctx.lineTo(startPos.x - markerSize, startPos.y + markerSize);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - markerSize, y - markerSize);
        ctx.lineTo(x + markerSize, y + markerSize);
        ctx.moveTo(x + markerSize, y - markerSize);
        ctx.lineTo(x - markerSize, y + markerSize);
        ctx.stroke();
      } else {
        const radius = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2));
        ctx.beginPath();
        ctx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
        if (drawingTool === 'circle-filled' || fillTexture !== 'none') {
          ctx.fill();
        }
        ctx.stroke();
      }
    }
  }, [isDrawing, startPos, drawingTool, drawingColor, drawingSize, fillTexture]);

  const handleDrawingPointerUp = useCallback((e: React.PointerEvent) => {
    if (drawingTool === 'line' || drawingTool === 'circle' || drawingTool === 'circle-filled' || drawingTool === 'ruler') {
      const drawingCanvas = drawingCanvasRef.current;
      if (drawingCanvas && startPos && isDrawing) {
        const rect = drawingCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const ctx = drawingCanvas.getContext('2d');
        if (ctx) {
          if (drawingBaseRef.current) {
            ctx.putImageData(drawingBaseRef.current, 0, 0);
          }
          
          ctx.lineWidth = drawingSize;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = drawingColor;
          ctx.fillStyle = drawingColor;

          if (fillTexture === "pattern" && (drawingTool === 'circle' || drawingTool === 'circle-filled')) {
            const patternCanvas = document.createElement('canvas');
            const pCtx = patternCanvas.getContext('2d');
            if (pCtx) {
              patternCanvas.width = 10;
              patternCanvas.height = 10;
              pCtx.strokeStyle = drawingColor;
              pCtx.lineWidth = 1;
              pCtx.beginPath();
              pCtx.moveTo(0, 10);
              pCtx.lineTo(10, 0);
              pCtx.stroke();
              const pattern = ctx.createPattern(patternCanvas, 'repeat');
              if (pattern) ctx.fillStyle = pattern;
            }
          }

          if (drawingTool === 'line') {
            ctx.beginPath();
            ctx.moveTo(startPos.x, startPos.y);
            ctx.lineTo(x, y);
            ctx.stroke();
          } else if (drawingTool === 'ruler') {
            ctx.beginPath();
            ctx.moveTo(startPos.x, startPos.y);
            ctx.lineTo(x, y);
            ctx.stroke();
            const markerSize = 6;
            ctx.beginPath();
            ctx.moveTo(startPos.x - markerSize, startPos.y - markerSize);
            ctx.lineTo(startPos.x + markerSize, startPos.y + markerSize);
            ctx.moveTo(startPos.x + markerSize, startPos.y - markerSize);
            ctx.lineTo(startPos.x - markerSize, startPos.y + markerSize);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x - markerSize, y - markerSize);
            ctx.lineTo(x + markerSize, y + markerSize);
            ctx.moveTo(x + markerSize, y - markerSize);
            ctx.lineTo(x - markerSize, y + markerSize);
            ctx.stroke();
            setRulerLineData({ sx: startPos.x, sy: startPos.y, ex: x, ey: y });
            setRulerInput('');
            setShowRulerInput(true);
          } else {
            const radius = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2));
            ctx.beginPath();
            ctx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
            if (drawingTool === 'circle-filled' || fillTexture !== 'none') {
              ctx.fill();
            }
            ctx.stroke();
          }
        }
      }
      drawingBaseRef.current = null;
    }
    if (isDrawing) {
      saveDrawing();
    }
    setIsDrawing(false);
    if (drawingTool !== 'text' && drawingTool !== 'ruler') {
      setStartPos(null);
    }
  }, [isDrawing, startPos, drawingTool, drawingColor, drawingSize, fillTexture, saveDrawing]);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full bg-white rounded-lg overflow-hidden border border-slate-300 shadow-sm"
      data-testid={`canvas-2d-${viewType}`}
    >
      <div className="absolute inset-0">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 touch-none"
          style={{ width: '100%', height: '100%' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onDoubleClick={handleDoubleClick}
          data-testid={`canvas-${viewType}`}
        />
        
        <canvas
          ref={drawingCanvasRef}
          className={`absolute inset-0 touch-none ${drawingTool !== 'select' ? 'cursor-crosshair' : 'cursor-default'}`}
          style={{ width: '100%', height: '100%' }}
          onPointerDown={handleDrawingPointerDown}
          onPointerMove={handleDrawingPointerMove}
          onPointerUp={handleDrawingPointerUp}
          onPointerLeave={handleDrawingPointerUp}
          data-testid={`drawing-canvas-${viewType}`}
        />
      </div>
      
      {showTextInput && startPos && (
        <div
          className="absolute bg-slate-800 border border-slate-600 rounded p-2 z-30"
          style={{ left: `${startPos.x}px`, top: `${startPos.y - 40}px` }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && textInput.trim()) {
                const drawingCanvas = drawingCanvasRef.current;
                if (drawingCanvas) {
                  const ctx = drawingCanvas.getContext('2d');
                  if (ctx) {
                    ctx.fillStyle = drawingColor;
                    ctx.font = `${drawingSize * 4}px sans-serif`;
                    ctx.fillText(textInput, startPos.x, startPos.y);
                  }
                }
                saveDrawing();
                setShowTextInput(false);
                setTextInput('');
                setStartPos(null);
              } else if (e.key === 'Escape') {
                setShowTextInput(false);
                setTextInput('');
                setStartPos(null);
              }
            }}
            autoFocus
            className="w-36 px-2 py-1 text-sm bg-slate-900 border border-slate-500 text-white rounded"
            placeholder="Digite o texto..."
            data-testid="input-text-tool"
          />
        </div>
      )}
      
      {showRulerInput && rulerLineData && (
        <div
          className="absolute bg-slate-800 border border-slate-600 rounded p-2 z-30"
          style={{ 
            left: `${(rulerLineData.sx + rulerLineData.ex) / 2}px`, 
            top: `${(rulerLineData.sy + rulerLineData.ey) / 2 - 40}px` 
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={rulerInput}
              onChange={(e) => setRulerInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && rulerInput.trim()) {
                  const drawingCanvas = drawingCanvasRef.current;
                  if (drawingCanvas && rulerLineData) {
                    const ctx = drawingCanvas.getContext('2d');
                    if (ctx) {
                      const midX = (rulerLineData.sx + rulerLineData.ex) / 2;
                      const midY = (rulerLineData.sy + rulerLineData.ey) / 2;
                      const text = `${rulerInput} mm`;
                      ctx.font = 'bold 14px sans-serif';
                      ctx.fillStyle = drawingColor;
                      ctx.strokeStyle = '#000';
                      ctx.lineWidth = 3;
                      ctx.strokeText(text, midX + 5, midY - 5);
                      ctx.fillText(text, midX + 5, midY - 5);
                    }
                  }
                  saveDrawing();
                  setShowRulerInput(false);
                  setRulerInput('');
                  setRulerLineData(null);
                } else if (e.key === 'Escape') {
                  setShowRulerInput(false);
                  setRulerInput('');
                  setRulerLineData(null);
                }
              }}
              autoFocus
              className="w-20 px-2 py-1 text-sm bg-slate-900 border border-slate-500 text-white rounded"
              placeholder="0"
              step="0.1"
              min="0"
              data-testid="input-ruler-mm"
            />
            <span className="text-xs text-slate-300 font-mono">mm</span>
          </div>
        </div>
      )}

      {hoveredLesionId && !isDragging && drawingTool === 'select' && (
        <div className="absolute bottom-2 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded pointer-events-none z-10">
          {editMode ? 'Arraste para mover · Duplo-clique para editar' : 'Clique para selecionar'}
        </div>
      )}
      {!hoveredLesionId && drawingTool === 'select' && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none z-10">
          <span className="text-[9px] text-slate-400 font-mono bg-black/60 px-2 py-1 rounded backdrop-blur-sm whitespace-nowrap">
            Botão direito: adicionar lesão
          </span>
        </div>
      )}
    </div>
  );
});

export default Canvas2D;
