import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Position3D } from '@shared/3d/projections';

export type Severity = 'superficial' | 'deep';
export type MarkerType = 'circle' | 'square' | 'triangle';

export interface Lesion {
  id: string;
  position: Position3D;
  severity: Severity;
  location?: string;
  observacoes?: string;
  size?: number;
  color?: string;
  markerType?: MarkerType;
}

const MAX_HISTORY = 50;

interface LesionStore {
  lesions: Lesion[];
  selectedLesionId: string | null;
  history: Lesion[][];
  historyIndex: number;

  addLesion: (lesion: Omit<Lesion, 'id'>) => string;
  updateLesion: (id: string, updates: Partial<Lesion>) => void;
  removeLesion: (id: string) => void;
  clearLesions: () => void;
  selectLesion: (id: string | null) => void;
  setLesions: (lesions: Lesion[]) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useLesionStore = create<LesionStore>()(
  persist(
    (set, get) => {
      const pushHistory = () => {
        const { lesions, history, historyIndex } = get();
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(lesions.map(l => ({ ...l })));
        if (newHistory.length > MAX_HISTORY) newHistory.shift();
        return { history: newHistory, historyIndex: newHistory.length - 1 };
      };

      return {
        lesions: [],
        selectedLesionId: null,
        history: [[]],
        historyIndex: 0,

        addLesion: (lesionData) => {
          const id = `lesion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const newLesion: Lesion = { ...lesionData, id };
          const hist = pushHistory();

          set((state) => ({
            lesions: [...state.lesions, newLesion],
            selectedLesionId: id,
            ...hist
          }));

          return id;
        },

        updateLesion: (id, updates) => {
          const hist = pushHistory();
          set((state) => ({
            lesions: state.lesions.map((lesion) =>
              lesion.id === id ? { ...lesion, ...updates } : lesion
            ),
            ...hist
          }));
        },

        removeLesion: (id) => {
          const hist = pushHistory();
          set((state) => ({
            lesions: state.lesions.filter((lesion) => lesion.id !== id),
            selectedLesionId: state.selectedLesionId === id ? null : state.selectedLesionId,
            ...hist
          }));
        },

        clearLesions: () => {
          const hist = pushHistory();
          set({ lesions: [], selectedLesionId: null, ...hist });
        },

        selectLesion: (id) => {
          set({ selectedLesionId: id });
        },

        setLesions: (lesions) => {
          const hist = pushHistory();
          set({ lesions, ...hist });
        },

        undo: () => {
          const { history, historyIndex } = get();
          if (historyIndex <= 0) return;
          const newIndex = historyIndex - 1;
          const restored = history[newIndex].map(l => ({ ...l }));
          set({ lesions: restored, historyIndex: newIndex, selectedLesionId: null });
        },

        redo: () => {
          const { history, historyIndex } = get();
          if (historyIndex >= history.length - 1) return;
          const newIndex = historyIndex + 1;
          const restored = history[newIndex].map(l => ({ ...l }));
          set({ lesions: restored, historyIndex: newIndex, selectedLesionId: null });
        },

        canUndo: () => {
          return get().historyIndex > 0;
        },

        canRedo: () => {
          const { history, historyIndex } = get();
          return historyIndex < history.length - 1;
        },
      };
    },
    {
      name: 'endomapper-lesions',
      partialize: (state) => ({
        lesions: state.lesions,
        selectedLesionId: state.selectedLesionId,
      }),
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
          }
        },
        removeItem: (name) => {
          if (typeof window === 'undefined') return;
          try {
            sessionStorage.removeItem(name);
          } catch {
          }
        },
      },
    }
  )
);
