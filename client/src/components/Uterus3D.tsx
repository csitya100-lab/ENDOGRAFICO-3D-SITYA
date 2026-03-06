import { useEffect, useRef, forwardRef, useImperativeHandle, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useLesionStore, Lesion, Severity, MarkerType } from '@/lib/lesionStore';
import { useReportStore } from '@/lib/reportStore';
import { useAnatomyStore, AnatomyElement } from '@/lib/anatomyStore';
import { Camera } from 'lucide-react';
import { toast } from 'sonner';
import { isIOS, isMobile, MODEL_LOAD_TIMEOUT, getCachedModel, cacheModel } from '@/lib/modelLoader';
import { createProgrammaticAnatomy } from '@/lib/anatomyCreator';
import { processGLBModel } from '@/lib/meshAnalyzer';

interface Uterus3DProps {
  severity?: Severity;
  markerSize?: number;
  markerColor?: string;
  markerType?: MarkerType;
  onLesionCountChange?: (count: number) => void;
  onLesionsUpdate?: (lesions: Lesion[]) => void;
  readOnly?: boolean;
  interactionMode?: 'add' | 'edit' | 'navigate';
  selectedLesionId?: string | null;
  onSelectLesion?: (id: string | null) => void;
}

export interface Uterus3DRef {
  addTestLesion: () => void;
  clearLesions: () => void;
  captureAllViews: () => void;
  captureScreenshot: () => string | null;
}

const COLORS: Record<string, number> = {
  superficial: 0xef4444,
  deep: 0x3b82f6
};

export const Uterus3D = forwardRef<Uterus3DRef, Uterus3DProps>(({
  severity = 'superficial',
  markerSize = 0.18,
  markerColor,
  markerType = 'circle',
  onLesionCountChange,
  onLesionsUpdate,
  readOnly = false,
  interactionMode = 'add',
  selectedLesionId = null,
  onSelectLesion
}, ref) => {
  const [loadingState, setLoadingState] = useState<'loading' | 'loaded' | 'error' | 'fallback'>('loading');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const readOnlyRef = useRef(readOnly);

  useEffect(() => {
    readOnlyRef.current = readOnly;
  }, [readOnly]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewMainRef = useRef<HTMLDivElement>(null);
  const viewSagittalRef = useRef<HTMLDivElement>(null);
  const viewCoronalRef = useRef<HTMLDivElement>(null);
  const viewPosteriorRef = useRef<HTMLDivElement>(null);
  const viewSagittalRLRef = useRef<HTMLDivElement>(null);

  const { lesions, addLesion, updateLesion, removeLesion, clearLesions } = useLesionStore();
  const { setDraftImage } = useReportStore();

  const currentSeverityRef = useRef(severity);
  const currentMarkerSizeRef = useRef(markerSize);
  const currentMarkerColorRef = useRef(markerColor);
  const currentMarkerTypeRef = useRef(markerType);
  const viewsRef = useRef<any[]>([]);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const markerGroupsRef = useRef<{ [key: number]: THREE.Group }>({});
  const sceneRef = useRef<THREE.Scene | null>(null);
  const anatomyGroupRef = useRef<THREE.Group | null>(null);
  const updateMarkersRef = useRef<(() => void) | null>(null);
  const anatomyMeshesRef = useRef<Record<AnatomyElement, THREE.Object3D[]>>({
    uterus: [],
    cervix: [],
    ovaries: [],
    fallopianTubes: [],
    uterosacrals: [],
    roundLigaments: [],
    ureters: [],
    bladder: [],
    rectum: [],
    intestine: [],
  });

  const anatomyVisibility = useAnatomyStore((state) => state.visibility);

  const dragStateRef = useRef<{
    isDragging: boolean;
    lesionId: string | null;
    viewIdx: number;
  }>({ isDragging: false, lesionId: null, viewIdx: 0 });

  // Track pointer state for click vs drag
  const pointerStateRef = useRef({
    startX: 0,
    startY: 0,
    isClickPending: false
  });

  // Map lesion IDs to their marker objects for efficient add/remove/update
  const markersByLesionRef = useRef<{ [lesionId: string]: THREE.Object3D[] }>({});

  // Track previous lesions for smart diffing
  const prevLesionsRef = useRef<Lesion[]>([]);

  // Cached geometries and materials for reuse
  const geometryCacheRef = useRef<{ [key: string]: THREE.BufferGeometry }>({});
  const materialCacheRef = useRef<{ [key: string]: THREE.Material }>({});

  useEffect(() => {
    currentSeverityRef.current = severity;
  }, [severity]);

  useEffect(() => {
    currentMarkerSizeRef.current = markerSize;
  }, [markerSize]);

  useEffect(() => {
    currentMarkerColorRef.current = markerColor;
  }, [markerColor]);

  useEffect(() => {
    currentMarkerTypeRef.current = markerType;
  }, [markerType]);

  useEffect(() => {
    onLesionCountChange?.(lesions.length);
    onLesionsUpdate?.([...lesions]);
    if (updateMarkersRef.current) {
      updateMarkersRef.current();
    }
  }, [lesions, onLesionCountChange, onLesionsUpdate]);

  // Update visibility of anatomy elements based on store
  useEffect(() => {
    Object.entries(anatomyVisibility).forEach(([element, visible]) => {
      const meshes = anatomyMeshesRef.current[element as AnatomyElement];
      if (meshes) {
        meshes.forEach((mesh) => {
          mesh.visible = visible;
        });
      }
    });
  }, [anatomyVisibility]);

  useImperativeHandle(ref, () => ({
    addTestLesion: () => {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = 1.5;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = (r * Math.sin(phi) * Math.sin(theta));
      const z = r * Math.cos(phi);

      addLesion({
        position: { x, y, z },
        severity: currentSeverityRef.current
      });
    },
    clearLesions: () => {
      clearLesions();
    },
    captureAllViews: () => {
      captureViewScreenshot(1, 'sagittal-avf');
      captureViewScreenshot(2, 'coronal');
      captureViewScreenshot(3, 'posterior');
      captureViewScreenshot(4, 'sagittal-rl');
    },
    captureScreenshot: () => {
      const renderer = rendererRef.current;
      const scene = sceneRef.current;
      const mainView = viewsRef.current[0];

      if (!renderer || !scene || !mainView || !mainView.camera) {
        console.warn('Screenshot: renderer, scene ou camera não inicializado');
        return null;
      }

      try {
        const targetSize = 512;
        const renderTarget = new THREE.WebGLRenderTarget(targetSize, targetSize, {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat,
        });

        const originalScissorTest = renderer.getScissorTest();
        const originalViewport = new THREE.Vector4();
        const originalScissor = new THREE.Vector4();
        renderer.getViewport(originalViewport);
        renderer.getScissor(originalScissor);

        const captureCamera = mainView.camera.clone() as THREE.PerspectiveCamera;
        captureCamera.aspect = 1;
        captureCamera.updateProjectionMatrix();

        renderer.setScissorTest(false);
        renderer.setRenderTarget(renderTarget);
        renderer.setViewport(0, 0, targetSize, targetSize);
        renderer.render(scene, captureCamera);

        const pixels = new Uint8Array(targetSize * targetSize * 4);
        renderer.readRenderTargetPixels(renderTarget, 0, 0, targetSize, targetSize, pixels);

        renderer.setRenderTarget(null);
        renderer.setScissorTest(originalScissorTest);
        renderer.setViewport(originalViewport);
        renderer.setScissor(originalScissor);
        renderTarget.dispose();

        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imageData = ctx.createImageData(targetSize, targetSize);
          // Apply gamma correction (sRGB) to match live renderer output
          const gammaCorrect = (value: number) => Math.round(Math.pow(value / 255, 1 / 2.2) * 255);
          for (let y = 0; y < targetSize; y++) {
            for (let x = 0; x < targetSize; x++) {
              const srcIdx = ((targetSize - 1 - y) * targetSize + x) * 4;
              const dstIdx = (y * targetSize + x) * 4;
              imageData.data[dstIdx] = gammaCorrect(pixels[srcIdx]);
              imageData.data[dstIdx + 1] = gammaCorrect(pixels[srcIdx + 1]);
              imageData.data[dstIdx + 2] = gammaCorrect(pixels[srcIdx + 2]);
              imageData.data[dstIdx + 3] = pixels[srcIdx + 3];
            }
          }
          ctx.putImageData(imageData, 0, 0);
          return canvas.toDataURL('image/png');
        }
        return null;
      } catch (e) {
        console.error('Erro ao capturar screenshot:', e);
        return null;
      }
    }
  }));

  const createLesionInStorage = (position: { x: number; y: number; z: number }, sev: Severity, location?: string) => {
    addLesion({
      position,
      severity: sev,
      size: currentMarkerSizeRef.current,
      color: currentMarkerColorRef.current,
      markerType: currentMarkerTypeRef.current,
      location
    });
  };

  const captureViewScreenshot = useCallback((viewIndex: number, targetView: string) => {
    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const view = viewsRef.current[viewIndex];

    if (!renderer || !scene || !view || !view.camera) {
      console.warn('Captura: renderer, scene ou camera não inicializado');
      return;
    }

    try {
      const targetSize = 512;
      const renderTarget = new THREE.WebGLRenderTarget(targetSize, targetSize, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
      });

      const originalScissorTest = renderer.getScissorTest();
      const originalViewport = new THREE.Vector4();
      const originalScissor = new THREE.Vector4();
      renderer.getViewport(originalViewport);
      renderer.getScissor(originalScissor);

      const captureCamera = view.camera.clone() as THREE.Camera;

      if ((captureCamera as THREE.OrthographicCamera).isOrthographicCamera) {
        const ortho = captureCamera as THREE.OrthographicCamera;
        const height = ortho.top - ortho.bottom;
        const width = ortho.right - ortho.left;
        const size = Math.max(height, width);
        ortho.left = -size / 2;
        ortho.right = size / 2;
        ortho.top = size / 2;
        ortho.bottom = -size / 2;
        ortho.updateProjectionMatrix();
      } else if ((captureCamera as THREE.PerspectiveCamera).isPerspectiveCamera) {
        const persp = captureCamera as THREE.PerspectiveCamera;
        persp.aspect = 1;
        persp.updateProjectionMatrix();
      }

      renderer.setScissorTest(false);
      renderer.setRenderTarget(renderTarget);
      renderer.setViewport(0, 0, targetSize, targetSize);
      renderer.render(scene, captureCamera);

      const pixels = new Uint8Array(targetSize * targetSize * 4);
      renderer.readRenderTargetPixels(renderTarget, 0, 0, targetSize, targetSize, pixels);

      renderer.setRenderTarget(null);
      renderer.setScissorTest(originalScissorTest);
      renderer.setViewport(originalViewport);
      renderer.setScissor(originalScissor);
      renderTarget.dispose();

      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const imageData = ctx.createImageData(targetSize, targetSize);
        // Apply gamma correction (sRGB) to match live renderer output
        const gammaCorrect = (value: number) => Math.round(Math.pow(value / 255, 1 / 2.2) * 255);
        for (let y = 0; y < targetSize; y++) {
          for (let x = 0; x < targetSize; x++) {
            const srcIdx = ((targetSize - 1 - y) * targetSize + x) * 4;
            const dstIdx = (y * targetSize + x) * 4;
            imageData.data[dstIdx] = gammaCorrect(pixels[srcIdx]);
            imageData.data[dstIdx + 1] = gammaCorrect(pixels[srcIdx + 1]);
            imageData.data[dstIdx + 2] = gammaCorrect(pixels[srcIdx + 2]);
            imageData.data[dstIdx + 3] = pixels[srcIdx + 3];
          }
        }
        ctx.putImageData(imageData, 0, 0);
        const imageDataUrl = canvas.toDataURL('image/png');
        setDraftImage(targetView, imageDataUrl);
        const viewLabels: Record<string, string> = {
          'sagittal-avf': 'Sagital',
          'coronal': 'Coronal',
          'posterior': 'Posterior',
        };
        toast.success(`Vista ${viewLabels[targetView] || targetView} capturada!`);
      }
    } catch (e) {
      console.error('Erro ao capturar vista:', e);
      toast.error('Erro ao capturar vista');
    }
  }, [setDraftImage]);

  // Get or create cached geometry
  const getCachedGeometry = (type: string, size: number): THREE.BufferGeometry => {
    const key = `${type}_${size.toFixed(2)}`;
    if (!geometryCacheRef.current[key]) {
      switch (type) {
        case 'square':
          geometryCacheRef.current[key] = new THREE.BoxGeometry(size * 1.5, size * 1.5, size * 1.5);
          break;
        case 'triangle':
          geometryCacheRef.current[key] = new THREE.ConeGeometry(size, size * 2, 3);
          break;
        case 'circle':
        default:
          geometryCacheRef.current[key] = new THREE.SphereGeometry(size, 12, 12);
          break;
      }
    }
    return geometryCacheRef.current[key];
  };

  // Get or create cached material
  const getCachedMaterial = (color: number): THREE.MeshStandardMaterial => {
    const key = `mat_${color}`;
    if (!materialCacheRef.current[key]) {
      materialCacheRef.current[key] = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.2,
        metalness: 0.6,
        emissive: color,
        emissiveIntensity: 0.4
      });
    }
    return materialCacheRef.current[key] as THREE.MeshStandardMaterial;
  };

  // Add markers for a single lesion (in all 4 views)
  const addMarkersForLesion = (lesion: Lesion) => {
    if (!sceneRef.current || markersByLesionRef.current[lesion.id]) return;

    const markers: THREE.Object3D[] = [];
    const markerSize = lesion.size ?? 0.18;
    const markerColor = lesion.color ? parseInt(lesion.color.replace('#', ''), 16) : COLORS[lesion.severity];
    const markerType = lesion.markerType ?? 'circle';

    const geometry = getCachedGeometry(markerType, markerSize);
    const material = getCachedMaterial(markerColor);

    viewsRef.current.forEach((view, viewIdx) => {
      if (!markerGroupsRef.current[viewIdx]) {
        markerGroupsRef.current[viewIdx] = new THREE.Group();
        sceneRef.current?.add(markerGroupsRef.current[viewIdx]);
      }

      const markerGroup = markerGroupsRef.current[viewIdx];

      // Create marker mesh (clone geometry for independent transforms)
      const marker = new THREE.Mesh(geometry.clone(), material);
      marker.position.set(lesion.position.x, lesion.position.y, lesion.position.z);
      marker.userData.lesionId = lesion.id;
      markerGroup.add(marker);
      markers.push(marker);

      // Add ring for orthographic views
      if (viewIdx > 0) {
        const ringRadius = markerSize * 1.4;
        const ringGeometry = new THREE.BufferGeometry();
        const ringPositions = [];
        const ringSegments = 32;
        for (let i = 0; i <= ringSegments; i++) {
          const angle = (i / ringSegments) * Math.PI * 2;
          ringPositions.push(
            lesion.position.x + Math.cos(angle) * ringRadius,
            lesion.position.y + Math.sin(angle) * ringRadius,
            lesion.position.z
          );
        }
        ringGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ringPositions), 3));
        const ringMaterial = new THREE.LineBasicMaterial({
          color: markerColor,
          linewidth: 2,
          transparent: true,
          opacity: 0.7
        });
        const ring = new THREE.Line(ringGeometry, ringMaterial);
        ring.userData.lesionId = lesion.id;
        markerGroup.add(ring);
        markers.push(ring);
      }
    });

    markersByLesionRef.current[lesion.id] = markers;
  };

  // Remove markers for a single lesion
  const removeMarkersForLesion = (lesionId: string) => {
    const markers = markersByLesionRef.current[lesionId];
    if (!markers) return;

    markers.forEach(marker => {
      if (marker.parent) {
        marker.parent.remove(marker);
      }
    });

    delete markersByLesionRef.current[lesionId];
  };

  // Update position of existing markers for a lesion
  const updateMarkerPositions = (lesionId: string, position: { x: number; y: number; z: number }, lesionSize?: number) => {
    const markers = markersByLesionRef.current[lesionId];
    if (!markers) return;

    const size = lesionSize ?? 0.18;
    const ringRadius = size * 1.4;

    markers.forEach(marker => {
      if (marker instanceof THREE.Mesh) {
        marker.position.set(position.x, position.y, position.z);
      } else if (marker instanceof THREE.Line) {
        // Rebuild ring geometry at new position using actual size
        const geometry = marker.geometry as THREE.BufferGeometry;
        const positions = geometry.getAttribute('position');
        if (positions) {
          const ringSegments = 32;
          for (let i = 0; i <= ringSegments; i++) {
            const angle = (i / ringSegments) * Math.PI * 2;
            positions.setXYZ(i,
              position.x + Math.cos(angle) * ringRadius,
              position.y + Math.sin(angle) * ringRadius,
              position.z
            );
          }
          positions.needsUpdate = true;
        }
      }
    });
  };

  // Check if lesion appearance changed (size, color, type)
  const lesionAppearanceChanged = (prev: Lesion, curr: Lesion): boolean => {
    return prev.size !== curr.size ||
      prev.color !== curr.color ||
      prev.markerType !== curr.markerType ||
      prev.severity !== curr.severity;
  };

  // Smart update: only add/remove/move what changed
  const updateAllMarkers = () => {
    if (!sceneRef.current) return;

    const currentLesions = useLesionStore.getState().lesions;
    const prevLesions = prevLesionsRef.current;

    const currentIds = new Set(currentLesions.map(l => l.id));
    const prevIds = new Set(prevLesions.map(l => l.id));

    // Find removed lesions
    prevLesions.forEach(lesion => {
      if (!currentIds.has(lesion.id)) {
        removeMarkersForLesion(lesion.id);
      }
    });

    // Find added or updated lesions
    currentLesions.forEach(lesion => {
      if (!prevIds.has(lesion.id)) {
        // New lesion - add markers
        addMarkersForLesion(lesion);
      } else {
        // Existing lesion - check what changed
        const prev = prevLesions.find(p => p.id === lesion.id);
        if (prev) {
          // Check if appearance changed (size, color, type, severity)
          if (lesionAppearanceChanged(prev, lesion)) {
            // Appearance changed - rebuild markers completely
            removeMarkersForLesion(lesion.id);
            addMarkersForLesion(lesion);
          } else if (
            prev.position.x !== lesion.position.x ||
            prev.position.y !== lesion.position.y ||
            prev.position.z !== lesion.position.z
          ) {
            // Only position changed - update positions efficiently
            updateMarkerPositions(lesion.id, lesion.position, lesion.size);
          }
        }
      }
    });

    // Update prev reference with deep copy
    prevLesionsRef.current = currentLesions.map(l => ({
      ...l,
      position: { ...l.position }
    }));
  };

  // Legacy function for compatibility - creates all markers from scratch
  const createMarkerForView = (lesion: Lesion, viewIdx: number, view: any) => {
    addMarkersForLesion(lesion);
  };

  useEffect(() => {
    if (!canvasRef.current || !viewMainRef.current || !viewSagittalRef.current || !viewCoronalRef.current || !viewPosteriorRef.current || !viewSagittalRLRef.current) return;

    let animationFrameId: number;
    let isMounted = true;
    let renderer: THREE.WebGLRenderer;
    let loadTimeout: NodeJS.Timeout | null = null;

    const canvas = canvasRef.current;
    const isIOSDevice = isIOS();
    const isMobileDevice = isMobile();

    try {
      const contextAttributes: WebGLContextAttributes = {
        antialias: !isIOSDevice,
        alpha: true,
        powerPreference: isIOSDevice ? 'low-power' : 'high-performance',
        preserveDrawingBuffer: true,
        failIfMajorPerformanceCaveat: false
      };

      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        ...contextAttributes
      });
    } catch (e) {
      console.warn('WebGL not available:', e);
      setLoadingState('error');
      setErrorMessage('WebGL não disponível neste dispositivo');
      return;
    }

    const pixelRatio = isIOSDevice ? Math.min(window.devicePixelRatio, 2) : window.devicePixelRatio;
    renderer.setPixelRatio(pixelRatio);

    if (!isIOSDevice && !isMobileDevice) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFShadowMap;
    } else {
      renderer.shadowMap.enabled = false;
    }

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setScissorTest(true);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    sceneRef.current = scene;

    const ambientLight = new THREE.AmbientLight(0xffffff, isIOSDevice ? 0.5 : 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 7);

    if (!isIOSDevice && !isMobileDevice) {
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 1024;
      dirLight.shadow.mapSize.height = 1024;
      dirLight.shadow.camera.left = -15;
      dirLight.shadow.camera.right = 15;
      dirLight.shadow.camera.top = 15;
      dirLight.shadow.camera.bottom = -15;
      dirLight.shadow.camera.far = 100;
      dirLight.shadow.bias = 0.0001;
      dirLight.shadow.radius = 4;
    }
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-5, 0, 5);
    scene.add(fillLight);

    const pinkLight = new THREE.PointLight(0xffd1dc, 0.5, 20);
    pinkLight.position.set(0, 2, 5);
    scene.add(pinkLight);

    const rimLight = new THREE.PointLight(0x8b5cf6, 0.5, 20);
    rimLight.position.set(0, 2, -5);
    scene.add(rimLight);

    const anatomyGroup = new THREE.Group();
    anatomyGroupRef.current = anatomyGroup;
    scene.add(anatomyGroup);

    // Helper to reset anatomy meshes ref
    const resetAnatomyMeshes = () => {
      anatomyMeshesRef.current = {
        uterus: [],
        cervix: [],
        ovaries: [],
        fallopianTubes: [],
        uterosacrals: [],
        roundLigaments: [],
        ureters: [],
        bladder: [],
        rectum: [],
        intestine: [],
      };
    };

    // Helper to apply visibility from store
    const applyVisibilityFromStore = () => {
      const currentVisibility = useAnatomyStore.getState().visibility;
      Object.entries(currentVisibility).forEach(([element, visible]) => {
        const meshes = anatomyMeshesRef.current[element as AnatomyElement];
        if (meshes) {
          meshes.forEach((mesh) => {
            mesh.visible = visible;
          });
        }
      });
    };

    const createFallbackModel = () => {
      resetAnatomyMeshes();
      const geometry = new THREE.SphereGeometry(1.8, 32, 24);
      const material = new THREE.MeshStandardMaterial({
        color: 0xd67c7c,
        roughness: 0.4,
        metalness: 0.05,
        side: THREE.DoubleSide
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.userData.anatomyType = 'uterus';
      anatomyMeshesRef.current.uterus.push(sphere);
      anatomyGroup.add(sphere);
      setLoadingState('fallback');

      // Apply initial visibility
      applyVisibilityFromStore();

      // Render existing lesions after fallback model loads
      updateAllMarkers();
    };

    loadTimeout = setTimeout(() => {
      if (isMounted && loadingState === 'loading') {
        createFallbackModel();
      }
    }, MODEL_LOAD_TIMEOUT);

    const processModel = (gltf: any) => {
      if (!isMounted) return;
      if (loadTimeout) clearTimeout(loadTimeout);

      resetAnatomyMeshes();

      const model = gltf.scene;

      processGLBModel(model, anatomyGroup, anatomyMeshesRef.current, { isIOS: isIOSDevice, isMobile: isMobileDevice });

      createProgrammaticAnatomy(anatomyGroup, anatomyMeshesRef.current);

      applyVisibilityFromStore();

      setLoadingState('loaded');
      setLoadingProgress(100);

      updateAllMarkers();
    };


    const loader = new GLTFLoader();

    const loadModelWithCache = async () => {
      try {
        const cachedData = await getCachedModel();

        if (cachedData) {
          setLoadingProgress(50);
          loader.parse(cachedData, '', processModel, (error) => {
            loadFreshModel();
          });
        } else {
          loadFreshModel();
        }
      } catch {
        loadFreshModel();
      }
    };

    const loadFreshModel = () => {
      fetch('/model.glb')
        .then(response => {
          if (!response.ok) throw new Error('Network response was not ok');
          const contentLength = response.headers.get('content-length');
          const total = contentLength ? parseInt(contentLength, 10) : 0;

          if (!response.body) {
            return response.arrayBuffer();
          }

          const reader = response.body.getReader();
          const chunks: Uint8Array[] = [];
          let loaded = 0;

          const read = (): Promise<ArrayBuffer> => {
            return reader.read().then(({ done, value }) => {
              if (done) {
                const allChunks = new Uint8Array(loaded);
                let position = 0;
                for (const chunk of chunks) {
                  allChunks.set(chunk, position);
                  position += chunk.length;
                }
                return allChunks.buffer;
              }

              chunks.push(value);
              loaded += value.length;

              if (total > 0) {
                setLoadingProgress(Math.round((loaded / total) * 90));
              }

              return read();
            });
          };

          return read();
        })
        .then(async (buffer) => {
          if (!isMounted) return;

          cacheModel(buffer).catch(() => { });

          loader.parse(buffer, '', processModel, (error) => {
            if (!isMounted) return;
            if (loadTimeout) clearTimeout(loadTimeout);
            createFallbackModel();
            setErrorMessage('Não foi possível processar o modelo 3D');
          });
        })
        .catch((error) => {
          if (!isMounted) return;
          if (loadTimeout) clearTimeout(loadTimeout);
          createFallbackModel();
          setErrorMessage('Não foi possível carregar o modelo 3D');
        });
    };

    loadModelWithCache();

    // Initialize marker groups
    for (let i = 0; i < 5; i++) {
      markerGroupsRef.current[i] = new THREE.Group();
      scene.add(markerGroupsRef.current[i]);
    }

    // Assign updateAllMarkers function to ref for external access
    updateMarkersRef.current = updateAllMarkers;

    const views: any[] = [];
    viewsRef.current = views;

    function setupView(element: HTMLDivElement, cameraType: 'perspective' | 'orthographic', camPos: number[], upVec: number[], viewIdx: number, fov = 45) {
      let camera, controls;

      if (cameraType === 'perspective') {
        camera = new THREE.PerspectiveCamera(fov, element.clientWidth / element.clientHeight, 0.1, 100);
        camera.position.set(camPos[0], camPos[1], camPos[2]);
        controls = new OrbitControls(camera, element);
        controls.minDistance = 2;
        controls.maxDistance = 10;
        controls.mouseButtons = {
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.ROTATE
        };
      } else {
        const frustumSize = 8;
        const aspect = element.clientWidth / element.clientHeight;
        camera = new THREE.OrthographicCamera(
          frustumSize * aspect / -2,
          frustumSize * aspect / 2,
          frustumSize / 2,
          frustumSize / -2,
          0.1, 100
        );
        camera.position.set(camPos[0], camPos[1], camPos[2]);
        camera.zoom = 1;
        controls = new OrbitControls(camera, element);
        controls.enableRotate = false;
        controls.enableZoom = true;
        controls.enablePan = false;
      }

      camera.up.set(upVec[0], upVec[1], upVec[2]);
      camera.lookAt(0, 0, 0);
      controls.update();

      return { element, camera, controls, viewIdx, viewType: cameraType };
    }

    views.push(setupView(viewMainRef.current, 'perspective', [5, 2, 6], [0, 1, 0], 0));
    views.push(setupView(viewSagittalRef.current, 'orthographic', [10, 0, 0], [0, 1, 0], 1));
    views.push(setupView(viewCoronalRef.current, 'orthographic', [0, 0, 10], [0, 1, 0], 2));
    views.push(setupView(viewPosteriorRef.current, 'orthographic', [0, 0, -10], [0, 1, 0], 3));
    views.push(setupView(viewSagittalRLRef.current, 'orthographic', [-10, 0, 0], [0, 1, 0], 4));

    views[0].controls.enableRotate = true;

    // === UNIFIED RAYCASTING FOR ALL VIEWS ===
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function convertScreenToWorldCoords(event: PointerEvent, viewIdx: number): { point: THREE.Vector3; anatomyType: string } | null {
      const view = views[viewIdx];
      const rect = view.element.getBoundingClientRect();

      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, view.camera);

      const intersects = raycaster.intersectObjects(anatomyGroup.children, true);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const anatomyType = hitMesh.userData?.anatomyType || 'uterus';
        return { point: intersects[0].point, anatomyType };
      }

      return null;
    }

    // Raycaster for detecting lesion markers
    const markerRaycaster = new THREE.Raycaster();
    const markerMouse = new THREE.Vector2();

    // Detect which lesion marker was clicked
    const detectLesionMarker = (event: PointerEvent, viewIdx: number): string | null => {
      const view = views[viewIdx];
      const rect = view.element.getBoundingClientRect();

      markerMouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      markerMouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      markerRaycaster.setFromCamera(markerMouse, view.camera);

      const markerGroup = markerGroupsRef.current[viewIdx];
      if (!markerGroup) return null;

      const intersects = markerRaycaster.intersectObjects(markerGroup.children, true);

      if (intersects.length > 0) {
        // Find the first hit that has a lesionId
        const hit = intersects.find(i => i.object.userData.lesionId);
        if (hit) {
          return hit.object.userData.lesionId;
        }
      }
      return null;
    };

    // Pointer down: Check if clicking on existing lesion or creating new one
    const handleViewClick = (viewIdx: number) => (event: PointerEvent) => {
      // Skip in read-only mode
      if (readOnlyRef.current) return;

      const isOrthographic = viewIdx > 0;

      // Track start position for click vs drag
      pointerStateRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        isClickPending: true
      };

      // RULES:
      // Left click (0) -> Lesion interaction (select/add/move)
      // Right click (2) -> Camera orbit (Perspective) OR Insertion (Orthographic)

      if (event.button === 2) {
        if (isOrthographic) {
          const hit = convertScreenToWorldCoords(event, viewIdx);
          if (hit) {
            createLesionInStorage(
              { x: hit.point.x, y: hit.point.y, z: hit.point.z },
              currentSeverityRef.current,
              hit.anatomyType
            );
            onSelectLesion?.(null);
          }
          event.preventDefault();
          return;
        } else {
          // Right click in 3D Perspective: Orbit (handled by OrbitControls)
          views[viewIdx].controls.enabled = true;
          return;
        }
      }

      if (event.button !== 0) return;

      const lesionId = detectLesionMarker(event, viewIdx);

      if (lesionId) {
        // Clicked on a marker with LEFT BUTTON: Select and start dragging
        onSelectLesion?.(lesionId);
        dragStateRef.current = {
          isDragging: true, // isDraggingLesion
          lesionId,
          viewIdx
        };
        // Disable camera movement during lesion drag
        views[viewIdx].controls.enabled = false;
        (event.target as HTMLElement).setPointerCapture(event.pointerId);
        event.preventDefault();
      }
    };

    // Throttle for drag updates (16ms = ~60fps)
    let lastMoveTime = 0;
    const MOVE_THROTTLE_MS = 16;

    // Pointer move: Update dragged lesion position with throttle
    const handleViewMove = (viewIdx: number) => (event: PointerEvent) => {
      if (readOnlyRef.current) return;

      // Check for movement to cancel click
      if (pointerStateRef.current.isClickPending) {
        const dist = Math.sqrt(
          Math.pow(event.clientX - pointerStateRef.current.startX, 2) +
          Math.pow(event.clientY - pointerStateRef.current.startY, 2)
        );
        if (dist > 5) {
          pointerStateRef.current.isClickPending = false;
        }
      }

      // ONLY move if we are explicitly dragging a lesion in the current view
      if (!dragStateRef.current.isDragging || dragStateRef.current.viewIdx !== viewIdx) return;

      // Throttle updates to 60fps max
      const now = performance.now();
      if (now - lastMoveTime < MOVE_THROTTLE_MS) return;
      lastMoveTime = now;

      const hit = convertScreenToWorldCoords(event, viewIdx);
      if (hit && dragStateRef.current.lesionId) {
        useLesionStore.getState().updateLesion(dragStateRef.current.lesionId, {
          position: { x: hit.point.x, y: hit.point.y, z: hit.point.z },
          location: hit.anatomyType
        });
        updateAllMarkers();
      }
    };

    // Pointer up: Stop dragging or create lesion if it was a click
    const handleViewUp = (viewIdx: number) => (event: PointerEvent) => {
      if (readOnlyRef.current) return;

      const isOrthographic = viewIdx > 0;

      // If it was a click (not a drag) and not already dragging a lesion
      if (pointerStateRef.current.isClickPending && !dragStateRef.current.isDragging && event.button === 0) {
        const lesionId = detectLesionMarker(event, viewIdx);

        if (!lesionId) {
          // Clicked empty space with LEFT BUTTON
          if (!isOrthographic) {
            const hit = convertScreenToWorldCoords(event, viewIdx);
            if (hit) {
              createLesionInStorage(
                { x: hit.point.x, y: hit.point.y, z: hit.point.z },
                currentSeverityRef.current,
                hit.anatomyType
              );
              onSelectLesion?.(null);
            }
          } else {
            // In 2D views: Clear selection if clicking empty space with LEFT BUTTON
            onSelectLesion?.(null);
          }
        }
      }

      pointerStateRef.current.isClickPending = false;

      // Re-enable camera controls always on pointer up
      views[viewIdx].controls.enabled = true;

      if (!dragStateRef.current.isDragging) return;

      dragStateRef.current = { isDragging: false, lesionId: null, viewIdx: 0 };
      (event.target as HTMLElement).releasePointerCapture(event.pointerId);
      event.preventDefault();
    };

    // Double-click: Delete lesion
    const handleViewDoubleClick = (viewIdx: number) => (event: PointerEvent) => {
      if (readOnlyRef.current) return;
      const lesionId = detectLesionMarker(event, viewIdx);

      if (lesionId) {
        useLesionStore.getState().removeLesion(lesionId);
        updateAllMarkers();
        event.preventDefault();
      }
    };

    // Store handlers for cleanup
    const handlers: { idx: number; down: any; move: any; up: any; leave: any; dblclick: any; contextmenu: any }[] = [];

    // Add event listeners for all views after they're set up
    for (let i = 0; i < views.length; i++) {
      const view = views[i];
      const downHandler = handleViewClick(i);
      const moveHandler = handleViewMove(i);
      const upHandler = handleViewUp(i);
      const dblclickHandler = handleViewDoubleClick(i);
      const contextmenuHandler = (e: Event) => e.preventDefault();

      view.element.addEventListener('pointerdown', downHandler);
      view.element.addEventListener('pointermove', moveHandler);
      view.element.addEventListener('pointerup', upHandler);
      view.element.addEventListener('pointerleave', upHandler);
      view.element.addEventListener('dblclick', dblclickHandler);
      view.element.addEventListener('contextmenu', contextmenuHandler);

      handlers.push({ idx: i, down: downHandler, move: moveHandler, up: upHandler, leave: upHandler, dblclick: dblclickHandler, contextmenu: contextmenuHandler });
    }

    // === ANIMATION LOOP ===
    function animate() {
      if (!isMounted) return;

      animationFrameId = requestAnimationFrame(animate);

      views.forEach(view => {
        const rect = view.element.getBoundingClientRect();

        if (rect.bottom < 0 || rect.top > renderer.domElement.clientHeight ||
          rect.right < 0 || rect.left > renderer.domElement.clientWidth) {
          return;
        }

        const canvasRect = renderer.domElement.getBoundingClientRect();

        const left = rect.left - canvasRect.left;
        const bottom = canvasRect.bottom - rect.bottom;
        const width = rect.width;
        const height = rect.height;

        renderer.setViewport(left, bottom, width, height);
        renderer.setScissor(left, bottom, width, height);

        view.camera.aspect = width / height;
        if (view.camera.isOrthographicCamera) {
          const frustumSize = 8;
          const aspect = width / height;
          view.camera.left = -frustumSize * aspect / 2;
          view.camera.right = frustumSize * aspect / 2;
          view.camera.top = frustumSize / 2;
          view.camera.bottom = -frustumSize / 2;
        }
        view.camera.updateProjectionMatrix();

        renderer.render(scene, view.camera);
      });
    }

    animate();

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      const parent = canvas.parentElement;
      if (parent) {
        const width = parent.clientWidth;
        const height = parent.clientHeight;
        renderer.setSize(width, height, false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      isMounted = false;
      if (loadTimeout) clearTimeout(loadTimeout);
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);

      // Remove event listeners
      handlers.forEach(({ idx, down, move, up, leave, dblclick, contextmenu }) => {
        const view = views[idx];
        if (view && view.element) {
          view.element.removeEventListener('pointerdown', down);
          view.element.removeEventListener('pointermove', move);
          view.element.removeEventListener('pointerup', up);
          view.element.removeEventListener('pointerleave', leave);
          view.element.removeEventListener('dblclick', dblclick);
          view.element.removeEventListener('contextmenu', contextmenu);
        }
      });

      // Dispose OrbitControls
      views.forEach(view => {
        if (view.controls) {
          view.controls.dispose();
        }
      });

      // Dispose cached geometries
      for (const key of Object.keys(geometryCacheRef.current)) {
        geometryCacheRef.current[key]?.dispose();
      }
      geometryCacheRef.current = {};

      // Dispose cached materials
      for (const key of Object.keys(materialCacheRef.current)) {
        materialCacheRef.current[key]?.dispose();
      }
      materialCacheRef.current = {};

      // Dispose all marker meshes
      for (const lesionId of Object.keys(markersByLesionRef.current)) {
        const markers = markersByLesionRef.current[lesionId];
        markers?.forEach(marker => {
          if (marker instanceof THREE.Mesh) {
            marker.geometry?.dispose();
            if (Array.isArray(marker.material)) {
              marker.material.forEach(m => m.dispose());
            } else {
              marker.material?.dispose();
            }
          }
        });
      }
      markersByLesionRef.current = {};

      // Dispose marker groups
      for (const key of Object.keys(markerGroupsRef.current)) {
        const group = markerGroupsRef.current[Number(key)];
        if (group && scene) scene.remove(group);
      }
      markerGroupsRef.current = {};

      // Traverse and dispose loaded model (anatomy) geometry and materials
      if (anatomyGroupRef.current) {
        anatomyGroupRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach(m => {
                if (m.map) m.map.dispose();
                m.dispose();
              });
            } else if (child.material) {
              if (child.material.map) child.material.map.dispose();
              child.material.dispose();
            }
          }
        });
      }

      // Clear scene
      while (scene.children.length > 0) {
        scene.remove(scene.children[0]);
      }

      // Clear refs
      sceneRef.current = null;
      anatomyGroupRef.current = null;
      viewsRef.current = [];

      // Dispose renderer last
      renderer.dispose();
    };

  }, []);

  return (
    <div className="relative w-full h-full bg-white">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block z-0" />

      {loadingState === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-50" data-testid="loading-overlay">
          <div className="relative w-16 h-16 mb-4">
            <svg className="animate-spin w-full h-full" viewBox="0 0 50 50">
              <circle
                cx="25" cy="25" r="20"
                fill="none"
                stroke="#e11d48"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${loadingProgress * 1.26}, 126`}
                className="transition-all duration-300"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs text-gray-600 font-mono">
              {loadingProgress}%
            </span>
          </div>
          <p className="text-gray-500 text-sm" data-testid="loading-text">Carregando modelo 3D...</p>
        </div>
      )}

      {loadingState === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-50" data-testid="error-overlay">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <p className="text-gray-600 text-sm text-center px-4" data-testid="error-text">
            {errorMessage || 'Erro ao carregar o modelo 3D'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded text-sm transition-colors"
            data-testid="retry-button"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {loadingState === 'fallback' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-50 border border-amber-200 text-amber-600 px-3 py-1 rounded text-xs font-mono z-50" data-testid="fallback-notice">
          Modo simplificado (modelo não carregou)
        </div>
      )}

      <div className="absolute inset-0 grid grid-cols-3 grid-rows-2 gap-0 pointer-events-auto z-20">
        <div ref={viewMainRef} className="relative col-span-2 border border-gray-300 pointer-events-auto bg-transparent overflow-hidden group">
          <div className="absolute top-2 left-2 bg-white/90 border border-rose-200 px-2 py-1 rounded text-xs font-mono text-rose-600 select-none z-10 shadow-sm">
            3D PERSPECTIVA
          </div>
          <div className="absolute bottom-2 left-2 right-2 flex justify-center pointer-events-none z-10">
            <span className="text-[9px] text-gray-500 font-mono bg-white/90 border border-gray-200 px-2 py-1 rounded shadow-sm">Esquerdo: adicionar lesão · Direito: rotacionar</span>
          </div>
        </div>

        <div ref={viewSagittalRef} className="relative border border-gray-300 pointer-events-auto bg-transparent overflow-hidden group">
          <div className="absolute top-2 left-2 bg-white/90 border border-blue-200 px-2 py-1 rounded text-xs font-mono text-blue-600 select-none z-10 shadow-sm">
            SAGITAL (ESQ → DIR)
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); captureViewScreenshot(1, 'sagittal-avf'); }}
            className="absolute top-2 right-2 w-7 h-7 bg-blue-500 hover:bg-blue-600 rounded flex items-center justify-center z-10 transition-colors opacity-0 group-hover:opacity-100 pointer-events-auto shadow-sm"
            title="Capturar Sagittal"
            data-testid="button-capture-sagittal"
          >
            <Camera className="w-4 h-4 text-white" />
          </button>
          <div className="absolute bottom-2 left-2 right-2 flex justify-center pointer-events-none z-10">
            <span className="text-[9px] text-gray-500 font-mono bg-white/90 border border-gray-200 px-2 py-1 rounded shadow-sm">Direito: adicionar lesão</span>
          </div>
        </div>

        <div ref={viewSagittalRLRef} className="relative border border-gray-300 pointer-events-auto bg-transparent overflow-hidden group">
          <div className="absolute top-2 left-2 bg-white/90 border border-purple-200 px-2 py-1 rounded text-xs font-mono text-purple-600 select-none z-10 shadow-sm">
            SAGITAL (DIR → ESQ)
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); captureViewScreenshot(4, 'sagittal-rl'); }}
            className="absolute top-2 right-2 w-7 h-7 bg-purple-500 hover:bg-purple-600 rounded flex items-center justify-center z-10 transition-colors opacity-0 group-hover:opacity-100 pointer-events-auto shadow-sm"
            title="Capturar Sagittal DIR → ESQ"
            data-testid="button-capture-sagittal-rl"
          >
            <Camera className="w-4 h-4 text-white" />
          </button>
          <div className="absolute bottom-2 left-2 right-2 flex justify-center pointer-events-none z-10">
            <span className="text-[9px] text-gray-500 font-mono bg-white/90 border border-gray-200 px-2 py-1 rounded shadow-sm">Direito: adicionar lesão</span>
          </div>
        </div>

        <div ref={viewCoronalRef} className="relative border border-gray-300 pointer-events-auto bg-transparent overflow-hidden group">
          <div className="absolute top-2 left-2 bg-white/90 border border-green-200 px-2 py-1 rounded text-xs font-mono text-green-600 select-none z-10 shadow-sm">
            CORONAL (FRONTAL)
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); captureViewScreenshot(2, 'coronal'); }}
            className="absolute top-2 right-2 w-7 h-7 bg-green-500 hover:bg-green-600 rounded flex items-center justify-center z-10 transition-colors opacity-0 group-hover:opacity-100 pointer-events-auto shadow-sm"
            title="Capturar Coronal"
            data-testid="button-capture-coronal"
          >
            <Camera className="w-4 h-4 text-white" />
          </button>
          <div className="absolute bottom-2 left-2 right-2 flex justify-center pointer-events-none z-10">
            <span className="text-[9px] text-gray-500 font-mono bg-white/90 border border-gray-200 px-2 py-1 rounded shadow-sm">Direito: adicionar lesão</span>
          </div>
        </div>

        <div ref={viewPosteriorRef} className="relative border border-gray-300 pointer-events-auto bg-transparent overflow-hidden group">
          <div className="absolute top-2 left-2 bg-white/90 border border-amber-200 px-2 py-1 rounded text-xs font-mono text-amber-600 select-none z-10 shadow-sm">
            POSTERIOR (TRÁS)
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); captureViewScreenshot(3, 'posterior'); }}
            className="absolute top-2 right-2 w-7 h-7 bg-amber-500 hover:bg-amber-600 rounded flex items-center justify-center z-10 transition-colors opacity-0 group-hover:opacity-100 pointer-events-auto shadow-sm"
            title="Capturar Posterior"
            data-testid="button-capture-posterior"
          >
            <Camera className="w-4 h-4 text-white" />
          </button>
          <div className="absolute bottom-2 left-2 right-2 flex justify-center pointer-events-none z-10">
            <span className="text-[9px] text-gray-500 font-mono bg-white/90 border border-gray-200 px-2 py-1 rounded shadow-sm">Direito: adicionar lesão</span>
          </div>
        </div>
      </div>
    </div>
  );
});

Uterus3D.displayName = "Uterus3D";
