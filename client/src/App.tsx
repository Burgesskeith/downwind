import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { lazy, Suspense } from "react";
import { isNativeApp } from "@/lib/platform";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNav } from "@/components/BottomNav";
import { ThemeProvider } from "@/components/ThemeProvider";

const Home             = lazy(() => import("@/pages/Home"));
const About            = lazy(() => import("@/pages/About"));
const Advertise      = lazy(() => import("@/pages/Advertise"));
const AdvertiseSuccess = lazy(() => import("@/pages/AdvertiseSuccess"));
const NotFound       = lazy(() => import("@/pages/not-found"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

function Router() {
  return (
    <>
      <Suspense fallback={null}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/about" component={About} />
          <Route path="/advertise" component={Advertise} />
          <Route path="/advertise/success" component={AdvertiseSuccess} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
      <BottomNav />
    </>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <MotionConfig reducedMotion={isNativeApp ? "always" : "user"}>
          <TooltipProvider>
            {/* BASE_URL ("./") is for asset paths only — using it as router base breaks Capacitor route matching */}
            <WouterRouter>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </MotionConfig>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
