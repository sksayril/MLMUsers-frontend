import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import WalletCard from '@/components/wallet-card';
import ReferralLink from '@/components/referral-link';
import { Sparkles, Wallet, TrendingUp, User } from 'lucide-react';
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
}

const DashboardSkeleton = () => {
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-48" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[1, 2, 3].map((i) => (
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfileData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/auth');
        return;
      }
      
      const response = await axios.get(
        'https://7cvccltb-3100.inc1.devtunnels.ms/api/users/profile',
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
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWalletData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/auth');
        return;
      }
      
      const response = await axios.get(
        'https://7cvccltb-3100.inc1.devtunnels.ms/api/users/wallet',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      if (response.data.success) {
        setWalletData(response.data.wallet);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
      }
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    } else {
      fetchProfileData(); // Fetch profile data which includes wallet and level
    }
  }, [user, navigate]);

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
      </header>

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10"
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
            description="Rewards available"
            icon={<Sparkles className="h-5 w-5" />}
            trend="+5.7%"
            trendDirection="up"
            color="gold"
          />
        </motion.div>

        <motion.div variants={item}>
          <WalletCard 
            title="User Profile"
            level={`Level ${userData.level}`}
            description={`Referral Code: ${userData.referralCode}`}
            icon={<User className="h-5 w-5" />}
            progress={86}
            color="purple"
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mb-6"
      >
        <ReferralLink referralCode={userData.referralCode || 'N/A'} />
      </motion.div>

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