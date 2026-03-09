import { Switch, Route } from "wouter";
import { useEffect, lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useThemeStore } from "@/lib/themeStore";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import PageTransition from "@/components/PageTransition";

const Landing = lazy(() => import("@/pages/Landing"));
const Home = lazy(() => import("@/pages/Home"));
const Vistas2D = lazy(() => import("@/pages/Vistas2D"));
const PublicReport = lazy(() => import("@/pages/PublicReport"));
const PrintReport = lazy(() => import("@/pages/PrintReport"));
const PreviewReport = lazy(() => import("@/pages/PreviewReport"));
const NotFound = lazy(() => import("@/pages/not-found"));

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      window.location.href = "/api/login";
    }
  }, [isLoading, isAuthenticated]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
      </div>
    );
  }

  return <>{children}</>;
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Carregando...</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <PageTransition>
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/3d">
            <AuthGuard><Home /></AuthGuard>
          </Route>
          <Route path="/vistas-2d">
            <AuthGuard><Vistas2D /></AuthGuard>
          </Route>
          <Route path="/relatorio/:id" component={PublicReport} />
          <Route path="/imprimir">
            <AuthGuard><PrintReport /></AuthGuard>
          </Route>
          <Route path="/preview-report">
            <AuthGuard><PreviewReport /></AuthGuard>
          </Route>
          <Route component={NotFound} />
        </Switch>
      </PageTransition>
    </Suspense>
  );
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();
  
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
  }, [theme]);
  
  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <SonnerToaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
