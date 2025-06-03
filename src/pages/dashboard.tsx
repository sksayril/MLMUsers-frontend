import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import WalletCard from '@/components/wallet-card';
import { Sparkles, Wallet, TrendingUp, User, GamepadIcon } from 'lucide-react';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';

interface UserData {
  _id: string;
  name: string;
  email: string;
  referralCode: string;
  level: number;
  wallet: {
    normal: number;
    benefit: number;
    game: number;
  };
  isAdmin: boolean;
  referredBy: string | null;
  ancestors: string[];
  createdAt: string;
  updatedAt: string;
}

interface WalletData {
  normal: number;
  benefit: number;
  game: number;
}

const DashboardSkeleton = () => {
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border p-6">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-6 w-32" />
            </div>
            <Skeleton className="h-8 w-24 mb-2" />
            <Skeleton className="h-4 w-40 mb-4" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>

      <div className="mb-8">
        <div className="bg-gradient-to-r from-purple-500/20 via-blue-400/10 to-indigo-500/20 border border-purple-400/30 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-6 w-40" />
          </div>
          <Skeleton className="h-4 w-64 mb-4" />
          <Skeleton className="h-10 w-full mb-4" />
          <Skeleton className="h-10 w-32 mx-auto" />
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfileData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/auth');
        return;
      }
      
      const response = await axios.get(
        'https://api.utpfund.live/api/users/profile',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        setUserData(response.data.user);
        setWalletData(response.data.user.wallet);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
        if (error.response?.status === 401) {
          toast({
            title: 'Session Expired',
            description: 'Please log in again.',
            variant: 'destructive',
          });
          logout();
          navigate('/auth');
          return;
        }
        toast({
          title: 'Error loading profile',
          description: error.response?.data?.message || error.message || 'Could not fetch your profile data.',
          variant: 'destructive',
        });
      } else {
        console.error('Unexpected error fetching profile:', error);
        toast({
          title: 'Error loading profile',
          description: 'An unexpected error occurred while fetching profile data.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [navigate, toast, logout]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    } else {
      fetchProfileData(); // Fetch profile data which includes wallet and level
    }
  }, [user, navigate, fetchProfileData]);

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!userData) {
    return null;
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const formatAmount = (amount: number, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-3xl font-bold tracking-tight"
        >
          Welcome back, {userData.name}
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-muted-foreground"
        >
          Here's an overview of your account
        </motion.p>
        {/* Attractive Level & Ancestors cards */}
        <div className="flex flex-col md:flex-row gap-4 mt-6">
          {/* Level Card */}
          <div className="flex items-center gap-3 px-6 py-3 rounded-2xl shadow-lg bg-gradient-to-r from-purple-500 to-blue-500 animate-fade-in">
            <span className="text-3xl font-bold text-white drop-shadow-lg flex items-center">
              <svg className="w-7 h-7 mr-2 text-yellow-300" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2l2.09 6.26L20 9.27l-5 3.64L16.18 21 12 17.27 7.82 21 9 12.91l-5-3.64 5.91-.91L12 2z"/></svg>
              {userData.level}
            </span>
            <span className="ml-2 text-lg font-semibold text-white/90">Level</span>
          </div>
          {/* Ancestors Card */}
          <div className="flex items-center gap-3 px-6 py-3 rounded-2xl shadow-lg bg-gradient-to-r from-green-400 to-blue-400 animate-fade-in">
            <span className="text-3xl font-bold text-white drop-shadow-lg flex items-center">
              <svg className="w-7 h-7 mr-2 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm6 8v-2a4 4 0 0 0-3-3.87M6 20v-2a4 4 0 0 1 3-3.87" /></svg>
              {userData.ancestors?.length || 0}
            </span>
            <span className="ml-2 text-lg font-semibold text-white/90">Ancestors</span>
          </div>
        </div>
      </header>

      <motion.div 
        variants={container} 
        initial="hidden" 
        animate="show" 
        className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10"
      >
        <motion.div variants={item}>
          <WalletCard 
            title="Main Wallet"
            amount={formatAmount(walletData?.normal || 0)}
            description="Available balance"
            icon={<Wallet className="h-5 w-5" />}
            trend="+2.4%"
            trendDirection="up"
          />
        </motion.div>

        <motion.div variants={item}>
          <WalletCard 
            title="Benefit Wallet"
            amount={formatAmount(walletData?.benefit || 0)}
            description="Commission earnings"
            icon={<Sparkles className="h-5 w-5" />}
            trend="+5.7%"
            trendDirection="up"
            color="gold"
          />
        </motion.div>
        
        <motion.div variants={item}>
          <WalletCard 
            title="Game Wallet"
            amount={formatAmount(walletData?.game || 0)}
            description="For games & challenges"
            icon={<GamepadIcon className="h-5 w-5" />}
            trend="+1.2%"
            trendDirection="up"
            color="purple"
          />
        </motion.div>

        <motion.div variants={item}>
          <WalletCard 
            title="Total Balance"
            amount={formatAmount(
              (walletData?.normal || 0) + 
              (walletData?.benefit || 0) + 
              (walletData?.game || 0)
            )}
            description="Combined wallet balance"
            icon={<TrendingUp className="h-5 w-5" />}
            trend="+3.1%"
            trendDirection="up"
            color="gold"
          />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.45 }}
        className="mb-8"
      >
        <Dialog>
          <div className="bg-gradient-to-r from-purple-500/20 via-blue-400/10 to-indigo-500/20 border border-purple-400/30 rounded-xl p-6 md:col-span-3 shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <User className="h-7 w-7 text-purple-500" />
                <span className="text-xl font-bold">User Profile</span>
              </div>
              <div className="text-muted-foreground max-w-xl">
                <p>Name: {userData.name}</p>
                <p>Email: {userData.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-sm">Referral Code:</p>
                  <span className="font-mono text-sm font-bold tracking-wider bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent px-2 py-1 rounded-md bg-white/50 dark:bg-black/50 border border-blue-500/20">
                    {userData.referralCode}
                  </span>
                </div>
                <p>Level: {userData.level}</p>
                <p>Member since: {new Date(userData.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white mt-4 md:mt-0">View Full Profile</Button>
            </DialogTrigger>
          </div>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>User Profile Details</DialogTitle>
              <DialogDescription>
                <div className="space-y-4 mt-4">
                  <div>
                    <h3 className="font-semibold">Personal Information</h3>
                    <p>Name: {userData.name}</p>
                    <p>Email: {userData.email}</p>
                    <p>Referral Code: {userData.referralCode}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Wallet Information</h3>
                    <p>Normal Balance: {formatAmount(walletData?.normal || 0)}</p>
                    <p>Benefit Balance: {formatAmount(walletData?.benefit || 0)}</p>
                    <p>Game Balance: {formatAmount(walletData?.game || 0)}</p>
                    <p>Total Balance: {formatAmount(
                      (walletData?.normal || 0) + 
                      (walletData?.benefit || 0) + 
                      (walletData?.game || 0)
                    )}</p>
                  </div>
                  <div>
                    <h3 className="font-semibold">Account Information</h3>
                    <p>Level: {userData.level}</p>
                    <p>Member since: {new Date(userData.createdAt).toLocaleDateString()}</p>
                    <p>Last updated: {new Date(userData.updatedAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Referral Code Section (no link, just code and copy button) */}
      <div className="flex flex-col items-center justify-center mt-8">
        <span className="text-lg font-semibold mb-2">Your Referral Code</span>
        <div className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-3 rounded-xl shadow-lg">
          <span className="font-mono text-2xl font-bold text-white tracking-widest select-all">
            {userData.referralCode}
          </span>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              navigator.clipboard.writeText(userData.referralCode);
              toast({ title: 'Copied!', description: 'Referral code copied to clipboard.' });
            }}
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 16h8a2 2 0 0 0 2-2V8m-2-4H8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2zm0 0v4a2 2 0 0 0 2 2h4" /></svg>
          </Button>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.7 }}
        className="text-center mt-10"
      >
        <Button variant="outline" size="sm">
          View transaction history
        </Button>
      </motion.div>
    </div>
  );
};

export default Dashboard;
