import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ToastProvider } from './components/Toast';
import { useKeyboardShortcuts, CommandPalette } from './hooks/useKeyboardShortcuts';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AcceptInvite from './pages/AcceptInvite';
import Dashboard from './pages/Dashboard';
import Conversations from './pages/Conversations';
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
import Layout from './components/Layout';
import './index.css';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" />;
  return children;
}

function AppContent() {
  const { showCommandPalette, setShowCommandPalette } = useKeyboardShortcuts();

  return (
    <>
      <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/invite/:token" element={<AcceptInvite />} />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/conversations" element={
          <ProtectedRoute>
            <Layout>
              <Conversations />
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
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <AppContent />
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
