import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

// Interface for game room data
interface GameRoom {
  id: string;
  roomId: string;
  entryFee: number;
  benefitFeeMultiplier: number;
  winningAmount: number;
  maxPlayers: number;
  currentPlayers: number;
  availableColors: string[];
  status: string;
  createdAt: string;
}

interface WalletData {
  normal: number;
  benefit: number;
  game: number;
}

const ColorPredictionGame = () => {
  const [gameRooms, setGameRooms] = useState<GameRoom[]>([]);
  const [walletData, setWalletData] = useState<WalletData>({ normal: 0, benefit: 0, game: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch wallet data (only called once on mount)
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

  // Fetch game rooms (called by the polling mechanism)
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

      const response = await axios.get('https://api.utpfund.live/api/game/rooms', {
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
              (newRoom: GameRoom) => newRoom.roomId === existingRoom.roomId
            );
            // Return updated room if found, otherwise keep existing
            return updatedRoom || existingRoom;
          });
          
          // Add any new rooms that weren't in our existing list
          const existingRoomIds = updatedRooms.map(room => room.roomId);
          const newRooms = response.data.gameRooms.filter(
            (room: GameRoom) => !existingRoomIds.includes(room.roomId)
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
      setInitialLoad(false);
    }
  }, [gameRooms, setIsLoading, setIsPolling, setInitialLoad, setGameRooms, toast, navigate]);
  
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
      console.log('Fetching wallet and game room data...');
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
      console.log('Clearing game polling interval');
      clearInterval(pollingInterval);
    };
  }, [fetchAllData]);

  // Join a game room
  const handleJoinRoom = async (roomId: string) => {
    try {
      setIsLoading(true);
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        toast({
          variant: 'destructive',
          title: 'Authentication error',
          description: 'You are not logged in. Please log in to join a game.'
        });
        navigate('/login');
        return;
      }

      // Here you would typically call an API endpoint to join the room
      // For now, we'll just navigate to a game session page
      navigate(`/games/color-prediction/${roomId}`);
      
    } catch (error) {
      const errorResponse = error as { response?: { data?: { message?: string } } };
      toast({
        variant: 'destructive',
        title: 'Error joining game room',
        description: errorResponse.response?.data?.message || 'Could not join the game room. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Format date to a readable format
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-slate-800 relative overflow-hidden">
      {/* Premium Casino Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-blue-900/10 to-red-900/10 animate-pulse"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-red-500/5 to-transparent rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-tl from-blue-500/5 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-green-500/5 to-transparent rounded-full blur-3xl animate-pulse delay-500"></div>
      
      <div className="container mx-auto py-8 px-4 relative z-10">
        {/* Premium Casino Header */}
        <div className="relative mb-12">
          {/* Neon Header Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 via-yellow-500/20 via-green-500/20 to-blue-600/20 rounded-3xl blur-xl animate-pulse"></div>
          
          <div className="relative bg-black/70 backdrop-blur-xl rounded-3xl p-8 border-2 border-gradient-to-r from-red-500/50 via-yellow-500/50 via-green-500/50 to-blue-500/50">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="text-center lg:text-left">
                <h1 className="text-5xl lg:text-6xl font-black mb-4 tracking-wider">
                  <span className="bg-gradient-to-r from-red-400 via-yellow-400 via-green-400 to-blue-400 bg-clip-text text-transparent animate-pulse">
                    🎯 COLOR PREDICTION 🎯
                  </span>
                </h1>
                <p className="text-xl text-slate-300 font-semibold">
                  🔥 Choose Your Colors, Win Big Prizes! 🔥
                </p>
                <div className="flex justify-center lg:justify-start gap-3 mt-4">
                  {['red', 'yellow', 'green', 'blue'].map((color, index) => (
                    <div
                      key={color}
                      className={`w-8 h-8 rounded-full animate-bounce shadow-lg ${
                        color === 'red' ? 'bg-red-500 shadow-red-500/50' :
                        color === 'yellow' ? 'bg-yellow-500 shadow-yellow-500/50' :
                        color === 'green' ? 'bg-green-500 shadow-green-500/50' :
                        'bg-blue-500 shadow-blue-500/50'
                      }`}
                      style={{ animationDelay: `${index * 0.2}s` }}
                    ></div>
                  ))}
                </div>
              </div>
              
              <div className="flex flex-col items-center gap-4">
                <Button 
                  onClick={() => navigate('/game')} 
                  className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 border-2 border-gray-500 text-white font-bold px-6 py-3 rounded-xl shadow-lg transition-all"
                >
                  ← Back to Games
                </Button>
                
                {/* Premium Wallet Display */}
                <div className="bg-gradient-to-r from-green-800 to-emerald-800 p-4 rounded-2xl border-4 border-green-400/50 shadow-2xl shadow-green-500/20">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-green-200 font-semibold text-sm">💰 GAME WALLET</p>
                      <p className="text-white font-black text-2xl">₹{walletData.game.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
            </div>
            </div>
        </div>
      </div>

        {/* Loading State with Casino Theme */}
      {initialLoad && isLoading ? (
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
          {gameRooms.map((room) => (
                <div key={room.id} className="group relative">
                  {/* Table Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 via-yellow-500/20 via-green-500/20 to-blue-500/20 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500 animate-pulse"></div>
                  
                  {/* Casino Table Card */}
                  <Card className="relative bg-gradient-to-br from-black via-gray-900 to-slate-800 border-4 border-yellow-500/30 rounded-3xl overflow-hidden shadow-2xl hover:shadow-yellow-500/20 transition-all duration-500 transform hover:scale-105">
                    {/* Table Felt Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-green-900/40 to-green-800/40"></div>
                    
                    {/* Decorative Casino Elements */}
                    <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-yellow-400/10 to-transparent rounded-full blur-lg animate-pulse"></div>
                    <div className="absolute bottom-4 left-4 w-16 h-16 bg-gradient-to-tl from-red-400/10 to-transparent rounded-full blur-lg animate-pulse delay-500"></div>
                    
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
                          {room.status === 'waiting' ? '🟢 OPEN' : '🔴 BUSY'}
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
                            <p className="text-yellow-400 font-bold text-xs mb-1">💵 ENTRY FEE</p>
                            <p className="text-white font-black text-lg">₹{room.entryFee}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-green-400 font-bold text-xs mb-1">🏆 WIN AMOUNT</p>
                            <p className="text-white font-black text-lg">₹{room.winningAmount}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-purple-400 font-bold text-xs mb-1">⚡ MULTIPLIER</p>
                            <p className="text-white font-black text-lg">x{room.benefitFeeMultiplier}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-blue-400 font-bold text-xs mb-1">👥 PLAYERS</p>
                            <p className="text-white font-black text-lg">{room.currentPlayers}/{room.maxPlayers}</p>
                          </div>
                  </div>
                </div>
                
                      {/* Ultra Premium Casino Gaming Chips */}
                      <div className="relative bg-gradient-to-br from-gray-950 via-slate-900 to-black rounded-3xl p-6 border-4 border-gradient-to-r from-yellow-600/60 via-amber-500/60 to-yellow-600/60 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-sm">
                        {/* Luxury Header with Animated Border */}
                        <div className="relative mb-6 overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/20 to-transparent animate-pulse"></div>
                          <h3 className="relative text-center font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400 text-base tracking-[0.2em] drop-shadow-lg">
                            ⚡ PREMIUM BETTING CHIPS ⚡
                          </h3>
                        </div>
                        
                        <div className="flex justify-center gap-6">
                          {room.availableColors.map((color, index) => (
                      <div 
                        key={color}
                              className={`relative group cursor-pointer transform transition-all duration-700 hover:scale-150 hover:-translate-y-4 hover:rotate-12 ${
                                color === 'red' ? 'filter drop-shadow-[0_20px_35px_rgba(239,68,68,0.6)]' :
                                color === 'yellow' ? 'filter drop-shadow-[0_20px_35px_rgba(234,179,8,0.6)]' :
                                color === 'green' ? 'filter drop-shadow-[0_20px_35px_rgba(34,197,94,0.6)]' :
                                color === 'blue' ? 'filter drop-shadow-[0_20px_35px_rgba(59,130,246,0.6)]' :
                                'filter drop-shadow-[0_20px_35px_rgba(107,114,128,0.6)]'
                              }`}
                        title={color.charAt(0).toUpperCase() + color.slice(1)}
                              style={{ animationDelay: `${index * 150}ms` }}
                            >
                              {/* Professional Gaming Chip Stack */}
                              <div className="relative w-16 h-16">
                                {/* Base Shadow Layers for Depth */}
                                <div className={`absolute inset-0 rounded-full transform translate-y-2 scale-90 blur-sm ${
                                  color === 'red' ? 'bg-gradient-radial from-red-900/80 to-red-950/60' :
                                  color === 'yellow' ? 'bg-gradient-radial from-yellow-900/80 to-yellow-950/60' :
                                  color === 'green' ? 'bg-gradient-radial from-green-900/80 to-green-950/60' :
                                  color === 'blue' ? 'bg-gradient-radial from-blue-900/80 to-blue-950/60' :
                                  'bg-gradient-radial from-gray-900/80 to-gray-950/60'
                                }`}></div>
                                
                                <div className={`absolute inset-0 rounded-full transform translate-y-1 scale-95 ${
                                  color === 'red' ? 'bg-gradient-to-br from-red-800/70 to-red-900/90' :
                                  color === 'yellow' ? 'bg-gradient-to-br from-yellow-800/70 to-yellow-900/90' :
                                  color === 'green' ? 'bg-gradient-to-br from-green-800/70 to-green-900/90' :
                                  color === 'blue' ? 'bg-gradient-to-br from-blue-800/70 to-blue-900/90' :
                                  'bg-gradient-to-br from-gray-800/70 to-gray-900/90'
                                }`}></div>
                                
                                {/* Main Premium Chip Body */}
                                <div className={`relative w-16 h-16 rounded-full transition-all duration-500 group-hover:shadow-[0_25px_50px_rgba(0,0,0,0.8)] ${
                                  color === 'red' ? 'bg-gradient-to-br from-red-300 via-red-500 to-red-800 border-4 border-red-200/90 shadow-[0_15px_35px_rgba(239,68,68,0.4)] group-hover:shadow-[0_25px_60px_rgba(239,68,68,0.8)]' :
                                  color === 'yellow' ? 'bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-800 border-4 border-yellow-200/90 shadow-[0_15px_35px_rgba(234,179,8,0.4)] group-hover:shadow-[0_25px_60px_rgba(234,179,8,0.8)]' :
                                  color === 'green' ? 'bg-gradient-to-br from-green-300 via-green-500 to-green-800 border-4 border-green-200/90 shadow-[0_15px_35px_rgba(34,197,94,0.4)] group-hover:shadow-[0_25px_60px_rgba(34,197,94,0.8)]' :
                                  color === 'blue' ? 'bg-gradient-to-br from-blue-300 via-blue-500 to-blue-800 border-4 border-blue-200/90 shadow-[0_15px_35px_rgba(59,130,246,0.4)] group-hover:shadow-[0_25px_60px_rgba(59,130,246,0.8)]' :
                                  'bg-gradient-to-br from-gray-300 via-gray-500 to-gray-800 border-4 border-gray-200/90 shadow-[0_15px_35px_rgba(107,114,128,0.4)]'
                                }`}>
                                  
                                  {/* Luxury Inner Patterns */}
                                  <div className="absolute inset-1 rounded-full border-2 border-white/50 shadow-inner"></div>
                                  <div className="absolute inset-2 rounded-full border border-white/30"></div>
                                  <div className="absolute inset-3 rounded-full border border-white/20"></div>
                                  
                                  {/* Premium Center Design */}
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="relative">
                                      {/* Metallic Letter */}
                                      <span className="relative text-white font-black text-2xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] filter contrast-125 brightness-110">
                                        {color === 'red' ? 'R' :
                                         color === 'yellow' ? 'Y' :
                                         color === 'green' ? 'G' :
                                         color === 'blue' ? 'B' : '?'}
                                      </span>
                                      {/* Letter Glow */}
                                      <div className={`absolute inset-0 text-2xl font-black opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                                        color === 'red' ? 'text-red-200 animate-pulse' :
                                        color === 'yellow' ? 'text-yellow-200 animate-pulse' :
                                        color === 'green' ? 'text-green-200 animate-pulse' :
                                        color === 'blue' ? 'text-blue-200 animate-pulse' :
                                        'text-gray-200 animate-pulse'
                                      }`}>
                                        {color === 'red' ? 'R' :
                                         color === 'yellow' ? 'Y' :
                                         color === 'green' ? 'G' :
                                         color === 'blue' ? 'B' : '?'}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Professional Chip Highlights */}
                                  <div className="absolute top-1 left-3 w-5 h-5 bg-gradient-radial from-white/90 to-white/40 rounded-full blur-sm group-hover:scale-110 transition-transform duration-300"></div>
                                  <div className="absolute top-2 left-2 w-3 h-3 bg-white/95 rounded-full group-hover:animate-ping"></div>
                                  <div className="absolute bottom-3 right-2 w-2 h-2 bg-white/60 rounded-full"></div>
                                  
                                  {/* Authentic Casino Edge Details */}
                                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1.5 h-4 bg-white/40 rounded-b-full"></div>
                                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1.5 h-4 bg-white/40 rounded-t-full"></div>
                                  <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-4 h-1.5 bg-white/40 rounded-r-full"></div>
                                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-4 h-1.5 bg-white/40 rounded-l-full"></div>
                                  
                                  {/* Corner Notches */}
                                  <div className="absolute top-1 left-1 w-2 h-2 border-t-2 border-l-2 border-white/30"></div>
                                  <div className="absolute top-1 right-1 w-2 h-2 border-t-2 border-r-2 border-white/30"></div>
                                  <div className="absolute bottom-1 left-1 w-2 h-2 border-b-2 border-l-2 border-white/30"></div>
                                  <div className="absolute bottom-1 right-1 w-2 h-2 border-b-2 border-r-2 border-white/30"></div>
                                </div>
                                
                                {/* Premium Hover Effects */}
                                <div className={`absolute inset-0 rounded-full opacity-0 group-hover:opacity-80 transition-all duration-500 ${
                                  color === 'red' ? 'bg-gradient-radial from-red-400/30 via-transparent to-transparent animate-ping' :
                                  color === 'yellow' ? 'bg-gradient-radial from-yellow-400/30 via-transparent to-transparent animate-ping' :
                                  color === 'green' ? 'bg-gradient-radial from-green-400/30 via-transparent to-transparent animate-ping' :
                                  color === 'blue' ? 'bg-gradient-radial from-blue-400/30 via-transparent to-transparent animate-ping' :
                                  'bg-gradient-radial from-gray-400/30 via-transparent to-transparent animate-ping'
                                }`}></div>
                                
                                {/* Rotating Ring Effect */}
                                <div className={`absolute inset-1 rounded-full border-2 border-dashed opacity-0 group-hover:opacity-60 transition-opacity duration-300 ${
                                  color === 'red' ? 'border-red-300 animate-spin' :
                                  color === 'yellow' ? 'border-yellow-300 animate-spin' :
                                  color === 'green' ? 'border-green-300 animate-spin' :
                                  color === 'blue' ? 'border-blue-300 animate-spin' :
                                  'border-gray-300 animate-spin'
                                }`} style={{ animationDuration: '3s' }}></div>
                              </div>
                              
                              {/* Luxury Color Label */}
                              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap group-hover:scale-110 transition-transform duration-300">
                                <div className={`relative px-3 py-1.5 rounded-full border ${
                                  color === 'red' ? 'bg-gradient-to-r from-red-900/80 to-red-800/80 border-red-400/60 text-red-200' :
                                  color === 'yellow' ? 'bg-gradient-to-r from-yellow-900/80 to-yellow-800/80 border-yellow-400/60 text-yellow-200' :
                                  color === 'green' ? 'bg-gradient-to-r from-green-900/80 to-green-800/80 border-green-400/60 text-green-200' :
                                  color === 'blue' ? 'bg-gradient-to-r from-blue-900/80 to-blue-800/80 border-blue-400/60 text-blue-200' :
                                  'bg-gradient-to-r from-gray-900/80 to-gray-800/80 border-gray-400/60 text-gray-200'
                                } backdrop-blur-sm shadow-lg`}>
                                  <span className="text-xs font-black tracking-wider drop-shadow">
                                    {color.toUpperCase()}
                                  </span>
                                  {/* Label Glow */}
                                  <div className={`absolute inset-0 rounded-full opacity-0 group-hover:opacity-40 transition-opacity duration-300 ${
                                    color === 'red' ? 'bg-red-400/20' :
                                    color === 'yellow' ? 'bg-yellow-400/20' :
                                    color === 'green' ? 'bg-green-400/20' :
                                    color === 'blue' ? 'bg-blue-400/20' :
                                    'bg-gray-400/20'
                                  }`}></div>
                                </div>
                              </div>
                            </div>
                    ))}
                  </div>
                        
                        {/* Ambient Light Effect */}
                        <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-transparent via-transparent to-white/5 pointer-events-none"></div>
                </div>
              </CardContent>
              
                    <CardFooter className="relative z-10 pt-4">
                <Button 
                        className={`w-full font-black text-lg py-4 rounded-2xl border-4 transition-all duration-300 ${
                          room.status === 'waiting' && room.currentPlayers < room.maxPlayers
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 border-green-400 text-white shadow-xl hover:shadow-green-500/40 hover:scale-105'
                            : 'bg-gradient-to-r from-gray-600 to-gray-700 border-gray-500 text-gray-300 cursor-not-allowed'
                        }`}
                  onClick={() => handleJoinRoom(room.roomId)}
                  disabled={room.status !== 'waiting' || room.currentPlayers >= room.maxPlayers}
                >
                        {room.currentPlayers >= room.maxPlayers ? '🚫 TABLE FULL' : 
                         room.status !== 'waiting' ? '⏳ GAME IN PROGRESS' : 
                         '🎮 JOIN TABLE'}
                </Button>
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
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zm-9 9a1 1 0 100 2h1a1 1 0 100-2H2z" clipRule="evenodd" />
            </svg>
          </div>
            </div>
            <h3 className="text-3xl font-black text-white mb-4">🎰 No Tables Available 🎰</h3>
            <p className="text-slate-400 text-lg max-w-md mx-auto">
              All casino tables are currently busy. New tables open every few minutes - check back soon for your chance to win big!
            </p>
            <div className="flex justify-center gap-3 mt-6">
              {['red', 'yellow', 'green', 'blue'].map((color, index) => (
                <div
                  key={color}
                  className={`w-6 h-6 rounded-full animate-bounce ${
                    color === 'red' ? 'bg-red-500' :
                    color === 'yellow' ? 'bg-yellow-500' :
                    color === 'green' ? 'bg-green-500' :
                    'bg-blue-500'
                  }`}
                  style={{ animationDelay: `${index * 0.3}s` }}
                ></div>
              ))}
            </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default ColorPredictionGame;