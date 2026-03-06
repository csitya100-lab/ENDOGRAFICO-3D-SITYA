import AppSidebar from './AppSidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

export default function AppLayout({ 
  children, 
  title, 
  subtitle, 
  headerActions 
}: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <AppSidebar />
      
      <div className="flex-1 ml-16 flex flex-col h-screen overflow-hidden">
        {(title || headerActions) && (
          <header className="flex-none bg-white border-b border-slate-200 shadow-sm px-6 py-4 flex items-center justify-between z-10 dark:bg-slate-900 dark:border-slate-700">
            <div>
              {title && <h1 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h1>}
              {subtitle && <p className="text-xs text-slate-600 mt-0.5 dark:text-slate-400">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-3">
              {headerActions}
            </div>
          </header>
        )}
        
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
