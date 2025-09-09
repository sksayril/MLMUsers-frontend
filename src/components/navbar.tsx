import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Home,  User, LogOut, Sun, Moon, Users } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const [activeRoute, setActiveRoute] = useState(location.pathname);
  
  useEffect(() => {
    setActiveRoute(location.pathname);
  }, [location]);

  const handleSignOut = async () => {
    try {
      logout();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navItems = [
    { path: '/', label: 'Home', icon: <Home className="h-5 w-5" /> },
    // { path: '/game', label: 'Game', icon: <GamepadIcon className="h-5 w-5" /> },
    { path: '/matrix', label: 'Matrix', icon: <User className="h-5 w-5" /> },
    { path: '/team', label: 'Your Team', icon: <Users className="h-5 w-5" /> },
    { path: '/profile', label: 'Profile', icon: <User className="h-5 w-5" /> },
  ];

  // Web navigation (centered horizontal)
  const webNav = (
    <nav className="hidden md:flex items-center justify-center space-x-1">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            cn(
              "flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors",
              "hover:bg-accent hover:text-accent-foreground",
              isActive
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground"
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  // Mobile navigation (bottom)
  const mobileNav = (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 flex items-center justify-around h-16 bg-background border-t">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center w-full h-full text-xs font-medium transition-colors",
              "hover:text-primary",
              isActive
                ? "text-primary"
                : "text-muted-foreground"
            )
          }
        >
          <div className="relative">
            {activeRoute === item.path && (
              <motion.div
                layoutId="bubble"
                className="absolute -inset-1 bg-primary/10 rounded-full -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            {item.icon}
          </div>
          <span className="mt-1">{item.label}</span>
        </NavLink>
      ))}
      <div className="flex flex-col items-center justify-center w-full h-full">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
            >
              {theme === 'dark' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="mt-1 text-xs text-muted-foreground">Theme</span>
      </div>
      <div className="flex flex-col items-center justify-center w-full h-full">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          className="rounded-full"
        >
          <LogOut className="h-5 w-5" />
        </Button>
        <span className="mt-1 text-xs text-muted-foreground">Sign  Out</span>
      </div>
    </nav>
  );

  return (
    <>
      {webNav}
      {mobileNav}
    </>
  );
};

export default Navbar;