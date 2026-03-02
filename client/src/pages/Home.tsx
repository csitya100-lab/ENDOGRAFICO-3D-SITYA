import { useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'sonner';
import { Uterus3D, Uterus3DRef } from '@/components/Uterus3D';
import { AnatomyPanel } from '@/components/AnatomyPanel';
import { useLesionStore, Severity, Lesion } from '@/lib/lesionStore';
import { useReportStore } from '@/lib/reportStore';
import { Button } from '@/components/ui/button';
import { Circle, RotateCcw, Settings2, FileText, Download, Camera, Share2, MousePointer2, Crosshair, X } from 'lucide-react';
import { export3DModelAsHtml } from '@/lib/export3DHtml';
import { getAnatomyLabel } from '@/lib/anatomyStore';
import { saveCaseToDb, isSupabaseConfigured } from '@/lib/caseDb';
import AppLayout from '@/components/AppLayout';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ExamInfo {
  patient: string;
  date: string;
  type: string;
}

export default function Home() {
  const [severity, setSeverity] = useState<Severity>('superficial');
  const [interactionMode, setInteractionMode] = useState<'navigate' | 'add'>('add');
  const [markerSize, setMarkerSize] = useState(0.18);
  const [markerColor, setMarkerColor] = useState<string | undefined>(undefined);
  const { lesions } = useLesionStore();
  const [examInfo, setExamInfo] = useState<ExamInfo>({
    patient: 'Paciente A',
    date: new Date().toLocaleDateString('pt-BR'),
    type: 'Mapeamento EndoMapper',
  });
  const [examPatientId, setExamPatientId] = useState('');
  const uterusRef = useRef<Uterus3DRef>(null);
  const [, setLocation] = useLocation();

  const handleClearLesions = () => {
    const savedLesions = [...lesions];
    uterusRef.current?.clearLesions();
    toast('Todas as lesões foram removidas', {
      action: {
        label: 'Desfazer',
        onClick: () => {
          savedLesions.forEach(l => useLesionStore.getState().addLesion(l));
          toast.success('Lesões restauradas');
        },
      },
      duration: 5000,
    });
  };

  const [isExporting, setIsExporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveAndShare = async () => {
    if (lesions.length === 0) {
      toast.warning('Adicione pelo menos uma lesão antes de salvar.');
      return;
    }
    if (!isSupabaseConfigured()) {
      toast.error('Supabase não está configurado. Configure as variáveis de ambiente.');
      return;
    }
    setIsSaving(true);
    try {
      const caseId = await saveCaseToDb({
        patient_name: examInfo.patient,
        exam_date: examInfo.date,
        lesions: lesions,
      });
      const shareUrl = `${window.location.origin}/view/${caseId}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Caso salvo! Link copiado para a área de transferência.', { description: shareUrl });
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar o caso. Verifique a configuração do Supabase.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportHtml = async () => {
    if (lesions.length === 0) {
      toast.warning('Adicione pelo menos uma lesão antes de exportar.');
      return;
    }
    setIsExporting(true);
    try {
      await export3DModelAsHtml(lesions);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao exportar o modelo 3D. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  const { 
    draftImages2D, 
    draftImages3D,
    createReport, 
    clearDraftImages2D, 
    clearDraftImages3D,
    addDraftImage3D,
    removeDraftImage3D
  } = useReportStore();

  const handleCapture3D = () => {
    const imageData = uterusRef.current?.captureScreenshot();
    if (imageData) {
      addDraftImage3D(imageData);
      toast.success('Captura 3D adicionada!', { description: `${draftImages3D.length + 1} capturas no total` });
    } else {
      toast.error('Erro ao capturar a imagem. Tente novamente.');
    }
  };

  const handleGenerateReport = () => {
    uterusRef.current?.captureAllViews();
    
    const currentImages2D = useReportStore.getState().draftImages2D;
    const hasAny2D = currentImages2D['sagittal-avf'] || currentImages2D['sagittal-rvf'] || currentImages2D['coronal'] || currentImages2D['posterior'];
    const hasAny3D = draftImages3D.length > 0;
    
    if (!hasAny2D && !hasAny3D) {
      const proceed = confirm('Nenhuma imagem foi capturada. Deseja continuar mesmo assim?');
      if (!proceed) return;
    }

    const reportId = createReport({
      patientName: examInfo.patient,
      patientId: examPatientId || '',
      examDate: examInfo.date,
      examType: 'Mapeamento EndoMapper',
      images2D: {
        sagittal: currentImages2D['sagittal-avf'] || currentImages2D['sagittal-rvf'] || "",
        coronal: currentImages2D['coronal'] || "",
        posterior: currentImages2D['posterior'] || "",
      },
      imageNotes: {
        sagittal: "",
        coronal: "",
        posterior: "",
      },
      images3D: draftImages3D,
      lesions: lesions.map((l, idx) => ({
        id: l.id,
        name: `Lesão ${String.fromCharCode(65 + idx)}`,
        location: l.location ? getAnatomyLabel(l.location) : (l.severity === 'superficial' ? 'Região Superficial' : 'Região Profunda'),
        severity: l.severity,
        position: l.position,
        comment: l.observacoes
      })),
    });

    clearDraftImages2D();
    clearDraftImages3D();
    setLocation(`/relatorio/${reportId}`);
  };

  const getLesionCount = (sev: Severity) => lesions.filter(l => l.severity === sev).length;
  const lesionCount = lesions.length;

  return (
    <AppLayout>
      <div className="flex flex-col h-full overflow-hidden">
        <header className="flex-none h-16 border-b border-slate-200 bg-white shadow-sm px-6 flex items-center justify-between z-20 dark:bg-slate-900 dark:border-slate-700 dark:shadow-none">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
                 <span className="text-white font-bold text-sm">3D</span>
               </div>
               <h1 className="text-xl font-bold tracking-tight text-slate-900 font-sans dark:text-white">
                 Endo<span className="text-rose-600 dark:text-rose-400">Mapper</span>
               </h1>
            </div>

            <div className="h-8 w-px bg-slate-200 hidden sm:block dark:bg-slate-700" />

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
              <button
                onClick={() => setInteractionMode('navigate')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                  interactionMode === 'navigate' 
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200 dark:bg-slate-700 dark:text-white dark:border-slate-600' 
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700'
                }`}
                data-testid="button-mode-navigate"
                aria-label="Modo navegação"
              >
                <MousePointer2 className="w-3.5 h-3.5" />
                Navegar
              </button>
              <button
                onClick={() => setInteractionMode('add')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all ${
                  interactionMode === 'add' 
                    ? 'bg-pink-100 text-pink-700 border border-pink-300 dark:bg-pink-500/20 dark:text-pink-400 dark:border-pink-500/50' 
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700'
                }`}
                data-testid="button-mode-add"
                aria-label="Modo marcação de lesão"
              >
                <Crosshair className="w-3.5 h-3.5" />
                Marcar
              </button>
            </div>

            <div className="h-8 w-px bg-slate-200 hidden sm:block dark:bg-slate-700" />

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
              <button
                onClick={() => setSeverity('superficial')}
                className={`
                  px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all
                  ${severity === 'superficial' 
                    ? 'bg-red-100 text-red-700 border border-red-300 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/50' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700'}
                `}
              >
                <div className={`w-2 h-2 rounded-full ${severity === 'superficial' ? 'bg-red-500' : 'bg-slate-400'}`} />
                Superficial
              </button>
              <button
                onClick={() => setSeverity('deep')}
                className={`
                  px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all
                  ${severity === 'deep' 
                    ? 'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/50' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700'}
                `}
              >
                <div className={`w-2 h-2 rounded-full ${severity === 'deep' ? 'bg-blue-500' : 'bg-slate-400'}`} />
                Profunda
              </button>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-2 bg-slate-100 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
                  <Settings2 className="w-4 h-4" />
                  <span className="text-xs font-medium">Marcador</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-4" align="start">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-2 block dark:text-slate-300">Tamanho: {markerSize.toFixed(2)}</label>
                    <Slider
                      value={[markerSize]}
                      onValueChange={([v]) => setMarkerSize(v)}
                      min={0.08}
                      max={0.5}
                      step={0.02}
                      className="w-full"
                      data-testid="slider-marker-size"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-2 block dark:text-slate-300">Cor personalizada</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={markerColor || '#ef4444'}
                        onChange={(e) => setMarkerColor(e.target.value)}
                        className="w-10 h-8 cursor-pointer rounded border border-slate-300"
                        data-testid="input-marker-color"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMarkerColor(undefined)}
                        className="text-xs h-8"
                        data-testid="button-reset-color"
                      >
                        Usar cor padrão
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 pr-3 border-r border-slate-200 dark:border-slate-700">
              <div className="flex flex-col gap-1">
                <input
                  type="text"
                  value={examInfo.patient}
                  onChange={(e) => setExamInfo(prev => ({ ...prev, patient: e.target.value }))}
                  placeholder="Nome da paciente"
                  className="text-sm font-semibold text-black bg-white border border-slate-200 rounded px-2 py-0.5 w-36 focus:outline-none focus:ring-1 focus:ring-pink-400"
                  data-testid="input-patient-name"
                />
                <input
                  type="text"
                  value={examPatientId}
                  onChange={(e) => setExamPatientId(e.target.value)}
                  placeholder="ID"
                  className="text-xs text-black bg-white border border-slate-200 rounded px-2 py-0.5 w-36 focus:outline-none focus:ring-1 focus:ring-pink-400"
                  data-testid="input-patient-id"
                />
                <input
                  type="text"
                  value={examInfo.date}
                  onChange={(e) => setExamInfo(prev => ({ ...prev, date: e.target.value }))}
                  placeholder="Data do exame"
                  className="text-[11px] text-black bg-white border border-slate-200 rounded px-2 py-0.5 w-36 focus:outline-none focus:ring-1 focus:ring-pink-400"
                  data-testid="input-exam-date"
                />
              </div>
            </div>

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />

            <div className="flex items-center gap-1.5">
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleCapture3D}
                className="text-xs h-8 border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                data-testid="button-capture-3d"
              >
                <Camera className="w-3.5 h-3.5 mr-1" />
                Capturar
              </Button>
              {draftImages3D.length > 0 && (
                <div className="flex items-center gap-1">
                  {draftImages3D.map((img, idx) => (
                    <div key={img.id} className="relative group" data-testid={`capture-thumb-${idx}`}>
                      <img
                        src={img.data}
                        alt={img.label}
                        className="w-8 h-8 rounded border border-slate-300 dark:border-slate-600 object-cover"
                      />
                      <button
                        onClick={() => {
                          removeDraftImage3D(img.id);
                          toast.info(`Captura ${idx + 1} removida`);
                        }}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        data-testid={`button-remove-capture-${idx}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Button 
                size="sm" 
                variant="outline"
                onClick={handleExportHtml}
                disabled={isExporting}
                className="text-xs h-8 border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                data-testid="button-export-3d"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                {isExporting ? '...' : 'Exportar'}
              </Button>

              <Button 
                size="sm" 
                variant="outline"
                onClick={handleSaveAndShare}
                disabled={isSaving}
                className="text-xs h-8 border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                data-testid="button-save-share"
              >
                <Share2 className="w-3.5 h-3.5 mr-1" />
                {isSaving ? '...' : 'Compartilhar'}
              </Button>
            </div>

            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700" />

            <Button 
              size="sm" 
              onClick={handleGenerateReport}
              className="text-xs h-8 bg-rose-600 text-white hover:bg-rose-700"
            >
              <FileText className="w-3.5 h-3.5 mr-1" />
              Relatório
            </Button>

            <Button 
              size="icon" 
              variant="ghost"
              onClick={handleClearLesions}
              className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
              title="Limpar lesões"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <main className="flex-1 relative">
            <Uterus3D 
              ref={uterusRef}
              severity={severity}
              markerSize={markerSize}
              markerColor={markerColor}
              markerType="circle"
              interactionMode={interactionMode}
              onLesionCountChange={() => {}}
              onLesionsUpdate={() => {}}
            />
          </main>

          <aside className="w-64 border-l border-slate-200 bg-white shadow-sm overflow-y-auto dark:bg-slate-900 dark:border-slate-700">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-xs text-slate-600 flex items-center gap-2 font-medium dark:text-slate-300">
                    <Circle className="w-2.5 h-2.5 fill-red-500 text-red-500" />
                    Superficial
                  </span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{getLesionCount('superficial')}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-xs text-slate-600 flex items-center gap-2 font-medium dark:text-slate-300">
                    <Circle className="w-2.5 h-2.5 fill-blue-500 text-blue-500" />
                    Profunda
                  </span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{getLesionCount('deep')}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-xs text-slate-500 font-medium dark:text-slate-400">Total</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{lesionCount}</span>
                </div>
              </div>
            </div>

            <div className="p-4">
              <h3 className="text-xs font-bold text-slate-900 tracking-wide mb-3 dark:text-white">
                ESTRUTURAS ANATÔMICAS
              </h3>
              <AnatomyPanel />
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
