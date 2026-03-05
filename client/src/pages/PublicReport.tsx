import { useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ChevronLeft, ChevronRight, X, Printer, FileDown, FileText, Trash2 } from "lucide-react";
import { useReportStore, Report } from "@/lib/reportStore";
import { exportToPDF, exportToWord } from "@/lib/reportExporter";
import { Severity } from "@/lib/lesionStore";
import { processGLBModel } from '@/lib/meshAnalyzer';
import { createProgrammaticAnatomy } from '@/lib/anatomyCreator';
import { AnatomyMeshesMap } from '@/lib/anatomyCreator';

const SEVERITY_COLORS: Record<
  Severity,
  { hex: string; label: string; bg: string; text: string; border: string }
> = {
  superficial: {
    hex: "#ec4899",
    label: "Superficial",
    bg: "bg-pink-100",
    text: "text-pink-700",
    border: "border-pink-300",
  },
  deep: {
    hex: "#eab308",
    label: "Profunda",
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    border: "border-yellow-300",
  },
};

export default function PublicReport() {
  const { id } = useParams<{ id: string }>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const { getReport, hydrated, removeReportImage3D } = useReportStore();

  useEffect(() => {
    if (!hydrated) return;

    if (!id) {
      setLoading(false);
      return;
    }

    const storedReport = getReport(id);
    if (storedReport) {
      setReport(storedReport);
    }
    setLoading(false);
  }, [id, getReport, hydrated]);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || !report) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.FogExp2(0x0f172a, 0.02);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 0, 5);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    } catch (e) {
      return;
    }
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.minDistance = 2;
    controls.maxDistance = 10;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-5, 0, 5);
    scene.add(fillLight);

    const pinkLight = new THREE.PointLight(0xffd1dc, 0.5, 20);
    pinkLight.position.set(0, 2, 5);
    scene.add(pinkLight);

    const rimLight = new THREE.PointLight(0x8b5cf6, 0.5, 20);
    rimLight.position.set(0, 2, -5);
    scene.add(rimLight);

    let animationId: number;

    const loader = new GLTFLoader();
    loader.load(
      "/model.glb",
      (gltf) => {
        const model = gltf.scene;

        const anatomyGroup = new THREE.Group();
        const anatomyMeshes: AnatomyMeshesMap = {
          uterus: [], cervix: [], ovaries: [], fallopianTubes: [],
          uterosacrals: [], roundLigaments: [], ureters: [],
          bladder: [], rectum: [], intestine: [],
        };

        processGLBModel(model, anatomyGroup, anatomyMeshes, { isIOS: false, isMobile: false });
        createProgrammaticAnatomy(anatomyGroup, anatomyMeshes);

        scene.add(anatomyGroup);

        report.lesions.forEach((lesion) => {
          const color = SEVERITY_COLORS[lesion.severity].hex;
          const geometry = new THREE.SphereGeometry(0.12, 32, 32);
          const material = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.3,
          });
          const sphere = new THREE.Mesh(geometry, material);
          sphere.position.set(
            lesion.position.x,
            lesion.position.y,
            lesion.position.z,
          );
          anatomyGroup.add(sphere);
        });
      },
      undefined,
      (error) => {
        const geometry = new THREE.SphereGeometry(1, 32, 32);
        const material = new THREE.MeshStandardMaterial({ color: 0xffb6c1 });
        const sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);

        report.lesions.forEach((lesion) => {
          const color = SEVERITY_COLORS[lesion.severity].hex;
          const markerGeometry = new THREE.SphereGeometry(0.12, 32, 32);
          const markerMaterial = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.3,
          });
          const marker = new THREE.Mesh(markerGeometry, markerMaterial);
          marker.position.set(
            lesion.position.x,
            lesion.position.y,
            lesion.position.z,
          );
          scene.add(marker);
        });
      },
    );

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
      controls.dispose();
      renderer.dispose();
    };
  }, [report]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-800">Carregando relatório...</div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4">
        <div className="text-slate-800 text-xl font-medium">
          Relatório não encontrado
        </div>
        <p className="text-slate-700 text-sm">
          O relatório com ID "{id}" não existe ou foi removido.
        </p>
        <a
          href="/"
          className="text-pink-600 hover:text-pink-700 text-sm underline"
        >
          Voltar para o início
        </a>
      </div>
    );
  }

  const images3D = report.images3D || [];

  const nextPhoto = () => {
    if (images3D.length > 0) {
      setPhotoIndex((prev) => (prev + 1) % images3D.length);
    }
  };

  const prevPhoto = () => {
    if (images3D.length > 0) {
      setPhotoIndex(
        (prev) => (prev - 1 + images3D.length) % images3D.length,
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-xs text-slate-800 uppercase tracking-wide">
                Paciente
              </p>
              <p
                className="text-lg font-semibold text-slate-900"
                data-testid="text-patient-name"
              >
                {report.patientName}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-800 uppercase tracking-wide">
                Data do Exame
              </p>
              <p
                className="text-lg font-semibold text-slate-900"
                data-testid="text-exam-date"
              >
                {report.examDate}
              </p>
            </div>
            {report.patientId && (
              <div>
                <p className="text-xs text-slate-800 uppercase tracking-wide">
                  ID
                </p>
                <p
                  className="text-lg font-semibold text-slate-900"
                  data-testid="text-patient-id"
                >
                  {report.patientId}
                </p>
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="no-print mt-2 flex items-center gap-2 justify-end flex-wrap">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                data-testid="button-print-report"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
              <button
                onClick={async () => {
                  setExporting("pdf");
                  try { await exportToPDF(report); } catch (e) { console.error(e); }
                  setExporting(null);
                }}
                disabled={exporting === "pdf"}
                className="flex items-center gap-1.5 bg-pink-500 hover:bg-pink-600 disabled:opacity-60 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                data-testid="button-export-pdf"
              >
                <FileDown className="w-4 h-4" />
                {exporting === "pdf" ? "Gerando..." : "PDF"}
              </button>
              <button
                onClick={async () => {
                  setExporting("word");
                  try { await exportToWord(report); } catch (e) { console.error(e); }
                  setExporting(null);
                }}
                disabled={exporting === "word"}
                className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white rounded-lg px-3 py-2 text-sm font-medium transition-colors"
                data-testid="button-export-word"
              >
                <FileText className="w-4 h-4" />
                {exporting === "word" ? "Gerando..." : "Word"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">
                  Modelo 3D
                </h2>
                <p className="text-xs text-slate-800 no-print">
                  Arraste para rotacionar, scroll para zoom
                </p>
              </div>
              <div
                ref={containerRef}
                className="aspect-square lg:aspect-[4/3] w-full bg-slate-50 print:hidden"
              >
                <canvas
                  ref={canvasRef}
                  className="w-full h-full"
                  data-testid="canvas-3d-model"
                />
              </div>
              <div className="hidden print:block p-8 text-center text-slate-500 text-sm border border-slate-200 rounded">
                Modelo 3D interativo - disponível na versão digital
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">
                  Vistas 2D
                </h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-3">
                  {(["sagittal-avf", "sagittal-rl", "coronal", "posterior"] as const).map(
                    (view) => {
                      const viewLabels: Record<string, string> = {
                        "sagittal-avf": "Sagittal (AVF)",
                        "sagittal-rl": "Sagittal (RL)",
                        coronal: "Coronal",
                        posterior: "Posterior",
                      };
                      return (
                        <div
                          key={view}
                          className="aspect-square bg-slate-100 rounded-lg overflow-hidden relative group"
                        >
                          {report.images2D[view] ? (
                            <img
                              src={report.images2D[view]}
                              alt={viewLabels[view]}
                              className="w-full h-full object-cover"
                              data-testid={`img-2d-${view}`}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-xs text-slate-400">
                                {viewLabels[view]}
                              </span>
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 py-1 px-2">
                            <span className="text-[10px] text-white">
                              {viewLabels[view]}
                            </span>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-700">
                  Capturas 3D
                </h2>
              </div>
              <div className="p-4">
                {images3D.length > 0 ? (
                  <div className="relative">
                    <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden">
                      <img
                        src={images3D[photoIndex]?.data}
                        alt={images3D[photoIndex]?.label || `Captura ${photoIndex + 1}`}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setExpandedPhoto(images3D[photoIndex]?.data)}
                        data-testid={`img-3d-capture-${photoIndex}`}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <span className="text-xs text-slate-600">
                        {images3D[photoIndex]?.label}
                      </span>
                      <button
                        onClick={() => {
                          const img = images3D[photoIndex];
                          if (img && id) {
                            removeReportImage3D(id, img.id);
                            setReport((prev) => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                images3D: prev.images3D.filter((i) => i.id !== img.id),
                              };
                            });
                            if (photoIndex >= images3D.length - 1) {
                              setPhotoIndex(Math.max(0, photoIndex - 1));
                            }
                          }
                        }}
                        className="no-print w-6 h-6 bg-red-100 hover:bg-red-200 text-red-500 hover:text-red-700 rounded-full flex items-center justify-center transition-colors"
                        title="Excluir captura"
                        data-testid={`button-delete-3d-${photoIndex}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {images3D.length > 1 && (
                      <>
                        <button
                          onClick={prevPhoto}
                          className="no-print absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors"
                          data-testid="button-prev-3d"
                        >
                          <ChevronLeft className="w-5 h-5 text-slate-700" />
                        </button>
                        <button
                          onClick={nextPhoto}
                          className="no-print absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors"
                          data-testid="button-next-3d"
                        >
                          <ChevronRight className="w-5 h-5 text-slate-700" />
                        </button>
                      </>
                    )}
                    <div className="no-print flex justify-center gap-1.5 mt-3">
                      {images3D.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setPhotoIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-colors ${idx === photoIndex ? "bg-pink-500" : "bg-slate-300"}`}
                          data-testid={`button-3d-dot-${idx}`}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center">
                    <span className="text-sm text-slate-700">
                      Nenhuma captura 3D
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">
              Resumo das Lesões
            </h2>
          </div>
          <div className="p-4">
            {report.lesions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {report.lesions.map((lesion, idx) => {
                  const severity = SEVERITY_COLORS[lesion.severity];
                  const updateLesionField = (field: 'name' | 'location' | 'comment', value: string) => {
                    setReport(prev => {
                      if (!prev) return prev;
                      const updated = { ...prev, lesions: prev.lesions.map((l, i) => i === idx ? { ...l, [field]: value } : l) };
                      return updated;
                    });
                  };
                  return (
                    <div
                      key={lesion.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${severity.bg} ${severity.border}`}
                      data-testid={`card-lesion-${lesion.id}`}
                    >
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: severity.hex }}
                      />
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <input
                          type="text"
                          value={lesion.name}
                          onChange={(e) => updateLesionField('name', e.target.value)}
                          className={`text-sm font-medium ${severity.text} bg-transparent border border-transparent hover:border-slate-300 focus:border-slate-400 rounded px-1 py-0.5 w-full focus:outline-none`}
                          data-testid={`input-lesion-name-${lesion.id}`}
                        />
                        <input
                          type="text"
                          value={lesion.location}
                          onChange={(e) => updateLesionField('location', e.target.value)}
                          className="text-xs text-slate-800 bg-transparent border border-transparent hover:border-slate-300 focus:border-slate-400 rounded px-1 py-0.5 w-full focus:outline-none"
                          data-testid={`input-lesion-location-${lesion.id}`}
                        />
                        <textarea
                          value={lesion.comment || ''}
                          onChange={(e) => updateLesionField('comment', e.target.value)}
                          placeholder="Adicionar comentário..."
                          rows={2}
                          className="text-xs text-slate-700 bg-transparent border border-dashed border-slate-300 hover:border-slate-400 focus:border-slate-400 rounded px-1 py-0.5 w-full focus:outline-none resize-none placeholder:text-slate-400"
                          data-testid={`input-lesion-comment-${lesion.id}`}
                        />
                      </div>
                      <span
                        className={`text-xs font-medium ${severity.text} px-2 py-0.5 rounded-full ${severity.bg} self-start mt-1`}
                      >
                        {severity.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-slate-800 text-center py-4">
                Nenhuma lesão registrada
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-center gap-2">
          <div className="flex items-center gap-4 text-xs text-slate-800">
            <div className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: SEVERITY_COLORS.superficial.hex }}
              />
              <span>Superficial</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: SEVERITY_COLORS.deep.hex }}
              />
              <span>Profunda</span>
            </div>
          </div>
        </div>
      </main>

      {expandedPhoto && (
        <div
          className="no-print fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setExpandedPhoto(null)}
          data-testid="modal-expanded-photo"
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
            onClick={() => setExpandedPhoto(null)}
            data-testid="button-close-expanded"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          <img
            src={expandedPhoto}
            alt="Foto expandida"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
