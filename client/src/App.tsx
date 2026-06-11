import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "./lib/ThemeContext";
import { ProjectSettingsProvider } from "./lib/ProjectSettingsContext";
import { AuthProvider, useAuth } from "./lib/AuthContext";
import { FavoritesProvider } from "./lib/FavoritesContext";
import ProjectLayout from "@/components/layout/ProjectLayout";

import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import LoginPage from "@/pages/login";
import SubmittalsPage from "@/pages/submittals";
import SubmittalDetailPage from "@/pages/submittal-detail";
import RfisPage from "@/pages/rfis";
import RfiDetailPage from "@/pages/rfi-detail";
import DrawingsPage from "@/pages/drawings";
import DrawingViewerPage from "@/pages/drawing-viewer";
import SpecificationsPage from "@/pages/specifications";
import DailyLogPage from "@/pages/daily-log";
import PunchListPage from "@/pages/punch-list";
import PunchDetailPage from "@/pages/punch-detail";
import PrimeContractPage from "@/pages/prime-contract";
import ChangeEventsPage from "@/pages/change-events";
import ChangeEventDetailPage from "@/pages/change-event-detail";
import ChangeOrdersPage from "@/pages/change-orders";
import ChangeOrderDetailPage from "@/pages/change-order-detail";
import BudgetPage from "@/pages/budget";
import DirectoryPage from "@/pages/directory";
import CommitmentsPage from "@/pages/commitments";
import CommitmentDetailPage from "@/pages/commitment-detail";
import InvoicingPage from "@/pages/invoicing";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/submittals" component={SubmittalsPage} />
      <Route path="/submittals/:id" component={SubmittalDetailPage} />
      <Route path="/rfis" component={RfisPage} />
      <Route path="/rfis/:id" component={RfiDetailPage} />
      <Route path="/drawings" component={DrawingsPage} />
      <Route path="/drawings/:id" component={DrawingViewerPage} />
      <Route path="/specifications" component={SpecificationsPage} />
      <Route path="/daily-log" component={DailyLogPage} />
      <Route path="/punch-list" component={PunchListPage} />
      <Route path="/punch-list/:id" component={PunchDetailPage} />
      <Route path="/prime-contract" component={PrimeContractPage} />
      <Route path="/change-events" component={ChangeEventsPage} />
      <Route path="/change-events/:id" component={ChangeEventDetailPage} />
      <Route path="/change-orders" component={ChangeOrdersPage} />
      <Route path="/change-orders/:id" component={ChangeOrderDetailPage} />
      <Route path="/budget" component={BudgetPage} />
      <Route path="/directory" component={DirectoryPage} />
      <Route path="/commitments" component={CommitmentsPage} />
      <Route path="/commitments/:id" component={CommitmentDetailPage} />
      <Route path="/invoicing" component={InvoicingPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading project...
      </div>
    );
  }

  if (!user) return <LoginPage />;

  return (
    <FavoritesProvider>
      <ProjectLayout>
        <Router />
      </ProjectLayout>
    </FavoritesProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ProjectSettingsProvider>
          <AuthProvider>
            <AuthenticatedApp />
            <Toaster />
          </AuthProvider>
        </ProjectSettingsProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
