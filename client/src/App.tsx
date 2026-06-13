import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BottomNav } from "@/components/BottomNav";
import { ThemeProvider } from "@/components/ThemeProvider";
import { MotionProvider } from "@/lib/motion";
import Home from "@/pages/Home";

const About = lazy(() => import("@/pages/About"));
const Contact = lazy(() => import("@/pages/Contact"));
const Advertise = lazy(() => import("@/pages/Advertise"));
const AdvertiseSuccess = lazy(() => import("@/pages/AdvertiseSuccess"));
const NotFound = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function prefetchSecondaryRoutes() {
  void import("@/pages/About");
  void import("@/pages/Contact");
}

function scheduleIdleWork(work: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(work);
    return () => window.cancelIdleCallback(id);
  }

  const timer = window.setTimeout(work, 2_000);
  return () => window.clearTimeout(timer);
}

function Router() {
  useEffect(() => {
    return scheduleIdleWork(prefetchSecondaryRoutes);
  }, []);

  return (
    <>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/about">
          <Suspense fallback={null}>
            <About />
          </Suspense>
        </Route>
        <Route path="/contact">
          <Suspense fallback={null}>
            <Contact />
          </Suspense>
        </Route>
        <Route path="/advertise">
          <Suspense fallback={null}>
            <Advertise />
          </Suspense>
        </Route>
        <Route path="/advertise/success">
          <Suspense fallback={null}>
            <AdvertiseSuccess />
          </Suspense>
        </Route>
        <Route>
          <Suspense fallback={null}>
            <NotFound />
          </Suspense>
        </Route>
      </Switch>
      <BottomNav />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MotionProvider>
          <WouterRouter>
            <Router />
          </WouterRouter>
        </MotionProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
