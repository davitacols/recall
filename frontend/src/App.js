import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './components/Toast';
import { ThemeProvider } from './utils/ThemeAndAccessibility';
import { CommandPalette } from './components/CommandPalette';
import { GlobalSearch } from './components/GlobalSearch';
import { OnboardingFlow } from './components/OnboardingFlow';
import { MobileNav } from './components/MobileNav';
import { AIAssistant } from './components/AIFeatures';
import { CommandBar } from './components/GestureControls';
import NLPCommandBar from './components/NLPCommandBar';
import ImpactAnalysisModal from './components/ImpactAnalysisModal';
import SuccessRateTracker from './components/SuccessRateTracker';
import OnboardingTour from './components/OnboardingTour';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout.js';
import UnifiedLayout from './components/UnifiedLayout';
import UnifiedNav from './components/UnifiedNav';
import SmartSearch from './components/SmartSearch';
import Login from './pages/Login';
import Signup from './pages/Signup';
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
import Homepage from './pages/Homepage';
import BusinessDashboard from './pages/BusinessDashboard';
import Goals from './pages/Goals';
import GoalDetail from './pages/GoalDetail';
import Meetings from './pages/Meetings';
import MeetingDetail from './pages/MeetingDetail';
import TasksBoard from './pages/TasksBoard';
import Templates from './pages/Templates';
import Documents from './pages/Documents';
import DocumentDetail from './pages/DocumentDetail';
import KnowledgeGraph from './pages/KnowledgeGraph';
import KnowledgeAnalytics from './pages/KnowledgeAnalytics';
import Milestones from './pages/Milestones';
import Reminders from './pages/Reminders';
import AdvancedSearch from './pages/AdvancedSearch';
import BookmarksAndDrafts from './pages/BookmarksAndDrafts';
import NotificationSettings from './pages/NotificationSettings';
import Subscription from './pages/Subscription';
import Security from './pages/Security';
import Enterprise from './pages/Enterprise';
import ImportExport from './pages/ImportExport';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/home" />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" />;
  return children;
}

function RootRoute() {
  const { user } = useAuth();
  if (!user) return <Homepage />;
  return (
    <ProtectedRoute>
      <UnifiedLayout>
        <UnifiedDashboard />
      </UnifiedLayout>
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
      <MobileNav onSearchOpen={() => setShowSearch(true)} />
      {user && <AIAssistant />}
      {user && <CommandBar onCommand={(cmd) => {
        if (cmd === 'create-issue') window.location.href = '/projects';
        else if (cmd === 'new-sprint') window.location.href = '/sprint-history';
        else if (cmd === 'show-blockers') window.location.href = '/blockers';
        else if (cmd === 'my-tasks') window.location.href = '/projects';
        else if (cmd === 'goto-dashboard') window.location.href = '/';
      }} />}
      <Routes>
        <Route path="/home" element={<Homepage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/invite/:token" element={<AcceptInvite />} />
        <Route path="/" element={<RootRoute />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/conversations" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <Conversations />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/conversations/new" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <CreateConversation />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/conversations/:id" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <ConversationDetail />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/decisions" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <Decisions />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/decisions/:id" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <DecisionDetail />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/knowledge" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <Knowledge />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/knowledge/graph" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <KnowledgeGraph />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/knowledge/analytics" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <KnowledgeAnalytics />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/ask" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <AskRecall />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/insights" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <Insights />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/search" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <AdvancedSearch />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/bookmarks-drafts" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <BookmarksAndDrafts />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/activity" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <ActivityFeed />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute adminOnly={true}>
            <UnifiedLayout>
              <Settings />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/invitations" element={
          <ProtectedRoute adminOnly={true}>
            <UnifiedLayout>
              <StaffInvitations />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <Profile />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/onboarding" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <Onboarding />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/faq" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <FAQ />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/reflection" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <PersonalReflection />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/notifications" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <Notifications />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/notification-settings" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <NotificationSettings />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/bookmarks" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <Bookmarks />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/drafts" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <Drafts />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/files" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <Files />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/my-decisions" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <MyDecisions />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/my-questions" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <MyQuestions />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/sample-decision" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <SampleDecision />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/knowledge-health" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <KnowledgeHealthDashboard />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/sprint" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <CurrentSprint />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/sprint-history" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <SprintHistory />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/sprint-management" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <SprintManagement />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/sprints" element={<Navigate to="/sprint-history" replace />} />
        <Route path="/sprints/:id" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <SprintDetail />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/blockers" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <BlockerTracker />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/retrospectives" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <RetrospectiveMemory />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/integrations" element={
          <ProtectedRoute adminOnly={true}>
            <UnifiedLayout>
              <Integrations />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/proposals" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <Proposals />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute adminOnly={true}>
            <UnifiedLayout>
              <Analytics />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/projects" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <Projects />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/projects/:projectId" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <ProjectDetail />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/boards/:boardId" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <KanbanBoard />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/projects/:projectId/manage" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <ProjectManagement />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/projects/:projectId/roadmap" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <ProjectRoadmap />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/projects/:projectId/backlog" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <Backlog />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/team" element={
          <ProtectedRoute adminOnly={true}>
            <UnifiedLayout>
              <TeamManagement />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/automation" element={
          <ProtectedRoute adminOnly={true}>
            <UnifiedLayout>
              <AutomationRules />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/workflows" element={
          <ProtectedRoute adminOnly={true}>
            <UnifiedLayout>
              <Workflows />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute adminOnly={true}>
            <UnifiedLayout>
              <Reports />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/dashboards" element={
          <ProtectedRoute adminOnly={true}>
            <UnifiedLayout>
              <Dashboards />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/api-keys" element={
          <ProtectedRoute adminOnly={true}>
            <UnifiedLayout>
              <APIKeys />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/audit-logs" element={
          <ProtectedRoute adminOnly={true}>
            <UnifiedLayout>
              <AuditLogs />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/export" element={
          <ProtectedRoute adminOnly={true}>
            <UnifiedLayout>
              <DataExport />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/account-settings" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <AccountSettings />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/integrations-manage" element={
          <ProtectedRoute adminOnly={true}>
            <UnifiedLayout>
              <IntegrationManagement />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/decision-proposals" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <DecisionProposals />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/knowledge-base" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <KnowledgeBase />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/messages" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <Messages />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/messages/:userId" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <Messages />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/issues/:issueId" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <IssueDetail />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/business/goals" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <Goals />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/business" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <BusinessDashboard />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/business/goals/:id" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <GoalDetail />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/business/meetings" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <Meetings />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/business/meetings/:id" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <MeetingDetail />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/business/tasks" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <TasksBoard />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/business/templates" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <Templates />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/business/documents" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <Documents />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/business/documents/:id" element={
          <ProtectedRoute>
            <UnifiedLayout>
              <DocumentDetail />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/subscription" element={
          <ProtectedRoute adminOnly={true}>
            <UnifiedLayout>
              <Subscription />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/enterprise" element={
          <ProtectedRoute adminOnly={true}>
            <UnifiedLayout>
              <Enterprise />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/import-export" element={
          <ProtectedRoute adminOnly={true}>
            <UnifiedLayout>
              <ImportExport />
            </UnifiedLayout>
          </ProtectedRoute>
        } />
        <Route path="/security" element={
          <UnifiedLayout>
            <Security />
          </UnifiedLayout>
        } />
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
