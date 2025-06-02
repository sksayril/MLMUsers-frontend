import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRightIcon } from '@radix-ui/react-icons';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

interface WalletData {
  normal: number;
  benefit: number;
  game: number;
}

const GamePage = () => {
  const [walletData, setWalletData] = useState<WalletData>({ normal: 0, benefit: 0, game: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferError, setTransferError] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch wallet data using useCallback to prevent dependency changes on every render
  const fetchWalletData = useCallback(async () => {
    try {
      setIsLoading(true);
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          variant: 'destructive',
          title: 'Authentication error',
          description: 'You are not logged in. Please log in to access your wallet.'
        });
        return;
      }

      const response = await axios.get('http://localhost:3100/api/users/wallet', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setWalletData(response.data.wallet);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error fetching wallet data',
        description: error.response?.data?.message || 'Could not retrieve your wallet information.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [setIsLoading, setWalletData, toast]);

  // Initial data fetch
  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  // Handle transfer dialog open
  const handleTransferClick = () => {
    setIsDialogOpen(true);
    setTransferAmount('');
    setTransferError('');
  };

  // Validate transfer amount
  const validateTransfer = (amount: number) => {
    if (isNaN(amount)) return 'Please enter a valid number';
    if (amount <= 0) return 'Amount must be greater than 0';
    if (amount > walletData.normal) return 'Insufficient funds in your normal wallet';
    return '';
  };

  // Handle transfer submission
  const handleTransferSubmit = async () => {
    const amount = parseFloat(transferAmount);
    const error = validateTransfer(amount);
    
    if (error) {
      setTransferError(error);
      return;
    }

    try {
      setIsLoading(true);
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          variant: 'destructive',
          title: 'Authentication error',
          description: 'You are not logged in. Please log in to transfer funds.'
        });
        return;
      }

      const response = await axios.post('http://localhost:3100/api/users/wallet/transfer', {
        fromWallet: 'normal',
        toWallet: 'game',
        amount
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setWalletData(response.data.wallet);
        setIsDialogOpen(false);
        toast({
          title: 'Transfer successful',
          description: `${amount} has been transferred to your game wallet.`
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Transfer failed',
        description: error.response?.data?.message || 'Could not complete the transfer. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent pb-2">Game Center</h1>
      
      {/* Wallet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Normal Wallet */}
        <Card className="overflow-hidden border border-blue-500/20 bg-[#161A42] text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-500/20 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6h18M3 12h18M3 18h12" />
                  </svg>
                </div>
                <CardTitle className="text-xl font-bold">Main Wallet</CardTitle>
              </div>
              <div className="text-sm px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                +2.4%
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-white mb-1">
              ₹{walletData.normal.toFixed(2)}
            </p>
            <p className="text-sm text-slate-400">Available balance</p>
          </CardContent>
        </Card>
        
        {/* Game Wallet */}
        <Card className="overflow-hidden border border-purple-500/20 bg-[#161A42] text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-500/20 rounded-full">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z" />
                  </svg>
                </div>
                <CardTitle className="text-xl font-bold">Game Wallet</CardTitle>
              </div>
              <div className="text-sm px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                +1.2%
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-white mb-1">
              ₹{walletData.game.toFixed(2)}
            </p>
            <p className="text-sm text-slate-400">For games & challenges</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Transfer Button - Centered */}
      <div className="flex justify-center py-4">
        <Button 
          variant="outline" 
          className="border-blue-500/30 hover:bg-blue-500/10 text-blue-400 px-6 gap-2" 
          onClick={handleTransferClick}
          disabled={isLoading || walletData.normal <= 0}
        >
          Transfer to Game Wallet
          <ArrowRightIcon className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Game Cards */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Games</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Color Prediction Game */}
          <Card className="overflow-hidden border border-blue-500/20 bg-gradient-to-br from-[#1E254A] to-[#161A42] text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full translate-y-12 -translate-x-12"></div>
            
            <CardHeader>
              <CardTitle className="text-xl font-bold">Color Prediction</CardTitle>
              <CardDescription className="text-slate-400">Predict colors and win rewards</CardDescription>
            </CardHeader>
            
            <CardContent className="relative">
              <div className="flex flex-wrap gap-3 mb-4">
                <div className="w-10 h-10 bg-red-500 rounded-full"></div>
                <div className="w-10 h-10 bg-green-500 rounded-full"></div>
                <div className="w-10 h-10 bg-blue-500 rounded-full"></div>
                <div className="w-10 h-10 bg-yellow-500 rounded-full"></div>
              </div>
              
              <Button 
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-none" 
                onClick={() => navigate('/games/color-prediction')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Play Now
              </Button>
            </CardContent>
          </Card>
          
          {/* Big and Small Game */}
          <Card className="overflow-hidden border border-purple-500/20 bg-gradient-to-br from-[#1E254A] to-[#161A42] text-white">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-pink-500/10 rounded-full translate-y-12 -translate-x-12"></div>
            
            <CardHeader>
              <CardTitle className="text-xl font-bold">Big And Small</CardTitle>
              <CardDescription className="text-slate-400">Guess the numbers and win big</CardDescription>
            </CardHeader>
            
            <CardContent className="relative">
              <div className="flex justify-center gap-4 mb-4">
                <div className="w-12 h-12 bg-purple-900/50 border border-purple-500/30 rounded-lg flex items-center justify-center text-xl font-bold">3</div>
                <div className="w-12 h-12 bg-purple-900/50 border border-purple-500/30 rounded-lg flex items-center justify-center text-xl font-bold">6</div>
                <div className="w-12 h-12 bg-purple-900/50 border border-purple-500/30 rounded-lg flex items-center justify-center text-xl font-bold">9</div>
              </div>
              
              <Button 
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-none" 
                onClick={() => navigate('/games/big-small')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                Play Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Transfer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer to Game Wallet</DialogTitle>
            <DialogDescription>
              Transfer funds from your normal wallet to your game wallet.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">Amount</Label>
              <Input
                id="amount"
                type="number"
                value={transferAmount}
                onChange={(e) => {
                  setTransferAmount(e.target.value);
                  setTransferError('');
                }}
                placeholder="Enter amount"
                className="col-span-3"
              />
            </div>
            {transferError && (
              <p className="text-sm text-destructive col-start-2 col-span-3">{transferError}</p>
            )}
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="text-right">Available:</div>
              <div className="col-span-3">{walletData.normal.toFixed(2)}</div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleTransferSubmit} disabled={isLoading}>Transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GamePage;