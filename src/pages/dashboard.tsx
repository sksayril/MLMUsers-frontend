import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import WalletCard from '@/components/wallet-card';
import ReferralLink from '@/components/referral-link';
import { Sparkles, Wallet, TrendingUp } from 'lucide-react';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  if (!user) {
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

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-3xl font-bold tracking-tight"
        >
          Welcome back, {user.name}
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
            amount="$12,345.67"
            description="Available balance"
            icon={<Wallet className="h-5 w-5" />}
            trend="+2.4%"
            trendDirection="up"
            actionText="Deposit"
          />
        </motion.div>

        <motion.div variants={item}>
          <WalletCard 
            title="Benefit Wallet"
            amount="$987.65"
            description="Rewards available"
            icon={<Sparkles className="h-5 w-5" />}
            trend="+5.7%"
            trendDirection="up"
            actionText="Claim"
            color="gold"
          />
        </motion.div>

        <motion.div variants={item}>
          <WalletCard 
            title="User Level"
            level="Gold"
            description="3,450 XP • 550 XP to Platinum"
            icon={<TrendingUp className="h-5 w-5" />}
            progress={86}
            actionText="View Benefits"
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
                <TrendingUp className="h-7 w-7 text-purple-500" />
                <span className="text-xl font-bold">User Level Connections</span>
              </div>
              <div className="text-muted-foreground max-w-xl">
                Connect with other users at your level and grow together! Discover new friends, share strategies, and unlock exclusive community features based on your current level.
              </div>
            </div>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white mt-4 md:mt-0">Get My Level</Button>
            </DialogTrigger>
          </div>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Users at Your Level</DialogTitle>
              <DialogDescription>
                There are <span className="font-bold text-purple-600">42 users</span> currently at your level!
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
        <ReferralLink referralCode="FINANCE123" />
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