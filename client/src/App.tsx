import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Profile from "@/pages/profile";
import ThemeSelection from "@/pages/theme-selection";
import IndustrySelection from "@/pages/industry-selection";
import FrequencySelection from "@/pages/frequency-selection";
import SimulationSetup from "@/pages/simulation-setup";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/profile" component={Profile} />
      <Route path="/theme" component={ThemeSelection} />
      <Route path="/industry" component={IndustrySelection} />
      <Route path="/frequency" component={FrequencySelection} />
      <Route path="/simulation" component={SimulationSetup} />
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
