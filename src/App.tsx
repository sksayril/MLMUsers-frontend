import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/contexts/auth-context';
import Layout from '@/components/layout';
import AuthPage from '@/pages/auth-page';
import Dashboard from '@/pages/dashboard';
import GamePage from '@/pages/game-page';
import ProfilePage from '@/pages/profile-page';
import './App.css';

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <AuthProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/game" element={<GamePage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Routes>
          </Layout>
        </Router>
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;