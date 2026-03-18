import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter as Router, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import { GlobalSearch } from "./components/GlobalSearch";
import { CommandPalette } from "./components/CommandPalette";
import { CommandBar } from "./components/GestureControls";
import { MobileNav } from "./components/MobileNav";
import NLPCommandBar from "./components/NLPCommandBar";
import OnboardingTour from "./components/OnboardingTour";
import SeoManager from "./components/SeoManager";
import SmartSearch from "./components/SmartSearch";
import { ToastProvider } from "./components/Toast";
import UnifiedLayout from "./components/UnifiedLayout";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ThemeProvider } from "./utils/ThemeAndAccessibility";
import AcceptInvite from "./pages/AcceptInvite";
import AccountSettings from "./pages/AccountSettings";
import ActivityFeed from "./pages/ActivityFeed";
import AdvancedSearch from "./pages/AdvancedSearch";
import Analytics from "./pages/Analytics";
import APIKeys from "./pages/APIKeys";
import AskRecall from "./pages/AskRecall";
import AuditLogs from "./pages/AuditLogs";
import AutomationRules from "./pages/AutomationRules";
import Backlog from "./pages/Backlog";
import BlockerTracker from "./pages/BlockerTracker";
import Bookmarks from "./pages/Bookmarks";
import BookmarksAndDrafts from "./pages/BookmarksAndDrafts";
import BrowserDashboard from "./pages/BusinessDashboard";
import BurnoutRisk from "./pages/BurnoutRisk";
import CalendarPlanner from "./pages/CalendarPlanner";
import Conversations from "./pages/Conversations";
import ConversationDetail from "./pages/ConversationDetail";
import CreateConversation from "./pages/CreateConversation";
import CurrentSprint from "./pages/CurrentSprint";
import Dashboards from "./pages/Dashboards";
import DataExport from "./pages/DataExport";
import Decisions from "./pages/Decisions";
import DecisionDetail from "./pages/DecisionDetail";
import DecisionProposals from "./pages/DecisionProposals";
import DocumentDetail from "./pages/DocumentDetail";
import Documentation from "./pages/Documentation";
import Documents from "./pages/Documents";
import Drafts from "./pages/Drafts";
import Enterprise from "./pages/Enterprise";
import FAQ from "./pages/FAQ";
import Files from "./pages/Files";
import ForgotPassword from "./pages/ForgotPassword";
import GoalDetail from "./pages/GoalDetail";
import Goals from "./pages/Goals";
import Homepage from "./pages/Homepage";
import ImportExport from "./pages/ImportExport";
import Insights from "./pages/Insights";
import IntegrationManagement from "./pages/IntegrationManagement";
import Integrations from "./pages/Integrations";
import IssueDetail from "./pages/IssueDetail";
import IssueTemplates from "./pages/IssueTemplates";
import JourneyMaps from "./pages/JourneyMaps";
import KanbanBoard from "./pages/KanbanBoardFull";
import Knowledge from "./pages/Knowledge";
import KnowledgeAnalytics from "./pages/KnowledgeAnalytics";
import KnowledgeBase from "./pages/KnowledgeBase";
import KnowledgeGraph from "./pages/KnowledgeGraph";
import KnowledgeHealthDashboard from "./pages/KnowledgeHealthDashboard";
import Login from "./pages/Login";
import MeetingDetail from "./pages/MeetingDetail";
import Meetings from "./pages/Meetings";
import Messages from "./pages/Messages";
import MyDecisions from "./pages/MyDecisions";
import MyQuestions from "./pages/MyQuestions";
import NotificationSettings from "./pages/NotificationSettings";
import Notifications from "./pages/Notifications";
import Onboarding from "./pages/Onboarding";
import PersonalReflection from "./pages/PersonalReflection";
import PrivacyEnterprise from "./pages/PrivacyEnterprise";
import Profile from "./pages/Profile";
import ProjectDetail from "./pages/ProjectDetail";
import ProjectManagement from "./pages/ProjectManagement";
import ProjectRoadmap from "./pages/ProjectRoadmap";
import Projects from "./pages/Projects";
import Proposals from "./pages/Proposals";
import Releases from "./pages/Releases";
import Reports from "./pages/Reports";
import ResetPassword from "./pages/ResetPassword";
import RetrospectiveDetail from "./pages/RetrospectiveDetail";
import RetrospectiveMemory from "./pages/RetrospectiveMemory";
import SampleDecision from "./pages/SampleDecision";
import SavedFilters from "./pages/SavedFilters";
import Security from "./pages/Security";
import SecurityAnnex from "./pages/SecurityAnnex";
import ServiceDesk from "./pages/ServiceDesk";
import Settings from "./pages/Settings";
import SprintDetail from "./pages/SprintDetail";
import SprintHistory from "./pages/SprintHistory";
import SprintManagement from "./pages/SprintManagement";
import StaffInvitations from "./pages/StaffInvitations";
import Subscription from "./pages/Subscription";
import TasksBoard from "./pages/TasksBoard";
import TeamManagement from "./pages/TeamManagement";
import Templates from "./pages/Templates";
import TermsEnterprise from "./pages/TermsEnterprise";
import UnifiedDashboard from "./pages/UnifiedDashboard";
import Workflows from "./pages/Workflows";

function ProtectedRoute({ children, adminOnly = false }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicHomeRoute() {
  return <Homepage />;
}

function AppLayoutRoute() {
  return (
    <ProtectedRoute>
      <UnifiedLayout>
        <Outlet />
      </UnifiedLayout>
    </ProtectedRoute>
  );
}

function AdminOnlyRoute() {
  return (
    <ProtectedRoute adminOnly={true}>
      <Outlet />
    </ProtectedRoute>
  );
}

const PUBLIC_ROUTES = [
  { path: "/", element: <PublicHomeRoute /> },
  { path: "/home", element: <Navigate to="/" replace /> },
  { path: "/docs", element: <Documentation /> },
  { path: "/privacy", element: <PrivacyEnterprise /> },
  { path: "/terms", element: <TermsEnterprise /> },
  { path: "/security-annex", element: <SecurityAnnex /> },
  { path: "/login", element: <Login /> },
  { path: "/forgot-password", element: <ForgotPassword /> },
  { path: "/reset-password", element: <ResetPassword /> },
  { path: "/signup", element: <Navigate to="/login" replace /> },
  { path: "/invite/:token", element: <AcceptInvite /> },
];

const PUBLIC_ROUTE_PATHS = new Set([
  "/",
  "/home",
  "/docs",
  "/privacy",
  "/terms",
  "/security-annex",
  "/login",
  "/forgot-password",
  "/reset-password",
]);

function isPublicPath(pathname) {
  return PUBLIC_ROUTE_PATHS.has(pathname) || pathname.startsWith("/invite/");
}

const APP_ROUTES = [
  { path: "/dashboard", element: <UnifiedDashboard /> },
  { path: "/conversations", element: <Conversations /> },
  { path: "/conversations/new", element: <CreateConversation /> },
  { path: "/conversations/:id", element: <ConversationDetail /> },
  { path: "/decisions", element: <Decisions /> },
  { path: "/decisions/:id", element: <DecisionDetail /> },
  { path: "/knowledge", element: <Knowledge /> },
  { path: "/knowledge/graph", element: <KnowledgeGraph /> },
  { path: "/knowledge/analytics", element: <KnowledgeAnalytics /> },
  { path: "/knowledge-base", element: <KnowledgeBase /> },
  { path: "/knowledge-health", element: <KnowledgeHealthDashboard /> },
  { path: "/ask", element: <AskRecall /> },
  { path: "/insights", element: <Insights /> },
  { path: "/search", element: <AdvancedSearch /> },
  { path: "/activity", element: <ActivityFeed /> },
  { path: "/profile", element: <Profile /> },
  { path: "/onboarding", element: <Onboarding /> },
  { path: "/faq", element: <FAQ /> },
  { path: "/reflection", element: <PersonalReflection /> },
  { path: "/notifications", element: <Notifications /> },
  { path: "/notification-settings", element: <NotificationSettings /> },
  { path: "/bookmarks", element: <Bookmarks /> },
  { path: "/drafts", element: <Drafts /> },
  { path: "/files", element: <Files /> },
  { path: "/bookmarks-drafts", element: <BookmarksAndDrafts /> },
  { path: "/my-decisions", element: <MyDecisions /> },
  { path: "/my-questions", element: <MyQuestions /> },
  { path: "/sample-decision", element: <SampleDecision /> },
  { path: "/sprint", element: <CurrentSprint /> },
  { path: "/sprint-history", element: <SprintHistory /> },
  { path: "/sprint-management", element: <SprintManagement /> },
  { path: "/sprints", element: <Navigate to="/sprint-history" replace /> },
  { path: "/sprints/:id", element: <SprintDetail /> },
  { path: "/blockers", element: <BlockerTracker /> },
  { path: "/retrospectives", element: <RetrospectiveMemory /> },
  { path: "/sprints/:sprintId/retrospective", element: <RetrospectiveDetail /> },
  { path: "/proposals", element: <Proposals /> },
  { path: "/decision-proposals", element: <DecisionProposals /> },
  { path: "/projects", element: <Projects /> },
  { path: "/projects/:projectId", element: <ProjectDetail /> },
  { path: "/projects/:projectId/manage", element: <ProjectManagement /> },
  { path: "/projects/:projectId/roadmap", element: <ProjectRoadmap /> },
  { path: "/projects/:projectId/backlog", element: <Backlog /> },
  { path: "/projects/:projectId/releases", element: <Releases /> },
  { path: "/boards/:boardId", element: <KanbanBoard /> },
  { path: "/boards", element: <Navigate to="/projects" replace /> },
  { path: "/agile/templates", element: <IssueTemplates /> },
  { path: "/agile/filters", element: <SavedFilters /> },
  { path: "/issues/:issueId", element: <IssueDetail /> },
  { path: "/issues", element: <Navigate to="/projects" replace /> },
  { path: "/messages", element: <Messages /> },
  { path: "/messages/:userId", element: <Messages /> },
  { path: "/account-settings", element: <AccountSettings /> },
  { path: "/business", element: <BrowserDashboard /> },
  { path: "/business/goals", element: <Goals /> },
  { path: "/business/goals/:id", element: <GoalDetail /> },
  { path: "/business/meetings", element: <Meetings /> },
  { path: "/business/meetings/:id", element: <MeetingDetail /> },
  { path: "/business/tasks", element: <TasksBoard /> },
  { path: "/business/templates", element: <Templates /> },
  { path: "/business/documents", element: <Documents /> },
  { path: "/business/documents/:id", element: <DocumentDetail /> },
  { path: "/business/journeys", element: <JourneyMaps /> },
  { path: "/business/calendar", element: <CalendarPlanner /> },
  { path: "/business/team-health", element: <BurnoutRisk /> },
  { path: "/service-desk", element: <ServiceDesk /> },
  { path: "/security", element: <Security /> },
];

const ADMIN_ROUTES = [
  { path: "/settings", element: <Settings /> },
  { path: "/invitations", element: <StaffInvitations /> },
  { path: "/integrations", element: <Integrations /> },
  { path: "/integrations-manage", element: <IntegrationManagement /> },
  { path: "/analytics", element: <Analytics /> },
  { path: "/team", element: <TeamManagement /> },
  { path: "/automation", element: <AutomationRules /> },
  { path: "/workflows", element: <Workflows /> },
  { path: "/reports", element: <Reports /> },
  { path: "/dashboards", element: <Dashboards /> },
  { path: "/api-keys", element: <APIKeys /> },
  { path: "/audit-logs", element: <AuditLogs /> },
  { path: "/export", element: <DataExport /> },
  { path: "/subscription", element: <Subscription /> },
  { path: "/enterprise", element: <Enterprise /> },
  { path: "/import-export", element: <ImportExport /> },
];

function renderRoute(route, idx) {
  if (route.index) {
    return <Route key={`index-${idx}`} index element={route.element} />;
  }
  return <Route key={route.path} path={route.path} element={route.element} />;
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSearch, setShowSearch] = useState(false);
  const { user } = useAuth();
  const isPublicPage = isPublicPath(location.pathname);

  const commandRouteMap = useMemo(
    () => ({
      "create-issue": "/projects",
      "new-sprint": "/sprint-history",
      "show-blockers": "/blockers",
      "my-tasks": "/projects",
      "goto-dashboard": "/dashboard",
    }),
    []
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.defaultPrevented) return;
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const modKey = isMac ? event.metaKey : event.ctrlKey;
      if (modKey && event.key === "k") {
        if (document.querySelector('[data-unified-nav-search="true"]')) return;
        event.preventDefault();
        setShowSearch(true);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <SeoManager />
      {!isPublicPage ? <OnboardingTour /> : null}
      {!isPublicPage ? <SmartSearch /> : null}
      {!isPublicPage ? <NLPCommandBar /> : null}
      {!isOnline ? (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white p-2 text-center z-50">
          You are offline. Some features may be limited.
        </div>
      ) : null}
      {!isPublicPage ? <CommandPalette /> : null}
      {!isPublicPage ? <GlobalSearch isOpen={showSearch} onClose={() => setShowSearch(false)} /> : null}
      {user && !isPublicPage ? <MobileNav onSearchOpen={() => setShowSearch(true)} /> : null}
      {user && !isPublicPage ? (
        <CommandBar
          onCommand={(cmd) => {
            const destination = commandRouteMap[cmd];
            if (destination) navigate(destination);
          }}
        />
      ) : null}

      <Routes>
        {PUBLIC_ROUTES.map(renderRoute)}

        <Route element={<AppLayoutRoute />}>
          {APP_ROUTES.map(renderRoute)}
          <Route element={<AdminOnlyRoute />}>
            {ADMIN_ROUTES.map(renderRoute)}
          </Route>
        </Route>

        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Router>
              <AppContent />
            </Router>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
