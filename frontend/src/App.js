import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './components/Toast';
import { ThemeProvider } from './utils/ThemeAndAccessibility';
import { CommandPalette } from './components/CommandPalette';
import { GlobalSearch } from './components/GlobalSearch';
import { OnboardingFlow } from './components/OnboardingFlow';
import { MobileNav } from './components/MobileNav';
import { CommandBar } from './components/GestureControls';
import NLPCommandBar from './components/NLPCommandBar';
import ImpactAnalysisModal from './components/ImpactAnalysisModal';
import SuccessRateTracker from './components/SuccessRateTracker';
import OnboardingTour from './components/OnboardingTour';
import ErrorBoundary from './components/ErrorBoundary';
import UnifiedLayout from './components/UnifiedLayout';
import SmartSearch from './components/SmartSearch';
import SeoManager from './components/SeoManager';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AcceptInvite from './pages/AcceptInvite';
import Dashboard from './pages/Dashboard';
import UnifiedDashboard from './pages/UnifiedDashboard';
import Conversations from './pages/Conversations';
import CreateConversation from './pages/CreateConversation';
import ConversationDetail from './pages/ConversationDetail';
import Decisions from './pages/Decisions';
import DecisionDetail from './pages/DecisionDetail';
import Knowledge from './pages/Knowledge';
import AskRecall from './pages/AskRecall';
import Insights from './pages/Insights';
import ActivityFeed from './pages/ActivityFeed';
import Settings from './pages/Settings';
import StaffInvitations from './pages/StaffInvitations';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Bookmarks from './pages/Bookmarks';
import Drafts from './pages/Drafts';
import Files from './pages/Files';
import Onboarding from './pages/Onboarding';
import FAQ from './pages/FAQ';
import PersonalReflection from './pages/PersonalReflection';
import MyDecisions from './pages/MyDecisions';
import MyQuestions from './pages/MyQuestions';
import SampleDecision from './pages/SampleDecision';
import KnowledgeHealthDashboard from './pages/KnowledgeHealthDashboard';
import CurrentSprint from './pages/CurrentSprint';
import SprintHistory from './pages/SprintHistory';
import SprintManagement from './pages/SprintManagement';
import SprintDetail from './pages/SprintDetail';
import BlockerTracker from './pages/BlockerTracker';
import RetrospectiveMemory from './pages/RetrospectiveMemory';
import Integrations from './pages/Integrations';
import Proposals from './pages/Proposals';
import Analytics from './pages/Analytics';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import ProjectRoadmap from './pages/ProjectRoadmap';
import KanbanBoard from './pages/KanbanBoardFull';
import ProjectManagement from './pages/ProjectManagement';
import TeamManagement from './pages/TeamManagement';
import AutomationRules from './pages/AutomationRules';
import Workflows from './pages/Workflows';
import Reports from './pages/Reports';
import Dashboards from './pages/Dashboards';
import APIKeys from './pages/APIKeys';
import AuditLogs from './pages/AuditLogs';
import DataExport from './pages/DataExport';
import AccountSettings from './pages/AccountSettings';
import IntegrationManagement from './pages/IntegrationManagement';
import DecisionProposals from './pages/DecisionProposals';
import KnowledgeBase from './pages/KnowledgeBase';
import Messages from './pages/Messages';
import IssueDetail from './pages/IssueDetail';
import Backlog from './pages/Backlog';
import IssueTemplates from './pages/IssueTemplates';
import SavedFilters from './pages/SavedFilters';
import Releases from './pages/Releases';
import RetrospectiveDetail from './pages/RetrospectiveDetail';
import Homepage from './pages/Homepage';
import PrivacyEnterprise from './pages/PrivacyEnterprise';
import TermsEnterprise from './pages/TermsEnterprise';
import SecurityAnnex from './pages/SecurityAnnex';
import BusinessDashboard from './pages/BusinessDashboard';
import Goals from './pages/Goals';
import GoalDetail from './pages/GoalDetail';
import Meetings from './pages/Meetings';
import MeetingDetail from './pages/MeetingDetail';
import TasksBoard from './pages/TasksBoard';
import Templates from './pages/Templates';
import Documents from './pages/Documents';
import DocumentDetail from './pages/DocumentDetail';
import JourneyMaps from './pages/JourneyMaps';
import CalendarPlanner from './pages/CalendarPlanner';
import BurnoutRisk from './pages/BurnoutRisk';
import KnowledgeGraph from './pages/KnowledgeGraph';
import KnowledgeAnalytics from './pages/KnowledgeAnalytics';
import Documentation from './pages/Documentation';
import Milestones from './pages/Milestones';
import Reminders from './pages/Reminders';
import AdvancedSearch from './pages/AdvancedSearch';
import BookmarksAndDrafts from './pages/BookmarksAndDrafts';
import NotificationSettings from './pages/NotificationSettings';
import Subscription from './pages/Subscription';
import Security from './pages/Security';
import Enterprise from './pages/Enterprise';
import ImportExport from './pages/ImportExport';
import ServiceDesk from './pages/ServiceDesk';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/home" />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" />;
  return children;
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

function AppContent() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSearch, setShowSearch] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Global keyboard shortcut for search
    const handleKeyDown = (e) => {
      if (e.defaultPrevented) return;
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      
      if (modKey && e.key === 'k') {
        if (document.querySelector('[data-unified-nav-search="true"]')) return;
        e.preventDefault();
        setShowSearch(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <SeoManager />
      <OnboardingTour />
      <SmartSearch />
      <NLPCommandBar />
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white p-2 text-center z-50">
          You are offline. Some features may be limited.
        </div>
      )}
      <CommandPalette />
      <GlobalSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
      {user && <MobileNav onSearchOpen={() => setShowSearch(true)} />}
      {user && <CommandBar onCommand={(cmd) => {
        if (cmd === 'create-issue') window.location.href = '/projects';
        else if (cmd === 'new-sprint') window.location.href = '/sprint-history';
        else if (cmd === 'show-blockers') window.location.href = '/blockers';
        else if (cmd === 'my-tasks') window.location.href = '/projects';
        else if (cmd === 'goto-dashboard') window.location.href = '/';
      }} />}
      <Routes>
        <Route path="/home" element={<Homepage />} />
        <Route path="/privacy" element={<PrivacyEnterprise />} />
        <Route path="/terms" element={<TermsEnterprise />} />
        <Route path="/security-annex" element={<SecurityAnnex />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/signup" element={<Navigate to="/login" replace />} />
        <Route path="/invite/:token" element={<AcceptInvite />} />

        <Route element={<AppLayoutRoute />}>
          <Route path="/" element={<UnifiedDashboard />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/conversations" element={<Conversations />} />
          <Route path="/conversations/new" element={<CreateConversation />} />
          <Route path="/conversations/:id" element={<ConversationDetail />} />
          <Route path="/decisions" element={<Decisions />} />
          <Route path="/decisions/:id" element={<DecisionDetail />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/knowledge/graph" element={<KnowledgeGraph />} />
          <Route path="/knowledge/analytics" element={<KnowledgeAnalytics />} />
          <Route path="/docs" element={<Documentation />} />
          <Route path="/ask" element={<AskRecall />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/search" element={<AdvancedSearch />} />
          <Route path="/bookmarks-drafts" element={<BookmarksAndDrafts />} />
          <Route path="/activity" element={<ActivityFeed />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/reflection" element={<PersonalReflection />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/notification-settings" element={<NotificationSettings />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/drafts" element={<Drafts />} />
          <Route path="/files" element={<Files />} />
          <Route path="/my-decisions" element={<MyDecisions />} />
          <Route path="/my-questions" element={<MyQuestions />} />
          <Route path="/sample-decision" element={<SampleDecision />} />
          <Route path="/knowledge-health" element={<KnowledgeHealthDashboard />} />
          <Route path="/sprint" element={<CurrentSprint />} />
          <Route path="/sprint-history" element={<SprintHistory />} />
          <Route path="/sprint-management" element={<SprintManagement />} />
          <Route path="/sprints" element={<Navigate to="/sprint-history" replace />} />
          <Route path="/sprints/:id" element={<SprintDetail />} />
          <Route path="/blockers" element={<BlockerTracker />} />
          <Route path="/retrospectives" element={<RetrospectiveMemory />} />
          <Route path="/proposals" element={<Proposals />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:projectId" element={<ProjectDetail />} />
          <Route path="/boards/:boardId" element={<KanbanBoard />} />
          <Route path="/boards" element={<Navigate to="/projects" replace />} />
          <Route path="/projects/:projectId/manage" element={<ProjectManagement />} />
          <Route path="/projects/:projectId/roadmap" element={<ProjectRoadmap />} />
          <Route path="/projects/:projectId/backlog" element={<Backlog />} />
          <Route path="/projects/:projectId/releases" element={<Releases />} />
          <Route path="/agile/templates" element={<IssueTemplates />} />
          <Route path="/agile/filters" element={<SavedFilters />} />
          <Route path="/sprints/:sprintId/retrospective" element={<RetrospectiveDetail />} />
          <Route path="/account-settings" element={<AccountSettings />} />
          <Route path="/decision-proposals" element={<DecisionProposals />} />
          <Route path="/knowledge-base" element={<KnowledgeBase />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:userId" element={<Messages />} />
          <Route path="/issues/:issueId" element={<IssueDetail />} />
          <Route path="/issues" element={<Navigate to="/projects" replace />} />
          <Route path="/business/goals" element={<Goals />} />
          <Route path="/business" element={<BusinessDashboard />} />
          <Route path="/business/goals/:id" element={<GoalDetail />} />
          <Route path="/business/meetings" element={<Meetings />} />
          <Route path="/business/meetings/:id" element={<MeetingDetail />} />
          <Route path="/business/tasks" element={<TasksBoard />} />
          <Route path="/business/templates" element={<Templates />} />
          <Route path="/business/documents" element={<Documents />} />
          <Route path="/business/documents/:id" element={<DocumentDetail />} />
          <Route path="/business/journeys" element={<JourneyMaps />} />
          <Route path="/business/calendar" element={<CalendarPlanner />} />
          <Route path="/business/team-health" element={<BurnoutRisk />} />
          <Route path="/service-desk" element={<ServiceDesk />} />
          <Route path="/security" element={<Security />} />

          <Route element={<AdminOnlyRoute />}>
            <Route path="/settings" element={<Settings />} />
            <Route path="/invitations" element={<StaffInvitations />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/team" element={<TeamManagement />} />
            <Route path="/automation" element={<AutomationRules />} />
            <Route path="/workflows" element={<Workflows />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/dashboards" element={<Dashboards />} />
            <Route path="/api-keys" element={<APIKeys />} />
            <Route path="/audit-logs" element={<AuditLogs />} />
            <Route path="/export" element={<DataExport />} />
            <Route path="/integrations-manage" element={<IntegrationManagement />} />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/enterprise" element={<Enterprise />} />
            <Route path="/import-export" element={<ImportExport />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}

function App() {
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

export default App;
