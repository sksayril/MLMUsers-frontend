import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoginForm } from '@/components/auth/login-form';
import { SignupForm } from '@/components/auth/signup-form';
import { DiamondIcon } from 'lucide-react';

const AuthPage = () => {
  const [activeTab, setActiveTab] = useState<string>('login');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleDemoLogin = () => {
    login({ email: 'demo@example.com', id: 'demo-user', name: 'Demo User' });
    navigate('/');
  };

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4 md:p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center justify-center mb-8">
          <DiamondIcon className="h-12 w-12 text-primary mb-4" />
          <h1 className="text-3xl font-bold tracking-tight">FinancePro</h1>
          <p className="text-muted-foreground mt-2 text-center">
            Your premium financial management platform
          </p>
        </div>

        <div className="rounded-lg border bg-card p-6 shadow-lg">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <LoginForm />
            </TabsContent>
            
            <TabsContent value="signup">
              <SignupForm />
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="mt-4 w-full"
              onClick={handleDemoLogin}
            >
              Demo Login
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;