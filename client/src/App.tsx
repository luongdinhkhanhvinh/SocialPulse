import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import AdminDashboard from "@/pages/admin-dashboard";
import OrderSession from "@/pages/order-session";
import OrderSummary from "@/pages/order-summary";

function Router() {
  return (
    <Switch>
      <Route path="/" component={AdminDashboard} />
      <Route path="/order/:sessionLink" component={OrderSession} />
      <Route path="/summary/:sessionId" component={OrderSummary} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
