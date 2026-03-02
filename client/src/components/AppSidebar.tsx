import { useLocation } from 'wouter';
import { 
  MapPin, 
  HelpCircle,
  Grid3x3,
  Home,
  FileText,
  Sun,
  Moon
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useThemeStore } from '@/lib/themeStore';
import { useLesionStore } from '@/lib/lesionStore';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    path: '/',
    label: 'Início',
    icon: <Home className="w-5 h-5" />,
    description: 'Página inicial'
  },
  {
    path: '/3d',
    label: '3D',
    icon: <MapPin className="w-5 h-5" />,
    description: 'Modelo 3D rotacional'
  },
  {
    path: '/vistas-2d',
    label: '2D',
    icon: <Grid3x3 className="w-5 h-5" />,
    description: 'Editor de vistas planares'
  },
  {
    path: '/preview-report',
    label: 'PDF',
    icon: <FileText className="w-5 h-5" />,
    description: 'Prévia do relatório'
  },
];

export default function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { theme, toggleTheme } = useThemeStore();
  const lesionCount = useLesionStore((s) => s.lesions.length);

  return (
    <aside className="fixed left-0 top-0 h-screen w-16 bg-slate-900 dark:bg-slate-900 flex flex-col items-center py-4 z-50">
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center mb-6">
        <MapPin className="w-5 h-5 text-white" />
      </div>

      <nav role="navigation" className="flex-1 flex flex-col items-center gap-1 w-full px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.path;
          const is3DItem = item.path === '/3d';
          return (
            <Tooltip key={item.path} delayDuration={100}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setLocation(item.path)}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  aria-label={item.description}
                  aria-current={isActive ? 'page' : undefined}
                  className={`
                    relative w-full h-11 flex items-center justify-center rounded-lg transition-all duration-200
                    focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:outline-none
                    ${isActive 
                      ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/30' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }
                  `}
                >
                  {item.icon}
                  {is3DItem && lesionCount > 0 && (
                    <span
                      data-testid="badge-lesion-count"
                      className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center"
                    >
                      {lesionCount}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
                <p className="font-medium">{item.label}</p>
                <p className="text-xs text-slate-400">{item.description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </nav>

      <div className="flex flex-col items-center gap-1 w-full px-2 pt-4 border-t border-slate-800">
        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <button 
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
              className="w-full h-11 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:outline-none"
              data-testid="nav-theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
            <p className="font-medium">{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</p>
            <p className="text-xs text-slate-400">Alternar tema</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip delayDuration={100}>
          <TooltipTrigger asChild>
            <button 
              onClick={() => setLocation('/')}
              aria-label="Ajuda e instruções de uso"
              className="w-full h-11 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:outline-none"
              data-testid="nav-help"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-slate-800 text-white border-slate-700">
            <p className="font-medium">Ajuda</p>
            <p className="text-xs text-slate-400">Instruções de uso</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
