import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Target } from 'lucide-react';

// Interface for number game room data
interface NumberGameRoom {
  id: string;
  roomId: string;
  entryFee: number;
  winningMultiplier: number;
  maxPlayers: number;
  currentPlayers: number;
  bigPlayers: number;
  smallPlayers: number;
  status: string;
  createdAt: string;
}

interface WalletData {
  normal: number;
  benefit: number;
  game: number;
}

const BigSmallGame = () => {
  const [gameRooms, setGameRooms] = useState<NumberGameRoom[]>([]);
  const [walletData, setWalletData] = useState<WalletData>({ normal: 0, benefit: 0, game: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<NumberGameRoom | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState<string>('');
  const [predictionType, setPredictionType] = useState<'big' | 'small' | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch wallet data
  const fetchWalletData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          variant: 'destructive',
          title: 'Authentication error',
          description: 'You are not logged in. Please log in to access wallet data.'
        });
        navigate('/login');
        return;
      }

      const response = await axios.get('https://api.utpfund.live/api/users/wallet', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setWalletData(response.data.wallet);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error fetching wallet',
          description: 'Could not retrieve wallet information.'
        });
      }
    } catch (error) {
      const errorResponse = error as { response?: { data?: { message?: string } } };
      toast({
        variant: 'destructive',
        title: 'Error fetching wallet',
        description: errorResponse.response?.data?.message || 'Could not retrieve wallet information.'
      });
    }
  }, [toast, navigate]);

  // Fetch game rooms
  const fetchGameRooms = useCallback(async (isInitialFetch = false) => {
    try {
      // First load shows full loading state, polling shows subtle indicator
      if (isInitialFetch) {
        setIsLoading(true);
      } else {
        setIsPolling(true);
      }
      
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          variant: 'destructive',
          title: 'Authentication error',
          description: 'You are not logged in. Please log in to access game rooms.'
        });
        navigate('/login');
        return;
      }

      const response = await axios.get('https://api.utpfund.live/api/number-game/rooms', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        // Preserve existing room data and update only changes to avoid UI jumps
        if (gameRooms.length > 0 && !isInitialFetch) {
          // Map through existing rooms and update their data
          const updatedRooms = gameRooms.map(existingRoom => {
            // Find matching room in new data
            const updatedRoom = response.data.gameRooms.find(
              (newRoom: NumberGameRoom) => newRoom.roomId === existingRoom.roomId
            );
            // Return updated room if found, otherwise keep existing
            return updatedRoom || existingRoom;
          });
          
          // Add any new rooms that weren't in our existing list
          const existingRoomIds = updatedRooms.map(room => room.roomId);
          const newRooms = response.data.gameRooms.filter(
            (room: NumberGameRoom) => !existingRoomIds.includes(room.roomId)
          );
          
          setGameRooms([...updatedRooms, ...newRooms]);
        } else {
          // Initial load - just set all rooms
          setGameRooms(response.data.gameRooms);
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Error fetching game rooms',
          description: 'Could not retrieve game rooms information.'
        });
      }
    } catch (error) {
      const errorResponse = error as { response?: { data?: { message?: string } } };
      toast({
        variant: 'destructive',
        title: 'Error fetching game rooms',
        description: errorResponse.response?.data?.message || 'Could not retrieve game rooms information.'
      });
    } finally {
      setIsLoading(false);
      setIsPolling(false);
    }
  }, [gameRooms, setIsLoading, setIsPolling, setGameRooms, toast, navigate]);
  
  // Use a ref to track if a fetch is in progress to prevent overlapping calls
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);

  // Combined fetch function to get both wallet and rooms data
  const fetchAllData = useCallback(async (isInitialFetch = false) => {
    // Prevent overlapping fetch calls
    if (isFetchingRef.current) {
      console.log('Fetch already in progress, skipping...');
      return;
    }

    // Check if 20 seconds have passed since the last fetch
    const currentTime = Date.now();
    if (!isInitialFetch && currentTime - lastFetchTimeRef.current < 20000) {
      console.log('Not enough time passed since last fetch, skipping...');
      return;
    }
    
    try {
      console.log('Fetching wallet and number game room data...');
      isFetchingRef.current = true;
      lastFetchTimeRef.current = currentTime;
      
      // Fetch both data in parallel
      await Promise.all([
        fetchGameRooms(isInitialFetch),
        fetchWalletData()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      isFetchingRef.current = false;
    }
  }, [fetchGameRooms, fetchWalletData]);

  useEffect(() => {
    // Initial fetch when component mounts
    fetchAllData(true);
    
    // Set up polling every 20 seconds
    const pollingInterval = setInterval(() => {
      fetchAllData(false);
    }, 20000);
    
    // Clean up interval on component unmount
    return () => {
      console.log('Clearing number game polling interval');
      clearInterval(pollingInterval);
    };
  }, [fetchAllData]);

  // Open prediction dialog
  const openPredictionDialog = (room: NumberGameRoom) => {
    setSelectedRoom(room);
    setPredictionType(null);
    setSelectedNumber(null);
    setBetAmount(room.entryFee.toString());
    setIsPredicting(true);
  };

  // Handle number selection
  const handleNumberSelect = (number: number) => {
    setSelectedNumber(number);
    setPredictionType(number >= 1 && number <= 5 ? 'small' : 'big');
  };

  // Join a game room
  const handleJoinRoom = async () => {
    if (!selectedRoom || !predictionType || !betAmount) {
      toast({
        variant: 'destructive',
        title: 'Incomplete selection',
        description: 'Please select a number and enter a bet amount.'
      });
      return;
    }

    // Check if user has enough in wallet
    if (walletData.game < parseFloat(betAmount)) {
      toast({
        variant: 'destructive',
        title: 'Insufficient funds',
        description: 'You do not have enough balance in your game wallet.'
      });
      return;
    }

    const roomId = selectedRoom.roomId;
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          variant: 'destructive',
          title: 'Authentication error',
          description: 'You are not logged in. Please log in to join the game.'
        });
        navigate('/login');
        return;
      }
      
      toast({
        title: "Joining game room...",
        description: `Joining room ${roomId} with ${predictionType} prediction (₹${betAmount})`
      });
      
      // Call the join API
      const response = await axios.post('https://api.utpfund.live/api/number-game/room/join', {
        roomId,
        numberType: predictionType,
        entryAmount: parseFloat(betAmount)
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        toast({
          title: "Successfully joined!",
          description: `You have joined room ${roomId} with a ${predictionType} prediction.`
        });
        
        // Navigate to the room
        navigate(`/games/big-small/room/${roomId}`);
      } else {
        toast({
          variant: 'destructive',
          title: 'Failed to join room',
          description: response.data.message || 'An error occurred while joining the game room.'
        });
      }
      
      // Close the dialog
      setIsPredicting(false);
    } catch (error) {
      const errorResponse = error as { response?: { data?: { message?: string } } };
      toast({
        variant: 'destructive',
        title: 'Failed to join room',
        description: errorResponse.response?.data?.message || 'An error occurred while joining the game room.'
      });
    }
  };

  // Format date to a readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
          🎲 Big Small Number Game
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-2xl mx-auto">
          Choose Big or Small to predict the outcome of the random number. Join a game room below!
        </p>
        
        {/* Wallet Information */}
        <div className="flex flex-wrap justify-center gap-4 mb-6">
          <Card className="bg-gradient-to-r from-slate-800 to-slate-900 text-white w-full max-w-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Your Game Wallet</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-400" />
                  <span className="text-gray-300">Balance:</span>
                </div>
                <span className="text-xl font-bold text-green-400">₹{walletData.game}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 rounded-full border-4 border-t-blue-500 border-b-blue-700 border-l-blue-600 border-r-blue-600 animate-spin"></div>
            <p className="text-slate-500 dark:text-slate-400">Loading game rooms...</p>
          </div>
        </div>
      ) : gameRooms.length > 0 ? (
        <div className="space-y-6">
          {isPolling && (
            <div className="flex justify-center items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
              <div className="animate-spin rounded-full h-3 w-3 border-t-1 border-b-1 border-white"></div>
              <span>Updating...</span>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {gameRooms.map((room) => (
              <Card key={room.id} className="overflow-hidden border border-blue-500/20 bg-gradient-to-br from-[#1E254A] to-[#161A42] text-white relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full translate-y-12 -translate-x-12"></div>
                
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold">Room {room.roomId}</CardTitle>
                    <Badge variant={room.status === 'waiting' ? 'outline' : 'secondary'} className={`capitalize ${room.status === 'waiting' ? 'bg-green-500/20 text-green-400 border-green-500/50' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'}`}>
                      {room.status}
                    </Badge>
                  </div>
                  <CardDescription className="text-slate-400">
                    Created on {formatDate(room.createdAt)}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="flex justify-center items-center gap-4">
                    <div className="text-lg text-slate-300 font-medium">Players:</div>
                    <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      {room.currentPlayers} / {room.maxPlayers}
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="flex flex-col gap-2">
                  {room.status === 'waiting' && room.currentPlayers < room.maxPlayers ? (
                    <Button 
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-800 hover:from-blue-700 hover:to-purple-900 border-none" 
                      onClick={() => openPredictionDialog(room)}
                    >
                      Join Room
                    </Button>
                  ) : room.status !== 'waiting' ? (
                    <Button disabled className="w-full bg-slate-700 text-slate-400">
                      Game in progress
                    </Button>
                  ) : (
                    <Button disabled className="w-full bg-slate-700 text-slate-400">
                      Room Full
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="inline-block p-4 rounded-full bg-blue-500/10 mb-4">
            <Target className="h-10 w-10 text-blue-500" />
          </div>
          <h3 className="text-xl font-medium mb-2">No Game Rooms Available</h3>
          <p className="text-muted-foreground">
            There are currently no active game rooms. Please check back later.
          </p>
        </div>
      )}

      {/* Prediction Dialog */}
      <Dialog open={isPredicting} onOpenChange={(open) => setIsPredicting(open)}>
        <DialogContent className="bg-gradient-to-br from-[#1E2749] to-[#161A35] text-white border border-blue-500/20 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Make Your Prediction</DialogTitle>
            <DialogDescription className="text-slate-400">
              Select a number (1-5 for Small, 6-9 for Big) and enter your bet amount.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-3">
            {/* Number Balls */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-300">Select a Number:</div>
              <div className="flex justify-center flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((number) => (
                  <button
                    key={number}
                    onClick={() => handleNumberSelect(number)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all ${
                      selectedNumber === number
                        ? 'bg-gradient-to-r from-green-500 to-emerald-700 ring-2 ring-green-400 shadow-lg scale-110'
                        : 'bg-gradient-to-r from-slate-700 to-slate-800 hover:scale-105'
                    }`}
                  >
                    {number}
                  </button>
                ))}
              </div>
              <div className="flex justify-center flex-wrap gap-2">
                {[6, 7, 8, 9].map((number) => (
                  <button
                    key={number}
                    onClick={() => handleNumberSelect(number)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all ${
                      selectedNumber === number
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-700 ring-2 ring-blue-400 shadow-lg scale-110'
                        : 'bg-gradient-to-r from-slate-700 to-slate-800 hover:scale-105'
                    }`}
                  >
                    {number}
                  </button>
                ))}
              </div>

              {selectedNumber !== null && (
                <div className="text-center mt-3 text-sm">
                  <span className="px-3 py-1 rounded-full bg-slate-700">
                    Prediction: <span className={`font-bold ${predictionType === 'small' ? 'text-green-400' : 'text-blue-400'}`}>
                      {predictionType?.toUpperCase()}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {/* Bet Amount */}
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-300">Your Bet Amount (₹):</div>
              <div className="flex flex-col gap-2">
                <Input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="Enter bet amount"
                  className="bg-slate-800 border-slate-700 text-white"
                  min="1"
                />
                <div className="text-xs text-slate-400">
                  Your wallet balance: <span className="text-green-400">₹{walletData.game}</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsPredicting(false)} className="flex-1 bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">
              Cancel
            </Button>
            <Button 
              onClick={handleJoinRoom} 
              disabled={!selectedNumber || !predictionType || !betAmount || parseFloat(betAmount) <= 0 || parseFloat(betAmount) > walletData.game}
              className="flex-1 bg-gradient-to-r from-blue-600 to-purple-800 hover:from-blue-700 hover:to-purple-900 border-none"
            >
              Confirm Bet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BigSmallGame;
