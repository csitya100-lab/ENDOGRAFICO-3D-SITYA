import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { MapPin, Grid3x3, FileText, ArrowRight, Stethoscope, Target, Layers, LogIn, LogOut } from 'lucide-react';
import AppSidebar from '@/components/AppSidebar';

export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-gray-50 to-gray-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-gray-900 dark:text-white transition-colors">
      <AppSidebar />
      <header className="py-6 px-8 ml-16 flex items-center justify-between border-b border-gray-200 dark:border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">EndoMapper</h1>
            <p className="text-xs text-gray-500 dark:text-slate-400">Mapeamento de Endometriose</p>
          </div>
        </div>
        <div className="flex items-center gap-3" />
      </header>

      <main className="max-w-5xl mx-auto px-8 py-12 ml-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-pink-100 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 rounded-full text-sm font-medium mb-4">
            <Stethoscope className="w-4 h-4" />
            Ferramenta Médica Profissional
          </div>
          <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-pink-400 to-rose-500 bg-clip-text text-transparent">
            Sistema de Mapeamento de Lesões
          </h2>
          <p className="text-gray-600 dark:text-slate-400 text-lg max-w-2xl mx-auto">
            Ferramenta profissional para visualização e documentação de lesões de endometriose, 
            auxiliando no planejamento cirúrgico e comunicação médica.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <div 
            onClick={() => setLocation('/3d')}
            className="animate-fade-in-up bg-white dark:bg-slate-800/50 rounded-xl p-6 border border-gray-200 dark:border-slate-700 hover:border-pink-500/50 transition-all cursor-pointer group shadow-sm"
            style={{ animationDelay: '0ms' }}
            data-testid="card-3d"
          >
            <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <MapPin className="w-7 h-7 text-rose-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
              Modelo 3D
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-gray-600 dark:text-slate-400 text-sm mb-4">
              Visualize o modelo anatômico rotacional do útero e estruturas adjacentes em 3D.
            </p>
            <ul className="text-xs text-gray-500 dark:text-slate-500 space-y-1">
              <li className="flex items-center gap-2"><Target className="w-3 h-3" /> Rotação 360°</li>
              <li className="flex items-center gap-2"><Layers className="w-3 h-3" /> Marcadores de lesões</li>
              <li className="flex items-center gap-2"><Stethoscope className="w-3 h-3" /> Classificação por severidade</li>
            </ul>
          </div>

          <div 
            onClick={() => setLocation('/vistas-2d')}
            className="animate-fade-in-up bg-white dark:bg-slate-800/50 rounded-xl p-6 border border-gray-200 dark:border-slate-700 hover:border-pink-500/50 transition-all cursor-pointer group shadow-sm"
            style={{ animationDelay: '150ms' }}
            data-testid="card-2d"
          >
            <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Grid3x3 className="w-7 h-7 text-rose-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
              Editor 2D
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-gray-600 dark:text-slate-400 text-sm mb-4">
              Edite as vistas 2D (sagital, coronal, posterior) com ferramentas de anotação.
            </p>
            <ul className="text-xs text-gray-500 dark:text-slate-500 space-y-1">
              <li className="flex items-center gap-2"><Target className="w-3 h-3" /> Caneta, linha, círculo</li>
              <li className="flex items-center gap-2"><Layers className="w-3 h-3" /> Cores e espessuras</li>
              <li className="flex items-center gap-2"><Stethoscope className="w-3 h-3" /> Preenchimento reticulado</li>
            </ul>
          </div>

          <div 
            onClick={() => setLocation('/preview-report')}
            className="animate-fade-in-up bg-white dark:bg-slate-800/50 rounded-xl p-6 border border-gray-200 dark:border-slate-700 hover:border-pink-500/50 transition-all cursor-pointer group shadow-sm"
            style={{ animationDelay: '300ms' }}
            data-testid="card-report"
          >
            <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <FileText className="w-7 h-7 text-rose-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
              Relatório
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-gray-600 dark:text-slate-400 text-sm mb-4">
              Gere relatórios PDF profissionais com as imagens anotadas e observações.
            </p>
            <ul className="text-xs text-gray-500 dark:text-slate-500 space-y-1">
              <li className="flex items-center gap-2"><Target className="w-3 h-3" /> Exportação PDF</li>
              <li className="flex items-center gap-2"><Layers className="w-3 h-3" /> Observações médicas</li>
              <li className="flex items-center gap-2"><Stethoscope className="w-3 h-3" /> Formato A4</li>
            </ul>
          </div>
        </div>

        <div className="animate-fade-in-up bg-white dark:bg-slate-800/30 rounded-xl p-8 border border-gray-200 dark:border-slate-700 shadow-sm" style={{ animationDelay: '600ms' }}>
          <h3 className="text-xl font-semibold mb-6 text-center">Como Usar</h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-pink-500/20 text-pink-500 dark:text-pink-400 flex items-center justify-center mx-auto mb-3 text-lg font-bold">1</div>
              <h4 className="font-medium mb-2">Visualize em 3D</h4>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Use o modelo 3D para ter uma visão geral das estruturas e posicionar lesões no espaço tridimensional.
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-pink-500/20 text-pink-500 dark:text-pink-400 flex items-center justify-center mx-auto mb-3 text-lg font-bold">2</div>
              <h4 className="font-medium mb-2">Anote em 2D</h4>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                No editor 2D, desenhe anotações precisas nas vistas planares usando as ferramentas disponíveis.
              </p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-pink-500/20 text-pink-500 dark:text-pink-400 flex items-center justify-center mx-auto mb-3 text-lg font-bold">3</div>
              <h4 className="font-medium mb-2">Exporte o Relatório</h4>
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Selecione as vistas desejadas e gere um PDF profissional para referência cirúrgica.
              </p>
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <Button
            onClick={() => setLocation('/3d')}
            className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-5 text-base font-medium"
            data-testid="button-start"
          >
            Começar
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </main>

      <footer className="py-6 text-center text-gray-500 dark:text-slate-500 text-sm border-t border-gray-200 dark:border-slate-800/50 ml-16">
        <p>EndoMapper © {new Date().getFullYear()} — Sistema de Mapeamento de Endometriose</p>
        <p className="mt-1">Desenvolvido por Cláudio Sityá</p>
      </footer>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}

