import { Suspense, lazy, useEffect, useMemo, useState } from "react";
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

const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const ActivityFeed = lazy(() => import("./pages/ActivityFeed"));
const AdvancedSearch = lazy(() => import("./pages/AdvancedSearch"));
const APIKeys = lazy(() => import("./pages/APIKeys"));
const AskRecall = lazy(() => import("./pages/AskRecall"));
const AuditLogs = lazy(() => import("./pages/AuditLogs"));
const AutomationRules = lazy(() => import("./pages/AutomationRules"));
const Backlog = lazy(() => import("./pages/Backlog"));
const BlockerTracker = lazy(() => import("./pages/BlockerTracker"));
const Bookmarks = lazy(() => import("./pages/Bookmarks"));
const Conversations = lazy(() => import("./pages/Conversations"));
const ConversationDetail = lazy(() => import("./pages/ConversationDetail"));
const CreateConversation = lazy(() => import("./pages/CreateConversation"));
const CurrentSprint = lazy(() => import("./pages/CurrentSprint"));
const DataExport = lazy(() => import("./pages/DataExport"));
const Decisions = lazy(() => import("./pages/Decisions"));
const DecisionDetail = lazy(() => import("./pages/DecisionDetail"));
const DecisionProposals = lazy(() => import("./pages/DecisionProposals"));
const DocumentDetail = lazy(() => import("./pages/DocumentDetail"));
const Documentation = lazy(() => import("./pages/Documentation"));
const Documents = lazy(() => import("./pages/Documents"));
const Drafts = lazy(() => import("./pages/Drafts"));
const Enterprise = lazy(() => import("./pages/Enterprise"));
const Feedback = lazy(() => import("./pages/Feedback"));
const FeedbackInbox = lazy(() => import("./pages/FeedbackInbox"));
const Files = lazy(() => import("./pages/Files"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const GoalDetail = lazy(() => import("./pages/GoalDetail"));
const Goals = lazy(() => import("./pages/Goals"));
const Homepage = lazy(() => import("./pages/Homepage"));
const ImportExport = lazy(() => import("./pages/ImportExport"));
const Insights = lazy(() => import("./pages/Insights"));
const Integrations = lazy(() => import("./pages/Integrations"));
const IssueDetail = lazy(() => import("./pages/IssueDetail"));
const IssueTemplates = lazy(() => import("./pages/IssueTemplates"));
const KanbanBoard = lazy(() => import("./pages/KanbanBoardFull"));
const Knowledge = lazy(() => import("./pages/Knowledge"));
const KnowledgeAnalytics = lazy(() => import("./pages/KnowledgeAnalytics"));
const KnowledgeBase = lazy(() => import("./pages/KnowledgeBase"));
const KnowledgeGraph = lazy(() => import("./pages/KnowledgeGraph"));
const KnowledgeHealthDashboard = lazy(() => import("./pages/KnowledgeHealthDashboard"));
const Login = lazy(() => import("./pages/Login"));
const MeetingDetail = lazy(() => import("./pages/MeetingDetail"));
const Meetings = lazy(() => import("./pages/Meetings"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Partners = lazy(() => import("./pages/Partners"));
const PartnerInbox = lazy(() => import("./pages/PartnerInbox"));
const PrivacyEnterprise = lazy(() => import("./pages/PrivacyEnterprise"));
const Profile = lazy(() => import("./pages/Profile"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const ProjectManagement = lazy(() => import("./pages/ProjectManagement"));
const ProjectRoadmap = lazy(() => import("./pages/ProjectRoadmap"));
const Projects = lazy(() => import("./pages/Projects"));
const Proposals = lazy(() => import("./pages/Proposals"));
const Releases = lazy(() => import("./pages/Releases"));
const Reports = lazy(() => import("./pages/Reports"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const RetrospectiveDetail = lazy(() => import("./pages/RetrospectiveDetail"));
const RetrospectiveMemory = lazy(() => import("./pages/RetrospectiveMemory"));
const SavedFilters = lazy(() => import("./pages/SavedFilters"));
const Security = lazy(() => import("./pages/Security"));
const SecurityAnnex = lazy(() => import("./pages/SecurityAnnex"));
const Settings = lazy(() => import("./pages/Settings"));
const SprintDetail = lazy(() => import("./pages/SprintDetail"));
const SprintHistory = lazy(() => import("./pages/SprintHistory"));
const SprintManagement = lazy(() => import("./pages/SprintManagement"));
const StaffInvitations = lazy(() => import("./pages/StaffInvitations"));
const Subscription = lazy(() => import("./pages/Subscription"));
const TasksBoard = lazy(() => import("./pages/TasksBoard"));
const TeamManagement = lazy(() => import("./pages/TeamManagement"));
const Templates = lazy(() => import("./pages/Templates"));
const TermsEnterprise = lazy(() => import("./pages/TermsEnterprise"));
const UnifiedDashboard = lazy(() => import("./pages/UnifiedDashboard"));

const lazyMvpSurface = (exportName) =>
  lazy(() => import("./pages/MvpSurfaces").then((module) => ({ default: module[exportName] })));

const AnalyticsOverview = lazyMvpSurface("AnalyticsOverview");
const BusinessCalendar = lazyMvpSurface("BusinessCalendar");
const BusinessJourneys = lazyMvpSurface("BusinessJourneys");
const DashboardDetail = lazyMvpSurface("DashboardDetail");
const Dashboards = lazyMvpSurface("Dashboards");
const JourneyDetail = lazyMvpSurface("JourneyDetail");
const ServiceDesk = lazyMvpSurface("ServiceDesk");
const TeamHealth = lazyMvpSurface("TeamHealth");

function RouteLoading() {
  return (
    <div style={{ minHeight: "45vh", display: "grid", placeItems: "center", padding: 32 }}>
      <div style={{ display: "grid", gap: 10, justifyItems: "center", color: "#2563eb" }}>
        <div
          aria-hidden="true"
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "3px solid rgba(37, 99, 235, 0.18)",
            borderTopColor: "#2563eb",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Loading workspace</span>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, adminOnly = false, staffOnly = false }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  if (staffOnly && !user.is_staff && !user.is_superuser) return <Navigate to="/dashboard" replace />;
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

function StaffOnlyRoute() {
  return (
    <ProtectedRoute>
      <Outlet />
    </ProtectedRoute>
  );
}

const PUBLIC_ROUTES = [
  { path: "/", element: <PublicHomeRoute /> },
  { path: "/home", element: <Navigate to="/" replace /> },
  { path: "/docs/*", element: <Documentation /> },
  { path: "/feedback", element: <Feedback /> },
  { path: "/partners", element: <Partners /> },
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
  "/feedback",
  "/partners",
  "/privacy",
  "/terms",
  "/security-annex",
  "/login",
  "/forgot-password",
  "/reset-password",
]);

function isPublicPath(pathname) {
  return pathname === "/docs" || pathname.startsWith("/docs/") || PUBLIC_ROUTE_PATHS.has(pathname) || pathname.startsWith("/invite/");
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
  { path: "/profile/:userId", element: <Profile /> },
  { path: "/onboarding", element: <Onboarding /> },
  { path: "/faq", element: <Navigate to="/knowledge" replace /> },
  { path: "/reflection", element: <Navigate to="/knowledge" replace /> },
  { path: "/notifications", element: <Notifications /> },
  { path: "/notification-settings", element: <NotificationSettings /> },
  { path: "/bookmarks", element: <Bookmarks /> },
  { path: "/drafts", element: <Drafts /> },
  { path: "/files", element: <Files /> },
  { path: "/bookmarks-drafts", element: <Navigate to="/bookmarks" replace /> },
  { path: "/my-decisions", element: <Navigate to="/decisions" replace /> },
  { path: "/my-questions", element: <Navigate to="/knowledge" replace /> },
  { path: "/sample-decision", element: <Navigate to="/decisions" replace /> },
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
  { path: "/messages", element: <Navigate to="/notifications" replace /> },
  { path: "/messages/:userId", element: <Navigate to="/notifications" replace /> },
  { path: "/account-settings", element: <Navigate to="/profile" replace /> },
  { path: "/business", element: <Navigate to="/dashboard" replace /> },
  { path: "/business/goals", element: <Goals /> },
  { path: "/business/goals/:id", element: <GoalDetail /> },
  { path: "/business/meetings", element: <Meetings /> },
  { path: "/business/meetings/:id", element: <MeetingDetail /> },
  { path: "/business/tasks", element: <TasksBoard /> },
  { path: "/business/templates", element: <Templates /> },
  { path: "/business/documents", element: <Documents /> },
  { path: "/business/documents/:id", element: <DocumentDetail /> },
  { path: "/business/journeys", element: <BusinessJourneys /> },
  { path: "/business/journeys/:id", element: <JourneyDetail /> },
  { path: "/business/calendar", element: <BusinessCalendar /> },
  { path: "/business/team-health", element: <TeamHealth /> },
  { path: "/service-desk", element: <ServiceDesk /> },
  { path: "/security", element: <Security /> },
];

const ADMIN_ROUTES = [
  { path: "/settings", element: <Settings /> },
  { path: "/invitations", element: <StaffInvitations /> },
  { path: "/integrations", element: <Integrations /> },
  { path: "/integrations/github", element: <Navigate to="/integrations" replace /> },
  { path: "/integrations-manage", element: <Navigate to="/integrations" replace /> },
  { path: "/analytics", element: <AnalyticsOverview /> },
  { path: "/team", element: <TeamManagement /> },
  { path: "/automation", element: <AutomationRules /> },
  { path: "/workflows", element: <Navigate to="/automation" replace /> },
  { path: "/reports", element: <Reports /> },
  { path: "/dashboards", element: <Dashboards /> },
  { path: "/dashboards/:id", element: <DashboardDetail /> },
  { path: "/api-keys", element: <APIKeys /> },
  { path: "/audit-logs", element: <AuditLogs /> },
  { path: "/export", element: <DataExport /> },
  { path: "/subscription", element: <Subscription /> },
  { path: "/enterprise", element: <Enterprise /> },
  { path: "/import-export", element: <ImportExport /> },
];

const STAFF_ROUTES = [
  { path: "/feedback/inbox", element: <FeedbackInbox /> },
  { path: "/partners/inbox", element: <PartnerInbox /> },
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

      <Suspense fallback={<RouteLoading />}>
        <Routes>
          {PUBLIC_ROUTES.map(renderRoute)}

          <Route element={<AppLayoutRoute />}>
            {APP_ROUTES.map(renderRoute)}
            <Route element={<AdminOnlyRoute />}>
              {ADMIN_ROUTES.map(renderRoute)}
            </Route>
            <Route element={<StaffOnlyRoute />}>
              {STAFF_ROUTES.map(renderRoute)}
            </Route>
          </Route>

          <Route path="*" element={<Navigate to={user ? "/dashboard" : "/"} replace />} />
        </Routes>
      </Suspense>
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
