import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Settings, LogOut, User, Bell, Shield, CreditCard, HelpCircle, 
  Wallet, ArrowUpCircle, ArrowDownCircle, Plus, Minus, Eye, EyeOff,
 RefreshCw
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DepositRequest {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;
  approvedDate?: string;
  notes: string;
}

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('account');
  const [showBalance, setShowBalance] = useState(true);
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawUpiId, setWithdrawUpiId] = useState('');
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [isLoadingDeposits, setIsLoadingDeposits] = useState(false);
  const [wallet, setWallet] = useState<{ normal: number; game: number }>({ normal: 0, game: 0 });
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [isLoadingWithdrawals, setIsLoadingWithdrawals] = useState(false);

  // Fetch wallet data from API
  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/auth');
          return;
        }
        const response = await axios.get('http://localhost:3100/api/users/wallet', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          setWallet({
            normal: response.data.wallet.normal,
            game: response.data.wallet.game
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to fetch wallet data',
          variant: 'destructive',
        });
      }
    };
    fetchWallet();
  }, [navigate, toast]);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const menuItems = [
    { icon: <User className="h-5 w-5" />, label: 'Account', value: 'account' },
    { icon: <Wallet className="h-5 w-5" />, label: 'Wallet', value: 'wallet' },
    { icon: <CreditCard className="h-5 w-5" />, label: 'Payment History', value: 'payments' },
    { icon: <Bell className="h-5 w-5" />, label: 'Notifications', value: 'notifications' },
    { icon: <Shield className="h-5 w-5" />, label: 'Security', value: 'security' },
    { icon: <HelpCircle className="h-5 w-5" />, label: 'Help & Support', value: 'help' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: number, currency = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || isNaN(Number(depositAmount)) || Number(depositAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid deposit amount",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/auth');
        return;
      }

      const response = await axios.post(
        'http://localhost:3100/api/users/deposit-request',
        {
          amount: Number(depositAmount),
          notes: "Deposit via UPI"
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        toast({
          title: "Success",
          description: response.data.message,
        });
        setIsDepositDialogOpen(false);
        setDepositAmount('');
        if (paymentFilter === 'deposit') {
          fetchDepositRequests();
        }
      } else {
        toast({
          title: "Error",
          description: "Failed to create deposit request",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error creating deposit request:', error);
      toast({
        title: "Error",
        description: "Failed to create deposit request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchDepositRequests = async () => {
    setIsLoadingDeposits(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/auth');
        return;
      }

      const response = await axios.get(
        'http://localhost:3100/api/users/deposit-requests',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setDepositRequests(response.data.depositRequests);
        toast({
          title: "Success",
          description: "Deposit requests refreshed successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch deposit requests",
          variant: "destructive",
        });
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data
        });
      }
      toast({
        title: "Error",
        description: "Failed to fetch deposit requests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDeposits(false);
    }
  };

  useEffect(() => {
    if (paymentFilter === 'deposit') {
      fetchDepositRequests();
    }
  }, [paymentFilter]);

  // Update the withdraw handler for game wallet
  const handleWithdraw = async () => {
    if (!withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid withdraw amount',
        variant: 'destructive',
      });
      return;
    }
    if (!withdrawUpiId || withdrawUpiId.length < 5) {
      toast({
        title: 'Invalid UPI ID',
        description: 'Please enter a valid UPI ID',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/auth');
        return;
      }
      const response = await axios.post(
        'http://localhost:3100/api/users/withdrawal',
        {
          amount: Number(withdrawAmount),
          upiId: withdrawUpiId,
          walletType: 'game'
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      if (response.data.success) {
        toast({
          title: 'Success',
          description: response.data.message,
        });
        setIsWithdrawDialogOpen(false);
        setWithdrawAmount('');
        setWithdrawUpiId('');
      } else {
        toast({
          title: 'Error',
          description: 'Failed to create withdraw request',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create withdraw request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch withdrawals from API
  const fetchWithdrawals = async () => {
    setIsLoadingWithdrawals(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/auth');
        return;
      }
      const response = await axios.get('http://localhost:3100/api/users/withdrawals', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setWithdrawals(response.data.withdrawals);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch withdrawal requests',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch withdrawal requests. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingWithdrawals(false);
    }
  };

  // Fetch withdrawals when Payment History tab is active
  useEffect(() => {
    if (activeTab === 'payments') {
      fetchWithdrawals();
    }
  }, [activeTab]);

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <header className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row items-center md:items-start gap-4"
        >
          <Avatar className="h-20 w-20">
            <AvatarImage src={`https://api.dicebear.com/7.x/shapes/svg?seed=${user.name}`} />
            <AvatarFallback>{user.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-bold tracking-tight">{user.name}</h1>
            <p className="text-muted-foreground">{user.email}</p>
            <div className="flex flex-wrap gap-2 mt-2 justify-center md:justify-start">
              <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                Gold Member
              </span>
              <span className="bg-amber-500/10 text-amber-500 text-xs px-2 py-1 rounded-full">
                3,450 XP
              </span>
            </div>
          </div>
          
          <div className="ml-auto flex gap-2 mt-4 md:mt-0">
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 md:grid-cols-6 mb-8">
            {menuItems.map((item) => (
              <TabsTrigger key={item.value} value={item.value} className="flex items-center gap-2">
                <span className="hidden md:inline-block">{item.icon}</span>
                <span className="text-xs md:text-sm">{item.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Manage your account details and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Full Name</p>
                      <p>{user.name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Email Address</p>
                      <p>{user.email}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Member Since</p>
                      <p>January 2025</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">User ID</p>
                      <p className="text-xs">{user.id}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">Account Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-card border rounded-lg p-4">
                      <p className="text-xs text-muted-foreground">Membership</p>
                      <p className="font-medium">Gold Level</p>
                    </div>
                    <div className="bg-card border rounded-lg p-4">
                      <p className="text-xs text-muted-foreground">Next Level</p>
                      <p className="font-medium">Platinum (550 XP needed)</p>
                    </div>
                    <div className="bg-card border rounded-lg p-4">
                      <p className="text-xs text-muted-foreground">Account Type</p>
                      <p className="font-medium">Individual</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button>Edit Profile</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wallet">
            <div className="space-y-6">
              {/* Wallet Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Wallet Overview</CardTitle>
                  <CardDescription>
                    Manage your funds and view your balance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Main Wallet */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">Main Wallet</h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowBalance(!showBalance)}
                        >
                          {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                      </div>
                      <div className="text-2xl font-bold">
                        {showBalance ? formatAmount(wallet.normal) : '****'}
                      </div>
                      <div className="flex gap-2">
                        <Dialog open={isDepositDialogOpen} onOpenChange={setIsDepositDialogOpen}>
                          <DialogTrigger asChild>
                            <Button className="flex items-center gap-2">
                              <Plus className="h-4 w-4" />
                              Deposit
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Make a Deposit</DialogTitle>
                              <DialogDescription>
                                Enter the amount you want to deposit to your Main Wallet
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid gap-2">
                                <Label htmlFor="amount">Amount (₹)</Label>
                                <Input
                                  id="amount"
                                  type="number"
                                  placeholder="Enter amount"
                                  value={depositAmount}
                                  onChange={(e) => setDepositAmount(e.target.value)}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                onClick={handleDeposit}
                                disabled={isSubmitting}
                                className="w-full"
                              >
                                {isSubmitting ? 'Processing...' : 'Confirm Deposit'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                    {/* Game Wallet */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">Game Wallet</h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowBalance(!showBalance)}
                        >
                          {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                      </div>
                      <div className="text-2xl font-bold">
                        {showBalance ? formatAmount(wallet.game) : '****'}
                      </div>
                      <div className="flex gap-2">
                        <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
                          <DialogTrigger asChild>
                            <Button className="flex items-center gap-2">
                              <Minus className="h-4 w-4" />
                              Withdraw
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Withdraw from Game Wallet</DialogTitle>
                              <DialogDescription>
                                Enter the amount and your UPI ID to withdraw from your Game Wallet
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid gap-2">
                                <Label htmlFor="withdraw-amount">Amount (₹)</Label>
                                <Input
                                  id="withdraw-amount"
                                  type="number"
                                  placeholder="Enter amount"
                                  value={withdrawAmount}
                                  onChange={(e) => setWithdrawAmount(e.target.value)}
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="withdraw-upi">UPI ID</Label>
                                <Input
                                  id="withdraw-upi"
                                  type="text"
                                  placeholder="Enter your UPI ID"
                                  value={withdrawUpiId}
                                  onChange={(e) => setWithdrawUpiId(e.target.value)}
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                onClick={handleWithdraw}
                                disabled={isSubmitting}
                                className="w-full"
                              >
                                {isSubmitting ? 'Processing...' : 'Confirm Withdraw'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Manage your wallet transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Dialog open={isDepositDialogOpen} onOpenChange={setIsDepositDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="h-20 flex-col gap-2">
                          <ArrowDownCircle className="h-6 w-6" />
                          <span>Deposit</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Make a Deposit</DialogTitle>
                          <DialogDescription>
                            Enter the amount you want to deposit
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="amount">Amount (₹)</Label>
                            <Input
                              id="amount"
                              type="number"
                              placeholder="Enter amount"
                              value={depositAmount}
                              onChange={(e) => setDepositAmount(e.target.value)}
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            onClick={handleDeposit}
                            disabled={isSubmitting}
                            className="w-full"
                          >
                            {isSubmitting ? 'Processing...' : 'Confirm Deposit'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button variant="outline" className="h-20 flex-col gap-2">
                      <ArrowUpCircle className="h-6 w-6" />
                      <span>Withdraw</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col gap-2">
                      <CreditCard className="h-6 w-6" />
                      <span>Add Card</span>
                    </Button>
                    <Button variant="outline" className="h-20 flex-col gap-2">
                      <Settings className="h-6 w-6" />
                      <span>Settings</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <CardTitle>Payment History</CardTitle>
                    <CardDescription>
                      View all your deposits and withdrawals
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex gap-1">
                      {/* <Button
                        size="sm"
                        variant={paymentFilter === 'all' ? 'default' : 'outline'}
                        onClick={() => setPaymentFilter('all')}
                      >
                        All
                      </Button> */}
                      <Button
                        size="sm"
                        variant={paymentFilter === 'deposit' ? 'default' : 'outline'}
                        onClick={() => setPaymentFilter('deposit')}
                      >
                        Deposits
                      </Button>
                      <Button
                        size="sm"
                        variant={paymentFilter === 'withdrawal' ? 'default' : 'outline'}
                        onClick={() => setPaymentFilter('withdrawal')}
                      >
                        Withdrawals
                      </Button>
                      {paymentFilter === 'deposit' && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={fetchDepositRequests}
                                disabled={isLoadingDeposits}
                                className="ml-2"
                              >
                                <RefreshCw className={`h-4 w-4 ${isLoadingDeposits ? 'animate-spin' : ''}`} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Get your latest payments</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {paymentFilter === 'deposit' ? (
                  <div className="space-y-4">
                    {isLoadingDeposits ? (
                      <div className="text-center py-8 text-muted-foreground">
                        Loading deposit requests...
                      </div>
                    ) : depositRequests.length > 0 ? (
                      depositRequests.map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full ${
                              request.status === 'approved' 
                                ? 'bg-green-100 text-green-600' 
                                : request.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-600'
                                : 'bg-red-100 text-red-600'
                            }`}>
                              <ArrowDownCircle className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-medium">
                                Deposit Request
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {request.notes}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Requested: {formatDate(request.requestDate)}
                                {request.approvedDate && ` • Approved: ${formatDate(request.approvedDate)}`}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-green-600">
                              +{formatAmount(request.amount)}
                            </p>
                            <Badge 
                              variant="secondary" 
                              className={getStatusColor(request.status)}
                            >
                              {request.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No deposit requests found
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {withdrawals.map((w) => (
                      <div
                        key={w.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${
                            w.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            w.status === 'approved' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            <ArrowUpCircle className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">
                              Withdrawal
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {w.amount}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(w.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${
                            w.status === 'pending' ? 'text-yellow-600' :
                            w.status === 'approved' ? 'text-green-600' :
                            'text-red-600'
                          }`}>
                            {w.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="mt-8">
                  <div className="flex items-center mb-2">
                    <h3 className="text-lg font-bold mr-2">Withdrawal Requests</h3>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={fetchWithdrawals}
                      disabled={isLoadingWithdrawals}
                      className="ml-1"
                    >
                      <RefreshCw className={`h-5 w-5 ${isLoadingWithdrawals ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                  {isLoadingWithdrawals ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Loading withdrawal requests...
                    </div>
                  ) : withdrawals.length > 0 ? (
                    <div className="space-y-4">
                      {withdrawals.map((w) => (
                        <div key={w.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg bg-muted/50">
                          <div className="flex-1">
                            <div className="font-medium text-base mb-1">₹{w.amount}</div>
                            <div className="text-sm text-muted-foreground mb-1">UPI: {w.upiId}</div>
                            <div className="text-xs text-muted-foreground">Requested: {formatDate(w.createdAt)}</div>
                            {w.processedAt && <div className="text-xs text-muted-foreground">Processed: {formatDate(w.processedAt)}</div>}
                            {w.remarks && <div className="text-xs text-yellow-700">Remarks: {w.remarks}</div>}
                          </div>
                          <div className="flex flex-col items-end mt-2 md:mt-0">
                            <Badge className={
                              w.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              w.status === 'approved' ? 'bg-green-100 text-green-800' :
                              'bg-red-100 text-red-800'
                            }>
                              {w.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No withdrawal requests found
                    </div>
                  )}
                </div>
                
                <div className="flex justify-center mt-6">
                  <Button variant="outline">Load More</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Other placeholder tabs */}
          {menuItems.filter(item => !['account', 'wallet', 'payments'].includes(item.value)).map((item) => (
            <TabsContent key={item.value} value={item.value}>
              <Card>
                <CardHeader>
                  <CardTitle>{item.label}</CardTitle>
                  <CardDescription>
                    Manage your {item.label.toLowerCase()} settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    This section is under development. Check back soon for updates.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </motion.div>
    </div>
  );
};

export default ProfilePage;