import { useState } from 'react';
import { Eye, EyeOff, Heart, Workflow, Shield, ChevronDown, ChevronRight } from 'lucide-react';
import { useAnatomyStore, ANATOMY_ELEMENTS, type AnatomyElement } from '@/lib/anatomyStore';
import { Button } from '@/components/ui/button';

const CATEGORIES: { label: string; ids: AnatomyElement[]; Icon: typeof Heart }[] = [
  { label: 'Órgãos Reprodutivos', ids: ['uterus', 'cervix', 'ovaries', 'fallopianTubes'], Icon: Heart },
  { label: 'Ligamentos', ids: ['uterosacrals', 'roundLigaments'], Icon: Workflow },
  { label: 'Estruturas Adjacentes', ids: ['ureters', 'bladder', 'rectum', 'intestine'], Icon: Shield },
];

export function AnatomyPanel() {
  const { visibility, toggleVisibility, showAll, hideAll } = useAnatomyStore();
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Órgãos Reprodutivos']));

  const elementsById = Object.fromEntries(ANATOMY_ELEMENTS.map((el) => [el.id, el]));

  const toggleCategory = (label: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  // Double-click to isolate (show only this element)
  const handleIsolate = (id: AnatomyElement) => {
    hideAll();
    toggleVisibility(id);
  };

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 mb-2">
        <Button variant="outline" size="sm" onClick={showAll} className="h-6 px-2 text-[10px] text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-500/30 dark:hover:bg-emerald-500/10 flex items-center gap-1">
          <Eye className="w-2.5 h-2.5" />
          Todos
        </Button>
        <Button variant="outline" size="sm" onClick={hideAll} className="h-6 px-2 text-[10px] text-slate-500 border-slate-200 hover:bg-slate-50 dark:text-slate-400 dark:border-slate-600 dark:hover:bg-slate-700 flex items-center gap-1">
          <EyeOff className="w-2.5 h-2.5" />
          Nenhum
        </Button>
      </div>

      {CATEGORIES.map((category) => {
        const isExpanded = expandedCategories.has(category.label);
        const visibleCount = category.ids.filter(id => visibility[id]).length;

        return (
          <div key={category.label}>
            <button
              onClick={() => toggleCategory(category.label)}
              className="w-full flex items-center gap-1.5 px-1 py-1 text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              {category.label}
              <span className="ml-auto text-[9px] font-normal tabular-nums">{visibleCount}/{category.ids.length}</span>
            </button>
            {isExpanded && (
              <div className="space-y-0.5 ml-1">
                {category.ids.map((id) => {
                  const element = elementsById[id];
                  if (!element) return null;
                  const isVisible = visibility[id];
                  return (
                    <button
                      key={id}
                      onClick={() => toggleVisibility(id)}
                      onDoubleClick={(e) => { e.stopPropagation(); handleIsolate(id); }}
                      className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors ${isVisible
                          ? 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800'
                          : 'text-slate-400 hover:bg-slate-100 opacity-50 dark:text-slate-500 dark:hover:bg-slate-800/50'
                        }`}
                      data-testid={`toggle-${id}`}
                      title="Duplo-clique para isolar"
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: element.color }}
                      />
                      <span className="flex-1 text-left font-medium truncate">
                        {element.label}
                      </span>
                      {isVisible ? (
                        <Eye className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
