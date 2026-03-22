import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Layouts
import PlayerLayout from './layouts/PlayerLayout';
import MasterLayout from './layouts/MasterLayout';

// Pages
import Login from './pages/Login';
import Hub from './pages/Hub';
import MenuIniziale from './pages/MenuIniziale';

// Player Pages
import Profilo from './pages/player/Profilo';
import Pokedex from './pages/player/Pokedex';
import Zaino from './pages/player/Zaino';
import Squadra from './pages/player/Squadra';
import Combat from './pages/player/Combat';

// Master Pages
import Campagna from './pages/master/Campagna';
import Party from './pages/master/Party';
import Battaglia from './pages/master/Battaglia';

function ProtectedRoute({ children, requiredRole }) {
  const { user, profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    // Se c'è un utente ma manca il profilo (errore fetch), forziamo il logout per sicurezza
    return (
      <div className="flex-center" style={{ minHeight: '100vh', flexDirection: 'column', gap: '20px' }}>
        <p>Errore di caricamento del profilo. Riprova ad accedere.</p>
        <button className="btn btn-primary" onClick={signOut}>
          Torna al Login
        </button>
      </div>
    );
  }

  if (requiredRole && profile.ruolo !== requiredRole) {
    // Se cerchi di entrare in una dashboard non tua, torni al menu
    return <Navigate to="/menu" replace />;
  }

  return children;
}

function LoginRoute() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (user && profile) {
    // Redirect to menu instead of forcing a dashboard
    return <Navigate to="/menu" replace />;
  }

  return <Login />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Login */}
      <Route path="/login" element={<LoginRoute />} />

      {/* Menu Principale post-login */}
      <Route
        path="/menu"
        element={
          <ProtectedRoute>
            <MenuIniziale />
          </ProtectedRoute>
        }
      />

      {/* Player Routes */}
      <Route
        path="/player"
        element={
          <ProtectedRoute requiredRole="giocatore">
            <PlayerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="profilo" replace />} />
        <Route path="profilo" element={<Profilo />} />
        <Route path="pokedex" element={<Pokedex />} />
        <Route path="zaino" element={<Zaino />} />
        <Route path="squadra" element={<Squadra />} />
        <Route path="combat" element={<Combat />} />
      </Route>

      {/* Master Routes */}
      <Route
        path="/master"
        element={
          <ProtectedRoute requiredRole="master">
            <MasterLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="party" replace />} />
        <Route path="campagna" element={<Campagna />} />
        <Route path="party" element={<Party />} />
        <Route path="battaglia" element={<Battaglia />} />
      </Route>

      {/* HUB Battaglia — no auth required, just a display screen */}
      <Route path="/hub" element={<Hub />} />

      {/* Default redirect to menu (which will redirect to login if unauth'd) */}
      <Route path="*" element={<Navigate to="/menu" replace />} />
    </Routes>
  );
}

import { ThemeProvider } from './contexts/ThemeContext';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <AppRoutes />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
