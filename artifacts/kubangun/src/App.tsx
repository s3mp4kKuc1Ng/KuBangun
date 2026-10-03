import { lazy, Suspense, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import { StoreProvider } from '@/lib/store';
import { Shell } from '@/components/shell';
import { useLanguage } from '@/lib/i18n/context';

const NotFound = lazy(() => import('@/pages/not-found'));
const Dashboard = lazy(() => import('@/pages/dashboard'));
const Projects = lazy(() => import('@/pages/projects'));
const NewProject = lazy(() => import('@/pages/new-project'));
const ProjectPage = lazy(() => import('@/pages/project'));
const Reports = lazy(() => import('@/pages/reports'));
const SettingsPage = lazy(() => import('@/pages/settings'));

const queryClient = new QueryClient();

function Router() {
  return (
    <Shell>
      <RoutedErrorBoundary>
        <Suspense
          fallback={
            <div
              className="flex min-h-[45vh] items-center justify-center text-sm text-muted-foreground"
              role="status"
            >
              Memuat halaman…
            </div>
          }
        >
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/projects" component={Projects} />
            <Route path="/projects/new" component={NewProject} />
            <Route path="/projects/:id" component={ProjectPage} />
            <Route path="/reports" component={Reports} />
            <Route path="/settings" component={SettingsPage} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </RoutedErrorBoundary>
    </Shell>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  // Rerender date/number formatters without remounting pages or discarding drafts.
  useLanguage();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <StoreProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
        </StoreProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
