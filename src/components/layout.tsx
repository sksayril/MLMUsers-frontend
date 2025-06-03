import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '@/components/navbar';
import { ModeToggle } from '@/components/mode-toggle';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  // Determine if the current page is the auth page
  const isAuthPage = location.pathname === '/auth';

  return (
    <div className={cn(
      "min-h-screen bg-background font-sans antialiased",
      isAuthPage ? "flex flex-col" : "flex flex-col"
    )}>
      {!isAuthPage && (
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-2 font-bold text-xl"
            >
              <div className="hidden md:block ml-20">UtP-FUND</div>
            </motion.div>
            
            <div className="hidden md:flex items-center space-x-1">
              <Navbar />
            </div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className="hidden md:flex items-center gap-2"
            >
              <ModeToggle />
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={handleLogout}
              >
                <LogOut className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">Sign out</span>
              </Button>
            </motion.div>
          </div>
        </header>
      )}
      
      <main className={cn(
        "flex-1",
        isAuthPage ? "" : "pb-24 md:pb-0" // Increased padding for mobile to account for navbar and buttons
      )}>
        <AnimatePresence mode="wait">
          {isMounted && (
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      
      {!isAuthPage && (
        <>
          <div className="fixed bottom-0 left-0 right-0 md:hidden z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
            <Navbar />
          </div>
        </>
      )}
    </div>
  );
};

export default Layout;