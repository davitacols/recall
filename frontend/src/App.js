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
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout.js';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AcceptInvite from './pages/AcceptInvite';
import Dashboard from './pages/Dashboard';
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
      <Layout>
        <Dashboard />
      </Layout>
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
    // Show onboarding for authenticated users only (not on public pages)
    const isPublicPage = ['/home', '/login', '/signup', '/invite'].some(path => 
      window.location.pathname.startsWith(path)
    );
    if (user && !user.onboarding_completed && !isPublicPage) {
      setShowOnboarding(true);
    }
  }, [user]);

  useEffect(() => {
    // Global keyboard shortcut for search
    const handleKeyDown = (e) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;
      
      if (modKey && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white p-2 text-center z-50">
          You are offline. Some features may be limited.
        </div>
      )}
      <CommandPalette />
      <GlobalSearch isOpen={showSearch} onClose={() => setShowSearch(false)} />
      {showOnboarding && user && <OnboardingFlow onComplete={() => setShowOnboarding(false)} />}
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
            <Layout>
              <Conversations />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/conversations/new" element={
          <ProtectedRoute>
            <Layout>
              <CreateConversation />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/conversations/:id" element={
          <ProtectedRoute>
            <Layout>
              <ConversationDetail />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/decisions" element={
          <ProtectedRoute>
            <Layout>
              <Decisions />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/decisions/:id" element={
          <ProtectedRoute>
            <Layout>
              <DecisionDetail />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/knowledge" element={
          <ProtectedRoute>
            <Layout>
              <Knowledge />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/ask" element={
          <ProtectedRoute>
            <Layout>
              <AskRecall />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/insights" element={
          <ProtectedRoute>
            <Layout>
              <Insights />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/activity" element={
          <ProtectedRoute>
            <Layout>
              <ActivityFeed />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute adminOnly={true}>
            <Layout>
              <Settings />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/invitations" element={
          <ProtectedRoute adminOnly={true}>
            <Layout>
              <StaffInvitations />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/onboarding" element={
          <ProtectedRoute>
            <Layout>
              <Onboarding />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/faq" element={
          <ProtectedRoute>
            <Layout>
              <FAQ />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/reflection" element={
          <ProtectedRoute>
            <Layout>
              <PersonalReflection />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/notifications" element={
          <ProtectedRoute>
            <Layout>
              <Notifications />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/bookmarks" element={
          <ProtectedRoute>
            <Layout>
              <Bookmarks />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/drafts" element={
          <ProtectedRoute>
            <Layout>
              <Drafts />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/files" element={
          <ProtectedRoute>
            <Layout>
              <Files />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/my-decisions" element={
          <ProtectedRoute>
            <Layout>
              <MyDecisions />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/my-questions" element={
          <ProtectedRoute>
            <Layout>
              <MyQuestions />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/sample-decision" element={
          <ProtectedRoute>
            <Layout>
              <SampleDecision />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/knowledge-health" element={
          <ProtectedRoute>
            <Layout>
              <KnowledgeHealthDashboard />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/sprint" element={
          <ProtectedRoute>
            <Layout>
              <CurrentSprint />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/sprint-history" element={
          <ProtectedRoute>
            <Layout>
              <SprintHistory />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/sprints" element={<Navigate to="/sprint-history" replace />} />
        <Route path="/sprints/:id" element={
          <ProtectedRoute>
            <Layout>
              <SprintDetail />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/blockers" element={
          <ProtectedRoute>
            <Layout>
              <BlockerTracker />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/retrospectives" element={
          <ProtectedRoute>
            <Layout>
              <RetrospectiveMemory />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/integrations" element={
          <ProtectedRoute adminOnly={true}>
            <Layout>
              <Integrations />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/proposals" element={
          <ProtectedRoute>
            <Layout>
              <Proposals />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute adminOnly={true}>
            <Layout>
              <Analytics />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/projects" element={
          <ProtectedRoute>
            <Layout>
              <Projects />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/projects/:projectId" element={
          <ProtectedRoute>
            <Layout>
              <ProjectDetail />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/boards/:boardId" element={
          <ProtectedRoute>
            <Layout>
              <KanbanBoard />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/projects/:projectId/manage" element={
          <ProtectedRoute>
            <Layout>
              <ProjectManagement />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/projects/:projectId/roadmap" element={
          <ProtectedRoute>
            <Layout>
              <ProjectRoadmap />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/projects/:projectId/backlog" element={
          <ProtectedRoute>
            <Layout>
              <Backlog />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/team" element={
          <ProtectedRoute adminOnly={true}>
            <Layout>
              <TeamManagement />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/automation" element={
          <ProtectedRoute adminOnly={true}>
            <Layout>
              <AutomationRules />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/workflows" element={
          <ProtectedRoute adminOnly={true}>
            <Layout>
              <Workflows />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute adminOnly={true}>
            <Layout>
              <Reports />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/dashboards" element={
          <ProtectedRoute adminOnly={true}>
            <Layout>
              <Dashboards />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/api-keys" element={
          <ProtectedRoute adminOnly={true}>
            <Layout>
              <APIKeys />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/audit-logs" element={
          <ProtectedRoute adminOnly={true}>
            <Layout>
              <AuditLogs />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/export" element={
          <ProtectedRoute adminOnly={true}>
            <Layout>
              <DataExport />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/account-settings" element={
          <ProtectedRoute>
            <Layout>
              <AccountSettings />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/integrations-manage" element={
          <ProtectedRoute adminOnly={true}>
            <Layout>
              <IntegrationManagement />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/decision-proposals" element={
          <ProtectedRoute>
            <Layout>
              <DecisionProposals />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/knowledge-base" element={
          <ProtectedRoute>
            <Layout>
              <KnowledgeBase />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/messages" element={
          <ProtectedRoute>
            <Layout>
              <Messages />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/messages/:userId" element={
          <ProtectedRoute>
            <Layout>
              <Messages />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/issues/:issueId" element={
          <ProtectedRoute>
            <Layout>
              <IssueDetail />
            </Layout>
          </ProtectedRoute>
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
