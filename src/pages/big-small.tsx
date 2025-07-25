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
    console.log('Confirm Bet clicked!', { selectedRoom, selectedNumber, predictionType, betAmount, walletData });
    
    if (!selectedRoom || !selectedNumber || !predictionType || !betAmount) {
      toast({
        variant: 'destructive',
        title: 'Incomplete selection',
        description: 'Please select a number and enter a bet amount.'
      });
      return;
    }

    const betAmountNum = parseFloat(betAmount);
    if (isNaN(betAmountNum) || betAmountNum <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid bet amount',
        description: 'Please enter a valid bet amount greater than 0.'
      });
      return;
    }

    // Check if user has enough in wallet
    if (walletData.game < betAmountNum) {
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
        entryAmount: betAmountNum
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
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-slate-800 relative overflow-hidden">
      {/* Premium Casino Background Effects with Advanced Animations */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-blue-900/10 to-red-900/10 animate-pulse"></div>
      
      {/* Floating Casino Elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-red-500/5 to-transparent rounded-full blur-3xl animate-pulse opacity-60"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-tl from-blue-500/5 to-transparent rounded-full blur-3xl animate-pulse delay-1000 opacity-60"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-green-500/5 to-transparent rounded-full blur-3xl animate-pulse delay-500 opacity-60"></div>
      
      {/* Floating Casino Chips Animation */}
      <div className="absolute top-20 left-10 w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full animate-bounce opacity-20" style={{ animationDelay: '0s', animationDuration: '3s' }}></div>
      <div className="absolute top-40 right-20 w-6 h-6 bg-gradient-to-br from-red-400 to-red-600 rounded-full animate-bounce opacity-20" style={{ animationDelay: '1s', animationDuration: '4s' }}></div>
      <div className="absolute bottom-32 left-20 w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full animate-bounce opacity-20" style={{ animationDelay: '2s', animationDuration: '3.5s' }}></div>
      <div className="absolute bottom-20 right-10 w-7 h-7 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full animate-bounce opacity-20" style={{ animationDelay: '0.5s', animationDuration: '3.8s' }}></div>
      
      {/* Floating Sparkles */}
      <div className="absolute top-1/4 left-1/3 w-2 h-2 bg-yellow-400 rounded-full animate-ping opacity-30" style={{ animationDelay: '0s', animationDuration: '2s' }}></div>
      <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-white rounded-full animate-ping opacity-40" style={{ animationDelay: '1s', animationDuration: '2.5s' }}></div>
      <div className="absolute top-1/2 left-10 w-1.5 h-1.5 bg-green-400 rounded-full animate-ping opacity-30" style={{ animationDelay: '2s', animationDuration: '2.2s' }}></div>
      <div className="absolute bottom-1/4 right-20 w-2 h-2 bg-red-400 rounded-full animate-ping opacity-25" style={{ animationDelay: '0.8s', animationDuration: '2.8s' }}></div>
      
      {/* Rotating Casino Symbols */}
      <div className="absolute top-16 right-16 text-yellow-400 opacity-10 animate-spin" style={{ animationDuration: '8s' }}>
        <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      </div>
      <div className="absolute bottom-16 left-16 text-red-400 opacity-10 animate-spin" style={{ animationDuration: '12s' }}>
        <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
        </svg>
      </div>
      
      <div className="container mx-auto py-8 px-4 relative z-10">
        {/* Premium Casino Header */}
        <div className="relative mb-12">
          {/* Neon Header Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 via-yellow-500/20 via-green-500/20 to-blue-600/20 rounded-3xl blur-xl animate-pulse"></div>
          
          <div className="relative bg-black/70 backdrop-blur-xl rounded-3xl p-8 border-2 border-gradient-to-r from-red-500/50 via-yellow-500/50 via-green-500/50 to-blue-500/50">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="text-center lg:text-left">
                <h1 className="text-5xl lg:text-6xl font-black mb-4 tracking-wider">
                  <span className="bg-gradient-to-r from-orange-400 via-yellow-400 to-red-400 bg-clip-text text-transparent animate-pulse">
                    🎲 BIG SMALL PREDICTION 🎲
                  </span>
        </h1>
                <p className="text-xl text-slate-300 font-semibold">
                  🔥 Choose Big or Small, Win Massive Prizes! 🔥
        </p>
                <div className="flex justify-center lg:justify-start gap-3 mt-4">
                  <div className="w-8 h-8 rounded-full animate-bounce shadow-lg bg-green-500 shadow-green-500/50 hover:animate-spin transition-all duration-300 cursor-pointer" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-8 h-8 rounded-full animate-bounce shadow-lg bg-red-500 shadow-red-500/50 hover:animate-spin transition-all duration-300 cursor-pointer" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-8 h-8 rounded-full animate-bounce shadow-lg bg-blue-500 shadow-blue-500/50 hover:animate-spin transition-all duration-300 cursor-pointer" style={{ animationDelay: '300ms' }}></div>
                  <div className="w-8 h-8 rounded-full animate-bounce shadow-lg bg-yellow-500 shadow-yellow-500/50 hover:animate-spin transition-all duration-300 cursor-pointer" style={{ animationDelay: '450ms' }}></div>
                  
                  {/* Additional animated casino elements */}
                  <div className="w-6 h-6 rounded-full animate-pulse shadow-lg bg-purple-500 shadow-purple-500/50 ml-2" style={{ animationDelay: '600ms', animationDuration: '1.5s' }}></div>
                  <div className="w-4 h-4 rounded-full animate-ping shadow-lg bg-orange-500 shadow-orange-500/50 mt-2" style={{ animationDelay: '800ms', animationDuration: '2s' }}></div>
                </div>
              </div>
              
              <div className="flex flex-col items-center gap-4">
                <Button 
                  onClick={() => navigate('/game')} 
                  className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 border-2 border-gray-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition-all"
                >
                  ← Back to Games
                </Button>
                
                {/* Premium Wallet Display with Animations */}
                <div className="bg-gradient-to-r from-green-800 to-emerald-800 p-4 rounded-2xl border-4 border-green-400/50 shadow-2xl shadow-green-500/20 hover:shadow-3xl hover:shadow-green-500/30 transition-all duration-300 transform hover:scale-105">
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg animate-pulse hover:animate-spin transition-all duration-300">
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
                      </svg>
                      {/* Wallet sparkles */}
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping opacity-75"></div>
                      <div className="absolute -bottom-1 -left-1 w-1 h-1 bg-white rounded-full animate-ping opacity-60" style={{ animationDelay: '0.5s' }}></div>
                    </div>
                    <div className="relative">
                      <p className="text-green-200 font-semibold text-sm animate-pulse">💰 GAME WALLET</p>
                      <p className="text-white font-black text-2xl hover:text-green-300 transition-colors duration-300">₹{walletData.game.toFixed(2)}</p>
                      {/* Amount highlight effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-pulse opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
                    </div>
                  </div>
                </div>
        </div>
      </div>
          </div>
        </div>
      
        {/* Loading State with Casino Theme */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="relative">
              <div className="w-24 h-24 border-8 border-yellow-500/20 rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-24 h-24 border-8 border-t-yellow-500 border-r-red-500 border-b-green-500 border-l-blue-500 rounded-full animate-spin"></div>
            </div>
            <p className="text-yellow-400 font-bold text-xl mt-6 animate-pulse">🎰 Loading Casino Tables... 🎰</p>
        </div>
      ) : gameRooms.length > 0 ? (
          <div className="relative">
            {/* Live Update Indicator */}
          {isPolling && (
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-20 flex items-center gap-3 px-6 py-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 shadow-xl border-2 border-purple-400/50 animate-pulse">
                <div className="w-4 h-4 bg-white rounded-full animate-ping"></div>
                <span className="text-white font-bold text-sm">🔄 LIVE UPDATES</span>
            </div>
          )}
          
            {/* Premium Game Tables Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {gameRooms.map((room, index) => (
                <div 
                  key={room.id} 
                  className="group relative transform opacity-0 transition-all duration-700 hover:scale-105"
                  style={{ 
                    animation: `fadeInUp 0.6s ease-out ${index * 0.15}s forwards`,
                    transform: 'translateY(20px)'
                  }}
                >
                  {/* Table Glow Effect with Enhanced Animation */}
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-yellow-500/20 via-green-500/20 to-blue-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500 animate-pulse group-hover:animate-ping"></div>
                  
                  {/* Casino Table Card */}
                  <Card className="relative bg-gradient-to-br from-emerald-900/95 via-green-900/90 to-emerald-950/95 border-4 border-yellow-500/30 rounded-3xl overflow-hidden shadow-2xl hover:shadow-yellow-500/20 transition-all duration-500 transform hover:scale-105">
                    {/* Table Felt Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-green-900/40 to-green-800/40"></div>
                    
                    {/* Decorative Casino Elements */}
                    <div className="absolute top-4 right-4 w-20 sm:w-24 lg:w-32 h-20 sm:h-24 lg:h-32 bg-gradient-to-br from-yellow-400/10 to-transparent rounded-full blur-xl animate-pulse"></div>
                    <div className="absolute bottom-4 left-4 w-16 sm:w-18 lg:w-24 h-16 sm:h-18 lg:h-24 bg-gradient-to-tl from-red-400/10 to-transparent rounded-full blur-xl animate-pulse delay-500"></div>
                
                    <CardHeader className="relative z-10 pb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="bg-gradient-to-r from-yellow-500 to-amber-500 px-4 py-2 rounded-full border-2 border-yellow-400">
                          <CardTitle className="text-xl font-black text-black">🎲 TABLE {room.roomId}</CardTitle>
                        </div>
                        <Badge 
                          className={`px-3 py-1 font-bold text-sm border-2 ${
                            room.status === 'waiting' 
                              ? 'bg-green-500 border-green-400 text-white animate-pulse' 
                              : 'bg-red-500 border-red-400 text-white'
                          }`}
                        >
                          {room.status === 'waiting' ? 'OPEN' : 'BUSY'}
                    </Badge>
                  </div>
                      <CardDescription className="text-slate-300 font-medium">
                        🕒 Created: {formatDate(room.createdAt)}
                  </CardDescription>
                </CardHeader>
                
                    <CardContent className="relative z-10 space-y-6">
                      {/* Premium Stats Display */}
                      <div className="bg-black/50 rounded-2xl p-4 border-2 border-yellow-500/30 backdrop-blur-sm">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <p className="text-yellow-400 font-bold text-xs mb-1 sm:mb-2 tracking-wider">💵 ENTRY FEE</p>
                            <p className="text-white font-black text-lg">₹{room.entryFee}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-green-400 font-bold text-xs mb-1 sm:mb-2 tracking-wider">🏆 WIN AMOUNT</p>
                            <p className="text-white font-black text-lg">₹{(room.entryFee * room.winningMultiplier).toFixed(0)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-purple-400 font-bold text-xs mb-1 sm:mb-2 tracking-wider">⚡ MULTIPLIER</p>
                            <p className="text-white font-black text-lg">x{room.winningMultiplier}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-blue-400 font-bold text-xs mb-1 sm:mb-2 tracking-wider">👥 PLAYERS</p>
                            <p className="text-white font-black text-lg">{room.currentPlayers}/{room.maxPlayers}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Premium Betting Chips Section with Enhanced Animations */}
                      <div className="bg-gradient-to-br from-amber-900/50 to-yellow-900/50 rounded-2xl p-4 border-2 border-amber-500/40 shadow-xl hover:shadow-2xl transition-all duration-300">
                        <h3 className="text-center font-black text-amber-400 mb-3 text-sm tracking-wider animate-pulse">⚡ PREMIUM BETTING CHIPS ⚡</h3>
                        <div className="flex justify-center gap-3">
                          <div className="relative group">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full border-3 border-white/70 shadow-lg flex items-center justify-center cursor-pointer transform transition-all duration-300 hover:scale-110 hover:rotate-12 hover:shadow-green-500/50 animate-pulse">
                              <span className="text-white font-black text-sm group-hover:animate-bounce">SMALL</span>
                            </div>
                            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-green-400 font-bold whitespace-nowrap animate-bounce" style={{ animationDelay: '0.2s', animationDuration: '1.5s' }}>1-5</div>
                            {/* Chip sparkle effect */}
                            <div className="absolute top-1 right-1 w-1 h-1 bg-white rounded-full animate-ping opacity-75" style={{ animationDelay: '0.5s' }}></div>
                          </div>
                          <div className="relative group">
                            <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-full border-3 border-white/70 shadow-lg flex items-center justify-center cursor-pointer transform transition-all duration-300 hover:scale-110 hover:rotate-12 hover:shadow-red-500/50 animate-pulse" style={{ animationDelay: '0.3s' }}>
                              <span className="text-white font-black text-sm group-hover:animate-bounce">BIG</span>
                            </div>
                            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-red-400 font-bold whitespace-nowrap animate-bounce" style={{ animationDelay: '0.8s', animationDuration: '1.5s' }}>6-9</div>
                            {/* Chip sparkle effect */}
                            <div className="absolute top-1 right-1 w-1 h-1 bg-white rounded-full animate-ping opacity-75" style={{ animationDelay: '1s' }}></div>
                          </div>
                    </div>
                  </div>
                </CardContent>
                
                    <CardFooter className="relative z-10 pt-4">
                      <div className="relative w-full">
                        {/* Button glow effect */}
                        {room.status === 'waiting' && room.currentPlayers < room.maxPlayers && (
                          <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl blur-lg opacity-20 animate-pulse"></div>
                        )}
                        
                    <Button 
                          className={`relative w-full font-black text-lg py-4 rounded-2xl border-4 transition-all duration-300 transform ${
                            room.status === 'waiting' && room.currentPlayers < room.maxPlayers
                              ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 border-green-400 text-white shadow-xl hover:shadow-green-500/40 hover:scale-105 hover:-translate-y-1 animate-pulse'
                              : 'bg-gradient-to-r from-gray-600 to-gray-700 border-gray-500 text-gray-300 cursor-not-allowed opacity-70'
                          }`}
                      onClick={() => openPredictionDialog(room)}
                          disabled={room.status !== 'waiting' || room.currentPlayers >= room.maxPlayers}
                        >
                          <span className="relative z-10 flex items-center justify-center gap-2">
                            {room.currentPlayers >= room.maxPlayers ? (
                              <>
                                <span className="animate-pulse">🚫</span>
                                <span>TABLE FULL</span>
                              </>
                  ) : room.status !== 'waiting' ? (
                              <>
                                <span className="animate-spin">⏳</span>
                                <span>GAME IN PROGRESS</span>
                              </>
                            ) : (
                              <>
                                <span className="animate-bounce">🎮</span>
                                <span>JOIN TABLE</span>
                                <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>💎</span>
                              </>
                            )}
                          </span>
                          
                          {/* Button sparkle effects for available tables */}
                          {room.status === 'waiting' && room.currentPlayers < room.maxPlayers && (
                            <>
                              <div className="absolute top-2 left-4 w-1 h-1 bg-white rounded-full animate-ping opacity-60" style={{ animationDelay: '0s' }}></div>
                              <div className="absolute bottom-2 right-4 w-1 h-1 bg-white rounded-full animate-ping opacity-60" style={{ animationDelay: '0.5s' }}></div>
                              <div className="absolute top-2 right-8 w-0.5 h-0.5 bg-yellow-300 rounded-full animate-ping opacity-80" style={{ animationDelay: '1s' }}></div>
                            </>
                          )}
                    </Button>
                      </div>
                </CardFooter>
              </Card>
                </div>
            ))}
          </div>
        </div>
      ) : (
          /* Premium Empty State */
          <div className="text-center py-16">
            <div className="relative inline-block mb-8">
              <div className="w-32 h-32 bg-gradient-to-br from-red-500/20 via-yellow-500/20 via-green-500/20 to-blue-500/20 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-16 h-16 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
          </div>
            <h3 className="text-3xl font-black text-white mb-4">🎰 No Tables Available 🎰</h3>
            <p className="text-slate-400 text-lg max-w-md mx-auto">
              All casino tables are currently busy. New tables open every few minutes - check back soon for your chance to win big!
            </p>
            <div className="flex justify-center gap-3 mt-6">
              <div className="w-6 h-6 rounded-full animate-bounce bg-green-500" style={{ animationDelay: '0s' }}></div>
              <div className="w-6 h-6 rounded-full animate-bounce bg-red-500" style={{ animationDelay: '0.3s' }}></div>
              <div className="w-6 h-6 rounded-full animate-bounce bg-blue-500" style={{ animationDelay: '0.6s' }}></div>
              <div className="w-6 h-6 rounded-full animate-bounce bg-yellow-500" style={{ animationDelay: '0.9s' }}></div>
            </div>
        </div>
      )}

                {/* Premium Casino Prediction Dialog */}
      <Dialog open={isPredicting} onOpenChange={(open) => setIsPredicting(open)}>
        <DialogContent className="bg-gradient-to-br from-black via-gray-900 to-slate-800 text-white border-4 border-yellow-500/50 w-[95vw] sm:w-[85vw] md:w-[75vw] lg:w-[65vw] xl:w-[55vw] max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl shadow-yellow-500/30 p-0 animate-in zoom-in-95 duration-300 rounded-3xl">
          {/* Casino Background Image */}
          <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 rounded-3xl" 
               style={{
                 backgroundImage: `url('https://plus.unsplash.com/premium_photo-1718992227549-c735b9e453ca?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8cG9rZXIlMjBjaGlwc3xlbnwwfHwwfHx8MA%3D%3D')`
               }}>
          </div>
          
          {/* Casino Background Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-gray-900/70 to-slate-800/80 rounded-3xl"></div>
          
          {/* Premium Casino Header with Enhanced Animations */}
          <div className="relative bg-gradient-to-r from-red-600 via-yellow-500 via-green-500 to-blue-600 p-1 rounded-t-2xl animate-pulse">
            <div className="bg-black/90 backdrop-blur-xl p-4 sm:p-6 md:p-8 rounded-t-2xl relative overflow-hidden">
              {/* Animated Background Elements */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 via-yellow-900/20 to-green-900/20 animate-pulse"></div>
              <div className="absolute top-2 right-4 w-8 h-8 bg-yellow-400/20 rounded-full animate-ping"></div>
              <div className="absolute bottom-2 left-4 w-6 h-6 bg-red-400/20 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-green-400/20 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
              
              <DialogHeader className="text-center relative z-10">
                {/* Casino Neon Border Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 via-red-500 via-purple-500 to-yellow-400 rounded-2xl blur-lg opacity-30 animate-pulse"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 via-red-500 via-purple-500 to-yellow-400 rounded-2xl opacity-20 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                
                {/* Casino Chips Background */}
                <div className="absolute top-2 left-4 w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full animate-bounce opacity-60" style={{ animationDelay: '0s' }}></div>
                <div className="absolute top-4 right-6 w-4 h-4 bg-gradient-to-br from-red-400 to-red-600 rounded-full animate-bounce opacity-60" style={{ animationDelay: '0.3s' }}></div>
                <div className="absolute bottom-4 left-6 w-5 h-5 bg-gradient-to-br from-green-400 to-green-600 rounded-full animate-bounce opacity-60" style={{ animationDelay: '0.6s' }}></div>
                <div className="absolute bottom-2 right-4 w-3 h-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full animate-bounce opacity-60" style={{ animationDelay: '0.9s' }}></div>
                
                {/* Floating Casino Symbols */}
                <div className="absolute top-1/2 left-2 text-yellow-400 opacity-40 animate-spin" style={{ animationDuration: '8s' }}>
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                </div>
                <div className="absolute top-1/2 right-2 text-red-400 opacity-40 animate-spin" style={{ animationDuration: '12s' }}>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
                  </svg>
                </div>
                
                {/* Main Casino Title Container */}
                <div className="relative bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-xl rounded-2xl p-6 sm:p-8 md:p-10 border-4 border-gradient-to-r from-yellow-400/60 via-orange-400/60 via-red-400/60 via-purple-400/60 to-yellow-400/60 shadow-2xl">
                <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-90 rounded-3xl" 
               style={{
                 backgroundImage: `url('https://plus.unsplash.com/premium_photo-1718992227549-c735b9e453ca?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NXx8cG9rZXIlMjBjaGlwc3xlbnwwfHwwfHx8MA%3D%3D')`
               }}>
          </div>
                  {/* Casino Title with Enhanced Effects */}
                  <DialogTitle className="relative text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-wider mb-6 sm:mb-8 drop-shadow-2xl">
                    {/* Title Glow Effect */}
                    
                    <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 via-red-500 via-purple-500 to-yellow-400 bg-clip-text text-transparent blur-sm animate-pulse opacity-50"></div>
                    
                    {/* Main Title Text */}
                    <div className="relative flex items-center justify-center gap-2 sm:gap-4">
                      <div className="relative">
                        <span className="inline-block animate-bounce text-3xl sm:text-4xl md:text-5xl lg:text-6xl" style={{ animationDelay: '0s' }}>🎰</span>
                        {/* Slot machine sparkle effect */}
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping opacity-75"></div>
                      </div>
                      
                      <span className="text-gold-400 text-6xl rounded-lg p-2">
                        PLACE YOUR 
                      </span>
                      
                      <div className="relative">
                        <span className="inline-block animate-bounce text-3xl sm:text-4xl md:text-5xl lg:text-6xl" style={{ animationDelay: '0.2s' }}>🎰</span>
                        {/* Slot machine sparkle effect */}
                        <div className="absolute -top-1 -left-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping opacity-75" style={{ animationDelay: '0.3s' }}></div>
                      </div>
                    </div>
                    
                    {/* Title Underline Effect */}
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent rounded-full animate-pulse"></div>
                  </DialogTitle>
                  
                  {/* Enhanced Casino Description */}
                  <DialogDescription className="relative text-yellow-200 text-base sm:text-lg md:text-xl lg:text-2xl font-bold space-y-4">
                    
                    {/* Main Description with Casino Flair */}
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-yellow-500/20 to-red-500/20 rounded-xl blur-lg animate-pulse"></div>
                      <div className="relative bg-gradient-to-r from-red-900/40 via-yellow-900/40 to-red-900/40 backdrop-blur-sm rounded-xl p-3 sm:p-4 border-2 border-yellow-400/30">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
                          <span className="text-2xl sm:text-3xl animate-pulse">🎲</span>
                          <span className="animate-pulse font-black text-yellow-300">Choose Your Lucky Numbers</span>
                          <span className="text-2xl sm:text-3xl animate-pulse" style={{ animationDelay: '0.3s' }}>🔥</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Casino Betting Options */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
                      
                      {/* SMALL Option - Enhanced Casino Style */}
                      <div className="relative group">
                        {/* Glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full blur-lg opacity-40 group-hover:opacity-60 transition-opacity duration-300 animate-pulse"></div>
                        
                        <div className="relative bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 px-4 sm:px-6 md:px-8 py-2 sm:py-3 rounded-full border-3 border-green-400/70 shadow-2xl group-hover:shadow-green-400/50 transition-all duration-300 transform group-hover:scale-105">
                          {/* Casino chip pattern */}
                          <div className="absolute inset-2 rounded-full border-2 border-green-300/50"></div>
                          <div className="absolute inset-4 rounded-full border border-green-200/30"></div>
                          
                          <span className="relative text-green-100 font-black text-sm sm:text-base md:text-lg lg:text-xl tracking-wider animate-pulse">
                            <span className="text-2xl sm:text-3xl mr-2">🟢</span>
                            SMALL (1-5)
                            <span className="text-2xl sm:text-3xl ml-2">🎲</span>
                          </span>
                          
                          {/* Hover sparkles */}
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-300 rounded-full opacity-0 group-hover:opacity-100 animate-ping transition-opacity duration-300"></div>
                          <div className="absolute -bottom-1 -left-1 w-1 h-1 bg-white rounded-full opacity-0 group-hover:opacity-100 animate-ping transition-opacity duration-300" style={{ animationDelay: '0.3s' }}></div>
                        </div>
                      </div>
                      
                      {/* VS Separator - Casino Style */}
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full blur-lg opacity-30 animate-pulse"></div>
                        <div className="relative bg-gradient-to-r from-yellow-500 to-orange-600 px-3 sm:px-4 py-1 sm:py-2 rounded-full border-2 border-yellow-300/70 shadow-xl">
                          <span className="text-white font-black text-lg sm:text-xl md:text-2xl lg:text-3xl animate-bounce">
                            <span className="text-2xl sm:text-3xl">⚡</span>
                            VS
                            <span className="text-2xl sm:text-3xl">⚡</span>
                          </span>
                        </div>
                      </div>
                      
                      {/* BIG Option - Enhanced Casino Style */}
                      <div className="relative group">
                        {/* Glow effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-600 rounded-full blur-lg opacity-40 group-hover:opacity-60 transition-opacity duration-300 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                        
                        <div className="relative bg-gradient-to-br from-red-600 via-red-700 to-red-800 px-4 sm:px-6 md:px-8 py-2 sm:py-3 rounded-full border-3 border-red-400/70 shadow-2xl group-hover:shadow-red-400/50 transition-all duration-300 transform group-hover:scale-105">
                          {/* Casino chip pattern */}
                          <div className="absolute inset-2 rounded-full border-2 border-red-300/50"></div>
                          <div className="absolute inset-4 rounded-full border border-red-200/30"></div>
                          
                          <span className="relative text-red-100 font-black text-sm sm:text-base md:text-lg lg:text-xl tracking-wider animate-pulse" style={{ animationDelay: '0.3s' }}>
                            <span className="text-2xl sm:text-3xl mr-2">🔴</span>
                            BIG (6-9)
                            <span className="text-2xl sm:text-3xl ml-2">🎲</span>
                          </span>
                          
                          {/* Hover sparkles */}
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-300 rounded-full opacity-0 group-hover:opacity-100 animate-ping transition-opacity duration-300"></div>
                          <div className="absolute -bottom-1 -left-1 w-1 h-1 bg-white rounded-full opacity-0 group-hover:opacity-100 animate-ping transition-opacity duration-300" style={{ animationDelay: '0.3s' }}></div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Casino Luck Indicator */}
                    <div className="relative mt-4 sm:mt-6">
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 rounded-xl blur-lg animate-pulse"></div>
                      <div className="relative bg-gradient-to-r from-purple-900/40 via-pink-900/40 to-purple-900/40 backdrop-blur-sm rounded-xl p-2 sm:p-3 border-2 border-purple-400/30">
                        <div className="flex items-center justify-center gap-2 sm:gap-3">
                          <span className="text-2xl sm:text-3xl animate-spin" style={{ animationDuration: '3s' }}>🎲</span>
                          <span className="text-purple-200 font-bold text-sm sm:text-base md:text-lg">Fortune Awaits Your Choice!</span>
                          <span className="text-2xl sm:text-3xl animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }}>🍀</span>
                        </div>
                      </div>
                    </div>
                  </DialogDescription>
                </div>
              </DialogHeader>
            </div>
          </div>

          <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 md:space-y-8">
            {/* Premium Gaming Table Style Number Selection */}
            <div className="relative bg-gradient-to-br from-green-800 to-green-900 p-3 sm:p-4 md:p-6 lg:p-8 rounded-2xl sm:rounded-3xl border-4 border-yellow-500/40 shadow-2xl overflow-hidden">
              {/* Casino Table Ambiance */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-900/60 to-emerald-900/60 animate-pulse"></div>
              <div className="absolute top-4 right-8 w-12 h-12 bg-yellow-400/10 rounded-full animate-ping"></div>
              <div className="absolute bottom-4 left-8 w-8 h-8 bg-red-400/10 rounded-full animate-ping" style={{ animationDelay: '0.7s' }}></div>
              
              {/* Premium Table Header */}
              <div className="text-center mb-6 sm:mb-8 md:mb-10 relative z-10">
                <div className="relative inline-block">
                  {/* Enhanced Casino Glow Effects */}
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 rounded-full blur-3xl opacity-70 animate-pulse"></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-400 via-yellow-500 to-orange-400 rounded-full blur-2xl opacity-50 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300 rounded-full blur-xl opacity-30 animate-pulse" style={{ animationDelay: '0.6s' }}></div>

                  {/* Main Header Container - Real Casino Game Button */}
                  <div className="relative bg-gradient-to-br from-yellow-500 via-yellow-600 to-orange-600 text-black px-8 sm:px-10 md:px-12 lg:px-16 py-4 sm:py-5 md:py-6 lg:py-8 rounded-2xl font-black text-lg sm:text-xl md:text-2xl lg:text-3xl shadow-2xl border-4 border-gradient-to-r from-yellow-300 via-orange-300 to-yellow-300 transform hover:scale-105 hover:shadow-yellow-500/50 transition-all duration-300 overflow-hidden cursor-pointer">
                    {/* Animated Background Pattern */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 via-transparent to-orange-400/20 animate-pulse" style={{ animationDelay: '0.3s' }}></div>

                    {/* Casino Chip Decorative Elements */}
                    <div className="absolute top-2 left-4 w-4 h-4 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-bounce opacity-90 shadow-lg" style={{ animationDelay: '0s', animationDuration: '2s' }}></div>
                    <div className="absolute top-3 right-6 w-3 h-3 bg-gradient-to-br from-orange-400 to-red-500 rounded-full animate-bounce opacity-90 shadow-lg" style={{ animationDelay: '0.5s', animationDuration: '2.5s' }}></div>
                    <div className="absolute bottom-2 left-6 w-3 h-3 bg-gradient-to-br from-red-400 to-pink-500 rounded-full animate-bounce opacity-90 shadow-lg" style={{ animationDelay: '1s', animationDuration: '2.2s' }}></div>
                    <div className="absolute bottom-3 right-4 w-4 h-4 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full animate-bounce opacity-90 shadow-lg" style={{ animationDelay: '1.5s', animationDuration: '2.8s' }}></div>
                    <div className="absolute top-1/2 left-2 w-2 h-2 bg-gradient-to-br from-white to-yellow-200 rounded-full animate-ping opacity-70" style={{ animationDelay: '0.8s' }}></div>
                    <div className="absolute top-1/2 right-2 w-2 h-2 bg-gradient-to-br from-white to-orange-200 rounded-full animate-ping opacity-70" style={{ animationDelay: '1.2s' }}></div>

                    {/* Enhanced Casino Shimmer Effect */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent transform -skew-x-12 animate-pulse" style={{ animationDuration: '2.5s' }}></div>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-200/20 to-transparent transform skew-x-12 animate-pulse" style={{ animationDuration: '3.5s', animationDelay: '1s' }}></div>
                      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-orange-200/15 to-transparent animate-pulse" style={{ animationDuration: '4s', animationDelay: '0.5s' }}></div>
                    </div>

                    {/* Main Content */}
                    <div className="relative flex items-center justify-center gap-2 sm:gap-3 md:gap-4">
                      {/* Left Icon with Enhanced Casino Effects */}
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full blur-xl opacity-60 animate-pulse"></div>
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-red-500 rounded-full blur-lg opacity-40 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <span className="relative animate-bounce inline-block text-3xl sm:text-4xl md:text-5xl lg:text-6xl drop-shadow-2xl filter brightness-110">🎱</span>
                        {/* Enhanced Icon Sparkles */}
                        <div className="absolute -top-2 -right-2 w-3 h-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-ping opacity-80 shadow-lg"></div>
                        <div className="absolute -bottom-2 -left-2 w-2 h-2 bg-gradient-to-br from-white to-yellow-200 rounded-full animate-ping opacity-70 shadow-lg" style={{ animationDelay: '0.3s' }}></div>
                        <div className="absolute top-0 right-0 w-1 h-1 bg-orange-400 rounded-full animate-ping opacity-60" style={{ animationDelay: '0.6s' }}></div>
                        <div className="absolute bottom-0 left-0 w-1 h-1 bg-yellow-300 rounded-full animate-ping opacity-60" style={{ animationDelay: '0.9s' }}></div>
                      </div>

                      {/* Main Text with Enhanced Typography */}
                      <span className="mx-2 sm:mx-3 md:mx-4 font-black tracking-wider drop-shadow-lg bg-gradient-to-r from-white via-yellow-100 to-white bg-clip-text text-transparent animate-pulse">
                        SELECT YOUR NUMBER
                      </span>

                      {/* Right Icon with Enhanced Casino Effects */}
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full blur-xl opacity-60 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-red-500 rounded-full blur-lg opacity-40 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        <span className="relative animate-bounce inline-block text-3xl sm:text-4xl md:text-5xl lg:text-6xl drop-shadow-2xl filter brightness-110" style={{ animationDelay: '0.2s' }}>🎱</span>
                        {/* Enhanced Icon Sparkles */}
                        <div className="absolute -top-2 -left-2 w-3 h-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-ping opacity-80 shadow-lg" style={{ animationDelay: '0.2s' }}></div>
                        <div className="absolute -bottom-2 -right-2 w-2 h-2 bg-gradient-to-br from-white to-yellow-200 rounded-full animate-ping opacity-70 shadow-lg" style={{ animationDelay: '0.5s' }}></div>
                        <div className="absolute top-0 left-0 w-1 h-1 bg-orange-400 rounded-full animate-ping opacity-60" style={{ animationDelay: '0.8s' }}></div>
                        <div className="absolute bottom-0 right-0 w-1 h-1 bg-yellow-300 rounded-full animate-ping opacity-60" style={{ animationDelay: '1.1s' }}></div>
                      </div>
                    </div>

                    {/* Enhanced Bottom Border Glow */}
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-4/5 h-2 bg-gradient-to-r from-transparent via-yellow-400 to-transparent rounded-full animate-pulse shadow-lg"></div>
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                  </div>

                  {/* Floating Casino Elements Around Header */}
                  <div className="absolute -top-4 -left-4 text-yellow-400 opacity-30 animate-spin" style={{ animationDuration: '8s' }}>
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  </div>
                  <div className="absolute -top-2 -right-4 text-red-400 opacity-30 animate-spin" style={{ animationDuration: '12s' }}>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div className="absolute -bottom-4 -left-2 text-green-400 opacity-30 animate-spin" style={{ animationDuration: '10s' }}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                  </div>
                  <div className="absolute -bottom-2 -right-2 text-blue-400 opacity-30 animate-spin" style={{ animationDuration: '15s' }}>
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Enhanced Small Numbers Section */}
              <div className="relative bg-green-700/60 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 mb-6 sm:mb-8 border-4 border-green-400/40 backdrop-blur-sm overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-600/20 to-emerald-600/20 animate-pulse"></div>
                <div className="text-center mb-4 sm:mb-6 relative z-10">
                  <div className="relative inline-block">
                    <div className="absolute inset-0 bg-green-500 rounded-full blur-lg opacity-30 animate-pulse"></div>
                    <span className="relative bg-green-500 text-white px-3 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-3 rounded-full font-black text-sm sm:text-base md:text-lg lg:text-xl shadow-xl border-2 border-green-300">
                      <span className="animate-pulse">🟢</span>
                      <span className="mx-2">SMALL AND BIG (1-9)</span>
                      <span className="animate-pulse" style={{ animationDelay: '0.3s' }}>🟢</span>
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 sm:gap-4 md:gap-5 lg:gap-6 max-w-xl sm:max-w-2xl mx-auto">
                  {[1, 2, 3, 4, 5 , 6,7, 8,9].map((number, index) => {
                    const chipColors = {
                      1: 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600',
                      2: 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600', 
                      3: 'bg-gradient-to-br from-red-400 via-red-500 to-red-600',
                      4: 'bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600',
                      5: 'bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600',
                      6: 'bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600',
                      7: 'bg-gradient-to-br from-red-400 via-red-500 to-red-600',
                      8: 'bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600', 
                      9: 'bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600'
                    };
                    
                    const chipBorders = {
                      1: 'border-yellow-300',
                      2: 'border-blue-300',
                      3: 'border-red-300',
                      4: 'border-purple-300',
                      5: 'border-orange-300',
                      6: 'border-yellow-300',
                      7: 'border-blue-300',
                      8: 'border-red-300',
                      9: 'border-purple-300'
                    };
                    
                    return (
                      <div key={number} className="relative group">
                        <button
                          onClick={() => handleNumberSelect(number)}
                          className={`relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 transition-all duration-500 transform hover:scale-110 hover:rotate-12 shadow-2xl group-hover:shadow-3xl animate-bounce ${
                            selectedNumber === number
                              ? 'ring-4 ring-yellow-400 scale-125 shadow-yellow-400/60 animate-bounce'
                              : 'hover:shadow-xl'
                          }`}
                          style={{ 
                            animation: selectedNumber === number 
                              ? 'bounce 0.6s infinite' 
                              : `bounce 2s ease-in-out ${index * 0.2}s infinite, fadeInScale 0.4s ease-out ${index * 0.1}s both`
                          }}
                        >
                          {/* Authentic Casino Chip Design */}
                          <div className={`absolute inset-0 rounded-full ${chipColors[number as keyof typeof chipColors]} border-4 ${chipBorders[number as keyof typeof chipBorders]} shadow-2xl`}>
                            {/* Chip rim/edge effect */}
                            <div className="absolute inset-1 rounded-full border-2 border-white/40"></div>
                            <div className="absolute inset-2 rounded-full border border-white/30"></div>
                            <div className="absolute inset-3 rounded-full border border-white/20"></div>
                            
                            {/* Chip center pattern */}
                            <div className="absolute inset-4 rounded-full border-2 border-white/50"></div>
                            <div className="absolute inset-6 rounded-full border border-white/30"></div>
                            <div className="absolute inset-8 rounded-full border border-white/20"></div>
                          </div>
                          
                          {/* Chip shine effects */}
                          <div className="absolute top-1 left-2 w-3 h-3 sm:w-4 sm:h-4 bg-white/90 rounded-full blur-sm"></div>
                          {/* Ball number with 3D effect */}
                          <div className="relative w-full h-full flex items-center justify-center">
                            <div className="absolute inset-0 bg-white/20 rounded-full blur-sm"></div>
                            <span className="text-white text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-black z-10 relative drop-shadow-lg">
                              {number}
                            </span>
                            {/* Number shadow for 3D effect */}
                            <span className="absolute text-black/30 text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-black -bottom-0.5 -right-0.5">
                              {number}
                            </span>
              </div>

                          {/* Ball rim/edge effect */}
                          <div className="absolute inset-0 rounded-full border-2 border-white/30"></div>
                          <div className="absolute inset-1 rounded-full border border-white/20"></div>
                          
                          {/* Selection Effects */}
                          {selectedNumber === number && (
                            <>
                              <div className="absolute -inset-3 rounded-full border-4 border-yellow-400 animate-ping"></div>
                              <div className="absolute -inset-6 rounded-full border-2 border-yellow-300 animate-ping opacity-50" style={{ animationDelay: '0.2s' }}></div>
                              <div className="absolute inset-0 rounded-full bg-yellow-400/20 animate-pulse"></div>
                              {/* Selection glow */}
                              <div className="absolute -inset-2 rounded-full bg-yellow-400/30 blur-sm animate-pulse"></div>
                            </>
                          )}
                          
                          {/* Hover sparkles */}
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full opacity-0 group-hover:opacity-100 animate-ping transition-opacity duration-300"></div>
                          <div className="absolute -bottom-1 -left-1 w-1 h-1 bg-white rounded-full opacity-0 group-hover:opacity-100 animate-ping transition-opacity duration-300" style={{ animationDelay: '0.3s' }}></div>
                          
                          {/* Ball reflection */}
                          <div className="absolute top-1 right-1 w-1 h-1 bg-white/40 rounded-full blur-sm"></div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Enhanced Prediction Display */}
              {selectedNumber !== null && (
                <div className="text-center mt-6 sm:mt-8 md:mt-10 relative z-10">
                  <div className="relative inline-block">
                    {/* Glow effect behind prediction */}
                    <div className={`absolute inset-0 blur-xl opacity-40 animate-pulse ${
                      predictionType === 'small' 
                        ? 'bg-gradient-to-r from-green-400 to-green-600' 
                        : 'bg-gradient-to-r from-red-400 to-red-600'
                    } rounded-full`}></div>
                    
                    <div className={`relative inline-flex items-center px-6 sm:px-8 md:px-12 lg:px-16 py-3 sm:py-4 md:py-5 lg:py-6 rounded-full shadow-2xl border-4 animate-bounce ${
                      predictionType === 'small' 
                        ? 'bg-gradient-to-r from-green-500 to-green-600 border-green-300' 
                        : 'bg-gradient-to-r from-red-500 to-red-600 border-red-300'
                    }`}>
                      <span className="text-white font-black text-xl sm:text-2xl md:text-3xl lg:text-4xl mr-3 sm:mr-4 md:mr-6 animate-bounce">🎯</span>
                      <span className="text-white font-black text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl tracking-widest">
                      {predictionType?.toUpperCase()}
                    </span>
                      <span className="text-white font-black text-xl sm:text-2xl md:text-3xl lg:text-4xl ml-3 sm:ml-4 md:ml-6 animate-bounce" style={{ animationDelay: '0.2s' }}>🎯</span>
                      
                      {/* Sparkles around prediction */}
                      <div className="absolute -top-2 -left-2 w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
                      <div className="absolute -top-2 -right-2 w-3 h-3 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '0.3s' }}></div>
                      <div className="absolute -bottom-2 -left-2 w-2 h-2 bg-white rounded-full animate-ping" style={{ animationDelay: '0.6s' }}></div>
                      <div className="absolute -bottom-2 -right-2 w-2 h-2 bg-white rounded-full animate-ping" style={{ animationDelay: '0.9s' }}></div>
                    </div>
                          </div>
                          
                  {/* Selected number display */}
                  <div className="mt-4 sm:mt-6">
                    <div className="inline-block bg-black/70 backdrop-blur-sm px-4 sm:px-6 md:px-8 py-2 sm:py-3 rounded-full border-2 border-yellow-400/50 animate-pulse">
                      <span className="text-yellow-400 font-bold text-sm sm:text-base md:text-lg">SELECTED NUMBER:</span>
                      <span className="text-white font-black text-lg sm:text-xl md:text-2xl ml-2">{selectedNumber}</span>
                    </div>
                  </div>
                </div>
              )}
                          </div>
                          
                        {/* Premium Casino Betting Section */}
            <div className="relative bg-gradient-to-br from-purple-900 to-indigo-900 p-4 sm:p-6 md:p-8 lg:p-10 rounded-2xl sm:rounded-3xl border-4 border-yellow-500/40 shadow-2xl overflow-hidden">
              {/* Betting section ambiance */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-800/30 to-indigo-800/30 animate-pulse"></div>
              <div className="absolute top-6 left-8 w-10 h-10 bg-yellow-400/10 rounded-full animate-ping"></div>
              <div className="absolute bottom-6 right-8 w-8 h-8 bg-green-400/10 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
              
              <div className="text-center mb-6 sm:mb-8 relative z-10">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full blur-lg opacity-40 animate-pulse"></div>
                  <div className="relative bg-yellow-500 text-black px-4 sm:px-6 md:px-8 lg:px-12 py-2 sm:py-3 md:py-4 rounded-full font-black text-base sm:text-lg md:text-xl lg:text-2xl shadow-2xl border-4 border-yellow-300 transform hover:scale-105 transition-all duration-300">
                    <span className="animate-bounce inline-block">💰</span>
                    <span className="mx-2 sm:mx-4">PLACE YOUR BET</span>
                    <span className="animate-bounce inline-block" style={{ animationDelay: '0.2s' }}>💰</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6 sm:space-y-8 relative z-10">
                {/* Enhanced Bet Input */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-gray-900/60 rounded-2xl blur-sm"></div>
                  <div className="relative bg-black/80 rounded-2xl p-4 sm:p-6 border-4 border-yellow-500/50 backdrop-blur-sm">
                    <div className="relative">
                      <div className="absolute left-4 sm:left-6 top-1/2 transform -translate-y-1/2 text-yellow-400 font-black text-2xl sm:text-3xl md:text-4xl animate-pulse">₹</div>
                <Input
                  type="number"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder="Enter bet amount"
                        className="bg-transparent border-2 border-yellow-500/30 text-white text-center text-lg sm:text-xl md:text-2xl lg:text-3xl font-black py-3 sm:py-4 md:py-5 pl-8 sm:pl-12 md:pl-16 pr-4 rounded-xl focus:ring-4 focus:ring-yellow-400/30 placeholder:text-gray-400 min-h-[50px] sm:min-h-[60px] md:min-h-[70px] w-full"
                  min="1"
                />
                      {/* Input sparkles */}
                      <div className="absolute top-2 right-4 w-2 h-2 bg-yellow-400 rounded-full animate-ping opacity-60"></div>
                      <div className="absolute bottom-2 right-6 w-1 h-1 bg-white rounded-full animate-ping opacity-60" style={{ animationDelay: '0.5s' }}></div>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced Wallet Balance */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-800/40 to-emerald-800/40 rounded-2xl blur-sm animate-pulse"></div>
                  <div className="relative bg-black/70 rounded-2xl p-4 sm:p-6 md:p-8 border-4 border-green-500/40 backdrop-blur-sm">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center animate-pulse">
                          <span className="text-lg sm:text-xl md:text-2xl">💎</span>
                        </div>
                        <span className="text-yellow-300 font-bold text-base sm:text-lg md:text-xl lg:text-2xl">
                          WALLET BALANCE
                        </span>
                      </div>
                      <div className="relative">
                        <span className="text-green-400 font-black text-2xl sm:text-3xl md:text-4xl lg:text-5xl">
                          ₹{walletData.game.toFixed(2)}
                        </span>
                        {/* Balance highlight effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/20 to-transparent animate-pulse"></div>
                      </div>
                    </div>
                    {/* Balance sparkles */}
                    <div className="absolute top-2 left-4 w-2 h-2 bg-green-400 rounded-full animate-ping opacity-40"></div>
                    <div className="absolute bottom-2 right-4 w-1 h-1 bg-yellow-400 rounded-full animate-ping opacity-40" style={{ animationDelay: '0.7s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Premium Casino Action Buttons */}
          <DialogFooter className="p-4 sm:p-6 md:p-8 bg-gradient-to-t from-black/60 to-transparent backdrop-blur-sm border-t-4 border-yellow-500/40">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6 w-full">
              {/* Cancel Button - Real Casino Style */}
              <div className="relative w-full">
                {/* Authentic Casino Button Glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-red-700 to-red-800 rounded-3xl blur-2xl opacity-60 animate-pulse"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-red-600 rounded-3xl blur-lg opacity-40 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                
                <Button 
                  variant="outline" 
                  onClick={() => setIsPredicting(false)} 
                  className="relative w-full bg-gradient-to-b from-red-700 via-red-600 to-red-800 border-6 border-red-400/80 text-white hover:from-red-800 hover:via-red-700 hover:to-red-900 hover:border-red-300 hover:scale-105 hover:-translate-y-2 font-black text-base sm:text-lg md:text-xl lg:text-2xl py-6 sm:py-8 md:py-10 lg:py-12 rounded-3xl shadow-2xl hover:shadow-red-500/40 transition-all duration-500 transform min-h-[70px] sm:min-h-[80px] md:min-h-[90px] overflow-hidden group"
                >
                  {/* Authentic Casino Button Interior */}
                  <div className="absolute inset-2 bg-gradient-to-b from-red-500 via-red-600 to-red-700 rounded-2xl border-2 border-red-300/50"></div>
                  <div className="absolute inset-4 bg-gradient-to-b from-red-400 via-red-500 to-red-600 rounded-xl border border-red-200/30"></div>
                  
                  {/* Button Press Effect */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent rounded-3xl group-hover:from-transparent group-hover:via-white/20 group-hover:to-transparent transition-all duration-300"></div>
                  
                  {/* Authentic Casino Button Text */}
                  <span className="relative z-10 flex items-center justify-center gap-3 sm:gap-4">
                    <div className="relative">
                      <span className="animate-pulse text-2xl sm:text-3xl md:text-4xl drop-shadow-lg">❌</span>
                      {/* Icon glow effect */}
                      <div className="absolute inset-0 bg-red-400 rounded-full blur-lg opacity-40 animate-pulse"></div>
                    </div>
                    <span className="drop-shadow-lg tracking-wider text-black">CANCEL</span>
                  </span>
                  
                  {/* Authentic Casino Button Effects */}
                  <div className="absolute top-3 left-6 w-2 h-2 bg-white/80 rounded-full animate-ping opacity-60 shadow-lg"></div>
                  <div className="absolute bottom-3 right-6 w-1.5 h-1.5 bg-red-200 rounded-full animate-ping opacity-70 shadow-lg" style={{ animationDelay: '0.5s' }}></div>
                  <div className="absolute top-1/2 left-4 w-1 h-1 bg-yellow-300 rounded-full animate-ping opacity-50" style={{ animationDelay: '0.8s' }}></div>
                  <div className="absolute top-1/2 right-4 w-1 h-1 bg-white rounded-full animate-ping opacity-40" style={{ animationDelay: '1.1s' }}></div>
                  
                  {/* Button Rim Effect */}
                  <div className="absolute inset-0 rounded-3xl border-2 border-red-300/30 group-hover:border-red-200/50 transition-all duration-300"></div>
                  <div className="absolute inset-1 rounded-3xl border border-red-200/20 group-hover:border-red-100/40 transition-all duration-300"></div>
                </Button>
              </div>

              {/* Confirm Button - Real Casino Style */}
              <div className="relative sm:flex-1">
                {/* Authentic Casino Button Glow for Enabled State */}
                {!(!selectedNumber || !predictionType || !betAmount || parseFloat(betAmount || '0') <= 0 || parseFloat(betAmount || '0') > walletData.game) && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 rounded-3xl blur-3xl opacity-70 animate-pulse"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-green-500 rounded-3xl blur-2xl opacity-50 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-green-300 to-emerald-400 rounded-3xl blur-xl opacity-30 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </>
                )}
                
                <Button 
                  onClick={handleJoinRoom} 
                  disabled={!selectedNumber || !predictionType || !betAmount || parseFloat(betAmount || '0') <= 0 || parseFloat(betAmount || '0') > walletData.game}
                  className={`relative w-full border-6 font-black text-base sm:text-lg md:text-xl lg:text-2xl py-6 sm:py-8 md:py-10 lg:py-12 rounded-3xl shadow-2xl transition-all duration-500 transform min-h-[70px] sm:min-h-[80px] md:min-h-[90px] overflow-hidden group ${
                    !selectedNumber || !predictionType || !betAmount || parseFloat(betAmount || '0') <= 0 || parseFloat(betAmount || '0') > walletData.game
                      ? 'bg-gradient-to-b from-gray-700 via-gray-600 to-gray-800 border-gray-500/80 text-gray-400 cursor-not-allowed opacity-60'
                      : 'bg-gradient-to-b from-green-600 via-green-500 to-green-700 hover:from-green-700 hover:via-green-600 hover:to-green-800 border-green-400/80 text-white hover:scale-105 hover:-translate-y-2 hover:shadow-green-500/50 animate-pulse'
                  }`}
                >
                  {/* Authentic Casino Button Interior */}
                  <div className={`absolute inset-2 rounded-2xl border-2 transition-all duration-300 ${
                    !selectedNumber || !predictionType || !betAmount || parseFloat(betAmount || '0') <= 0 || parseFloat(betAmount || '0') > walletData.game
                      ? 'bg-gradient-to-b from-gray-600 via-gray-500 to-gray-700 border-gray-400/50'
                      : 'bg-gradient-to-b from-green-500 via-green-400 to-green-600 border-green-300/50 group-hover:border-green-200/70'
                  }`}></div>
                  <div className={`absolute inset-4 rounded-xl border transition-all duration-300 ${
                    !selectedNumber || !predictionType || !betAmount || parseFloat(betAmount || '0') <= 0 || parseFloat(betAmount || '0') > walletData.game
                      ? 'bg-gradient-to-b from-gray-500 via-gray-400 to-gray-600 border-gray-300/30'
                      : 'bg-gradient-to-b from-green-400 via-green-300 to-green-500 border-green-200/30 group-hover:border-green-100/50'
                  }`}></div>
                  
                  {/* Button Press Effect */}
                  <div className={`absolute inset-0 rounded-3xl transition-all duration-300 ${
                    !selectedNumber || !predictionType || !betAmount || parseFloat(betAmount || '0') <= 0 || parseFloat(betAmount || '0') > walletData.game
                      ? 'bg-gradient-to-b from-transparent via-gray-400/10 to-transparent'
                      : 'bg-gradient-to-b from-transparent via-white/10 to-transparent group-hover:from-transparent group-hover:via-white/20 group-hover:to-transparent'
                  }`}></div>
                  
                  {/* Authentic Casino Button Text */}
                  <span className="relative z-10 flex items-center justify-center gap-3 sm:gap-4">
                    {!selectedNumber || !predictionType || !betAmount || parseFloat(betAmount || '0') <= 0 || parseFloat(betAmount || '0') > walletData.game ? (
                      <>
                        <div className="relative">
                          <span className="animate-pulse text-2xl sm:text-3xl md:text-4xl drop-shadow-lg">⚠️</span>
                          <div className="absolute inset-0 bg-yellow-400 rounded-full blur-lg opacity-40 animate-pulse"></div>
                        </div>
                        <span className="drop-shadow-lg tracking-wider">COMPLETE SELECTION</span>
                      </>
                    ) : (
                      <>
                        <div className="relative">
                          <span className="animate-bounce text-2xl sm:text-3xl md:text-4xl drop-shadow-lg">🚀</span>
                          <div className="absolute inset-0 bg-yellow-400 rounded-full blur-lg opacity-60 animate-pulse"></div>
                        </div>
                        <span className="drop-shadow-lg tracking-wider text-black">CONFIRM BET</span>
                        <div className="relative">
                          <span className="animate-bounce text-2xl sm:text-3xl md:text-4xl drop-shadow-lg" style={{ animationDelay: '0.2s' }}>💎</span>
                          <div className="absolute inset-0 bg-blue-400 rounded-full blur-lg opacity-60 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </>
                    )}
                  </span>
                  
                  {/* Authentic Casino Button Effects for Enabled State */}
                  {!(!selectedNumber || !predictionType || !betAmount || parseFloat(betAmount || '0') <= 0 || parseFloat(betAmount || '0') > walletData.game) && (
                    <>
                      <div className="absolute top-3 left-6 w-2.5 h-2.5 bg-yellow-400 rounded-full animate-ping opacity-80 shadow-lg"></div>
                      <div className="absolute top-3 right-6 w-2.5 h-2.5 bg-yellow-400 rounded-full animate-ping opacity-80 shadow-lg" style={{ animationDelay: '0.3s' }}></div>
                      <div className="absolute bottom-3 left-6 w-2 h-2 bg-white rounded-full animate-ping opacity-70 shadow-lg" style={{ animationDelay: '0.6s' }}></div>
                      <div className="absolute bottom-3 right-6 w-2 h-2 bg-white rounded-full animate-ping opacity-70 shadow-lg" style={{ animationDelay: '0.9s' }}></div>
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-green-300 rounded-full animate-ping opacity-60" style={{ animationDelay: '1.2s' }}></div>
                      <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-blue-300 rounded-full animate-ping opacity-50" style={{ animationDelay: '1.5s' }}></div>
                      <div className="absolute bottom-1/4 right-1/4 w-1 h-1 bg-purple-300 rounded-full animate-ping opacity-50" style={{ animationDelay: '1.8s' }}></div>
                    </>
                  )}
                  
                  {/* Button Rim Effect */}
                  <div className={`absolute inset-0 rounded-3xl border-2 transition-all duration-300 ${
                    !selectedNumber || !predictionType || !betAmount || parseFloat(betAmount || '0') <= 0 || parseFloat(betAmount || '0') > walletData.game
                      ? 'border-gray-400/30'
                      : 'border-green-300/30 group-hover:border-green-200/50'
                  }`}></div>
                  <div className={`absolute inset-1 rounded-3xl border transition-all duration-300 ${
                    !selectedNumber || !predictionType || !betAmount || parseFloat(betAmount || '0') <= 0 || parseFloat(betAmount || '0') > walletData.game
                      ? 'border-gray-300/20'
                      : 'border-green-200/20 group-hover:border-green-100/40'
                  }`}></div>
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default BigSmallGame;

// Enhanced CSS animations for premium casino experience
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInUp {
    0% {
      opacity: 0;
      transform: translateY(20px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes fadeInScale {
    0% {
      opacity: 0;
      transform: scale(0.8) translateY(10px);
    }
    100% {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
  
  @keyframes glow {
    0%, 100% {
      box-shadow: 0 0 5px rgba(255, 215, 0, 0.3);
    }
    50% {
      box-shadow: 0 0 20px rgba(255, 215, 0, 0.6);
    }
  }
  
  .animate-shimmer {
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.1),
      transparent
    );
    background-size: 200% 100%;
    animation: shimmer 2s infinite;
  }
  
  .animate-glow {
    animation: glow 2s ease-in-out infinite;
  }
`;
document.head.appendChild(style);
