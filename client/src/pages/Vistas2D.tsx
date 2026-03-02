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

  const handleExportView = (viewType: ViewType) => {
    const imgData = captureViewImage(viewType);
    if (imgData) {
      const link = document.createElement("a");
      link.download = `${VIEW_LABELS[viewType].replace(/[^a-zA-Z0-9]/g, '_')}.png`;
      link.href = imgData;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`${VIEW_LABELS[viewType]} exportada com sucesso`);
    }
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
    return (
      <div className={`flex items-center gap-2 ${compact ? 'flex-wrap' : 'gap-3'} bg-white dark:bg-slate-800/50 rounded-lg px-3 py-2 border border-gray-200 dark:border-transparent shadow-sm`}>
        <Button variant="ghost" size="icon" onClick={() => targetView && updateViewSetting(targetView, "drawingTool", "select")} disabled={disabled} className={`h-8 w-8 ${settings?.drawingTool === "select" ? "bg-pink-500/20 text-pink-500 ring-1 ring-pink-500/50" : ""} ${disabled ? "opacity-50" : ""}`} title="Selecionar" data-testid="button-tool-select">
          <Pointer className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => targetView && updateViewSetting(targetView, "drawingTool", "pen")} disabled={disabled} className={`h-8 w-8 ${settings?.drawingTool === "pen" ? "bg-pink-500/20 text-pink-500 ring-1 ring-pink-500/50" : ""} ${disabled ? "opacity-50" : ""}`} title="Desenhar" data-testid="button-tool-pen">
          <Pen className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => targetView && updateViewSetting(targetView, "drawingTool", "eraser")} disabled={disabled} className={`h-8 w-8 ${settings?.drawingTool === "eraser" ? "bg-pink-500/20 text-pink-500 ring-1 ring-pink-500/50" : ""} ${disabled ? "opacity-50" : ""}`} title="Borracha" data-testid="button-tool-eraser">
          <Eraser className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => targetView && updateViewSetting(targetView, "drawingTool", "line")} disabled={disabled} className={`h-8 w-8 ${settings?.drawingTool === "line" ? "bg-pink-500/20 text-pink-500 ring-1 ring-pink-500/50" : ""} ${disabled ? "opacity-50" : ""}`} title="Linha" data-testid="button-tool-line">
          <Minus className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => targetView && updateViewSetting(targetView, "drawingTool", "circle")} disabled={disabled} className={`h-8 w-8 ${settings?.drawingTool === "circle" ? "bg-pink-500/20 text-pink-500 ring-1 ring-pink-500/50" : ""} ${disabled ? "opacity-50" : ""}`} title="Circulo" data-testid="button-tool-circle">
          <Circle className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => targetView && updateViewSetting(targetView, "drawingTool", "circle-filled")} disabled={disabled} className={`h-8 w-8 ${settings?.drawingTool === "circle-filled" ? "bg-pink-500/20 text-pink-500 ring-1 ring-pink-500/50" : ""} ${disabled ? "opacity-50" : ""}`} title="Circulo Preenchido" data-testid="button-tool-circle-filled">
          <Circle className="w-4 h-4 fill-current" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => targetView && updateViewSetting(targetView, "drawingTool", "text")} disabled={disabled} className={`h-8 w-8 ${settings?.drawingTool === "text" ? "bg-pink-500/20 text-pink-500 ring-1 ring-pink-500/50" : ""} ${disabled ? "opacity-50" : ""}`} title="Texto" data-testid="button-tool-text">
          <Type className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => targetView && updateViewSetting(targetView, "drawingTool", "ruler")} disabled={disabled} className={`h-8 w-8 ${settings?.drawingTool === "ruler" ? "bg-pink-500/20 text-pink-500 ring-1 ring-pink-500/50" : ""} ${disabled ? "opacity-50" : ""}`} title="Regua" data-testid="button-tool-ruler">
          <Ruler className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-1 ml-2 border-l border-gray-300 dark:border-slate-700 pl-2">
          <Button variant="ghost" size="icon" onClick={() => targetView && canvasHandleRefs.current[targetView]?.undo()} disabled={disabled || !historyState[targetView!]?.canUndo} className="h-8 w-8" title="Desfazer (Ctrl+Z)" data-testid="button-undo">
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => targetView && canvasHandleRefs.current[targetView]?.redo()} disabled={disabled || !historyState[targetView!]?.canRedo} className="h-8 w-8" title="Refazer (Ctrl+Y)" data-testid="button-redo">
            <Redo2 className="w-4 h-4" />
          </Button>
        </div>

        {targetView && settings && settings.drawingTool !== "select" && (
          <div className="flex items-center gap-2 ml-2 border-l border-gray-300 dark:border-slate-700 pl-3">
            <input
              type="color"
              value={settings.drawingColor || "#ff0000"}
              onChange={(e) => targetView && updateViewSetting(targetView, "drawingColor", e.target.value)}
              className="w-7 h-7 cursor-pointer rounded bg-transparent border-none"
              title="Cor"
              data-testid="input-drawing-color"
            />
            <input
              type="range" min="1" max="20" step="1"
              value={settings.drawingSize || 3}
              onChange={(e) => targetView && updateViewSetting(targetView, "drawingSize", parseInt(e.target.value))}
              className="w-20 accent-pink-500"
              title="Espessura"
              data-testid="input-drawing-size"
            />
            {["circle", "circle-filled"].includes(settings.drawingTool || "") && (
              <select
                value={settings.fillTexture || "none"}
                onChange={(e) => targetView && updateViewSetting(targetView, "fillTexture", e.target.value as any)}
                className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded px-2 py-1 text-xs text-gray-900 dark:text-white"
                data-testid="select-fill-texture"
              >
                <option value="none">Nenhum</option>
                <option value="solid">Sólido</option>
                <option value="pattern">Hachura</option>
              </select>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderCanvasCard = (viewType: ViewType, isFullscreen = false) => {
    const isSelected = selectedViews[viewType];
    const isActive = activeView === viewType || isFullscreen;
    const settings = viewSettings[viewType];

    return (
      <div
        key={viewType}
        className={`relative ${isFullscreen ? 'w-full h-full' : ''} rounded-lg overflow-hidden transition-all ${
          isActive && !isFullscreen
            ? "ring-2 ring-pink-500 ring-offset-2 ring-offset-gray-100 dark:ring-offset-slate-950"
            : isFullscreen ? "" : "border border-gray-300 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-500"
        }`}
        onClick={() => !isFullscreen && setActiveView(viewType)}
        data-testid={`card-${viewType}${isFullscreen ? '-fullscreen' : ''}`}
      >
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); toggleViewSelection(viewType); }}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${
              isSelected
                ? "bg-emerald-500 text-white shadow-lg"
                : "bg-white/90 dark:bg-slate-800/80 text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-300 dark:border-slate-600"
            }`}
            data-testid={`checkbox-${viewType}`}
          >
            {isSelected && <Check className="w-5 h-5" />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleCaptureSingleView(viewType); }}
            className="w-8 h-8 rounded-md flex items-center justify-center transition-all bg-pink-500 hover:bg-pink-600 text-white shadow-lg"
            title="Capturar e adicionar ao relatorio"
            data-testid={`button-capture-${viewType}`}
          >
            <Camera className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleExportView(viewType); }}
            className="w-8 h-8 rounded-md flex items-center justify-center transition-all bg-blue-500 hover:bg-blue-600 text-white shadow-lg"
            title="Exportar imagem PNG"
            data-testid={`button-export-${viewType}`}
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
          <div className="bg-gray-900/80 dark:bg-black/70 px-2 py-1 rounded text-xs font-medium text-white">
            {VIEW_LABELS[viewType]}
          </div>
          {!isFullscreen && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveView(viewType);
                setFullscreenView(viewType);
              }}
              className="w-8 h-8 rounded-md flex items-center justify-center transition-all bg-gray-900/80 dark:bg-black/70 text-white hover:bg-gray-700 dark:hover:bg-slate-600"
              title="Tela cheia"
              data-testid={`button-fullscreen-${viewType}`}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className={`${isFullscreen ? 'h-full' : 'h-full'} w-full bg-white`}>
          <Canvas2D
            ref={(handle) => { canvasHandleRefs.current[viewType] = handle; }}
            viewType={viewType}
            zoomLevel={1}
            editMode={isActive}
            drawingTool={isActive ? settings.drawingTool : "select"}
            drawingColor={settings.drawingColor}
            drawingSize={settings.drawingSize}
            drawingData={settings.drawingData}
            onDrawingChange={(data) => updateViewSetting(viewType, "drawingData", data)}
            fillTexture={isActive ? settings.fillTexture : "none"}
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

      <main className="flex-1 ml-16 p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/3d")}
              className="h-8 w-8 text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white"
              data-testid="button-back-3d"
              title="Voltar ao 3D"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>

          {renderToolbar(activeView, currentSettings)}
        </div>

        <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-3">
          {VIEW_TYPES.map((viewType) => renderCanvasCard(viewType))}
        </div>

        <div className="mt-3 flex justify-center">
          <Button
            onClick={handleSendToReport}
            disabled={selectedCount === 0}
            size="sm"
            className={`h-9 px-5 text-xs font-medium transition-all ${
              selectedCount > 0
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : "bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500 cursor-not-allowed"
            }`}
            data-testid="button-send-to-report"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Enviar{selectedCount > 0 ? ` ${selectedCount}` : ""} ao Relatório
          </Button>
        </div>
      </main>

      {fullscreenView && (
        <div className="fixed inset-0 z-50 bg-gray-100 dark:bg-slate-950 flex flex-col" data-testid="fullscreen-overlay">
          <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Maximize2 className="w-5 h-5 text-pink-500" />
                {VIEW_LABELS[fullscreenView]}
              </h2>
              <span className="text-xs text-gray-400 dark:text-slate-500">Pressione Esc para sair</span>
            </div>

            <div className="flex items-center gap-3">
              {renderToolbar(fullscreenView, viewSettings[fullscreenView], true)}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFullscreenView(null)}
                className="h-9 w-9 ml-2 text-gray-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-500/10"
                title="Fechar tela cheia (Esc)"
                data-testid="button-close-fullscreen"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 p-4">
            {renderCanvasCard(fullscreenView, true)}
          </div>
        </div>
      )}
    </div>
  );
}
