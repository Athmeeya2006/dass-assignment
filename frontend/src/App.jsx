import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './routes/ProtectedRoute';

// Auth Pages
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';

// Participant Pages
import ParticipantDashboard from './pages/participant/Dashboard';
import BrowseEvents from './pages/participant/BrowseEvents';
import EventDetail from './pages/participant/EventDetail';
import ParticipantProfile from './pages/participant/Profile';
import Clubs from './pages/participant/Clubs';
import OrganizerDetail from './pages/participant/OrganizerDetail';
import Onboarding from './pages/participant/Onboarding';
import TicketView from './pages/participant/TicketView';
import TeamChat from './pages/participant/TeamChat';

// Organizer Pages
import OrganizerDashboard from './pages/organizer/Dashboard';
import CreateEvent from './pages/organizer/CreateEvent';
import OrganizerEventDetail from './pages/organizer/EventDetail';
import OrganizerProfile from './pages/organizer/Profile';
import OngoingEvents from './pages/organizer/OngoingEvents';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import ManageOrganizers from './pages/admin/ManageOrganizers';
import PasswordResets from './pages/admin/PasswordResets';

// Navbar Component
import Navbar from './components/Navbar';

function App() {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-ink">
        <div className="flex gap-1 mb-4">
          <div className="w-2 h-2 bg-accent-primary animate-pulse" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-accent-primary animate-pulse" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-accent-primary animate-pulse" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-text-muted">Loading</p>
      </div>
    );
  }

  return (
    <ToastProvider>
    <Router>
      <div className="min-h-screen bg-ink text-text-primary">
        {isAuthenticated && <Navbar />}
        <main className={isAuthenticated ? 'pt-14' : ''}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
            <Route path="/signup" element={!isAuthenticated ? <Signup /> : <Navigate to="/" />} />

            {/* Participant routes */}
            <Route
              path="/participant/onboarding"
              element={
                <ProtectedRoute requiredRole="Participant">
                  <Onboarding />
                </ProtectedRoute>
              }
            />
            <Route
              path="/participant/ticket/:ticketId"
              element={
                <ProtectedRoute requiredRole="Participant">
                  <TicketView />
                </ProtectedRoute>
              }
            />

            {/* Participant routes */}
            <Route
              path="/participant/dashboard"
              element={
                <ProtectedRoute requiredRole="Participant">
                  <ParticipantDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/participant/browse"
              element={
                <ProtectedRoute requiredRole="Participant">
                  <BrowseEvents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/participant/event/:eventId"
              element={
                <ProtectedRoute requiredRole="Participant">
                  <EventDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/participant/profile"
              element={
                <ProtectedRoute requiredRole="Participant">
                  <ParticipantProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/participant/clubs"
              element={
                <ProtectedRoute requiredRole="Participant">
                  <Clubs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/participant/organizer/:organizerId"
              element={
                <ProtectedRoute requiredRole="Participant">
                  <OrganizerDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/participant/team-chat/:teamId"
              element={
                <ProtectedRoute requiredRole="Participant">
                  <TeamChat />
                </ProtectedRoute>
              }
            />

            {/* Organizer routes */}
            <Route
              path="/organizer/dashboard"
              element={
                <ProtectedRoute requiredRole="Organizer">
                  <OrganizerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/create-event"
              element={
                <ProtectedRoute requiredRole="Organizer">
                  <CreateEvent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/event/:eventId"
              element={
                <ProtectedRoute requiredRole="Organizer">
                  <OrganizerEventDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/profile"
              element={
                <ProtectedRoute requiredRole="Organizer">
                  <OrganizerProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/organizer/ongoing"
              element={
                <ProtectedRoute requiredRole="Organizer">
                  <OngoingEvents />
                </ProtectedRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute requiredRole="Admin">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/organizers"
              element={
                <ProtectedRoute requiredRole="Admin">
                  <ManageOrganizers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/password-resets"
              element={
                <ProtectedRoute requiredRole="Admin">
                  <PasswordResets />
                </ProtectedRoute>
              }
            />

            {/* Redirect to role-specific dashboard */}
            <Route
              path="/"
              element={
                isAuthenticated ? (
                  user?.role === 'Participant' ? (
                    <Navigate to="/participant/dashboard" />
                  ) : user?.role === 'Organizer' ? (
                    <Navigate to="/organizer/dashboard" />
                  ) : user?.role === 'Admin' ? (
                    <Navigate to="/admin/dashboard" />
                  ) : (
                    <Navigate to="/login" />
                  )
                ) : (
                  <Navigate to="/login" />
                )
              }
            />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
    </ToastProvider>
  );
}

export default App;
