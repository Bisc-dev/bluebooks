import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import Layout from './components/Layout';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import Library from './pages/Library';
import BookDetail from './pages/BookDetail';
import Community from './pages/Community';
import BlogDetail from './pages/BlogDetail.jsx';
import UserProfile from './pages/UserProfile';
import Chats from './pages/Chats.jsx';
import WatchTogether from './pages/WatchTogether.jsx';
import Profile from './pages/Profile.jsx';
import MemberProfile from './pages/MemberProfile.jsx';
import Admin from './pages/Admin';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();
  const location = useLocation();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-4 font-body">Carregando BlueBooks...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      return location.pathname === '/'
        ? <Landing />
        : <Navigate to="/login" state={{ from: location.pathname, authRequired: true }} replace />;
    }
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/livraria" element={<Library />} />
        <Route path="/livraria/:id" element={<BookDetail />} />
        <Route path="/comunidade" element={<Community />} />
        <Route path="/comunidade/:id" element={<BlogDetail />} />
        <Route path="/chats" element={<Chats />} />
        <Route path="/assistir" element={<WatchTogether />} />
        <Route path="/perfil" element={<Profile />} />
        <Route path="/membro/:email" element={<MemberProfile />} />
        <Route path="/admin" element={<Admin />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/auth/confirm" element={<AuthCallback />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/*" element={<AuthenticatedApp />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
