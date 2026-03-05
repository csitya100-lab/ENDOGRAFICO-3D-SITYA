import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Severity } from "./lesionStore";
import {
  putImage,
  getImage,
  deleteImage,
  deleteImagesByPrefix,
  getImagesByPrefix,
} from "./imageDb";

export interface ReportLesion {
  id: string;
  name: string;
  location: string;
  severity: Severity;
  position: { x: number; y: number; z: number };
  comment?: string;
}

export interface Image3D {
  id: string;
  data: string;
  label: string;
  observation: string;
  capturedAt: string;
}

export interface Report {
  id: string;
  patientName: string;
  patientId: string;
  examDate: string;
  examType: string;
  images2D: {
    'sagittal-avf': string;
    'sagittal-rl': string;
    coronal: string;
    posterior: string;
  };
  imageNotes: {
    'sagittal-avf': string;
    'sagittal-rl': string;
    coronal: string;
    posterior: string;
  };
  images3D: Image3D[];
  lesions: ReportLesion[];
  createdAt: string;
}

export interface PdfImage {
  data: string;
  label: string;
  viewType: string;
  observation: string;
}

interface ReportState {
  draftImages2D: Record<string, string>;
  draftImageNotes: Record<string, string>;
  draftImages3D: Image3D[];
  reports: Record<string, Report>;
  hydrated: boolean;

  pdfImages: PdfImage[];
  patientName: string;
  examDate: string;
  patientId: string;

  setPatientName: (name: string) => void;
  setExamDate: (date: string) => void;
  setPatientId: (id: string) => void;

  selectedViews: Record<string, boolean>;

  setDraftImages2D: (images: Record<string, string>) => void;
  setDraftImage: (view: string, imageData: string) => void;
  setDraftImageNote: (view: string, note: string) => void;
  clearDraftImages2D: () => void;

  addDraftImage3D: (imageData: string) => void;
  removeDraftImage3D: (id: string) => void;
  updateDraftImage3DObservation: (id: string, observation: string) => void;
  clearDraftImages3D: () => void;

  createReport: (report: Omit<Report, "id" | "createdAt">) => string;
  getReport: (id: string) => Report | undefined;
  deleteReport: (id: string) => void;
  removeReportImage3D: (reportId: string, imageId: string) => void;

  addPdfImage: (image: PdfImage) => void;
  removePdfImage: (index: number) => void;
  clearPdfImages: () => void;
  updatePdfImageObservation: (index: number, observation: string) => void;
  reorderPdfImages: (fromIndex: number, toIndex: number) => void;

  toggleViewSelection: (view: string) => void;
  setSelectedViews: (views: Record<string, boolean>) => void;
}

// ─── IndexedDB key conventions ───
// draft2d_{viewKey}       - 2D draft images
// draft3d_{id}            - 3D draft images
// pdf_{index}             - PDF report images

/** Save all draft 2D images to IndexedDB */
function persistDraft2D(images: Record<string, string>) {
  for (const [view, data] of Object.entries(images)) {
    if (data) {
      putImage(`draft2d_${view}`, data);
    } else {
      deleteImage(`draft2d_${view}`);
    }
  }
}

/** Save all PDF images to IndexedDB (indexes as keys) */
function persistPdfImages(images: PdfImage[]) {
  // Clear old then write new
  deleteImagesByPrefix('pdf_').then(() => {
    images.forEach((img, idx) => {
      if (img.data) {
        putImage(`pdf_${idx}`, img.data);
      }
    });
  });
}

/** Save a single 3D draft image to IndexedDB */
function persistDraft3D(id: string, data: string) {
  putImage(`draft3d_${id}`, data);
}


export const useReportStore = create<ReportState>()(
  persist(
    (set, get) => ({
      draftImages2D: {
        'sagittal-avf': "",
        'sagittal-rvf': "",
        coronal: "",
        posterior: "",
      },
      draftImageNotes: {
        'sagittal-avf': "",
        'sagittal-rvf': "",
        coronal: "",
        posterior: "",
      },
      draftImages3D: [],
      reports: {},
      hydrated: false,
      pdfImages: [],
      patientName: "",
      examDate: "",
      patientId: "",

      setPatientName: (name: string) => set({ patientName: name }),
      setExamDate: (date: string) => set({ examDate: date }),
      setPatientId: (id: string) => set({ patientId: id }),

      selectedViews: {
        'sagittal-avf': false,
        'sagittal-rvf': false,
        coronal: false,
        posterior: false,
      },

      setDraftImages2D: (images) => {
        set({ draftImages2D: images });
        persistDraft2D(images);
      },

      setDraftImage: (view, imageData) => {
        set((state) => {
          const updated = { ...state.draftImages2D, [view]: imageData };
          // Persist to IndexedDB in background
          if (imageData) {
            putImage(`draft2d_${view}`, imageData);
          } else {
            deleteImage(`draft2d_${view}`);
          }
          return { draftImages2D: updated };
        });
      },

      setDraftImageNote: (view, note) =>
        set((state) => ({
          draftImageNotes: { ...state.draftImageNotes, [view]: note },
        })),

      clearDraftImages2D: () => {
        set({
          draftImages2D: {
            'sagittal-avf': "",
            'sagittal-rvf': "",
            coronal: "",
            posterior: "",
          },
          draftImageNotes: {
            'sagittal-avf': "",
            'sagittal-rvf': "",
            coronal: "",
            posterior: "",
          },
        });
        deleteImagesByPrefix('draft2d_');
      },

      addDraftImage3D: (imageData: string) => {
        const id = `img3d-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const count = get().draftImages3D.length;
        set((state) => ({
          draftImages3D: [
            ...state.draftImages3D,
            {
              id,
              data: imageData,
              label: `Captura 3D ${count + 1}`,
              observation: "",
              capturedAt: new Date().toISOString(),
            },
          ],
        }));
        persistDraft3D(id, imageData);
      },

      removeDraftImage3D: (id: string) => {
        set((state) => ({
          draftImages3D: state.draftImages3D.filter((img) => img.id !== id),
        }));
        deleteImage(`draft3d_${id}`);
      },

      updateDraftImage3DObservation: (id: string, observation: string) =>
        set((state) => ({
          draftImages3D: state.draftImages3D.map((img) =>
            img.id === id ? { ...img, observation } : img,
          ),
        })),

      clearDraftImages3D: () => {
        set({ draftImages3D: [] });
        deleteImagesByPrefix('draft3d_');
      },

      createReport: (reportData) => {
        const id = `RPT-${Date.now().toString(36).toUpperCase()}`;
        const newReport: Report = {
          ...reportData,
          images3D: reportData.images3D || [],
          id,
          createdAt: new Date().toISOString(),
        };

        set((state) => ({
          reports: { ...state.reports, [id]: newReport },
        }));

        return id;
      },

      getReport: (id) => {
        return get().reports[id];
      },

      deleteReport: (id) => {
        set((state) => {
          const { [id]: removed, ...rest } = state.reports;
          return { reports: rest };
        });
      },

      removeReportImage3D: (reportId, imageId) => {
        set((state) => {
          const report = state.reports[reportId];
          if (!report) return state;
          return {
            reports: {
              ...state.reports,
              [reportId]: {
                ...report,
                images3D: report.images3D.filter((img) => img.id !== imageId),
              },
            },
          };
        });
      },

      addPdfImage: (image) => {
        set((state) => {
          const updated = [...state.pdfImages, image];
          // Persist image data to IndexedDB
          if (image.data) {
            putImage(`pdf_${updated.length - 1}`, image.data);
          }
          return { pdfImages: updated };
        });
      },

      removePdfImage: (index) => {
        set((state) => {
          const updated = state.pdfImages.filter((_, i) => i !== index);
          // Re-persist all PDF images since indexes shifted
          persistPdfImages(updated);
          return { pdfImages: updated };
        });
      },

      clearPdfImages: () => {
        set({ pdfImages: [] });
        deleteImagesByPrefix('pdf_');
      },

      updatePdfImageObservation: (index, observation) =>
        set((state) => ({
          pdfImages: state.pdfImages.map((img, i) =>
            i === index ? { ...img, observation } : img,
          ),
        })),

      reorderPdfImages: (fromIndex, toIndex) =>
        set((state) => {
          const items = [...state.pdfImages];
          const [moved] = items.splice(fromIndex, 1);
          items.splice(toIndex, 0, moved);
          // Re-persist since indexes changed
          persistPdfImages(items);
          return { pdfImages: items };
        }),

      toggleViewSelection: (view) =>
        set((state) => ({
          selectedViews: {
            ...state.selectedViews,
            [view]: !state.selectedViews[view],
          },
        })),

      setSelectedViews: (views) => set({ selectedViews: views }),
    }),
    {
      name: 'endomapper-report',
      storage: {
        getItem: (name) => {
          if (typeof window === 'undefined') return null;
          try {
            const str = sessionStorage.getItem(name);
            return str ? JSON.parse(str) : null;
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          if (typeof window === 'undefined') return;
          try {
            sessionStorage.setItem(name, JSON.stringify(value));
          } catch {
            // ignore storage errors
          }
        },
        removeItem: (name) => {
          if (typeof window === 'undefined') return;
          try {
            sessionStorage.removeItem(name);
          } catch {
            // ignore storage errors
          }
        },
      },
      // Only persist lightweight metadata to sessionStorage — NO image data
      partialize: (state) => ({
        draftImageNotes: state.draftImageNotes,
        // Store only the metadata (id, label, observation, capturedAt) without the heavy base64 data
        draftImages3D: state.draftImages3D.map(({ data, ...meta }) => ({ ...meta, data: '' })),
        // Store only metadata for draft 2D (which views have captures)
        draftImages2D: Object.fromEntries(
          Object.entries(state.draftImages2D).map(([key, val]) => [key, val ? '__has_image__' : ''])
        ),
        // Store only metadata for PDF images (without the heavy base64 data)
        pdfImages: state.pdfImages.map(({ data, ...meta }) => ({ ...meta, data: '' })),
        selectedViews: state.selectedViews,
        patientName: state.patientName,
        examDate: state.examDate,
        patientId: state.patientId,
        reports: state.reports,
      }) as unknown as ReportState,
      onRehydrateStorage: () => {
        return (_state, error) => {
          if (error) {
            console.warn('[reportStore] Failed to rehydrate from sessionStorage:', error);
            return;
          }
          // Defer to next microtask so useReportStore is fully initialized
          queueMicrotask(() => hydrateImagesFromIndexedDB());
        };
      },
    }
  )
);

/**
 * Load all image data from IndexedDB back into the zustand store.
 * Called once after zustand finishes rehydrating metadata from sessionStorage.
 */
async function hydrateImagesFromIndexedDB() {
  try {
    const state = useReportStore.getState();

    // 1. Hydrate draft 2D images
    const draft2DEntries = await getImagesByPrefix('draft2d_');
    const restoredDraft2D = { ...state.draftImages2D };
    for (const [key, data] of Object.entries(draft2DEntries)) {
      const viewKey = key.replace('draft2d_', '');
      restoredDraft2D[viewKey] = data;
    }
    // Clear placeholder markers
    for (const key of Object.keys(restoredDraft2D)) {
      if (restoredDraft2D[key] === '__has_image__') {
        restoredDraft2D[key] = '';
      }
    }

    // 2. Hydrate draft 3D images
    const draft3DEntries = await getImagesByPrefix('draft3d_');
    const restoredDraft3D = await Promise.all(
      state.draftImages3D.map(async (img) => {
        const data = draft3DEntries[`draft3d_${img.id}`] || await getImage(`draft3d_${img.id}`);
        return { ...img, data: data || '' };
      })
    );

    // 3. Hydrate PDF images
    const pdfEntries = await getImagesByPrefix('pdf_');
    const restoredPdfImages = state.pdfImages.map((img, idx) => ({
      ...img,
      data: pdfEntries[`pdf_${idx}`] || '',
    }));

    // Apply all hydrated data at once
    useReportStore.setState({
      draftImages2D: restoredDraft2D,
      draftImages3D: restoredDraft3D.filter(img => img.data), // remove items without data
      pdfImages: restoredPdfImages.filter(img => img.data),   // remove items without data
      hydrated: true,
    });
  } catch (e) {
    console.warn('[reportStore] Failed to hydrate images from IndexedDB:', e);
    useReportStore.setState({ hydrated: true });
  }
}

export const images2D = {
  get 'sagittal-avf'() {
    return useReportStore.getState().draftImages2D['sagittal-avf'];
  },
  get 'sagittal-rvf'() {
    return useReportStore.getState().draftImages2D['sagittal-rvf'];
  },
  get coronal() {
    return useReportStore.getState().draftImages2D.coronal;
  },
  get posterior() {
    return useReportStore.getState().draftImages2D.posterior;
  },
};
