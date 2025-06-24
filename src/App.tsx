import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/auth-context';
import { useAuth } from '@/contexts/auth-context';
import { setupAxiosInterceptors } from '@/lib/axios-config';
import Layout from '@/components/layout';
import AuthPage from '@/pages/auth-page';
import Dashboard from '@/pages/dashboard';
import GamePage from '@/pages/game-page';
import ProfilePage from '@/pages/profile-page';
import ColorPredictionGame from '@/pages/color-prediction-game';
import ColorPredictionRoom from '@/pages/color-prediction-room';
import BigSmallGame from '@/pages/big-small';
import BigSmallRoom from '@/pages/big-small-room';
import SpinWheelGame from '@/pages/spin-wheel-game';
import DiceRollGame from '@/pages/dice-roll-game';
import { useEffect } from 'react';
import './App.css';

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <AuthProvider>
        <Router>
          <AppContent />
          <Toaster />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

// Separate component to use react-router hooks
function AppContent() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  // Set up axios interceptors when the app mounts
  useEffect(() => {
    setupAxiosInterceptors(logout, navigate);
  }, [logout, navigate]);
  
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/games/color-prediction" element={<ColorPredictionGame />} />
        <Route path="/games/color-prediction/:roomId" element={<ColorPredictionRoom />} />
        <Route path="/games/big-small" element={<BigSmallGame />} />
        <Route path="/games/big-small/room/:roomId" element={<BigSmallRoom />} />
        <Route path="/games/spin-wheel" element={<SpinWheelGame />} />
        <Route path="/games/dice-roll" element={<DiceRollGame />} />
      </Routes>
    </Layout>
  );
}

export default App;