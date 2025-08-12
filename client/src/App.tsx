import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "@/pages/login";
import SaasSelection from "@/pages/saas-selection";
import HubSpotSetup from "@/pages/hubspot-setup";
import ThemeSelection from "@/pages/theme-selection";
import IndustrySelection from "@/pages/industry-selection";
import RecordFrequency from "@/pages/record-frequency";
import ProgressPage from "@/pages/progress-page";
import ProfilePage from "@/pages/profile-page";
import NotFound from "@/pages/not-found";
import DevBypass from "@/components/dev-bypass";
import FloatingMenu from "@/components/floating-menu";
import { AudioPlayer } from "@/components/audio-player";

function Router() {
  return (
    <>
      <Switch>
        <Route path="/" component={SaasSelection} />
        <Route path="/login" component={Login} />
        <Route path="/saas-selection" component={SaasSelection} />
        <Route path="/hubspot-setup" component={HubSpotSetup} />
        <Route path="/theme-selection" component={ThemeSelection} />
        <Route path="/industry-selection" component={IndustrySelection} />
        <Route path="/record-frequency" component={RecordFrequency} />
        <Route path="/progress" component={ProgressPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route component={NotFound} />
      </Switch>
      <FloatingMenu />
      <AudioPlayer />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <DevBypass>
          <Toaster />
          <Router />
        </DevBypass>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
