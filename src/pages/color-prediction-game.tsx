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

  // Get color badge variant based on color name
  const getColorVariant = (color: string) => {
    const colorMap: { [key: string]: string } = {
      'red': 'bg-red-500',
      'green': 'bg-green-500',
      'blue': 'bg-blue-500',
      'yellow': 'bg-yellow-500'
    };
    return colorMap[color] || 'bg-gray-500';
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
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Color Prediction Game</h1>
          <p className="text-muted-foreground">Join a game room to start playing!</p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
        <Button onClick={() => navigate('/game')} variant="outline">
            Back to Games
          </Button>
          <div className="flex items-center bg-primary/10 p-2 rounded-lg border border-primary/20">
            
            <div className="mr-2">
              
              <span className="text-sm text-muted-foreground">Game Wallet:</span>
              <span className="ml-2 font-bold text-lg">₹{walletData.game.toFixed(2)}</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h6" />
                <circle cx="18" cy="6" r="3" />
              </svg>
            </div>
          </div>
          
        </div>
      </div>

      {initialLoad && isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : gameRooms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
          {/* Polling indicator - subtle overlay at the top */}
          {isPolling && (
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 backdrop-blur-sm text-xs animate-pulse">
              <div className="animate-spin rounded-full h-3 w-3 border-t-1 border-b-1 border-white"></div>
              <span>Updating...</span>
            </div>
          )}
          
          {gameRooms.map((room) => (
            <Card key={room.id} className="overflow-hidden border border-blue-500/20 bg-gradient-to-br from-[#1E254A] to-[#161A42] text-white relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full translate-y-12 -translate-x-12"></div>
              
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-bold">Room {room.roomId}</CardTitle>
                  <Badge variant={room.status === 'waiting' ? 'outline' : 'secondary'} className="capitalize">
                    {room.status}
                  </Badge>
                </div>
                <CardDescription className="text-slate-400">
                  Created on {formatDate(room.createdAt)}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm text-slate-400">Entry Fee:</div>
                  <div className="text-sm font-medium">₹{room.entryFee}</div>
                  
                  <div className="text-sm text-slate-400">Winning Amount:</div>
                  <div className="text-sm font-medium">₹{room.winningAmount}</div>
                  
                  <div className="text-sm text-slate-400">Benefit Multiplier:</div>
                  <div className="text-sm font-medium">x{room.benefitFeeMultiplier}</div>
                  
                  <div className="text-sm text-slate-400">Players:</div>
                  <div className="text-sm font-medium">
                    {room.currentPlayers} / {room.maxPlayers}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-slate-400 mb-2">Available Colors:</h3>
                  <div className="flex gap-2">
                    {room.availableColors.map((color) => (
                      <div 
                        key={color}
                        className={`w-6 h-6 rounded-full ${getColorVariant(color)}`} 
                        title={color.charAt(0).toUpperCase() + color.slice(1)}
                      ></div>
                    ))}
                  </div>
                </div>
              </CardContent>
              
              <CardFooter>
                <Button 
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-none" 
                  onClick={() => handleJoinRoom(room.roomId)}
                  disabled={room.status !== 'waiting' || room.currentPlayers >= room.maxPlayers}
                >
                  {room.currentPlayers >= room.maxPlayers ? 'Room Full' : 'Join Room'}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="inline-block p-4 rounded-full bg-blue-500/10 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-medium mb-2">No Game Rooms Available</h3>
          <p className="text-muted-foreground">
            There are currently no active game rooms. Please check back later.
          </p>
        </div>
      )}
    </div>
  );
};

export default ColorPredictionGame;