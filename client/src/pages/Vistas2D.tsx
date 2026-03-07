import { useLocation } from "wouter";
import AppSidebar from "@/components/AppSidebar";
import Canvas2D from "@/components/Canvas2D";
import { ViewType } from "@shared/3d/projections";
import { Button } from "@/components/ui/button";
import { useReportStore } from "@/lib/reportStore";
import {
  ArrowLeft,
  Pen,
  Eraser,
  Pointer,
  Type,
  Minus,
  Circle,
  Ruler,
  Send,
  Check,
  Camera,
  Undo2,
  Redo2,
  Maximize2,
  X,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useRef, useCallback, useEffect } from "react";
import { DrawingTool, Canvas2DHandle } from "@/components/Canvas2D";

const VIEW_TYPES: ViewType[] = [
  "sagittal-avf",
  "sagittal-rvf",
  "coronal",
  "posterior",
];

const VIEW_LABELS: Record<ViewType, string> = {
  "sagittal-avf": "Sagittal (AVF)",
  "sagittal-rvf": "Sagittal (RVF)",
  coronal: "Coronal",
  posterior: "Posterior",
};

const VIEW_COLORS: Record<ViewType, { border: string; text: string; bg: string }> = {
  "sagittal-avf": { border: 'border-blue-500/30', text: 'text-blue-400', bg: 'bg-blue-500' },
  "sagittal-rvf": { border: 'border-purple-500/30', text: 'text-purple-400', bg: 'bg-purple-500' },
  coronal: { border: 'border-green-500/30', text: 'text-green-400', bg: 'bg-green-500' },
  posterior: { border: 'border-amber-500/30', text: 'text-amber-400', bg: 'bg-amber-500' },
};

const TOOL_LABELS: Record<string, string> = {
  select: 'Selecionar',
  pen: 'Desenhar',
  eraser: 'Borracha',
  line: 'Linha',
  circle: 'C\u00edrculo',
  'circle-filled': 'C\u00edrculo Preenchido',
  text: 'Texto',
  ruler: 'R\u00e9gua',
};

interface ViewSettings {
  drawingTool: DrawingTool;
  drawingColor: string;
  drawingSize: number;
  drawingData: string;
  fillTexture: "none" | "solid" | "pattern";
}

const createDefaultViewSettings = (): ViewSettings => ({
  drawingTool: "pen",
  drawingColor: "#ff0000",
  drawingSize: 3,
  drawingData: "",
  fillTexture: "none",
});

export default function Vistas2D() {
  const [, setLocation] = useLocation();
  const [viewSettings, setViewSettings] = useState<
    Record<ViewType, ViewSettings>
  >(() => ({
    "sagittal-avf": createDefaultViewSettings(),
    "sagittal-rvf": createDefaultViewSettings(),
    coronal: createDefaultViewSettings(),
    posterior: createDefaultViewSettings(),
  }));
  const [activeView, setActiveView] = useState<ViewType | null>(null);
  const [fullscreenView, setFullscreenView] = useState<ViewType | null>(null);
  const [historyState, setHistoryState] = useState<Record<ViewType, { canUndo: boolean; canRedo: boolean }>>({
    "sagittal-avf": { canUndo: false, canRedo: false },
    "sagittal-rvf": { canUndo: false, canRedo: false },
    coronal: { canUndo: false, canRedo: false },
    posterior: { canUndo: false, canRedo: false },
  });
  const canvasHandleRefs = useRef<Record<ViewType, Canvas2DHandle | null>>({
    "sagittal-avf": null,
    "sagittal-rvf": null,
    coronal: null,
    posterior: null,
  });
  const { selectedViews, toggleViewSelection, addPdfImage, clearPdfImages } =
    useReportStore();
  const canvasRefs = useRef<Record<ViewType, { main: HTMLCanvasElement | null; drawing: HTMLCanvasElement | null }>>({
    "sagittal-avf": { main: null, drawing: null },
    "sagittal-rvf": { main: null, drawing: null },
    coronal: { main: null, drawing: null },
    posterior: { main: null, drawing: null },
  });

  const setCanvasRef = useCallback(
    (viewType: ViewType) => (canvas: HTMLCanvasElement | null, drawingCanvas: HTMLCanvasElement | null) => {
      canvasRefs.current[viewType] = { main: canvas, drawing: drawingCanvas };
    },
    [],
  );

  const updateViewSetting = <K extends keyof ViewSettings>(
    view: ViewType,
    key: K,
    value: ViewSettings[K],
  ) => {
    setViewSettings((prev) => ({
      ...prev,
      [view]: { ...prev[view], [key]: value },
    }));
  };

  const currentSettings = activeView ? viewSettings[activeView] : null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && fullscreenView) {
        setFullscreenView(null);
        return;
      }
      if (!activeView) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        canvasHandleRefs.current[activeView]?.undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        canvasHandleRefs.current[activeView]?.redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, fullscreenView]);

  const selectedCount = Object.values(selectedViews).filter(Boolean).length;

  const captureViewImage = (viewType: ViewType): string | null => {
    const refs = canvasRefs.current[viewType];
    if (!refs.main) return null;

    const scale = 2;
    const mainCanvas = refs.main;
    const drawingCanvas = refs.drawing;

    const mergedCanvas = document.createElement("canvas");
    mergedCanvas.width = mainCanvas.width * scale;
    mergedCanvas.height = mainCanvas.height * scale;

    const ctx = mergedCanvas.getContext("2d");
    if (!ctx) return null;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.scale(scale, scale);

    ctx.drawImage(mainCanvas, 0, 0);

    if (drawingCanvas) {
      ctx.drawImage(drawingCanvas, 0, 0);
    }

    return mergedCanvas.toDataURL("image/png");
  };

  const handleCaptureSingleView = (viewType: ViewType) => {
    const imgData = captureViewImage(viewType);
    if (imgData) {
      addPdfImage({
        data: imgData,
        label: VIEW_LABELS[viewType],
        viewType: viewType,
        observation: "",
      });
      toast.success(`${VIEW_LABELS[viewType]} capturada e adicionada ao relatório`);
    }
  };

  const handleExportView = async (viewType: ViewType) => {
    const imgData = captureViewImage(viewType);
    if (!imgData) return;

    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const pageW = 210;
    const pageH = 297;
    const margin = 15;
    const usableW = pageW - margin * 2;
    const headerH = 20;
    const footerH = 10;
    const usableH = pageH - margin * 2 - headerH - footerH;

    doc.setFontSize(14);
    doc.setTextColor(60, 60, 60);
    doc.text("EndoMapper", margin, margin + 6);
    doc.setFontSize(11);
    doc.setTextColor(120, 120, 120);
    doc.text(VIEW_LABELS[viewType], margin, margin + 13);
    doc.setFontSize(9);
    doc.text(new Date().toLocaleDateString("pt-BR"), pageW - margin, margin + 6, { align: "right" });

    doc.setDrawColor(220, 220, 220);
    doc.line(margin, margin + headerH, pageW - margin, margin + headerH);

    const img = new Image();
    img.src = imgData;
    await new Promise<void>((resolve) => { img.onload = () => resolve(); });

    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;
    const scaleW = usableW / imgW;
    const scaleH = usableH / imgH;
    const scale = Math.min(scaleW, scaleH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const drawX = margin + (usableW - drawW) / 2;
    const drawY = margin + headerH + (usableH - drawH) / 2;

    doc.addImage(imgData, "PNG", drawX, drawY, drawW, drawH);

    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text("EndoMapper — Sistema de Mapeamento de Endometriose", pageW / 2, pageH - margin, { align: "center" });

    const fileName = `${VIEW_LABELS[viewType].replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
    doc.save(fileName);
    toast.success(`${VIEW_LABELS[viewType]} exportada como PDF A4`);
  };

  const handleSendToReport = () => {
    VIEW_TYPES.forEach((viewType) => {
      if (selectedViews[viewType]) {
        const imgData = captureViewImage(viewType);
        if (imgData) {
          addPdfImage({
            data: imgData,
            label: VIEW_LABELS[viewType],
            viewType: viewType,
            observation: "",
          });
        }
      }
    });

    setLocation("/preview-report");
  };

  const renderToolbar = (targetView: ViewType | null, settings: ViewSettings | null, compact = false) => {
    const disabled = !targetView;
    const toolButtons: { tool: DrawingTool; icon: typeof Pointer; label: string; filled?: boolean }[] = [
      { tool: 'select', icon: Pointer, label: 'Selecionar' },
      { tool: 'pen', icon: Pen, label: 'Desenhar' },
      { tool: 'eraser', icon: Eraser, label: 'Borracha' },
      { tool: 'line', icon: Minus, label: 'Linha' },
      { tool: 'circle', icon: Circle, label: 'C\u00edrculo' },
      { tool: 'circle-filled', icon: Circle, label: 'Preenchido', filled: true },
      { tool: 'text', icon: Type, label: 'Texto' },
      { tool: 'ruler', icon: Ruler, label: 'R\u00e9gua' },
    ];

    return (
      <div className={`flex items-center gap-1 ${compact ? 'flex-wrap' : ''}`}>
        {toolButtons.map(({ tool, icon: Icon, label, filled }) => (
          <Button
            key={tool}
            variant="ghost"
            size="icon"
            onClick={() => targetView && updateViewSetting(targetView, 'drawingTool', tool)}
            disabled={disabled}
            className={`h-8 w-8 transition-all ${settings?.drawingTool === tool ? 'bg-rose-500/20 text-rose-500 dark:text-rose-400 ring-1 ring-rose-500/50' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700/50'} ${disabled ? 'opacity-40' : ''}`}
            title={label}
            data-testid={`button-tool-${tool}`}
          >
            <Icon className={`w-4 h-4 ${filled ? 'fill-current' : ''}`} />
          </Button>
        ))}

        <div className="w-px h-6 bg-gray-300 dark:bg-slate-700 mx-1" />

        <Button variant="ghost" size="icon" onClick={() => targetView && canvasHandleRefs.current[targetView]?.undo()} disabled={disabled || !historyState[targetView!]?.canUndo} className="h-8 w-8 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700/50" title="Desfazer (Ctrl+Z)" data-testid="button-undo">
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => targetView && canvasHandleRefs.current[targetView]?.redo()} disabled={disabled || !historyState[targetView!]?.canRedo} className="h-8 w-8 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700/50" title="Refazer (Ctrl+Y)" data-testid="button-redo">
          <Redo2 className="w-4 h-4" />
        </Button>

        {targetView && settings && settings.drawingTool !== 'select' && (
          <>
            <div className="w-px h-6 bg-gray-300 dark:bg-slate-700 mx-1" />
            <input
              type="color"
              value={settings.drawingColor || '#ff0000'}
              onChange={(e) => targetView && updateViewSetting(targetView, 'drawingColor', e.target.value)}
              className="w-7 h-7 cursor-pointer rounded bg-transparent border border-gray-300 dark:border-slate-600"
              title="Cor"
              data-testid="input-drawing-color"
            />
            <input
              type="range" min="1" max="20" step="1"
              value={settings.drawingSize || 3}
              onChange={(e) => targetView && updateViewSetting(targetView, 'drawingSize', parseInt(e.target.value))}
              className="w-16 accent-rose-500"
              title="Espessura"
              data-testid="input-drawing-size"
            />
            {['circle', 'circle-filled'].includes(settings.drawingTool || '') && (
              <select
                value={settings.fillTexture || 'none'}
                onChange={(e) => targetView && updateViewSetting(targetView, 'fillTexture', e.target.value as any)}
                className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded px-2 py-1 text-xs text-gray-900 dark:text-white"
                data-testid="select-fill-texture"
              >
                <option value="none">Nenhum</option>
                <option value="solid">S\u00f3lido</option>
                <option value="pattern">Hachura</option>
              </select>
            )}
          </>
        )}

        {/* Active tool indicator */}
        {targetView && settings && (
          <span className="text-[10px] text-slate-500 ml-2 font-mono">
            {TOOL_LABELS[settings.drawingTool] || settings.drawingTool}
          </span>
        )}
      </div>
    );
  };

  const renderCanvasCard = (viewType: ViewType, isFullscreen = false) => {
    const isSelected = selectedViews[viewType];
    const isActive = activeView === viewType || isFullscreen;
    const settings = viewSettings[viewType];
    const colors = VIEW_COLORS[viewType];

    return (
      <div
        key={viewType}
        className={`relative ${isFullscreen ? 'w-full h-full' : ''} rounded-lg overflow-hidden transition-all group/card ${isActive && !isFullscreen
          ? 'ring-2 ring-rose-500/70 ring-offset-2 ring-offset-gray-100 dark:ring-offset-slate-950'
          : isFullscreen ? '' : 'border border-gray-300 dark:border-slate-700/50 hover:border-gray-400 dark:hover:border-slate-500/70'
          }`}
        onClick={() => !isFullscreen && setActiveView(viewType)}
        data-testid={`card-${viewType}${isFullscreen ? '-fullscreen' : ''}`}
      >
        {/* Hover-only action buttons (top-left) */}
        <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); toggleViewSelection(viewType); }}
            className={`w-7 h-7 rounded flex items-center justify-center transition-all ${isSelected
              ? 'bg-emerald-500 text-white'
              : 'bg-black/50 backdrop-blur-sm text-white/70 hover:bg-black/70 hover:text-white'
              }`}
            data-testid={`checkbox-${viewType}`}
            title="Selecionar para relat\u00f3rio"
          >
            {isSelected && <Check className="w-4 h-4" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleCaptureSingleView(viewType); }}
            className={`w-7 h-7 rounded flex items-center justify-center transition-all ${colors.bg}/80 hover:${colors.bg} text-white backdrop-blur-sm`}
            title="Capturar"
            data-testid={`button-capture-${viewType}`}
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleExportView(viewType); }}
            className="w-7 h-7 rounded flex items-center justify-center transition-all bg-black/50 backdrop-blur-sm text-white/70 hover:bg-black/70 hover:text-white"
            title="Exportar PDF"
            data-testid={`button-export-${viewType}`}
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Colored view label (top-right) — always visible */}
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5">
          <div className={`bg-black/60 backdrop-blur-sm ${colors.border} border px-2 py-1 rounded text-xs font-mono ${colors.text} select-none`}>
            {VIEW_LABELS[viewType]}
          </div>
          {!isFullscreen && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveView(viewType);
                setFullscreenView(viewType);
              }}
              className="w-6 h-6 rounded flex items-center justify-center transition-all bg-black/50 backdrop-blur-sm text-white/70 hover:bg-black/70 hover:text-white opacity-0 group-hover/card:opacity-100"
              title="Tela cheia (Esc para sair)"
              data-testid={`button-fullscreen-${viewType}`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Selected indicator badge */}
        {isSelected && !isFullscreen && (
          <div className="absolute bottom-2 right-2 z-20 bg-emerald-500/90 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-0.5 rounded">
            SELECIONADA
          </div>
        )}

        <div className={`${isFullscreen ? 'h-full' : 'h-full'} w-full bg-white dark:bg-slate-900`}>
          <Canvas2D
            ref={(handle) => { canvasHandleRefs.current[viewType] = handle; }}
            viewType={viewType}
            zoomLevel={1}
            editMode={isActive}
            drawingTool={isActive ? settings.drawingTool : 'select'}
            drawingColor={settings.drawingColor}
            drawingSize={settings.drawingSize}
            drawingData={settings.drawingData}
            onDrawingChange={(data) => updateViewSetting(viewType, 'drawingData', data)}
            fillTexture={isActive ? settings.fillTexture : 'none'}
            onCanvasRef={setCanvasRef(viewType)}
            onHistoryChange={(canUndo, canRedo) => {
              setHistoryState(prev => ({ ...prev, [viewType]: { canUndo, canRedo } }));
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950 text-gray-900 dark:text-white flex flex-col transition-colors">
      <AppSidebar />

      <main className="flex-1 ml-16 flex flex-col">
        {/* Top bar — title + back */}
        <div className="h-12 border-b border-gray-200 dark:border-slate-800 flex items-center px-4 gap-3 bg-white dark:bg-slate-900/80 backdrop-blur-sm shadow-sm dark:shadow-none">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation('/3d')}
            className="h-8 w-8 text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700/50"
            data-testid="button-back-3d"
            title="Voltar ao 3D"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">2D</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Vistas Anatômicas</span>
          </div>
          <div className="flex-1" />
          <Button
            onClick={handleSendToReport}
            disabled={selectedCount === 0}
            size="sm"
            className={`h-8 px-4 text-xs font-medium transition-all ${selectedCount > 0
              ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-500/20'
              : 'bg-gray-200 dark:bg-slate-800 text-gray-400 dark:text-slate-500 cursor-not-allowed'
              }`}
            data-testid="button-send-to-report"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Enviar{selectedCount > 0 ? ` ${selectedCount}` : ''} ao Relatório
          </Button>
        </div>

        {/* Toolbar */}
        <div className="h-11 border-b border-gray-200 dark:border-slate-800 flex items-center px-4 bg-gray-50 dark:bg-slate-900/50">
          {renderToolbar(activeView, currentSettings)}
        </div>

        {/* Canvas grid */}
        <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-1 p-1">
          {VIEW_TYPES.map((viewType) => renderCanvasCard(viewType))}
        </div>
      </main>

      {fullscreenView && (
        <div className="fixed inset-0 z-50 bg-gray-100 dark:bg-slate-950 flex flex-col" data-testid="fullscreen-overlay">
          <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className={`bg-black/60 backdrop-blur-sm ${VIEW_COLORS[fullscreenView].border} border px-2 py-1 rounded text-sm font-mono ${VIEW_COLORS[fullscreenView].text} flex items-center gap-2`}>
                <Maximize2 className="w-4 h-4" />
                {VIEW_LABELS[fullscreenView]}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">ESC para sair</span>
            </div>

            <div className="flex items-center gap-2">
              {renderToolbar(fullscreenView, viewSettings[fullscreenView], true)}
              <div className="w-px h-6 bg-gray-300 dark:bg-slate-700 mx-1" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFullscreenView(null)}
                className="h-8 w-8 text-gray-400 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10"
                title="Fechar (Esc)"
                data-testid="button-close-fullscreen"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 p-2">
            {renderCanvasCard(fullscreenView, true)}
          </div>
        </div>
      )}
    </div>
  );
}
