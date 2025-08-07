import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import SaasSelection from "@/pages/saas-selection";
import HubSpotSetup from "@/pages/hubspot-setup";
import ThemeSelection from "@/pages/theme-selection";
import IndustrySelection from "@/pages/industry-selection";
import RecordFrequency from "@/pages/record-frequency";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/saas-selection" component={SaasSelection} />
      <Route path="/hubspot-setup" component={HubSpotSetup} />
      <Route path="/theme-selection" component={ThemeSelection} />
      <Route path="/industry-selection" component={IndustrySelection} />
      <Route path="/record-frequency" component={RecordFrequency} />
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
