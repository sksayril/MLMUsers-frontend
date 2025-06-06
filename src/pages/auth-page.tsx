import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoginForm } from '@/components/auth/login-form';
import { SignupForm } from '@/components/auth/signup-form';
import { DiamondIcon } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const AuthPage = () => {
  const [activeTab, setActiveTab] = useState<string>('login');
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get('ref');

  useEffect(() => {
    // If there's a referral code in the URL, switch to signup tab
    if (referralCode) {
      setActiveTab('signup');
    }
  }, [referralCode]);

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
          <h1 className="text-3xl font-bold tracking-tight">Utp Fund</h1>
          <p className="text-muted-foreground mt-2 text-center">
            Your premium financial platform
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
              <SignupForm referralCode={referralCode} />
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;